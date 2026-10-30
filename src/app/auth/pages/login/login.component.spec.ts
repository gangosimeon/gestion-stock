import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { AuthResponse } from '../../models/auth-response.model';
import { AuthService } from '../../services/auth.service';
import { LoginComponent } from './login.component';

/** Connexion : retour vers l'écran demandé (URL de retour interne, GA1), sinon le tableau de bord. */
describe('LoginComponent : URL de retour', () => {
  function login(returnUrl: string | null): Router {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(returnUrl === null ? {} : { returnUrl }) } }
        }
      ]
    });
    vi.spyOn(TestBed.inject(AuthService), 'login').mockReturnValue(of({} as AuthResponse));
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    fixture.componentInstance.form.patchValue({ username: 'admin', password: 'secret' });
    fixture.componentInstance.submit();
    return router;
  }

  it('retour vers l’écran demandé après la connexion', () => {
    const target = '/integrations/jecreemaboutique/authorize?request_uri=urn%3Aexemple';
    expect(login(target).navigateByUrl).toHaveBeenCalledWith(target);
  });

  it('sans URL de retour : tableau de bord', () => {
    expect(login(null).navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('URL de retour externe : tableau de bord', () => {
    expect(login('https://evil.example/x').navigateByUrl).toHaveBeenCalledWith('/dashboard');
    TestBed.resetTestingModule();
    expect(login('//evil.example/x').navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });
});
