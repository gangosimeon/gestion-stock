import { HttpRequest } from '@angular/common/http';

import { environment } from '../../../environments/environment';

/**
 * Aiguillage de la migration progressive : une requête n'est servie par le backend simulé
 * que si son chemin relève d'un préfixe encore mocké. Tout le reste part vers Spring Boot.
 */
export function isMockedUrl(url: string, mockedPrefixes: readonly string[]): boolean {
  const path = pathOf(url);
  return mockedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    // URL relative : on retire la query string éventuelle.
    return url.split('?')[0];
  }
}

/** `true` si la requête sera servie par le backend simulé (sinon elle part vers Spring Boot). */
export function isServedByMock(req: HttpRequest<unknown>): boolean {
  return (
    environment.useMocks &&
    isMockedUrl(req.url, environment.mockedPrefixes)
  );
}
