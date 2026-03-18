const { AsyncLocalStorage } = require('async_hooks');

const billingContextStorage = new AsyncLocalStorage();

function withAIBillingContext(context, fn) {
  const current = billingContextStorage.getStore() || {};
  return billingContextStorage.run({ ...current, ...(context || {}) }, fn);
}

function getAIBillingContext() {
  return billingContextStorage.getStore() || null;
}

module.exports = {
  withAIBillingContext,
  getAIBillingContext
};
