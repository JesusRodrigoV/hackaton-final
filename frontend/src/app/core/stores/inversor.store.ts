import { signalStore, withState, withMethods, withHooks, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environment/environment';
import type { CarteraResumen } from '../models/inversor';
import type { MetricasBackendResponse } from '../mappers/inversor.mapper';
import { mapMetricasResponse } from '../mappers/inversor.mapper';

interface InversorState {
  resumen: CarteraResumen | null;
  loading: boolean;
  error: string | null;
}

export const InversorStore = signalStore(
  { providedIn: 'root' },
  withState<InversorState>({
    resumen: null,
    loading: false,
    error: null,
  }),
  withMethods((store, http = inject(HttpClient)) => ({
    async loadMetricas(): Promise<void> {
      patchState(store, { loading: true, error: null });
      try {
        const res = await firstValueFrom(
          http.get<MetricasBackendResponse>(`${environment.apiUrl}/api/inversionistas/metricas`),
        );
        patchState(store, { resumen: mapMetricasResponse(res), loading: false });
      } catch (err: any) {
        patchState(store, { loading: false, error: err.message ?? 'Error al cargar métricas' });
      }
    },
  })),
  withHooks((store) => ({
    onInit() {
      void store.loadMetricas();
    },
  })),
);
