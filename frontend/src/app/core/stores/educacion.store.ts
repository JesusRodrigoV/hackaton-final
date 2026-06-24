import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environment/environment';
import { AuthStore } from './auth.store';
import type { Curso, ProgresoUsuario, Logro } from '../models/educacion';

interface EducacionState {
  cursos: Curso[];
  progreso: ProgresoUsuario[];
  logros: Logro[];
  loading: boolean;
  error: string | null;
}

interface GamificacionResponse {
  usuario_id: number;
  score_gamificacion: number;
}

function generarCursos(): Curso[] {
  return [
    {
      id: 'CUR-001', titulo: 'Finanzas Personales para Emprendedores',
      descripcion: 'Aprenda a gestionar sus ingresos, gastos y ahorros para hacer crecer su negocio.',
      nivel: 'basico', duracionHoras: 4, icono: 'wallet', bonificacionTasa: 1,
      lecciones: [
        { id: 'LEC-001', titulo: 'Presupuesto personal', contenido: 'Aprenda a crear y mantener un presupuesto mensual que se ajuste a sus ingresos.' },
        { id: 'LEC-002', titulo: 'Ahorro inteligente', contenido: 'Estrategias para ahorrar de forma consistente sin sacrificar su calidad de vida.' },
        { id: 'LEC-003', titulo: 'Manejo de deudas', contenido: 'Cómo priorizar y gestionar sus deudas de manera efectiva.' },
      ],
    },
    {
      id: 'CUR-002', titulo: 'Credit Scoring Explicado',
      descripcion: 'Entienda cómo funciona su puntaje crediticio y qué acciones mejoran su perfil.',
      nivel: 'basico', duracionHoras: 2, icono: 'line-chart', bonificacionTasa: 1.5,
      lecciones: [
        { id: 'LEC-004', titulo: '¿Qué es el score crediticio?', contenido: 'Descubra cómo se calcula su puntaje y por qué es importante.' },
        { id: 'LEC-005', titulo: 'Factores que afectan su puntaje', contenido: 'Conozca qué hábitos financieros mejoran o empeoran su calificación.' },
      ],
    },
    {
      id: 'CUR-003', titulo: 'Expansión de Negocios con Crédito',
      descripcion: 'Estrategias para usar el crédito como herramienta de crecimiento empresarial.',
      nivel: 'intermedio', duracionHoras: 6, icono: 'briefcase', bonificacionTasa: 2,
      lecciones: [
        { id: 'LEC-006', titulo: 'Tipos de crédito empresarial', contenido: 'Explore las distintas opciones de financiamiento para su negocio.' },
        { id: 'LEC-007', titulo: 'Plan de inversión', contenido: 'Cómo elaborar un plan sólido para invertir su crédito.' },
        { id: 'LEC-008', titulo: 'Gestión de flujo de caja', contenido: 'Mantené un flujo de caja saludable mientras pagás su crédito.' },
        { id: 'LEC-009', titulo: 'Escalando con deuda inteligente', contenido: 'Usá el apalancamiento financiero de forma responsable.' },
      ],
    },
    {
      id: 'CUR-004', titulo: 'Protección contra Fraude Financiero',
      descripcion: 'Identificá estafas y protegé sus datos financieros en el mundo digital.',
      nivel: 'intermedio', duracionHoras: 3, icono: 'shield', bonificacionTasa: 2.5,
      lecciones: [
        { id: 'LEC-010', titulo: 'Estafas comunes', contenido: 'Conozca las tácticas más usadas por defraudadores.' },
        { id: 'LEC-011', titulo: 'Protección de datos', contenido: 'Buenas prácticas para mantener su información segura.' },
        { id: 'LEC-012', titulo: '¿Qué hacer si fue víctima?', contenido: 'Pasos a seguir si sospecha que fue defraudado.' },
      ],
    },
  ];
}

function generarLogros(): Logro[] {
  return [
    { id: 'LOG-001', nombre: 'Primer paso', descripcion: 'Completaste tu primer curso', icono: 'star', desbloqueado: false },
    { id: 'LOG-002', nombre: 'Estudiante constante', descripcion: 'Completaste 3 cursos', icono: 'book', desbloqueado: false },
    { id: 'LOG-003', nombre: 'Master financiero', descripcion: 'Completaste todos los cursos', icono: 'trophy', desbloqueado: false },
    { id: 'LOG-004', nombre: 'Score boost', descripcion: 'Mejoraste su conocimiento en scoring', icono: 'trending-up', desbloqueado: false },
  ];
}

export const EducacionStore = signalStore(
  { providedIn: 'root' },
  withState<EducacionState>({
    cursos: generarCursos(),
    progreso: [],
    logros: generarLogros(),
    loading: false,
    error: null,
  }),
  withMethods((store, http = inject(HttpClient), auth = inject(AuthStore)) => ({
    getCursoById(id: string): Curso | undefined {
      return store.cursos().find(c => c.id === id);
    },

    async completarLeccion(cursoId: string, leccionId: string): Promise<void> {
      patchState(store, { loading: true, error: null });

      const cursosActualizados = store.cursos().map(c =>
        c.id === cursoId
          ? { ...c, lecciones: c.lecciones.map(l => l.id === leccionId ? { ...l, completada: true } : l) }
          : c,
      );
      patchState(store, { cursos: cursosActualizados });

      const curso = store.cursos().find(c => c.id === cursoId);
      if (!curso) return;

      const completadas = curso.lecciones.filter(l => l.completada).length;
      const completado = completadas === curso.lecciones.length;
      const existing = store.progreso().find(p => p.cursoId === cursoId);

      if (existing) {
        patchState(store, {
          progreso: store.progreso().map(p =>
            p.cursoId === cursoId ? { ...p, leccionesCompletadas: completadas, completado } : p,
          ),
        });
      } else {
        patchState(store, {
          progreso: [...store.progreso(), { cursoId, leccionesCompletadas: completadas, totalLecciones: curso.lecciones.length, completado }],
        });
      }

      const todosCompletados = store.cursos().every(c => c.lecciones.every(l => l.completada));
      if (todosCompletados) {
        patchState(store, {
          logros: store.logros().map(l => l.id === 'LOG-003' ? { ...l, desbloqueado: true, fechaDesbloqueo: new Date() } : l),
        });
      }

      const usuario = auth.usuario();
      if (usuario?.id) {
        try {
          await firstValueFrom(
            http.post<GamificacionResponse>(
              `${environment.apiUrl}/api/usuarios/gamificacion/curso`,
              { usuario_id: Number(usuario.id) },
            ),
          );
        } catch {
          // gamificación no crítica, fallback silencioso
        }
      }

      patchState(store, { loading: false });
    },

    getBonificacionTotal(): number {
      return store.cursos()
        .filter(c => store.progreso().some(p => p.cursoId === c.id && p.completado))
        .reduce((sum, c) => sum + c.bonificacionTasa, 0);
    },
  })),
);
