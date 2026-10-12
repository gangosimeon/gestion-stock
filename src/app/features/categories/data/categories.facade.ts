import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, finalize, map, shareReplay, tap } from 'rxjs';

import { Category, CategoryRequest } from '../../../core/models/category.model';
import { AuthService } from '../../../core/services/auth.service';
import { CategoriesApiService } from '../../../core/services/categories-api.service';

export interface CategoriesVm {
  isLoading: boolean;
  errorMessage: string | null;
  categories: Category[];
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
  private readonly categoriesSubject = new BehaviorSubject<Category[]>([]);

  readonly vm$: Observable<CategoriesVm> = combineLatest([
    this.isLoadingSubject,
    this.errorSubject,
    this.categoriesSubject,
    // Interface seulement : le backend contrôle category:manage à chaque appel.
    this.auth.hasPermission$('category:manage')
  ]).pipe(
    map(([isLoading, errorMessage, categories, canManage]): CategoriesVm => ({ isLoading, errorMessage, categories, canManage })),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  refresh(): void {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);
    this.api
      .listAll()
      .pipe(finalize(() => this.isLoadingSubject.next(false)))
      .subscribe({
        next: (r) => this.categoriesSubject.next(r.items),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      });
  }

  save(id: string | null, payload: CategoryRequest): Observable<Category> {
    const req$ = id ? this.api.update(id, payload) : this.api.create(payload);
    return req$.pipe(tap(() => this.refresh()));
  }

  setActive(id: string, active: boolean): Observable<Category> {
    return this.api.setActive(id, active).pipe(tap(() => this.refresh()));
  }
}
