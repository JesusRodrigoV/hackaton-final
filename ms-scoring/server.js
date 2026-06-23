const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const Opossum = require('opossum');
const { dbRun, dbGet, dbAll, initDb } = require('./database');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;

// Dual-layer cache: in-memory map
const inMemoryCache = new Map(); // ci -> { score, timestamp }
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Failures tracking for circuit breaker
let consecutiveFailures = 0;

// 1. Simulated Mainframe SOAP Client Function
function queryMainframeSoap(ciUsuario, delaySeconds, forceError) {
  return new Promise((resolve, reject) => {
    if (forceError) {
      console.error("[SOAP Mainframe] Forzando error simulado...");
      return reject(new Error("Fallo de conexión simulado con el Mainframe."));
    }

    console.log(`[SOAP Mainframe] Iniciando consulta para CI: ${ciUsuario} con delay de ${delaySeconds}s...`);

    setTimeout(() => {
      // Generate a deterministic bureau score based on CI
      let sum = 0;
      for (let i = 0; i < ciUsuario.length; i++) {
        const val = parseInt(ciUsuario[i]);
        if (!isNaN(val)) sum += val;
      }
      const scoreBuro = 400 + (sum % 450); // range 400 to 850
      console.log(`[SOAP Mainframe] Consulta exitosa para CI: ${ciUsuario}. Score: ${scoreBuro}`);
      resolve(scoreBuro);
    }, delaySeconds * 1000);
  });
}

// 2. Setup Opossum Circuit Breaker
const breakerOptions = {
  timeout: 3000, // Timeout limit: 3 seconds
  errorThresholdPercentage: 50, // Trip if 50% of requests fail
  resetTimeout: 20000, // Cooldown reset timeout: 20 seconds
  volumeThreshold: 1 // Evaluate statistics from the first call
};

const breaker = new Opossum(queryMainframeSoap, breakerOptions);

// Monitor state transitions
breaker.on('open', () => {
  console.warn('CIRCUIT BREAKER STATE CHANGE: CLOSED -> OPEN');
});
breaker.on('close', () => {
  console.log('CIRCUIT BREAKER STATE CHANGE: OPEN -> CLOSED');
  consecutiveFailures = 0;
});
breaker.on('halfOpen', () => {
  console.log('CIRCUIT BREAKER STATE CHANGE: OPEN -> HALF_OPEN');
});

// 3. Score & SHAP calculation logic
function calculateScoreAndShap(datosAlt, scoreBuro, isFallback) {
  const baseline = 500.0;
  
  const Luz = datosAlt.pago_servicios_al_dia ? 120.0 : -100.0;
  const Ecomm = Math.min(150.0, datosAlt.compras_ecommerce_mes * 15.0) - 40.0;
  const Recar = Math.min(80.0, datosAlt.recargas_moviles_promedio * 1.5) - 25.0;
  
  let scoreFinal;
  let shapValues;

  if (isFallback || scoreBuro === null) {
    const totalAbs = Math.abs(Luz) + Math.abs(Ecomm) + Math.abs(Recar) || 1.0;
    scoreFinal = Math.round(baseline + Luz + Ecomm + Recar);
    scoreFinal = Math.max(1, Math.min(1000, scoreFinal));

    shapValues = {
      historial_luz: Math.round((Luz / totalAbs) * 100) / 100,
      billetera_digital: Math.round((Ecomm / totalAbs) * 100) / 100,
      recargas_celular: Math.round((Recar / totalAbs) * 100) / 100,
      buro_tradicional: 0.0
    };
  } else {
    const Buro = (scoreBuro - 600.0) * 1.2;
    const totalAbs = Math.abs(Luz) + Math.abs(Ecomm) + Math.abs(Recar) + Math.abs(Buro) || 1.0;
    scoreFinal = Math.round(baseline + Luz + Ecomm + Recar + Buro);
    scoreFinal = Math.max(1, Math.min(1000, scoreFinal));

    shapValues = {
      historial_luz: Math.round((Luz / totalAbs) * 100) / 100,
      billetera_digital: Math.round((Ecomm / totalAbs) * 100) / 100,
      recargas_celular: Math.round((Recar / totalAbs) * 100) / 100,
      buro_tradicional: Math.round((Buro / totalAbs) * 100) / 100
    };
  }

  return { scoreFinal, shapValues };
}

// 4. Main scoring evaluation endpoint
app.post('/scoring/evaluar', async (req, res) => {
  const startTime = Date.now();
  const { usuario_id, credito_id, ci_usuario, datos_alternativos } = req.body;

  if (!usuario_id || !credito_id || !ci_usuario || !datos_alternativos) {
    return res.status(400).json({ error: 'Missing required request body fields.' });
  }

  const { pago_servicios_al_dia, compras_ecommerce_mes, recargas_moviles_promedio } = datos_alternativos;

  try {
    // Save or update alternative data in DB
    const existingAlt = await dbGet('SELECT * FROM datos_alternativos_usuario WHERE usuario_id = ?', [usuario_id]);
    if (existingAlt) {
      await dbRun(
        'UPDATE datos_alternativos_usuario SET pago_servicios_al_dia = ?, compras_ecommerce_mes = ?, recargas_moviles_promedio = ? WHERE usuario_id = ?',
        [pago_servicios_al_dia ? 1 : 0, compras_ecommerce_mes, recargas_moviles_promedio, usuario_id]
      );
    } else {
      await dbRun(
        'INSERT INTO datos_alternativos_usuario (usuario_id, pago_servicios_al_dia, compras_ecommerce_mes, recargas_moviles_promedio) VALUES (?, ?, ?, ?)',
        [usuario_id, pago_servicios_al_dia ? 1 : 0, compras_ecommerce_mes, recargas_moviles_promedio]
      );
    }

    // Determine SOAP parameters override
    const forceError = req.query.force_error === 'true';
    let delaySeconds = req.query.simulate_delay !== undefined ? parseInt(req.query.simulate_delay) : null;
    if (delaySeconds === null || isNaN(delaySeconds)) {
      delaySeconds = Math.floor(Math.random() * (15 - 8 + 1)) + 8; // default random 8-15s
    }

    let scoreBuro = null;
    let fuenteBuro = null;

    // Check Memory Cache
    const memCache = inMemoryCache.get(ci_usuario);
    if (memCache && (Date.now() - memCache.timestamp < CACHE_TTL_MS)) {
      scoreBuro = memCache.score;
      fuenteBuro = 'CACHE_LOCAL';
      console.log(`[Caché Memoria] Hit! CI: ${ci_usuario}, Score: ${scoreBuro}`);
    }

    // Check DB Cache if not found in Memory
    if (scoreBuro === null) {
      const dbCache = await dbGet('SELECT * FROM buro_cache_local WHERE ci_usuario = ? ORDER BY fecha_consulta DESC LIMIT 1', [ci_usuario]);
      if (dbCache) {
        const ageMs = Date.now() - new Date(dbCache.fecha_consulta).getTime();
        if (ageMs < CACHE_TTL_MS) {
          scoreBuro = dbCache.score_buro_tradicional;
          fuenteBuro = 'CACHE_LOCAL';
          // Cache in memory for speed
          inMemoryCache.set(ci_usuario, { score: scoreBuro, timestamp: Date.now() });
          console.log(`[Caché SQLite] Hit! CI: ${ci_usuario}, Score: ${scoreBuro}`);
        }
      }
    }

    let isFallback = false;

    // Call simulated Mainframe SOAP with Opossum if no cache matches
    if (scoreBuro === null) {
      try {
        // If the circuit is already open, Opossum will fail fast throwing an error immediately
        scoreBuro = await breaker.fire(ci_usuario, delaySeconds, forceError);
        fuenteBuro = 'SOAP_MAINFRAME';
        consecutiveFailures = 0;

        // Save in cache (SQLite & Memory)
        const cacheId = uuidv4();
        const nowIso = new Date().toISOString();
        await dbRun(
          'INSERT INTO buro_cache_local (id, ci_usuario, score_buro_tradicional, fecha_consulta) VALUES (?, ?, ?, ?)',
          [cacheId, ci_usuario, scoreBuro, nowIso]
        );
        inMemoryCache.set(ci_usuario, { score: scoreBuro, timestamp: Date.now() });

      } catch (err) {
        console.error(`[Mainframe Error] Opossum caught failure: ${err.message}`);
        isFallback = true;
        fuenteBuro = 'FALLBACK_CIRCUIT_BREAKER';
        scoreBuro = null;

        // Check if circuit breaker should trip (deterministic 3 consecutive failures)
        consecutiveFailures++;
        if (consecutiveFailures >= 3 && !breaker.opened) {
          console.warn(`[Circuit Breaker] Tripping circuit breaker due to ${consecutiveFailures} consecutive failures.`);
          breaker.open();
        }
      }
    }

    // Calculate final score and SHAP explanations
    const { scoreFinal, shapValues } = calculateScoreAndShap(
      { pago_servicios_al_dia, compras_ecommerce_mes, recargas_moviles_promedio },
      scoreBuro,
      isFallback
    );

    // Save evaluation in database
    const evalId = uuidv4();
    const nowIso = new Date().toISOString();
    await dbRun(
      'INSERT INTO evaluaciones_scoring (id, credito_id, score_final_generado, shap_values, fecha_evaluacion) VALUES (?, ?, ?, ?, ?)',
      [evalId, credito_id, scoreFinal, JSON.stringify(shapValues), nowIso]
    );

    const elapsedTimeSeconds = (Date.now() - startTime) / 1000;

    res.status(201).json({
      id: evalId,
      credito_id: credito_id,
      score_final_generado: scoreFinal,
      shap_values: shapValues,
      fuente_buro: fuenteBuro,
      tiempo_ejecucion_segundos: parseFloat(elapsedTimeSeconds.toFixed(3)),
      fecha_evaluacion: nowIso
    });

  } catch (err) {
    console.error('Server execution error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// 5. Breaker status endpoint
app.get('/scoring/breaker-status', (req, res) => {
  let state = 'CLOSED';
  if (breaker.opened) {
    state = 'OPEN';
  } else if (breaker.halfOpen) {
    state = 'HALF_OPEN';
  }

  res.json({
    name: 'buro_mainframe_breaker',
    state: state,
    fail_count: consecutiveFailures,
    fail_max: 3,
    reset_timeout: breakerOptions.resetTimeout / 1000,
    is_open: breaker.opened
  });
});

// 6. Reset breaker endpoint
app.post('/scoring/breaker-reset', (req, res) => {
  breaker.close();
  consecutiveFailures = 0;
  res.json({ message: 'Circuit breaker restablecido exitosamente a CERRADO.' });
});

// 7. Get evaluations endpoint
app.get('/scoring/evaluaciones', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  try {
    const rows = await dbAll('SELECT * FROM evaluaciones_scoring ORDER BY fecha_evaluacion DESC LIMIT ?', [limit]);
    const formatted = rows.map(r => ({
      id: r.id,
      credito_id: r.credito_id,
      score_final_generado: r.score_final_generado,
      shap_values: JSON.parse(r.shap_values),
      fecha_evaluacion: r.fecha_evaluacion
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Get cache local endpoint
app.get('/scoring/cache-local', async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM buro_cache_local ORDER BY fecha_consulta DESC');
    const formatted = rows.map(r => {
      const ageMs = Date.now() - new Date(r.fecha_consulta).getTime();
      return {
        id: r.id,
        ci_usuario: r.ci_usuario,
        score_buro_tradicional: r.score_buro_tradicional,
        fecha_consulta: r.fecha_consulta,
        valido: ageMs < CACHE_TTL_MS
      };
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Clear cache endpoint
app.post('/scoring/cache-clear', async (req, res) => {
  try {
    inMemoryCache.clear();
    await dbRun('DELETE FROM buro_cache_local');
    res.json({ message: 'Caché de memoria y base de datos limpiadas exitosamente.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Initialize database and start server
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
  });
