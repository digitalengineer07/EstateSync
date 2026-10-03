// Launch only against the previously verified localhost testing database.
require('dotenv').config({ quiet: true });
const crypto = require('node:crypto');
const url = new URL(process.env.DATABASE_URL);
const fingerprint = crypto.createHash('sha256').update(`${url.hostname}/${url.pathname}/${url.username}`).digest('hex').slice(0, 16);
if (fingerprint !== 'a8747063ee476182' || process.env.NODE_ENV === 'production') throw Error('QA refused: unexpected database target');
console.log('QA target verified: testing database', fingerprint);
require('../src/app');
