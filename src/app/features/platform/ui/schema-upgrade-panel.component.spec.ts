import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { environment } from '../../../../environments/environment';
import { SchemaUpgradeStatus } from '../data/platform.models';
import { SCHEMA_POLL_MS, SchemaUpgradePanelComponent } from './schema-upgrade-panel.component';

const URL = `${environment.apiUrl}/platform/schema-upgrades`;

function status(change: Partial<SchemaUpgradeStatus> = {}): SchemaUpgradeStatus {
  return {
    running: false,
    automatic: true,
    startedAt: '2026-10-27T10:00:00Z',
    finishedAt: '2026-10-27T10:00:05Z',
    companies: [
      { companyId: 'a', code: 'principale', state: 'UP_TO_DATE', pending: 1, applied: 1, message: null, updatedAt: '2026-10-27T10:00:02Z' },
      { companyId: 'b', code: 'ests', state: 'FAILED', pending: 1, applied: 0, message: 'Migration impossible', updatedAt: '2026-10-27T10:00:04Z' }
    ],
    ...change
  };
}

describe('SchemaUpgradePanelComponent (mise à jour des bases, Super Admin)', () => {
  let http: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      imports: [SchemaUpgradePanelComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()]
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(SchemaUpgradePanelComponent);
    fixture.detectChanges();
    const text = () => (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
    return { fixture, text };
  }

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('affiche l’état de chaque base, et signale les échecs avec leur cause', () => {
    const { fixture, text } = setup();
    http.expectOne(URL).flush(status());
    fixture.detectChanges();

    expect(text()).toContain('principale');
    expect(text()).toContain('À jour');
    expect(text()).toContain('ests');
    expect(text()).toContain('En échec');
    expect(text()).toContain('Migration impossible');
    expect(text()).toContain('1 base(s) en échec.');
    expect(text()).toContain('automatiquement');
  });

  it('relance : la mise à jour est suivie jusqu’à sa fin', () => {
    vi.useFakeTimers();
    const { fixture, text } = setup();
    http.expectOne(URL).flush(status());
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    const start = http.expectOne(URL);
    expect(start.request.method).toBe('POST');
    start.flush(status({ running: true, finishedAt: null }));
    fixture.detectChanges();
    expect(text()).toContain('Mise à jour en cours');
    expect((fixture.nativeElement as HTMLElement).querySelector('button')!.disabled).toBe(true);

    vi.advanceTimersByTime(SCHEMA_POLL_MS);
    http.expectOne({ url: URL, method: 'GET' }).flush(
      status({ companies: [{ companyId: 'b', code: 'ests', state: 'UP_TO_DATE', pending: 1, applied: 1, message: null, updatedAt: '' }] })
    );
    fixture.detectChanges();

    expect(text()).not.toContain('base(s) en échec');
    expect(text()).not.toContain('En échec');
    expect(text()).toContain('Dernière vérification terminée');
    // Mise à jour terminée : plus aucune relecture.
    vi.advanceTimersByTime(SCHEMA_POLL_MS * 3);
    http.expectNone(URL);
  });

  it('mise à jour déjà en cours (409) : message affiché et état relu', () => {
    const { fixture, text } = setup();
    http.expectOne(URL).flush(status());
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    http.expectOne({ url: URL, method: 'POST' }).flush({ message: 'Une mise à jour est déjà en cours.' }, { status: 409, statusText: 'Conflict' });
    http.expectOne({ url: URL, method: 'GET' }).flush(status({ running: false }));
    fixture.detectChanges();

    expect(text()).toContain('Une mise à jour est déjà en cours.');
  });
});
