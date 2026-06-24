import { Component, computed, inject, signal, input } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';

import { PaymentTimelineComponent } from '../../../shared/components/payment-timeline/payment-timeline';
import { CobranzaService } from '../../../core/services/cobranza.service';
import type { PrestamoEstado, Pago } from '../../../core/models/cobranza';

@Component({
  selector: 'app-cobranza-detalle',
  template: `
    <div class="detalle-container">
      <p-button label="← Volver a cobranza" severity="secondary" (onClick)="volver()" [rounded]="true" styleClass="back-btn" />
      @if (prestamo(); as p) {
        <div class="detalle-grid">
          <div class="summary-card">
            <div class="summary-header"><h2>{{ p.usuarioNombre }}</h2><p-tag [value]="tagLabel(p.estado)" [severity]="tagSeverity(p.estado)" /></div>
            <div class="summary-doc">{{ p.usuarioDocumento }}</div>
            <div class="summary-ids"><span class="mono">{{ p.id }}</span><span class="mono">SOL: {{ p.solicitudId }}</span></div>
            <div class="summary-details">
              <div class="sd-row"><span>Monto original</span><strong>{{ p.montoOriginal | currency:'USD':'symbol':'1.0-0' }}</strong></div>
              <div class="sd-row highlight"><span>Saldo pendiente</span><strong class="text-warning">{{ p.saldoPendiente | currency:'USD':'symbol':'1.0-0' }}</strong></div>
              <div class="sd-row"><span>Tasa interés</span><strong>{{ p.tasaInteres }}%</strong></div>
              <div class="sd-row"><span>Cuota mensual</span><strong>{{ p.cuotaMensual | currency:'USD':'symbol':'1.0-0' }}</strong></div>
              <div class="sd-row"><span>Progreso</span><strong>{{ p.cuotasPagadas }}/{{ p.totalCuotas }} cuotas</strong></div>
              <div class="sd-row"><span>Desembolso</span><strong>{{ p.desembolsoMetodo }}</strong></div>
              @if (p.diasAtraso > 0) { <div class="sd-row alert"><span>Días de atraso</span><strong class="text-danger">{{ p.diasAtraso }} días</strong></div> }
              <div class="sd-row"><span>Próximo pago</span><strong>{{ p.fechaProximoPago | date:'dd/MM/yyyy' }}</strong></div>
            </div>
            <div class="summary-actions">
              @if (p.estado !== 'pagado') { <p-button label="Registrar pago" icon="pi pi-dollar" (onClick)="registrarPago()" [rounded]="true" severity="success" /> }
              @if (p.estado === 'atrasado' || p.estado === 'mora') {
                <p-button label="Enviar recordatorio" icon="pi pi-bell" (onClick)="enviarRecordatorio()" [rounded]="true" severity="warn" />
                <p-button label="Crear acuerdo" icon="pi pi-file-edit" (onClick)="acuerdoDialog.set(true)" [rounded]="true" severity="info" />
              }
            </div>
          </div>
          <div class="timeline-card"><h3>Plan de pagos</h3><app-payment-timeline [items]="timelineItems()" /></div>
          <div class="history-card">
            <h3>Historial de pagos</h3>
            @if (pagos().length > 0) {
              <p-table [value]="pagos()">
                <ng-template #header><tr><th>Cuota</th><th>Monto</th><th>Fecha</th><th>Método</th></tr></ng-template>
                <ng-template #body let-pago>
                  <tr><td>#{{ pago.cuotaNumero }}</td><td>{{ pago.monto | currency:'USD':'symbol':'1.0-0' }}</td><td>{{ pago.fecha | date:'dd/MM/yyyy' }}</td><td>{{ pago.metodo }}</td></tr>
                </ng-template>
              </p-table>
            } @else { <p class="no-data">Sin pagos registrados</p> }
          </div>
          @if (acuerdos().length > 0) {
            <div class="agreements-card">
              <h3>Acuerdos de pago</h3>
              @for (ac of acuerdos(); track ac.id) {
                <div class="agreement-item">
                  <div class="agr-header"><span class="agr-id">{{ ac.id }}</span><p-tag [value]="ac.estado === 'activo' ? 'Activo' : 'Completado'" [severity]="ac.estado === 'activo' ? 'info' : 'success'" /></div>
                  <p class="agr-motivo">{{ ac.motivo }}</p>
                  <div class="agr-details">
                    <span>Nuevo monto: <strong>{{ ac.montoNuevo | currency:'USD':'symbol':'1.0-0' }}</strong></span>
                    <span>Nuevo plazo: <strong>{{ ac.plazoNuevoMeses }} meses</strong></span>
                    <span>Nueva cuota: <strong>{{ ac.nuevaCuota | currency:'USD':'symbol':'1.0-0' }}/mes</strong></span>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      } @else { <div class="not-found"><p>Préstamo no encontrado</p></div> }

      <p-dialog header="Crear acuerdo de pago" [(visible)]="acuerdoDialog" [modal]="true" [style]="{ width: '450px' }">
        <div class="dialog-body">
          <div class="field"><label class="field-label">Nuevo monto total</label><p-inputNumber [(ngModel)]="nuevoMonto" [min]="100" [step]="50" prefix="$ " class="input-field" /></div>
          <div class="field"><label class="field-label">Nuevo plazo (meses)</label><p-inputNumber [(ngModel)]="nuevoPlazo" [min]="1" [max]="24" class="input-field" /></div>
          <div class="field"><label class="field-label">Motivo de la reestructuración</label><textarea pInputTextarea [(ngModel)]="motivoAcuerdo" rows="3" class="input-field" placeholder="Describa el motivo..."></textarea></div>
          @if (nuevoMonto() > 0 && nuevoPlazo() > 0) { <div class="preview"><span>Nueva cuota estimada:</span><strong>{{ (nuevoMonto() / nuevoPlazo()) | currency:'USD':'symbol':'1.0-0' }}/mes</strong></div> }
        </div>
        <div class="dialog-actions">
          <p-button label="Cancelar" severity="secondary" (onClick)="acuerdoDialog.set(false)" [rounded]="true" />
          <p-button label="Crear acuerdo" (onClick)="crearAcuerdo()" [rounded]="true" [disabled]="!canCreateAcuerdo()" />
        </div>
      </p-dialog>
    </div>
  `,
  styleUrl: './detalle.scss',
  imports: [FormsModule, CurrencyPipe, DatePipe, ButtonModule, TagModule, DialogModule, InputNumberModule, TextareaModule, ToastModule, TableModule, PaymentTimelineComponent],
})
export class CobranzaDetalleComponent {
  readonly #router = inject(Router);
  readonly #cobranzaService = inject(CobranzaService);
  readonly #message = inject(MessageService);

  readonly id = input<string>('');
  readonly prestamo = computed(() => this.#cobranzaService.getPrestamoById(this.id()));
  readonly pagos = computed(() => this.#cobranzaService.getPagosByPrestamo(this.id()));
  readonly acuerdos = computed(() => this.#cobranzaService.getAcuerdosByPrestamo(this.id()));

  readonly acuerdoDialog = signal(false);
  readonly nuevoMonto = signal<number>(0);
  readonly nuevoPlazo = signal<number>(0);
  readonly motivoAcuerdo = signal('');

  readonly timelineItems = computed(() => {
    const p = this.prestamo();
    if (!p) return [];
    const items: any[] = [];
    for (let i = 1; i <= p.totalCuotas; i++) {
      const pago = this.pagos().find(pg => pg.cuotaNumero === i);
      const isFuture = i > p.cuotasPagadas + (p.diasAtraso > 0 ? 0 : 1);
      items.push({
        numero: i, label: `Cuota ${i}`, fecha: pago?.fecha ?? null, monto: p.cuotaMensual,
        estado: pago ? 'completado' : isFuture ? 'pendiente' : 'fallido' as const,
      });
    }
    return items;
  });

  volver(): void { this.#router.navigate(['/analista', 'prestamos']); }
  registrarPago(): void { this.#message.add({ severity: 'success', summary: 'Pago registrado', detail: 'El pago fue registrado exitosamente' }); }
  enviarRecordatorio(): void { this.#message.add({ severity: 'info', summary: 'Recordatorio enviado', detail: 'Se envió recordatorio vía WhatsApp y SMS' }); }
  readonly canCreateAcuerdo = computed(() => this.nuevoMonto() >= 100 && this.nuevoPlazo() >= 1 && this.motivoAcuerdo().trim().length > 0);

  crearAcuerdo(): void {
    if (!this.canCreateAcuerdo()) return;
    this.#cobranzaService.crearAcuerdo(this.id(), this.nuevoMonto(), this.nuevoPlazo(), this.motivoAcuerdo());
    this.acuerdoDialog.set(false);
    this.nuevoMonto.set(0); this.nuevoPlazo.set(0); this.motivoAcuerdo.set('');
    this.#message.add({ severity: 'success', summary: 'Acuerdo creado', detail: 'El préstamo fue reestructurado exitosamente' });
  }

  tagLabel(estado: PrestamoEstado): string {
    const map: Record<PrestamoEstado, string> = { al_dia: 'Al día', atrasado: 'Atrasado', mora: 'En mora', reestructurado: 'Reestructurado', pagado: 'Pagado' };
    return map[estado];
  }

  tagSeverity(estado: PrestamoEstado): 'success' | 'warn' | 'danger' | 'info' | 'contrast' {
    const map: Record<PrestamoEstado, 'success' | 'warn' | 'danger' | 'info' | 'contrast'> = { al_dia: 'success', atrasado: 'warn', mora: 'danger', reestructurado: 'info', pagado: 'contrast' };
    return map[estado];
  }
}
