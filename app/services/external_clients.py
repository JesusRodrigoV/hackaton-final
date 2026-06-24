import httpx
from uuid import UUID
from fastapi import HTTPException, status
from app.core.config import settings
from app.schemas.interno import (
    FraudeCheckResponse,
    ScoringResponseInternal,
    DesembolsoResponseInternal
)

class ExternalServiceClient:
    def __init__(self):
        self.scoring_base_url = settings.SCORING_SERVICE_URL
        self.operations_base_url = settings.OPERATIONS_SERVICE_URL

    async def verificar_fraude(self, usuario_id: UUID) -> FraudeCheckResponse:
        url = f"{self.operations_base_url}/api/interno/fraude/estado/{usuario_id}"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url)
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="Error en la verificación de fraude local."
                    )
                return FraudeCheckResponse(**response.json())
        except httpx.RequestError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Servicio de fraude no disponible."
            )

    async def evaluar_scoring(self, credito_id: UUID, usuario_id: UUID, monto: float) -> ScoringResponseInternal:
        url = f"{self.scoring_base_url}/api/interno/scoring/evaluar"
        payload = {
            "credito_id": str(credito_id),
            "usuario_id": str(usuario_id),
            "monto": monto
        }
        try:
            # Timeout extendido a 20s para tolerar la latencia simulada del Mainframe IBM Z
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(url, json=payload)
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="Error devuelto por el motor de scoring."
                    )
                return ScoringResponseInternal(**response.json())
        except httpx.TimeoutException:
            # Fallback inmediato si el mainframe supera el tiempo tolerado
            return ScoringResponseInternal(
                score_final=400,
                aprobado=False,
                shap_values={"fallback_timeout_mainframe": 1.0},
                origen_datos="FALLBACK_TIMEOUT"
            )
        except httpx.RequestError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Servicio de scoring inaccesible."
            )

    async def ejecutar_desembolso(self, credito_id: UUID, usuario_id: UUID, monto: float) -> DesembolsoResponseInternal:
        url = f"{self.operations_base_url}/api/interno/desembolsos/ejecutar"
        payload = {
            "credito_id": str(credito_id),
            "usuario_id": str(usuario_id),
            "monto_desembolsar": monto
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload)
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="Fallo en la ejecución del desembolso."
                    )
                return DesembolsoResponseInternal(**response.json())
        except httpx.RequestError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Servicio de operaciones y desembolsos fuera de línea."
            )

# Instancia única reutilizable
external_client = ExternalServiceClient()