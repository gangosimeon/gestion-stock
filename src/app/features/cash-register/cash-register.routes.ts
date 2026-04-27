import { Routes } from '@angular/router';

import { CashOpenPageComponent } from './pages/cash-open-page.component';
import { CashClosePageComponent } from './pages/cash-close-page.component';
import { CashHistoryPageComponent } from './pages/cash-history-page.component';

export const CASH_REGISTER_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'open'
  },
  {
    path: 'open',
    component: CashOpenPageComponent
  },
  {
    path: 'close',
    component: CashClosePageComponent
  },
  {
    path: 'history',
    component: CashHistoryPageComponent
  }
];
