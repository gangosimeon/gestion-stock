import { HttpParams } from '@angular/common/http';

/** Page demandée au backend : recherche texte, numéro de page (à partir de 0), taille, tri `champ,asc|desc`. */
export interface PageRequest {
  q?: string;
  page: number;
  size: number;
  sort?: string[];
}

type ParamValue = string | number | boolean | null | undefined | readonly (string | number)[];

/**
 * Paramètres d'une liste paginée côté serveur ; les critères vides (null, '', 'ALL' non compris)
 * ne sont pas envoyés.
 */
export function pageParams(page: PageRequest, filters: Record<string, ParamValue> = {}): HttpParams {
  let params = new HttpParams().set('page', page.page).set('size', page.size);
  if (page.q?.trim()) params = params.set('q', page.q.trim());
  for (const s of page.sort ?? []) params = params.append('sort', s);
  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined || value === '') continue;
    if (Array.isArray(value)) {
      for (const v of value) params = params.append(key, v);
    } else {
      params = params.set(key, value as string | number | boolean);
    }
  }
  return params;
}

/** Début (00:00, heure locale) d'un jour `AAAA-MM-JJ`, en instant ISO ; null sans date. */
export function dayStartIso(day: string | null | undefined): string | null {
  if (!day) return null;
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toISOString();
}

/** Fin (23:59:59.999, heure locale) d'un jour `AAAA-MM-JJ`, en instant ISO : le jour choisi est inclus. */
export function dayEndIso(day: string | null | undefined): string | null {
  if (!day) return null;
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}
