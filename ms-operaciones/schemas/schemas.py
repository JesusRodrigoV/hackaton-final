from typing import Optional
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel
from pydantic import ConfigDict


class UsuarioCreate(BaseModel):
    ci: str
    nombre: Optional[str] = None
    telefono: Optional[str] = None


class UsuarioResponse(BaseModel):
    usuario_id: UUID
    ci: str
    nombre: Optional[str]
    telefono: Optional[str]
    vector_biometrico: Optional[str]
    score_gamificacion: int

    model_config = ConfigDict(from_attributes=True)


class GamificacionRequest(BaseModel):
    usuario_id: UUID


class GamificacionResponse(BaseModel):
    usuario_id: UUID
    score_gamificacion: int


class DesembolsoRequest(BaseModel):
    credito_id: UUID
    usuario_id: UUID
    monto_desembolsar: Decimal


#class DesembolsoResponse(BaseModel):
#    desembolso_id: UUID
#    credito_id: UUID
#    billetera_id: Optional[UUID]
#    monto: Decimal
#    estado: str

#    model_config = ConfigDict(from_attributes=True)

#class DesembolsoIdempotenteResponse(DesembolsoResponse):
#    ya_procesado: bool

class DesembolsoResponse(BaseModel):
    desembolso_id: UUID
    credito_id: UUID
    billetera_id: Optional[UUID] = None
    monto: Decimal
    estado: str
    model_config = ConfigDict(from_attributes=True)

class DesembolsoIdempotenteResponse(BaseModel):
    desembolso_id: UUID
    credito_id: UUID
    billetera_id: Optional[UUID] = None
    monto: Decimal
    estado: str
    ya_procesado: bool = False  # ✅ default False — no rompe el caso nuevo
    model_config = ConfigDict(from_attributes=True)


class MetricResponse(BaseModel):
    monto_total_desembolsado: float
    tir_simulada_pct: float
    tasa_morosidad_pct: float
    flujo_caja_proyectado: float
