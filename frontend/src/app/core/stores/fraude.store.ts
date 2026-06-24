import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environment/environment';
import type { AnalisisFraude } from '../models/fraude';
import type { FraudeBackendResponse } from '../mappers/fraude.mapper';
import { mapFraudeResponse } from '../mappers/fraude.mapper';

interface FraudeState {
  ultimoAnalisis: AnalisisFraude | null;
  loading: boolean;
  error: string | null;
}

export const FraudeStore = signalStore(
  { providedIn: 'root' },
  withState<FraudeState>({
    ultimoAnalisis: null,
    loading: false,
    error: null,
  }),
  withMethods((store, http = inject(HttpClient)) => ({
    async analizar(usuarioId: string, solicitudId: string): Promise<void> {
      patchState(store, { loading: true, error: null });
      try {
        const res = await firstValueFrom(
          http.get<FraudeBackendResponse>(`${environment.apiUrl}/api/fraude/estado/${usuarioId}`),
        );
        const analisis = mapFraudeResponse(res, solicitudId);
        patchState(store, { ultimoAnalisis: analisis, loading: false });
      } catch (err: any) {
        patchState(store, { loading: false, error: err.message ?? 'Error al verificar fraude' });
      }
    },
  })),
);
