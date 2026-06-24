import { Injectable, signal } from '@angular/core';
import type { Prestamo, PrestamoEstado, Pago, AcuerdoPago } from '../models/cobranza';

@Injectable({ providedIn: 'root' })
export class CobranzaService {
  readonly #prestamos = signal<Prestamo[]>([]);
  readonly prestamos = this.#prestamos.asReadonly();

  readonly #pagos = signal<Pago[]>([]);
  readonly pagos = this.#pagos.asReadonly();

  readonly #acuerdos = signal<AcuerdoPago[]>([]);
  readonly acuerdos = this.#acuerdos.asReadonly();

  constructor() {
    const hoy = new Date();
    const makeDate = (daysOffset: number) => {
      const d = new Date(hoy);
      d.setDate(d.getDate() + daysOffset);
      return d;
    };

    this.#prestamos.set([
      {
        id: 'PRST-001',
        solicitudId: 'SOL-003',
        usuarioNombre: 'María García',
        usuarioDocumento: '12345678',
        montoOriginal: 500,
        saldoPendiente: 350,
        tasaInteres: 12,
        plazoMeses: 3,
        cuotaMensual: 170,
        cuotasPagadas: 1,
        totalCuotas: 3,
        estado: 'al_dia',
        diasAtraso: 0,
        fechaProximoPago: makeDate(15),
        fechaInicio: makeDate(-45),
        desembolsoMetodo: 'Billetera digital',
      },
      {
        id: 'PRST-002',
        solicitudId: 'SOL-001',
        usuarioNombre: 'Carlos Mendoza',
        usuarioDocumento: '87654321',
        montoOriginal: 350,
        saldoPendiente: 350,
        tasaInteres: 18,
        plazoMeses: 6,
        cuotaMensual: 62,
        cuotasPagadas: 0,
        totalCuotas: 6,
        estado: 'atrasado',
        diasAtraso: 8,
        fechaProximoPago: makeDate(-8),
        fechaInicio: makeDate(-30),
        desembolsoMetodo: 'Transferencia bancaria',
      },
      {
        id: 'PRST-003',
        solicitudId: 'SOL-002',
        usuarioNombre: 'Ana Quispe',
        usuarioDocumento: '56781234',
        montoOriginal: 1200,
        saldoPendiente: 950,
        tasaInteres: 15,
        plazoMeses: 12,
        cuotaMensual: 110,
        cuotasPagadas: 3,
        totalCuotas: 12,
        estado: 'mora',
        diasAtraso: 35,
        fechaProximoPago: makeDate(-35),
        fechaInicio: makeDate(-120),
        desembolsoMetodo: 'Efectivo corresponsal',
      },
      {
        id: 'PRST-004',
        solicitudId: 'SOL-NEW-01',
        usuarioNombre: 'Pedro Rojas',
        usuarioDocumento: '34567890',
        montoOriginal: 800,
        saldoPendiente: 600,
        tasaInteres: 12,
        plazoMeses: 6,
        cuotaMensual: 138,
        cuotasPagadas: 2,
        totalCuotas: 6,
        estado: 'reestructurado',
        diasAtraso: 0,
        fechaProximoPago: makeDate(10),
        fechaInicio: makeDate(-90),
        desembolsoMetodo: 'Billetera digital',
      },
      {
        id: 'PRST-005',
        solicitudId: 'SOL-005',
        usuarioNombre: 'Lucía Flores',
        usuarioDocumento: '90123456',
        montoOriginal: 250,
        saldoPendiente: 0,
        tasaInteres: 0,
        plazoMeses: 2,
        cuotaMensual: 125,
        cuotasPagadas: 2,
        totalCuotas: 2,
        estado: 'pagado',
        diasAtraso: 0,
        fechaProximoPago: makeDate(-15),
        fechaInicio: makeDate(-75),
        desembolsoMetodo: 'Transferencia bancaria',
      },
    ]);

    this.#pagos.set([
      { id: 'PAG-001', prestamoId: 'PRST-001', monto: 170, fecha: makeDate(-30), metodo: 'Billetera digital', estado: 'completado', cuotaNumero: 1 },
      { id: 'PAG-002', prestamoId: 'PRST-003', monto: 110, fecha: makeDate(-90), metodo: 'Efectivo', estado: 'completado', cuotaNumero: 1 },
      { id: 'PAG-003', prestamoId: 'PRST-003', monto: 110, fecha: makeDate(-60), metodo: 'Efectivo', estado: 'completado', cuotaNumero: 2 },
      { id: 'PAG-004', prestamoId: 'PRST-003', monto: 110, fecha: makeDate(-30), metodo: 'Efectivo', estado: 'completado', cuotaNumero: 3 },
      { id: 'PAG-005', prestamoId: 'PRST-004', monto: 100, fecha: makeDate(-60), metodo: 'Billetera digital', estado: 'completado', cuotaNumero: 1 },
      { id: 'PAG-006', prestamoId: 'PRST-004', monto: 100, fecha: makeDate(-30), metodo: 'Billetera digital', estado: 'completado', cuotaNumero: 2 },
      { id: 'PAG-007', prestamoId: 'PRST-005', monto: 125, fecha: makeDate(-60), metodo: 'Transferencia', estado: 'completado', cuotaNumero: 1 },
      { id: 'PAG-008', prestamoId: 'PRST-005', monto: 125, fecha: makeDate(-30), metodo: 'Transferencia', estado: 'completado', cuotaNumero: 2 },
    ]);

    this.#acuerdos.set([
      {
        id: 'ACR-001',
        prestamoId: 'PRST-004',
        montoNuevo: 700,
        plazoNuevoMeses: 8,
        nuevaCuota: 95,
        fecha: makeDate(-45),
        estado: 'activo',
        motivo: 'Dificultades económicas temporales - se reestructuró de 6 a 8 meses',
      },
    ]);
  }

  getPrestamoById(id: string): Prestamo | undefined {
    return this.#prestamos().find(p => p.id === id);
  }

  getPagosByPrestamo(prestamoId: string): Pago[] {
    return this.#pagos().filter(p => p.prestamoId === prestamoId);
  }

  getAcuerdosByPrestamo(prestamoId: string): AcuerdoPago[] {
    return this.#acuerdos().filter(a => a.prestamoId === prestamoId);
  }

  getPrestamosByEstado(estado: PrestamoEstado): Prestamo[] {
    return this.#prestamos().filter(p => p.estado === estado);
  }

  crearAcuerdo(prestamoId: string, montoNuevo: number, plazoNuevoMeses: number, motivo: string): AcuerdoPago {
    const acuerdo: AcuerdoPago = {
      id: `ACR-${String(this.#acuerdos().length + 1).padStart(3, '0')}`,
      prestamoId,
      montoNuevo,
      plazoNuevoMeses,
      nuevaCuota: Math.round(montoNuevo / plazoNuevoMeses),
      fecha: new Date(),
      estado: 'activo',
      motivo,
    };
    this.#acuerdos.update(list => [...list, acuerdo]);
    this.#prestamos.update(list =>
      list.map(p =>
        p.id === prestamoId
          ? { ...p, estado: 'reestructurado', saldoPendiente: montoNuevo, plazoMeses: plazoNuevoMeses, cuotaMensual: acuerdo.nuevaCuota, diasAtraso: 0 }
          : p,
      ),
    );
    return acuerdo;
  }
}
