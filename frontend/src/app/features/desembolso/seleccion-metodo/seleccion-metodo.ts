import { Component, inject, signal, computed, input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import { DesembolsoService } from '../../../core/services/desembolso.service';
import { CreditoService } from '../../../core/services/credito.service';
import type { MetodoDesembolsoId } from '../../../core/models/desembolso';

@Component({
  selector: 'app-seleccion-metodo',
  template: `
    <div class="desembolso-container">
      <div class="header-card">
        <h1>Reciba su crédito</h1>
        <p class="subtitle">Elija cómo quiere recibir el dinero</p>
      </div>

      @if (solicitud(); as sol) {
        <div class="monto-badge">
          <span class="mb-label">Monto a desembolsar</span>
          <span class="mb-value">{{ sol.monto | currency:'USD':'symbol':'1.0-0' }}</span>
        </div>

        <div class="metodos-grid">
          @for (metodo of desembolsoService.metodos(); track metodo.id) {
            <div class="metodo-card" [class.selected]="selected() === metodo.id" (click)="selected.set(metodo.id)">
              <div class="metodo-icon"><i [class]="metodo.icono"></i></div>
              <div class="metodo-info">
                <h3>{{ metodo.nombre }}</h3>
                <p>{{ metodo.descripcion }}</p>
                <span class="tiempo">{{ metodo.tiempoEstimado }}</span>
              </div>
              <div class="metodo-radio">
                <div class="radio-circle" [class.checked]="selected() === metodo.id"></div>
              </div>
            </div>
          }
        </div>

        @if (selected(); as metodoId) {
          <div class="detalle-card">
            <h3>Detalles de {{ metodoSeleccionado()?.nombre }}</h3>
            @for (campo of metodoSeleccionado()?.campos; track campo.key) {
              <div class="field">
                <label class="field-label">{{ campo.label }}</label>
                @if (campo.tipo === 'select') {
                  <div class="select-group">
                    @for (opcion of campo.opciones; track opcion) {
                      <div class="option-chip" [class.selected]="formValues()[campo.key] === opcion" (click)="selectOption(campo.key, opcion)">{{ opcion }}</div>
                    }
                  </div>
                } @else {
                  <input pInputText [placeholder]="campo.placeholder" class="input-field" #ref (input)="onInputChange(campo.key, ref.value)" />
                }
              </div>
            }
          </div>
        }

        <div class="actions">
          <p-button label="Confirmar y recibir" (onClick)="confirmar()" [rounded]="true" [disabled]="!canConfirm()" icon="pi pi-check" />
        </div>
      }
    </div>
  `,
  styleUrl: './seleccion-metodo.scss',
  imports: [ButtonModule, InputTextModule, CurrencyPipe],
})
export class SeleccionMetodoComponent {
  readonly #router = inject(Router);
  readonly desembolsoService = inject(DesembolsoService);
  readonly #creditoService = inject(CreditoService);

  readonly id = input<string>('');
  readonly solicitud = computed(() => this.#creditoService.getSolicitudById(this.id()));
  readonly selected = signal<MetodoDesembolsoId | null>(null);
  readonly formValues = signal<Record<string, string>>({});

  readonly metodoSeleccionado = computed(() => {
    const id = this.selected();
    if (!id) return undefined;
    return this.desembolsoService.getMetodoById(id);
  });

  onInputChange(key: string, value: string): void {
    this.formValues.update(v => ({ ...v, [key]: value }));
  }

  selectOption(key: string, value: string): void {
    this.formValues.update(v => ({ ...v, [key]: value }));
  }

  readonly canConfirm = computed(() => {
    const metodo = this.selected();
    if (!metodo) return false;
    const campos = this.metodoSeleccionado()?.campos ?? [];
    return campos.every(c => this.formValues()[c.key]?.trim());
  });

  async confirmar(): Promise<void> {
    const metodo = this.selected();
    if (!metodo || !this.id()) return;
    await this.desembolsoService.procesarDesembolso(this.id(), metodo, this.formValues());
    this.#router.navigate(['/solicitar', this.id(), 'desembolso', 'confirmacion']);
  }
}
