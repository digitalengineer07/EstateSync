const prisma = require('../config/db');
const { context } = require('../utils/transactionContext');
// Serialize business mutations across processes before the first read, favoring
// accounting correctness over concurrent write throughput.
function createAtomicMutation(db = prisma) {
  return async (req, res, next) => {
    const send = res.json.bind(res);
    let result, complete, timer;
    let stopped = false;
    const onClose = () => complete?.({ status: 499, body: { success: false, message: 'Request cancelled' } });
    try {
      await (db.$root || db).$transaction(async tx => {
        await tx.$executeRaw`SET LOCAL lock_timeout = '10s'`;
        await tx.$executeRaw`SET LOCAL statement_timeout = '15s'`;
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(734821906)::text`;
        result = await context.run(tx, () => new Promise((resolve, reject) => {
          timer = setTimeout(() => reject(Error('Mutation timed out')), 20000);
          complete = value => { if (stopped) return; stopped = true; clearTimeout(timer); resolve(value); };
          res.json = body => { complete({ status: res.statusCode, body }); return res; };
          res.once('close', onClose);
          next();
        }));
        if (result.status >= 400) throw Object.assign(Error('Rollback response'), { rollbackResponse: true });
      }, { maxWait: 10000, timeout: 30000 });
    } catch (error) {
      if (!error.rollbackResponse) {
        console.error('Atomic mutation failed:', error);
        result = { status: 503, body: { success: false, message: 'The transaction could not be completed. Please retry with the same request key.' } };
      }
    } finally {
      stopped = true;
      clearTimeout(timer);
      res.off('close', onClose);
      // Controllers may finish after a timeout; discard their late responses.
      res.json = () => res;
    }
    if (!res.destroyed && !res.headersSent) {
      res.status(result.status);
      send(result.body);
    }
  };
}
module.exports = { createAtomicMutation, atomicMutation: createAtomicMutation() };
