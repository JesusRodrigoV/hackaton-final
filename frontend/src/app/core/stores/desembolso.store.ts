import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environment/environment';
import type { Desembolso, MetodoDesembolsoId } from '../models/desembolso';

interface DesembolsoState {
  desembolsos: Desembolso[];
  loading: boolean;
  error: string | null;
}

interface EjecutarResponse {
  desembolso_id: string;
  estado: string;
  ya_procesado: boolean;
}

export const DesembolsoStore = signalStore(
  { providedIn: 'root' },
  withState<DesembolsoState>({
    desembolsos: [],
    loading: false,
    error: null,
  }),
  withMethods((store, http = inject(HttpClient)) => ({
    async ejecutar(
      creditoId: string,
      usuarioId: string,
      monto: number,
      metodo: MetodoDesembolsoId,
      detalle: Record<string, string>,
    ): Promise<Desembolso> {
      patchState(store, { loading: true, error: null });

      const desembolsoLocal: Desembolso = {
        solicitudId: creditoId,
        metodo,
        detalle,
        estado: 'procesando',
        fechaCreacion: new Date(),
      };
      patchState(store, { desembolsos: [...store.desembolsos(), desembolsoLocal] });

      try {
        const res = await firstValueFrom(
          http.post<EjecutarResponse>(
            `${environment.apiUrl}/api/desembolsos/ejecutar`,
            { credito_id: creditoId, usuario_id: usuarioId, monto_desembolsar: monto },
          ),
        );
        const completado: Desembolso = {
          ...desembolsoLocal,
          estado: res.estado === 'COMPLETADO' ? 'completado' : 'fallido',
          fechaCompletado: new Date(),
        };
        patchState(store, {
          desembolsos: store.desembolsos().map(d =>
            d.solicitudId === creditoId ? completado : d,
          ),
          loading: false,
        });
        return completado;
      } catch {
        const fallido: Desembolso = { ...desembolsoLocal, estado: 'fallido', fechaCompletado: new Date() };
        patchState(store, {
          desembolsos: store.desembolsos().map(d =>
            d.solicitudId === creditoId ? fallido : d,
          ),
          loading: false,
        });
        return fallido;
      }
    },
  })),
);
