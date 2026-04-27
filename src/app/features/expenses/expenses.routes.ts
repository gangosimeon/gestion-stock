import { Routes } from '@angular/router';

import { ExpensesShellPageComponent } from './pages/expenses-shell-page.component';

export const EXPENSES_ROUTES: Routes = [
  {
    path: '',
    component: ExpensesShellPageComponent
  }
];
