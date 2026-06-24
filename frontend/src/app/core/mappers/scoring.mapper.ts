import type { ScoreCredito, FactorScore, DecisionCredito, NivelRiesgo } from '../models/scoring';

export interface ScoringBackendResponse {
  score_final: number;
  aprobado: boolean;
  shap_values: Record<string, number>;
  origen_datos: string;
  ms_scoring_trace?: {
    evaluacion_id: string;
    tiempo_ejecucion_segundos: number;
    fecha_evaluacion: string;
  };
}

const SHAP_KEY_MAP: Record<string, { nombre: string; descripcion: string }> = {
  historial_luz: { nombre: 'Historial de pagos servicios', descripcion: 'Comportamiento de pago de servicios públicos (luz, agua, telefonía)' },
  billetera_digital: { nombre: 'Actividad en e-commerce', descripcion: 'Volumen de transacciones en plataformas digitales y billeteras' },
  recargas_celular: { nombre: 'Recargas móviles', descripcion: 'Historial y consistencia de recargas de telefonía móvil' },
  buro_tradicional: { nombre: 'Buró de crédito', descripcion: 'Reporte de buró de crédito tradicional con historial de deudas' },
};

function calcularNivel(puntaje: number): NivelRiesgo {
  if (puntaje >= 650) return 'bajo';
  if (puntaje >= 450) return 'medio';
  if (puntaje >= 300) return 'alto';
  return 'muy_alto';
}

function calcularMontoMaximo(puntaje: number): number {
  if (puntaje >= 600) return 1500;
  if (puntaje >= 450) return 800;
  if (puntaje >= 300) return 500;
  return 100;
}

function calcularTasaInteres(puntaje: number): number {
  if (puntaje >= 600) return 12;
  if (puntaje >= 450) return 18;
  if (puntaje >= 300) return 25;
  return 35;
}

export function mapShapValues(shap: Record<string, number>): FactorScore[] {
  return Object.entries(shap).map(([key, contribucion]) => {
    const meta = SHAP_KEY_MAP[key] ?? { nombre: key, descripcion: '' };
    const valor = Math.round(Math.abs(contribucion) * 100);
    return {
      nombre: meta.nombre,
      valor: Math.min(100, Math.max(0, valor)),
      contribucion: Math.round(contribucion * 100) / 100,
      impacto: contribucion >= 0 ? 'positivo' : 'negativo',
      descripcion: meta.descripcion,
    };
  });
}

export function mapScoringResponse(
  raw: ScoringBackendResponse,
  solicitudId: string,
  montoSolicitado: number,
): { score: ScoreCredito; decision: DecisionCredito } {
  const puntaje = raw.score_final;
  const factores = mapShapValues(raw.shap_values);
  const nivel = calcularNivel(puntaje);
  const montoMaximo = calcularMontoMaximo(puntaje);
  const tasaInteres = calcularTasaInteres(puntaje);

  const score: ScoreCredito = { puntaje, nivel, montoMaximo, tasaInteres, factores };

  const UMBRAL_AUTO_MAX = 500;
  const UMBRAL_SCORE_MIN = 300;
  const UMBRAL_SCORE_AUTO = 600;

  const decisionTipo = puntaje >= UMBRAL_SCORE_AUTO && montoSolicitado <= UMBRAL_AUTO_MAX
    ? 'automatica_aprobada'
    : puntaje < UMBRAL_SCORE_MIN
      ? 'automatica_rechazada'
      : 'revision_manual';

  const decision: DecisionCredito = {
    solicitudId,
    score,
    decision: decisionTipo,
    timestamp: new Date(),
    firmaDigital: raw.ms_scoring_trace?.evaluacion_id
      ? `FIRMA-${raw.ms_scoring_trace.evaluacion_id.slice(0, 8).toUpperCase()}`
      : undefined,
  };

  return { score, decision };
}
