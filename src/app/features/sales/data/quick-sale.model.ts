import { Product } from '../../../core/models/product.model';

/**
 * Caisse rapide : recherche tolérante, articles favoris appris sur l'appareil, mode de caisse
 * mémorisé. Calculs d'écran uniquement : la vente suit les mêmes règles que la caisse complète.
 */

/** Texte comparable : minuscules, sans accents, espaces réduits. */
export function normalizeSearch(text: string | null | undefined): string {
  return (text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Articles correspondant à la saisie : chaque mot doit apparaître dans le nom, la référence ou le
 * code-barres, dans n'importe quel ordre (« cpj ciment » trouve « Ciment CPJ-45 »). Les articles
 * dont le nom commence par la saisie passent en premier.
 */
export function searchProducts(products: readonly Product[], term: string, limit = 30): Product[] {
  const query = normalizeSearch(term);
  if (!query) return [];
  const words = query.split(' ');
  return products
    .map((p) => {
      const name = normalizeSearch(p.name);
      const haystack = `${name} ${normalizeSearch(p.sku)} ${normalizeSearch(p.barcode)}`;
      return { p, name, match: words.every((w) => haystack.includes(w)) };
    })
    .filter((x) => x.match)
    .sort((a, b) => Number(b.name.startsWith(query)) - Number(a.name.startsWith(query)) || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((x) => x.p);
}

/**
 * Article désigné sans ambiguïté par la saisie validée (Entrée, ou lecteur de codes-barres) : code-barres
 * ou référence identique, sinon résultat unique de la recherche.
 */
export function exactProduct(products: readonly Product[], term: string): Product | null {
  const query = normalizeSearch(term);
  if (!query) return null;
  const exact = products.find((p) => normalizeSearch(p.barcode) === query || normalizeSearch(p.sku) === query);
  if (exact) return exact;
  const found = searchProducts(products, term, 2);
  return found.length === 1 ? found[0] : null;
}

// --- Favoris : articles les plus vendus sur cet appareil, par dépôt ----------------------------

/** Accès au stockage local, remplaçable dans les tests. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Stockage du navigateur ; indisponible (navigation privée) : rien n'est retenu, sans erreur. */
export const browserStore: KeyValueStore = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Stockage plein ou interdit : les favoris ne sont simplement pas mis à jour.
    }
  }
};

const FAVORITES_PREFIX = 'geststock.quickSale.favorites.';

/** Au-delà, les articles les moins vendus sont oubliés (taille du stockage maîtrisée). */
const MAX_TRACKED = 60;

function readCounts(store: KeyValueStore, warehouseId: string): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(store.getItem(FAVORITES_PREFIX + warehouseId) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const counts: Record<string, number> = {};
    for (const [id, n] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof n === 'number' && Number.isFinite(n) && n > 0) counts[id] = n;
    }
    return counts;
  } catch {
    return {};
  }
}

/** Retient les articles d'une vente encaissée (une fois par vente et par article). */
export function recordSoldProducts(store: KeyValueStore, warehouseId: string, productIds: readonly string[]): void {
  if (!warehouseId || productIds.length === 0) return;
  const counts = readCounts(store, warehouseId);
  for (const id of new Set(productIds)) counts[id] = (counts[id] ?? 0) + 1;
  const kept = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TRACKED);
  store.setItem(FAVORITES_PREFIX + warehouseId, JSON.stringify(Object.fromEntries(kept)));
}

/**
 * Articles proposés en tuiles : les plus vendus sur cet appareil, complétés par des articles en stock
 * (premier usage) ; articles actifs du catalogue courant seulement.
 */
export function favoriteProducts(
  store: KeyValueStore,
  warehouseId: string | null,
  products: readonly Product[],
  limit = 12
): Product[] {
  const counts = warehouseId ? readCounts(store, warehouseId) : {};
  const byId = new Map(products.map((p) => [p.id, p]));
  const favorites = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => byId.get(id))
    .filter((p): p is Product => !!p)
    .slice(0, limit);
  if (favorites.length >= limit) return favorites;
  const chosen = new Set(favorites.map((p) => p.id));
  const fillers = products
    .filter((p) => !chosen.has(p.id) && p.stockQuantity > 0)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit - favorites.length);
  return [...favorites, ...fillers];
}

// --- Mode de caisse mémorisé sur l'appareil -----------------------------------------------------

export type SalesMode = 'quick' | 'full';

const MODE_KEY = 'geststock.salesMode';

export function preferredSalesMode(store: KeyValueStore = browserStore): SalesMode {
  return store.getItem(MODE_KEY) === 'quick' ? 'quick' : 'full';
}

export function rememberSalesMode(mode: SalesMode, store: KeyValueStore = browserStore): void {
  store.setItem(MODE_KEY, mode);
}
