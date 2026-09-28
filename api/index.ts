import app from '../server';

export default function handler(req: any, res: any) {
  // Support Vercel serverless environment:
  // When vercel.json rewrites /api/(.*) to /api, Vercel sets x-matched-path to the requested path
  const originalPath =
    req.headers['x-matched-path'] ||
    req.headers['x-vercel-matched-path'] ||
    req.headers['x-forwarded-uri'] ||
    req.headers['x-original-url'];

  if (originalPath && typeof originalPath === 'string') {
    if (req.url === '/api' || req.url === '/api/' || req.url === '/' || !req.url) {
      req.url = originalPath;
    }
  }

  // Ensure leading slash
  if (req.url && !req.url.startsWith('/')) {
    req.url = '/' + req.url;
  }

  // Normalize /api prefix so Express router matches correctly
  if (req.url && !req.url.startsWith('/api/') && req.url !== '/api') {
    req.url = '/api' + req.url;
  }

  return app(req, res);
}
