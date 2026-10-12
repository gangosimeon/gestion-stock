import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../../environments/environment';
import { AppointmentsApiService } from './appointments-api.service';

const URL = `${environment.apiUrl}/appointments`;

describe('AppointmentsApiService', () => {
  let api: AppointmentsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AppointmentsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it("l'heure du champ datetime-local part telle quelle (heure locale du dépôt, pas de conversion UTC)", () => {
    api.create({ customerId: 'c1', dateTime: '2026-10-14T10:30', note: 'Essayage' }).subscribe();
    const req = http.expectOne(URL);
    expect(req.request.body).toEqual({ customerId: 'c1', dateTime: '2026-10-14T10:30', note: 'Essayage' });
    req.flush({});
  });

  it('agenda : filtres jour local et pagination', () => {
    api.list({ dateFrom: '2026-10-11', status: 'SCHEDULED', search: '77 12' }, 1, 10).subscribe();
    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('dateFrom')).toBe('2026-10-11');
    expect(req.request.params.get('status')).toBe('SCHEDULED');
    expect(req.request.params.get('search')).toBe('77 12');
    expect(req.request.params.get('page')).toBe('1');
    req.flush({ items: [], total: 0 });
  });

  it('clôture : honoré sans motif, annulation avec motif', () => {
    api.updateStatus('a1', 'COMPLETED').subscribe();
    api.updateStatus('a2', 'CANCELLED', 'Client en voyage').subscribe();
    const done = http.expectOne(`${URL}/a1/status`);
    expect(done.request.method).toBe('PATCH');
    expect(done.request.body).toEqual({ status: 'COMPLETED', reason: undefined });
    done.flush({});
    http.expectOne(`${URL}/a2/status`).flush({});
  });
});
