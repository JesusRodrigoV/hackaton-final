import { Component, input } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';

interface TimelineItem {
  label: string;
  fecha: Date | null;
  monto: number;
  estado: 'completado' | 'actual' | 'pendiente' | 'fallido';
  numero: number;
}

@Component({
  selector: 'app-payment-timeline',
  template: `
    <div class="timeline">
      <div class="timeline-header">
        <span class="tl-label">Cuota</span>
        <span class="tl-label">Estado</span>
        <span class="tl-label">Monto</span>
        <span class="tl-label">Fecha</span>
      </div>
      <div class="timeline-items">
        @for (item of items(); track item.numero) {
          <div class="tl-item" [class]="'tl-' + item.estado">
            <span class="tl-numero">{{ item.numero }}</span>
            <span class="tl-estado">
              @if (item.estado === 'completado') {
                <span class="badge badge-success">Pagado</span>
              } @else if (item.estado === 'actual') {
                <span class="badge badge-current">Próximo</span>
              } @else if (item.estado === 'fallido') {
                <span class="badge badge-danger">Vencido</span>
              } @else {
                <span class="badge badge-pending">{{ item.numero === 1 ? 'Pendiente' : '—' }}</span>
              }
            </span>
            <span class="tl-monto">{{ item.monto | currency:'USD':'symbol':'1.0-0' }}</span>
            <span class="tl-fecha">{{ item.fecha ? (item.fecha | date:'dd/MM/yyyy') : '—' }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './payment-timeline.scss',
  imports: [DatePipe, CurrencyPipe],
})
export class PaymentTimelineComponent {
  readonly items = input.required<TimelineItem[]>();
}
