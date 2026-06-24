# Backend 2: Microservicio de Scoring & Integración (IA & Resiliencia)

Este microservicio se encarga del cálculo del scoring crediticio del usuario, la integración tolerante a fallos con el mainframe del Buró de Crédito, la explicabilidad del modelo de IA mediante valores SHAP y la persistencia de resultados de auditoría en base de datos.

Implementado en **Node.js (Express)**, utiliza una base de datos **SQLite** optimizada con modo WAL para velocidad de lectura/escritura y la librería **Opossum** para el control de fallos mediante el patrón *Circuit Breaker*.

---

## Arquitectura y Resiliencia

El microservicio está diseñado para proteger el pipeline de negocio frente a la latencia extrema e inestabilidad del Mainframe IBM Z del Buró de Crédito (el cual tiene un retraso de 8-15 segundos):

1. **Caché de Doble Capa (TTL 10 min)**:
   - **Capa 1 (Memoria)**: Un diccionario `inMemoryCache` que resuelve consultas repetidas en microsegundos.
   - **Capa 2 (SQLite)**: La tabla `buro_cache_local` almacena permanentemente las consultas exitosas por CI. Si tiene menos de 10 minutos, se evita la llamada SOAP lenta.

2. **Circuit Breaker (Opossum)**:
   - Envuelve las llamadas al Buró de Crédito.
   - **Timeout de 3 segundos**: Si el Mainframe tarda más, la conexión se aborta de inmediato y se activa el *Fallback*.
   - **Lógica de Bloqueo Automático**: Tras **3 fallos consecutivos** (timeouts o errores de conexión), el circuito se abre (`OPEN`). En este estado, cualquier llamada futura se rechaza inmediatamente sin consultar al buró, ejecutando la lógica alternativa en milisegundos.
   - **Autoclean/Cooldown**: Transcurridos 20 segundos de reposo, el circuito entra en `HALF_OPEN` para verificar si el mainframe se ha recuperado.

3. **Fallback Score**:
   - Si la consulta al buró falla o el breaker está abierto, se calcula el puntaje crediticio **únicamente sobre datos alternativos** (pago de servicios, e-commerce, recargas móviles) para asegurar un tiempo de respuesta menor a 60 segundos.

4. **Motor de IA (SHAP Values)**:
   - Aporta explicabilidad matemática al resultado final, retornando el peso relativo (positivo o negativo) de cada factor en la decisión final (historial de luz, compras e-commerce, recargas de celular, buró tradicional).
   - Si se activa el fallback, el peso de `buro_tradicional` es automáticamente `0.0`.

---

## Estructura del Proyecto

- [server.js](file:///home/ar/Escritorio/ms-scoring/server.js): Código principal del servidor Express. Contiene los endpoints y la configuración del Circuit Breaker y la lógica SHAP.
- [database.js](file:///home/ar/Escritorio/ms-scoring/database.js): Conexión a la base de datos SQLite con optimizaciones de rendimiento y queries asíncronas.
- [package.json](file:///home/ar/Escritorio/ms-scoring/package.json): Gestión de dependencias (`express`, `opossum`, `sqlite3`, `uuid`, `cors`).
- [test.js](file:///home/ar/Escritorio/ms-scoring/test.js): Suite de pruebas de integración automatizadas.
- [scoring.db](file:///home/ar/Escritorio/ms-scoring/scoring.db): Base de datos SQLite creada en tiempo de ejecución.

---

## Modelo de Base de Datos (SQLite)

### 1. Tabla `buro_cache_local`
Registra el historial de respuestas del mainframe para actuar como caché persistente.
```sql
CREATE TABLE buro_cache_local (
  id TEXT PRIMARY KEY,
  ci_usuario TEXT,
  score_buro_tradicional INTEGER,
  fecha_consulta TEXT -- Timestamp ISO
);
```

### 2. Tabla `evaluaciones_scoring`
Almacena el resultado del modelo de IA con la explicabilidad SHAP para auditorías.
```sql
CREATE TABLE evaluaciones_scoring (
  id TEXT PRIMARY KEY,
  credito_id TEXT,
  score_final_generado INTEGER,
  shap_values TEXT, -- JSON serializado
  fecha_evaluacion TEXT
);
```

### 3. Tabla `datos_alternativos_usuario`
Contiene la simulación de fuentes de datos no tradicionales.
```sql
CREATE TABLE datos_alternativos_usuario (
  usuario_id TEXT PRIMARY KEY,
  pago_servicios_al_dia INTEGER, -- 1 = true, 0 = false
  compras_ecommerce_mes INTEGER,
  recargas_moviles_promedio REAL
);
```

---

## API Endpoints

### 1. Evaluar Scoring
- **Método**: `POST`
- **Ruta**: `/scoring/evaluar`
- **Query Params (Simulación)**:
  - `simulate_delay`: Sobrescribe el retraso artificial del Buró (segundos). Útil para forzar timeouts (ej: `simulate_delay=5`).
  - `force_error`: `true` para simular una caída de red directa.
- **Request Body**:
```json
{
  "usuario_id": "a3c4f738-ec73-455b-b9d9-fa93822ba29b",
  "credito_id": "f5f5e3f4-3d07-4223-b09b-a0104ab3239a",
  "ci_usuario": "87654321",
  "datos_alternativos": {
    "pago_servicios_al_dia": true,
    "compras_ecommerce_mes": 12,
    "recargas_moviles_promedio": 45.5
  }
}
```
- **Response Body (Normal)**:
```json
{
  "id": "e93bf81d-85fa-42f0-9b0d-7ff355d8f342",
  "credito_id": "f5f5e3f4-3d07-4223-b09b-a0104ab3239a",
  "score_final_generado": 750,
  "shap_values": {
    "historial_luz": 0.25,
    "billetera_digital": 0.35,
    "recargas_celular": 0.15,
    "buro_tradicional": 0.25
  },
  "fuente_buro": "SOAP_MAINFRAME", // o "CACHE_LOCAL"
  "tiempo_ejecucion_segundos": 0.012,
  "fecha_evaluacion": "2026-06-23T23:08:21.000Z"
}
```
- **Response Body (Fallback - Circuit Breaker / Timeout / Error)**:
```json
{
  "id": "cdbc287a-62df-4273-a4ad-0a4ee9ad55fb",
  "credito_id": "f5f5e3f4-3d07-4223-b09b-a0104ab3239a",
  "score_final_generado": 580,
  "shap_values": {
    "historial_luz": 0.65,
    "billetera_digital": 0.25,
    "recargas_celular": 0.10,
    "buro_tradicional": 0.00
  },
  "fuente_buro": "FALLBACK_CIRCUIT_BREAKER",
  "tiempo_ejecucion_segundos": 0.005,
  "fecha_evaluacion": "2026-06-23T23:08:21.500Z"
}
```

### 2. Estado del Circuit Breaker
- **Método**: `GET`
- **Ruta**: `/scoring/breaker-status`
- **Response**:
```json
{
  "name": "buro_mainframe_breaker",
  "state": "CLOSED", // CLOSED, OPEN, HALF_OPEN
  "fail_count": 0,
  "fail_max": 3,
  "reset_timeout": 20,
  "is_open": false
}
```

### 3. Restablecer Circuit Breaker
- **Método**: `POST`
- **Ruta**: `/scoring/breaker-reset`
- **Response**:
```json
{ "message": "Circuit breaker restablecido exitosamente a CERRADO." }
```

### 4. Consultar Historial de Evaluaciones
- **Método**: `GET`
- **Ruta**: `/scoring/evaluaciones`
- **Query Params**: `limit` (opcional, por defecto 10)

### 5. Consultar Caché SQLite
- **Método**: `GET`
- **Ruta**: `/scoring/cache-local`

### 6. Limpiar Caché (Memoria y DB)
- **Método**: `POST`
- **Ruta**: `/scoring/cache-clear`

---

## Ejecución de Pruebas e Integración

1. **Instalar Dependencias**:
   ```bash
   npm install
   ```

2. **Ejecutar Pruebas Automatizadas**:
   ```bash
   npm test
   ```
   La suite de pruebas levantará el servidor en el puerto `5001`, probará llamadas exitosas de Buró, validará que las siguientes consultas usen la caché (`CACHE_LOCAL`), forzará errores y retrasos para comprobar que el Circuit Breaker entra en estado `OPEN`, verificará la respuesta del fallback instantáneo y los valores SHAP correspondientes, y finalmente limpiará los entornos de prueba.

3. **Iniciar Servidor de Producción/Desarrollo**:
   ```bash
   npm start
   ```
   El servidor correrá en el puerto `5000` (o el puerto especificado en la variable de entorno `PORT`).
