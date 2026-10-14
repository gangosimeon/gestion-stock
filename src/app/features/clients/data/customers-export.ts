import { Observable, firstValueFrom } from 'rxjs';

import { Customer } from '../../../core/models/customer.model';
import { PageRequest } from '../../../core/services/page-params';
import { PaginatedResult } from '../../../core/services/products-api.service';

/** Taille de page maximale acceptée par le backend. */
const EXPORT_PAGE_SIZE = 200;

/**
 * Tous les clients correspondant à la recherche, aux filtres et au tri affichés : les pages
 * sont demandées une à une au backend (qui reste seul juge des filtres, dont la dette).
 */
export async function fetchAllCustomers(
  fetchPage: (page: PageRequest) => Observable<PaginatedResult<Customer>>,
  q: string,
  sort: string[]
): Promise<Customer[]> {
  const all: Customer[] = [];
  for (let page = 0; ; page++) {
    const result = await firstValueFrom(fetchPage({ q, page, size: EXPORT_PAGE_SIZE, sort }));
    all.push(...result.items);
    if (result.items.length < EXPORT_PAGE_SIZE || all.length >= result.total) return all;
  }
}

const TYPE_LABELS: Record<string, string> = { INDIVIDUAL: 'Particulier', COMPANY: 'Entreprise' };
const PRICE_LABELS: Record<string, string> = { RETAIL: 'Prix de détail', WHOLESALE: 'Prix de gros' };

/** Lignes de la feuille Excel : en-têtes en français, montants numériques (calculables). */
export function customersToRows(customers: readonly Customer[]): Record<string, string | number>[] {
  return customers.map((c) => ({
    Code: c.code ?? '',
    Nom: c.name,
    Type: c.type ? (TYPE_LABELS[c.type] ?? c.type) : '',
    Téléphone: c.phone ?? '',
    Email: c.email ?? '',
    Adresse: c.address ?? '',
    Ville: c.city ?? '',
    Tarif: c.priceCategory ? (PRICE_LABELS[c.priceCategory] ?? c.priceCategory) : '',
    'Limite crédit': c.creditLimit ?? 0,
    Dette: c.balance ?? 0,
    'Crédit disponible': c.availableCredit ?? 0,
    'Délai de paiement (j)': c.paymentTermsDays ?? 0,
    Statut: c.active === false ? 'Désactivé' : 'Actif'
  }));
}
