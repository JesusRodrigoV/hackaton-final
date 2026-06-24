import uuid
from datetime import datetime
from typing import Any, Dict
from sqlalchemy import String, Text, JSON, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

class EventStore(Base):
    __tablename__ = "event_store"

    # Identificador único de la transacción del evento
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    
    # Identificador del crédito al que pertenece el ciclo de vida (Indexado para búsquedas rápidas)
    credito_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        index=True, 
        nullable=False
    )
    
    # Tipo de evento (Ej: SOLICITUD_CREADA, SCORING_EVALUADO, CREDITO_APROBADO)
    evento_tipo: Mapped[str] = mapped_column(
        String(100), 
        nullable=False
    )
    
    # Payload completo que contiene la instantánea de los datos del evento
    payload: Mapped[Dict[str, Any]] = mapped_column(
        JSON, 
        nullable=False
    )
    
    # Fecha y hora exacta del registro del evento con soporte de zona horaria
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False
    )
    
    # Hash SHA-256 firmado digitalmente (Requisito regulatorio de la Superintendencia)
    # Protege el registro contra alteraciones maliciosas directas en la base de datos
    firma_digital: Mapped[str] = mapped_column(
        Text, 
        nullable=False
    )