export interface SolicitudCredito {
  id: string;
  usuarioId: string;
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
  monto: number;
  plazoMeses: number;
  motivo: string;
  documentoBase64: string;
}
