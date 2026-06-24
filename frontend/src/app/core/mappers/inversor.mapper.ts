import type { CarteraResumen, FlujoCajaMes, SegmentoMorosidad } from '../models/inversor';

export interface MetricasBackendResponse {
  monto_total_desembolsado: number;
  tir_simulada_pct: number;
  tasa_morosidad_pct: number;
  flujo_caja_proyectado: number;
}

function generarFlujoCaja(montoTotal: number, morosidad: number): FlujoCajaMes[] {
  const hoy = new Date();
  const meses: FlujoCajaMes[] = [];
  const ingresoBase = montoTotal / 6;
  const egresoBase = ingresoBase * 0.7;

  for (let i = 0; i < 6; i++) {
    const mes = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
    const label = mes.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    const ingresos = Math.round(ingresoBase * (1 + Math.sin(i * 1.2) * 0.15));
    const egresos = Math.round(egresoBase * (1 + Math.cos(i * 0.8) * 0.1));
    meses.push({ mes: label, ingresos, egresos, saldo: ingresos - egresos });
  }
  return meses;
}

function generarSegmentos(morosidad: number): SegmentoMorosidad[] {
  return [
    { segmento: 'Billetera digital', morosidad: Math.max(0, morosidad * 0.55), totalPrestamos: Math.round(340 * (1 - morosidad / 100)) },
    { segmento: 'Transferencia bancaria', morosidad: Math.max(0, morosidad * 1.15), totalPrestamos: Math.round(210 * (1 + morosidad / 200)) },
    { segmento: 'Efectivo corresponsal', morosidad: Math.max(0, morosidad * 2.05), totalPrestamos: Math.round(95 * (1 + morosidad / 150)) },
  ];
}

export function mapMetricasResponse(raw: MetricasBackendResponse): CarteraResumen {
  const morosidad = raw.tasa_morosidad_pct;
  const total = raw.monto_total_desembolsado;
  const tirPorcentaje = total > 0 ? Math.round((raw.tir_simulada_pct / total) * 1000) / 10 : 15;

  return {
    totalPrestamos: Math.round(total / 1300),
    valorTotal: total,
    tir: Math.max(0, tirPorcentaje),
    morosidadGeneral: morosidad,
    flujoCajaProyectado: generarFlujoCaja(total, morosidad),
    morosidadPorSegmento: generarSegmentos(morosidad),
    exposicionRiesgo: {
      bajo: Math.round(total * 0.50),
      medio: Math.round(total * 0.34),
      alto: Math.round(total * 0.11),
      muyAlto: Math.round(total * 0.05),
    },
  };
}
