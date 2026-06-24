import { Component, inject, computed, input } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';

import { DesembolsoService } from '../../../core/services/desembolso.service';

@Component({
  selector: 'app-confirmacion',
  template: `
    <div class="confirmacion-container">
      @if (desembolso(); as d) {
        <div class="conf-card">
          <div class="conf-icon">
            @if (d.estado === 'completado') {
              <i class="bx bx-check-circle" style="font-size: 3rem; color: var(--p-green-500)"></i>
            } @else if (d.estado === 'fallido') {
              <i class="bx bx-x-circle" style="font-size: 3rem; color: var(--p-red-500)"></i>
            } @else {
              <i class="bx bx-time" style="font-size: 3rem; color: var(--p-yellow-500)"></i>
            }
          </div>
          <h1>{{ statusTitle() }}</h1>
          <p class="conf-desc">{{ statusDesc() }}</p>
          <p-tag [value]="statusTag()" [severity]="tagSeverity()" [style]="{ fontSize: '0.85rem', padding: '0.3rem 0.8rem' }" />
          <div class="conf-details">
            <div class="conf-row"><span>Método</span><strong>{{ getMetodoNombre(d.metodo) }}</strong></div>
            @for (entry of d.detalle | keyvalue; track entry.key) {
              <div class="conf-row"><span>{{ campoLabel(entry.key) }}</span><strong>{{ entry.value }}</strong></div>
            }
            <div class="conf-row"><span>Solicitud</span><strong class="mono">{{ d.solicitudId }}</strong></div>
          </div>
          <div class="actions">
            @if (d.estado === 'completado') {
              <p-button label="Ir al inicio" (onClick)="router.navigate(['/'])" [rounded]="true" severity="success" />
            } @else if (d.estado === 'fallido') {
              <p-button label="Reintentar" (onClick)="router.navigate(['/solicitar', d.solicitudId, 'desembolso'])" [rounded]="true" />
            } @else {
              <p-button label="Ver estado" (onClick)="router.navigate(['/'])" [rounded]="true" />
            }
          </div>
        </div>
      } @else {
        <div class="conf-card">
          <p-skeleton width="80px" height="80px" borderRadius="50%" styleClass="mx-auto" />
          <p-skeleton width="60%" height="28px" borderRadius="8px" styleClass="mx-auto mt-3" />
          <p-skeleton width="80%" height="48px" borderRadius="8px" styleClass="mx-auto mt-2" />
        </div>
      }
    </div>
  `,
  styleUrl: './confirmacion.scss',
  imports: [ButtonModule, TagModule, SkeletonModule, KeyValuePipe],
})
export class ConfirmacionComponent {
  readonly router = inject(Router);
  readonly #desembolsoService = inject(DesembolsoService);

  readonly id = input<string>('');
  readonly desembolso = computed(() => this.#desembolsoService.getDesembolsoBySolicitud(this.id()));

  readonly statusTitle = computed(() => {
    const e = this.desembolso()?.estado;
    if (e === 'completado') return '¡Desembolsado!';
    if (e === 'fallido') return 'Error en el desembolso';
    return 'Procesando desembolso';
  });

  readonly statusDesc = computed(() => {
    const e = this.desembolso()?.estado;
    if (e === 'completado') return 'El dinero ya está disponible en su cuenta.';
    if (e === 'fallido') return 'Hubo un problema al procesar el desembolso. Inténtelo de nuevo.';
    return 'Estamos procesando su desembolso. Esto puede tomar unos minutos.';
  });

  readonly statusTag = computed(() => {
    const e = this.desembolso()?.estado;
    if (e === 'completado') return 'Completado';
    if (e === 'fallido') return 'Fallido';
    return 'En proceso';
  });

  readonly tagSeverity = computed(() => {
    const e = this.desembolso()?.estado;
    if (e === 'completado') return 'success' as const;
    if (e === 'fallido') return 'danger' as const;
    return 'warn' as const;
  });

  getMetodoNombre(id: string): string {
    const map: Record<string, string> = { billetera_digital: 'Billetera digital', transferencia_bancaria: 'Transferencia bancaria', efectivo_corresponsal: 'Retiro en efectivo' };
    return map[id] ?? id;
  }

  campoLabel(key: string): string {
    const map: Record<string, string> = { proveedor: 'Proveedor', numero: 'Número', banco: 'Banco', cuenta: 'Cuenta', titular: 'Titular', corresponsal: 'Corresponsal', codigo: 'Código sucursal' };
    return map[key] ?? key;
  }
}
