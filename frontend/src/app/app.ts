import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { environment } from '../environment/environment';

type Screen = 'solicitud' | 'scoring' | 'fraude' | 'operaciones' | 'inversionistas' | 'auditoria' | 'gateway';
type Segment = 'nuevo' | 'pos' | 'recurrente';
type Tone = 'success' | 'warning' | 'danger' | 'neutral';

interface ShapItem {
  readonly label: string;
  readonly key: string;
  readonly value: number;
}

interface EventStep {
  readonly title: string;
  readonly description: string;
  readonly service: string;
}

interface ModuleStatus {
  readonly name: string;
  readonly route: string;
  readonly status: string;
  readonly tone: Tone;
}

interface InvestorMetric {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}

interface ApiResult {
  readonly title: string;
  readonly status: 'ok' | 'error' | 'idle';
  readonly body: unknown;
}

interface ScoringGatewayResponse {
  readonly score_final?: number;
  readonly aprobado?: boolean;
  readonly shap_values?: Record<string, number>;
  readonly origen_datos?: string;
  readonly ms_scoring_trace?: unknown;
  readonly score_final_generado?: number;
  readonly fuente_buro?: string;
}

interface UsuarioResponse {
  readonly usuario_id: string;
  readonly ci: string;
  readonly nombre?: string;
  readonly telefono?: string;
  readonly score_gamificacion?: number;
}

interface GatewayRoutesResponse {
  readonly routes?: readonly unknown[];
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  protected readonly darkMode = signal(false);
  protected readonly activeScreen = signal<Screen>('solicitud');
  protected readonly loading = signal('');
  protected readonly apiResult = signal<ApiResult>({
    title: 'Sin llamada todavia',
    status: 'idle',
    body: { message: 'Usa los botones de cada pantalla para consumir el API Gateway.' },
  });

  protected readonly usuarioId = signal('');
  protected readonly ci = signal('87654321');
  protected readonly nombre = signal('Ana Perez');
  protected readonly telefono = signal('70000000');
  protected readonly monto = signal(450);
  protected readonly plazoMeses = signal(6);
  protected readonly segmento = signal<Segment>('nuevo');
  protected readonly servicios = signal(86);
  protected readonly billetera = signal(72);
  protected readonly ecommerce = signal(64);
  protected readonly recargas = signal(48);
  protected readonly scoreRemoto = signal<number | null>(null);
  protected readonly shapRemoto = signal<Record<string, number> | null>(null);
  protected readonly origenScoring = signal('simulacion_local');
  protected readonly desembolsoId = signal('');
  protected readonly gatewayRoutesCount = signal(0);

  protected readonly screens: readonly { id: Screen; label: string; description: string }[] = [
    { id: 'solicitud', label: 'Solicitud', description: 'App movil y flujo de credito.' },
    { id: 'scoring', label: 'Scoring SHAP', description: 'Motor de riesgo y explicabilidad.' },
    { id: 'fraude', label: 'Fraude local', description: 'Biometria y data residency.' },
    { id: 'operaciones', label: 'Desembolsos', description: 'Idempotencia y cobranza.' },
    { id: 'inversionistas', label: 'Inversionistas', description: 'Cartera y flujo proyectado.' },
    { id: 'auditoria', label: 'Auditoria', description: 'Event sourcing y firma.' },
    { id: 'gateway', label: 'API Gateway', description: 'Estado de integracion.' },
  ];

  protected readonly localScore = computed(() => {
    const segmentBoost = this.segmento() === 'recurrente' ? 72 : this.segmento() === 'pos' ? 34 : 0;
    const base =
      this.servicios() * 2.8 +
      this.billetera() * 2.1 +
      this.ecommerce() * 1.5 +
      this.recargas() * 1.1 +
      segmentBoost;
    return Math.min(1000, Math.round(310 + base));
  });

  protected readonly score = computed(() => this.scoreRemoto() ?? this.localScore());

  protected readonly decision = computed(() => {
    if (this.score() < 620) {
      return {
        label: 'Rechazo preventivo',
        tone: 'danger' as Tone,
        detail: 'El perfil requiere mejorar pagos, actividad o educacion financiera.',
      };
    }

    if (this.monto() <= 500) {
      return {
        label: 'Aprobacion automatica',
        tone: 'success' as Tone,
        detail: 'Monto dentro del limite automatico y score apto para decision rapida.',
      };
    }

    return {
      label: 'Revision manual',
      tone: 'warning' as Tone,
      detail: 'Monto superior a USD 500; se envia evidencia completa al analista.',
    };
  });

  protected readonly tasa = computed(() => {
    const risk = Math.max(0, 1000 - this.score()) / 120;
    return `${(17.5 + risk).toFixed(1)}%`;
  });

  protected readonly shapItems = computed<readonly ShapItem[]>(() => {
    const remote = this.shapRemoto();
    if (remote) {
      return Object.entries(remote).map(([key, value]) => ({
        key,
        label: this.humanizeKey(key),
        value,
      }));
    }

    return [
      { key: 'historial_luz', label: 'Servicios publicos al dia', value: this.roundWeight(this.servicios(), 0.44) },
      { key: 'billetera_digital', label: 'Billetera digital activa', value: this.roundWeight(this.billetera(), 0.31) },
      { key: 'ecommerce', label: 'E-commerce y recargas', value: this.roundWeight(this.ecommerce(), 0.22) },
      { key: 'buro_tradicional', label: 'Buro tradicional', value: -0.12 },
    ];
  });

  protected readonly eventSteps = computed<readonly EventStep[]>(() => [
    {
      title: 'SOLICITUD_CREADA',
      description: `Credito por USD ${this.monto()} a ${this.plazoMeses()} meses`,
      service: 'app / Backend 1',
    },
    {
      title: 'FRAUDE_VERIFICADO',
      description: this.usuarioId() ? `Usuario ${this.usuarioId()} con biometria local` : 'Esperando registro de usuario',
      service: 'ms-operaciones',
    },
    {
      title: 'SCORING_EVALUADO',
      description: `Score ${this.score()} desde ${this.origenScoring()}`,
      service: 'ms-scoring',
    },
    {
      title: this.decision().label.toUpperCase().replaceAll(' ', '_'),
      description: 'Decision consolidada con hash SHA-256 para auditoria.',
      service: 'app / Event Store',
    },
  ]);

  protected readonly moduleStatuses = computed<readonly ModuleStatus[]>(() => [
    {
      name: 'API Gateway',
      route: `${this.apiUrl}/health`,
      status: this.gatewayRoutesCount() > 0 ? `${this.gatewayRoutesCount()} rutas publicadas` : 'pendiente de consulta',
      tone: this.gatewayRoutesCount() > 0 ? 'success' : 'neutral',
    },
    {
      name: 'Creditos Core',
      route: '/api/creditos/solicitar',
      status: 'proxy a FastAPI app:8000',
      tone: 'neutral',
    },
    {
      name: 'Scoring',
      route: '/api/interno/scoring/evaluar',
      status: this.scoreRemoto() ? 'respondio al frontend' : 'adaptador listo',
      tone: this.scoreRemoto() ? 'success' : 'neutral',
    },
    {
      name: 'Operaciones',
      route: '/api/usuarios, /api/fraude, /api/desembolsos',
      status: this.usuarioId() ? 'usuario demo registrado' : 'rutas listas',
      tone: this.usuarioId() ? 'success' : 'neutral',
    },
  ]);

  protected readonly investorMetrics = computed<readonly InvestorMetric[]>(() => [
    { label: 'TIR simulada', value: '18.4%', detail: 'Calculada desde desembolsos completados.' },
    { label: 'Mora estimada', value: '6.7%', detail: 'Plan de pagos y cobranza.' },
    { label: 'Flujo 30 dias', value: 'USD 42.8K', detail: 'Proyeccion de cartera academica.' },
    { label: 'Exposicion', value: `USD ${this.monto() * 18}`, detail: 'Escenario de prueba, no produccion.' },
  ]);

  protected setScreen(screen: Screen): void {
    this.activeScreen.set(screen);
  }

  protected toggleTheme(): void {
    this.darkMode.update((value) => !value);
  }

  protected setMonto(value: string | number): void {
    this.monto.set(this.clamp(value, 100, 1500));
    this.scoreRemoto.set(null);
  }

  protected setPlazo(value: string | number): void {
    this.plazoMeses.set(this.clamp(value, 1, 60));
  }

  protected setData(source: 'servicios' | 'billetera' | 'ecommerce' | 'recargas', value: string | number): void {
    const parsed = this.clamp(value, 0, 100);
    if (source === 'servicios') {
      this.servicios.set(parsed);
    } else if (source === 'billetera') {
      this.billetera.set(parsed);
    } else if (source === 'ecommerce') {
      this.ecommerce.set(parsed);
    } else {
      this.recargas.set(parsed);
    }
    this.scoreRemoto.set(null);
  }

  protected setSegment(segment: Segment): void {
    this.segmento.set(segment);
    this.scoreRemoto.set(null);
  }

  protected async consultarGateway(): Promise<void> {
    await this.runRequest('API Gateway', async () => {
      const response = await firstValueFrom(this.http.get<GatewayRoutesResponse>(`${this.apiUrl}/gateway/routes`));
      this.gatewayRoutesCount.set(response.routes?.length ?? 0);
      return response;
    });
  }

  protected async registrarUsuario(): Promise<void> {
    await this.runRequest('Registrar usuario', async () => {
      const response = await firstValueFrom(
        this.http.post<UsuarioResponse>(`${this.apiUrl}/usuarios/registrar`, {
          ci: this.ci(),
          nombre: this.nombre(),
          telefono: this.telefono(),
        }),
      );
      this.usuarioId.set(response.usuario_id);
      return response;
    });
  }

  protected async verificarFraude(): Promise<void> {
    if (!this.usuarioId()) {
      await this.registrarUsuario();
    }

    if (!this.usuarioId()) {
      return;
    }

    await this.runRequest('Verificar fraude local', () =>
      firstValueFrom(this.http.get(`${this.apiUrl}/interno/fraude/estado/${this.usuarioId()}`)),
    );
  }

  protected async evaluarScoring(): Promise<void> {
    await this.runRequest('Evaluar scoring', async () => {
      const response = await firstValueFrom(
        this.http.post<ScoringGatewayResponse>(`${this.apiUrl}/interno/scoring/evaluar`, {
          credito_id: this.createUuid('11111111'),
          usuario_id: this.usuarioId() || this.createUuid('22222222'),
          monto: this.monto(),
          ci_usuario: this.ci(),
          datos_alternativos: {
            pago_servicios_al_dia: this.servicios() >= 60,
            compras_ecommerce_mes: Math.max(1, Math.round(this.ecommerce() / 8)),
            recargas_moviles_promedio: Number((this.recargas() * 0.7).toFixed(1)),
          },
          simulate_delay: 1,
        }),
      );

      this.scoreRemoto.set(response.score_final ?? response.score_final_generado ?? null);
      this.shapRemoto.set(response.shap_values ?? null);
      this.origenScoring.set(response.origen_datos ?? response.fuente_buro ?? 'ms-scoring');
      return response;
    });
  }

  protected async ejecutarDesembolso(): Promise<void> {
    if (!this.usuarioId()) {
      await this.registrarUsuario();
    }

    await this.runRequest('Ejecutar desembolso', async () => {
      const response = await firstValueFrom(
        this.http.post<{ transaccion_id?: string; estado?: string }>(`${this.apiUrl}/interno/desembolsos/ejecutar`, {
          credito_id: this.createUuid('33333333'),
          usuario_id: this.usuarioId() || this.createUuid('22222222'),
          monto_desembolsar: this.monto(),
        }),
      );
      this.desembolsoId.set(response.transaccion_id ?? '');
      return response;
    });
  }

  protected async completarCurso(): Promise<void> {
    if (!this.usuarioId()) {
      await this.registrarUsuario();
    }

    if (!this.usuarioId()) {
      return;
    }

    await this.runRequest('Completar curso', () =>
      firstValueFrom(this.http.post(`${this.apiUrl}/usuarios/gamificacion/curso`, { usuario_id: this.usuarioId() })),
    );
  }

  protected async cargarMetricas(): Promise<void> {
    await this.runRequest('Metricas de inversionistas', () =>
      firstValueFrom(this.http.get(`${this.apiUrl}/inversionistas/metricas`)),
    );
  }

  protected maxBarWidth(value: number): number {
    return Math.min(100, Math.abs(value) * 100);
  }

  protected trackByLabel(_index: number, item: { label?: string; name?: string; title?: string; id?: string }): string {
    return item.label ?? item.name ?? item.title ?? item.id ?? `${_index}`;
  }

  protected trackByEvent(_index: number, item: EventStep): string {
    return item.title;
  }

  private async runRequest(title: string, request: () => Promise<unknown>): Promise<void> {
    this.loading.set(title);
    try {
      const body = await request();
      this.apiResult.set({ title, status: 'ok', body });
    } catch (error) {
      this.apiResult.set({
        title,
        status: 'error',
        body: {
          message: 'No se pudo completar la llamada. Verifica que docker compose y el API Gateway esten activos.',
          detail: error instanceof Error ? error.message : error,
        },
      });
    } finally {
      this.loading.set('');
    }
  }

  private roundWeight(value: number, max: number): number {
    return Number(((value / 100) * max).toFixed(2));
  }

  private clamp(value: string | number, min: number, max: number): number {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return min;
    }
    return Math.min(max, Math.max(min, Math.round(parsed)));
  }

  private humanizeKey(key: string): string {
    return key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private createUuid(prefix: string): string {
    const clean = prefix.padEnd(8, '0').slice(0, 8);
    return `${clean}-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`;
  }
}
