export interface CarteraResumen {
  totalPrestamos: number;
  valorTotal: number;
  tir: number;
  morosidadGeneral: number;
  flujoCajaProyectado: FlujoCajaMes[];
  morosidadPorSegmento: SegmentoMorosidad[];
  exposicionRiesgo: ExposicionRiesgo;
}

export interface FlujoCajaMes {
  mes: string;
  ingresos: number;
  egresos: number;
  saldo: number;
}

export interface SegmentoMorosidad {
  segmento: string;
  morosidad: number;
  totalPrestamos: number;
}

export interface ExposicionRiesgo {
  bajo: number;
  medio: number;
  alto: number;
  muyAlto: number;
}
