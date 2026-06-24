import { Injectable } from '@angular/core';
import type { ScoreCredito, DecisionCredito, FactorScore } from '../models/scoring';

@Injectable({ providedIn: 'root' })
export class ScoringService {

  private readonly UMBRAL_AUTO_MAX = 500;
  private readonly UMBRAL_SCORE_MIN = 300;
  private readonly UMBRAL_SCORE_AUTO = 600;

  generarScore(montoSolicitado: number): { score: ScoreCredito; decision: DecisionCredito } {
    const factores: FactorScore[] = [
      {
        nombre: 'Historial de pagos servicios',
        valor: 85,
        contribucion: 0.35,
        impacto: 'positivo',
        descripcion: 'Pagos de luz, agua y telefonía al día en últimos 12 meses',
      },
      {
        nombre: 'Actividad en e-commerce',
        valor: 72,
        contribucion: 0.20,
        impacto: 'positivo',
        descripcion: 'Volumen de transacciones en plataformas digitales',
      },
      {
        nombre: 'Recargas móviles',
        valor: 65,
        contribucion: 0.15,
        impacto: 'positivo',
        descripcion: 'Historial consistente de recargas en últimos 6 meses',
      },
      {
        nombre: 'Buró de crédito',
        valor: 45,
        contribucion: -0.20,
        impacto: 'negativo',
        descripcion: 'Reporte con 2 entradas morosas de baja cuantía (>3 años)',
      },
      {
        nombre: 'Estabilidad laboral',
        valor: 78,
        contribucion: 0.10,
        impacto: 'positivo',
        descripcion: 'Tiempo estimado en empleo actual basado en transacciones',
      },
    ];

    const contribucionNeta = factores.reduce((sum, f) => sum + f.contribucion, 0);
    const puntajeBase = Math.round(contribucionNeta * 1000);
    const puntaje = Math.max(0, Math.min(999, puntajeBase + 300 + Math.floor(Math.random() * 100)));

    const nivel = puntaje >= 650 ? 'bajo' : puntaje >= 450 ? 'medio' : puntaje >= 300 ? 'alto' : 'muy_alto';

    const montoMaximo = puntaje >= 600 ? 1500 : puntaje >= 450 ? 800 : puntaje >= 300 ? 500 : 100;
    const tasaInteres = puntaje >= 600 ? 12 : puntaje >= 450 ? 18 : puntaje >= 300 ? 25 : 35;

    const score: ScoreCredito = { puntaje, nivel, montoMaximo, tasaInteres, factores };

    const aprobacionAutomatica = puntaje >= this.UMBRAL_SCORE_AUTO && montoSolicitado <= this.UMBRAL_AUTO_MAX;
    const rechazoAutomatico = puntaje < this.UMBRAL_SCORE_MIN;

    const decisionTipo = aprobacionAutomatica ? 'automatica_aprobada' : rechazoAutomatico ? 'automatica_rechazada' : 'revision_manual';

    const decision: DecisionCredito = {
      solicitudId: crypto.randomUUID(),
      score,
      decision: decisionTipo,
      timestamp: new Date(),
      firmaDigital: `FIRMA-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    };

    return { score, decision };
  }
}
