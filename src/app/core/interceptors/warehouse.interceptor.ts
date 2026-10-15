import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import {
  WAREHOUSE_SELECTION_ERRORS,
  WarehouseContextService,
  isWarehouseId
} from '../services/warehouse-context.service';

/**
 * En-tête X-Warehouse-Id (dépôt courant) : UUID du dépôt choisi. Aucun choix → pas d'en-tête, le
 * backend applique le dépôt par défaut de l'utilisateur. Un dépôt invalide, inconnu, désactivé ou
 * non autorisé est refusé par le backend (jamais remplacé) : le choix enregistré est alors revalidé.
 */
export const warehouseInterceptor: HttpInterceptorFn = (req, next) => {
  const ctx = inject(WarehouseContextService);
  const warehouseId = ctx.warehouseId;
  if (!isWarehouseId(warehouseId)) return next(req);

  return next(req.clone({ setHeaders: { 'X-Warehouse-Id': warehouseId } })).pipe(
    catchError((e: unknown) => {
      const code = e instanceof HttpErrorResponse ? (e.error as { code?: string } | null)?.code : undefined;
      if (code && WAREHOUSE_SELECTION_ERRORS.includes(code)) ctx.requestRevalidation();
      return throwError(() => e);
    })
  );
};
