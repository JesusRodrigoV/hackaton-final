import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { MetricCardComponent } from '../../../shared/components/metric-card/metric-card';
import { CobranzaService } from '../../../core/services/cobranza.service';
import type { PrestamoEstado } from '../../../core/models/cobranza';

@Component({
  selector: 'app-cobranza-lista',
  template: `
    <div class="cobranza-container">
      <div class="header">
        <h1>Gestión de Cobranza</h1>
        <p class="subtitle">Administre la cartera de préstamos activos</p>
      </div>
      <div class="metrics">
        <app-metric-card label="Al día" [value]="alDia().toString()" color="var(--p-green-500)" />
        <app-metric-card label="Atrasados" [value]="atrasados().toString()" color="var(--p-yellow-500)" />
        <app-metric-card label="En mora" [value]="enMora().toString()" color="var(--p-red-500)" />
        <app-metric-card label="Total cartera" [value]="(totalCartera() | currency:'USD':'symbol':'1.0-0') ?? '0'" color="var(--p-primary-400)" subtext="saldo pendiente" />
      </div>
      <div class="filters">
        <input pInputText placeholder="Buscar por nombre o ID..." class="search-input" (input)="buscar.set($any($event.target).value)" />
        <p-select [options]="filtrosEstado" [(ngModel)]="estadoFiltro" placeholder="Estado" class="filter-select" />
      </div>
      <p-table [value]="prestamosFiltrados()" [paginator]="true" [rows]="10">
        <ng-template #header>
          <tr><th>ID</th><th>Cliente</th><th>Monto</th><th>Saldo</th><th>Cuotas</th><th>Estado</th><th>Acción</th></tr>
        </ng-template>
        <ng-template #body let-prestamo>
          <tr>
            <td><span class="mono">{{ prestamo.id }}</span></td>
            <td>
              <div class="cliente-info">
                <span class="cliente-nombre">{{ prestamo.usuarioNombre }}</span>
                <span class="cliente-doc">{{ prestamo.usuarioDocumento }}</span>
              </div>
            </td>
            <td><strong>{{ prestamo.montoOriginal | currency:'USD':'symbol':'1.0-0' }}</strong></td>
            <td><strong [style.color]="prestamo.saldoPendiente > 0 ? 'var(--p-yellow-500)' : 'var(--p-green-500)'">{{ prestamo.saldoPendiente | currency:'USD':'symbol':'1.0-0' }}</strong></td>
            <td>{{ prestamo.cuotasPagadas }}/{{ prestamo.totalCuotas }}</td>
            <td><p-tag [value]="tagLabel(prestamo.estado)" [severity]="tagSeverity(prestamo.estado)" /></td>
            <td><p-button label="Ver" size="small" (onClick)="verDetalle(prestamo.id)" [rounded]="true" /></td>
          </tr>
        </ng-template>
      </p-table>
      @if (prestamosFiltrados().length === 0) {
        <div class="empty-state">
          <i class="bx bx-inbox" style="font-size: 3rem; color: var(--p-surface-600)"></i>
          <p>No se encontraron préstamos</p>
        </div>
      }
    </div>
  `,
  styleUrl: './lista.scss',
  imports: [FormsModule, CurrencyPipe, ButtonModule, TagModule, TableModule, InputTextModule, SelectModule, MetricCardComponent],
})
export class CobranzaListaComponent {
  readonly #cobranzaService = inject(CobranzaService);
  readonly #router = inject(Router);
  readonly buscar = signal('');
  readonly estadoFiltro = signal<PrestamoEstado | ''>('');

  readonly filtrosEstado = [
    { label: 'Todos', value: '' },
    { label: 'Al día', value: 'al_dia' as PrestamoEstado },
    { label: 'Atrasados', value: 'atrasado' as PrestamoEstado },
    { label: 'En mora', value: 'mora' as PrestamoEstado },
    { label: 'Reestructurados', value: 'reestructurado' as PrestamoEstado },
    { label: 'Pagados', value: 'pagado' as PrestamoEstado },
  ];

  readonly prestamosFiltrados = computed(() => {
    let list = this.#cobranzaService.prestamos();
    const q = this.buscar().toLowerCase();
    const est = this.estadoFiltro();
    if (q) list = list.filter(p => p.usuarioNombre.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
    if (est) list = list.filter(p => p.estado === est);
    return list;
  });

  readonly alDia = computed(() => this.#cobranzaService.prestamos().filter(p => p.estado === 'al_dia').length);
  readonly atrasados = computed(() => this.#cobranzaService.prestamos().filter(p => p.estado === 'atrasado').length);
  readonly enMora = computed(() => this.#cobranzaService.prestamos().filter(p => p.estado === 'mora').length);
  readonly totalCartera = computed(() => this.#cobranzaService.prestamos().reduce((s, p) => s + p.saldoPendiente, 0));

  tagLabel(estado: PrestamoEstado): string {
    const map: Record<PrestamoEstado, string> = { al_dia: 'Al día', atrasado: 'Atrasado', mora: 'En mora', reestructurado: 'Reestructurado', pagado: 'Pagado' };
    return map[estado];
  }

  tagSeverity(estado: PrestamoEstado): 'success' | 'warn' | 'danger' | 'info' | 'contrast' {
    const map: Record<PrestamoEstado, 'success' | 'warn' | 'danger' | 'info' | 'contrast'> = { al_dia: 'success', atrasado: 'warn', mora: 'danger', reestructurado: 'info', pagado: 'contrast' };
    return map[estado];
  }

  verDetalle(id: string): void {
    this.#router.navigate(['/analista', 'prestamos', id]);
  }
}
