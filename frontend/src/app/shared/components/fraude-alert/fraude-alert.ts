import { Component, input, computed } from '@angular/core';
import type { AnalisisFraude } from '../../../core/models/fraude';

@Component({
  selector: 'app-fraude-alert',
  template: `
    <div class="fraude-alert" [class]="'nivel-' + analisis().nivelRiesgo">
      <div class="alert-header">
        <i class="bx bxs-shield alert-icon"></i>
        <div class="alert-info">
          <span class="alert-title">Análisis de Fraude</span>
          <span class="alert-nivel">Riesgo {{ nivelLabel() }}</span>
        </div>
        <span class="alert-score">{{ analisis().puntajeFraude }}%</span>
      </div>
      <div class="alert-body">
        <div class="alert-row">
          <span class="row-label">Documento</span>
          <span class="row-value" [class.verified]="analisis().documentoVerificado" [class.unverified]="!analisis().documentoVerificado">
            <i class="bx" [class.bx-check-circle]="analisis().documentoVerificado" [class.bx-x-circle]="!analisis().documentoVerificado"></i>
            {{ analisis().documentoVerificado ? 'Verificado' : 'No verificado' }}
          </span>
        </div>
        <div class="alert-row">
          <span class="row-label">Coincidencia biométrica</span>
          <span class="row-value">{{ analisis().biometria.coincidencia }}%</span>
        </div>
        @for (alerta of analisis().alertas; track alerta.tipo) {
          <div class="alerta-item" [class]="'sev-' + alerta.severidad">
            <i class="bx" [class.bx-info-circle]="alerta.severidad === 'baja'" [class.bx-alarm]="alerta.severidad === 'media'" [class.bx-error]="alerta.severidad === 'alta'"></i>
            <span class="alerta-texto">{{ alerta.descripcion }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './fraude-alert.scss',
})
export class FraudeAlertComponent {
  readonly analisis = input.required<AnalisisFraude>();

  readonly nivelLabel = computed(() => {
    const map: Record<string, string> = { bajo: 'Bajo', medio: 'Medio', alto: 'Alto', critico: 'Crítico' };
    return map[this.analisis().nivelRiesgo] ?? 'Desconocido';
  });
}
