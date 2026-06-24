import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.schemas.credito import CreditoCreate
from app.crud.crud_event import crud_credito
from app.services.external_clients import external_client

class CreditoOrquestador:
    
    async def procesar_solicitud_credito(self, db: Session, solicitud: CreditoCreate):
        credito_id = uuid.uuid4()
        usuario_id = solicitud.usuario_id
        monto = solicitud.monto_solicitado

        # 1. Registro Inicial
        crud_credito.registrar_evento(
            db=db,
            credito_id=credito_id,
            usuario_id=usuario_id,
            evento_tipo="SOLICITUD_CREADA",
            payload={
                "monto_solicitado": monto, 
                "plazo_meses": solicitud.plazo_meses, 
                "estado_actual": "EVALUANDO_FRAUDE"
            }
        )

        # 2. Verificación de Fraude (Llamada a Backend 3)
        fraude_resp = await external_client.verificar_fraude(usuario_id)
        
        if fraude_resp.riesgo_fraude == "ALTO" or fraude_resp.estado_biometrico != "VERIFICADO":
            crud_credito.registrar_evento(
                db=db, credito_id=credito_id, usuario_id=usuario_id,
                evento_tipo="CREDITO_RECHAZADO",
                payload={"motivo": "RIESGO_FRAUDE_ALTO", "estado_actual": "RECHAZADO"}
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Crédito rechazado por políticas de prevención de fraude."
            )

        crud_credito.registrar_evento(
            db=db, credito_id=credito_id, usuario_id=usuario_id,
            evento_tipo="FRAUDE_SUPERADO",
            payload={"riesgo": fraude_resp.riesgo_fraude, "estado_actual": "EVALUANDO_SCORING"}
        )

        # 3. Evaluación de Riesgo (Llamada a Backend 2)
        scoring_resp = await external_client.evaluar_scoring(credito_id, usuario_id, monto)

# Agrega esto para ver qué está pasando en la consola de Docker (app-1)
        print(f"DEBUG SCORING: Aprobado={scoring_resp.aprobado}, Score={getattr(scoring_resp, 'score_final', 'N/A')}")
        crud_credito.registrar_evento(
            db=db, credito_id=credito_id, usuario_id=usuario_id,
            evento_tipo="SCORING_EVALUADO",
            payload={
                "score_final": scoring_resp.score_final,
                "origen_datos": scoring_resp.origen_datos,
                "estado_actual": "ANALIZANDO_REGLAS"
            }
        )

        if not scoring_resp.aprobado:
            crud_credito.registrar_evento(
                db=db, credito_id=credito_id, usuario_id=usuario_id,
                evento_tipo="CREDITO_RECHAZADO",
                payload={"motivo": "SCORING_INSUFICIENTE", "estado_actual": "RECHAZADO"}
            )
            #raise HTTPException(
            #    status_code=status.HTTP_400_BAD_REQUEST, 
            #    detail="Crédito rechazado por motor de riesgo."
            #)

        # 4. Regla de Negocio: Aprobación y Desembolso Automático
        if monto > 500:
            crud_credito.registrar_evento(
                db=db, credito_id=credito_id, usuario_id=usuario_id,
                evento_tipo="REVISION_MANUAL_REQUERIDA",
                payload={"motivo": "MONTO_SUPERIOR_AL_LIMITE", "estado_actual": "PENDIENTE_REVISION"}
            )
            return crud_credito.get_credito_actual(db, credito_id)

        crud_credito.registrar_evento(
            db=db, credito_id=credito_id, usuario_id=usuario_id,
            evento_tipo="CREDITO_APROBADO",
            payload={"estado_actual": "APROBADO"}
        )

        # 5. Ejecución del Desembolso (Llamada a Backend 3)
        desembolso_resp = await external_client.ejecutar_desembolso(credito_id, usuario_id, monto)

        crud_credito.registrar_evento(
            db=db, credito_id=credito_id, usuario_id=usuario_id,
            evento_tipo="CREDITO_DESEMBOLSADO",
            payload={
                "transaccion_id": desembolso_resp.transaccion_id,
                "estado_desembolso": desembolso_resp.estado,
                "estado_actual": "DESEMBOLSADO"
            }
        )

        return crud_credito.get_credito_actual(db, credito_id)

# Instancia global del servicio
orquestador_service = CreditoOrquestador()