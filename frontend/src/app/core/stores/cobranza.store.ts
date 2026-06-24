import { signalStore, withState, withMethods, patchState, withHooks } from '@ngrx/signals';
import { inject } from '@angular/core';
import { DesembolsoStore } from './desembolso.store';
import type { Prestamo, Pago, AcuerdoPago, PrestamoEstado } from '../models/cobranza';

interface CobranzaState {
  prestamos: Prestamo[];
  pagos: Pago[];
  acuerdos: AcuerdoPago[];
}

const hoy = new Date();
const makeDate = (daysOffset: number): Date => {
  const d = new Date(hoy);
  d.setDate(d.getDate() + daysOffset);
  return d;
};

const METODO_MAP: Record<string, string> = {
  billetera_digital: 'Billetera digital',
  transferencia_bancaria: 'Transferencia bancaria',
  efectivo_corresponsal: 'Efectivo corresponsal',
};

export const CobranzaStore = signalStore(
  { providedIn: 'root' },
  withState<CobranzaState>({
    prestamos: [
      {
        id: 'PRST-001', solicitudId: 'SOL-003', usuarioNombre: 'María García',
        usuarioDocumento: '12345678', montoOriginal: 500, saldoPendiente: 350,
        tasaInteres: 12, plazoMeses: 3, cuotaMensual: 170, cuotasPagadas: 1,
        totalCuotas: 3, estado: 'al_dia', diasAtraso: 0,
        fechaProximoPago: makeDate(15), fechaInicio: makeDate(-45),
        desembolsoMetodo: 'Billetera digital',
      },
      {
        id: 'PRST-002', solicitudId: 'SOL-001', usuarioNombre: 'Carlos Mendoza',
        usuarioDocumento: '87654321', montoOriginal: 350, saldoPendiente: 350,
        tasaInteres: 18, plazoMeses: 6, cuotaMensual: 62, cuotasPagadas: 0,
        totalCuotas: 6, estado: 'atrasado', diasAtraso: 8,
        fechaProximoPago: makeDate(-8), fechaInicio: makeDate(-30),
        desembolsoMetodo: 'Transferencia bancaria',
      },
      {
        id: 'PRST-003', solicitudId: 'SOL-002', usuarioNombre: 'Ana Quispe',
        usuarioDocumento: '56781234', montoOriginal: 1200, saldoPendiente: 950,
        tasaInteres: 15, plazoMeses: 12, cuotaMensual: 110, cuotasPagadas: 3,
        totalCuotas: 12, estado: 'mora', diasAtraso: 35,
        fechaProximoPago: makeDate(-35), fechaInicio: makeDate(-120),
        desembolsoMetodo: 'Efectivo corresponsal',
      },
    ],
    pagos: [
      { id: 'PAG-001', prestamoId: 'PRST-001', monto: 170, fecha: makeDate(-30), metodo: 'Billetera digital', estado: 'completado', cuotaNumero: 1 },
      { id: 'PAG-002', prestamoId: 'PRST-003', monto: 110, fecha: makeDate(-90), metodo: 'Efectivo', estado: 'completado', cuotaNumero: 1 },
      { id: 'PAG-003', prestamoId: 'PRST-003', monto: 110, fecha: makeDate(-60), metodo: 'Efectivo', estado: 'completado', cuotaNumero: 2 },
      { id: 'PAG-004', prestamoId: 'PRST-003', monto: 110, fecha: makeDate(-30), metodo: 'Efectivo', estado: 'completado', cuotaNumero: 3 },
    ],
    acuerdos: [
      {
        id: 'ACR-001', prestamoId: 'PRST-002', montoNuevo: 400, plazoNuevoMeses: 8,
        nuevaCuota: 55, fecha: makeDate(-45), estado: 'activo',
        motivo: 'Dificultades económicas temporales - se reestructuró de 6 a 8 meses',
      },
    ],
  }),
  withMethods((store) => ({
    syncFromDesembolsos(desembolsoStore: ReturnType<typeof DesembolsoStore>): void {
      for (const d of desembolsoStore.desembolsos()) {
        const existente = store.prestamos().find(p => p.solicitudId === d.solicitudId);
        if (existente || !d.fechaCompletado) continue;

        const monto = 500;
        const totalCuotas = monto <= 500 ? 3 : monto <= 1000 ? 6 : 12;
        const tasaInteres = monto <= 500 ? 12 : 15;
        const cuotaMensual = Math.round((monto + monto * (tasaInteres / 100) * (totalCuotas / 12)) / totalCuotas);
        const id = `PRST-${String(store.prestamos().length + 1).padStart(3, '0')}`;

        const prestamo: Prestamo = {
          id, solicitudId: d.solicitudId, usuarioNombre: '-', usuarioDocumento: '-',
          montoOriginal: monto, saldoPendiente: monto,
          tasaInteres, plazoMeses: totalCuotas, cuotaMensual,
          cuotasPagadas: 0, totalCuotas, estado: 'al_dia', diasAtraso: 0,
          fechaProximoPago: new Date(d.fechaCreacion.getTime() + 30 * 24 * 60 * 60 * 1000),
          fechaInicio: d.fechaCreacion,
          desembolsoMetodo: METODO_MAP[d.metodo] ?? d.metodo,
        };

        patchState(store, { prestamos: [...store.prestamos(), prestamo] });
      }
    },
    getPrestamoById(id: string): Prestamo | undefined {
      return store.prestamos().find(p => p.id === id);
    },
    getPagosByPrestamo(prestamoId: string): Pago[] {
      return store.pagos().filter(p => p.prestamoId === prestamoId);
    },
    getAcuerdosByPrestamo(prestamoId: string): AcuerdoPago[] {
      return store.acuerdos().filter(a => a.prestamoId === prestamoId);
    },
    getPrestamosByEstado(estado: PrestamoEstado): Prestamo[] {
      return store.prestamos().filter(p => p.estado === estado);
    },
    crearAcuerdo(prestamoId: string, montoNuevo: number, plazoNuevoMeses: number, motivo: string): AcuerdoPago {
      const acuerdo: AcuerdoPago = {
        id: `ACR-${String(store.acuerdos().length + 1).padStart(3, '0')}`,
        prestamoId, montoNuevo, plazoNuevoMeses,
        nuevaCuota: Math.round(montoNuevo / plazoNuevoMeses),
        fecha: new Date(), estado: 'activo', motivo,
      };
      patchState(store, {
        acuerdos: [...store.acuerdos(), acuerdo],
        prestamos: store.prestamos().map(p =>
          p.id === prestamoId
            ? { ...p, estado: 'reestructurado', saldoPendiente: montoNuevo, plazoMeses: plazoNuevoMeses, cuotaMensual: acuerdo.nuevaCuota, diasAtraso: 0 }
            : p,
        ),
      });
      return acuerdo;
    },
  })),
  withHooks((store, desembolsoStore = inject(DesembolsoStore)) => ({
    onInit() {
      store.syncFromDesembolsos(desembolsoStore);
    },
  })),
);
