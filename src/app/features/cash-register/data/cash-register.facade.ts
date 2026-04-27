import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, finalize, map, Observable, shareReplay, switchMap, tap } from 'rxjs';

import {
  CashRegisterApiService,
  CloseCashRegisterRequest,
  CreateCashOperationRequest,
  OpenCashRegisterRequest
} from '../../../core/services/cash-register-api.service';
import { CashOperation, CashRegisterSession } from '../../../core/models/cash-register.model';
import { PaginatedResult } from '../../../core/services/products-api.service';

export interface CashRegisterVm {
  isLoading: boolean;
  errorMessage: string | null;
  current: CashRegisterSession | null;
}

@Injectable({
  providedIn: 'root'
})
export class CashRegisterFacade {
  private readonly api = inject(CashRegisterApiService);

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly refreshSubject = new BehaviorSubject<void>(undefined);

  readonly current$ = this.refreshSubject.pipe(
    switchMap(() => this.api.current()),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly vm$ = combineLatest([this.isLoadingSubject, this.errorSubject, this.current$]).pipe(
    map(([isLoading, errorMessage, current]): CashRegisterVm => ({ isLoading, errorMessage, current })),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  refresh(): void {
    this.refreshSubject.next(undefined);
  }

  open(payload: OpenCashRegisterRequest): unknown {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.api.open(payload).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
      tap({
        next: () => this.refresh(),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      })
    );
  }

  close(payload: CloseCashRegisterRequest): unknown {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.api.close(payload).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
      tap({
        next: () => this.refresh(),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      })
    );
  }

  addOperation(payload: CreateCashOperationRequest): unknown {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.api.createOperation(payload).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
      tap({
        next: () => this.refresh(),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      })
    );
  }

  sessions(): Observable<PaginatedResult<CashRegisterSession>> {
    return this.api.sessions();
  }

  operationsBySession(sessionId: string): Observable<PaginatedResult<CashOperation>> {
    return this.api.operationsBySession(sessionId);
  }
}
