import { Injectable, signal } from '@angular/core';
import type { CarteraResumen, FlujoCajaMes, SegmentoMorosidad, ExposicionRiesgo } from '../models/inversor';

@Injectable({ providedIn: 'root' })
export class InversorService {
  readonly #resumen = signal<CarteraResumen>(this.#generarMock());
  readonly resumen = this.#resumen.asReadonly();

  #generarMock(): CarteraResumen {
    const hoy = new Date();
    const flujoCaja: FlujoCajaMes[] = Array.from({ length: 6 }, (_, i) => {
      const mes = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
      const label = mes.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      const ingresos = 45000 + Math.floor(Math.random() * 15000);
      const egresos = 32000 + Math.floor(Math.random() * 8000);
      return { mes: label, ingresos, egresos, saldo: ingresos - egresos };
    });

    const morosidadSegmento: SegmentoMorosidad[] = [
      { segmento: 'Billetera digital', morosidad: 2.1, totalPrestamos: 340 },
      { segmento: 'Transferencia bancaria', morosidad: 4.3, totalPrestamos: 210 },
      { segmento: 'Efectivo corresponsal', morosidad: 7.8, totalPrestamos: 95 },
    ];

    const exposicion: ExposicionRiesgo = {
      bajo: 420000,
      medio: 280000,
      alto: 95000,
      muyAlto: 35000,
    };

    return {
      totalPrestamos: 645,
      valorTotal: 830000,
      tir: 18.5,
      morosidadGeneral: 3.8,
      flujoCajaProyectado: flujoCaja,
      morosidadPorSegmento: morosidadSegmento,
      exposicionRiesgo: exposicion,
    };
  }
}
