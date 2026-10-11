import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Appointment, AppointmentFilter, AppointmentRequest, AppointmentStatus } from '../models/appointment.model';
import { PaginatedResult } from './products-api.service';

function toApiError(err: unknown): Error {
  if (err instanceof HttpErrorResponse) {
    const msg = typeof err.error === 'string' ? err.error : (err.error?.message as string | undefined);
    return new Error(msg ?? err.message);
  }

  if (err instanceof Error) return err;
  return new Error('Une erreur est survenue.');
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/appointments`;

  /** Agenda du dépôt courant, du plus proche au plus lointain. */
  list(filters?: AppointmentFilter, page = 0, size = 25): Observable<PaginatedResult<Appointment>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.dateFrom) params = params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params = params.set('dateTo', filters.dateTo);
    if (filters?.customerId) params = params.set('customerId', filters.customerId);
    return this.http
      .get<PaginatedResult<Appointment>>(this.baseUrl, { params })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  getById(id: string): Observable<Appointment> {
    return this.http
      .get<Appointment>(`${this.baseUrl}/${id}`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  create(data: AppointmentRequest): Observable<Appointment> {
    return this.http
      .post<Appointment>(this.baseUrl, data)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Remplacement complet, tant que le rendez-vous est planifié. */
  update(id: string, data: AppointmentRequest): Observable<Appointment> {
    return this.http
      .put<Appointment>(`${this.baseUrl}/${id}`, data)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Clôture : honoré / absent (à partir du jour du rendez-vous) ou annulé (motif obligatoire). */
  updateStatus(id: string, status: Exclude<AppointmentStatus, 'SCHEDULED'>, reason?: string): Observable<Appointment> {
    return this.http
      .patch<Appointment>(`${this.baseUrl}/${id}/status`, { status, reason })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
