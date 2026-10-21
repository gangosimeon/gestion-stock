import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { environment } from '../../../../environments/environment';
import { CompanyDetailComponent } from './company-detail.component';

const API = environment.apiUrl;
const ID = '6b969907-39a6-4ad5-9ab6-8406614b4d9f';

/** Réponse réelle de l'entreprise historique (mode LEGACY, aucun provisionnement). */
const LEGACY = {
  id: ID,
  number: 1,
  code: 'principale',
  legalName: 'Entreprise principale',
  tradeName: 'Entreprise principale',
  sector: null,
  address: null,
  city: null,
  country: null,
  phone: null,
  email: null,
  website: null,
  taxId: null,
  currency: 'FCFA',
  ownerFirstName: null,
  ownerLastName: 'Entreprise principale',
  ownerEmail: null,
  ownerPhone: null,
  adminUsername: 'admin',
  plan: 'STANDARD',
  subscriptionStartsOn: null,
  subscriptionEndsOn: null,
  status: 'ACTIVE',
  statusReason: null,
  createdAt: '2026-10-21T21:24:46.115Z',
  updatedAt: '2026-10-21T21:24:46.115Z',
  database: { name: 'geststock', mode: 'LEGACY' },
  provisioning: null
};

const BRANDING = {
  companyCode: 'principale',
  companyName: 'Entreprise principale',
  primaryColor: '#2563EB',
  secondaryColor: '#7C3AED',
  accentColor: '#16A34A',
  sidebarColor: '#0B1F3A',
  headerColor: '#FFFFFF',
  buttonColor: '#2563EB',
  linkColor: '#2563EB',
  themeMode: 'LIGHT',
  highContrast: false,
  footerText: null,
  companyCanEdit: false,
  logoUrl: null,
  updatedAt: '2026-10-21T21:24:46.115Z'
};

describe('CompanyDetailComponent (fiche entreprise Super Admin)', () => {
  it('affiche la fiche de l’entreprise historique dès la réponse, sans autre action (application sans zone.js)', async () => {
    TestBed.configureTestingModule({
      imports: [CompanyDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: ID }) } } }
      ]
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CompanyDetailComponent);
    fixture.detectChanges();
    http.expectOne(`${API}/platform/companies/${ID}`).flush(LEGACY);
    http.expectOne(`${API}/platform/companies/${ID}/branding`).flush(BRANDING);
    // Comme dans le navigateur (application sans zone.js) : aucun rendu forcé après la réponse.
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Entreprise principale');
    expect(text).toContain('base historique');
    http.match(() => true).forEach((r) => r.flush({ items: [], total: 0 }));
  });
});
