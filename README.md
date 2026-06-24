# NeoLend - API Gateway y microservicios

## Servicios

- `app`: Backend 1 Core Creditos. FastAPI. Ejecutar localmente en `http://localhost:8000`.
- `api-gateway`: puerta de entrada y adaptador de contratos. Puerto `8001`.
- `ms-scoring`: Backend 2 Scoring. Node/Express. Puerto `5000`.
- Futuro Backend 3 Operaciones/Fraude. Esperado en `http://localhost:8002`.

## .env de Backend 1

El archivo `.env` va en la raiz del proyecto, al mismo nivel que `app`.

`app/core/config.py` ya lee `.env`, por lo que se debe iniciar `uvicorn` desde la raiz del proyecto.

## Ejecutar Backend 1 local

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Ejecutar API Gateway + ms-scoring en Docker

```bash
docker compose up --build
```

En Docker, el Gateway consume:

- `app`: `http://host.docker.internal:8000`
- `ms-scoring`: `http://ms-scoring:5000`
- operaciones futuro: `http://host.docker.internal:8002`

## Rutas del Gateway

Health:

```http
GET http://localhost:8001/health
GET http://localhost:8001/api/gateway/routes
```

Core Creditos hacia `app`:

```http
POST http://localhost:8001/api/creditos/solicitar
GET  http://localhost:8001/api/creditos/{credito_id}
GET  http://localhost:8001/api/creditos/usuario/{usuario_id}
GET  http://localhost:8001/api/interno/creditos/metricas
```

Scoring raw hacia `ms-scoring`:

```http
POST http://localhost:8001/api/scoring/evaluar
GET  http://localhost:8001/api/scoring/breaker-status
GET  http://localhost:8001/api/scoring/evaluaciones
GET  http://localhost:8001/api/scoring/cache-local
POST http://localhost:8001/api/scoring/cache-clear
```

Adaptador interno para Backend 1:

```http
POST http://localhost:8001/api/interno/scoring/evaluar
```

Entrada esperada desde `app`:

```json
{
  "credito_id": "uuid",
  "usuario_id": "uuid",
  "monto": 500
}
```

Salida adaptada para `app`:

```json
{
  "score_final": 750,
  "aprobado": true,
  "shap_values": {
    "historial_luz": 0.25,
    "billetera_digital": 0.35,
    "recargas_celular": 0.15,
    "buro_tradicional": 0.25
  },
  "origen_datos": "SOAP_MAINFRAME"
}
```
