import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./core/layouts/public-layout/public-layout').then(c => c.PublicLayout),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/solicitud/formulario/formulario').then(c => c.FormularioComponent),
      },
      {
        path: 'solicitar',
        loadComponent: () => import('./features/solicitud/formulario/formulario').then(c => c.FormularioComponent),
      },
      {
        path: 'solicitar/:id',
        loadComponent: () => import('./features/solicitud/resultado/resultado').then(c => c.ResultadoComponent),
      },
      {
        path: 'solicitar/mis-creditos',
        loadComponent: () => import('./features/solicitud/mis-creditos/mis-creditos').then(c => c.MisCreditosComponent),
      },
      {
        path: 'solicitar/:id/desembolso',
        loadComponent: () => import('./features/desembolso/seleccion-metodo/seleccion-metodo').then(c => c.SeleccionMetodoComponent),
      },
      {
        path: 'solicitar/:id/desembolso/confirmacion',
        loadComponent: () => import('./features/desembolso/confirmacion/confirmacion').then(c => c.ConfirmacionComponent),
      },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./core/layouts/private-layout/private-layout').then(c => c.PrivateLayout),
    children: [
      {
        path: 'analista',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/analista/lista/lista').then(c => c.ListaComponent),
          },
          {
            path: ':id',
            loadComponent: () => import('./features/analista/detalle/detalle').then(c => c.DetalleComponent),
          },
          {
            path: 'prestamos',
            loadComponent: () => import('./features/cobranza/lista/lista').then(c => c.CobranzaListaComponent),
          },
          {
            path: 'prestamos/:id',
            loadComponent: () => import('./features/cobranza/detalle/detalle').then(c => c.CobranzaDetalleComponent),
          },
        ],
      },
      {
        path: 'inversores',
        loadComponent: () => import('./features/inversionistas/dashboard/dashboard').then(c => c.InversorDashboardComponent),
      },
      {
        path: 'educacion',
        loadComponent: () => import('./features/educacion/curso-lista/curso-lista').then(c => c.CursoListaComponent),
      },
      {
        path: 'educacion/:id',
        loadComponent: () => import('./features/educacion/curso-detalle/curso-detalle').then(c => c.CursoDetalleComponent),
      },
      {
        path: 'admin/auditoria',
        loadComponent: () => import('./features/auditoria/audit-lista/audit-lista').then(c => c.AuditListaComponent),
      },
      {
        path: 'admin/auditoria/:id',
        loadComponent: () => import('./features/auditoria/audit-detalle/audit-detalle').then(c => c.AuditDetalleComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
