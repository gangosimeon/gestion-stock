import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { DailyReport, MonthlyReport, YearlyReport } from '../models/report.model';

@Injectable({
  providedIn: 'root'
})
export class ReportsApiService {
  private readonly http = inject(HttpClient);

  daily(date: string): Observable<DailyReport> {
    return this.http.get<DailyReport>(`${environment.apiUrl}/reports/daily`, { params: { date } });
  }

  monthly(month: string): Observable<MonthlyReport> {
    return this.http.get<MonthlyReport>(`${environment.apiUrl}/reports/monthly`, { params: { month } });
  }

  yearly(year: number): Observable<YearlyReport> {
    return this.http.get<YearlyReport>(`${environment.apiUrl}/reports/yearly`, { params: { year } });
  }
}
