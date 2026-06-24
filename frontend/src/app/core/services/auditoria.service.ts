import { Injectable, inject } from '@angular/core';
import { AuditoriaStore } from '../stores/auditoria.store';
import type { AuditLogEntry, DecisionAudit } from '../models/auditoria';

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  readonly #store = inject(AuditoriaStore);

  readonly logs = this.#store.logs;
  readonly decisiones = this.#store.decisiones;

  getDecisionById(solicitudId: string): DecisionAudit | undefined {
    const d = this.#store.getDecisionById(solicitudId);
    if (!d) this.#store.loadEvaluaciones();
    return this.#store.getDecisionById(solicitudId);
  }

  getLogsBySolicitud(solicitudId: string): AuditLogEntry[] {
    const logs = this.#store.getLogsBySolicitud(solicitudId);
    if (logs.length === 0) this.#store.loadEvaluaciones();
    return this.#store.getLogsBySolicitud(solicitudId);
  }
}
