import { HttpErrorResponse } from '@angular/common/http';

import { consentError, isSafeShopRedirect, scopeLabel } from './consent';

/** Libellés, messages d'erreur et URL de retour vers la boutique de l'écran de consentement (GA1). */
describe('Consentement : libellés et contrôles', () => {
  it.each(['catalog:read', 'catalog:match', 'price:propose', 'stock:read', 'orders:read', 'orders:write'])(
    'portée %s : libellé en français, sans le code technique',
    (scope) => {
      const label = scopeLabel(scope);
      expect(label).not.toContain(scope);
      expect(label.length).toBeGreaterThan(15);
    }
  );

  it('portée inconnue : libellé générique, sans le code technique', () => {
    expect(scopeLabel('inventory:write')).not.toContain('inventory:write');
  });

  it.each([
    'https://www.jecreemaboutique.com/integrations/geststock/callback?code=abc&state=xyz&iss=geststock',
    'https://shop.example/cb?error=access_denied&state=xyz'
  ])('URL https acceptée : %s', (url) => {
    expect(isSafeShopRedirect(url, false)).toBe(true);
  });

  it('http://localhost accepté en développement seulement', () => {
    expect(isSafeShopRedirect('http://localhost:4200/cb?code=1', true)).toBe(true);
    expect(isSafeShopRedirect('http://127.0.0.1:4200/cb?code=1', true)).toBe(true);
    expect(isSafeShopRedirect('http://localhost:4200/cb?code=1', false)).toBe(false);
  });

  it.each([
    ['http hors localhost', 'http://shop.example/cb'],
    ['http hors localhost en développement', 'http://localhost.evil.example/cb'],
    ['javascript:', 'javascript:alert(1)'],
    ['data:', 'data:text/html,x'],
    ['relative', '/dashboard'],
    ['protocole relatif', '//shop.example/cb'],
    ['identifiants dans l’URL', 'https://user:pass@shop.example/cb'],
    ['caractère de contrôle', 'https://shop.example/\ncb'],
    ['absente', null],
    ['vide', '']
  ])('URL refusée (%s)', (_label, url) => {
    expect(isSafeShopRedirect(url, true)).toBe(false);
  });

  function error(status: number, code?: string): HttpErrorResponse {
    return new HttpErrorResponse({ status, error: code ? { code, message: 'serveur' } : null });
  }

  it.each([
    [error(404, 'AUTHORIZATION_REQUEST_NOT_FOUND'), 'Recommencez depuis votre boutique', false],
    [error(410, 'AUTHORIZATION_REQUEST_EXPIRED'), 'Recommencez depuis votre boutique', false],
    [error(409, 'AUTHORIZATION_REQUEST_ALREADY_DECIDED'), 'déjà été traitée', false],
    [error(409, 'SHOP_ALREADY_LINKED'), 'déjà liée', false],
    [error(422, 'LINK_CURRENCY_UNSUPPORTED'), 'devise', false],
    [error(400, 'UNKNOWN_WAREHOUSE'), 'dépôt', true],
    [error(403, 'WAREHOUSE_ACCESS_DENIED'), 'dépôt', true],
    [error(403, 'WAREHOUSE_INACTIVE'), 'dépôt', true],
    [error(401), 'session a expiré', false],
    [error(403), 'Seul un administrateur', false],
    [error(0), 'connexion', true],
    [error(500), 'Réessayez', true]
  ])('erreur %#', (err, expected, retryable) => {
    const result = consentError(err);
    expect(`${result.message} ${result.action}`).toContain(expected);
    expect(result.retryable).toBe(retryable);
  });
});
