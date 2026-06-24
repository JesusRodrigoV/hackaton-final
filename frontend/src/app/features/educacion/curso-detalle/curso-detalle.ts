import { Component, computed, inject, signal, input } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { EducacionService } from '../../../core/services/educacion.service';

@Component({
  selector: 'app-curso-detalle',
  template: `
    <div class="detalle-container">
      <p-button label="← Volver a cursos" severity="secondary" (onClick)="volver()" [rounded]="true" styleClass="back-btn" />

      @if (curso(); as c) {
        <div class="curso-header">
          <div class="curso-icon">
            <i class="bx" [class]="'bx-' + c.icono"></i>
          </div>
          <div>
            <h1 class="curso-titulo">{{ c.titulo }}</h1>
            <p class="curso-desc">{{ c.descripcion }}</p>
            <div class="curso-meta">
              <span class="nivel-badge" [class]="'nivel-' + c.nivel">{{ nivelLabel(c.nivel) }}</span>
              <span class="meta-item"><i class="bx bx-time"></i> {{ c.duracionHoras }} horas</span>
              <span class="meta-item"><i class="bx bx-book"></i> {{ c.lecciones.length }} lecciones</span>
              <span class="meta-item bonus"><i class="bx bxs-star"></i> Bonifica {{ c.bonificacionTasa }}%</span>
            </div>
          </div>
        </div>

        <div class="lecciones-section">
          <h2 class="section-title">Lecciones</h2>
          <div class="lecciones-list">
            @for (leccion of c.lecciones; track leccion.id; let i = $index) {
              <div class="leccion-card" [class.completada]="leccion.completada" [class.activa]="leccionActiva() === leccion.id">
                <div class="leccion-header" (click)="toggleLeccion(leccion.id)">
                  <div class="leccion-numero">{{ i + 1 }}</div>
                  <div class="leccion-info">
                    <span class="leccion-titulo">{{ leccion.titulo }}</span>
                    @if (leccion.completada) {
                      <span class="leccion-check"><i class="bx bx-check-circle"></i> Completada</span>
                    }
                  </div>
                  <i class="bx" [class.bx-chevron-down]="leccionActiva() !== leccion.id" [class.bx-chevron-up]="leccionActiva() === leccion.id"></i>
                </div>
                @if (leccionActiva() === leccion.id) {
                  <div class="leccion-contenido">
                    <p>{{ leccion.contenido }}</p>
                    @if (!leccion.completada) {
                      <p-button
                        label="Marcar como completada"
                        icon="pi pi-check"
                        severity="success"
                        (onClick)="completarLeccion(c.id, leccion.id)"
                        [rounded]="true"
                        size="small"
                      />
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>

        @if (progreso(); as prog) {
          <div class="progreso-section">
            <h2 class="section-title">Tu progreso</h2>
            <div class="progreso-card">
              <div class="progreso-bar-bg">
                <div class="progreso-bar" [style.width.%]="(prog.leccionesCompletadas / prog.totalLecciones) * 100"></div>
              </div>
              <span class="progreso-texto">{{ prog.leccionesCompletadas }} de {{ prog.totalLecciones }} lecciones completadas</span>
              @if (prog.completado) {
                <div class="completado-badge">
                  <i class="bx bxs-check-circle"></i> Curso completado — bonificación activa
                </div>
              }
            </div>
          </div>
        }
      } @else {
        <div class="not-found">Curso no encontrado</div>
      }
    </div>
  `,
  styleUrl: './curso-detalle.scss',
  imports: [ButtonModule],
})
export class CursoDetalleComponent {
  readonly #router = inject(Router);
  readonly #educacionService = inject(EducacionService);

  readonly id = input<string>('');
  readonly curso = computed(() => this.#educacionService.getCursoById(this.id()));
  readonly leccionActiva = signal<string | null>(null);
  readonly progreso = computed(() => this.#educacionService.progreso().find(p => p.cursoId === this.id()));

  toggleLeccion(leccionId: string): void {
    this.leccionActiva.update(v => v === leccionId ? null : leccionId);
  }

  completarLeccion(cursoId: string, leccionId: string): void {
    this.#educacionService.completarLeccion(cursoId, leccionId);
  }

  volver(): void {
    this.#router.navigate(['/educacion']);
  }

  nivelLabel(nivel: string): string {
    const map: Record<string, string> = { basico: 'Básico', intermedio: 'Intermedio', avanzado: 'Avanzado' };
    return map[nivel] ?? nivel;
  }
}
