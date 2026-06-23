import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface SourceWeight {
  readonly label: string;
  readonly key: string;
  readonly value: number;
  readonly sentiment: 'positive' | 'negative' | 'neutral';
}

interface EventStep {
  readonly type: string;
  readonly detail: string;
  readonly service: string;
}

interface Metric {
  readonly label: string;
  readonly value: string;
  readonly trend: string;
}

interface BackendModule {
  readonly name: string;
  readonly owner: string;
  readonly endpoints: readonly string[];
  readonly focus: string;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly darkMode = signal(false);
  protected readonly amount = signal(450);
  protected readonly utilitiesScore = signal(86);
  protected readonly walletScore = signal(74);
  protected readonly commerceScore = signal(61);
  protected readonly educationPoints = signal(120);

  protected readonly selectedSegment = signal<'nuevo' | 'comercio' | 'recurrente'>('nuevo');

  protected readonly score = computed(() => {
    const base =
      this.utilitiesScore() * 3.2 +
      this.walletScore() * 2.5 +
      this.commerceScore() * 1.8 +
      this.educationPoints() * 0.55;

    const segmentBoost = this.selectedSegment() === 'recurrente' ? 65 : this.selectedSegment() === 'comercio' ? 35 : 0;
    return Math.min(1000, Math.round(280 + base + segmentBoost));
  });

  protected readonly decision = computed(() => {
    if (this.score() < 620) {
      return {
        state: 'Rechazo preventivo',
        tone: 'danger',
        reason: 'Score insuficiente; se recomienda educación financiera antes de reintentar.',
      };
    }

    if (this.amount() <= 500) {
      return {
        state: 'Aprobación automática',
        tone: 'success',
        reason: 'Monto menor o igual a USD 500 y score apto para decisión en menos de 90 segundos.',
      };
    }

    return {
      state: 'Revisión manual',
      tone: 'warning',
      reason: 'Monto mayor a USD 500; el analista recibe evidencia, SHAP y trazabilidad precargada.',
    };
  });

  protected readonly estimatedRate = computed(() => {
    const discount = Math.min(4.8, this.educationPoints() / 100);
    const risk = Math.max(0, 1000 - this.score()) / 100;
    return `${(19.8 + risk - discount).toFixed(1)}%`;
  });

  protected readonly shapValues = computed<readonly SourceWeight[]>(() => [
    {
      label: 'Pago de luz/agua al día',
      key: 'historial_servicios',
      value: this.normalize(this.utilitiesScore(), 0.48),
      sentiment: 'positive',
    },
    {
      label: 'Billetera digital activa',
      key: 'billetera_digital',
      value: this.normalize(this.walletScore(), 0.36),
      sentiment: 'positive',
    },
    {
      label: 'Compras e-commerce',
      key: 'ecommerce',
      value: this.normalize(this.commerceScore(), 0.29),
      sentiment: 'positive',
    },
    {
      label: 'Buró tradicional lento',
      key: 'buro_tradicional',
      value: -0.15,
      sentiment: 'negative',
    },
    {
      label: 'Educación financiera',
      key: 'gamificacion',
      value: Math.min(0.24, this.educationPoints() / 1000),
      sentiment: 'positive',
    },
  ]);

  protected readonly eventSteps = computed<readonly EventStep[]>(() => [
    {
      type: 'SOLICITUD_CREADA',
      detail: `Usuario solicita USD ${this.amount()} desde app móvil`,
      service: 'Backend 1',
    },
    {
      type: 'FRAUDE_VERIFICADO',
      detail: 'Biometría validada localmente por data residency',
      service: 'Backend 3',
    },
    {
      type: 'SCORING_PROCESADO',
      detail: `Score ${this.score()} con SHAP y fallback de buró cacheado`,
      service: 'Backend 2',
    },
    {
      type: this.amount() <= 500 && this.score() >= 620 ? 'CREDITO_APROBADO' : this.score() < 620 ? 'CREDITO_RECHAZADO' : 'REVISION_MANUAL',
      detail: `${this.decision().state}; firma SHA-256 registrada`,
      service: 'Backend 1',
    },
  ]);

  protected readonly investorMetrics: readonly Metric[] = [
    { label: 'TIR simulada', value: '18.4%', trend: '+2.1 pp vs. escenario base' },
    { label: 'Mora proyectada', value: '6.7%', trend: 'Segmento nuevo controlado' },
    { label: 'Flujo 30 días', value: 'USD 42.8K', trend: 'Cobranza automatizada incluida' },
    { label: 'Exposición', value: 'USD 128K', trend: 'Límite académico de prueba' },
  ];

  protected readonly backendModules: readonly BackendModule[] = [
    {
      name: 'Créditos Core & Auditoría',
      owner: 'Backend 1',
      endpoints: ['/creditos/solicitar', 'event_store', 'creditos_read_model'],
      focus: 'CQRS, Event Sourcing, decisión final y firma digital para la Superintendencia.',
    },
    {
      name: 'Scoring & Resiliencia',
      owner: 'Backend 2',
      endpoints: ['/scoring/evaluar', 'buro_cache_local', 'evaluaciones_scoring'],
      focus: 'Score alternativo, SHAP values, caché TTL y circuit breaker para el buró SOAP lento.',
    },
    {
      name: 'Fraude, Operaciones & Usuarios',
      owner: 'Backend 3',
      endpoints: ['/fraude/verificar-biometria', '/desembolsos/procesar', '/inversionistas/metricas'],
      focus: 'Biometría local, desembolso multicanal, cobranzas, gamificación y métricas.',
    },
  ];

  protected readonly scopeItems = [
    'Prototipo académico con datos simulados y escalas realistas para pruebas locales.',
    'Sin servicios pagos: frontend Angular, microservicios FastAPI/Node, SQLite/PostgreSQL opcional.',
    'Preparado para conectar APIs reales mediante contratos HTTP simples por backend.',
  ];

  protected setAmount(value: string | number): void {
    this.amount.set(this.clampNumber(value, 100, 1500));
  }

  protected setScore(source: 'utilities' | 'wallet' | 'commerce', value: string | number): void {
    const parsed = this.clampNumber(value, 0, 100);

    if (source === 'utilities') {
      this.utilitiesScore.set(parsed);
      return;
    }

    if (source === 'wallet') {
      this.walletScore.set(parsed);
      return;
    }

    this.commerceScore.set(parsed);
  }

  protected completeCourse(): void {
    this.educationPoints.update((points) => Math.min(500, points + 40));
  }

  protected toggleTheme(): void {
    this.darkMode.update((value) => !value);
  }

  protected setSegment(segment: 'nuevo' | 'comercio' | 'recurrente'): void {
    this.selectedSegment.set(segment);
  }

  protected trackByLabel(_index: number, item: SourceWeight | Metric): string {
    return item.label;
  }

  protected trackByType(_index: number, item: EventStep): string {
    return item.type;
  }

  protected trackByModule(_index: number, item: BackendModule): string {
    return item.owner;
  }

  protected abs(value: number): number {
    return Math.abs(value);
  }

  private normalize(value: number, max: number): number {
    return Number(((value / 100) * max).toFixed(2));
  }

  private clampNumber(value: string | number, min: number, max: number): number {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return min;
    }

    return Math.min(max, Math.max(min, Math.round(parsed)));
  }
}
