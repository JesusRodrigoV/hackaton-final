import { Component, input } from '@angular/core';

@Component({
  selector: 'app-metric-card',
  template: `
    <div class="metric-card" [class.clickable]="clickable()">
      <span class="metric-label">{{ label() }}</span>
      <span class="metric-value" [style.color]="color()">{{ value() }}</span>
      @if (subtext()) {
        <span class="metric-subtext">{{ subtext() }}</span>
      }
    </div>
  `,
  styleUrl: './metric-card.scss',
})
export class MetricCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly color = input<string>('var(--p-surface-200)');
  readonly subtext = input<string>('');
  readonly clickable = input(false);
}
