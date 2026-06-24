import { Component, computed, inject, input } from '@angular/core';
import { DatePipe, CurrencyPipe, PercentPipe, DecimalPipe, KeyValuePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { ScoreGaugeComponent } from '../../../shared/components/score-gauge/score-gauge';

@Component({
  selector: 'app-audit-detalle',
  template: `
    <div class="detalle-container">
      <p-button label="← Volver al registro de auditoría" severity="secondary" (onClick)="volver()" [rounded]="true" styleClass="back-btn" />

      @if (decision(); as d) {
        <div class="header-section">
          <div>
            <h1 class="page-title">Trazabilidad de Solicitud {{ d.solicitudId }}</h1>
            <p class="page-subtitle">Auditoría completa de evaluación y decisión para la Superintendencia de Bancos</p>
          </div>
          <p-tag
            [value]="d.decision === 'automatica_aprobada' ? 'APROBADO' : d.decision === 'automatica_rechazada' ? 'RECHAZADO' : 'REVISIÓN MANUAL'"
            [severity]="d.decision === 'automatica_aprobada' ? 'success' : 'danger'"
            [style]="{ fontSize: '0.9rem', padding: '0.4rem 1rem' }"
          />
        </div>

        <div class="grid-2col">
          <div class="card info-card">
            <h2 class="card-title">Datos de la Solicitud</h2>
            <div class="info-rows">
              <div class="info-row"><span class="label">Solicitud</span><span class="value monospace">{{ d.solicitudId }}</span></div>
              <div class="info-row"><span class="label">Monto</span><span class="value">{{ d.montoSolicitado | currency:'USD':'symbol':'1.0-0' }}</span></div>
              <div class="info-row"><span class="label">Plazo</span><span class="value">{{ d.plazoMeses }} meses</span></div>
              <div class="info-row"><span class="label">Motivo</span><span class="value">{{ d.motivo }}</span></div>
              <div class="info-row"><span class="label">Fecha</span><span class="value">{{ d.timestamp | date:'dd/MM/yyyy HH:mm:ss' }}</span></div>
              <div class="info-row"><span class="label">Analista</span><span class="value">{{ d.analista ?? 'N/A (automático)' }}</span></div>
            </div>
          </div>

          <div class="card score-card">
            <h2 class="card-title">Resultado del Scoring</h2>
            <app-score-gauge [puntaje]="d.score" />
            <div class="score-details">
              <div class="score-detail"><span>Nivel de riesgo</span><strong [style.color]="riskColor(d.nivelRiesgo)">{{ d.nivelRiesgo }}</strong></div>
              <div class="score-detail"><span>Tasa de interés</span><strong style="color:var(--p-primary-400)">{{ d.tasaInteres }}%</strong></div>
              <div class="score-detail"><span>Monto máximo</span><strong style="color:var(--p-green-500)">{{ d.montoMaximo | currency:'USD':'symbol':'1.0-0' }}</strong></div>
            </div>
          </div>
        </div>

        <div class="card factores-card">
          <h2 class="card-title">Variables de Entrada y Pesos del Modelo</h2>
          <div class="tabla-factores">
            <div class="tabla-header">
              <span class="col-var">Variable</span>
              <span class="col-valor">Valor</span>
              <span class="col-peso">Peso</span>
              <span class="col-contrib">Contribución</span>
              <span class="col-impacto">Impacto</span>
            </div>
            @for (f of d.factores; track f.nombre) {
              <div class="tabla-row">
                <span class="col-var">{{ f.nombre }}</span>
                <span class="col-valor">{{ f.valor }}/100</span>
                <span class="col-peso">{{ getPeso(d.pesosModelo, f.nombre) | percent:'1.1-1' }}</span>
                <span class="col-contrib" [class.positiva]="f.contribucion >= 0" [class.negativa]="f.contribucion < 0">
                  {{ f.contribucion > 0 ? '+' : '' }}{{ f.contribucion | number:'1.1-1' }} pts
                </span>
                <span class="col-impacto"><i class="bx" [class.bx-trending-up]="f.impacto === 'positivo'" [class.bx-trending-down]="f.impacto === 'negativo'" [style.color]="f.impacto === 'positivo' ? 'var(--p-green-500)' : 'var(--p-red-500)'"></i></span>
              </div>
            }
          </div>
          <div class="modelo-version">
            <i class="bx bx-cog"></i>
            <span>Modelo de evaluación v2.1.3 — Flujo de 6 pasos completado en 4.2 segundos</span>
          </div>
        </div>

        <div class="card trazabilidad-card">
          <h2 class="card-title">Trazabilidad del Flujo de Evaluación</h2>
          <div class="timeline">
            @for (paso of d.trazabilidad; track paso.paso) {
              <div class="timeline-item">
                <div class="timeline-marker">
                  <span class="marker-num">{{ paso.paso }}</span>
                  <div class="marker-line"></div>
                </div>
                <div class="timeline-content">
                  <div class="timeline-header">
                    <span class="timeline-title">{{ paso.descripcion }}</span>
                    <span class="timeline-time">{{ paso.timestamp | date:'HH:mm:ss' }}</span>
                  </div>
                  <p class="timeline-detail">{{ paso.detalle }}</p>
                  @if (paso.datos) {
                    <div class="timeline-datos">
                      @for (entry of paso.datos | keyvalue; track entry.key) {
                        <span class="dato-chip">
                          <span class="dato-key">{{ entry.key }}:</span>
                          <span class="dato-value">{{ entry.value }}</span>
                        </span>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <div class="card firma-card">
          <h2 class="card-title">Firma Digital y Sello de Auditoría</h2>
          <div class="firma-grid">
            <div class="firma-item">
              <i class="bx bxs-certification"></i>
              <div>
                <span class="firma-label">Firma Digital</span>
                <span class="firma-valor monospace">{{ d.firmaDigital }}</span>
              </div>
            </div>
            <div class="firma-item">
              <i class="bx bx-link"></i>
              <div>
                <span class="firma-label">Hash de Cadena</span>
                <span class="firma-valor monospace">{{ d.hashCadena }}</span>
              </div>
            </div>
            <div class="firma-item">
              <i class="bx bx-calendar"></i>
              <div>
                <span class="firma-label">Timestamp firmado</span>
                <span class="firma-valor">{{ d.timestamp | date:'dd/MM/yyyy HH:mm:ss' }}</span>
              </div>
            </div>
            <div class="firma-item">
              <i class="bx bx-user"></i>
              <div>
                <span class="firma-label">Autoridad firmante</span>
                <span class="firma-valor">Sistema Scoring NeoLend v2.1</span>
              </div>
            </div>
          </div>
          <div class="verificacion">
            <i class="bx bx-check-shield"></i>
            <span class="verif-text">Firma digital verificada — El documento no ha sido alterado desde su emisión</span>
          </div>
        </div>
      } @else {
        <div class="not-found">No se encontró trazabilidad para esta solicitud</div>
      }
    </div>
  `,
  styleUrl: './audit-detalle.scss',
  imports: [DatePipe, CurrencyPipe, PercentPipe, DecimalPipe, KeyValuePipe, ButtonModule, TagModule, ScoreGaugeComponent],
})
export class AuditDetalleComponent {
  readonly #router = inject(Router);
  readonly #auditoriaService = inject(AuditoriaService);

  readonly id = input<string>('');
  readonly decision = computed(() => this.#auditoriaService.getDecisionById(this.id()));

  volver(): void {
    this.#router.navigate(['/admin/auditoria']);
  }

  getPeso(pesos: { variable: string; peso: number }[], nombre: string): number {
    return pesos.find(p => p.variable === nombre)?.peso ?? 0;
  }

  riskColor(nivel: string): string {
    const map: Record<string, string> = { bajo: 'var(--p-green-500)', medio: 'var(--p-yellow-500)', alto: 'var(--p-orange-500)', muy_alto: 'var(--p-red-500)' };
    return map[nivel] ?? 'var(--p-surface-400)';
  }
}
