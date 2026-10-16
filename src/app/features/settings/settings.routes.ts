import { Routes } from '@angular/router';

import { InvoiceSettingsPageComponent } from './pages/invoice-settings-page.component';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'invoice'
  },
  {
    path: 'invoice',
    component: InvoiceSettingsPageComponent,
    title: 'Configuration de la facture'
  }
];
