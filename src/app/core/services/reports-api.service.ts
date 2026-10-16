import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageRequest, pageParams } from './page-params';
import { ProductSalesReportRow, ReportPage, SalesGroupBy, SalesPeriodReportRow } from '../models/report.model';

function toApiError(err: unknown): Error {
  if (err instanceof HttpErrorResponse) {
    const msg = typeof err.error === 'string' ? err.error : (err.error?.message as string | undefined);
    return new Error(msg ?? err.message);
  }
  if (err instanceof Error) return err;
  return new Error('Une erreur est survenue.');
}

/** Tous les dépôts fusionnés (le dépôt courant est alors ignoré par le serveur). */
function withScope(params: HttpParams, allWarehouses: boolean): HttpParams {
  return allWarehouses ? params.set('allWarehouses', true) : params;
}

/**
 * Rapports calculés par le backend (`/api/reports/*`, permission report:read), sur le dépôt
 * courant, ou sur tous les dépôts fusionnés avec `allWarehouses` (permission warehouse:all). Dates `AAAA-MM-JJ` incluses, au fuseau de l'entreprise. Ventes annulées exclues,
 * retours déduits.
 */
@Injectable({
  providedIn: 'root'
})
export class ReportsApiService {
  private readonly http = inject(HttpClient);

  /** Série complète (0 les jours sans vente) : nombre, CA brut, retours, CA net, coût, marge. */
  salesByPeriod(from: string, to: string, groupBy: SalesGroupBy, allWarehouses = false): Observable<SalesPeriodReportRow[]> {
    const params = withScope(new HttpParams().set('from', from).set('to', to).set('groupBy', groupBy), allWarehouses);
    return this.http
      .get<SalesPeriodReportRow[]>(`${environment.apiUrl}/reports/sales/by-period`, { params })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /**
   * Ventes par produit sur la période, nettes des retours : recherche (nom, référence), tri et
   * pagination côté serveur (CA net décroissant par défaut).
   */
  salesByProductPage(
    from: string,
    to: string,
    page: PageRequest,
    allWarehouses = false
  ): Observable<ReportPage<ProductSalesReportRow>> {
    return this.http
      .get<ReportPage<ProductSalesReportRow>>(`${environment.apiUrl}/reports/sales/by-product`, {
        params: pageParams(page, { from, to, allWarehouses: allWarehouses ? true : null })
      })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Meilleures ventes par produit (CA net décroissant), nettes des retours. */
  salesByProduct(from: string, to: string, size = 10, allWarehouses = false): Observable<ReportPage<ProductSalesReportRow>> {
    const params = withScope(
      new HttpParams().set('from', from).set('to', to).set('page', 0).set('size', size).set('sort', 'netRevenue,desc'),
      allWarehouses
    );
    return this.http
      .get<ReportPage<ProductSalesReportRow>>(`${environment.apiUrl}/reports/sales/by-product`, { params })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
