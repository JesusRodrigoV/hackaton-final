export interface Curso {
  id: string;
  titulo: string;
  descripcion: string;
  nivel: 'basico' | 'intermedio' | 'avanzado';
  lecciones: Leccion[];
  duracionHoras: number;
  icono: string;
  bonificacionTasa: number;
}

export interface Leccion {
  id: string;
  titulo: string;
  contenido: string;
  completada?: boolean;
}

export interface ProgresoUsuario {
  cursoId: string;
  leccionesCompletadas: number;
  totalLecciones: number;
  completado: boolean;
}

export interface Logro {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  desbloqueado: boolean;
  fechaDesbloqueo?: Date;
}
