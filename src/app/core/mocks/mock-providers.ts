import { HttpInterceptorFn } from '@angular/common/http';

import { mockBackendInterceptor } from '../interceptors/mock-backend.interceptor';

/**
 * Intercepteurs du backend simulé (développement uniquement). En production, ce fichier est
 * remplacé par mock-providers.prod.ts (angular.json, fileReplacements) : ni le mock ni ses
 * données ne sont embarqués dans le bundle.
 */
export const MOCK_INTERCEPTORS: HttpInterceptorFn[] = [mockBackendInterceptor];
