export interface AnalisisFraude {
  solicitudId: string;
  nivelRiesgo: NivelRiesgoFraude;
  puntajeFraude: number;
  alertas: AlertaFraude[];
  documentoVerificado: boolean;
  biometria: BiometriaResultado;
}

export type NivelRiesgoFraude = 'bajo' | 'medio' | 'alto' | 'critico';

export interface AlertaFraude {
  tipo: string;
  descripcion: string;
  severidad: 'baja' | 'media' | 'alta';
}

export interface BiometriaResultado {
  coincidencia: number;
  estado: 'verificado' | 'no_verificado' | 'pendiente';
}
