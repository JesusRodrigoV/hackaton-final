import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { MetricCardComponent } from '../../../shared/components/metric-card/metric-card';
import { CreditoService } from '../../../core/services/credito.service';
import type { SolicitudEstado } from '../../../core/models/solicitud';

@Component({
  selector: 'app-lista',
  template: `
    <div class="lista-container">
      <div class="header">
        <h1>Panel de Analista</h1>
        <p class="subtitle">Gestione las solicitudes de crédito pendientes</p>
      </div>

      <div class="metrics">
        <app-metric-card label="Pendientes" [value]="pendientes().toString()" color="var(--p-yellow-500)" />
        <app-metric-card label="Aprobadas hoy" [value]="aprobadasHoy().toString()" color="var(--p-green-500)" />
        <app-metric-card label="Rechazadas" [value]="rechazadas().toString()" color="var(--p-red-500)" />
        <app-metric-card label="Tiempo promedio" value="45s" color="var(--p-primary-400)" subtext="últimas 24h" />
      </div>

      <div class="filters">
        <input pInputText placeholder="Buscar por ID o nombre..." class="search-input" (input)="buscar.set($any($event.target).value)" />
        <p-select
          [options]="filtrosEstado"
          [(ngModel)]="estadoFiltro"
          placeholder="Estado"
          class="filter-select"
        />
      </div>

      <p-table
        [value]="solicitudesFiltradas()"
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
            <th>Fecha</th>
            <th>Estado</th>
            <th>Acción</th>
          </tr>
        </ng-template>
        <ng-template #body let-sol>
          <tr>
            <td><span class="mono">{{ sol.id }}</span></td>
            <td><strong>{{ sol.monto | currency:'USD':'symbol':'1.0-0' }}</strong></td>
            <td>{{ sol.plazoMeses }} meses</td>
            <td>{{ sol.fechaCreacion | date:'dd/MM HH:mm' }}</td>
            <td>
              <p-tag
                [value]="tagLabel(sol.estado)"
                [severity]="tagSeverity(sol.estado)"
              />
            </td>
            <td>
              <p-button label="Ver detalle" size="small" (onClick)="verDetalle(sol.id)" [rounded]="true" />
            </td>
          </tr>
        </ng-template>
      </p-table>
      @if (solicitudesFiltradas().length === 0) {
        <div class="empty-state">
          <i class="bx bx-inbox" style="font-size: 3rem; color: var(--p-surface-600)"></i>
          <p>No se encontraron solicitudes</p>
        </div>
      }
    </div>
  `,
  styleUrl: './lista.scss',
  imports: [
    FormsModule, CurrencyPipe, DatePipe,
    ButtonModule, TagModule, TableModule, InputTextModule, SelectModule,
    MetricCardComponent,
  ],
})
export class ListaComponent {
  readonly #creditoService = inject(CreditoService);
  readonly #router = inject(Router);

  readonly buscar = signal('');
  readonly estadoFiltro = signal<SolicitudEstado | ''>('');

  readonly filtrosEstado = [
    { label: 'Todos', value: '' },
    { label: 'Pendientes', value: 'pendiente' },
    { label: 'Aprobados', value: 'aprobado_auto' as SolicitudEstado },
    { label: 'Rechazados', value: 'rechazado' as SolicitudEstado },
  ];

  readonly solicitudes = this.#creditoService.solicitudes;

  readonly solicitudesFiltradas = computed(() => {
    let list = this.solicitudes();
    const query = this.buscar().toLowerCase();
    const estado = this.estadoFiltro();
    if (query) {
      list = list.filter(s => s.id.toLowerCase().includes(query));
    }
    if (estado) {
      list = list.filter(s => s.estado === estado);
    }
    return list;
  });

  readonly pendientes = computed(() => this.solicitudes().filter(s => s.estado === 'pendiente').length);
  readonly aprobadasHoy = computed(() => this.solicitudes().filter(s => s.estado === 'aprobado_auto' || s.estado === 'aprobado_manual').length);
  readonly rechazadas = computed(() => this.solicitudes().filter(s => s.estado === 'rechazado').length);

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
    this.#router.navigate(['/analista', id]);
  }
}
