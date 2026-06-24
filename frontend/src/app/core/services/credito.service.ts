import { Injectable, inject, computed, effect } from '@angular/core';
import { MessageService } from 'primeng/api';
import { CreditoStore } from '../stores/credito.store';
import { AuthStore } from '../stores/auth.store';
import { ScoringStore } from '../stores/scoring.store';
import { FraudeStore } from '../stores/fraude.store';
import type { SolicitudCredito, CrearSolicitudDto, SolicitudEstado } from '../models/solicitud';

@Injectable({ providedIn: 'root' })
export class CreditoService {
  readonly #store = inject(CreditoStore);
  readonly #auth = inject(AuthStore);
  readonly #scoring = inject(ScoringStore);
  readonly #fraude = inject(FraudeStore);
  readonly #message = inject(MessageService);

  constructor() {
    effect(() => {
      const err = this.#store.error();
      if (err) this.#message.add({ severity: 'error', summary: 'Error de crédito', detail: err, life: 5000 });
    });
  }

  readonly solicitudes = computed(() => this.#store.solicitudes());
  readonly loading = computed(() => this.#store.loading());

  getSolicitudById(id: string): SolicitudCredito | undefined {
    const found = this.#store.solicitudes().find(s => s.id === id);
    if (!found) {
      this.#store.loadById(id).then(sol => {
        if (sol) {
          this.#scoring.evaluar(sol.id, sol.usuarioId, sol.monto);
          this.#fraude.analizar(sol.usuarioId, sol.id);
        }
      });
    }
    return this.#store.solicitudes().find(s => s.id === id);
  }

  getSolicitudesByEstado(estado: SolicitudEstado): SolicitudCredito[] {
    return this.#store.solicitudes().filter(s => s.estado === estado);
  }

  async crearSolicitud(dto: CrearSolicitudDto): Promise<SolicitudCredito> {
    const usuario = this.#auth.usuario();
    if (!usuario?.id) throw new Error('Usuario no autenticado');
    const sol = await this.#store.crearSolicitud(usuario.id, dto.monto_solicitado, dto.plazo_meses, dto.motivo, dto.documentoBase64);
    this.#scoring.evaluar(sol.id, sol.usuarioId, sol.monto);
    this.#fraude.analizar(sol.usuarioId, sol.id);
    return sol;
  }

  loadByUser(usuarioId: string): void {
    void this.#store.loadByUser(usuarioId);
  }

  aprobarSolicitud(id: string, analistaId: string): void {
    this.#store.aprobarSolicitud(id, analistaId);
  }

  rechazarSolicitud(id: string, analistaId: string, motivo: string): void {
    this.#store.rechazarSolicitud(id, analistaId, motivo);
  }
}
