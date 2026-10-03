// Add only document capabilities; never alter other grants or seed user accounts.
require('dotenv').config();
if (process.platform === 'win32' && process.env.RUST_LOG === 'warn') process.env.RUST_LOG = 'info';
const db = require('../src/config/db');
const { syncDocumentPermissions } = require('../src/services/documents/permissions');
db.$transaction(tx => syncDocumentPermissions(tx), { timeout: 30000 })
  .then(() => console.log('Document permissions synchronized. Existing unrelated grants preserved.'))
  .catch(() => { console.error('Document permission synchronization failed.'); process.exitCode = 1; })
  .finally(() => db.$disconnect());
