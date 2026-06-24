from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class CreditoCreate(BaseModel):
    usuario_id: UUID
    monto_solicitado: float = Field(..., gt=0, description="Monto en la moneda local o dólares")
    plazo_meses: int = Field(..., gt=0, le=60)

class CreditoResponse(BaseModel):
    credito_id: UUID
    usuario_id: UUID
    monto_solicitated: float = Field(..., alias="monto_solicitado")
    plazo_meses: int
    estado_actual: str
    score_final: Optional[int] = None
    fecha_creacion: datetime

    class Config:
        from_attributes = True
        populate_by_name = True