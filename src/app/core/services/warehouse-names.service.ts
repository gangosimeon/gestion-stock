import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, startWith, switchMap } from 'rxjs';

import { WarehouseContextService } from './warehouse-context.service';
import { WarehousesApiService } from './warehouses-api.service';

/**
 * Noms des dépôts visibles par l'utilisateur, pour afficher un identifiant renvoyé par le
 * backend (colonne « Dépôt », filtres). Relus quand les dépôts changent (création, renommage,
 * désactivation : revalidation du sélecteur).
 */
@Injectable({
  providedIn: 'root'
})
export class WarehouseNamesService {
  private readonly api = inject(WarehousesApiService);
  private readonly ctx = inject(WarehouseContextService);

  readonly names$: Observable<ReadonlyMap<string, string>> = this.ctx.revalidationRequested$.pipe(
    startWith(undefined),
    switchMap(() =>
      this.api.list().pipe(
        map((r) => new Map(r.items.map((w) => [w.id, w.name] as const))),
        catchError(() => of(new Map<string, string>()))
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );
}
