import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment/environment';
import type { Usuario } from '../models/usuario';

interface AuthState {
  usuario: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

interface RegisterResponse {
  usuario_id: string;
}

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState<AuthState>({
    usuario: {
      id: 'USR-001',
      nombre: 'Carlos Méndez',
      documento: '12345678',
      email: 'carlos@email.com',
      telefono: '59170000000',
      rol: 'solicitante',
    },
    token: 'sess-demo-seed',
    isAuthenticated: true,
    loading: false,
    error: null,
  }),
  withComputed((store) => ({
    isAnalista: () => store.usuario()?.rol === 'analista' || store.usuario()?.rol === 'admin',
  })),
  withMethods((store, http = inject(HttpClient)) => ({
    login: rxMethod<{ documento: string; nombre: string; rol: Usuario['rol'] }>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(({ documento, nombre, rol }) =>
          http.post<RegisterResponse>(`${environment.apiUrl}/api/usuarios/registrar`, {
            ci: documento,
            nombre,
          }).pipe(
            tap({
              next: (res) => patchState(store, {
                usuario: {
                  id: res.usuario_id,
                  nombre,
                  documento,
                  email: '',
                  telefono: '',
                  rol,
                },
                token: `sess-${crypto.randomUUID().slice(0, 12)}`,
                isAuthenticated: true,
                loading: false,
                error: null,
              }),
              error: (err) => patchState(store, {
                loading: false,
                error: err.message ?? 'Error al registrar usuario',
              }),
            }),
          ),
        ),
      ),
    ),
    logout(): void {
      patchState(store, {
        usuario: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      });
    },
  })),
);
