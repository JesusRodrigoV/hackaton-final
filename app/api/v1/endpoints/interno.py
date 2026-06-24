from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.read_model import CreditoReadModel

router = APIRouter()

@router.get("/metricas-inversores")
def obtener_metricas_cartera(db: Session = Depends(get_db)):
    """
    Agrega datos de la tabla ReadModel para consumo de Backend 3.
    Calcula el volumen total de dinero colocado en la calle.
    """
    resultado = db.query(
        func.count(CreditoReadModel.credito_id).label("total_operaciones"),
        func.sum(CreditoReadModel.monto_solicitado).label("monto_total")
    ).filter(
        CreditoReadModel.estado_actual == "DESEMBOLSADO"
    ).first()

    return {
        "origen": "Backend_1_Core_Creditos",
        "metricas": {
            "total_operaciones_exitosas": resultado.total_operaciones or 0,
            "volumen_total_colocado": float(resultado.monto_total) if resultado.monto_total else 0.0
        }
    }