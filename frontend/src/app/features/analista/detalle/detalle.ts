import { Component, computed, inject, signal, input } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { ScoreGaugeComponent } from '../../../shared/components/score-gauge/score-gauge';
import { ShapChartComponent } from '../../../shared/components/shap-chart/shap-chart';
import { FraudeAlertComponent } from '../../../shared/components/fraude-alert/fraude-alert';
import { CreditoService } from '../../../core/services/credito.service';
import { ScoringService } from '../../../core/services/scoring.service';
import { AuthService } from '../../../core/services/auth.service';
import { FraudeService } from '../../../core/services/fraude.service';
import type { ScoreCredito } from '../../../core/models/scoring';
import type { AnalisisFraude } from '../../../core/models/fraude';

@Component({
  selector: 'app-detalle',
  template: `
    <div class="detalle-container">
      <p-button label="← Volver" severity="secondary" (onClick)="volver()" [rounded]="true" styleClass="back-btn" />

      @if (solicitud(); as sol) {
        <div class="detalle-grid">
          <div class="info-card">
            <h2 class="card-title">Solicitud {{ sol.id }}</h2>
            <div class="info-rows">
              <div class="info-row">
                <span class="info-label">Estado</span>
                <p-tag [value]="tagLabel(sol.estado)" [severity]="tagSeverity(sol.estado)" />
              </div>
              <div class="info-row">
                <span class="info-label">Monto solicitado</span>
                <span class="info-value">{{ sol.monto | currency:'USD':'symbol':'1.0-0' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Plazo</span>
                <span class="info-value">{{ sol.plazoMeses }} meses</span>
              </div>
              <div class="info-row">
                <span class="info-label">Motivo</span>
                <span class="info-value">{{ sol.motivo }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Recibida</span>
                <span class="info-value">{{ sol.fechaCreacion | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Documento</span>
                <p-button label="Ver documento" size="small" severity="info" (onClick)="verDoc()" [rounded]="true" />
              </div>
            </div>
          </div>

          <div class="score-card">
            <h2 class="card-title">Puntaje Crediticio</h2>
            <app-score-gauge [puntaje]="scoreData().puntaje" />
            <div class="score-details">
              <div class="score-detail">
                <span>Monto máximo</span>
                <strong class="text-max">{{ scoreData().montoMaximo | currency:'USD':'symbol':'1.0-0' }}</strong>
              </div>
              <div class="score-detail">
                <span>Tasa sugerida</span>
                <strong class="text-tasa">{{ scoreData().tasaInteres }}%</strong>
              </div>
              <div class="score-detail">
                <span>Nivel de riesgo</span>
                <strong [style.color]="riskColor()">{{ scoreData().nivel }}</strong>
              </div>
            </div>
          </div>

          <div class="fraude-card">
            <app-fraude-alert [analisis]="fraudeAnalisis()" />
          </div>

          <div class="shap-card">
            <app-shap-chart [factores]="scoreData().factores" />
          </div>

          <div class="decision-card">
            <h2 class="card-title">Decisión del analista</h2>
            <p class="decision-desc">
              @if (sol.estado === 'pendiente') {
                Esta solicitud requiere revisión manual. Revise los factores de evaluación y tome una decisión.
              } @else if (sol.estado === 'aprobado_auto' || sol.estado === 'aprobado_manual') {
                Solicitud aprobada. {{ sol.analistaId ? 'Analista: ' + sol.analistaId : 'Aprobación automática.' }}
              } @else if (sol.estado === 'rechazado') {
                Solicitud rechazada. Motivo: {{ sol.rechazoMotivo }}
              }
            </p>
            @if (sol.estado === 'pendiente') {
              <div class="decision-actions">
                <p-button label="Aprobar" severity="success" (onClick)="showApproveDialog()" icon="pi pi-check" [rounded]="true" />
                <p-button label="Rechazar" severity="danger" (onClick)="showRejectDialog()" icon="pi pi-times" [rounded]="true" />
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="not-found"><p>Solicitud no encontrada</p><p-button label="Volver al panel" severity="secondary" (onClick)="volver()" [rounded]="true" /></div>
      }

      <p-dialog header="Rechazar solicitud" [(visible)]="rejectDialog" [modal]="true" [style]="{ width: '400px' }">
        <div class="dialog-content">
          <label class="field-label">Motivo del rechazo</label>
          <textarea pInputTextarea [(ngModel)]="motivoRechazo" rows="4" class="dialog-textarea"></textarea>
        </div>
        <div class="dialog-actions">
          <p-button label="Cancelar" severity="secondary" (onClick)="rejectDialog.set(false)" [rounded]="true" />
          <p-button label="Rechazar solicitud" severity="danger" (onClick)="rechazar()" [disabled]="!motivoRechazo()" [rounded]="true" />
        </div>
      </p-dialog>

      <p-dialog header="Documento del solicitante" [(visible)]="docDialog" [modal]="true" [style]="{ width: '500px' }">
        <div class="doc-preview">
          <i class="bx bx-file-blank" style="font-size: 5rem; color: var(--p-surface-600)"></i>
          <p>Documento de identidad adjunto</p>
        </div>
      </p-dialog>
    </div>
  `,
  styleUrl: './detalle.scss',
  imports: [FormsModule, CurrencyPipe, DatePipe, ButtonModule, TagModule, DialogModule, TextareaModule, ToastModule, ScoreGaugeComponent, ShapChartComponent, FraudeAlertComponent],
})
export class DetalleComponent {
  readonly #router = inject(Router);
  readonly #creditoService = inject(CreditoService);
  readonly #scoringService = inject(ScoringService);
  readonly #authService = inject(AuthService);
  readonly #fraudeService = inject(FraudeService);
  readonly #message = inject(MessageService);

  readonly id = input<string>('');
  readonly solicitud = computed(() => this.#creditoService.getSolicitudById(this.id()));
  readonly scoringResult = computed(() => this.#scoringService.generarScore(this.solicitud()?.monto ?? 0));
  readonly scoreData = computed<ScoreCredito>(() => this.scoringResult().score);
  readonly fraudeAnalisis = computed<AnalisisFraude>(() =>
    this.#fraudeService.analizarDocumento(this.id(), 'mock-doc'),
  );
  readonly rejectDialog = signal(false);
  readonly docDialog = signal(false);
  readonly motivoRechazo = signal('');

  readonly riskColor = computed(() => {
    const n = this.scoreData().nivel;
    if (n === 'bajo') return 'var(--p-green-500)'; if (n === 'medio') return 'var(--p-yellow-500)'; if (n === 'alto') return 'var(--p-orange-500)'; return 'var(--p-red-500)';
  });

  volver(): void { this.#router.navigate(['/analista']); }
  verDoc(): void { this.docDialog.set(true); }

  showApproveDialog(): void {
    this.#creditoService.aprobarSolicitud(this.id(), 'analista-demo');
    this.#message.add({ severity: 'success', summary: 'Aprobada', detail: 'La solicitud fue aprobada exitosamente' });
  }

  showRejectDialog(): void { this.rejectDialog.set(true); }

  rechazar(): void {
    if (!this.motivoRechazo().trim()) return;
    this.#creditoService.rechazarSolicitud(this.id(), 'analista-demo', this.motivoRechazo());
    this.rejectDialog.set(false);
    this.#message.add({ severity: 'info', summary: 'Rechazada', detail: 'La solicitud fue rechazada' });
  }

  tagLabel(estado: string): string {
    const map: Record<string, string> = { pendiente: 'Pendiente', aprobado_auto: 'Aprobado (Auto)', aprobado_manual: 'Aprobado', rechazado: 'Rechazado', requiere_revision: 'Revisión' };
    return map[estado] ?? estado;
  }

  tagSeverity(estado: string): 'warn' | 'success' | 'danger' | 'info' {
    const map: Record<string, 'warn' | 'success' | 'danger' | 'info'> = { pendiente: 'warn', aprobado_auto: 'success', aprobado_manual: 'success', rechazado: 'danger', requiere_revision: 'info' };
    return map[estado] ?? 'info';
  }
}
