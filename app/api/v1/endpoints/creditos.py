from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.schemas.credito import CreditoCreate, CreditoResponse
from app.services.credito_orquestador import orquestador_service
from app.crud.crud_event import crud_credito

router = APIRouter()

@router.post("/solicitar", response_model=CreditoResponse, status_code=status.HTTP_201_CREATED)
async def solicitar_credito(
    solicitud: CreditoCreate,
    db: Session = Depends(get_db)
):
    """Inicia el orquestador para procesar un nuevo crédito."""
    return await orquestador_service.procesar_solicitud_credito(db=db, solicitud=solicitud)

@router.get("/{credito_id}", response_model=CreditoResponse)
def obtener_estado_credito(
    credito_id: UUID,
    db: Session = Depends(get_db)
):
    """Consulta en tiempo real el estado en el Read Model (CQRS)."""
    credito = crud_credito.get_credito_actual(db=db, credito_id=credito_id)
    if not credito:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crédito no encontrado.")
    return credito

@router.get("/usuario/{usuario_id}", response_model=List[CreditoResponse])
def listar_creditos_usuario(
    usuario_id: UUID,
    db: Session = Depends(get_db)
):
    """Lista todos los créditos asociados a un cliente específico."""
    return crud_credito.get_creditos_por_usuario(db=db, usuario_id=usuario_id)