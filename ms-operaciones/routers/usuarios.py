from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from models.models import Usuario
from schemas.schemas import UsuarioCreate, UsuarioResponse, GamificacionRequest, GamificacionResponse
from services import biometria_service

router = APIRouter(prefix="/api/usuarios")


@router.post("/registrar", response_model=UsuarioResponse)
async def registrar_usuario(payload: UsuarioCreate, session: AsyncSession = Depends(get_db)):
    vector = biometria_service.generar_vector(payload.ci, payload.nombre or "")
    usuario = Usuario(ci=payload.ci, nombre=payload.nombre, telefono=payload.telefono, vector_biometrico=vector)
    session.add(usuario)
    try:
        await session.commit()
        await session.refresh(usuario)
        return usuario
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="CI ya registrado")


@router.post("/gamificacion/curso", response_model=GamificacionResponse)
async def sumar_puntos_curso(payload: GamificacionRequest, session: AsyncSession = Depends(get_db)):
    q = select(Usuario).where(Usuario.usuario_id == payload.usuario_id)
    res = await session.execute(q)
    usuario = res.scalar_one_or_none()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    usuario.score_gamificacion = (usuario.score_gamificacion or 0) + 100
    session.add(usuario)
    await session.commit()
    await session.refresh(usuario)
    return {"usuario_id": usuario.usuario_id, "score_gamificacion": usuario.score_gamificacion}
