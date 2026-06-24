import { Component, input } from '@angular/core';
import type { FactorScore } from '../../../core/models/scoring';

function contribucionWidth(contribucion: number): number {
  return Math.abs(contribucion) * 100;
}

function contribucionTexto(contribucion: number): string {
  return `${contribucion > 0 ? '+' : ''}${(contribucion * 100).toFixed(0)}pts`;
}

@Component({
  selector: 'app-shap-chart',
  template: `
    <div class="shap-chart">
      <h3 class="shap-title">Factores que influyen en tu score</h3>
      <div class="shap-bars">
        @for (factor of factores(); track factor.nombre) {
          <div class="shap-row">
            <div class="shap-label">
              <span class="factor-name">{{ factor.nombre }}</span>
              <span class="factor-val">{{ factor.valor }}%</span>
            </div>
            <div class="shap-bar-track">
              <div
                class="shap-bar"
                [class.positive]="factor.impacto === 'positivo'"
                [class.negative]="factor.impacto === 'negativo'"
                [style.width.%]="contribucionWidth(factor.contribucion)"
              >
                <span class="shap-contrib">{{ contribucionTexto(factor.contribucion) }}</span>
              </div>
            </div>
            <p class="shap-desc">{{ factor.descripcion }}</p>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './shap-chart.scss',
})
export class ShapChartComponent {
  readonly factores = input.required<FactorScore[]>();
  readonly contribucionWidth = contribucionWidth;
  readonly contribucionTexto = contribucionTexto;
}
