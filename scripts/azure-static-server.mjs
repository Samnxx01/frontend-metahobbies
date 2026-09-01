import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.env.PORT || 8080);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const resolveAsset = async (pathname) => {
  const decodedPath = decodeURIComponent(pathname).replace(/^\/+/, '');
  const candidate = path.resolve(root, decodedPath || 'index.html');

  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
    return null;
  }

  try {
    const info = await stat(candidate);
    if (info.isFile()) return candidate;
  } catch {
    // Las rutas del SPA se resuelven con index.html.
  }

  return path.join(root, 'index.html');
};

const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    const assetPath = await resolveAsset(pathname);

    if (!assetPath) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    const info = await stat(assetPath);
    const extension = path.extname(assetPath).toLowerCase();
    res.writeHead(200, {
      'Content-Length': info.size,
      'Content-Type': contentTypes[extension] || 'application/octet-stream',
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    createReadStream(assetPath).pipe(res);
  } catch (error) {
    console.error('[AzureStaticServer]', error);
    res.writeHead(500).end('Internal Server Error');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Frontend disponible en el puerto ${port}`);
});
