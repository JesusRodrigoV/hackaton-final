from pydantic import BaseModel
from uuid import UUID
from typing import Dict, Any

# Mapeo de respuesta de Backend 3 (Módulo de Fraude)
class FraudeCheckResponse(BaseModel):
    estado_biometrico: str
    riesgo_fraude: str

# Payload que le envías a Backend 2 (Módulo de Scoring)
class ScoringRequestInternal(BaseModel):
    credito_id: UUID
    usuario_id: UUID
    monto: float

# Mapeo de lo que responde Backend 2 (Módulo de Scoring)
class ScoringResponseInternal(BaseModel):
    score_final: int
    aprobado: bool
    shap_values: Dict[str, float]
    origen_datos: str

# Payload que le envías a Backend 3 (Módulo de Desembolsos)
class DesembolsoRequestInternal(BaseModel):
    credito_id: UUID
    usuario_id: UUID
    monto_desembolsar: float

# Mapeo de lo que responde Backend 3 (Módulo de Desembolsos)
class DesembolsoResponseInternal(BaseModel):
    transaccion_id: str
    estado: str