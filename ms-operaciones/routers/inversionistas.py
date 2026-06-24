from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from services.financiero_service import calcular_metricas

router = APIRouter(prefix="/api/inversionistas")


@router.get("/metricas")
async def metricas(session: AsyncSession = Depends(get_db)):
    try:
        data = await calcular_metricas(session)
        return data
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
