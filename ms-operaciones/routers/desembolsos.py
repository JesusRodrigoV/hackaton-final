from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError

from config.database import get_db
from models.models import Desembolso, DesembolsoEstado
from schemas.schemas import DesembolsoRequest, DesembolsoIdempotenteResponse

router = APIRouter(prefix="/api/interno/desembolsos")


@router.post("/ejecutar", response_model=DesembolsoIdempotenteResponse)
async def ejecutar_desembolso(
    payload: DesembolsoRequest,
    session: AsyncSession = Depends(get_db)
):
    try:
        res = await session.execute(
            select(Desembolso).where(Desembolso.credito_id == payload.credito_id)
        )
        existing = res.scalar_one_or_none()

        if existing:
            # ✅ Idempotencia: ya existe, retorna sin duplicar
            return DesembolsoIdempotenteResponse(
                desembolso_id=existing.desembolso_id,
                credito_id=existing.credito_id,
                billetera_id=existing.billetera_id,
                monto=existing.monto,
                estado=existing.estado.value,
                ya_procesado=True
            )

        # ✅ Nuevo desembolso
        desembolso = Desembolso(
            credito_id=payload.credito_id,
            monto=payload.monto_desembolsar,
            estado=DesembolsoEstado.COMPLETADO
        )
        session.add(desembolso)
        await session.commit()
        await session.refresh(desembolso)

        print(f"[TRIGGER] WhatsApp enviado a usuario {payload.usuario_id}: "
              f"Desembolso {desembolso.desembolso_id} de Bs.{desembolso.monto} completado.")
        print(f"[TRIGGER] SMS cobranza programada para credito {payload.credito_id}.")

        # ✅ Construido explícitamente — ya_procesado=False por default
        return DesembolsoIdempotenteResponse(
            desembolso_id=desembolso.desembolso_id,
            credito_id=desembolso.credito_id,
            billetera_id=desembolso.billetera_id,
            monto=desembolso.monto,
            estado=desembolso.estado.value,
            ya_procesado=False
        )

    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )