const session = require('express-session');
const prisma = require('../config/db');
// Session persistence uses its own connection: session.save can run after the
// business transaction has completed.
class DatabaseSessionStore extends session.Store {
  constructor(db = prisma.$root) { super(); this.db = db; }
  get(sid, callback) {
    this.db.authSession.findUnique({ where: { id: sid } }).then(row => callback(null, row && row.expiresAt > new Date() ? row.data : null), callback);
  }
  set(sid, data, callback = () => {}) {
    const expiresAt = new Date(data.cookie?.expires || Date.now() + 604800000);
    const clean = JSON.parse(JSON.stringify(data));
    this.db.authSession.upsert({ where: { id: sid }, create: { id: sid, data: clean, expiresAt }, update: { data: clean, expiresAt } }).then(() => callback(), callback);
  }
  destroy(sid, callback = () => {}) { this.db.authSession.deleteMany({ where: { id: sid } }).then(() => callback(), callback); }
  touch(sid, data, callback = () => {}) {
    this.db.authSession.updateMany({ where: { id: sid }, data: { expiresAt: new Date(data.cookie?.expires || Date.now() + 604800000) } }).then(() => callback(), callback);
  }
}
module.exports = { DatabaseSessionStore };
