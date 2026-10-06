require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

function topologicalSort(tables, foreignKeys) {
  const graph = new Map();
  const inDegree = new Map();

  for (const table of tables) {
    graph.set(table, new Set());
    inDegree.set(table, 0);
  }

  for (const { child_table, parent_table } of foreignKeys) {
    if (child_table !== parent_table && graph.has(parent_table) && graph.has(child_table)) {
      if (!graph.get(parent_table).has(child_table)) {
        graph.get(parent_table).add(child_table);
        inDegree.set(child_table, inDegree.get(child_table) + 1);
      }
    }
  }

  const queue = [];
  for (const [table, degree] of inDegree.entries()) {
    if (degree === 0) queue.push(table);
  }

  const sorted = [];
  while (queue.length > 0) {
    const current = queue.shift();
    sorted.push(current);

    for (const neighbor of graph.get(current)) {
      inDegree.set(neighbor, inDegree.get(neighbor) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Any remaining tables due to circular references
  for (const table of tables) {
    if (!sorted.includes(table)) {
      sorted.push(table);
    }
  }

  return sorted;
}

async function restoreBackup() {
  const backupDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    console.error('No backups directory found at:', backupDir);
    process.exit(1);
  }

  const targetArg = process.argv[2];
  let backupFile;

  if (targetArg) {
    backupFile = path.isAbsolute(targetArg) ? targetArg : path.join(backupDir, targetArg);
  } else {
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json')).sort().reverse();
    if (files.length === 0) {
      console.error('No .json backup files found in:', backupDir);
      process.exit(1);
    }
    backupFile = path.join(backupDir, files[0]);
  }

  if (!fs.existsSync(backupFile)) {
    console.error('Backup file does not exist:', backupFile);
    process.exit(1);
  }

  console.log(`Loading backup file: ${path.basename(backupFile)}...`);
  const rawData = fs.readFileSync(backupFile, 'utf8');
  const backup = JSON.parse(rawData);

  if (!backup.tables) {
    console.error('Invalid backup format: missing "tables" property');
    process.exit(1);
  }

  const backupTables = Object.keys(backup.tables);
  console.log(`Backup timestamp: ${backup.timestamp || 'Unknown'}`);
  console.log(`Tables in backup: ${backupTables.length}\n`);

  const client = await pool.connect();
  try {
    // 1. Fetch foreign key dependencies to sort tables
    const fkQuery = `
      SELECT
        tc.table_name AS child_table,
        ccu.table_name AS parent_table
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
    `;
    const fkRes = await client.query(fkQuery);
    const sortedTables = topologicalSort(backupTables, fkRes.rows);

    let totalInserted = 0;
    let totalSkipped = 0;

    console.log(`Restoring tables in dependency order...\n`);

    for (const table of sortedTables) {
      const rows = backup.tables[table] || [];
      if (rows.length === 0) {
        continue;
      }

      const columns = Object.keys(rows[0]);
      const colsStr = columns.map(c => `"${c}"`).join(', ');

      let tableInserted = 0;
      let tableSkipped = 0;

      for (const row of rows) {
        const valuesStr = columns.map(col => escapeSqlValue(row[col])).join(', ');
        const insertSql = `INSERT INTO "${table}" (${colsStr}) VALUES (${valuesStr}) ON CONFLICT DO NOTHING;`;
        
        try {
          const res = await client.query(insertSql);
          if (res.rowCount > 0) {
            tableInserted += res.rowCount;
          } else {
            tableSkipped++;
          }
        } catch (insertErr) {
          console.warn(`  [Warning] Table ${table} row skipped: ${insertErr.message}`);
          tableSkipped++;
        }
      }

      totalInserted += tableInserted;
      totalSkipped += tableSkipped;

      console.log(`✓ "${table}": ${tableInserted} restored, ${tableSkipped} skipped (already present)`);
    }

    // 2. Synchronize serial sequences if any
    try {
      const seqQuery = `
        SELECT sequence_name, table_name, column_name
        FROM information_schema.sequences
        CROSS JOIN LATERAL (
          SELECT table_name, column_name
          FROM information_schema.columns
          WHERE column_default LIKE '%' || sequence_name || '%'
        ) AS cols;
      `;
      const seqRes = await client.query(seqQuery);
      for (const seq of seqRes.rows) {
        await client.query(`
          SELECT setval('"${seq.sequence_name}"', COALESCE((SELECT MAX("${seq.column_name}") FROM "${seq.table_name}"), 1), true);
        `);
      }
    } catch (_) {
      // Ignore sequence reset if no serial columns
    }

    console.log(`\n======================================================`);
    console.log(`✓ DATABASE RESTORE FINISHED SUCCESSFULLY!`);
    console.log(`  Source Backup   : ${path.basename(backupFile)}`);
    console.log(`  Records Restored: ${totalInserted}`);
    console.log(`  Records Existing: ${totalSkipped}`);
    console.log(`======================================================`);

  } finally {
    client.release();
    await pool.end();
  }
}

restoreBackup().catch(err => {
  console.error('\nRestore failed:', err);
  process.exit(1);
});
