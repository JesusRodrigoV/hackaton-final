import { Injectable, inject, effect } from '@angular/core';
import { MessageService } from 'primeng/api';
import { DesembolsoStore } from '../stores/desembolso.store';
import { CobranzaStore } from '../stores/cobranza.store';
import { AuthStore } from '../stores/auth.store';
import { CreditoService } from './credito.service';
import type { MetodoDesembolso, MetodoDesembolsoId, Desembolso, CampoFormulario } from '../models/desembolso';

@Injectable({ providedIn: 'root' })
export class DesembolsoService {
  readonly #store = inject(DesembolsoStore);
  readonly #cobranza = inject(CobranzaStore);
  readonly #auth = inject(AuthStore);
  readonly #creditoService = inject(CreditoService);
  readonly #message = inject(MessageService);

  constructor() {
    effect(() => {
      const err = this.#store.error();
      if (err) this.#message.add({ severity: 'error', summary: 'Error de desembolso', detail: err, life: 5000 });
    });
  }

  readonly desembolsos = this.#store.desembolsos;

  readonly metodos: MetodoDesembolso[] = [
    {
      id: 'billetera_digital', nombre: 'Billetera digital', icono: 'pi pi-mobile',
      descripcion: 'Recibí el dinero al instante en tu billetera digital',
      tiempoEstimado: 'Instantáneo',
      campos: [
        { key: 'proveedor', label: 'Proveedor', placeholder: 'Seleccioná tu billetera', tipo: 'select', opciones: ['Yape', 'Plin', 'Tigo Money', 'Simple', 'BIM'] },
        { key: 'numero', label: 'Número de cuenta', placeholder: 'Ej: 59170000000', tipo: 'text' },
      ],
    },
    {
      id: 'transferencia_bancaria', nombre: 'Transferencia bancaria', icono: 'pi pi-building-columns',
      descripcion: 'Transferencia a tu cuenta bancaria en 24 horas hábiles',
      tiempoEstimado: '24 horas',
      campos: [
        { key: 'banco', label: 'Banco', placeholder: 'Seleccioná tu banco', tipo: 'select', opciones: ['Banco Nacional', 'Banco Continental', 'Banco del Sur', 'Banco Regional'] },
        { key: 'cuenta', label: 'Número de cuenta', placeholder: 'Ej: 1234567890', tipo: 'text' },
        { key: 'titular', label: 'Titular de la cuenta', placeholder: 'Nombre completo', tipo: 'text' },
      ],
    },
    {
      id: 'efectivo_corresponsal', nombre: 'Retiro en efectivo', icono: 'pi pi-dollar',
      descripcion: 'Retirá el efectivo en un corresponsal autorizado',
      tiempoEstimado: '2 horas',
      campos: [
        { key: 'corresponsal', label: 'Red de corresponsales', placeholder: 'Seleccioná una red', tipo: 'select', opciones: ['Western Union', 'MoneyGram', 'Red Envios', 'PagoExpress'] },
        { key: 'codigo', label: 'Código de sucursal', placeholder: 'Ej: SUC-001', tipo: 'text' },
      ],
    },
  ];

  getMetodoById(id: MetodoDesembolsoId): MetodoDesembolso | undefined {
    return this.metodos.find(m => m.id === id);
  }

  async procesarDesembolso(
    solicitudId: string,
    metodo: MetodoDesembolsoId,
    detalle: Record<string, string>,
  ): Promise<Desembolso> {
    const usuario = this.#auth.usuario();
    if (!usuario?.id) throw new Error('Usuario no autenticado');

    const solicitud = this.#creditoService.getSolicitudById(solicitudId);
    const monto = solicitud?.monto ?? 500;

    const resultado = await this.#store.ejecutar(solicitudId, usuario.id, monto, metodo, detalle);
    this.#cobranza.syncFromDesembolsos(this.#store);
    return resultado;
  }

  getDesembolsoBySolicitud(solicitudId: string): Desembolso | undefined {
    return this.#store.desembolsos().find(d => d.solicitudId === solicitudId);
  }
}
