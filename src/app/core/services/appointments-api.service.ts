import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Appointment } from '../models/appointment.model';
import { PaginatedResult } from './products-api.service';

@Injectable({
  providedIn: 'root'
})
export class AppointmentsApiService {
  private readonly http = inject(HttpClient);

  list(): Observable<PaginatedResult<Appointment>> {
    return this.http.get<PaginatedResult<Appointment>>(`${environment.apiUrl}/appointments`);
  }
}
