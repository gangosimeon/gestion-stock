import { HttpRequest } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { MOCK_WAREHOUSES } from './mock-db';

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

/**
 * Dépôt simulé correspondant à un dépôt réel (même nom, sans tenir compte de la casse), pour
 * que les écrans encore simulés suivent le magasin choisi. Repli : dépôt principal simulé.
 */
export function mockWarehouseIdFor(warehouseName: string | null | undefined): string {
  const name = (warehouseName ?? '').trim().toLocaleLowerCase('fr');
  return MOCK_WAREHOUSES.find((w) => w.name.toLocaleLowerCase('fr') === name)?.id ?? MOCK_WAREHOUSES[0].id;
}
