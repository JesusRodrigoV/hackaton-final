export interface Prestamo {
  id: string;
  solicitudId: string;
  usuarioNombre: string;
  usuarioDocumento: string;
  montoOriginal: number;
  saldoPendiente: number;
  tasaInteres: number;
  plazoMeses: number;
  cuotaMensual: number;
  cuotasPagadas: number;
  totalCuotas: number;
  estado: PrestamoEstado;
  diasAtraso: number;
  fechaProximoPago: Date;
  fechaInicio: Date;
  desembolsoMetodo: string;
}

export type PrestamoEstado = 'al_dia' | 'atrasado' | 'mora' | 'reestructurado' | 'pagado';

export interface Pago {
  id: string;
  prestamoId: string;
  monto: number;
  fecha: Date;
  metodo: string;
  estado: 'completado' | 'pendiente' | 'fallido';
  cuotaNumero: number;
}

export interface AcuerdoPago {
  id: string;
  prestamoId: string;
  montoNuevo: number;
  plazoNuevoMeses: number;
  nuevaCuota: number;
  fecha: Date;
  estado: AcuerdoEstado;
  motivo: string;
}

export type AcuerdoEstado = 'activo' | 'completado' | 'incumplido';
