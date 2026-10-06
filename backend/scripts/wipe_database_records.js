require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function wipeDatabase() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name != '_prisma_migrations'
      ORDER BY table_name;
    `);

    const tables = res.rows.map(r => r.table_name);
    console.log(`Found ${tables.length} tables to truncate.`);

    // Check count before
    let beforeCount = 0;
    for (const table of tables) {
      const countRes = await client.query(`SELECT COUNT(*)::int as count FROM "${table}"`);
      beforeCount += countRes.rows[0].count;
    }
    console.log(`Total records before deletion: ${beforeCount}\n`);

    // Truncate all tables with CASCADE
    const tableListStr = tables.map(t => `"${t}"`).join(', ');
    console.log('Truncating all application tables...');
    await client.query(`TRUNCATE TABLE ${tableListStr} CASCADE;`);

    // Verify count after
    let afterCount = 0;
    for (const table of tables) {
      const countRes = await client.query(`SELECT COUNT(*)::int as count FROM "${table}"`);
      afterCount += countRes.rows[0].count;
    }

    console.log(`\n======================================================`);
    console.log(`✓ ALL RECORDS DELETED SUCCESSFULLY!`);
    console.log(`  Tables Truncated: ${tables.length}`);
    console.log(`  Records Before  : ${beforeCount}`);
    console.log(`  Records After   : ${afterCount} (Database is now empty)`);
    console.log(`======================================================`);
    console.log(`\nYou can now run:`);
    console.log(`  npm run restore`);
    console.log(`to restore all records from your latest backup!\n`);
  } finally {
    client.release();
    await pool.end();
  }
}

wipeDatabase().catch(err => {
  console.error('Wipe failed:', err);
  process.exit(1);
});
