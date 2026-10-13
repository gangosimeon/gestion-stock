import { FormControl, FormGroup } from '@angular/forms';
import { Observable, Subject, Subscription, of, throwError } from 'rxjs';

import { PaginatedResult } from '../../core/services/products-api.service';
import { ServerQuery, ServerTable, ServerTableState } from './server-table';

type Filters = { status: string | null };

describe('ServerTable (liste paginée côté serveur)', () => {
  let queries: ServerQuery<Filters>[];
  let states: ServerTableState<string>[];
  let sub: Subscription;

  function table(
    respond: (q: ServerQuery<Filters>) => Observable<PaginatedResult<string>> = () => of({ items: ['a', 'b'], total: 42 }),
    reload$?: Observable<unknown>
  ) {
    const t = new ServerTable<string, FormGroup<{ status: FormControl<string | null> }>>(
      (q) => {
        queries.push(q);
        return respond(q);
      },
      {
        filters: new FormGroup({ status: new FormControl<string | null>(null) }),
        sortFields: { date: 'createdAt' },
        reload$
      }
    );
    sub = t.state$.subscribe((s) => states.push(s));
    return t;
  }

  beforeEach(() => {
    queries = [];
    states = [];
  });

  afterEach(() => {
    sub?.unsubscribe();
    vi.useRealTimers();
  });

  it('première page demandée au backend, lignes et total affichés', () => {
    table();
    expect(queries).toEqual([{ q: '', filters: { status: null }, page: 0, size: 10, sort: [] }]);
    expect(states.at(-1)).toEqual({ rows: ['a', 'b'], total: 42, loading: false, error: null });
  });

  it('page et tri : nouvelle requête ; tri limité aux colonnes connues du backend', () => {
    const t = table();
    t.onPage({ pageIndex: 3, pageSize: 25, length: 42 });
    expect(queries.at(-1)).toMatchObject({ page: 3, size: 25 });

    t.onSort({ active: 'date', direction: 'desc' });
    expect(queries.at(-1)).toMatchObject({ page: 0, sort: ['createdAt,desc'] });

    t.onSort({ active: 'inconnue', direction: 'asc' });
    expect(queries.at(-1)?.sort).toEqual([]);
  });

  it('recherche et filtres : retour à la première page, texte nettoyé', () => {
    vi.useFakeTimers();
    const t = table();
    t.onPage({ pageIndex: 2, pageSize: 10, length: 42 });

    t.search.setValue('  ray ');
    vi.advanceTimersByTime(300);
    expect(queries.at(-1)).toMatchObject({ q: 'ray', page: 0 });

    t.filters.controls.status.setValue('ACTIVE');
    vi.advanceTimersByTime(150);
    expect(queries.at(-1)).toMatchObject({ filters: { status: 'ACTIVE' }, page: 0 });
  });

  it('rechargement demandé de l’extérieur (après enregistrement)', () => {
    const reload$ = new Subject<void>();
    table(undefined, reload$);
    reload$.next();
    expect(queries).toHaveLength(2);
  });

  it('erreur du backend : message affiché, lignes précédentes conservées', () => {
    let fail = false;
    const t = table(() => (fail ? throwError(() => new Error('Accès refusé.')) : of({ items: ['a'], total: 1 })));
    fail = true;
    t.reload();
    expect(states.at(-1)).toEqual({ rows: ['a'], total: 1, loading: false, error: 'Accès refusé.' });
  });

  it('page devenue vide (suppression) : retour à la dernière page existante', async () => {
    const t = table((q) => of(q.page >= 2 ? { items: [], total: 15 } : { items: ['x'], total: 15 }));
    t.onPage({ pageIndex: 2, pageSize: 10, length: 25 });
    await Promise.resolve();
    expect(queries.at(-1)?.page).toBe(1);
    expect(states.at(-1)?.rows).toEqual(['x']);
  });
});
