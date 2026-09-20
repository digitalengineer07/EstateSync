process.env.NODE_ENV = 'production';

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// Explicitly false so Next.js never launches Turbopack dev compiler or file watchers on server
const dev = false;
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Next.js Production Server Ready on port ${port}`);
  });
});
