import { FormControl } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { debounceTime, distinctUntilChanged } from 'rxjs';

/**
 * Modèle de tableau des listes (référence : liste des produits) : recherche texte, tri par
 * colonne et pagination côté navigateur sur des lignes déjà chargées.
 *
 * Usage dans un composant :
 * ```ts
 * readonly table = new ListTable<Sale>((s) => `${s.number} ${s.customerName}`);
 * @ViewChild(MatPaginator) set paginator(p: MatPaginator | undefined) { this.table.attachPaginator(p); }
 * @ViewChild(MatSort) set sort(s: MatSort | undefined) { this.table.attachSort(s); }
 * ```
 * et dans le template : `[dataSource]="table.bind(vm.sales)"`, `<app-table-search [control]="table.search" />`.
 * Les setters @ViewChild rattachent paginateur et tri dès qu'ils apparaissent (souvent dans un
 * bloc `@if (vm$ | async)`, donc après ngAfterViewInit).
 */
export class ListTable<T> {
  readonly dataSource = new MatTableDataSource<T>([]);
  readonly search = new FormControl('', { nonNullable: true });

  private rows: readonly T[] | null = null;

  /**
   * @param text       texte cherché pour une ligne (concaténation des colonnes utiles)
   * @param sortValue  valeur de tri d'une colonne, si elle ne correspond pas à une propriété de la ligne
   */
  constructor(text: (row: T) => string, sortValue?: (row: T, column: string) => string | number | null | undefined) {
    this.dataSource.filterPredicate = (row, filter) => text(row).toLowerCase().includes(filter);
    if (sortValue) {
      const fallback = this.dataSource.sortingDataAccessor;
      this.dataSource.sortingDataAccessor = (row, column) => {
        const value = sortValue(row, column);
        return value === undefined ? fallback(row, column) : (value ?? '');
      };
    }
    this.search.valueChanges.pipe(debounceTime(200), distinctUntilChanged()).subscribe((v) => {
      this.dataSource.filter = v.trim().toLowerCase();
      this.dataSource.paginator?.firstPage();
    });
  }

  /** Lignes à afficher ; ne recharge la source que si la liste a changé. */
  bind(rows: readonly T[] | null | undefined): MatTableDataSource<T> {
    if (rows !== this.rows) {
      this.rows = rows ?? null;
      this.dataSource.data = rows ? [...rows] : [];
    }
    return this.dataSource;
  }

  /** Aucune ligne après filtrage (message « aucun résultat »). */
  get isEmpty(): boolean {
    return this.dataSource.filteredData.length === 0;
  }

  attachPaginator(paginator: MatPaginator | undefined): void {
    if (paginator && this.dataSource.paginator !== paginator) this.dataSource.paginator = paginator;
  }

  attachSort(sort: MatSort | undefined): void {
    if (sort && this.dataSource.sort !== sort) this.dataSource.sort = sort;
  }
}
