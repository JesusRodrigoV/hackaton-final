export interface ScoreCredito {
  puntaje: number;
  nivel: NivelRiesgo;
  montoMaximo: number;
  tasaInteres: number;
  factores: FactorScore[];
}

export type NivelRiesgo = 'bajo' | 'medio' | 'alto' | 'muy_alto';

export interface FactorScore {
  nombre: string;
  valor: number;
  contribucion: number;
  impacto: 'positivo' | 'negativo' | 'neutro';
  descripcion: string;
}

export interface DecisionCredito {
  solicitudId: string;
  score: ScoreCredito;
  decision: 'automatica_aprobada' | 'automatica_rechazada' | 'revision_manual';
  timestamp: Date;
  analistaId?: string;
  firmaDigital?: string;
}
