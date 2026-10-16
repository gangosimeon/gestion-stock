import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { InvoiceSettingsResponse, defaultInvoiceSettings } from '../models/invoice-settings.model';
import { InvoiceSettingsApiService, InvoiceSettingsStore } from './invoice-settings-api.service';

const URL = `${environment.apiUrl}/settings/invoice`;

function response(withLogo: boolean): InvoiceSettingsResponse {
  return {
    ...defaultInvoiceSettings(),
    logo: withLogo
      ? { contentType: 'image/png', sizeBytes: 3, width: 1, height: 1, sha256: 'a'.repeat(64), updatedAt: '2026-10-16T08:00:00Z' }
      : null,
    updatedAt: '2026-10-16T08:00:00Z'
  };
}

describe('InvoiceSettingsApiService', () => {
  let api: InvoiceSettingsApiService;
  let store: InvoiceSettingsStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(InvoiceSettingsApiService);
    store = TestBed.inject(InvoiceSettingsStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lecture, enregistrement complet et réinitialisation', () => {
    api.get().subscribe();
    expect(http.expectOne(URL).request.method).toBe('GET');

    const settings = defaultInvoiceSettings();
    api.update(settings).subscribe();
    const put = http.expectOne(URL);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual(settings);

    api.reset().subscribe();
    expect(http.expectOne(`${URL}/reset`).request.method).toBe('POST');
  });

  it('logo : envoi multipart (champ « file »), lecture binaire, retrait', () => {
    const file = new File([new Uint8Array([0x89, 0x50])], 'logo.png', { type: 'image/png' });
    api.uploadLogo(file).subscribe();
    const post = http.expectOne(`${URL}/logo`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toBeInstanceOf(FormData);
    expect((post.request.body as FormData).get('file')).toBeInstanceOf(File);

    api.logo().subscribe();
    const get = http.expectOne((r) => r.url === `${URL}/logo` && r.method === 'GET');
    expect(get.request.responseType).toBe('blob');

    api.deleteLogo().subscribe();
    expect(http.expectOne((r) => r.url === `${URL}/logo` && r.method === 'DELETE')).toBeTruthy();
  });

  it('cache : une seule lecture pour toutes les factures ; pas d’appel du logo s’il n’y en a pas', async () => {
    const first = firstValueFrom(store.load());
    const second = firstValueFrom(store.load());
    http.expectOne(URL).flush(response(false));
    http.expectNone(`${URL}/logo`);

    expect((await first).logoUrl).toBeNull();
    expect((await second).settings.appearance.template).toBe('MODERN');
    await firstValueFrom(store.load());
    http.expectNone(URL);
  });

  it('cache : logo lu en binaire puis converti pour l’impression et le PDF', async () => {
    const loaded = firstValueFrom(store.load());
    http.expectOne(URL).flush(response(true));
    http.expectOne(`${URL}/logo`).flush(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }));
    expect((await loaded).logoUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('cache : un échec n’est pas mémorisé, l’appel suivant réessaie', async () => {
    const failed = firstValueFrom(store.load());
    http.expectOne(URL).flush({ message: 'down' }, { status: 503, statusText: 'Unavailable' });
    await expect(failed).rejects.toBeTruthy();

    const retried = firstValueFrom(store.load());
    http.expectOne(URL).flush(response(false));
    expect((await retried).settings).toBeTruthy();
  });

  it('cache : la configuration enregistrée remplace l’ancienne sans nouvel appel', async () => {
    const saved = { ...response(false), company: { ...defaultInvoiceSettings().company, companyName: 'Boutique' } };
    store.set({ settings: saved, logoUrl: null });
    expect((await firstValueFrom(store.load())).settings.company.companyName).toBe('Boutique');
    http.expectNone(URL);
  });
});
