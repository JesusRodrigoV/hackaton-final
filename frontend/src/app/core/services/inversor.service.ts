import { Injectable, inject, computed } from '@angular/core';
import { InversorStore } from '../stores/inversor.store';
import type { CarteraResumen } from '../models/inversor';

@Injectable({ providedIn: 'root' })
export class InversorService {
  readonly #store = inject(InversorStore);

  readonly resumen = computed(() => {
    const r = this.#store.resumen();
    if (r) return r;
    return {
      totalPrestamos: 0, valorTotal: 0, tir: 0, morosidadGeneral: 0,
      flujoCajaProyectado: [] as CarteraResumen['flujoCajaProyectado'],
      morosidadPorSegmento: [] as CarteraResumen['morosidadPorSegmento'],
      exposicionRiesgo: { bajo: 0, medio: 0, alto: 0, muyAlto: 0 },
    };
  });
}
