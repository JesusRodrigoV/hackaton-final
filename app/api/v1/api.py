from fastapi import APIRouter
from app.api.v1.endpoints import creditos, interno

api_router = APIRouter()

api_router.include_router(
    creditos.router, 
    prefix="/creditos", 
    tags=["Solicitudes de Crédito (App Móvil)"]
)

api_router.include_router(
    interno.router, 
    prefix="/interno", 
    tags=["Integración Interna (Microservicios)"]
)