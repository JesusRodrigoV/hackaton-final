import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-score-gauge',
  template: `
    <div class="gauge-wrapper" [style.--score-percent]="percent()">
      <div class="gauge-ring">
        <svg viewBox="0 0 120 120" class="gauge-svg">
          <circle cx="60" cy="60" r="54" fill="none" stroke="var(--p-surface-800)" stroke-width="8"/>
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            [attr.stroke]="color()"
            stroke-width="8"
            stroke-linecap="round"
            [attr.stroke-dasharray]="circumference"
            [attr.stroke-dashoffset]="offset()"
            transform="rotate(-90 60 60)"
            class="gauge-arc"
          />
        </svg>
        <div class="gauge-center">
          <span class="gauge-value">{{ puntaje() }}</span>
          <span class="gauge-label">Puntaje</span>
        </div>
      </div>
      <div class="gauge-info">
        <span class="gauge-nivel" [style.color]="color()">{{ nivel() }}</span>
        <span class="gauge-max">Máx: 999</span>
      </div>
    </div>
  `,
  styleUrl: './score-gauge.scss',
})
export class ScoreGaugeComponent {
  readonly puntaje = input.required<number>();
  readonly maxScore = input(999);

  readonly circumference = 2 * Math.PI * 54;

  readonly percent = computed(() => (this.puntaje() / this.maxScore()) * 100);
  readonly offset = computed(() => this.circumference - (this.percent() / 100) * this.circumference);

  readonly nivel = computed(() => {
    const p = this.puntaje();
    if (p >= 650) return 'Bajo riesgo';
    if (p >= 450) return 'Riesgo medio';
    if (p >= 300) return 'Riesgo alto';
    return 'Riesgo muy alto';
  });

  readonly color = computed(() => {
    const p = this.puntaje();
    if (p >= 650) return 'var(--p-green-500)';
    if (p >= 450) return 'var(--p-yellow-500)';
    if (p >= 300) return 'var(--p-orange-500)';
    return 'var(--p-red-500)';
  });
}
