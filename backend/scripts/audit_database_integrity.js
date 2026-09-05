require('dotenv').config();
const prisma = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function auditDatabaseIntegrity({ silent = false } = {}) {
  const log = (...args) => { if (!silent) console.log(...args); };
  const warn = (...args) => console.warn(...args);
  const error = (...args) => console.error(...args);

  log('=== RUNNING COMPREHENSIVE DATABASE INTEGRITY AUDIT ===\n');

  // 1. Fetch all tables from DB
  const dbTables = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  const tableNames = dbTables.map(t => t.table_name);
  log(`Found ${tableNames.length} tables in PostgreSQL database:`);
  log(tableNames.join(', '));

  // 2. Fetch all columns per table from DB
  const dbCols = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);
  const tableColMap = {};
  for (const c of dbCols) {
    if (!tableColMap[c.table_name]) tableColMap[c.table_name] = new Set();
    tableColMap[c.table_name].add(c.column_name);
  }

  // 3. Parse schema.prisma models
  const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  const modelRegex = /model\s+(\w+)\s+\{([^}]+)\}/g;
  let match;
  const prismaModels = {};

  while ((match = modelRegex.exec(schemaContent)) !== null) {
    const modelName = match[1];
    const body = match[2];
    const fields = [];
    
    const lines = body.split('\n');
    for (const l of lines) {
      const trimmed = l.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;
      const parts = trimmed.split(/\s+/);
      const fieldName = parts[0];
      const fieldType = parts[1];
      fields.push({ fieldName, fieldType });
    }
    prismaModels[modelName] = fields;
  }

  log(`\nFound ${Object.keys(prismaModels).length} models in schema.prisma.`);

  // 4. Compare prisma models against DB tables
  log('\n--- Checking Prisma Models vs DB Tables ---');
  let missingTables = 0;
  let missingColumns = 0;
  const issues = [];

  for (const [modelName, fields] of Object.entries(prismaModels)) {
    if (!tableColMap[modelName]) {
      error(`❌ MISSING TABLE IN DB: "${modelName}"`);
      issues.push(`Table missing: ${modelName}`);
      missingTables++;
      continue;
    }

    const existingCols = tableColMap[modelName];
    for (const f of fields) {
      const isScalar = /^(String|Int|Float|Boolean|DateTime|Decimal|Json|Bytes|BigInt)(\?|\[\])?$/.test(f.fieldType);
      if (isScalar) {
        if (!existingCols.has(f.fieldName)) {
          error(`❌ MISSING COLUMN in table "${modelName}": "${f.fieldName}" (${f.fieldType})`);
          issues.push(`Column missing: ${modelName}.${f.fieldName}`);
          missingColumns++;
        }
      }
    }
  }

  const success = missingTables === 0 && missingColumns === 0;

  if (success) {
    log('✅ All Prisma models and scalar columns exist in PostgreSQL database!');
  } else {
    error(`\n⚠️ AUDIT FAILED: Found ${missingTables} missing tables and ${missingColumns} missing columns!`);
    error('Run `npx prisma db push` to synchronize schema with your database.');
  }

  log('\n=== AUDIT COMPLETE ===\n');
  return { success, missingTables, missingColumns, issues };
}

if (require.main === module) {
  auditDatabaseIntegrity()
    .then(({ success }) => {
      prisma.$disconnect();
      if (!success) process.exit(1);
    })
    .catch((err) => {
      console.error('Audit exception:', err);
      prisma.$disconnect();
      process.exit(1);
    });
}

module.exports = { auditDatabaseIntegrity };
