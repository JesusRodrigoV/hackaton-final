import { Injectable, signal } from '@angular/core';
import type { AnalisisFraude, AlertaFraude, BiometriaResultado } from '../models/fraude';

@Injectable({ providedIn: 'root' })
export class FraudeService {
  readonly #ultimoAnalisis = signal<AnalisisFraude | null>(null);
  readonly ultimoAnalisis = this.#ultimoAnalisis.asReadonly();

  analizarDocumento(solicitudId: string, documentoBase64: string): AnalisisFraude {
    const coincidencia = Math.random();
    const tieneAlertas = coincidencia < 0.7;

    const alertas: AlertaFraude[] = [];
    if (tieneAlertas) {
      alertas.push({
        tipo: 'documento_valido',
        descripcion: 'Documento de identidad válido sin coincidencias en base de datos de identidades robadas.',
        severidad: 'baja',
      });
    }
    if (coincidencia < 0.3) {
      alertas.push({
        tipo: 'patron_sospechoso',
        descripcion: 'Patrón de solicitud similar a casos de fraude conocido (múltiples solicitudes desde misma IP).',
        severidad: 'media',
      });
    }

    const nivelRiesgo = coincidencia < 0.2 ? 'critico' : coincidencia < 0.4 ? 'alto' : coincidencia < 0.7 ? 'medio' : 'bajo';

    const biometria: BiometriaResultado = {
      coincidencia: Math.round(coincidencia * 100),
      estado: coincidencia >= 0.7 ? 'verificado' : coincidencia >= 0.3 ? 'pendiente' : 'no_verificado',
    };

    const analisis: AnalisisFraude = {
      solicitudId,
      nivelRiesgo,
      puntajeFraude: Math.round((1 - coincidencia) * 100),
      alertas,
      documentoVerificado: coincidencia >= 0.7,
      biometria,
    };

    return analisis;
  }
}
