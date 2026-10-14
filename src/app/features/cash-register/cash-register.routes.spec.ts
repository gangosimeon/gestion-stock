import { TestBed } from '@angular/core/testing';
import { Route } from '@angular/router';

import { permissionGuard } from '../../auth/guards/permission.guard';
import { AuthService } from '../../auth/services/auth.service';
import { CASH_REGISTER_ROUTES } from './cash-register.routes';

/** Entrée de l'onglet Caisse selon les droits : opérer une caisse, ou seulement consulter. */
function landingFor(permissions: string[]): string {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: AuthService, useValue: { hasPermission: (p: string) => permissions.includes(p) } }]
  });
  const redirect = CASH_REGISTER_ROUTES.find((r) => r.path === '')?.redirectTo as () => string;
  return TestBed.runInInjectionContext(() => redirect());
}

function route(path: string): Route | undefined {
  return CASH_REGISTER_ROUTES.find((r) => r.path === path);
}

describe('CASH_REGISTER_ROUTES', () => {
  it("avec cash:operate : l'onglet ouvre la page d'ouverture", () => {
    expect(landingFor(['cash:operate'])).toBe('open');
    expect(landingFor(['cash:operate', 'cash:read'])).toBe('open');
  });

  it("avec seulement cash:read : l'onglet ouvre directement l'historique", () => {
    expect(landingFor(['cash:read'])).toBe('history');
  });

  it('ouverture et fermeture exigent cash:operate ; historique ouvert à tout accès à la caisse', () => {
    for (const path of ['open', 'close']) {
      expect(route(path)?.canMatch).toContain(permissionGuard);
      expect(route(path)?.data?.['permissions']).toEqual(['cash:operate']);
    }
    expect(route('history')?.canMatch).toBeUndefined();
  });
});
