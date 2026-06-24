from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.models import Desembolso, PlanPagosCobranza, DesembolsoEstado


async def calcular_metricas(session: AsyncSession) -> dict:
    # monto total desembolsado (COMPLETADO)
    q_total = select(func.coalesce(func.sum(Desembolso.monto), 0)).where(Desembolso.estado == DesembolsoEstado.COMPLETADO)
    res_total = await session.execute(q_total)
    monto_total = res_total.scalar_one() or Decimal(0)

    monto_total_f = float(monto_total)

    # TIR simulada
    tir_simulada = round(monto_total_f * 0.15, 2)

    # tasa de morosidad: count EN_MORA / total
    q_mora = select(func.count()).where(PlanPagosCobranza.estado_pago == 'EN_MORA')
    res_mora = await session.execute(q_mora)
    count_mora = res_mora.scalar_one() or 0

    q_total_cuotas = select(func.count()).select_from(PlanPagosCobranza)
    res_total_cuotas = await session.execute(q_total_cuotas)
    total_cuotas = res_total_cuotas.scalar_one() or 0

    tasa_morosidad = (float(count_mora) / float(total_cuotas) * 100) if total_cuotas > 0 else 0.0
    tasa_morosidad = round(tasa_morosidad, 2)

    flujo_caja = round(monto_total_f * 1.18, 2)

    return {
        "monto_total_desembolsado": round(monto_total_f, 2),
        "tir_simulada_pct": tir_simulada,
        "tasa_morosidad_pct": tasa_morosidad,
        "flujo_caja_proyectado": flujo_caja,
    }
