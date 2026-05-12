/**
 * query.engine.ts
 * Moteur de requêtes générique pour les listes mock.
 *
 * Fonctionnalités :
 *  - Pagination  (page, pageSize)
 *  - Recherche   (search + searchFields)
 *  - Filtres     (tout param non réservé → comparaison exacte ou multi-valeur)
 *  - Filtres plage (paramMin/paramMax)
 *  - Tri         (sort, order: asc | desc)
 */

import { HttpParams } from '@angular/common/http';

// ─── Types publics ────────────────────────────────────────────────────────────

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface RangeFilter<T> {
  field: keyof T;
  minParam: string;
  maxParam: string;
}

export interface QueryOptions<T> {
  /** Champs sur lesquels la recherche textuelle s'applique */
  searchFields?: (keyof T)[];
  /** Filtres par plage de valeur (ex: price_min, price_max) */
  rangeFilters?: RangeFilter<T>[];
  /**
   * Champs sur lesquels les params sont traités comme filtres exacts.
   * Par défaut : tout param non réservé qui correspond à une clé de l'objet.
   */
  filterFields?: (keyof T)[];
  /** Tri par défaut si aucun param sort n'est fourni */
  defaultSort?: { field: keyof T; order: 'asc' | 'desc' };
}

// ─── Params réservés (ne sont pas traités comme filtres) ─────────────────────

const RESERVED_PARAMS = new Set([
  'page', 'pageSize', 'size', 'sort', 'order', 'search',
  'dateFrom', 'dateTo', 'warehouseId', '_t'
]);

// ─── Moteur principal ─────────────────────────────────────────────────────────

/**
 * Applique recherche, filtres, tri et pagination sur un tableau source.
 * @param source Données brutes (non mutées)
 * @param params Paramètres HTTP de la requête
 * @param opts   Options de configuration de la requête
 */
export function applyQuery<T extends Record<string, unknown>>(
  source: readonly T[],
  params: HttpParams,
  opts: QueryOptions<T> = {}
): PagedResult<T> {
  let items: T[] = [...source];

  // ── 1. Recherche textuelle ───────────────────────────────────────────────
  const searchTerm = params.get('search');
  if (searchTerm && opts.searchFields?.length) {
    const q = searchTerm.toLowerCase().trim();
    items = items.filter((item) =>
      opts.searchFields!.some((f) =>
        String(item[f as string] ?? '').toLowerCase().includes(q)
      )
    );
  }

  // ── 2. Filtres exacts ────────────────────────────────────────────────────
  const allowedFilters: Set<string> = opts.filterFields
    ? new Set(opts.filterFields as string[])
    : new Set(); // utilisé en mode auto-detect

  params.keys()
    .filter((k) => !RESERVED_PARAMS.has(k))
    .forEach((key) => {
      const rawVal = params.get(key);
      if (rawVal === null || rawVal === '') return;

      const isAllowed = opts.filterFields
        ? allowedFilters.has(key)
        : items.length === 0 || key in (items[0] as object);

      if (!isAllowed) return;

      // Supporte les valeurs multi-valeur séparées par virgule (ex: status=A,B)
      const vals = rawVal.split(',').map((v) => v.trim());
      items = items.filter((item) =>
        vals.includes(String(item[key as string] ?? ''))
      );
    });

  // ── 3. Filtres par plage ─────────────────────────────────────────────────
  if (opts.rangeFilters) {
    for (const rf of opts.rangeFilters) {
      const min = params.get(rf.minParam);
      const max = params.get(rf.maxParam);
      if (min !== null) {
        const minNum = Number(min);
        items = items.filter((item) => Number(item[rf.field as string] ?? 0) >= minNum);
      }
      if (max !== null) {
        const maxNum = Number(max);
        items = items.filter((item) => Number(item[rf.field as string] ?? 0) <= maxNum);
      }
    }
  }

  // ── 4. Tri ───────────────────────────────────────────────────────────────
  const sortField = params.get('sort') ?? (opts.defaultSort?.field as string | undefined);
  const sortOrder = params.get('order') ?? opts.defaultSort?.order ?? 'asc';

  if (sortField) {
    items = [...items].sort((a, b) => {
      const va = a[sortField] ?? '';
      const vb = b[sortField] ?? '';

      // Comparaison numérique si les deux sont des nombres
      const na = Number(va);
      const nb = Number(vb);
      const cmp =
        !isNaN(na) && !isNaN(nb)
          ? na - nb
          : String(va).localeCompare(String(vb), 'fr', { numeric: true, sensitivity: 'base' });

      return sortOrder === 'desc' ? -cmp : cmp;
    });
  }

  // ── 5. Pagination ────────────────────────────────────────────────────────
  const total    = items.length;
  const pageSize = clamp(
    Number(params.get('pageSize') || params.get('size') || 20),
    1, 200
  );
  const pages    = Math.max(Math.ceil(total / pageSize), 1);
  const page     = clamp(Number(params.get('page') || 1), 1, pages);
  const start    = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    pages,
  };
}

// ─── Utilitaire ───────────────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

/**
 * Filtre une liste par plage de dates.
 * @param items     Tableau source
 * @param field     Champ de date ISO dans chaque item
 * @param dateFrom  Date min (chaîne ISO ou null)
 * @param dateTo    Date max (chaîne ISO ou null)
 */
export function filterByDateRange<T extends Record<string, unknown>>(
  items: T[],
  field: keyof T,
  dateFrom: string | null,
  dateTo:   string | null
): T[] {
  if (!dateFrom && !dateTo) return items;
  const from = dateFrom ? new Date(dateFrom).getTime() : -Infinity;
  const to   = dateTo   ? new Date(dateTo).getTime()   : +Infinity;
  return items.filter((item) => {
    const t = new Date(String(item[field as string] ?? '')).getTime();
    return t >= from && t <= to;
  });
}
