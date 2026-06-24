export interface AuditLogEntry {
  id: string;
  solicitudId: string;
  timestamp: Date;
  tipo: 'scoring' | 'decision_auto' | 'decision_manual' | 'rechazo' | 'revision';
  usuario: string;
  rol: string;
  detalle: string;
  firmaDigital: string;
  hashPrevio: string;
}

export interface DecisionAudit {
  solicitudId: string;
  montoSolicitado: number;
  plazoMeses: number;
  motivo: string;
  score: number;
  nivelRiesgo: string;
  tasaInteres: number;
  montoMaximo: number;
  factores: VariableScore[];
  pesosModelo: PesoModelo[];
  decision: string;
  timestamp: Date;
  analista: string | null;
  firmaDigital: string;
  trazabilidad: TrazaPaso[];
  documentoUrl: string;
  hashCadena: string;
}

export interface VariableScore {
  nombre: string;
  valor: number;
  contribucion: number;
  impacto: string;
  descripcion: string;
}

export interface PesoModelo {
  variable: string;
  peso: number;
  valor: number;
  contribucion: number;
}

export interface TrazaPaso {
  paso: number;
  descripcion: string;
  timestamp: Date;
  detalle: string;
  datos?: Record<string, string>;
}
