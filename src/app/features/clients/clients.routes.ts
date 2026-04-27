import { Routes } from '@angular/router';

import { ClientsShellPageComponent } from './pages/clients-shell-page.component';
import { ClientDetailPageComponent } from './pages/client-detail-page.component';

export const CLIENTS_ROUTES: Routes = [
  {
    path: '',
    component: ClientsShellPageComponent
  },
  {
    path: ':id',
    component: ClientDetailPageComponent
  }
];
