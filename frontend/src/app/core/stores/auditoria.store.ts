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

async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32).toUpperCase();
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

        const decisiones: DecisionAudit[] = [];
        const logs: AuditLogEntry[] = [];
        let prevHash = '0000000000000000';

        for (const e of evals) {
          const scoreFinal = e.score_final;
          const fechaEval = new Date(e.ms_scoring_trace?.fecha_evaluacion ?? Date.now());

          const factores: VariableScore[] = mapShapValues(e.shap_values).map(f => ({
            nombre: f.nombre, valor: f.valor, contribucion: f.contribucion * 100, impacto: f.impacto, descripcion: f.descripcion,
          }));
          const pesos: PesoModelo[] = Object.entries(e.shap_values).map(([k, v]) => {
            const meta = MAPA_SHAP_A_FACTORES[k] ?? { nombre: k, impacto: 'neutro', descripcion: '', peso: 0 };
            return { variable: meta.nombre, peso: meta.peso, valor: Math.round(Math.abs(v) * 100), contribucion: Math.round(v * 100 * meta.peso * 100) / 100 };
          });

          const nivelRiesgo = scoreFinal >= 650 ? 'bajo' : scoreFinal >= 450 ? 'medio' : scoreFinal >= 300 ? 'alto' : 'muy_alto';
          const decisionTipo = e.aprobado ? 'automatica_aprobada' : 'automatica_rechazada';
          const idSolicitud = e.ms_scoring_trace?.evaluacion_id ?? '';
          const firmaDigital = `FIRMA-S3-${idSolicitud.slice(0, 8).toUpperCase()}`;

          const rawInput = `${idSolicitud}|${scoreFinal}|${e.aprobado}|${prevHash}`;
          const hashCadena = await hashString(rawInput);

          const trazabilidad: TrazaPaso[] = [
            { paso: 1, descripcion: 'Recepción de solicitud', timestamp: new Date(fechaEval.getTime() - 60000), detalle: `Solicitud ${idSolicitud} recibida`, datos: { credito_id: idSolicitud } },
            { paso: 2, descripcion: 'Carga de datos alternativos', timestamp: new Date(fechaEval.getTime() - 45000), detalle: 'Fuentes: buró crédito, servicios públicos, e-commerce, recargas móviles', datos: { fuentes: 'buro,servicios,ecommerce,recargas' } },
            { paso: 3, descripcion: 'Evaluación de scoring', timestamp: fechaEval, detalle: `Score generado: ${scoreFinal} pts`, datos: { score: String(scoreFinal) } },
            { paso: 4, descripcion: 'Cálculo de SHAP values', timestamp: new Date(fechaEval.getTime() + 15000), detalle: 'Factores explicables calculados', datos: { shap_values: JSON.stringify(e.shap_values) } },
            { paso: 5, descripcion: `Decisión: ${e.aprobado ? 'APROBADO' : 'RECHAZADO'}`, timestamp: new Date(fechaEval.getTime() + 30000), detalle: `Decisión automática basada en score umbral`, datos: { decision: decisionTipo } },
            { paso: 6, descripcion: 'Registro en cadena de auditoría', timestamp: new Date(fechaEval.getTime() + 45000), detalle: `Hash: ${hashCadena.slice(0, 16)}...`, datos: { hash_previo: prevHash, hash_actual: hashCadena } },
          ];

          decisiones.push({
            solicitudId: idSolicitud,
            montoSolicitado: 0, plazoMeses: 0, motivo: '',
            score: scoreFinal, nivelRiesgo, tasaInteres: scoreFinal >= 600 ? 12 : 18, montoMaximo: 1500,
            factores, pesosModelo: pesos,
            decision: decisionTipo, timestamp: fechaEval,
            analista: null, firmaDigital,
            trazabilidad, documentoUrl: '', hashCadena,
          });

          logs.push({
            id: `AUD-${idSolicitud.slice(0, 8)}`,
            solicitudId: idSolicitud,
            timestamp: fechaEval,
            tipo: 'scoring',
            usuario: 'Sistema Scoring v2.1',
            rol: 'sistema',
            detalle: `Score generado: ${scoreFinal} pts — ${e.aprobado ? 'APROBADO' : 'RECHAZADO'}`,
            firmaDigital,
            hashPrevio: prevHash,
          });

          if (e.aprobado) {
            logs.push({
              id: `AUD-${idSolicitud.slice(0, 8)}-DEC`,
              solicitudId: idSolicitud,
              timestamp: new Date(fechaEval.getTime() + 30000),
              tipo: 'decision_auto',
              usuario: 'Sistema Scoring v2.1',
              rol: 'sistema',
              detalle: `Decisión automática: APROBADO. Score: ${scoreFinal} pts supera umbral.`,
              firmaDigital: `${firmaDigital}-DEC`,
              hashPrevio: firmaDigital,
            });
          }

          prevHash = hashCadena;
        }

        patchState(store, { decisiones, logs, loading: false });
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
