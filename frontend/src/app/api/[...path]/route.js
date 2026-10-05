/**
 * Catch-all API proxy route.
 * Forwards all /api/* requests to the backend (Hostinger) server-to-server,
 * bypassing browser CORS and Hostinger's WAF OPTIONS block entirely.
 */

const PRODUCTION_BACKEND_URL = 'https://lightcoral-turtle-931044.hostingersite.com';

// Ensure in production we ALWAYS point to the live backend URL, never falling back to dead localhost:4000
const BACKEND_URL = (
  (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL !== 'http://localhost:4000' && process.env.NEXT_PUBLIC_API_URL !== '')
    ? process.env.NEXT_PUBLIC_API_URL
    : (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : PRODUCTION_BACKEND_URL)
).replace(/\/+$/, '');

async function proxyRequest(request, { params }) {
  const path = (await params).path.join('/');
  const targetUrl = `${BACKEND_URL}/api/${path}`;

  // Forward the original query string if any
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

  console.log(`[Proxy] ${request.method} ${fullUrl}`);

  // Build headers to forward - mimic a real browser request to avoid WAF blocks
  const forwardHeaders = new Headers();
  forwardHeaders.set('Content-Type', request.headers.get('content-type') || 'application/json');
  forwardHeaders.set('Accept', request.headers.get('accept') || '*/*');
  forwardHeaders.set('User-Agent', request.headers.get('user-agent') || 'Mozilla/5.0');

  // Forward auth token if present
  const authHeader = request.headers.get('authorization');
  if (authHeader) forwardHeaders.set('Authorization', authHeader);
  const cookie = request.headers.get('cookie');
  if (cookie) forwardHeaders.set('Cookie', cookie);

  // Forward idempotency key if present
  const idempotencyKey = request.headers.get('idempotency-key');
  if (idempotencyKey) forwardHeaders.set('Idempotency-Key', idempotencyKey);

  // Read body for methods that have one
  let body = undefined;
  if (!['GET', 'HEAD'].includes(request.method)) {
    body = request.body;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), path.startsWith('v1/documents/') ? 120000 : 15000);

  try {
    const backendResponse = await fetch(fullUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: body || undefined,
      ...(body ? { duplex: 'half' } : {}),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    console.log(`[Proxy] Response: ${backendResponse.status}`);

    const responseHeaders = new Headers();
    for (const cookie of backendResponse.headers.getSetCookie()) responseHeaders.append('Set-Cookie', cookie);
    for (const name of ['content-type', 'content-disposition', 'cache-control', 'x-content-type-options', 'content-security-policy', 'cross-origin-resource-policy', 'retry-after']) {
      const value = backendResponse.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(backendResponse.body, {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('[Proxy] Error:', err.message);
    return new Response(JSON.stringify({ 
      success: false, 
      message: `Backend proxy error: ${err.message}` 
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key, x-idempotency-key',
    },
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
