import uuid
from datetime import datetime
from sqlalchemy import String, Numeric, Integer, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

class CreditoReadModel(Base):
    __tablename__ = "creditos_read_model"

    credito_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True
    )
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        index=True, 
        nullable=False
    )
    monto_solicitado: Mapped[float] = mapped_column(
        Numeric(10, 2), 
        nullable=False
    )
    plazo_meses: Mapped[int] = mapped_column(
        Integer, 
        nullable=False
    )
    estado_actual: Mapped[str] = mapped_column(
        String(50), 
        default="PENDIENTE", 
        nullable=False
    )
    score_final: Mapped[int] = mapped_column(
        Integer, 
        nullable=True
    )
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False
    )
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now(), 
        nullable=False
    )