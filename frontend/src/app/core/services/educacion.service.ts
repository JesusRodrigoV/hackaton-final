import { Injectable, signal } from '@angular/core';
import type { Curso, Leccion, ProgresoUsuario, Logro } from '../models/educacion';

@Injectable({ providedIn: 'root' })
export class EducacionService {
  readonly #cursos = signal<Curso[]>(this.#generarCursos());
  readonly cursos = this.#cursos.asReadonly();

  readonly #progreso = signal<ProgresoUsuario[]>([]);
  readonly progreso = this.#progreso.asReadonly();

  readonly #logros = signal<Logro[]>(this.#generarLogros());
  readonly logros = this.#logros.asReadonly();

  #generarCursos(): Curso[] {
    return [
      {
        id: 'CUR-001',
        titulo: 'Finanzas Personales para Emprendedores',
        descripcion: 'Aprenda a gestionar sus ingresos, gastos y ahorros para hacer crecer su negocio.',
        nivel: 'basico',
        duracionHoras: 4,
        icono: 'wallet',
        bonificacionTasa: 1,
        lecciones: [
          { id: 'LEC-001', titulo: 'Presupuesto personal', contenido: 'Aprenda a crear y mantener un presupuesto mensual que se ajuste a sus ingresos.' },
          { id: 'LEC-002', titulo: 'Ahorro inteligente', contenido: 'Estrategias para ahorrar de forma consistente sin sacrificar su calidad de vida.' },
          { id: 'LEC-003', titulo: 'Manejo de deudas', contenido: 'Cómo priorizar y gestionar sus deudas de manera efectiva.' },
        ],
      },
      {
        id: 'CUR-002',
        titulo: 'Credit Scoring Explicado',
        descripcion: 'Entienda cómo funciona su puntaje crediticio y qué acciones mejoran su perfil.',
        nivel: 'basico',
        duracionHoras: 2,
        icono: 'line-chart',
        bonificacionTasa: 1.5,
        lecciones: [
          { id: 'LEC-004', titulo: '¿Qué es el score crediticio?', contenido: 'Descubra cómo se calcula su puntaje y por qué es importante.' },
          { id: 'LEC-005', titulo: 'Factores que afectan su puntaje', contenido: 'Conozca qué hábitos financieros mejoran o empeoran su calificación.' },
        ],
      },
      {
        id: 'CUR-003',
        titulo: 'Expansión de Negocios con Crédito',
        descripcion: 'Estrategias para usar el crédito como herramienta de crecimiento empresarial.',
        nivel: 'intermedio',
        duracionHoras: 6,
        icono: 'briefcase',
        bonificacionTasa: 2,
        lecciones: [
          { id: 'LEC-006', titulo: 'Tipos de crédito empresarial', contenido: 'Explore las distintas opciones de financiamiento para su negocio.' },
          { id: 'LEC-007', titulo: 'Plan de inversión', contenido: 'Cómo elaborar un plan sólido para invertir su crédito.' },
          { id: 'LEC-008', titulo: 'Gestión de flujo de caja', contenido: 'Mantené un flujo de caja saludable mientras pagás su crédito.' },
          { id: 'LEC-009', titulo: 'Escalando con deuda inteligente', contenido: 'Usá el apalancamiento financiero de forma responsable.' },
        ],
      },
      {
        id: 'CUR-004',
        titulo: 'Protección contra Fraude Financiero',
        descripcion: 'Identificá estafas y protegé sus datos financieros en el mundo digital.',
        nivel: 'intermedio',
        duracionHoras: 3,
        icono: 'shield',
        bonificacionTasa: 2.5,
        lecciones: [
          { id: 'LEC-010', titulo: 'Estafas comunes', contenido: 'Conozca las tácticas más usadas por defraudadores.' },
          { id: 'LEC-011', titulo: 'Protección de datos', contenido: 'Buenas prácticas para mantener su información segura.' },
          { id: 'LEC-012', titulo: '¿Qué hacer si fue víctima?', contenido: 'Pasos a seguir si sospecha que fue defraudado.' },
        ],
      },
    ];
  }

  #generarLogros(): Logro[] {
    return [
      { id: 'LOG-001', nombre: 'Primer paso', descripcion: 'Completaste tu primer curso', icono: 'star', desbloqueado: false },
      { id: 'LOG-002', nombre: 'Estudiante constante', descripcion: 'Completaste 3 cursos', icono: 'book', desbloqueado: false },
      { id: 'LOG-003', nombre: 'Master financiero', descripcion: 'Completaste todos los cursos', icono: 'trophy', desbloqueado: false },
      { id: 'LOG-004', nombre: 'Score boost', descripcion: 'Mejoraste su conocimiento en scoring', icono: 'trending-up', desbloqueado: false },
    ];
  }

  getCursoById(id: string): Curso | undefined {
    return this.#cursos().find(c => c.id === id);
  }

  completarLeccion(cursoId: string, leccionId: string): void {
    this.#cursos.update(list =>
      list.map(c =>
        c.id === cursoId
          ? { ...c, lecciones: c.lecciones.map(l => l.id === leccionId ? { ...l, completada: true } : l) }
          : c,
      ),
    );

    const curso = this.#cursos().find(c => c.id === cursoId);
    if (!curso) return;

    const completadas = curso.lecciones.filter(l => l.completada).length;
    const existing = this.#progreso().find(p => p.cursoId === cursoId);
    if (existing) {
      this.#progreso.update(list =>
        list.map(p =>
          p.cursoId === cursoId
            ? { ...p, leccionesCompletadas: completadas, completado: completadas === curso.lecciones.length }
            : p,
        ),
      );
    } else {
      this.#progreso.update(list => [
        ...list,
        { cursoId, leccionesCompletadas: completadas, totalLecciones: curso.lecciones.length, completado: completadas === curso.lecciones.length },
      ]);
    }

    const todosCompletados = this.#cursos().every(c => c.lecciones.every(l => l.completada));
    if (todosCompletados) {
      this.#logros.update(list =>
        list.map(l => l.id === 'LOG-003' ? { ...l, desbloqueado: true, fechaDesbloqueo: new Date() } : l),
      );
    }
  }

  getBonificacionTotal(): number {
    const cursosCompletados = this.#progreso().filter(p => p.completado).length;
    return this.#cursos()
      .filter(c => this.#progreso().some(p => p.cursoId === c.id && p.completado))
      .reduce((sum, c) => sum + c.bonificacionTasa, 0);
  }
}
