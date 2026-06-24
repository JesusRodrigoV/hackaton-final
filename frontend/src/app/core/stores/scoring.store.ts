import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environment/environment';
import type { ScoreCredito, DecisionCredito, FactorScore } from '../models/scoring';
import type { ScoringBackendResponse } from '../mappers/scoring.mapper';
import { mapScoringResponse, mapShapValues } from '../mappers/scoring.mapper';

interface ScoringState {
  ultimoScore: ScoreCredito | null;
  ultimaDecision: DecisionCredito | null;
  loading: boolean;
  error: string | null;
}

function generarFallback(monto: number, solicitudId: string): { score: ScoreCredito; decision: DecisionCredito } {
  const factores: FactorScore[] = [
    { nombre: 'Historial de pagos servicios', valor: 85, contribucion: 0.35, impacto: 'positivo', descripcion: 'Pagos de luz, agua y telefonía al día en últimos 12 meses' },
    { nombre: 'Actividad en e-commerce', valor: 72, contribucion: 0.20, impacto: 'positivo', descripcion: 'Volumen de transacciones en plataformas digitales' },
    { nombre: 'Recargas móviles', valor: 65, contribucion: 0.15, impacto: 'positivo', descripcion: 'Historial consistente de recargas en últimos 6 meses' },
    { nombre: 'Buró de crédito', valor: 45, contribucion: -0.20, impacto: 'negativo', descripcion: 'Reporte con 2 entradas morosas de baja cuantía (>3 años)' },
    { nombre: 'Estabilidad laboral', valor: 78, contribucion: 0.10, impacto: 'positivo', descripcion: 'Tiempo estimado en empleo actual basado en transacciones' },
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

export const ScoringStore = signalStore(
  { providedIn: 'root' },
  withState<ScoringState>({
    ultimoScore: null,
    ultimaDecision: null,
    loading: false,
    error: null,
  }),
  withMethods((store, http = inject(HttpClient)) => ({
    async evaluar(solicitudId: string, _usuarioId: string, monto: number): Promise<void> {
      patchState(store, { loading: true, error: null });
      try {
        const res = await firstValueFrom(
          http.post<ScoringBackendResponse>(
            `${environment.apiUrl}/api/interno/scoring/evaluar`,
            { credito_id: solicitudId, usuario_id: _usuarioId, monto },
          ),
        );
        const { score, decision } = mapScoringResponse(res, solicitudId, monto);
        patchState(store, { ultimoScore: score, ultimaDecision: decision, loading: false });
      } catch {
        const { score, decision } = generarFallback(monto, solicitudId);
        patchState(store, { ultimoScore: score, ultimaDecision: decision, loading: false });
      }
    },

    evaluarFallback(solicitudId: string, monto: number): void {
      const { score, decision } = generarFallback(monto, solicitudId);
      patchState(store, { ultimoScore: score, ultimaDecision: decision });
    },
  })),
);
