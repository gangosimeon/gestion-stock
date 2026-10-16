import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { QuotesApiService } from './quotes-api.service';

const URL = `${environment.apiUrl}/quotes`;

describe('QuotesApiService', () => {
  let api: QuotesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(QuotesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('recherche : texte, statut, période, tous les dépôts, page et tri envoyés au backend', () => {
    api.page({ q: 'help', page: 1, size: 25, sort: ['quoteDate,desc'] }, { status: 'EXPIRED', from: '2022-01-01', to: '2022-12-31', allWarehouses: true }).subscribe();
    const p = http.expectOne((r) => r.url === URL).request.params;
    expect([p.get('q'), p.get('status'), p.get('from'), p.get('to'), p.get('allWarehouses'), p.get('page'), p.get('size')]).toEqual([
      'help', 'EXPIRED', '2022-01-01', '2022-12-31', 'true', '1', '25'
    ]);
    expect(p.getAll('sort')).toEqual(['quoteDate,desc']);
  });

  it('actions : chacune sur sa route', () => {
    const calls: [() => unknown, string, string][] = [
      [() => api.get('q1').subscribe(), 'GET', `${URL}/q1`],
      [() => api.issue('q1').subscribe(), 'POST', `${URL}/q1/issue`],
      [() => api.accept('q1').subscribe(), 'POST', `${URL}/q1/accept`],
      [() => api.refuse('q1').subscribe(), 'POST', `${URL}/q1/refuse`],
      [() => api.duplicate('q1').subscribe(), 'POST', `${URL}/q1/duplicate`]
    ];
    for (const [call, method, url] of calls) {
      call();
      const req = http.expectOne(url);
      expect(req.request.method).toBe(method);
      req.flush({});
    }
    api.cancel('q1', 'Doublon').subscribe();
    expect(http.expectOne(`${URL}/q1/cancel`).request.body).toEqual({ reason: 'Doublon' });
    api.invoice('q1', 's1').subscribe();
    expect(http.expectOne(`${URL}/q1/invoice`).request.body).toEqual({ saleId: 's1' });
  });

  it('devis d’une vente : null quand la vente n’est issue d’aucun devis (réponse vide)', async () => {
    const none = firstValueFrom(api.forSale('s1'));
    http.expectOne(`${URL}/for-sale/s1`).flush(null);
    expect(await none).toBeNull();
  });
});
