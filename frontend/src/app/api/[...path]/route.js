/**
 * Catch-all API proxy route.
 * Forwards all /api/* requests to the backend (Hostinger) server-to-server,
 * bypassing browser CORS and Hostinger's WAF OPTIONS block entirely.
 */

const PRODUCTION_BACKEND_URL = 'https://lightcoral-turtle-931044.hostingersite.com';

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? PRODUCTION_BACKEND_URL : 'http://localhost:4000')
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

  // Forward idempotency key if present
  const idempotencyKey = request.headers.get('idempotency-key');
  if (idempotencyKey) forwardHeaders.set('Idempotency-Key', idempotencyKey);

  // Read body for methods that have one
  let body = undefined;
  if (!['GET', 'HEAD'].includes(request.method)) {
    body = await request.text();
  }

  try {
    const backendResponse = await fetch(fullUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: body || undefined,
    });

    const responseText = await backendResponse.text();
    console.log(`[Proxy] Response: ${backendResponse.status}`);

    return new Response(responseText, {
      status: backendResponse.status,
      headers: {
        'Content-Type': backendResponse.headers.get('content-type') || 'application/json',
      },
    });
  } catch (err) {
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

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
