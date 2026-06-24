import { Component, computed, inject } from '@angular/core';
import { CurrencyPipe, PercentPipe, DecimalPipe } from '@angular/common';
import { InversorService } from '../../../core/services/inversor.service';
import { MetricCardComponent } from '../../../shared/components/metric-card/metric-card';

@Component({
  selector: 'app-inversor-dashboard',
  template: `
    <div class="dashboard">
      <h1 class="page-title">Portal de Inversionistas</h1>
      <p class="page-subtitle">Métricas en tiempo real de la cartera de créditos NeoLend</p>

      <div class="kpi-grid">
        <app-metric-card
          label="Valor Total Cartera"
          [value]="(resumen().valorTotal | currency:'USD':'symbol':'1.0-0') ?? ''"
          color="var(--p-primary-400)"
          subtext="{{ resumen().totalPrestamos }} préstamos activos"
        />
        <app-metric-card
          label="TIR Proyectada"
          [value]="(resumen().tir | percent:'1.1-1') ?? ''"
          color="var(--p-green-500)"
          subtext="Rendimiento anualizado"
        />
        <app-metric-card
          label="Morosidad General"
          [value]="(resumen().morosidadGeneral | percent:'1.1-1') ?? ''"
          color="var(--p-red-500)"
          subtext="{{ morosidadClasificacion() }}"
        />
        <app-metric-card
          label="Exposición Alto Riesgo"
          [value]="(porcentajeAltoRiesgo() | percent:'1.1-1') ?? ''"
          color="var(--p-orange-500)"
          subtext="Del valor total de cartera"
        />
      </div>

      <div class="charts-grid">
        <div class="card flujo-card">
          <h2 class="card-title">Flujo de Caja Proyectado</h2>
          <div class="flujo-barras">
            @for (item of resumen().flujoCajaProyectado; track item.mes) {
              <div class="bar-col">
                <div class="bar-group">
                  <div class="bar ingreso" [style.height.px]="barraAltura(item.ingresos)"></div>
                  <div class="bar egreso" [style.height.px]="barraAltura(item.egresos)"></div>
                </div>
                <div class="bar-label">{{ item.mes }}</div>
                <div class="bar-valor saldo-{{ item.saldo >= 0 ? 'pos' : 'neg' }}">
                  \${{ item.saldo < 0 ? '' : '' }}{{ item.saldo | number:'1.0-0' }}
                </div>
              </div>
            }
          </div>
          <div class="flujo-legend">
            <span class="legend-item"><span class="dot ingreso-dot"></span> Ingresos</span>
            <span class="legend-item"><span class="dot egreso-dot"></span> Egresos</span>
          </div>
        </div>

        <div class="card morosidad-card">
          <h2 class="card-title">Morosidad por Segmento</h2>
          <div class="segmentos">
            @for (seg of resumen().morosidadPorSegmento; track seg.segmento) {
              <div class="segmento-row">
                <div class="segmento-header">
                  <span class="segmento-name">{{ seg.segmento }}</span>
                  <span class="segmento-valor">{{ seg.morosidad | percent:'1.1-1' }}</span>
                </div>
                <div class="segmento-bar-bg">
                  <div class="segmento-bar" [style.width.%]="seg.morosidad * 10" [style.background]="morosidadColor(seg.morosidad)"></div>
                </div>
                <span class="segmento-count">{{ seg.totalPrestamos }} préstamos</span>
              </div>
            }
          </div>
        </div>
      </div>

      <div class="card riesgo-card">
        <h2 class="card-title">Exposición al Riesgo</h2>
        <div class="riesgo-barras">
          @for (item of riesgoItems(); track item.label) {
            <div class="riesgo-item">
              <div class="riesgo-header">
                <span class="riesgo-label">{{ item.label }}</span>
                <span class="riesgo-valor">{{ item.valor | currency:'USD':'symbol':'1.0-0' }}</span>
              </div>
              <div class="riesgo-bar-bg">
                <div class="riesgo-bar" [style.width.%]="item.porcentaje" [style.background]="item.color"></div>
              </div>
              <span class="riesgo-pct">{{ item.porcentaje | number:'1.1-1' }}%</span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './dashboard.scss',
  imports: [CurrencyPipe, PercentPipe, DecimalPipe, MetricCardComponent],
})
export class InversorDashboardComponent {
  readonly #inversorService = inject(InversorService);
  readonly resumen = this.#inversorService.resumen;

  readonly porcentajeAltoRiesgo = computed(() => {
    const r = this.resumen().exposicionRiesgo;
    const total = r.bajo + r.medio + r.alto + r.muyAlto;
    return total > 0 ? (r.alto + r.muyAlto) / total : 0;
  });

  readonly morosidadClasificacion = computed(() => {
    const m = this.resumen().morosidadGeneral;
    return m < 2 ? 'Saludable' : m < 5 ? 'Bajo control' : m < 8 ? 'Requiere atención' : 'Crítica';
  });

  readonly riesgoItems = computed(() => {
    const r = this.resumen().exposicionRiesgo;
    const total = r.bajo + r.medio + r.alto + r.muyAlto;
    return [
      { label: 'Bajo', valor: r.bajo, porcentaje: (r.bajo / total) * 100, color: 'var(--p-green-500)' },
      { label: 'Medio', valor: r.medio, porcentaje: (r.medio / total) * 100, color: 'var(--p-yellow-500)' },
      { label: 'Alto', valor: r.alto, porcentaje: (r.alto / total) * 100, color: 'var(--p-orange-500)' },
      { label: 'Muy Alto', valor: r.muyAlto, porcentaje: (r.muyAlto / total) * 100, color: 'var(--p-red-500)' },
    ];
  });

  barraAltura(valor: number): number {
    const maxValor = Math.max(...this.resumen().flujoCajaProyectado.map(f => Math.max(f.ingresos, f.egresos)));
    return (valor / maxValor) * 160;
  }

  morosidadColor(valor: number): string {
    return valor < 3 ? 'var(--p-green-500)' : valor < 6 ? 'var(--p-yellow-500)' : 'var(--p-red-500)';
  }
}
