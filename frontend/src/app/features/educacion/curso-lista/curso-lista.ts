import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EducacionService } from '../../../core/services/educacion.service';

@Component({
  selector: 'app-curso-lista',
  template: `
    <div class="educacion-container">
      <h1 class="page-title">Educación Financiera</h1>
      <p class="page-subtitle">Mejorá tu score crediticio mientras aprendés. Cada curso completado bonifica tu tasa de interés.</p>

      <div class="bonificacion-banner">
        <i class="bx bxs-gift"></i>
        <div class="banner-info">
          <span class="banner-title">Bonificación acumulada</span>
          <span class="banner-value">{{ bonificacionTotal() }}% de descuento en tu tasa</span>
        </div>
      </div>

      <div class="logros-section">
        <h2 class="section-title">Tus logros</h2>
        <div class="logros-grid">
          @for (logro of progresoService.logros(); track logro.id) {
            <div class="logro-card" [class.bloqueado]="!logro.desbloqueado">
              <i class="bx" [class]="'bx-' + logro.icono" [class.desbloqueado]="logro.desbloqueado"></i>
              <span class="logro-nombre">{{ logro.nombre }}</span>
              <span class="logro-desc">{{ logro.descripcion }}</span>
            </div>
          } @empty {
            <p class="empty-text">Completá cursos para desbloquear logros</p>
          }
        </div>
      </div>

      <div class="cursos-lista">
        <h2 class="section-title">Cursos disponibles</h2>
        <div class="cursos-grid">
          @for (curso of cursos(); track curso.id) {
            <a [routerLink]="['/educacion', curso.id]" class="curso-card">
              
              <div class="curso-icon">
                <i class="bx" [class]="'bx-' + curso.icono"></i>
              </div>
              <div class="curso-body">
                <h3 class="curso-titulo">{{ curso.titulo }}</h3>
                <p class="curso-desc">{{ curso.descripcion }}</p>
                <div class="curso-meta">
                  <span class="curso-nivel" [class]="'nivel-' + curso.nivel">{{ nivelLabel(curso.nivel) }}</span>
                  <span class="curso-duracion">{{ curso.duracionHoras }}h</span>
                  <span class="curso-lecciones">{{ curso.lecciones.length }} lecciones</span>
                </div>
                <div class="curso-bonus">
                  <i class="bx bxs-star"></i> Bonifica {{ curso.bonificacionTasa }}% en tu tasa
                </div>
              </div>
              @if (getProgreso(curso.id); as prog) {
                <div class="curso-progreso">
                  <div class="progreso-bar-bg">
                    <div class="progreso-bar" [style.width.%]="(prog.leccionesCompletadas / prog.totalLecciones) * 100"></div>
                  </div>
                  <span class="progreso-texto">{{ prog.leccionesCompletadas }}/{{ prog.totalLecciones }}</span>
                </div>
              }
            </a>
          } @empty {
            <p class="empty-text">No hay cursos disponibles por ahora</p>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './curso-lista.scss',
  imports: [RouterLink],
})
export class CursoListaComponent {
  readonly progresoService = inject(EducacionService);
  readonly cursos = this.progresoService.cursos;

  readonly bonificacionTotal = computed(() => this.progresoService.getBonificacionTotal());

  getProgreso(cursoId: string) {
    return this.progresoService.progreso().find(p => p.cursoId === cursoId);
  }

  nivelLabel(nivel: string): string {
    const map: Record<string, string> = { basico: 'Básico', intermedio: 'Intermedio', avanzado: 'Avanzado' };
    return map[nivel] ?? nivel;
  }
}
