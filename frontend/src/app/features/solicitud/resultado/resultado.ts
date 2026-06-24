import { Component, computed, inject, input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';

import { ScoreGaugeComponent } from '../../../shared/components/score-gauge/score-gauge';
import { ShapChartComponent } from '../../../shared/components/shap-chart/shap-chart';
import { FraudeAlertComponent } from '../../../shared/components/fraude-alert/fraude-alert';
import { CreditoService } from '../../../core/services/credito.service';
import { ScoringService } from '../../../core/services/scoring.service';
import { FraudeService } from '../../../core/services/fraude.service';
import type { ScoreCredito, DecisionCredito } from '../../../core/models/scoring';
import type { AnalisisFraude } from '../../../core/models/fraude';

@Component({
  selector: 'app-resultado',
  template: `
    <div class="resultado-container">
      @if (solicitud(); as sol) {
        <div class="resultado-card">
          <div class="resultado-header">
            <h1>Resultado de tu solicitud</h1>
            <p class="solicitud-id">{{ sol.id }}</p>
          </div>

          <div class="score-section">
            <app-score-gauge [puntaje]="scoreData().puntaje" />
          </div>

          <div class="decision-badge">
            <p-tag
              [value]="decisionData().decision === 'automatica_aprobada' ? 'APROBADO' : decisionData().decision === 'automatica_rechazada' ? 'RECHAZADO' : 'REVISIÓN MANUAL'"
              [severity]="decisionSeverity()"
              [style]="{ fontSize: '0.9rem', padding: '0.4rem 1rem' }"
            />
          </div>

          @if (decisionData().decision === 'automatica_aprobada') {
            <div class="aprobado-box">
              <p class="aprobado-text">
                ¡Felicitaciones! Tu crédito fue aprobado automáticamente.
              </p>
              <div class="condiciones">
                <div class="cond-row">
                  <span>Monto solicitado</span>
                  <strong>{{ sol.monto | currency:'USD':'symbol':'1.0-0' }}</strong>
                </div>
                <div class="cond-row">
                  <span>Monto máximo disponible</span>
                  <strong class="maximo">{{ scoreData().montoMaximo | currency:'USD':'symbol':'1.0-0' }}</strong>
                </div>
                <div class="cond-row">
                  <span>Tasa de interés</span>
                  <strong class="tasa">{{ scoreData().tasaInteres }}%</strong>
                </div>
                <div class="cond-row">
                  <span>Plazo</span>
                  <strong>{{ sol.plazoMeses }} meses</strong>
                </div>
                <div class="cond-row">
                  <span>Pago mensual estimado</span>
                  <strong>{{ cuotaMensual() | currency:'USD':'symbol':'1.0-0' }}</strong>
                </div>
              </div>
              <p-button label="Recibir dinero" icon="pi pi-arrow-right" (onClick)="irADesembolso()" [rounded]="true" styleClass="mt-2" />
            </div>
          } @else if (decisionData().decision === 'automatica_rechazada') {
            <div class="rechazado-box">
              <p class="rechazado-text">
                Lo sentimos, no podemos aprobar tu crédito en este momento.
              </p>
              <p class="rechazado-detail">
                Tu score no alcanza el umbral mínimo requerido. Te recomendamos
                mejorar tu historial de pagos y volver a intentar en 3 meses.
              </p>
            </div>
          } @else {
            <div class="revision-box">
              <p class="revision-text">
                Tu solicitud pasó a revisión manual. Un analista la evaluará
                y te daremos una respuesta en las próximas 24 horas hábiles.
              </p>
              <p class="revision-id">N° de seguimiento: <strong>{{ sol.id }}</strong></p>
            </div>
          }

          <div class="fraude-section">
            <app-fraude-alert [analisis]="fraudeAnalisis()" />
          </div>

          <div class="shap-section">
            <app-shap-chart [factores]="scoreData().factores" />
          </div>

          <div class="actions">
            <p-button label="Volver al inicio" severity="secondary" (onClick)="volverInicio()" [rounded]="true" />
            <p-button label="Nueva solicitud" (onClick)="nuevaSolicitud()" [rounded]="true" />
          </div>
        </div>
      } @else {
        <div class="loading-card">
          <p-skeleton width="100%" height="200px" borderRadius="16px" />
          <p-skeleton width="60%" height="24px" borderRadius="8px" styleClass="mt-3" />
          <p-skeleton width="40%" height="24px" borderRadius="8px" styleClass="mt-2" />
        </div>
      }
    </div>
  `,
  styleUrl: './resultado.scss',
  imports: [ButtonModule, TagModule, SkeletonModule, CurrencyPipe, ScoreGaugeComponent, ShapChartComponent, FraudeAlertComponent],
})
export class ResultadoComponent {
  readonly #router = inject(Router);
  readonly #creditoService = inject(CreditoService);
  readonly #scoringService = inject(ScoringService);
  readonly #fraudeService = inject(FraudeService);

  readonly id = input<string>('');
  readonly solicitud = computed(() => this.#creditoService.getSolicitudById(this.id()));

  readonly scoringResult = computed(() => this.#scoringService.generarScore(this.solicitud()?.monto ?? 0));

  readonly scoreData = computed<ScoreCredito>(() => this.scoringResult().score);
  readonly decisionData = computed<DecisionCredito>(() => this.scoringResult().decision);
  readonly fraudeAnalisis = computed<AnalisisFraude>(() =>
    this.#fraudeService.analizarDocumento(this.id(), 'mock-base64'),
  );

  readonly decisionSeverity = computed(() => {
    const d = this.decisionData().decision;
    if (d === 'automatica_aprobada') return 'success';
    if (d === 'automatica_rechazada') return 'danger';
    return 'warn';
  });

  readonly cuotaMensual = computed(() => {
    const sol = this.solicitud();
    if (!sol) return 0;
    const tasaMensual = (this.scoreData().tasaInteres / 100) / 12;
    const cuota = sol.monto * (tasaMensual * Math.pow(1 + tasaMensual, sol.plazoMeses)) / (Math.pow(1 + tasaMensual, sol.plazoMeses) - 1);
    return isNaN(cuota) ? 0 : Math.round(cuota);
  });

  irADesembolso(): void {
    this.#router.navigate(['/solicitar', this.id(), 'desembolso']);
  }

  volverInicio(): void {
    this.#router.navigate(['/']);
  }

  nuevaSolicitud(): void {
    this.#router.navigate(['/solicitar']);
  }
}
