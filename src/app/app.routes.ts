import { Routes } from '@angular/router';
import { authGuard } from './auth/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
{
  path: 'dashboard',
  canActivate: [authGuard],
  loadComponent: () =>
    import('./features/chat/dashboard/dashboard')
      .then(m => m.Dashboard)
}
];