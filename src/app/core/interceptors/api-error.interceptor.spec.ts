import { HttpErrorResponse } from '@angular/common/http';

import { toMessage } from './api-error.interceptor';

const err = (status: number, error: unknown = null) => new HttpErrorResponse({ status, error, url: '/api/x' });

describe('Messages d’erreur HTTP', () => {
  it('réseau coupé ou serveur arrêté : message clair, sans détail technique', () => {
    expect(toMessage(err(0))).toContain('Serveur injoignable');
  });

  it('401 / 403 : message du backend, sinon message par défaut', () => {
    expect(toMessage(err(401))).toContain('Session expirée');
    expect(toMessage(err(403, { message: 'Permission sale:cancel requise.' }))).toBe('Permission sale:cancel requise.');
    expect(toMessage(err(403))).toContain('Accès refusé');
  });

  it('proxy indisponible (502/503/504) et erreur interne avec sa référence', () => {
    expect(toMessage(err(503, '<html>Bad gateway</html>'))).toContain('momentanément indisponible');
    expect(toMessage(err(500, { message: 'Une erreur interne est survenue.', traceId: 'abc123' }))).toBe(
      'Une erreur interne est survenue. (référence : abc123)'
    );
  });

  it('erreur métier : message du backend tel quel', () => {
    expect(toMessage(err(422, { message: 'Stock insuffisant.' }))).toBe('Stock insuffisant.');
  });
});
