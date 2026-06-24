import { Injectable, inject, computed } from '@angular/core';
import { ScoringStore } from '../stores/scoring.store';
import type { ScoreCredito, DecisionCredito } from '../models/scoring';

@Injectable({ providedIn: 'root' })
export class ScoringService {
  readonly #store = inject(ScoringStore);

  readonly ultimoResultado = computed(() => {
    const score = this.#store.ultimoScore();
    const decision = this.#store.ultimaDecision();
    if (score && decision) return { score, decision };
    return this.#generarFallback(0, '');
  });

  generarScore(montoSolicitado: number): { score: ScoreCredito; decision: DecisionCredito } {
    const cached = this.#store.ultimoScore();
    const decision = this.#store.ultimaDecision();
    if (cached && decision) return { score: cached, decision };
    return this.#generarFallback(montoSolicitado, '');
  }

  async evaluar(solicitudId: string, usuarioId: string, monto: number): Promise<void> {
    await this.#store.evaluar(solicitudId, usuarioId, monto);
  }

  #generarFallback(monto: number, solicitudId: string): { score: ScoreCredito; decision: DecisionCredito } {
    const factores = [
      { nombre: 'Historial de pagos servicios', valor: 85, contribucion: 0.35, impacto: 'positivo' as const, descripcion: 'Pagos de luz, agua y telefonía al día en últimos 12 meses' },
      { nombre: 'Actividad en e-commerce', valor: 72, contribucion: 0.20, impacto: 'positivo' as const, descripcion: 'Volumen de transacciones en plataformas digitales' },
      { nombre: 'Recargas móviles', valor: 65, contribucion: 0.15, impacto: 'positivo' as const, descripcion: 'Historial consistente de recargas en últimos 6 meses' },
      { nombre: 'Buró de crédito', valor: 45, contribucion: -0.20, impacto: 'negativo' as const, descripcion: 'Reporte con 2 entradas morosas de baja cuantía (>3 años)' },
      { nombre: 'Estabilidad laboral', valor: 78, contribucion: 0.10, impacto: 'positivo' as const, descripcion: 'Tiempo estimado en empleo actual basado en transacciones' },
    ];
    const contribucionNeta = factores.reduce((sum, f) => sum + f.contribucion, 0);
    const puntaje = Math.max(0, Math.min(999, Math.round(contribucionNeta * 1000) + 300));
    const nivel = puntaje >= 650 ? 'bajo' : puntaje >= 450 ? 'medio' : puntaje >= 300 ? 'alto' : 'muy_alto';
    const montoMaximo = puntaje >= 600 ? 1500 : puntaje >= 450 ? 800 : puntaje >= 300 ? 500 : 100;
    const tasaInteres = puntaje >= 600 ? 12 : puntaje >= 450 ? 18 : puntaje >= 300 ? 25 : 35;
    const score: ScoreCredito = { puntaje, nivel, montoMaximo, tasaInteres, factores };
    const decisionTipo = puntaje >= 600 && monto <= 500 ? 'automatica_aprobada' : puntaje < 300 ? 'automatica_rechazada' : 'revision_manual';
    const decision: DecisionCredito = { solicitudId, score, decision: decisionTipo, timestamp: new Date() };
    return { score, decision };
  }
}
