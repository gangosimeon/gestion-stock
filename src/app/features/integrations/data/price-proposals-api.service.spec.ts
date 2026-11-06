import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { PriceProposalsApiService } from './price-proposals-api.service';

const BASE = `${environment.apiUrl}/integration-links`;
const CROSS = `${environment.apiUrl}/price-proposals`;

/** Service d'approbation des prix (lot 3, GA3). */
describe('PriceProposalsApiService', () => {
  let service: PriceProposalsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PriceProposalsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // --- listAll ---

  it('listAll : GET /api/price-proposals sans paramètre → page=0, size=10 par défaut', () => {
    service.listAll().subscribe();
    const req = http.expectOne((r) => r.method === 'GET' && r.url === CROSS);
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    req.flush({ items: [], total: 0 });
  });

  it('listAll : transmet page et size', () => {
    service.listAll(2, 25).subscribe();
    const req = http.expectOne((r) => r.url === CROSS);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('25');
    req.flush({ items: [], total: 0 });
  });

  it('listAll : statut PROPOSED uniquement (pas de paramètre status transmis)', () => {
    service.listAll().subscribe();
    const req = http.expectOne((r) => r.url === CROSS);
    // La route n'accepte que PROPOSED : pas de paramètre status envoyé par le service
    expect(req.request.params.has('status')).toBe(false);
    req.flush({ items: [], total: 0 });
  });

  // --- approve ---

  it('approve : POST /api/integration-links/{linkId}/price-proposals/{proposalId}/approve, corps null', () => {
    service.approve('link-1', 'prop-1').subscribe();
    const req = http.expectOne(`${BASE}/link-1/price-proposals/prop-1/approve`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush({});
  });

  // --- reject ---

  it('reject : POST avec { reason } dans le corps', () => {
    service.reject('link-1', 'prop-1', 'Marge insuffisante').subscribe();
    const req = http.expectOne(`${BASE}/link-1/price-proposals/prop-1/reject`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reason: 'Marge insuffisante' });
    req.flush({});
  });
});
