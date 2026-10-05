require('dotenv').config();
const db = require('../src/config/db');
async function main() {
  await require('../src/utils/securitySchema').ensureSecuritySchema();
  await require('../src/utils/accountingHelper').ensureStandardAccounts();
}
main().catch(error => { console.error('Security schema upgrade failed:', error); process.exitCode = 1; }).finally(() => db.$disconnect());
