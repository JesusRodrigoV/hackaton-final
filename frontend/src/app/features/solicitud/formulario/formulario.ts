import { Component, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { CreditStepperComponent } from '../../../shared/components/credit-stepper/credit-stepper';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload';
import { CreditoService } from '../../../core/services/credito.service';
import { AuthService } from '../../../core/services/auth.service';

interface Step {
  key: string;
  label: string;
}

@Component({
  selector: 'app-formulario',
  template: `
    <div class="form-container">
      <div class="form-card">
        <div class="form-header">
          <h1>Solicite su crédito</h1>
          <p class="form-subtitle">Complete sus datos y obtenga una respuesta en menos de 3 minutos</p>
        </div>

        <app-credit-stepper [steps]="steps" [currentIndex]="currentStep()" (stepChange)="currentStep.set($event)" />

        <div class="step-content">
          @switch (currentStep()) {
            @case (0) {
              <div class="step-panel">
                <h2 class="step-title">Su identidad</h2>
                <p class="step-desc">Suba su documento de identidad para comenzar</p>
                <app-file-upload (fileChange)="onFileChange($event)" />
                @if (attemptedProceed() && !file()) {
                  <small class="field-error">Debe subir su documento de identidad</small>
                }
                <div class="field">
                  <label class="field-label">Nombre completo</label>
                  <input
                    pInputText
                    [(ngModel)]="nombre"
                    placeholder="Ej: Juan Pérez"
                    class="input-field"
                    [class.ng-invalid]="attemptedProceed() && !nombre()"
                  />
                  @if (attemptedProceed() && !nombre()) {
                    <small class="field-error">El nombre es obligatorio</small>
                  }
                </div>
              </div>
            }
            @case (1) {
              <div class="step-panel">
                <h2 class="step-title">Detalles del crédito</h2>
                <div class="fields-grid">
                  <div class="field">
                    <label class="field-label">¿Cuánto necesita?</label>
                    <p-inputNumber
                      [(ngModel)]="monto"
                      [min]="50"
                      [max]="5000"
                      [step]="50"
                      prefix="$ "
                      placeholder="0"
                      class="input-field"
                    />
                    @if (attemptedProceed() && monto() < 50) {
                      <small class="field-error">El monto mínimo es USD $50</small>
                    }
                  </div>
                  <div class="field">
                    <label class="field-label">Plazo</label>
                    <p-select
                      [(ngModel)]="plazo"
                      [options]="plazos"
                      placeholder="Seleccione un plazo"
                      class="input-field"
                    />
                    @if (attemptedProceed() && !plazo()) {
                      <small class="field-error">Seleccione un plazo</small>
                    }
                  </div>
                  <div class="field full-width">
                    <label class="field-label">Motivo del préstamo</label>
                    <textarea
                      pInputTextarea
                      [(ngModel)]="motivo"
                      rows="3"
                      placeholder="Cuéntenos brevemente para qué necesita el crédito..."
                      class="input-field"
                    ></textarea>
                  </div>
                </div>
                @if (monto() > 0) {
                  <div class="resumen">
                    <span class="resumen-label">Solicita:</span>
                    <span class="resumen-value">{{ monto() | currency:'USD':'symbol':'1.0-0' }}</span>
                    @if (plazo()) {
                      <span class="resumen-label">a</span>
                      <span class="resumen-value">{{ plazo()?.label }}</span>
                    }
                  </div>
                }
              </div>
            }
            @case (2) {
              <div class="step-panel review-panel">
                <h2 class="step-title">Revise su solicitud</h2>
                <div class="review-card">
                  <div class="review-row">
                    <span class="review-label">Nombre</span>
                    <span class="review-value">{{ nombre() }}</span>
                  </div>
                  <div class="review-row">
                    <span class="review-label">Documento</span>
                    <span class="review-value">{{ file()?.name || 'Sin archivo' }}</span>
                  </div>
                  <div class="review-row">
                    <span class="review-label">Monto</span>
                    <span class="review-value highlight">{{ monto() | currency:'USD':'symbol':'1.0-0' }}</span>
                  </div>
                  <div class="review-row">
                    <span class="review-label">Plazo</span>
                    <span class="review-value">{{ plazo()?.label }}</span>
                  </div>
                  <div class="review-row">
                    <span class="review-label">Motivo</span>
                    <span class="review-value">{{ motivo() || 'No especificado' }}</span>
                  </div>
                </div>
              </div>
            }
          }
        </div>

        <div class="form-actions">
          @if (currentStep() > 0) {
            <p-button label="Anterior" severity="secondary" (onClick)="prevStep()" [rounded]="true" />
          }
          @if (currentStep() < steps.length - 1) {
            <p-button label="Continuar" (onClick)="nextStep()" [disabled]="!canProceed()" [rounded]="true" />
          } @else {
            <p-button label="Enviar solicitud" icon="pi pi-send" (onClick)="enviar()" [loading]="enviando()" [rounded]="true" />
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './formulario.scss',
  imports: [
    FormsModule, ButtonModule, InputNumberModule, TextareaModule,
    SelectModule, ToastModule, CurrencyPipe,
    CreditStepperComponent, FileUploadComponent,
  ],
})
export class FormularioComponent {
  readonly #creditoService = inject(CreditoService);
  readonly #authService = inject(AuthService);
  readonly #router = inject(Router);
  readonly #message = inject(MessageService);

  readonly steps: Step[] = [
    { key: 'identidad', label: 'Identidad' },
    { key: 'detalles', label: 'Detalles' },
    { key: 'revisar', label: 'Revisar' },
  ];

  readonly currentStep = signal(0);
  readonly enviando = signal(false);
  readonly attemptedProceed = signal(false);

  readonly nombre = signal('');
  readonly file = signal<File | null>(null);
  readonly monto = signal<number>(0);
  readonly plazo = signal<{ label: string; value: number } | null>(null);
  readonly motivo = signal('');

  readonly plazos = [
    { label: '2 meses', value: 2 },
    { label: '3 meses', value: 3 },
    { label: '6 meses', value: 6 },
    { label: '12 meses', value: 12 },
  ];

  readonly canProceed = computed(() => {
    switch (this.currentStep()) {
      case 0: return this.nombre().length > 0 && this.file() !== null;
      case 1: return this.monto() >= 50 && this.plazo() !== null;
      default: return true;
    }
  });

  onFileChange(f: File | null): void {
    this.file.set(f);
  }

  #fileToBase64(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(f);
    });
  }

  nextStep(): void {
    if (this.canProceed()) {
      this.currentStep.update(s => Math.min(s + 1, this.steps.length - 1));
      this.attemptedProceed.set(false);
    } else {
      this.attemptedProceed.set(true);
    }
  }

  prevStep(): void {
    this.currentStep.update(s => Math.max(s - 1, 0));
  }

  async enviar(): Promise<void> {
    this.enviando.set(true);
    try {
      await this.#authService.loginSolicitante('', this.nombre());

      const f = this.file();
      const documentoBase64 = f ? await this.#fileToBase64(f) : '';

      const solicitud = await this.#creditoService.crearSolicitud({
        monto: this.monto(),
        plazoMeses: this.plazo()?.value ?? 6,
        motivo: this.motivo(),
        documentoBase64,
      });

      this.#message.add({
        severity: 'success',
        summary: 'Solicitud enviada',
        detail: 'Estamos evaluando su crédito...',
      });
      this.#router.navigate(['/solicitar', solicitud.id]);
    } catch (err: any) {
      this.#message.add({
        severity: 'error',
        summary: 'Error',
        detail: err?.message ?? 'No se pudo procesar la solicitud',
      });
    } finally {
      this.enviando.set(false);
    }
  }
}
