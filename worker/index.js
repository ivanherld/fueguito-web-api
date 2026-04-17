/**
 * Cloudflare Worker — proxy de uploads a R2
 *
 * Recibe PUT /<key>?token=<exp>.<sig> desde el browser,
 * valida el token HMAC generado por el backend,
 * y guarda el archivo en R2 usando el binding nativo (sin S3, sin CORS issues).
 *
 * Variables de entorno (configurar con: wrangler secret put UPLOAD_SECRET):
 *   UPLOAD_SECRET  — secreto compartido con el backend para firmar tokens
 */

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return preflight(request);
    }

    if (request.method !== 'PUT') {
      return respond({ error: 'Method not allowed' }, 405, request);
    }

    const url = new URL(request.url);
    const key = url.pathname.slice(1); // "fueguitoweb/clips/escena26a/video.mp4"
    const token = url.searchParams.get('token');

    if (!key) {
      return respond({ error: 'Key requerida' }, 400, request);
    }

    if (!token) {
      return respond({ error: 'Token requerido' }, 401, request);
    }

    const valid = await verifyToken(token, key, env.UPLOAD_SECRET);
    if (!valid) {
      return respond({ error: 'Token invalido o expirado' }, 401, request);
    }

    const contentType = request.headers.get('Content-Type') || 'application/octet-stream';

    try {
      await env.BUCKET.put(key, request.body, {
        httpMetadata: { contentType },
      });
    } catch (err) {
      return respond({ error: 'Error al guardar archivo en R2' }, 500, request);
    }

    return respond({ ok: true }, 200, request);
  },
};

async function verifyToken(token, key, secret) {
  try {
    const dotIndex = token.indexOf('.');
    if (dotIndex === -1) return false;

    const expStr = token.slice(0, dotIndex);
    const sig = token.slice(dotIndex + 1);

    const exp = parseInt(expStr, 10);
    if (isNaN(exp) || Date.now() > exp) return false;

    const expected = await hmacSign(secret, `${key}:${expStr}`);
    return expected === sig;
  } catch {
    return false;
  }
}

async function hmacSign(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '3600',
    Vary: 'Origin',
  };
}

function preflight(request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

function respond(data, status, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
  });
}
