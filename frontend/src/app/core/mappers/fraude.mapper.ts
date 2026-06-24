import type { AnalisisFraude, AlertaFraude, NivelRiesgoFraude } from '../models/fraude';

export interface FraudeBackendResponse {
  estado_biometrico: string;
  riesgo_fraude: string;
}

export function mapFraudeResponse(raw: FraudeBackendResponse, solicitudId: string): AnalisisFraude {
  const verificado = raw.estado_biometrico === 'VERIFICADO';
  const riesgoBajo = raw.riesgo_fraude === 'BAJO';

  const alertas: AlertaFraude[] = [];

  if (verificado) {
    alertas.push({
      tipo: 'documento_valido',
      descripcion: 'Documento de identidad válido sin coincidencias en base de datos de identidades robadas.',
      severidad: 'baja',
    });
  } else {
    alertas.push({
      tipo: 'documento_invalido',
      descripcion: 'El documento presentó anomalías en la verificación biométrica.',
      severidad: 'alta',
    });
  }

  if (!riesgoBajo) {
    alertas.push({
      tipo: 'patron_sospechoso',
      descripcion: 'Patrón de solicitud similar a casos de fraude conocido.',
      severidad: 'media',
    });
  }

  const nivelRiesgo: NivelRiesgoFraude = riesgoBajo && verificado
    ? 'bajo'
    : !riesgoBajo && !verificado
      ? 'critico'
      : !riesgoBajo
        ? 'alto'
        : 'medio';

  return {
    solicitudId,
    nivelRiesgo,
    puntajeFraude: verificado && riesgoBajo ? 15 : verificado ? 40 : riesgoBajo ? 60 : 85,
    alertas,
    documentoVerificado: verificado,
    biometria: {
      coincidencia: verificado ? 95 : riesgoBajo ? 60 : 25,
      estado: verificado ? 'verificado' : riesgoBajo ? 'pendiente' : 'no_verificado',
    },
  };
}
