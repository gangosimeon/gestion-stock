import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { isServedByMock, mockWarehouseIdFor } from '../mocks/mock-routing';
import { WarehouseContextService } from '../services/warehouse-context.service';

/**
 * En-tête X-Warehouse-Id (dépôt courant).
 * - Vers Spring Boot : UUID du dépôt choisi ; aucun choix → pas d'en-tête, le backend applique
 *   le dépôt par défaut de l'utilisateur. Le backend refuse un dépôt non autorisé.
 * - Vers le backend simulé (modules non migrés) : dépôt simulé de même nom.
 */
export const warehouseInterceptor: HttpInterceptorFn = (req, next) => {
  const ctx = inject(WarehouseContextService);

  const warehouseId = isServedByMock(req) ? mockWarehouseIdFor(ctx.warehouseName) : ctx.warehouseId;
  if (!warehouseId) return next(req);

  return next(req.clone({ setHeaders: { 'X-Warehouse-Id': warehouseId } }));
};
