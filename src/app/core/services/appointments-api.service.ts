import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Appointment, AppointmentFilter } from '../models/appointment.model';
import { PaginatedResult } from './products-api.service';

@Injectable({
  providedIn: 'root'
})
export class AppointmentsApiService {
  private readonly http = inject(HttpClient);

  list(filters?: AppointmentFilter, page = 0, size = 25): Observable<PaginatedResult<Appointment>> {
    let params = new HttpParams();
    params = params.set('page', page);
    params = params.set('size', size);

    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.dateFrom) params = params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params = params.set('dateTo', filters.dateTo);

    return this.http.get<PaginatedResult<Appointment>>(`${environment.apiUrl}/appointments`, { params });
  }

  getById(id: string): Observable<Appointment> {
    return this.http.get<Appointment>(`${environment.apiUrl}/appointments/${id}`);
  }

  create(data: Omit<Appointment, 'id'>): Observable<Appointment> {
    return this.http.post<Appointment>(`${environment.apiUrl}/appointments`, data);
  }

  update(id: string, data: Partial<Appointment>): Observable<Appointment> {
    return this.http.put<Appointment>(`${environment.apiUrl}/appointments/${id}`, data);
  }

  updateStatus(id: string, status: Appointment['status']): Observable<Appointment> {
    return this.http.patch<Appointment>(`${environment.apiUrl}/appointments/${id}/status`, { status });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/appointments/${id}`);
  }
}
