import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login-page/login-page.component'),
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      // Admin only
      {
        path: 'dashboard',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard-page/dashboard-page.component'),
      },
      {
        path: 'empleados',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/empleados/pages/empleados-list-page/empleados-list-page.component'),
      },
      {
        path: 'empleados/nuevo',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/empleados/pages/empleado-form-page/empleado-form-page.component'),
      },
      {
        path: 'empleados/:id/editar',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/empleados/pages/empleado-form-page/empleado-form-page.component'),
      },

      // Admin and colaborador
      {
        path: 'asistencia',
        loadComponent: () =>
          import('./features/asistencia/pages/asistencia-page/asistencia-page.component'),
      },
      {
        path: 'asistencia/registrar',
        loadComponent: () =>
          import(
            './features/asistencia/pages/asistencia-form-page/asistencia-form-page.component'
          ),
      },
      {
        path: 'asistencia/registrar/:id',
        loadComponent: () =>
          import(
            './features/asistencia/pages/asistencia-form-page/asistencia-form-page.component'
          ),
      },
      {
        path: 'liquidacion',
        loadComponent: () =>
          import('./features/liquidacion/pages/liquidacion-page/liquidacion-page.component'),
      },
      {
        path: 'liquidacion/:id',
        loadComponent: () =>
          import(
            './features/liquidacion/pages/liquidacion-detalle-page/liquidacion-detalle-page.component'
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
