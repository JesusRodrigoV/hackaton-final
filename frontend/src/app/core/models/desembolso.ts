export type MetodoDesembolsoId = 'billetera_digital' | 'transferencia_bancaria' | 'efectivo_corresponsal';

export interface MetodoDesembolso {
  id: MetodoDesembolsoId;
  nombre: string;
  icono: string;
  descripcion: string;
  tiempoEstimado: string;
  campos: CampoFormulario[];
}

export interface CampoFormulario {
  key: string;
  label: string;
  placeholder: string;
  tipo: 'text' | 'select';
  opciones?: string[];
}

export interface Desembolso {
  solicitudId: string;
  metodo: MetodoDesembolsoId;
  detalle: Record<string, string>;
  estado: 'pendiente' | 'procesando' | 'completado' | 'fallido';
  fechaCreacion: Date;
  fechaCompletado?: Date;
}
