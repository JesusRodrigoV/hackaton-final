import { Injectable, inject, computed, effect } from '@angular/core';
import { MessageService } from 'primeng/api';
import { AuthStore } from '../stores/auth.store';
import type { Usuario } from '../models/usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly #store = inject(AuthStore);
  readonly #message = inject(MessageService);

  readonly usuario = computed(() => this.#store.usuario());
  readonly isAuthenticated = computed(() => this.#store.isAuthenticated());
  readonly isAnalista = this.#store.isAnalista;

  constructor() {
    effect(() => {
      const err = this.#store.error();
      if (err) this.#message.add({ severity: 'error', summary: 'Error de autenticación', detail: err, life: 5000 });
    });
  }

  async login(documento: string, _password: string): Promise<void> {
    this.#store.login({ documento, nombre: 'Analista NeoLend', rol: 'analista' });
  }

  // CAMBIO AQUÍ: Ahora retorna una Promesa con el objeto Usuario (o la estructura que manejes)
  async loginSolicitante(documento: string, nombre: string): Promise<any> {
    // Al agregar 'as const', le aseguras a TS que el rol es exactamente 'solicitante' y no va a cambiar
    const datosUsuario = { 
      documento, 
      nombre, 
      rol: 'solicitante' as const 
    };
    
    this.#store.login(datosUsuario);
    
    return this.#store.usuario(); 
  }

  logout(): void {
    this.#store.logout();
  }
}