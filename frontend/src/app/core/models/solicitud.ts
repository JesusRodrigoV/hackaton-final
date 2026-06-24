export interface SolicitudCredito {
  id: string;
  usuarioId: string;
  credito_id?: string;
  monto: number;
  plazoMeses: number;
  motivo: string;
  documentoUrl: string;
  estado: SolicitudEstado;
  scoreAsignado?: number;
  analistaId?: string;
  fechaCreacion: Date;
  fechaResolucion?: Date;
  rechazoMotivo?: string;
}

export type SolicitudEstado =
  | 'pendiente'
  | 'aprobado_auto'
  | 'aprobado_manual'
  | 'rechazado'
  | 'requiere_revision';

export interface CrearSolicitudDto {
  usuario_id: string;        // <- Añadido
  monto_solicitado: number;  // <- Cambiado de monto a monto_solicitado
  plazo_meses: number;       // <- Cambiado de plazoMeses a plazo_meses
  motivo: string;
  documentoBase64: string;
}