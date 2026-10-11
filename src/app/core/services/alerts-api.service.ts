import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Alert, AlertSummary, StockAlertType } from '../models/alert.model';
import { PaginatedResult } from './products-api.service';

const STOCK_LEVEL_TYPES: readonly StockAlertType[] = ['OUT_OF_STOCK', 'BELOW_MINIMUM', 'LOW_STOCK'];

/** Alertes calculées par le backend (seuils configurables côté serveur). */
@Injectable({
  providedIn: 'root'
})
export class AlertsApiService {
  private readonly http = inject(HttpClient);

  /** Nombre d'alertes du dépôt courant (dont alertes de stock), calculées par le backend. */
  summary(): Observable<AlertSummary> {
    return this.http.get<AlertSummary>(`${environment.apiUrl}/alerts/summary`);
  }

  /**
   * Niveau de stock de chaque produit en alerte dans le dépôt courant (rupture, sous le
   * minimum, faible), indexé par identifiant de produit. Un produit absent est disponible.
   */
  stockLevels(): Observable<Map<string, StockAlertType>> {
    let params = new HttpParams();
    STOCK_LEVEL_TYPES.forEach((t) => (params = params.append('type', t)));
    return this.http.get<PaginatedResult<Alert>>(`${environment.apiUrl}/alerts`, { params }).pipe(
      map((page) => {
        const levels = new Map<string, StockAlertType>();
        for (const alert of page.items) {
          if (alert.entityId && STOCK_LEVEL_TYPES.includes(alert.type as StockAlertType)) {
            levels.set(alert.entityId, alert.type as StockAlertType);
          }
        }
        return levels;
      })
    );
  }
}
