const http = require('http');
const fs = require('fs');
const path = require('path');
const httpProxy = require('http-proxy');

// Create a proxy server
const proxy = httpProxy.createProxyServer({});

// Path to frontend dist directory
const distPath = path.join(__dirname, 'frontend', 'dist');

// Error handler
proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);
  res.writeHead(502, { 'Content-Type': 'text/plain' });
  res.end('Bad Gateway');
});

// Helper function to serve static files
function serveStaticFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    // Determine content type
    const ext = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// Create the main server
const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Route /api/* to backend (localhost:8000)
  if (req.url.startsWith('/api')) {
    console.log(`[Backend] ${req.method} ${req.url}`);
    proxy.web(req, res, { target: 'http://localhost:8000', changeOrigin: true });
    return;
  }

  // Serve static files from frontend dist
  let filePath = path.join(distPath, req.url === '/' ? 'index.html' : req.url);
  const normalizedPath = path.normalize(filePath);

  // Security check: ensure the path is within distPath
  if (!normalizedPath.startsWith(distPath)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(normalizedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // If file doesn't exist or is a directory, serve index.html (SPA routing)
      console.log(`[Frontend] ${req.method} ${req.url} → index.html (SPA routing)`);
      serveStaticFile(path.join(distPath, 'index.html'), res);
    } else {
      console.log(`[Frontend] ${req.method} ${req.url}`);
      serveStaticFile(normalizedPath, res);
    }
  });
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🔗 Reverse Proxy running on 0.0.0.0:${PORT}`);
  console.log(`   Backend (http://localhost:8000) ← /api/* routes`);
  console.log(`   Frontend (frontend/dist) ← everything else`);
  console.log(`\n💡 Access from network IP: http://<YOUR_IP>:${PORT}\n`);
});
