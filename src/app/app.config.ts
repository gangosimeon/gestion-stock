import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { routes } from './app.routes';
import { apiErrorInterceptor } from './core/interceptors/api-error.interceptor';
import { jwtInterceptor } from './auth/interceptors/jwt.interceptor';
import { warehouseInterceptor } from './core/interceptors/warehouse.interceptor';
import { mockBackendInterceptor } from './core/interceptors/mock-backend.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimations(),
    importProvidersFrom(MatSnackBarModule),
    // Le jeton doit être ajouté AVANT le backend simulé : sinon le mock ne reçoit jamais
    // l'identité de l'utilisateur.
    provideHttpClient(withInterceptors([apiErrorInterceptor, warehouseInterceptor, jwtInterceptor, mockBackendInterceptor])),
    provideRouter(routes)
  ]
};
