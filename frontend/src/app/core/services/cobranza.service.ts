import { Injectable, inject } from '@angular/core';
import { CobranzaStore } from '../stores/cobranza.store';
import type { Prestamo, Pago, AcuerdoPago, PrestamoEstado } from '../models/cobranza';

@Injectable({ providedIn: 'root' })
export class CobranzaService {
  readonly #store = inject(CobranzaStore);

  readonly prestamos = this.#store.prestamos;
  readonly pagos = this.#store.pagos;
  readonly acuerdos = this.#store.acuerdos;

  getPrestamoById(id: string): Prestamo | undefined {
    return this.#store.getPrestamoById(id);
  }

  getPagosByPrestamo(prestamoId: string): Pago[] {
    return this.#store.getPagosByPrestamo(prestamoId);
  }

  getAcuerdosByPrestamo(prestamoId: string): AcuerdoPago[] {
    return this.#store.getAcuerdosByPrestamo(prestamoId);
  }

  getPrestamosByEstado(estado: PrestamoEstado): Prestamo[] {
    return this.#store.getPrestamosByEstado(estado);
  }

  crearAcuerdo(prestamoId: string, montoNuevo: number, plazoNuevoMeses: number, motivo: string): AcuerdoPago {
    return this.#store.crearAcuerdo(prestamoId, montoNuevo, plazoNuevoMeses, motivo);
  }
}
