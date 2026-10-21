import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CompanyBranding } from './branding.model';
import { BrandingService, luminance, mix } from './branding.service';

const API = environment.apiUrl;

function branding(code: string, overrides: Partial<CompanyBranding> = {}): CompanyBranding {
  return {
    companyCode: code,
    companyName: `Entreprise ${code}`,
    primaryColor: '#112233',
    secondaryColor: '#7C3AED',
    accentColor: '#16A34A',
    sidebarColor: '#0B1F3A',
    headerColor: '#FFFFFF',
    buttonColor: '#112233',
    linkColor: '#112233',
    themeMode: 'LIGHT',
    highContrast: false,
    logoUrl: null,
    ...overrides
  };
}

describe('BrandingService (thème par entreprise)', () => {
  let service: BrandingService;
  let http: HttpTestingController;
  const root = document.documentElement;
  const css = (name: string) => root.style.getPropertyValue(name);

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(BrandingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.clear();
    http.verify();
  });

  it('applique les couleurs de l’entreprise en variables CSS, avec nuances dérivées', () => {
    service.apply(branding('a', { themeMode: 'DARK', highContrast: true }));
    expect(css('--company-primary')).toBe('#112233');
    expect(css('--company-primary-soft')).toBe(mix('#112233', '#FFFFFF', 0.92));
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(root.getAttribute('data-contrast')).toBe('high');
  });

  it('valeur invalide (CSS injecté) : jamais appliquée, couleur par défaut à la place', () => {
    service.apply(branding('a', { primaryColor: 'red; background: url(x)', linkColor: 'javascript:alert(1)' }));
    expect(css('--company-primary')).toBe('#2563EB');
    expect(css('--company-link')).toBe('#2563EB');
  });

  it('le thème de A ne survit pas au passage à B ni à la déconnexion', async () => {
    service.apply(branding('a'));
    const loaded = firstValueFrom(service.load());
    http.expectOne(`${API}/company/branding`).flush(branding('b', { primaryColor: '#445566', logoUrl: '/api/public/companies/b/logo?v=1' }));
    await loaded;
    expect(css('--company-primary')).toBe('#445566');
    expect(service.current?.companyCode).toBe('b');
    expect(service.logoSrc(service.current)).toContain('/api/public/companies/b/logo');

    service.clear();
    expect(css('--company-primary')).toBe('');
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(sessionStorage.getItem('company_branding')).toBeNull();
  });

  it('au démarrage, le cache n’est réutilisé que pour l’entreprise de la session', async () => {
    const loaded = firstValueFrom(service.load());
    http.expectOne(`${API}/company/branding`).flush(branding('a'));
    await loaded;
    service.clear();
    sessionStorage.setItem('company_branding', JSON.stringify(branding('a')));

    service.restore('b');
    expect(css('--company-primary')).toBe('');
    sessionStorage.setItem('company_branding', JSON.stringify(branding('a')));
    service.restore('a');
    expect(css('--company-primary')).toBe('#112233');
  });

  it('texte lisible : clair sur fond sombre, sombre sur fond clair', () => {
    service.apply(branding('a', { sidebarColor: '#F8FAFC', headerColor: '#0B1F3A' }));
    expect(css('--company-sidebar-title')).toBe('#0F172A');
    expect(css('--company-header-text')).toBe('#FFFFFF');
    expect(luminance('#FFFFFF')).toBeGreaterThan(luminance('#000000'));
  });

  it('marque publique : entreprise inconnue → null, aucune erreur', async () => {
    const result = firstValueFrom(service.loadPublic('inconnue'));
    http.expectOne(`${API}/public/companies/inconnue/branding`).flush({}, { status: 404, statusText: 'Not Found' });
    expect(await result).toBeNull();
  });
});
