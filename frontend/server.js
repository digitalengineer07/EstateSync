// Constrain libuv worker threads to prevent process & thread exhaustion on CloudLinux/Hostinger
if (!process.env.UV_THREADPOOL_SIZE) {
  process.env.UV_THREADPOOL_SIZE = '1';
}
process.env.NODE_ENV = 'production';

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// Explicitly false so Next.js never launches Turbopack dev compiler or file watchers on server
const dev = false;
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;
const isPassenger = typeof(PhusionPassenger) !== 'undefined' || !!process.env.PASSENGER_APP_ENV;
const listenTarget = isPassenger ? 'passenger' : port;

app.prepare()
  .then(() => {
    const server = createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });

    server.keepAliveTimeout = 60000;
    server.headersTimeout = 61000;

    server.listen(listenTarget, (err) => {
      if (err) {
        console.error('[Next.js Server Listen Callback Error]:', err);
        return;
      }
      console.log(`> Next.js Production Server Ready on ${listenTarget}`);
    });

    server.on('error', (err) => {
      console.error('[Next.js Server Error]:', err.message);
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${listenTarget} is in use. Waiting 5s before exiting to prevent Passenger spawn loop...`);
        setTimeout(() => process.exit(1), 5000);
      }
    });
  })
  .catch((err) => {
    console.error('[Next.js Startup Error]: Could not initialize Next.js app:', err);
    // CRITICAL: Prevent Phusion Passenger infinite crash-respawn loop
    const fallbackServer = createServer((req, res) => {
      res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>EstateSync - Starting</title></head>
        <body style="font-family:system-ui,-apple-system,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f4f4f5;color:#18181b;">
          <div style="background:white;padding:32px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.08);max-width:460px;text-align:center;border:1px solid #e4e4e7;">
            <h2 style="color:#ff6b12;margin-top:0;">EstateSync Initializing</h2>
            <p style="color:#71717a;line-height:1.5;font-size:14px;">The application build is initializing or being updated. Please refresh in 30 seconds.</p>
          </div>
        </body>
        </html>
      `);
    });

    fallbackServer.listen(listenTarget, () => {
      console.log(`> Fallback maintenance server active on ${listenTarget} (preventing process crash loop)`);
    });
  });

process.on('uncaughtException', (err) => {
  console.error('[Next.js Process Uncaught Exception]:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Next.js Process Unhandled Rejection]:', reason);
});
