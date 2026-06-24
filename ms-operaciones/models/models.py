import uuid
import enum

from sqlalchemy import Column, String, Integer, Text, Numeric, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from config.database import Base  # import absoluto — funciona con uvicorn main:app


class Usuario(Base):
    __tablename__ = "usuarios"

    usuario_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ci = Column(String(20), unique=True, nullable=False)
    nombre = Column(String(100), nullable=True)
    telefono = Column(String(20), nullable=True)
    vector_biometrico = Column(Text, nullable=True)
    score_gamificacion = Column(Integer, default=0, nullable=False)


class BilleteraTipo(enum.Enum):
    BILLETERA_DIGITAL = "BILLETERA_DIGITAL"
    CUENTA_BANCARIA = "CUENTA_BANCARIA"
    CORRESPONSAL = "CORRESPONSAL"


class BilleteraDestino(Base):
    __tablename__ = "billeteras_destino"

    billetera_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(PG_UUID(as_uuid=True), ForeignKey("usuarios.usuario_id"), nullable=False)
    tipo = Column(SAEnum(BilleteraTipo, name="billetera_tipo", native_enum=False), nullable=False)
    alias = Column(String(100), nullable=True)

    usuario = relationship("Usuario", backref="billeteras")


class DesembolsoEstado(enum.Enum):
    PROCESANDO = "PROCESANDO"
    COMPLETADO = "COMPLETADO"
    FALLIDO = "FALLIDO"


class Desembolso(Base):
    __tablename__ = "desembolsos"

    desembolso_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    credito_id = Column(PG_UUID(as_uuid=True), unique=True, nullable=False)
    billetera_id = Column(PG_UUID(as_uuid=True), ForeignKey("billeteras_destino.billetera_id"), nullable=True)
    monto = Column(Numeric(14, 2), nullable=False)
    estado = Column(
        SAEnum(DesembolsoEstado, name="desembolso_estado", native_enum=False),
        nullable=False,
        default=DesembolsoEstado.PROCESANDO,
    )

    billetera = relationship("BilleteraDestino")


class PagoEstado(enum.Enum):
    AL_DIA = "AL_DIA"
    EN_MORA = "EN_MORA"


class PlanPagosCobranza(Base):
    __tablename__ = "plan_pagos_cobranza"

    cuota_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    credito_id = Column(PG_UUID(as_uuid=True), nullable=False)
    numero_cuota = Column(Integer, nullable=False)
    monto = Column(Numeric(14, 2), nullable=False)
    estado_pago = Column(
        SAEnum(PagoEstado, name="pago_estado", native_enum=False),
        nullable=False,
        default=PagoEstado.AL_DIA,
    )