import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom, skipWhile } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ExpensesFacade, currentMonthFilter } from './expenses.facade';

const URL = `${environment.apiUrl}/expenses`;

describe('ExpensesFacade (dépenses sur Spring Boot)', () => {
  let facade: ExpensesFacade;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(
      'current_user',
      JSON.stringify({ id: 'u', username: 'gestion.test', roles: ['GESTIONNAIRE'], permissions: ['expense:read', 'expense:create'] })
    );
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    facade = TestBed.inject(ExpensesFacade);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('période du mois en cours : liste et totaux viennent du backend, rien n\'est additionné côté front', async () => {
    const month = currentMonthFilter(new Date(2026, 9, 11));
    expect(month).toEqual({ dateFrom: '2026-10-01', dateTo: '2026-10-11' });

    const vm = firstValueFrom(facade.vm$.pipe(skipWhile((v) => v.summary === null)));
    facade.refresh();
    const list = http.expectOne((r) => r.url === URL);
    expect(list.request.params.get('dateFrom')).toBe(currentMonthFilter().dateFrom);
    expect(list.request.params.get('page')).toBe('0');
    list.flush({
      items: [
        { id: 'e1', number: 'DEP-2026-000001', amount: 15000, status: 'PAID' },
        { id: 'e2', number: 'DEP-2026-000002', amount: 99999, status: 'CANCELLED' }
      ],
      total: 2
    });
    const summary = http.expectOne((r) => r.url === `${URL}/summary`);
    expect(summary.request.params.has('status')).toBe(false);
    summary.flush({ total: 15000, count: 1, cashTotal: 15000, cancelledCount: 1, byCategory: [] });

    const loaded = await vm;
    expect(loaded.summary?.total).toBe(15000);
    expect(loaded.total).toBe(2);
    expect(loaded.canCreate).toBe(true);
    expect(loaded.canCancel).toBe(false);
  });

  it('annulation : motif envoyé au backend, puis rechargement', async () => {
    const done = firstValueFrom(facade.cancel('e1', 'Saisie en double'));
    const req = http.expectOne(`${URL}/e1/cancel`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reason: 'Saisie en double' });
    req.flush({ id: 'e1', status: 'CANCELLED' });
    await done;
    http.expectOne((r) => r.url === URL).flush({ items: [], total: 0 });
    http.expectOne((r) => r.url === `${URL}/summary`).flush({ total: 0, count: 0, cashTotal: 0, cancelledCount: 1, byCategory: [] });
  });
});
