import { HttpClient, HttpContext, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';

import { SILENT_API_ERROR, apiErrorInterceptor, toMessage } from './api-error.interceptor';

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

describe('Bandeau global des erreurs HTTP', () => {
  function call(context?: HttpContext): { shown: string[]; failed: unknown[] } {
    const shown: string[] = [];
    const failed: unknown[] = [];
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: MatSnackBar, useValue: { open: (message: string) => void shown.push(message) } }
      ]
    });
    TestBed.inject(HttpClient).get('/api/x', { context }).subscribe({ error: (e: unknown) => void failed.push(e) });
    TestBed.inject(HttpTestingController).expectOne('/api/x').flush({ message: 'Refusé.' }, { status: 409, statusText: 'Conflict' });
    return { shown, failed };
  }

  it('par défaut : bandeau affiché, erreur transmise', () => {
    const { shown, failed } = call();
    expect(shown).toEqual(['Refusé.']);
    expect(failed.length).toBe(1);
  });

  it('SILENT_API_ERROR : aucun bandeau, erreur toujours transmise à l’écran', () => {
    const { shown, failed } = call(new HttpContext().set(SILENT_API_ERROR, true));
    expect(shown).toEqual([]);
    expect(failed.length).toBe(1);
  });
});
