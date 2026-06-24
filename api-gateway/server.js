const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');

const PORT = Number(process.env.PORT || 8001);
const CREDIT_SERVICE_URL = process.env.CREDIT_SERVICE_URL || 'http://localhost:8000';
const SCORING_RAW_SERVICE_URL = process.env.SCORING_RAW_SERVICE_URL || 'http://localhost:5000';
const OPERATIONS_SERVICE_URL = process.env.OPERATIONS_SERVICE_URL || 'http://localhost:8002';
const PROXY_TIMEOUT_MS = Number(process.env.PROXY_TIMEOUT_MS || 12000);
const SCORING_SIMULATE_DELAY = process.env.SCORING_SIMULATE_DELAY || '1';

const routes = [
  {
    name: 'creditos-public',
    prefix: '/api/creditos',
    target: CREDIT_SERVICE_URL,
    rewritePrefix: '/api/v1/creditos',
  },
  {
    name: 'creditos-interno',
    prefix: '/api/interno/creditos',
    target: CREDIT_SERVICE_URL,
    rewritePrefix: '/api/v1/interno',
  },
  {
    name: 'core-api-v1',
    prefix: '/api/app',
    target: CREDIT_SERVICE_URL,
    rewritePrefix: '/api/v1',
  },
  {
    name: 'scoring-public',
    prefix: '/api/scoring',
    target: SCORING_RAW_SERVICE_URL,
    rewritePrefix: '/scoring',
  },
  {
    name: 'scoring-raw',
    prefix: '/scoring',
    target: SCORING_RAW_SERVICE_URL,
    rewritePrefix: '/scoring',
  },
  {
    name: 'operations-fraude',
    prefix: '/api/fraude',
    target: OPERATIONS_SERVICE_URL,
    rewritePrefix: '/api/interno/fraude',
  },
  {
    name: 'operations-usuarios',
    prefix: '/api/usuarios',
    target: OPERATIONS_SERVICE_URL,
    rewritePrefix: '/api/usuarios',
  },
  {
    name: 'operations-desembolsos',
    prefix: '/api/desembolsos',
    target: OPERATIONS_SERVICE_URL,
    rewritePrefix: '/api/interno/desembolsos',
  },
  {
    name: 'operations-inversionistas',
    prefix: '/api/inversionistas',
    target: OPERATIONS_SERVICE_URL,
    rewritePrefix: '/api/inversionistas',
  },
  {
    name: 'operations-interno-fraude',
    prefix: '/api/interno/fraude',
    target: OPERATIONS_SERVICE_URL,
    rewritePrefix: '/api/interno/fraude',
  },
  {
    name: 'operations-interno-desembolsos',
    prefix: '/api/interno/desembolsos',
    target: OPERATIONS_SERVICE_URL,
    rewritePrefix: '/api/interno/desembolsos',
  },
];

function sendJson(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,x-request-id',
    ...extraHeaders,
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function routeFor(pathname) {
  return routes.find((route) => pathname === route.prefix || pathname.startsWith(`${route.prefix}/`));
}

function buildTargetPath(route, pathname, search) {
  if (route.name === 'creditos-interno' && pathname === '/api/interno/creditos/metricas') {
    return `/api/v1/interno/metricas-inversores${search}`;
  }

  return `${route.rewritePrefix}${pathname.slice(route.prefix.length)}${search}`;
}

function proxy(req, res, route, pathname, search) {
  const targetBase = new URL(route.target);
  const targetPath = buildTargetPath(route, pathname, search);
  const transport = targetBase.protocol === 'https:' ? https : http;

  const proxyReq = transport.request(
    {
      protocol: targetBase.protocol,
      hostname: targetBase.hostname,
      port: targetBase.port,
      method: req.method,
      path: targetPath,
      timeout: PROXY_TIMEOUT_MS,
      headers: {
        ...req.headers,
        host: targetBase.host,
        'x-api-gateway-route': route.name,
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, {
        ...proxyRes.headers,
        'access-control-allow-origin': '*',
      });
      proxyRes.pipe(res);
    },
  );

  proxyReq.on('timeout', () => proxyReq.destroy(new Error('Gateway proxy timeout')));
  proxyReq.on('error', (error) => {
    sendJson(res, 502, {
      error: 'BAD_GATEWAY',
      route: route.name,
      target: route.target,
      detail: error.message,
    });
  });

  req.pipe(proxyReq);
}

function ciFromUsuarioId(usuarioId) {
  const digits = String(usuarioId || '').replace(/\D/g, '');
  if (digits.length >= 6) {
    return digits.slice(0, 10);
  }

  let hash = 0;
  for (const char of String(usuarioId || 'usuario-demo')) {
    hash = (hash * 31 + char.charCodeAt(0)) % 9000000;
  }
  return String(1000000 + hash);
}

function buildAlternativeData(payload) {
  if (payload.datos_alternativos) {
    return payload.datos_alternativos;
  }

  const monto = Number(payload.monto || payload.monto_solicitado || 500);
  const lowAmount = monto <= 500;

  return {
    pago_servicios_al_dia: lowAmount,
    compras_ecommerce_mes: lowAmount ? 12 : 5,
    recargas_moviles_promedio: lowAmount ? 48.5 : 24.0,
  };
}

async function handleInternalScoring(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED', allowed: 'POST' });
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: 'INVALID_JSON' });
    return;
  }

  const creditoId = payload.credito_id;
  const usuarioId = payload.usuario_id;
  const monto = Number(payload.monto || payload.monto_solicitado || 0);

  if (!creditoId || !usuarioId || !monto) {
    sendJson(res, 400, {
      error: 'MISSING_FIELDS',
      required: ['credito_id', 'usuario_id', 'monto'],
    });
    return;
  }

  const scoringPayload = {
    credito_id: String(creditoId),
    usuario_id: String(usuarioId),
    ci_usuario: payload.ci_usuario || ciFromUsuarioId(usuarioId),
    datos_alternativos: buildAlternativeData(payload),
  };

  const scoringUrl = new URL('/scoring/evaluar', SCORING_RAW_SERVICE_URL);
  scoringUrl.searchParams.set('simulate_delay', String(payload.simulate_delay || SCORING_SIMULATE_DELAY));

  try {
    const response = await fetch(scoringUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(scoringPayload),
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });

    const raw = await response.json();
    if (!response.ok) {
      sendJson(res, response.status, {
        error: 'SCORING_SERVICE_ERROR',
        detail: raw,
      });
      return;
    }

    const scoreFinal = Number(raw.score_final_generado || 0);
    sendJson(res, 200, {
      score_final: scoreFinal,
      aprobado: scoreFinal >= 620,
      shap_values: raw.shap_values || {},
      origen_datos: raw.fuente_buro || 'MS_SCORING',
      ms_scoring_trace: {
        evaluacion_id: raw.id,
        tiempo_ejecucion_segundos: raw.tiempo_ejecucion_segundos,
        fecha_evaluacion: raw.fecha_evaluacion,
      },
    });
  } catch (error) {
    sendJson(res, 503, {
      error: 'SCORING_UNAVAILABLE',
      detail: error.message,
      fallback: {
        score_final: 400,
        aprobado: false,
        shap_values: { gateway_scoring_unavailable: 1.0 },
        origen_datos: 'GATEWAY_FALLBACK',
      },
    });
  }
}

async function handleInternalDisbursement(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED', allowed: 'POST' });
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: 'INVALID_JSON' });
    return;
  }

  const operationsUrl = new URL('/api/interno/desembolsos/ejecutar', OPERATIONS_SERVICE_URL);

  try {
    const response = await fetch(operationsUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });

    const raw = await response.json();
    if (!response.ok) {
      sendJson(res, response.status, {
        error: 'OPERATIONS_SERVICE_ERROR',
        detail: raw,
      });
      return;
    }

    sendJson(res, 200, {
      transaccion_id: String(raw.desembolso_id || raw.transaccion_id),
      estado: raw.estado,
      ya_procesado: Boolean(raw.ya_procesado),
      ms_operaciones_trace: raw,
    });
  } catch (error) {
    sendJson(res, 503, {
      error: 'OPERATIONS_UNAVAILABLE',
      detail: error.message,
    });
  }
}

const server = http.createServer((req, res) => {
  const currentUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const { pathname, search } = currentUrl;

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === 'GET' && pathname === '/health') {
    sendJson(res, 200, {
      status: 'ok',
      service: 'neolend-api-gateway',
      credit_service_url: CREDIT_SERVICE_URL,
      scoring_raw_service_url: SCORING_RAW_SERVICE_URL,
      operations_service_url: OPERATIONS_SERVICE_URL,
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/gateway/routes') {
    sendJson(res, 200, {
      gateway_port: PORT,
      routes: [
        {
          method: 'POST',
          path: '/api/interno/scoring/evaluar',
          type: 'adapter',
          target: `${SCORING_RAW_SERVICE_URL}/scoring/evaluar`,
        },
        {
          method: 'POST',
          path: '/api/interno/desembolsos/ejecutar',
          type: 'adapter',
          target: `${OPERATIONS_SERVICE_URL}/api/interno/desembolsos/ejecutar`,
        },
        ...routes.map((route) => ({
          path: `${route.prefix}/*`,
          type: 'proxy',
          target: route.target,
          rewritePrefix: route.rewritePrefix,
        })),
      ],
    });
    return;
  }

  if (pathname === '/api/interno/scoring/evaluar') {
    void handleInternalScoring(req, res);
    return;
  }

  if (pathname === '/api/interno/desembolsos/ejecutar') {
    void handleInternalDisbursement(req, res);
    return;
  }

  const route = routeFor(pathname);
  if (!route) {
    sendJson(res, 404, {
      error: 'ROUTE_NOT_FOUND',
      path: pathname,
      hint: 'Use /api/gateway/routes para ver rutas disponibles.',
    });
    return;
  }

  proxy(req, res, route, pathname, search);
});

server.listen(PORT, () => {
  console.log(`NeoLend API Gateway listening on http://localhost:${PORT}`);
  console.log(`Credit service: ${CREDIT_SERVICE_URL}`);
  console.log(`Raw scoring service: ${SCORING_RAW_SERVICE_URL}`);
  console.log(`Operations service: ${OPERATIONS_SERVICE_URL}`);
});
