import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environment/environment';
import type { AuditLogEntry, DecisionAudit, VariableScore, PesoModelo, TrazaPaso } from '../models/auditoria';
import type { ScoringBackendResponse } from '../mappers/scoring.mapper';
import { mapShapValues } from '../mappers/scoring.mapper';

interface AuditoriaState {
  decisiones: DecisionAudit[];
  logs: AuditLogEntry[];
  loading: boolean;
  error: string | null;
}

const MAPA_SHAP_A_FACTORES: Record<string, { nombre: string; impacto: string; descripcion: string; peso: number }> = {
  historial_luz: { nombre: 'Historial de pagos servicios', impacto: 'positivo', descripcion: 'Comportamiento de pago de servicios públicos', peso: 0.35 },
  billetera_digital: { nombre: 'Actividad en e-commerce', impacto: 'positivo', descripcion: 'Volumen de transacciones en plataformas digitales', peso: 0.20 },
  recargas_celular: { nombre: 'Recargas móviles', impacto: 'positivo', descripcion: 'Historial de recargas de telefonía móvil', peso: 0.15 },
  buro_tradicional: { nombre: 'Buró de crédito', impacto: 'negativo', descripcion: 'Reporte de buró de crédito tradicional', peso: 0.20 },
};

export const AuditoriaStore = signalStore(
  { providedIn: 'root' },
  withState<AuditoriaState>({
    decisiones: [],
    logs: [],
    loading: false,
    error: null,
  }),
  withMethods((store, http = inject(HttpClient)) => ({
    async loadEvaluaciones(): Promise<void> {
      patchState(store, { loading: true, error: null });
      try {
        const evals = await firstValueFrom(
          http.get<ScoringBackendResponse[]>(`${environment.apiUrl}/api/scoring/evaluaciones?limit=20`),
        );
        const decisiones: DecisionAudit[] = evals.map((e, _i) => {
          const factores: VariableScore[] = mapShapValues(e.shap_values).map(f => ({
            nombre: f.nombre, valor: f.valor, contribucion: f.contribucion * 100, impacto: f.impacto, descripcion: f.descripcion,
          }));
          const pesos: PesoModelo[] = Object.entries(e.shap_values).map(([k, v]) => {
            const meta = MAPA_SHAP_A_FACTORES[k] ?? { nombre: k, impacto: 'neutro', descripcion: '', peso: 0 };
            return { variable: meta.nombre, peso: meta.peso, valor: Math.round(Math.abs(v) * 100), contribucion: Math.round(v * 100 * meta.peso * 100) / 100 };
          });
          const scoreFinal = e.score_final;
          const nivelRiesgo = scoreFinal >= 650 ? 'bajo' : scoreFinal >= 450 ? 'medio' : scoreFinal >= 300 ? 'alto' : 'muy_alto';
          const decision = e.aprobado ? 'automatica_aprobada' : 'automatica_rechazada';
          return {
            solicitudId: e.ms_scoring_trace?.evaluacion_id ?? e.credito_id ?? '',
            montoSolicitado: 0, plazoMeses: 0, motivo: '',
            score: scoreFinal, nivelRiesgo, tasaInteres: scoreFinal >= 600 ? 12 : 18, montoMaximo: 1500,
            factores, pesosModelo: pesos,
            decision, timestamp: new Date(e.ms_scoring_trace?.fecha_evaluacion ?? Date.now()),
            analista: null, firmaDigital: `FIRMA-S3-${(e.ms_scoring_trace?.evaluacion_id ?? '').slice(0, 8).toUpperCase()}`,
            trazabilidad: [], documentoUrl: '', hashCadena: '',
          };
        });
        patchState(store, { decisiones, loading: false });
      } catch {
        patchState(store, { loading: false });
      }
    },
    getLogsBySolicitud(solicitudId: string): AuditLogEntry[] {
      return store.logs().filter(l => l.solicitudId === solicitudId);
    },
    getDecisionById(solicitudId: string): DecisionAudit | undefined {
      return store.decisiones().find(d => d.solicitudId === solicitudId);
    },
  })),
);
