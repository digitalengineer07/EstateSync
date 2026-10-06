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

async function exportAll() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    const tables = res.rows.map(r => r.table_name);
    console.log(`Found ${tables.length} tables in database.\n`);
    
    const backupDir = path.join(__dirname, '../backups');
    fs.mkdirSync(backupDir, { recursive: true });
    
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const jsonPath = path.join(backupDir, `estatesync_backup_${timestampStr}.json`);
    const sqlPath = path.join(backupDir, `estatesync_backup_${timestampStr}.sql`);

    const jsonBackup = {
      timestamp: new Date().toISOString(),
      database: client.database,
      totalTables: tables.length,
      tables: {}
    };

    let sqlContent = `-- EstateSync Neon Database Backup\n-- Timestamp: ${new Date().toISOString()}\n-- Database: ${client.database}\n\n`;

    let totalRecords = 0;
    for (const table of tables) {
      const data = await client.query(`SELECT * FROM "${table}"`);
      jsonBackup.tables[table] = data.rows;
      totalRecords += data.rows.length;

      if (data.rows.length > 0) {
        sqlContent += `-- Data for table: "${table}" (${data.rows.length} rows)\n`;
        const columns = Object.keys(data.rows[0]);
        const colsStr = columns.map(c => `"${c}"`).join(', ');

        for (const row of data.rows) {
          const valuesStr = columns.map(col => escapeSqlValue(row[col])).join(', ');
          sqlContent += `INSERT INTO "${table}" (${colsStr}) VALUES (${valuesStr}) ON CONFLICT DO NOTHING;\n`;
        }
        sqlContent += `\n`;
      }
      console.log(`✓ Table "${table}": ${data.rows.length} records`);
    }

    fs.writeFileSync(jsonPath, JSON.stringify(jsonBackup, null, 2), 'utf8');
    fs.writeFileSync(sqlPath, sqlContent, 'utf8');

    const jsonStats = fs.statSync(jsonPath);
    const sqlStats = fs.statSync(sqlPath);

    console.log(`\n======================================================`);
    console.log(`✓ ALL AVAILABLE DATABASE DATA RECORDED SUCCESSFULLY!`);
    console.log(`  Total Tables  : ${tables.length}`);
    console.log(`  Total Records : ${totalRecords}`);
    console.log(`  JSON Backup   : ${jsonPath} (${(jsonStats.size / 1024).toFixed(2)} KB)`);
    console.log(`  SQL Backup    : ${sqlPath} (${(sqlStats.size / 1024).toFixed(2)} KB)`);
    console.log(`======================================================`);
  } finally {
    client.release();
    await pool.end();
  }
}

exportAll().catch(err => {
  console.error('Backup error:', err);
  process.exit(1);
});
