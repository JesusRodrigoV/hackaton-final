from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.core.config import settings

app = FastAPI(
    title="Core de Créditos - Backend 1",
    description="Microservicio principal de orquestación, Event Sourcing y CQRS.",
    version="1.0.0",
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, reemplazar por el dominio del Frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Integración de todos los endpoints bajo el prefijo /api/v1
app.include_router(api_router, prefix="/api/v1")

@app.get("/health", tags=["Healthcheck"])
def health_check():
    """Endpoint básico para verificar que el servidor está arriba."""
    return {"status": "operativo", "entorno": settings.ENVIRONMENT}