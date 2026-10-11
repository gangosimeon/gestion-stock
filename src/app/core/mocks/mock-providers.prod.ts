import { HttpInterceptorFn } from '@angular/common/http';

/** Production : aucun backend simulé (remplace mock-providers.ts au build, voir angular.json). */
export const MOCK_INTERCEPTORS: HttpInterceptorFn[] = [];
