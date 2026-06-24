import { Component, input, output, computed } from '@angular/core';

@Component({
  selector: 'app-credit-stepper',
  template: `
    <div class="stepper">
      <div class="steps">
        @for (step of steps(); track step.key; let i = $index) {
          <div class="step" [class.active]="i === currentIndex()" [class.completed]="i < currentIndex()" [class.clickable]="i < currentIndex()" (click)="onStepClick(i)">
            <div class="step-indicator">
              @if (i < currentIndex()) {
                <i class="bx bx-check"></i>
              } @else {
                {{ i + 1 }}
              }
            </div>
            <span class="step-label">{{ step.label }}</span>
          </div>
        }
      </div>
      <div class="step-connector">
        <div class="connector-fill" [style.width.%]="progressPercent()"></div>
      </div>
    </div>
  `,
  styleUrl: './credit-stepper.scss',
})
export class CreditStepperComponent {
  readonly steps = input.required<{ key: string; label: string }[]>();
  readonly currentIndex = input.required<number>();
  readonly stepChange = output<number>();

  readonly progressPercent = computed(() => this.currentIndex() > 0 ? ((this.currentIndex()) / (this.steps().length - 1)) * 100 : 0);

  onStepClick(index: number): void {
    if (index < this.currentIndex()) {
      this.stepChange.emit(index);
    }
  }
}
