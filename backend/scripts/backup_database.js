require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Prisma } = require('@prisma/client');
const prisma = require('../src/config/db');

async function createDatabaseBackup() {
  console.log('====================================================');
  console.log('      EstateSync Database Backup Utility');
  console.log('====================================================\n');

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const backupDir = path.join(__dirname, '..', 'backups', `backup_${timestamp}`);
  const latestDir = path.join(__dirname, '..', 'backups', 'latest');

  fs.mkdirSync(backupDir, { recursive: true });
  fs.mkdirSync(latestDir, { recursive: true });

  const models = Prisma.dmmf.datamodel.models.map(m => m.name);
  console.log(`Discovered ${models.length} database tables from Prisma schema.\n`);

  const backupData = {};
  const stats = [];
  let totalRecordsCount = 0;
  let sqlDump = `-- ====================================================\n`;
  sqlDump += `-- EstateSync Database SQL Dump\n`;
  sqlDump += `-- Generated At: ${now.toISOString()}\n`;
  sqlDump += `-- Total Tables: ${models.length}\n`;
  sqlDump += `-- ====================================================\n\n`;

  for (const modelName of models) {
    const accessor = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    try {
      const records = await prisma[accessor].findMany();
      totalRecordsCount += records.length;
      backupData[modelName] = records;

      stats.push({
        model: modelName,
        count: records.length
      });

      if (records.length > 0) {
        console.log(`✔ [${modelName.padEnd(28)}] : ${String(records.length).padStart(4)} records`);
        // Save individual table JSON
        const tableJson = JSON.stringify(records, null, 2);
        fs.writeFileSync(path.join(backupDir, `${modelName}.json`), tableJson);
        fs.writeFileSync(path.join(latestDir, `${modelName}.json`), tableJson);

        // Generate SQL statements
        sqlDump += `-- Table: "${modelName}" (${records.length} rows)\n`;
        for (const row of records) {
          const keys = Object.keys(row);
          const columns = keys.map(k => `"${k}"`).join(', ');
          const values = keys.map(k => {
            const val = row[k];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
            if (typeof val === 'number') return val;
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
            return `'${String(val).replace(/'/g, "''")}'`;
          }).join(', ');

          sqlDump += `INSERT INTO "${modelName}" (${columns}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`;
        }
        sqlDump += `\n`;
      } else {
        console.log(`- [${modelName.padEnd(28)}] :    0 records (empty)`);
      }
    } catch (err) {
      console.warn(`✖ Failed to export ${modelName}:`, err.message);
    }
  }

  // Save Full Consolidated JSON Backup
  const fullJsonPath = path.join(backupDir, 'estatesync_full_backup.json');
  fs.writeFileSync(fullJsonPath, JSON.stringify(backupData, null, 2));
  fs.writeFileSync(path.join(latestDir, 'estatesync_full_backup.json'), JSON.stringify(backupData, null, 2));

  // Save SQL Dump
  const sqlDumpPath = path.join(backupDir, 'estatesync_backup.sql');
  fs.writeFileSync(sqlDumpPath, sqlDump);
  fs.writeFileSync(path.join(latestDir, 'estatesync_backup.sql'), sqlDump);

  // Save Metadata
  const metadata = {
    backupName: `backup_${timestamp}`,
    createdAt: now.toISOString(),
    totalTables: models.length,
    totalRecords: totalRecordsCount,
    tablesWithData: stats.filter(s => s.count > 0).length,
    tableBreakdown: stats
  };

  const metadataPath = path.join(backupDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  fs.writeFileSync(path.join(latestDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

  console.log('\n====================================================');
  console.log('✔ DATABASE BACKUP COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
  console.log(`Total Records Backed Up: ${totalRecordsCount}`);
  console.log(`Backup Location:         ${backupDir}`);
  console.log(`Latest Pointer:          ${latestDir}`);
  console.log(`Consolidated JSON File:  ${fullJsonPath}`);
  console.log(`SQL Dump File:           ${sqlDumpPath}`);
  console.log('====================================================\n');

  return { backupDir, latestDir, totalRecordsCount };
}

if (require.main === module) {
  createDatabaseBackup()
    .catch((err) => {
      console.error('Database backup failed:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

module.exports = { createDatabaseBackup };
