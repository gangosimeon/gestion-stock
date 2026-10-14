import { FormControl, FormGroup } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import {
  Observable,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  merge,
  of,
  shareReplay,
  startWith,
  switchMap,
  tap
} from 'rxjs';

import { PageRequest } from '../../core/services/page-params';
import { PaginatedResult } from '../../core/services/products-api.service';

/** Requête d'une page : recherche texte, filtres, page (à partir de 0), taille et tri (`champ,asc`). */
export interface ServerQuery<F> extends PageRequest {
  q: string;
  filters: F;
  sort: string[];
}

export interface ServerTableState<T> {
  rows: T[];
  total: number;
  loading: boolean;
  error: string | null;
}

export interface ServerTableOptions<G extends FormGroup> {
  /** Filtres de l'écran : tout changement relance la recherche à la première page. */
  filters?: G;
  /** Colonnes triables → champ de tri du backend ; les autres colonnes ne trient pas. */
  sortFields?: Record<string, string>;
  pageSize?: number;
  /** Rechargement demandé de l'extérieur (après création, modification, suppression…). */
  reload$?: Observable<unknown>;
}

/**
 * Modèle de tableau paginé côté serveur : recherche, filtres, tri et pagination sont envoyés au
 * backend, qui ne renvoie que la page affichée et le total.
 *
 * ```ts
 * readonly table = new ServerTable<Product, typeof this.filters>(
 *   (query) => this.api.search(query), { filters: this.filters, sortFields: { name: 'name' } });
 * ```
 * ```html
 * @if (table.state$ | async; as s) {
 *   <table mat-table [dataSource]="s.rows" matSort (matSortChange)="table.onSort($event)">…</table>
 *   <mat-paginator [length]="s.total" [pageIndex]="table.pageIndex" [pageSize]="table.pageSize"
 *     [pageSizeOptions]="table.pageSizeOptions" (page)="table.onPage($event)" showFirstLastButtons />
 * }
 * ```
 */
export class ServerTable<T, G extends FormGroup = FormGroup> {
  readonly search = new FormControl('', { nonNullable: true });
  readonly filters: G;
  readonly pageSizeOptions = [10, 25, 50, 100];

  pageIndex = 0;
  pageSize: number;

  private sort: string[] = [];
  private readonly sortFields: Record<string, string>;
  private readonly trigger$ = new Subject<void>();
  private last: ServerTableState<T> = { rows: [], total: 0, loading: true, error: null };
  /** Valeurs des filtres à la création : cible de {@link reset} et référence de {@link isFiltered}. */
  private readonly initialFilters: unknown;

  readonly state$: Observable<ServerTableState<T>>;

  /**
   * {@link isFiltered} sous forme de flux, pour l'affichage (bouton « Réinitialiser ») : émet à
   * chaque saisie, changement de filtre ou réinitialisation. Compatible OnPush via `async`.
   */
  readonly filtered$: Observable<boolean>;
  private readonly resetDone$ = new Subject<void>();

  constructor(
    fetch: (query: ServerQuery<ReturnType<G['getRawValue']>>) => Observable<PaginatedResult<T>>,
    options: ServerTableOptions<G> = {}
  ) {
    this.filters = options.filters ?? (new FormGroup({}) as unknown as G);
    this.initialFilters = this.filters.getRawValue();
    this.filtered$ = merge(this.search.valueChanges, this.filters.valueChanges, this.resetDone$).pipe(
      startWith(null),
      map(() => this.isFiltered),
      distinctUntilChanged()
    );
    this.sortFields = options.sortFields ?? {};
    this.pageSize = options.pageSize ?? 10;

    const criteria$ = merge(
      this.search.valueChanges.pipe(debounceTime(300), map((v) => v.trim()), distinctUntilChanged()),
      this.filters.valueChanges.pipe(debounceTime(150))
    ).pipe(tap(() => (this.pageIndex = 0)));

    this.state$ = merge(criteria$, this.trigger$, options.reload$ ?? of()).pipe(
      startWith(null),
      switchMap(() => {
        const query: ServerQuery<ReturnType<G['getRawValue']>> = {
          q: this.search.value.trim(),
          filters: this.filters.getRawValue(),
          page: this.pageIndex,
          size: this.pageSize,
          sort: this.sort
        };
        return fetch(query).pipe(
          map((r): ServerTableState<T> => ({ rows: r.items, total: r.total, loading: false, error: null })),
          tap((s) => this.backIfPageEmptied(s)),
          catchError((e: unknown) =>
            of<ServerTableState<T>>({
              ...this.last,
              loading: false,
              error: e instanceof Error ? e.message : 'Erreur de chargement'
            })
          ),
          // Pendant le chargement, la page précédente reste affichée (pas de clignotement).
          startWith<ServerTableState<T>>({ ...this.last, loading: true, error: null })
        );
      }),
      tap((s) => (this.last = s)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.trigger$.next();
  }

  /** Tri d'une colonne connue du backend ; sinon (ou sans direction) tri par défaut du backend. */
  onSort(s: Sort): void {
    const field = this.sortFields[s.active];
    this.sort = field && s.direction ? [`${field},${s.direction}`] : [];
    this.pageIndex = 0;
    this.trigger$.next();
  }

  /** Tri demandé au backend (`champ,asc|desc`), vide : tri par défaut. */
  get currentSort(): string[] {
    return this.sort;
  }

  reload(): void {
    this.trigger$.next();
  }

  /** Recherche saisie ou filtre différent de sa valeur initiale : il y a quelque chose à réinitialiser. */
  get isFiltered(): boolean {
    return this.search.value.trim() !== '' || !sameValue(this.filters.getRawValue(), this.initialFilters);
  }

  /** Remet recherche et filtres à leur valeur initiale (une seule requête). */
  reset(): void {
    this.search.setValue('', { emitEvent: false });
    // Valeurs de départ explicites : un contrôle « nullable » reviendrait sinon à null, pas à
    // sa valeur par défaut (ex. statut « Actifs »).
    this.filters.reset(this.initialFilters as never, { emitEvent: false });
    this.resetDone$.next();
    this.pageIndex = 0;
    this.trigger$.next();
  }

  /** Dernière page vidée (suppression, filtre côté serveur) : on revient à la dernière page existante. */
  private backIfPageEmptied(s: ServerTableState<T>): void {
    if (s.rows.length === 0 && s.total > 0 && this.pageIndex > 0) {
      this.pageIndex = Math.max(0, Math.ceil(s.total / this.pageSize) - 1);
      queueMicrotask(() => this.trigger$.next());
    }
  }
}

/** Égalité de valeurs de formulaire (dates comprises), sans dépendance externe. */
function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
