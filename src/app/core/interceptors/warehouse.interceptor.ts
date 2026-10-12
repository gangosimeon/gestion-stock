import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { WarehouseContextService } from '../services/warehouse-context.service';

/**
 * En-tête X-Warehouse-Id (dépôt courant) : UUID du dépôt choisi. Aucun choix → pas d'en-tête, le
 * backend applique le dépôt par défaut de l'utilisateur. Le backend refuse un dépôt non autorisé.
 */
export const warehouseInterceptor: HttpInterceptorFn = (req, next) => {
  const warehouseId = inject(WarehouseContextService).warehouseId;
  if (!warehouseId) return next(req);

  return next(req.clone({ setHeaders: { 'X-Warehouse-Id': warehouseId } }));
};
