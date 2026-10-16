import { Routes } from '@angular/router';

import { permissionGuard } from '../../auth/guards/permission.guard';
import { QuoteDetailPageComponent } from './pages/quote-detail-page.component';
import { QuoteFormPageComponent } from './pages/quote-form-page.component';
import { QuotesListPageComponent } from './pages/quotes-list-page.component';

/** Création et modification : quote:manage (la liste et le détail : quote:read, garde du menu). */
const MANAGE = { permissions: ['quote:manage'] };

export const QUOTES_ROUTES: Routes = [
  { path: '', component: QuotesListPageComponent, title: 'Devis' },
  { path: 'new', component: QuoteFormPageComponent, canMatch: [permissionGuard], data: MANAGE, title: 'Nouveau devis' },
  { path: ':id', component: QuoteDetailPageComponent, title: 'Devis' },
  { path: ':id/edit', component: QuoteFormPageComponent, canMatch: [permissionGuard], data: MANAGE, title: 'Modifier le devis' }
];
