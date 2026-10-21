import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { environment } from '../../../environments/environment';
import { ActivateComponent } from '../../auth/pages/activate/activate.component';
import { CompanyProfilePageComponent } from './company-profile-page.component';

const API = environment.apiUrl;

/** Application sans zone.js : chaque écran doit s'afficher dès la réponse, sans action de l'utilisateur. */
describe('Écrans multi-entreprises (rendu après réponse, sans zone.js)', () => {
  it('« Mon entreprise » affiche le profil dès sa réception', async () => {
    TestBed.configureTestingModule({
      imports: [CompanyProfilePageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations()]
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CompanyProfilePageComponent);
    fixture.detectChanges();
    http.expectOne(`${API}/company/profile`).flush({
      code: 'principale',
      legalName: 'Optique Principale SARL',
      tradeName: 'Optique Principale',
      currency: 'FCFA',
      plan: 'STANDARD',
      branding: { companyCode: 'principale', companyName: 'Optique Principale', companyCanEdit: false }
    });
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Optique Principale SARL');
    expect(text).toContain('gérés par GestStock');
  });

  it('activation : écran de confirmation dès la réponse du serveur', async () => {
    TestBed.configureTestingModule({
      imports: [ActivateComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ company: 'principale', token: 'jeton' }) } }
        }
      ]
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ActivateComponent);
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({ password: 'Nouveau2026', confirm: 'Nouveau2026' });
    fixture.componentInstance.submit();
    http.expectOne(`${API}/auth/activate`).flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Mot de passe enregistré');
  });
});
