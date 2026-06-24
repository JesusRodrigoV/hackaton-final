from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from models.models import Usuario
from services import biometria_service

router = APIRouter(prefix="/api/interno/fraude")


@router.get("/estado/{usuario_id}")
async def estado_biometrico(usuario_id: str, session: AsyncSession = Depends(get_db)):
    q = select(Usuario).where(Usuario.usuario_id == usuario_id)
    res = await session.execute(q)
    usuario = res.scalar_one_or_none()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    result = biometria_service.verificar_vector(usuario.vector_biometrico)
    return result
