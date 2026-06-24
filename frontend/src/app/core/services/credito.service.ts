import { Injectable, signal } from '@angular/core';
import type { SolicitudCredito, CrearSolicitudDto, SolicitudEstado } from '../models/solicitud';

@Injectable({ providedIn: 'root' })
export class CreditoService {
  readonly #solicitudes = signal<SolicitudCredito[]>([]);
  readonly solicitudes = this.#solicitudes.asReadonly();

  private readonly mockSolicitudes: SolicitudCredito[] = [
    {
      id: 'SOL-001',
      usuarioId: 'USR-001',
      monto: 350,
      plazoMeses: 6,
      motivo: 'Compra de materiales para negocio',
      documentoUrl: '/mock/doc1.pdf',
      estado: 'pendiente',
      fechaCreacion: new Date('2026-06-23T10:30:00'),
    },
    {
      id: 'SOL-002',
      usuarioId: 'USR-002',
      monto: 1200,
      plazoMeses: 12,
      motivo: 'Expansión de inventario',
      documentoUrl: '/mock/doc2.pdf',
      estado: 'pendiente',
      fechaCreacion: new Date('2026-06-23T11:00:00'),
    },
    {
      id: 'SOL-003',
      usuarioId: 'USR-003',
      monto: 500,
      plazoMeses: 3,
      motivo: 'Pago de servicios educativos',
      documentoUrl: '/mock/doc3.pdf',
      estado: 'aprobado_auto',
      scoreAsignado: 720,
      fechaCreacion: new Date('2026-06-23T09:15:00'),
      fechaResolucion: new Date('2026-06-23T09:16:30'),
    },
    {
      id: 'SOL-004',
      usuarioId: 'USR-004',
      monto: 200,
      plazoMeses: 2,
      motivo: 'Compra de insumos médicos',
      documentoUrl: '/mock/doc4.pdf',
      estado: 'rechazado',
      scoreAsignado: 280,
      fechaCreacion: new Date('2026-06-23T08:00:00'),
      fechaResolucion: new Date('2026-06-23T08:01:00'),
      rechazoMotivo: 'Score por debajo del umbral mínimo (300)',
    },
  ];

  constructor() {
    this.#solicitudes.set(this.mockSolicitudes);
  }

  getSolicitudById(id: string): SolicitudCredito | undefined {
    return this.#solicitudes().find(s => s.id === id);
  }

  getSolicitudesByEstado(estado: SolicitudEstado): SolicitudCredito[] {
    return this.#solicitudes().filter(s => s.estado === estado);
  }

  crearSolicitud(dto: CrearSolicitudDto): SolicitudCredito {
    const nueva: SolicitudCredito = {
      id: `SOL-${String(this.#solicitudes().length + 1).padStart(3, '0')}`,
      usuarioId: 'USR-NEW',
      monto: dto.monto,
      plazoMeses: dto.plazoMeses,
      motivo: dto.motivo,
      documentoUrl: '/mock/nuevo-doc.pdf',
      estado: 'pendiente',
      fechaCreacion: new Date(),
    };
    this.#solicitudes.update(list => [nueva, ...list]);
    return nueva;
  }

  aprobarSolicitud(id: string, analistaId: string): void {
    this.#solicitudes.update(list =>
      list.map(s =>
        s.id === id
          ? { ...s, estado: 'aprobado_manual', analistaId, fechaResolucion: new Date() }
          : s,
      ),
    );
  }

  rechazarSolicitud(id: string, analistaId: string, motivo: string): void {
    this.#solicitudes.update(list =>
      list.map(s =>
        s.id === id
          ? { ...s, estado: 'rechazado', analistaId, rechazoMotivo: motivo, fechaResolucion: new Date() }
          : s,
      ),
    );
  }
}
