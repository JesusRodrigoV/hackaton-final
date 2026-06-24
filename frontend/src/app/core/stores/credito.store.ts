import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environment/environment';
import type { SolicitudCredito } from '../models/solicitud';
import type { CreditoBackendResponse } from '../mappers/credito.mapper';
import { mapCreditoResponse } from '../mappers/credito.mapper';

interface CreditoState {
  solicitudes: SolicitudCredito[];
  loading: boolean;
  error: string | null;
}

const SEED_SOLICITUDES: SolicitudCredito[] = [
  { id: 'SOL-001', usuarioId: 'USR-001', monto: 350, plazoMeses: 6, motivo: 'Compra de materiales para emprendimiento', documentoUrl: '', estado: 'pendiente', fechaCreacion: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  { id: 'SOL-002', usuarioId: 'USR-002', monto: 1200, plazoMeses: 12, motivo: 'Capital de trabajo para negocio de ropa', documentoUrl: '', estado: 'pendiente', fechaCreacion: new Date(Date.now() - 4 * 60 * 60 * 1000) },
  { id: 'SOL-003', usuarioId: 'USR-003', monto: 500, plazoMeses: 3, motivo: 'Refacción de vivienda', documentoUrl: '', estado: 'pendiente', scoreAsignado: 620, fechaCreacion: new Date(Date.now() - 6 * 60 * 60 * 1000) },
  { id: 'SOL-004', usuarioId: 'USR-004', monto: 200, plazoMeses: 2, motivo: 'Compra de útiles escolares', documentoUrl: '', estado: 'aprobado_auto', scoreAsignado: 720, fechaCreacion: new Date(Date.now() - 24 * 60 * 60 * 1000), fechaResolucion: new Date(Date.now() - 24 * 60 * 60 * 1000 + 60000) },
  { id: 'SOL-005', usuarioId: 'USR-005', monto: 800, plazoMeses: 6, motivo: 'Compra de herramientas', documentoUrl: '', estado: 'rechazado', scoreAsignado: 280, fechaCreacion: new Date(Date.now() - 48 * 60 * 60 * 1000), fechaResolucion: new Date(Date.now() - 48 * 60 * 60 * 1000 + 120000), rechazoMotivo: 'Score insuficiente: 280 pts, por debajo del umbral mínimo de 300' },
  { id: 'SOL-006', usuarioId: 'USR-006', monto: 1500, plazoMeses: 18, motivo: 'Ampliación de local comercial', documentoUrl: '', estado: 'requiere_revision', scoreAsignado: 520, fechaCreacion: new Date(Date.now() - 1 * 60 * 60 * 1000) },
];

export const CreditoStore = signalStore(
  { providedIn: 'root' },
  withState<CreditoState>({
    solicitudes: SEED_SOLICITUDES,
    loading: false,
    error: null,
  }),
  withMethods((store, http = inject(HttpClient)) => ({
    async crearSolicitud(
      usuarioId: string,
      monto: number,
      plazoMeses: number,
      motivo: string,
      documentoBase64: string,
    ): Promise<SolicitudCredito> {
      patchState(store, { loading: true, error: null });
      try {
        const res = await firstValueFrom(
          http.post<CreditoBackendResponse>(
            `${environment.apiUrl}/api/creditos/solicitar`,
            { usuario_id: usuarioId, monto_solicitado: monto, plazo_meses: plazoMeses },
          ),
        );
        const solicitud: SolicitudCredito = { ...mapCreditoResponse(res), motivo, documentoUrl: documentoBase64 || '' };
        patchState(store, { solicitudes: [...store.solicitudes(), solicitud], loading: false });
        return solicitud;
      } catch (err: any) {
        patchState(store, { loading: false, error: err.message ?? 'Error al crear solicitud' });
        throw err;
      }
    },

    async loadById(id: string): Promise<SolicitudCredito | undefined> {
      patchState(store, { loading: true, error: null });
      try {
        const res = await firstValueFrom(
          http.get<CreditoBackendResponse>(`${environment.apiUrl}/api/creditos/${id}`),
        );
        const solicitud = mapCreditoResponse(res);
        patchState(store, {
          solicitudes: [...store.solicitudes().filter(s => s.id !== id), solicitud],
          loading: false,
        });
        return solicitud;
      } catch (err: any) {
        patchState(store, { loading: false, error: err.message ?? 'Error al cargar solicitud' });
        return undefined;
      }
    },

    async loadByUser(usuarioId: string): Promise<void> {
      patchState(store, { loading: true, error: null });
      try {
        const res = await firstValueFrom(
          http.get<CreditoBackendResponse[]>(`${environment.apiUrl}/api/creditos/usuario/${usuarioId}`),
        );
        patchState(store, { solicitudes: res.map(mapCreditoResponse), loading: false });
      } catch (err: any) {
        patchState(store, { loading: false, error: err.message ?? 'Error al cargar solicitudes' });
      }
    },

    aprobarSolicitud(id: string, analistaId: string): void {
      patchState(store, {
        solicitudes: store.solicitudes().map(s =>
          s.id === id
            ? { ...s, estado: 'aprobado_manual', analistaId, fechaResolucion: new Date() }
            : s,
        ),
      });
    },

    rechazarSolicitud(id: string, analistaId: string, motivo: string): void {
      patchState(store, {
        solicitudes: store.solicitudes().map(s =>
          s.id === id
            ? { ...s, estado: 'rechazado', analistaId, rechazoMotivo: motivo, fechaResolucion: new Date() }
            : s,
        ),
      });
    },
  })),
);
