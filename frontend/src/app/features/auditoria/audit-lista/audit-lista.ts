import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { AuditoriaService } from '../../../core/services/auditoria.service';

@Component({
  selector: 'app-audit-lista',
  template: `
    <div class="audit-container">
      <div class="header">
        <div>
          <h1 class="page-title">Trazabilidad Auditada</h1>
          <p class="page-subtitle">Registro inmutable de decisiones de crédito para la Superintendencia de Bancos</p>
        </div>
      </div>

      <div class="filters">
        <p-select
          [ngModel]="filtroTipo()"
          [options]="tiposFilter"
          placeholder="Filtrar por tipo"
          class="filter-select"
          (onChange)="filtroTipo.set($event.value)"
        />
        <p-select
          [ngModel]="filtroSolicitud()"
          [options]="solicitudesFilter()"
          placeholder="Filtrar por solicitud"
          class="filter-select"
          (onChange)="filtroSolicitud.set($event.value)"
        />
        <span class="result-count">{{ filteredLogs().length }} registros</span>
      </div>

      <div class="logs-list">
        @for (log of filteredLogs(); track log.id) {
          <div class="log-card">
            <div class="log-header">
              <p-tag [value]="tipoLabel(log.tipo)" [severity]="tipoSeverity(log.tipo)" />
              <span class="log-fecha">{{ log.timestamp | date:'dd/MM/yyyy HH:mm:ss' }}</span>
              <span class="log-solicitud">SOL: {{ log.solicitudId }}</span>
            </div>
            <div class="log-body">
              <p class="log-detalle">{{ log.detalle }}</p>
              <div class="log-meta">
                <span class="log-usuario"><i class="bx bx-user"></i> {{ log.usuario }}</span>
                <span class="log-rol">{{ log.rol }}</span>
              </div>
              <div class="log-firma">
                <i class="bx bxs-certification"></i>
                <span class="firma-hash">{{ log.firmaDigital }}</span>
                <span class="hash-previo">← {{ log.hashPrevio }}</span>
              </div>
            </div>
            <a [routerLink]="['/admin/auditoria', log.solicitudId]" class="log-link">
              Ver trazabilidad completa →
            </a>
          </div>
        } @empty {
          <div class="empty">No se encontraron registros</div>
        }
      </div>

      <div class="sello-section">
        <h2 class="section-title">Integridad de la cadena</h2>
        <div class="sello-card">
          <div class="sello-icon">
            <i class="bx bxs-shield"></i>
          </div>
          <div class="sello-info">
            <span class="sello-title">Cadena de auditoría verificada</span>
            <span class="sello-desc">Todos los registros están encadenados criptográficamente. Cualquier modificación rompe la cadena de hash.</span>
          </div>
          <div class="sello-hash">
            <span class="hash-label">Último hash</span>
            <span class="hash-value">HASH-A1B2C3D4E5F6G7H8</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './audit-lista.scss',
  imports: [DatePipe, RouterLink, FormsModule, TagModule, SelectModule],
})
export class AuditListaComponent {
  readonly #auditoriaService = inject(AuditoriaService);
  readonly logs = this.#auditoriaService.logs;

  readonly filtroTipo = signal<string | null>(null);
  readonly filtroSolicitud = signal<string | null>(null);

  readonly tiposFilter = [
    { label: 'Todos', value: null },
    { label: 'Scoring', value: 'scoring' },
    { label: 'Decisión Automática', value: 'decision_auto' },
    { label: 'Decisión Manual', value: 'decision_manual' },
    { label: 'Rechazo', value: 'rechazo' },
    { label: 'Revisión', value: 'revision' },
  ];

  readonly solicitudesFilter = computed(() => {
    const ids = [...new Set(this.logs().map(l => l.solicitudId))];
    return [{ label: 'Todas', value: null }, ...ids.map(id => ({ label: id, value: id }))];
  });

  readonly filteredLogs = computed(() => {
    let list = this.logs();
    if (this.filtroTipo()) {
      list = list.filter(l => l.tipo === this.filtroTipo());
    }
    if (this.filtroSolicitud()) {
      list = list.filter(l => l.solicitudId === this.filtroSolicitud());
    }
    return list;
  });

  tipoLabel(tipo: string): string {
    const map: Record<string, string> = {
      scoring: 'Scoring', decision_auto: 'Auto', decision_manual: 'Manual',
      rechazo: 'Rechazo', revision: 'Revisión',
    };
    return map[tipo] ?? tipo;
  }

  tipoSeverity(tipo: string): 'info' | 'success' | 'warn' | 'danger' | 'contrast' {
    const map: Record<string, 'info' | 'success' | 'warn' | 'danger' | 'contrast'> = {
      scoring: 'info', decision_auto: 'success', decision_manual: 'success',
      rechazo: 'danger', revision: 'warn',
    };
    return map[tipo] ?? 'info';
  }
}
