const { spawn } = require('child_process');
const http = require('http');

const PORT = 5001;
const BASE_URL = `http://localhost:${PORT}`;

let serverProcess;

function startServer() {
  return new Promise((resolve, reject) => {
    console.log('Starting server for integration testing...');
    serverProcess = spawn('node', ['server.js'], {
      env: { ...process.env, PORT: PORT },
      stdio: 'pipe'
    });

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Server] ${output.trim()}`);
      if (output.includes('Server is running on port') || output.includes('Database tables initialized.')) {
        // Give it another 500ms to be fully up
        setTimeout(resolve, 500);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Server Error] ${data.toString()}`);
    });

    serverProcess.on('error', (err) => {
      reject(err);
    });
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    console.log('Server stopped.');
  }
}

// Helper to make POST/GET requests using native fetch
async function apiCall(path, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API call to ${path} failed with status ${response.status}: ${text}`);
  }
  return response.json();
}

async function runTests() {
  try {
    // 0. Clear cache at start
    console.log('\n--- Clearing cache ---');
    const clearResult = await apiCall('/scoring/cache-clear', 'POST');
    console.log('Clear cache:', clearResult.message);

    // Setup payload
    const testUserId = "a3c4f738-ec73-455b-b9d9-fa93822ba29b";
    const testCreditoId = "f5f5e3f4-3d07-4223-b09b-a0104ab3239a";
    const testCi = "87654321";

    const payload = {
      usuario_id: testUserId,
      credito_id: testCreditoId,
      ci_usuario: testCi,
      datos_alternativos: {
        pago_servicios_al_dia: true,
        compras_ecommerce_mes: 12,
        recargas_moviles_promedio: 45.5
      }
    };

    // 1. Test fast successful query
    console.log('\n--- Test 1: Fast evaluation (no delay) ---');
    const start1 = Date.now();
    const res1 = await apiCall('/scoring/evaluar?simulate_delay=0', 'POST', payload);
    const elapsed1 = Date.now() - start1;
    console.log('Result 1 Score:', res1.score_final_generado);
    console.log('Result 1 Source:', res1.fuente_buro);
    console.log('Result 1 Execution Time (s):', res1.tiempo_ejecucion_segundos);
    console.log('SHAP values:', res1.shap_values);
    
    if (res1.fuente_buro !== 'SOAP_MAINFRAME') throw new Error('Expected SOAP_MAINFRAME source');
    if (res1.shap_values.buro_tradicional === 0.0) throw new Error('Expected non-zero traditional bureau SHAP value');
    console.log('Test 1 passed!');

    // 2. Test cache hits
    console.log('\n--- Test 2: Cache hit ---');
    const start2 = Date.now();
    // Simulate a high delay (10s), but because of cache, it should be instant (<0.5s)
    const res2 = await apiCall('/scoring/evaluar?simulate_delay=10', 'POST', payload);
    const elapsed2 = Date.now() - start2;
    console.log('Result 2 Score:', res2.score_final_generado);
    console.log('Result 2 Source:', res2.fuente_buro);
    console.log('Result 2 Execution Time (s):', res2.tiempo_ejecucion_segundos);
    
    if (res2.fuente_buro !== 'CACHE_LOCAL') throw new Error('Expected CACHE_LOCAL source');
    if (res2.score_final_generado !== res1.score_final_generado) throw new Error('Expected cached score to match original score');
    if (elapsed2 > 1500) throw new Error(`Expected cache hit to be fast, but it took ${elapsed2}ms`);
    console.log('Test 2 passed!');

    // 3. Test circuit breaker trigger and fallback
    console.log('\n--- Test 3: Circuit Breaker and Fallback ---');
    const targetCi = "55555555";
    const failPayload = {
      ...payload,
      ci_usuario: targetCi,
      datos_alternativos: {
        pago_servicios_al_dia: false,
        compras_ecommerce_mes: 2,
        recargas_moviles_promedio: 10.0
      }
    };

    // We will trigger 3 consecutive failures.
    // Failure 1: Forced error
    console.log('Triggering Failure 1 (Forced Error)...');
    const fail1 = await apiCall('/scoring/evaluar?force_error=true', 'POST', failPayload);
    console.log('Failure 1 source:', fail1.fuente_buro);
    if (fail1.fuente_buro !== 'FALLBACK_CIRCUIT_BREAKER') throw new Error('Expected fallback');

    // Failure 2: Timeout (delay 5s, timeout limit is 3s)
    console.log('Triggering Failure 2 (Timeout, delay 5s)...');
    const fail2 = await apiCall('/scoring/evaluar?simulate_delay=5', 'POST', failPayload);
    console.log('Failure 2 source:', fail2.fuente_buro);
    if (fail2.fuente_buro !== 'FALLBACK_CIRCUIT_BREAKER') throw new Error('Expected fallback');

    // Failure 3: Forced error -> should trip breaker!
    console.log('Triggering Failure 3 (Forced Error) -> Tripping Breaker...');
    const fail3 = await apiCall('/scoring/evaluar?force_error=true', 'POST', failPayload);
    console.log('Failure 3 source:', fail3.fuente_buro);
    if (fail3.fuente_buro !== 'FALLBACK_CIRCUIT_BREAKER') throw new Error('Expected fallback');

    // Check breaker status
    const status = await apiCall('/scoring/breaker-status');
    console.log('Breaker status:', status);
    if (status.state !== 'OPEN') throw new Error('Expected circuit breaker to be OPEN');

    // Failure 4: Fast query (delay 0), but since breaker is OPEN, it should use fallback instantly
    console.log('Triggering Query 4 (simulate_delay=0) during OPEN state...');
    const start4 = Date.now();
    const res4 = await apiCall('/scoring/evaluar?simulate_delay=0', 'POST', failPayload);
    const elapsed4 = Date.now() - start4;
    console.log('Query 4 source:', res4.fuente_buro);
    console.log('Query 4 execution time (ms):', elapsed4);
    console.log('SHAP values during fallback:', res4.shap_values);
    
    if (res4.fuente_buro !== 'FALLBACK_CIRCUIT_BREAKER') throw new Error('Expected fallback');
    if (res4.shap_values.buro_tradicional !== 0.0) throw new Error('Expected zero traditional bureau SHAP value');
    if (elapsed4 > 100) throw new Error('Expected instant fallback call');
    console.log('Test 3 passed!');

    // 4. Test circuit breaker reset
    console.log('\n--- Test 4: Circuit Breaker Reset ---');
    const resetRes = await apiCall('/scoring/breaker-reset', 'POST');
    console.log('Reset response:', resetRes.message);

    const statusAfter = await apiCall('/scoring/breaker-status');
    console.log('Breaker status after reset:', statusAfter);
    if (statusAfter.state !== 'CLOSED') throw new Error('Expected circuit breaker to be CLOSED');
    console.log('Test 4 passed!');

    // 5. Test evaluations and cache retrieval endpoints
    console.log('\n--- Test 5: Metadata retrieval endpoints ---');
    const evals = await apiCall('/scoring/evaluaciones');
    console.log('Evaluations count:', evals.length);
    if (evals.length < 3) throw new Error('Expected at least 3 evaluations in database');

    const caches = await apiCall('/scoring/cache-local');
    console.log('Local caches count:', caches.length);
    if (caches.length < 1) throw new Error('Expected cache items in SQLite');

    console.log('Test 5 passed!');

    console.log('\n=========================================');
    console.log('ALL TESTS COMPLETED SUCCESSFULLY! 🎉');
    console.log('=========================================');
    return true;

  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    return false;
  }
}

async function main() {
  try {
    await startServer();
    const success = await runTests();
    stopServer();
    process.exit(success ? 0 : 1);
  } catch (err) {
    console.error('Failed to run integration tests:', err);
    stopServer();
    process.exit(1);
  }
}

main();
