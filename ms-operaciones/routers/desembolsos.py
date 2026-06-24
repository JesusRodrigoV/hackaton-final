from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from models.models import Desembolso, DesembolsoEstado
from schemas.schemas import DesembolsoIdempotenteResponse, DesembolsoRequest

router = APIRouter(prefix="/api/interno/desembolsos")


@router.post("/ejecutar", response_model=DesembolsoIdempotenteResponse)
async def ejecutar_desembolso(payload: DesembolsoRequest, session: AsyncSession = Depends(get_db)):
    try:
        q = select(Desembolso).where(Desembolso.credito_id == payload.credito_id)
        res = await session.execute(q)
        existing = res.scalar_one_or_none()
        if existing:
            data = DesembolsoIdempotenteResponse.model_validate(existing).model_dump()
            data["ya_procesado"] = True
            return data

        desembolso = Desembolso(
            credito_id=payload.credito_id,
            monto=payload.monto_desembolsar,
            estado=DesembolsoEstado.COMPLETADO,
        )
        session.add(desembolso)
        await session.commit()
        await session.refresh(desembolso)

        print(
            f"[TRIGGER] WhatsApp enviado a usuario {payload.usuario_id}: "
            f"Desembolso {desembolso.desembolso_id} de Bs.{desembolso.monto} completado."
        )
        print(f"[TRIGGER] SMS cobranza programada para credito {payload.credito_id}.")

        data = DesembolsoIdempotenteResponse.model_validate(desembolso).model_dump()
        data["ya_procesado"] = False
        return data
    except SQLAlchemyError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
