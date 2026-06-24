import type { SolicitudCredito, SolicitudEstado } from '../models/solicitud';

export interface CreditoBackendResponse {
  credito_id: string;
  usuario_id: string;
  monto_solicitado: number;
  plazo_meses: number;
  estado_actual: string;
  score_final: number | null;
  fecha_creacion: string;
}

export interface CreditoCreatePayload {
  usuario_id: string;
  monto_solicitado: number;
  plazo_meses: number;
}

const ESTADO_MAP: Record<string, SolicitudEstado> = {
  APROBADO: 'aprobado_auto',
  APROBADO_AUTO: 'aprobado_auto',
  DESEMBOLSADO: 'aprobado_auto',
  RECHAZADO: 'rechazado',
  RECHAZADO_AUTO: 'rechazado',
  PENDIENTE_REVISION: 'pendiente',
  PENDIENTE: 'pendiente',
  EVALUANDO_FRAUDE: 'pendiente',
  EVALUANDO_SCORING: 'pendiente',
  ANALIZANDO_REGLAS: 'pendiente',
  SOLICITUD_CREADA: 'pendiente',
};

function mapEstado(estadoActual: string): SolicitudEstado {
  return ESTADO_MAP[estadoActual.toUpperCase()] ?? 'pendiente';
}

export function mapCreditoResponse(raw: CreditoBackendResponse): SolicitudCredito {
  return {
    id: raw.credito_id,
    usuarioId: raw.usuario_id,
    monto: raw.monto_solicitado,
    plazoMeses: raw.plazo_meses,
    motivo: '',
    documentoUrl: '',
    estado: mapEstado(raw.estado_actual),
    scoreAsignado: raw.score_final ?? undefined,
    fechaCreacion: new Date(raw.fecha_creacion),
    fechaResolucion: ['APROBADO', 'RECHAZADO', 'DESEMBOLSADO'].includes(raw.estado_actual.toUpperCase())
      ? new Date(raw.fecha_creacion)
      : undefined,
  };
}
