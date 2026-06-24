import { Component, computed, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';

import { CreditoService } from '../../../core/services/credito.service';
import { AuthService } from '../../../core/services/auth.service';
import type { SolicitudEstado } from '../../../core/models/solicitud';

@Component({
  selector: 'app-mis-creditos',
  template: `
    <div class="mis-creditos-container">
      <div class="header">
        <h1>Mis créditos</h1>
        <p class="subtitle">Historial de sus solicitudes de crédito</p>
      </div>

      @if (loading()) {
        <div class="loading-section">
          <p-skeleton width="100%" height="48px" borderRadius="8px" />
          <p-skeleton width="100%" height="48px" borderRadius="8px" styleClass="mt-2" />
          <p-skeleton width="100%" height="48px" borderRadius="8px" styleClass="mt-2" />
        </div>
      } @else {
        <p-table
          [value]="misSolicitudes()"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[5, 10, 20]"
          styleClass="p-datatable-gridlines"
        >
          <ng-template #header>
            <tr>
              <th>ID</th>
              <th>Monto</th>
              <th>Plazo</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Acción</th>
            </tr>
          </ng-template>
          <ng-template #body let-sol>
            <tr>
              <td><span class="mono">{{ sol.id }}</span></td>
              <td><strong>{{ sol.monto | currency:'USD':'symbol':'1.0-0' }}</strong></td>
              <td>{{ sol.plazoMeses }} meses</td>
              <td>
                <p-tag
                  [value]="tagLabel(sol.estado)"
                  [severity]="tagSeverity(sol.estado)"
                />
              </td>
              <td>{{ sol.fechaCreacion | date:'dd/MM/yyyy' }}</td>
              <td>
                <p-button label="Ver detalle" size="small" (onClick)="verDetalle(sol.id)" [rounded]="true" />
              </td>
            </tr>
          </ng-template>
        </p-table>

        @if (misSolicitudes().length === 0) {
          <div class="empty-state">
            <i class="bx bx-inbox" style="font-size: 3rem; color: var(--p-surface-600)"></i>
            <p>Todavía no tiene solicitudes de crédito</p>
            <p-button label="Solicitar crédito" (onClick)="nuevaSolicitud()" [rounded]="true" />
          </div>
        }
      }
    </div>
  `,
  styleUrl: './mis-creditos.scss',
  imports: [ButtonModule, TagModule, TableModule, SkeletonModule, CurrencyPipe, DatePipe],
})
export class MisCreditosComponent {
  readonly #router = inject(Router);
  readonly #creditoService = inject(CreditoService);
  readonly #auth = inject(AuthService);

  readonly loading = this.#creditoService.loading;
  readonly misSolicitudes = computed(() => {
    const usuario = this.#auth.usuario();
    if (!usuario?.id) return [];
    return this.#creditoService.solicitudes().filter(s => s.usuarioId === usuario.id);
  });

  constructor() {
    const usuario = this.#auth.usuario();
    if (usuario?.id) {
      this.#creditoService.loadByUser(usuario.id);
    }
  }

  tagLabel(estado: SolicitudEstado): string {
    const map: Record<SolicitudEstado, string> = {
      pendiente: 'Pendiente',
      aprobado_auto: 'Aprobado',
      aprobado_manual: 'Aprobado',
      rechazado: 'Rechazado',
      requiere_revision: 'Revisión',
    };
    return map[estado];
  }

  tagSeverity(estado: SolicitudEstado): 'warn' | 'success' | 'danger' | 'info' {
    const map: Record<SolicitudEstado, 'warn' | 'success' | 'danger' | 'info'> = {
      pendiente: 'warn',
      aprobado_auto: 'success',
      aprobado_manual: 'success',
      rechazado: 'danger',
      requiere_revision: 'info',
    };
    return map[estado];
  }

  verDetalle(id: string): void {
    this.#router.navigate(['/solicitar', id]);
  }

  nuevaSolicitud(): void {
    this.#router.navigate(['/solicitar']);
  }
}
