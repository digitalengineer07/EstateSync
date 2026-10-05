const pendingKeys = new Map();
export async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(), String(url).includes('/documents') ? 120000 : 45000);
  const headers = new Headers(options.headers);
  const method = (options.method || 'GET').toUpperCase();
  const signature = `${method}:${url}:${headers.get('Authorization') || ''}:${typeof options.body === 'string' ? options.body : ''}`;
  const mutation = ['POST','PUT','PATCH','DELETE'].includes(method) && !String(url).includes('/auth/');
  if (mutation && !headers.has('Idempotency-Key') && !headers.has('x-idempotency-key')) {
    if (!pendingKeys.has(signature)) {
      if (pendingKeys.size >= 500) pendingKeys.delete(pendingKeys.keys().next().value);
      pendingKeys.set(signature, crypto.randomUUID());
    }
    headers.set('Idempotency-Key', pendingKeys.get(signature));
  }
  try {
    const response = await fetch(url, { ...options, headers, credentials: options.credentials || 'include', signal: controller.signal });
    if (response.status < 500 && response.status !== 409 && response.status !== 429) pendingKeys.delete(signature);
    return response;
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') throw new Error('The request timed out. Please try again.');
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}
