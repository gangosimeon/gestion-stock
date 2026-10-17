import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { InvoiceSettingsResponse, defaultInvoiceSettings } from '../../../core/models/invoice-settings.model';
import { InvoiceSettingsStore } from '../../../core/services/invoice-settings-api.service';
import { InvoiceSettingsPageComponent } from './invoice-settings-page.component';

const URL = `${environment.apiUrl}/settings/invoice`;

function serverState(change: (r: InvoiceSettingsResponse) => void = () => undefined): InvoiceSettingsResponse {
  const r: InvoiceSettingsResponse = { ...defaultInvoiceSettings(), logo: null, updatedAt: '2026-10-16T08:00:00Z' };
  r.company = { ...r.company, companyName: 'Quincaillerie Moderne', phone: '+226 70 12 34 56' };
  change(r);
  return r;
}

/** jsdom ne décode pas les images : la lecture des dimensions est simulée (le serveur revérifie tout). */
function acceptLogos(page: InvoiceSettingsPageComponent): void {
  vi.spyOn(page as unknown as { checkLogo: (f: File) => Promise<string | null> }, 'checkLogo').mockResolvedValue(null);
}

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

// Délai élargi : le premier rendu compile onglets, formulaires et aperçu (plus de 5 s sur un poste chargé).
describe('InvoiceSettingsPageComponent (Paramètres → Configuration de la facture)', { timeout: 20_000 }, () => {
  let http: HttpTestingController;
  let confirmAnswer: boolean;
  let snackbar: { open: ReturnType<typeof vi.fn> };

  function setup(initial: InvoiceSettingsResponse | 'error' = serverState()) {
    confirmAnswer = true;
    snackbar = { open: vi.fn() };
    TestBed.configureTestingModule({
      imports: [InvoiceSettingsPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: MatSnackBar, useValue: snackbar },
        { provide: MatDialog, useValue: { open: vi.fn(() => ({ afterClosed: () => of(confirmAnswer) })) } }
      ]
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(InvoiceSettingsPageComponent);
    fixture.detectChanges();
    const get = http.expectOne((r) => r.url === URL && r.method === 'GET');
    if (initial === 'error') {
      get.flush({ message: 'Service momentanément indisponible.' }, { status: 503, statusText: 'Unavailable' });
    } else {
      get.flush(initial);
    }
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      page: fixture.componentInstance,
      root,
      preview: () => root.querySelector('.preview app-invoice-document')?.textContent?.replace(/\s+/g, ' ') ?? ''
    };
  }

  afterEach(() => http.verify());

  it('chargement : titre, description, formulaire rempli avec la configuration du serveur', () => {
    const { page, root, preview } = setup();
    expect(root.querySelector('h1')?.textContent).toContain('Configuration de la facture');
    expect(root.textContent).toContain('Personnalisez les informations affichées sur vos factures de vente.');
    expect(page.form.controls.company.controls.companyName.value).toBe('Quincaillerie Moderne');
    expect(page.dirty()).toBe(false);
    expect(preview()).toContain('Quincaillerie Moderne');
    expect(preview()).toContain("Aperçu — données d'exemple");
  });

  it('échec du chargement : message explicite et bouton « Réessayer »', () => {
    const { root, page } = setup('error');
    expect(root.querySelector('.error')?.textContent).toContain('indisponible');
    expect(root.querySelector('form')).toBeNull();
    page.load();
    http.expectOne(URL).flush(serverState());
  });

  it('aperçu en direct : chaque modification se voit sans enregistrer', () => {
    const { page, fixture, preview } = setup();
    page.form.controls.company.controls.companyName.setValue('Boutique Awa');
    page.form.controls.header.controls.showPhone.setValue(false);
    page.form.controls.footer.controls.salesTerms.setValue('Marchandise non reprise.');
    page.form.controls.appearance.controls.template.setValue('CLASSIC');
    fixture.detectChanges();

    expect(preview()).toContain('Boutique Awa');
    expect(preview()).not.toContain('+226 70 12 34 56');
    expect(preview()).toContain('Marchandise non reprise.');
    expect(fixture.nativeElement.querySelector('.preview .gsi--classic')).not.toBeNull();
    expect(page.dirty()).toBe(true);
    http.expectNone(URL);
  });

  it('nom complet du signataire : saisi dans la configuration, visible dans l’aperçu et enregistré', async () => {
    const { page, fixture, root } = setup();
    // Onglet « Pied de page » : le champ suit directement celui de la signature.
    const footerTab = Array.from(root.querySelectorAll<HTMLElement>('[role="tab"]')).find((t) =>
      t.textContent?.includes('Pied de page')
    )!;
    footerTab.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const labels = Array.from(root.querySelectorAll('mat-label')).map((l) => l.textContent?.trim());
    const signature = labels.indexOf('Signature (titre au-dessus de l’espace de signature)');
    expect(signature).toBeGreaterThanOrEqual(0);
    expect(labels[signature + 1]).toBe('Nom complet du signataire');

    page.form.controls.footer.controls.signatureText.setValue('Le responsable');
    page.form.controls.footer.controls.signatureName.setValue('Awa Koné');
    fixture.detectChanges();
    expect(root.querySelector('.preview .gsi-signature__name')?.textContent?.trim()).toBe('Awa Koné');

    const saving = page.save();
    const put = http.expectOne((r) => r.url === URL && r.method === 'PUT');
    expect(put.request.body.footer.signatureName).toBe('Awa Koné');
    put.flush(serverState((r) => (r.footer = { ...r.footer, signatureText: 'Le responsable', signatureName: 'Awa Koné' })));
    await saving;
  });

  it('validation : un champ invalide bloque l’enregistrement, sans appel au serveur', async () => {
    const { page, fixture, root } = setup();
    page.form.controls.company.controls.email.setValue('pas-un-email');
    page.form.controls.appearance.controls.primaryColor.setValue('bleu');
    await page.save();
    fixture.detectChanges();

    expect(page.saveError()).toContain('invalides');
    expect(page.fieldError('company', 'email')).toBe('Adresse email invalide.');
    expect(page.fieldError('appearance', 'primaryColor')).toContain('#RRGGBB');
    // Couleur invalide : l'aperçu garde la dernière couleur valide.
    expect(page.previewSettings().appearance.primaryColor).toBe('#1E3A8A');
    expect(root.querySelector('.form__error')).not.toBeNull();
    http.expectNone((r) => r.method === 'PUT');
  });

  it('champs facultatifs : un formulaire vide est valide (rien n’est imposé)', () => {
    const { page } = setup();
    page.form.controls.company.reset(defaultInvoiceSettings().company);
    expect(page.form.valid).toBe(true);
  });

  it('enregistrement : succès annoncé seulement après la réponse du serveur ; pas de double envoi', async () => {
    const { page } = setup();
    page.form.controls.company.controls.companyName.setValue('  Boutique Awa  ');

    const first = page.save();
    const second = page.save(); // double clic
    expect(page.saving()).toBe(true);
    const put = http.expectOne((r) => r.url === URL && r.method === 'PUT');
    expect(put.request.body.company.companyName).toBe('  Boutique Awa  ');
    expect(snackbar.open).not.toHaveBeenCalled();

    put.flush(serverState((r) => (r.company.companyName = 'Boutique Awa')));
    await Promise.all([first, second]);

    expect(snackbar.open).toHaveBeenCalledWith('Configuration de la facture enregistrée.', 'OK', expect.anything());
    expect(page.saving()).toBe(false);
    expect(page.form.controls.company.controls.companyName.value).toBe('Boutique Awa');
    expect(page.dirty()).toBe(false);
    // Les factures utilisent aussitôt la nouvelle configuration.
    let cached = '';
    TestBed.inject(InvoiceSettingsStore).load().subscribe((l) => (cached = l.settings.company.companyName));
    expect(cached).toBe('Boutique Awa');
  });

  it('erreur du serveur : message explicite, modifications conservées', async () => {
    const { page, fixture, root } = setup();
    page.form.controls.company.controls.companyName.setValue('Boutique Awa');
    const saving = page.save();
    http
      .expectOne((r) => r.method === 'PUT')
      .flush(
        { code: 'VALIDATION_FAILED', message: 'Données invalides : company.email adresse invalide' },
        { status: 400, statusText: 'Bad Request' }
      );
    await saving;
    fixture.detectChanges();

    expect(page.saveError()).toContain('Données invalides');
    expect(root.querySelector('.form__error')?.textContent).toContain('company.email');
    expect(page.dirty()).toBe(true);
    expect(snackbar.open).not.toHaveBeenCalledWith('Configuration de la facture enregistrée.', 'OK', expect.anything());
  });

  it('annuler les modifications : retour à la configuration enregistrée', () => {
    const { page } = setup();
    page.form.controls.company.controls.companyName.setValue('Autre nom');
    page.cancelChanges();
    expect(page.form.controls.company.controls.companyName.value).toBe('Quincaillerie Moderne');
    expect(page.dirty()).toBe(false);
  });

  it('réinitialiser : demande confirmation ; sans confirmation, rien n’est envoyé', async () => {
    const { page } = setup();
    confirmAnswer = false;
    await page.reset();
    http.expectNone(`${URL}/reset`);

    confirmAnswer = true;
    const resetting = page.reset();
    await flushMicrotasks();
    http.expectOne(`${URL}/reset`).flush({ ...defaultInvoiceSettings(), logo: null, updatedAt: '2026-10-16T09:00:00Z' });
    await resetting;
    expect(page.form.controls.company.controls.companyName.value).toBe('');
    expect(snackbar.open).toHaveBeenCalledWith('Configuration réinitialisée.', 'OK', expect.anything());
  });

  it('logo : format ou poids refusé avant envoi', async () => {
    const { page } = setup();
    const gif = new File(['GIF89a'], 'logo.gif', { type: 'image/gif' });
    await page.onLogoSelected({ target: { files: [gif], value: '' } } as unknown as Event);
    expect(page.logoError()).toContain('PNG ou JPEG');

    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'logo.png', { type: 'image/png' });
    await page.onLogoSelected({ target: { files: [big], value: '' } } as unknown as Event);
    expect(page.logoError()).toContain('2 Mo');
    expect(page.logo().kind).toBe('saved');
  });

  it('logo : aperçu immédiat, envoi seulement à l’enregistrement, après la configuration', async () => {
    const { page, fixture, root } = setup();
    acceptLogos(page);
    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'logo.png', { type: 'image/png' });
    await page.onLogoSelected({ target: { files: [png], value: '' } } as unknown as Event);
    fixture.detectChanges();

    expect(page.logo().kind).toBe('pending');
    expect(page.dirty()).toBe(true);
    expect(root.querySelector<HTMLImageElement>('.preview .gsi-logo')?.src).toMatch(/^data:image\/png/);
    http.expectNone(`${URL}/logo`);

    const saving = page.save();
    http.expectOne((r) => r.method === 'PUT').flush(serverState());
    await flushMicrotasks();
    const upload = http.expectOne((r) => r.url === `${URL}/logo` && r.method === 'POST');
    expect(((upload.request.body as FormData).get('file') as File).name).toBe('logo.png');
    upload.flush({ contentType: 'image/png', sizeBytes: 4, width: 1, height: 1, sha256: 'a'.repeat(64), updatedAt: '' });
    await saving;

    expect(page.logo().kind).toBe('saved');
    expect(snackbar.open).toHaveBeenCalledWith('Configuration de la facture enregistrée.', 'OK', expect.anything());
  });

  it('logo : échec de l’envoi signalé, sans annoncer de succès', async () => {
    const { page } = setup();
    acceptLogos(page);
    const png = new File([new Uint8Array([0x89, 0x50])], 'logo.png', { type: 'image/png' });
    await page.onLogoSelected({ target: { files: [png], value: '' } } as unknown as Event);

    const saving = page.save();
    http.expectOne((r) => r.method === 'PUT').flush(serverState());
    await flushMicrotasks();
    http
      .expectOne((r) => r.url === `${URL}/logo`)
      .flush({ code: 'INVALID_LOGO', message: 'Image illisible ou endommagée.' }, { status: 400, statusText: 'Bad Request' });
    await saving;

    expect(page.saveError()).toContain('le logo n’a pas pu l’être');
    expect(page.saveError()).toContain('Image illisible');
    expect(snackbar.open).not.toHaveBeenCalledWith('Configuration de la facture enregistrée.', 'OK', expect.anything());
  });

  it('logo : retrait appliqué à l’enregistrement', async () => {
    const withLogo = serverState((r) => {
      r.logo = { contentType: 'image/png', sizeBytes: 3, width: 1, height: 1, sha256: 'b'.repeat(64), updatedAt: '' };
    });
    const { page } = setup(withLogo);
    http.expectOne((r) => r.url === `${URL}/logo` && r.method === 'GET').flush(new Blob([new Uint8Array([1])], { type: 'image/png' }));
    await vi.waitFor(() => expect(page.hasLogo()).toBe(true));

    page.removeLogo();
    expect(page.hasLogo()).toBe(false);
    const saving = page.save();
    http.expectOne((r) => r.method === 'PUT').flush(withLogo);
    await flushMicrotasks();
    http.expectOne((r) => r.url === `${URL}/logo` && r.method === 'DELETE').flush({ ok: true });
    await saving;
    expect(page.logo()).toEqual({ kind: 'saved', url: null });
  });
});
