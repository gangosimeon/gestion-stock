import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { WarehouseContextService } from '../services/warehouse-context.service';

export const warehouseInterceptor: HttpInterceptorFn = (req, next) => {
  const ctx = inject(WarehouseContextService);

  return next(
    req.clone({
      setHeaders: {
        'X-Warehouse-Id': ctx.warehouseId
      }
    })
  );
};
