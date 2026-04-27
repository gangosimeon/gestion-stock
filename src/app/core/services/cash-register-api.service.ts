import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CashOperation, CashRegisterSession } from '../models/cash-register.model';
import { PaginatedResult } from './products-api.service';

function toApiError(err: unknown): Error {
  if (err instanceof HttpErrorResponse) {
    const msg = typeof err.error === 'string' ? err.error : (err.error?.message as string | undefined);
    return new Error(msg ?? err.message);
  }

  if (err instanceof Error) return err;
  return new Error('Une erreur est survenue.');
}

export interface OpenCashRegisterRequest {
  openingBalance: number;
}

export interface CloseCashRegisterRequest {
  countedCash: number;
}

export interface CreateCashOperationRequest {
  type: 'IN' | 'OUT';
  amount: number;
  note?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CashRegisterApiService {
  private readonly http = inject(HttpClient);

  current(): Observable<CashRegisterSession | null> {
    return this.http
      .get<CashRegisterSession | null>(`${environment.apiUrl}/cash-register/current`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  sessions(): Observable<PaginatedResult<CashRegisterSession>> {
    return this.http
      .get<PaginatedResult<CashRegisterSession>>(`${environment.apiUrl}/cash-register/sessions`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  open(payload: OpenCashRegisterRequest): Observable<CashRegisterSession> {
    return this.http
      .post<CashRegisterSession>(`${environment.apiUrl}/cash-register/open`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  close(payload: CloseCashRegisterRequest): Observable<CashRegisterSession> {
    return this.http
      .post<CashRegisterSession>(`${environment.apiUrl}/cash-register/close`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  createOperation(payload: CreateCashOperationRequest): Observable<CashOperation> {
    return this.http
      .post<CashOperation>(`${environment.apiUrl}/cash-register/operations`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  operationsBySession(sessionId: string): Observable<PaginatedResult<CashOperation>> {
    return this.http
      .get<PaginatedResult<CashOperation>>(`${environment.apiUrl}/cash-register/sessions/${sessionId}/operations`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
