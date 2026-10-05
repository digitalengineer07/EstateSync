const crypto = require('node:crypto');
const { authSecrets } = require('../middleware/authSecrets');
function authVersion(user) {
  return crypto.createHmac('sha256', authSecrets().access).update(`${user.id}:${user.passwordHash}`).digest('hex');
}
function matchesVersion(user, claim) {
  if (typeof claim !== 'string' || !/^[a-f0-9]{64}$/.test(claim)) return false;
  return crypto.timingSafeEqual(Buffer.from(authVersion(user)), Buffer.from(claim));
}
module.exports = { authVersion, matchesVersion };
