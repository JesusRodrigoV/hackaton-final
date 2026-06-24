import { Injectable, inject } from '@angular/core';
import { EducacionStore } from '../stores/educacion.store';
import type { Curso, ProgresoUsuario, Logro } from '../models/educacion';

@Injectable({ providedIn: 'root' })
export class EducacionService {
  readonly #store = inject(EducacionStore);

  readonly cursos = this.#store.cursos;
  readonly progreso = this.#store.progreso;
  readonly logros = this.#store.logros;

  getCursoById(id: string): Curso | undefined {
    return this.#store.getCursoById(id);
  }

  completarLeccion(cursoId: string, leccionId: string): void {
    void this.#store.completarLeccion(cursoId, leccionId);
  }

  getBonificacionTotal(): number {
    return this.#store.getBonificacionTotal();
  }
}
