import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, finalize, map, switchMap, tap } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { Role } from '../../../core/models/role.model';
import { User } from '../../../core/models/user.model';
import { CreateUserRequest, UpdateUserRequest, UsersApiService } from '../../../core/services/users-api.service';
import { UserDrawerState, UsersVm } from './users-vm.model';

@Injectable({
  providedIn: 'root'
})
export class UsersFacade {
  private readonly api = inject(UsersApiService);
  private readonly auth = inject(AuthService);

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly refreshSubject = new BehaviorSubject<void>(undefined);

  private readonly drawerSubject = new BehaviorSubject<UserDrawerState>({
    opened: false,
    mode: 'CREATE',
    userId: null
  });

  readonly drawer$ = this.drawerSubject.asObservable();

  private readonly canManage$ = this.auth.hasAnyRole(['ADMIN']);

  private readonly items$ = this.refreshSubject.pipe(
    tap(() => {
      this.isLoadingSubject.next(true);
      this.errorSubject.next(null);
    }),
    switchMap(() =>
      this.api.list().pipe(
        map((r) => r.items),
        finalize(() => this.isLoadingSubject.next(false)),
        tap({
          error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
        })
      )
    )
  );

  readonly vm$ = combineLatest([this.isLoadingSubject, this.errorSubject, this.canManage$, this.items$]).pipe(
    map(([isLoading, errorMessage, canManage, items]): UsersVm => ({
      isLoading,
      errorMessage,
      canManage,
      items
    }))
  );

  refresh(): void {
    this.refreshSubject.next(undefined);
  }

  openCreate(): void {
    this.drawerSubject.next({ opened: true, mode: 'CREATE', userId: null });
  }

  openEdit(userId: string): void {
    this.drawerSubject.next({ opened: true, mode: 'EDIT', userId });
  }

  closeDrawer(): void {
    this.drawerSubject.next({ ...this.drawerSubject.value, opened: false });
  }

  create(payload: CreateUserRequest): unknown {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.api.create(payload).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
      tap({
        next: () => this.refresh(),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      })
    );
  }

  update(id: string, payload: UpdateUserRequest): unknown {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.api.update(id, payload).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
      tap({
        next: () => this.refresh(),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      })
    );
  }

  setActive(id: string, isActive: boolean): unknown {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.api.setActive(id, isActive).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
      tap({
        next: () => this.refresh(),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      })
    );
  }

  delete(id: string): unknown {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.api.delete(id).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
      tap({
        next: () => this.refresh(),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      })
    );
  }

  rolesToLabels(roles: readonly Role[]): string {
    return roles.join(', ');
  }

  findUser(items: readonly User[], id: string | null): User | null {
    if (!id) return null;
    return items.find((u) => u.id === id) ?? null;
  }
}
