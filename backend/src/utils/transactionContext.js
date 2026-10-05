const { AsyncLocalStorage } = require('node:async_hooks');
const context = new AsyncLocalStorage();
// Route-level transactions also cover legacy reads made before $transaction.
function contextualClient(client) {
  return new Proxy(client, { get(target, property) {
    if (property === '$root') return client;
    const tx = context.getStore();
    if (property === '$transaction' && tx) return async work => {
      if (typeof work !== 'function') throw Error('Nested batch transactions are unsupported');
      return work(tx);
    };
    const owner = tx || target;
    const value = owner[property];
    return typeof value === 'function' ? value.bind(owner) : value;
  } });
}
module.exports = { context, contextualClient };
