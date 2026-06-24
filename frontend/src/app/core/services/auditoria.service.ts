import { Injectable, signal } from '@angular/core';
import type { AuditLogEntry, DecisionAudit, VariableScore, PesoModelo, TrazaPaso } from '../models/auditoria';

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  readonly #logs = signal<AuditLogEntry[]>(this.#generarLogs());
  readonly logs = this.#logs.asReadonly();

  readonly #decisiones = signal<DecisionAudit[]>(this.#generarDecisiones());
  readonly decisiones = this.#decisiones.asReadonly();

  getDecisionById(solicitudId: string): DecisionAudit | undefined {
    return this.#decisiones().find(d => d.solicitudId === solicitudId);
  }

  getLogsBySolicitud(solicitudId: string): AuditLogEntry[] {
    return this.#logs().filter(l => l.solicitudId === solicitudId);
  }

  #generarLogs(): AuditLogEntry[] {
    const hoy = new Date();
    const makeDate = (min: number) => new Date(hoy.getTime() + min * 60000);

    return [
      {
        id: 'AUD-001', solicitudId: 'SOL-003', timestamp: makeDate(-120), tipo: 'scoring',
        usuario: 'Sistema Scoring v2.1', rol: 'sistema', detalle: 'Score generado: 720 pts. Aprobación automática por umbral >= 600.',
        firmaDigital: 'FIRMA-S3-9F2A1B7C', hashPrevio: '0000000000000000',
      },
      {
        id: 'AUD-002', solicitudId: 'SOL-003', timestamp: makeDate(-119), tipo: 'decision_auto',
        usuario: 'Sistema Scoring v2.1', rol: 'sistema', detalle: 'Decisión automática: APROBADO. Monto solicitado (500) <= umbral auto (500).',
        firmaDigital: 'FIRMA-S3-8E1D2C4B', hashPrevio: 'FIRMA-S3-9F2A1B7C',
      },
      {
        id: 'AUD-003', solicitudId: 'SOL-001', timestamp: makeDate(-90), tipo: 'scoring',
        usuario: 'Sistema Scoring v2.1', rol: 'sistema', detalle: 'Score generado: 480 pts. Requiere revisión manual (score entre 300 y 600).',
        firmaDigital: 'FIRMA-S3-7A3B9C2D', hashPrevio: '0000000000000000',
      },
      {
        id: 'AUD-004', solicitudId: 'SOL-001', timestamp: makeDate(-85), tipo: 'revision',
        usuario: 'Ana Rodríguez', rol: 'analista', detalle: 'Asignada para revisión manual. Evidencia de scoring precargada.',
        firmaDigital: 'FIRMA-AR-5F6E7D8C', hashPrevio: 'FIRMA-S3-7A3B9C2D',
      },
      {
        id: 'AUD-005', solicitudId: 'SOL-001', timestamp: makeDate(-80), tipo: 'decision_manual',
        usuario: 'Ana Rodríguez', rol: 'analista', detalle: 'Aprobación manual. Comentario: Score consistente, historial de pagos positivo.',
        firmaDigital: 'FIRMA-AR-4B3C2D1E', hashPrevio: 'FIRMA-AR-5F6E7D8C',
      },
      {
        id: 'AUD-006', solicitudId: 'SOL-004', timestamp: makeDate(-60), tipo: 'scoring',
        usuario: 'Sistema Scoring v2.1', rol: 'sistema', detalle: 'Score generado: 280 pts. Rechazo automático por score < 300.',
        firmaDigital: 'FIRMA-S3-9C8D7E6F', hashPrevio: '0000000000000000',
      },
      {
        id: 'AUD-007', solicitudId: 'SOL-004', timestamp: makeDate(-59), tipo: 'rechazo',
        usuario: 'Sistema Scoring v2.1', rol: 'sistema', detalle: 'Rechazo automático: Score (280) por debajo del umbral mínimo (300).',
        firmaDigital: 'FIRMA-S3-8F7E6D5C', hashPrevio: 'FIRMA-S3-9C8D7E6F',
      },
    ];
  }

  #generarDecisiones(): DecisionAudit[] {
    const hoy = new Date();

    const factores1: VariableScore[] = [
      { nombre: 'Historial de pagos servicios', valor: 85, contribucion: 35, impacto: 'positivo', descripcion: 'Pagos de luz, agua y telefonía al día en últimos 12 meses' },
      { nombre: 'Actividad en e-commerce', valor: 72, contribucion: 20, impacto: 'positivo', descripcion: 'Volumen de transacciones en plataformas digitales' },
      { nombre: 'Recargas móviles', valor: 65, contribucion: 15, impacto: 'positivo', descripcion: 'Historial consistente de recargas en últimos 6 meses' },
      { nombre: 'Buró de crédito', valor: 45, contribucion: -20, impacto: 'negativo', descripcion: 'Reporte con 2 entradas morosas de baja cuantía (>3 años)' },
      { nombre: 'Estabilidad laboral', valor: 78, contribucion: 10, impacto: 'positivo', descripcion: 'Tiempo estimado en empleo actual basado en transacciones' },
    ];

    const factores2: VariableScore[] = [
      { nombre: 'Historial de pagos servicios', valor: 45, contribucion: 10, impacto: 'positivo', descripcion: 'Pagos irregulares en últimos 12 meses. 2 atrasos registrados.' },
      { nombre: 'Actividad en e-commerce', valor: 82, contribucion: 25, impacto: 'positivo', descripcion: 'Alta actividad en mercados digitales. Ventas consistentes.' },
      { nombre: 'Recargas móviles', valor: 30, contribucion: -8, impacto: 'negativo', descripcion: 'Baja consistencia. Períodos sin recargas por más de 60 días.' },
      { nombre: 'Buró de crédito', valor: 20, contribucion: -35, impacto: 'negativo', descripcion: 'Reporte con 5 entradas morosas activas. Deuda total: $2,300.' },
      { nombre: 'Estabilidad laboral', valor: 55, contribucion: 8, impacto: 'positivo', descripcion: 'Estabilidad media. Cambios frecuentes de empleo.' },
    ];

    const pesos1: PesoModelo[] = [
      { variable: 'Historial de pagos servicios', peso: 0.35, valor: 85, contribucion: 29.75 },
      { variable: 'Actividad en e-commerce', peso: 0.20, valor: 72, contribucion: 14.40 },
      { variable: 'Recargas móviles', peso: 0.15, valor: 65, contribucion: 9.75 },
      { variable: 'Buró de crédito', peso: 0.20, valor: 45, contribucion: -9.00 },
      { variable: 'Estabilidad laboral', peso: 0.10, valor: 78, contribucion: 7.80 },
    ];

    const pesos2: PesoModelo[] = [
      { variable: 'Historial de pagos servicios', peso: 0.35, valor: 45, contribucion: 15.75 },
      { variable: 'Actividad en e-commerce', peso: 0.20, valor: 82, contribucion: 16.40 },
      { variable: 'Recargas móviles', peso: 0.15, valor: 30, contribucion: 4.50 },
      { variable: 'Buró de crédito', peso: 0.20, valor: 20, contribucion: -4.00 },
      { variable: 'Estabilidad laboral', peso: 0.10, valor: 55, contribucion: 5.50 },
    ];

    const traza1: TrazaPaso[] = [
      { paso: 1, descripcion: 'Inicio de scoring', timestamp: new Date(hoy.getTime() - 120 * 60000), detalle: 'Solicitud SOL-003 ingresada al pipeline de scoring.', datos: { solicitudId: 'SOL-003', monto: '500', plazo: '3 meses' } },
      { paso: 2, descripcion: 'Consulta buró de crédito', timestamp: new Date(hoy.getTime() - 119 * 60000), detalle: 'Buró consultado vía API SOAP con circuit breaker. Latencia: 9.2s. Cache hit: no.', datos: { fuente: 'IBM Z SOAP API', latencia: '9.2s', estado: 'success' } },
      { paso: 3, descripcion: 'Consulta servicios públicos', timestamp: new Date(hoy.getTime() - 118 * 60000), detalle: 'Datos de pagos de servicios obtenidos via API REST. 12 meses de historial.', datos: { fuente: 'API Servicios Públicos', periodo: '12 meses', atrasos: '0' } },
      { paso: 4, descripcion: 'Análisis e-commerce', timestamp: new Date(hoy.getTime() - 117 * 60000), detalle: 'Transacciones en plataformas digitales analizadas. Score de actividad: 72/100.', datos: { plataformas: '3', volumen: 'medio' } },
      { paso: 5, descripcion: 'Cálculo de score', timestamp: new Date(hoy.getTime() - 116 * 60000), detalle: 'Score calculado: 720 pts. Pesos del modelo aplicados. Versión modelo: v2.1.3', datos: { score: '720', version: 'v2.1.3', umbralAuto: '600' } },
      { paso: 6, descripcion: 'Decisión automática', timestamp: new Date(hoy.getTime() - 115 * 60000), detalle: 'APROBACIÓN AUTOMÁTICA. Score (720) >= umbral (600) y monto (500) <= umbral auto (500).', datos: { decision: 'aprobada', tipo: 'automatica', firma: 'FIRMA-S3-9F2A1B7C' } },
    ];

    const traza2: TrazaPaso[] = [
      { paso: 1, descripcion: 'Inicio de scoring', timestamp: new Date(hoy.getTime() - 60 * 60000), detalle: 'Solicitud SOL-004 ingresada al pipeline de scoring.', datos: { solicitudId: 'SOL-004', monto: '200', plazo: '2 meses' } },
      { paso: 2, descripcion: 'Consulta buró de crédito', timestamp: new Date(hoy.getTime() - 59 * 60000), detalle: 'Buró consultado vía API SOAP. Latencia: 12.5s. Circuit breaker status: closed.', datos: { fuente: 'IBM Z SOAP API', latencia: '12.5s', estado: 'success' } },
      { paso: 3, descripcion: 'Consulta servicios públicos', timestamp: new Date(hoy.getTime() - 58 * 60000), detalle: 'Datos de pagos obtenidos. Se detectaron 2 atrasos en período.', datos: { fuente: 'API Servicios Públicos', atrasos: '2', periodo: '12 meses' } },
      { paso: 4, descripcion: 'Cálculo de score', timestamp: new Date(hoy.getTime() - 57 * 60000), detalle: 'Score calculado: 280 pts. Score por debajo del umbral mínimo.', datos: { score: '280', umbralMinimo: '300', version: 'v2.1.3' } },
      { paso: 5, descripcion: 'Rechazo automático', timestamp: new Date(hoy.getTime() - 56 * 60000), detalle: 'RECHAZO AUTOMÁTICO. Score (280) < umbral mínimo (300). Notificación generada.', datos: { decision: 'rechazada', motivo: 'Score bajo', firma: 'FIRMA-S3-9C8D7E6F' } },
    ];

    return [
      {
        solicitudId: 'SOL-003', montoSolicitado: 500, plazoMeses: 3, motivo: 'Pago de servicios educativos',
        score: 720, nivelRiesgo: 'bajo', tasaInteres: 12, montoMaximo: 1500,
        factores: factores1, pesosModelo: pesos1,
        decision: 'automatica_aprobada', timestamp: new Date(hoy.getTime() - 115 * 60000),
        analista: null, firmaDigital: 'FIRMA-S3-9F2A1B7C',
        trazabilidad: traza1, documentoUrl: '/mock/doc3.pdf',
        hashCadena: 'HASH-A1B2C3D4E5F6G7H8',
      },
      {
        solicitudId: 'SOL-004', montoSolicitado: 200, plazoMeses: 2, motivo: 'Compra de insumos médicos',
        score: 280, nivelRiesgo: 'muy_alto', tasaInteres: 35, montoMaximo: 100,
        factores: factores2, pesosModelo: pesos2,
        decision: 'automatica_rechazada', timestamp: new Date(hoy.getTime() - 56 * 60000),
        analista: null, firmaDigital: 'FIRMA-S3-9C8D7E6F',
        trazabilidad: traza2, documentoUrl: '/mock/doc4.pdf',
        hashCadena: 'HASH-I9J8K7L6M5N4O3P2',
      },
    ];
  }
}
