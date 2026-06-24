import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from app.models.event_store import EventStore
from app.models.read_model import CreditoReadModel
from app.services.security import generar_firma_evento

class CRUDEventEngine:
    
    # ==========================================
    # 1. CREAR / REGISTRAR (Motor CQRS Dual)
    # ==========================================
    def registrar_evento(
        self, 
        db: Session, 
        *, 
        credito_id: uuid.UUID, 
        usuario_id: uuid.UUID, 
        evento_tipo: str, 
        payload: Dict[str, Any]
    ) -> EventStore:
        """
        Inserta un evento inmutable firmado criptográficamente en el EventStore
        y sincroniza automáticamente el Read Model de consultas rápidas.
        """
        # A. Generar la firma digital SHA-256 / RSA para el regulador
        firma = generar_firma_evento(credito_id, evento_tipo, payload)
        
        # B. Persistir en el Event Store
        nuevo_evento = EventStore(
            credito_id=credito_id,
            evento_tipo=evento_tipo,
            payload=payload,
            firma_digital=firma
        )
        db.add(nuevo_evento)
        
        # C. Proyección en el Read Model (CQRS)
        # Buscamos si el registro de lectura rápida ya existe
        stmt = select(CreditoReadModel).where(CreditoReadModel.credito_id == credito_id)
        read_model = db.execute(stmt).scalar_one_or_none()
        
        if not read_model:
            # Si no existe (ej: SOLICITUD_CREADA), se inserta de cero
            read_model = CreditoReadModel(
                credito_id=credito_id,
                usuario_id=usuario_id,
                monto_solicitado=payload.get("monto_solicitado", 0.0),
                plazo_meses=payload.get("plazo_meses", 0),
                estado_actual="PENDIENTE"
            )
            db.add(read_model)
        else:
            # Si ya existe, actualizamos dinámicamente según el flujo
            if "estado_actual" in payload:
                read_model.estado_actual = payload["estado_actual"]
            if "score_final" in payload:
                read_model.score_final = payload["score_final"]
                
        db.commit()
        db.refresh(nuevo_evento)
        return nuevo_evento

    # ==========================================
    # 2. LEER / CONSULTAS (GETS)
    # ==========================================
    def get_credito_actual(self, db: Session, credito_id: uuid.UUID) -> Optional[CreditoReadModel]:
        """Obtiene el estado actual consolidado de un crédito específico."""
        stmt = select(CreditoReadModel).where(CreditoReadModel.credito_id == credito_id)
        return db.execute(stmt).scalar_one_or_none()

    def get_todos_creditos(self, db: Session, skip: int = 0, limit: int = 100) -> List[CreditoReadModel]:
        """Obtiene la lista paginada de todos los créditos del sistema."""
        stmt = select(CreditoReadModel).offset(skip).limit(limit)
        return list(db.execute(stmt).scalars().all())

    def get_creditos_por_usuario(self, db: Session, usuario_id: uuid.UUID) -> List[CreditoReadModel]:
        """Recupera el historial de créditos asociados a un cliente."""
        stmt = select(CreditoReadModel).where(CreditoReadModel.usuario_id == usuario_id)
        return list(db.execute(stmt).scalars().all())

    def get_historial_eventos_auditoria(self, db: Session, credito_id: uuid.UUID) -> List[EventStore]:
        """Recupera la secuencia exacta e inalterable de eventos de un crédito (Para la Super)."""
        stmt = select(EventStore).where(EventStore.credito_id == credito_id).order_by(EventStore.fecha_creacion.asc())
        return list(db.execute(stmt).scalars().all())

    # ==========================================
    # 3. EDITAR / ACTUALIZAR (Read Model)
    # ==========================================
    def actualizar_read_model_manual(
        self, 
        db: Session, 
        credito_id: uuid.UUID, 
        datos_actualizar: Dict[str, Any]
    ) -> Optional[CreditoReadModel]:
        """
        Permite editar campos del Read Model manualmente sin pasar por el flujo de eventos.
        Útil para ajustes operativos de administración.
        """
        stmt = select(CreditoReadModel).where(CreditoReadModel.credito_id == credito_id)
        read_model = db.execute(stmt).scalar_one_or_none()
        
        if read_model:
            for llave, valor in datos_actualizar.items():
                if hasattr(read_model, llave):
                    setattr(read_model, llave, valor)
            db.commit()
            db.refresh(read_model)
        return read_model

    # ==========================================
    # 4. ELIMINAR / BORRAR (Read Model)
    # ==========================================
    def eliminar_read_model_manual(self, db: Session, credito_id: uuid.UUID) -> bool:
        """
        Elimina el registro de visualización rápida del crédito. 
        Nota: El historial en el EventStore permanece intacto por motivos legales.
        """
        stmt = delete(CreditoReadModel).where(CreditoReadModel.credito_id == credito_id)
        resultado = db.execute(stmt)
        db.commit()
        return resultado.rowcount > 0

# Instancia global reutilizable para los servicios
crud_credito = CRUDEventEngine()