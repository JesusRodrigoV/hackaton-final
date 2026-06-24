import { Injectable, signal } from '@angular/core';
import type { MetodoDesembolso, MetodoDesembolsoId, Desembolso, CampoFormulario } from '../models/desembolso';

@Injectable({ providedIn: 'root' })
export class DesembolsoService {
  readonly #metodos = signal<MetodoDesembolso[]>([]);
  readonly metodos = this.#metodos.asReadonly();

  readonly #desembolsos = signal<Desembolso[]>([]);
  readonly desembolsos = this.#desembolsos.asReadonly();

  constructor() {
    const billeteraCampos: CampoFormulario[] = [
      { key: 'proveedor', label: 'Proveedor', placeholder: 'Seleccione su billetera', tipo: 'select', opciones: ['Yape', 'Plin', 'Tigo Money', 'Simple', 'BIM'] },
      { key: 'numero', label: 'Número de cuenta', placeholder: 'Ej: 59170000000', tipo: 'text' },
    ];
    const transferenciaCampos: CampoFormulario[] = [
      { key: 'banco', label: 'Banco', placeholder: 'Seleccione su banco', tipo: 'select', opciones: ['Banco Nacional', 'Banco Continental', 'Banco del Sur', 'Banco Regional'] },
      { key: 'cuenta', label: 'Número de cuenta', placeholder: 'Ej: 1234567890', tipo: 'text' },
      { key: 'titular', label: 'Titular de la cuenta', placeholder: 'Nombre completo', tipo: 'text' },
    ];
    const efectivoCampos: CampoFormulario[] = [
      { key: 'corresponsal', label: 'Red de corresponsales', placeholder: 'Seleccione una red', tipo: 'select', opciones: ['Western Union', 'MoneyGram', 'Red Envios', 'PagoExpress'] },
      { key: 'codigo', label: 'Código de sucursal', placeholder: 'Ej: SUC-001', tipo: 'text' },
    ];

    this.#metodos.set([
      {
        id: 'billetera_digital',
        nombre: 'Billetera digital',
        icono: 'pi pi-mobile',
        descripcion: 'Reciba el dinero al instante en su billetera digital',
        tiempoEstimado: 'Instantáneo',
        campos: billeteraCampos,
      },
      {
        id: 'transferencia_bancaria',
        nombre: 'Transferencia bancaria',
        icono: 'pi pi-building-columns',
        descripcion: 'Transferencia a su cuenta bancaria en 24 horas hábiles',
        tiempoEstimado: '24 horas',
        campos: transferenciaCampos,
      },
      {
        id: 'efectivo_corresponsal',
        nombre: 'Retiro en efectivo',
        icono: 'pi pi-dollar',
        descripcion: 'Retire el efectivo en un corresponsal autorizado',
        tiempoEstimado: '2 horas',
        campos: efectivoCampos,
      },
    ]);
  }

  getMetodoById(id: MetodoDesembolsoId): MetodoDesembolso | undefined {
    return this.#metodos().find(m => m.id === id);
  }

  procesarDesembolso(solicitudId: string, metodo: MetodoDesembolsoId, detalle: Record<string, string>): Desembolso {
    const desembolso: Desembolso = {
      solicitudId,
      metodo,
      detalle,
      estado: 'procesando',
      fechaCreacion: new Date(),
    };
    this.#desembolsos.update(list => [...list, desembolso]);

    setTimeout(() => {
      this.#desembolsos.update(list =>
        list.map(d =>
          d.solicitudId === solicitudId ? { ...d, estado: 'completado' as const, fechaCompletado: new Date() } : d,
        ),
      );
    }, 3000);

    return desembolso;
  }

  getDesembolsoBySolicitud(solicitudId: string): Desembolso | undefined {
    return this.#desembolsos().find(d => d.solicitudId === solicitudId);
  }
}
