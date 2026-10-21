import {
  ApplicationConfig,
  importProvidersFrom,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { routes } from './app.routes';
import { apiErrorInterceptor } from './core/interceptors/api-error.interceptor';
import { jwtInterceptor } from './auth/interceptors/jwt.interceptor';
import { warehouseInterceptor } from './core/interceptors/warehouse.interceptor';
import { platformInterceptor } from './features/platform/data/platform.interceptor';
import { MOCK_INTERCEPTORS } from './core/mocks/mock-providers';
import { AuthService } from './auth/services/auth.service';
import { BrandingService } from './core/branding/branding.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimations(),
    importProvidersFrom(MatSnackBarModule),
    // Le jeton doit être ajouté AVANT le backend simulé (développement) : sinon le mock ne reçoit
    // jamais l'identité de l'utilisateur. En production, MOCK_INTERCEPTORS est vide.
    // jwtInterceptor : jeton d'entreprise ; platformInterceptor : jeton Super Admin (/api/platform/** uniquement).
    provideHttpClient(
      withInterceptors([apiErrorInterceptor, warehouseInterceptor, jwtInterceptor, platformInterceptor, ...MOCK_INTERCEPTORS])
    ),
    provideRouter(routes),
    // Thème de l'entreprise de la session appliqué avant le premier rendu (pas de flash de la charte
    // par défaut ni du thème d'une autre entreprise), puis rafraîchi par le layout.
    provideAppInitializer(() => inject(BrandingService).restore(inject(AuthService).companyCode))
  ]
};
