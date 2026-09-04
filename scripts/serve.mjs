import { createReadStream } from 'node:fs';
import { readFile, realpath, stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.resolve(projectRoot, 'dist');
const host = '127.0.0.1';
const siteConfig = JSON.parse(await readFile(path.join(projectRoot, 'site.config.json'), 'utf8'));
const previewBasePath = `/${String(siteConfig.basePath ?? '/').replace(/^\/+|\/+$/g, '')}`;

function readPort() {
  const argumentIndex = process.argv.indexOf('--port');
  const raw = argumentIndex >= 0 ? process.argv[argumentIndex + 1] : process.env.PORT ?? '4173';
  const port = Number(raw);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${raw}`);
  }

  return port;
}

const mimeTypes = new Map([
  ['.avif', 'image/avif'],
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.pdf', 'application/pdf'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.xml', 'application/xml; charset=utf-8'],
  ['.zip', 'application/zip'],
]);

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function existingFile(candidate, canonicalRoot) {
  if (!isInside(distRoot, candidate)) return null;

  try {
    const info = await stat(candidate);
    if (!info.isFile()) return null;

    const canonicalFile = await realpath(candidate);
    return isInside(canonicalRoot, canonicalFile) ? canonicalFile : null;
  } catch {
    return null;
  }
}

async function resolveRequest(pathname, canonicalRoot) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return { error: 400 };
  }

  if (decoded.includes('\0')) return { error: 400 };

  let portablePath = decoded.replaceAll('\\', '/');
  if (portablePath === previewBasePath) portablePath = '/';
  else if (portablePath.startsWith(`${previewBasePath}/`)) portablePath = portablePath.slice(previewBasePath.length);
  const relativePath = portablePath.replace(/^\/+/, '');
  const direct = path.resolve(distRoot, relativePath || 'index.html');

  if (!isInside(distRoot, direct)) return { error: 403 };

  const candidates = [];
  if (!relativePath || portablePath.endsWith('/')) {
    candidates.push(path.resolve(direct, relativePath ? 'index.html' : '.'));
  } else {
    candidates.push(direct);
    if (!path.extname(relativePath)) {
      candidates.push(path.resolve(distRoot, relativePath, 'index.html'));
      candidates.push(path.resolve(distRoot, `${relativePath}.html`));
    }
  }

  for (const candidate of candidates) {
    const file = await existingFile(candidate, canonicalRoot);
    if (file) return { file, status: 200 };
  }

  const notFound = await existingFile(path.resolve(distRoot, '404.html'), canonicalRoot);
  return notFound ? { file: notFound, status: 404 } : { error: 404 };
}

function sendText(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(body);
}

async function main() {
  const port = readPort();
  let canonicalRoot;

  try {
    canonicalRoot = await realpath(distRoot);
    const info = await stat(canonicalRoot);
    if (!info.isDirectory()) throw new Error('dist is not a directory');
  } catch {
    throw new Error(`Build output not found at ${distRoot}. Run npm run build first.`);
  }

  const server = http.createServer(async (request, response) => {
    try {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.setHeader('Allow', 'GET, HEAD');
        sendText(response, 405, 'Method Not Allowed\n');
        return;
      }

      const requestUrl = new URL(request.url ?? '/', 'http://localhost');
      const result = await resolveRequest(requestUrl.pathname, canonicalRoot);

      if (!result.file) {
        sendText(response, result.error ?? 500, `${http.STATUS_CODES[result.error ?? 500]}\n`);
        return;
      }

      const info = await stat(result.file);
      const contentType = mimeTypes.get(path.extname(result.file).toLowerCase()) ?? 'application/octet-stream';
      response.writeHead(result.status, {
        'Content-Type': contentType,
        'Content-Length': info.size,
        'Cache-Control': contentType.startsWith('text/html') ? 'no-cache' : 'public, max-age=3600',
        'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      });

      if (request.method === 'HEAD') {
        response.end();
        return;
      }

      const stream = createReadStream(result.file);
      stream.on('error', () => response.destroy());
      stream.pipe(response);
    } catch (error) {
      sendText(response, 500, 'Internal Server Error\n');
      console.error(error);
    }
  });

  server.listen(port, host, () => {
    console.log(`Portfolio preview: http://localhost:${port}`);
    console.log(`Serving: ${distRoot}`);
  });

  const close = () => server.close(() => process.exit(0));
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}

main().catch((error) => {
  console.error(`Server error: ${error.message}`);
  process.exitCode = 1;
});
