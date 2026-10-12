import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { auditActionLabels, auditLabel, formatAuditValue } from '../models/audit-log.model';
import { AuditLogsApiService } from './audit-logs-api.service';

const URL = `${environment.apiUrl}/audit-logs`;

describe('AuditLogsApiService', () => {
  let api: AuditLogsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AuditLogsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('recherche : filtres, pagination et tri transmis au backend', async () => {
    const result = firstValueFrom(
      api.list(
        { dateFrom: '2026-10-01', dateTo: '2026-10-11', actions: ['CANCEL', 'PAY'], modules: ['SALE'], status: 'FAILURE', search: 'caisse' },
        2,
        50,
        { field: 'username', direction: 'asc' }
      )
    );
    const req = http.expectOne((r) => r.url === URL);
    const p = req.request.params;
    expect(p.get('page')).toBe('2');
    expect(p.get('size')).toBe('50');
    expect(p.get('actions')).toBe('CANCEL,PAY');
    expect(p.get('modules')).toBe('SALE');
    expect(p.get('status')).toBe('FAILURE');
    expect(p.get('search')).toBe('caisse');
    expect(p.get('dateTo')).toBe('2026-10-11');
    expect(p.get('sort')).toBe('username,asc');
    req.flush({ items: [], total: 0, page: 2, size: 50, totalPages: 0 });
    expect((await result).total).toBe(0);
  });

  it('export : mêmes critères que la recherche (recherche texte comprise)', () => {
    api.exportCsv({ search: 'caisse', modules: ['CASH'] }).subscribe();
    const req = http.expectOne((r) => r.url === `${URL}/export`);
    expect(req.request.params.get('search')).toBe('caisse');
    expect(req.request.params.get('modules')).toBe('CASH');
    expect(req.request.params.has('page')).toBe(false);
    req.flush(new Blob(['id;date']));
  });

  it('libellés et valeurs du diff lisibles, codes inconnus affichés tels quels', () => {
    expect(auditLabel(auditActionLabels, 'CANCEL')).toBe('Annulation');
    expect(auditLabel(auditActionLabels, 'NEW_ACTION')).toBe('NEW_ACTION');
    expect(auditLabel(auditActionLabels, null)).toBe('—');
    expect(formatAuditValue({ id: 'w1' })).toBe('{"id":"w1"}');
    expect(formatAuditValue(false)).toBe('non');
    expect(formatAuditValue(null)).toBe('—');
  });
});
