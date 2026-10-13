import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject, combineLatest, map, shareReplay, tap } from 'rxjs';

import { Category, CategoryRequest } from '../../../core/models/category.model';
import { AuthService } from '../../../core/services/auth.service';
import { CategoriesApiService } from '../../../core/services/categories-api.service';
import { PageRequest } from '../../../core/services/page-params';
import { ActiveStatusFilter, PaginatedResult } from '../../../core/services/products-api.service';

export interface CategoriesVm {
  isLoading: boolean;
  errorMessage: string | null;
  canManage: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CategoriesFacade {
  private readonly api = inject(CategoriesApiService);
  private readonly auth = inject(AuthService);

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly refreshSubject = new Subject<void>();

  /** Rechargements demandés après création, modification ou changement de statut (liste paginée). */
  readonly refresh$ = this.refreshSubject.asObservable();

  readonly vm$: Observable<CategoriesVm> = combineLatest([
    this.isLoadingSubject,
    this.errorSubject,
    // Interface seulement : le backend contrôle category:manage à chaque appel.
    this.auth.hasPermission$('category:manage')
  ]).pipe(
    map(([isLoading, errorMessage, canManage]): CategoriesVm => ({ isLoading, errorMessage, canManage })),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  refresh(): void {
    this.refreshSubject.next();
  }

  /** Page de la liste : recherche, statut, tri et pagination traités par le backend. */
  search(page: PageRequest, filters: { status: ActiveStatusFilter }): Observable<PaginatedResult<Category>> {
    return this.api.findPage(page, filters);
  }

  save(id: string | null, payload: CategoryRequest): Observable<Category> {
    const req$ = id ? this.api.update(id, payload) : this.api.create(payload);
    return req$.pipe(tap(() => this.refresh()));
  }

  setActive(id: string, active: boolean): Observable<Category> {
    return this.api.setActive(id, active).pipe(tap(() => this.refresh()));
  }
}
