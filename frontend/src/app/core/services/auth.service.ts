import { Injectable, signal, computed } from '@angular/core';
import type { Usuario, AuthState } from '../models/usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly #state = signal<AuthState>({
    usuario: null,
    token: null,
    isAuthenticated: false,
  });

  readonly usuario = computed(() => this.#state().usuario);
  readonly isAuthenticated = computed(() => this.#state().isAuthenticated);
  readonly isAnalista = computed(() => this.#state().usuario?.rol === 'analista' || this.#state().usuario?.rol === 'admin');

  login(documento: string, password: string): void {
    const mockUser: Usuario = {
      id: crypto.randomUUID(),
      nombre: 'Analista Demo',
      email: 'analista@neolend.com',
      documento,
      telefono: '59170000000',
      rol: 'analista',
    };
    this.#state.set({ usuario: mockUser, token: 'mock-token', isAuthenticated: true });
  }

  loginSolicitante(documento: string, nombre: string): void {
    const mockUser: Usuario = {
      id: crypto.randomUUID(),
      nombre,
      email: '',
      documento,
      telefono: '',
      rol: 'solicitante',
    };
    this.#state.set({ usuario: mockUser, token: 'mock-token', isAuthenticated: true });
  }

  logout(): void {
    this.#state.set({ usuario: null, token: null, isAuthenticated: false });
  }
}
