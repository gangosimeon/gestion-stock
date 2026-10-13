import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ViewChild, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Category } from '../../../core/models/category.model';
import { ListTable } from '../../../shared/table/list-table';
import { TableSearchComponent } from '../../../shared/table/table-search.component';
import { CategoriesFacade } from '../data/categories.facade';
import { CategoryDrawerComponent, CategoryDrawerContext } from '../ui/category-drawer.component';

@Component({
  selector: 'app-categories-page',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    TableSearchComponent,
    CategoryDrawerComponent
  ],
  templateUrl: './categories-page.component.html',
  styleUrl: './categories-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriesPageComponent {
  private readonly facade = inject(CategoriesFacade);
  private readonly snackbar = inject(MatSnackBar);

  readonly table = new ListTable<Category>(
    (c) => `${c.name} ${c.description ?? ''}`,
    (c, col) => (col === 'status' ? (c.active === false ? 1 : 0) : undefined)
  );
  @ViewChild(MatPaginator) set paginator(p: MatPaginator | undefined) {
    this.table.attachPaginator(p);
  }
  @ViewChild(MatSort) set sort(s: MatSort | undefined) {
    this.table.attachSort(s);
  }

  @ViewChild('drawer') drawer!: MatDrawer;

  /** Catégorie ouverte dans le panneau latéral (null : panneau fermé). */
  drawerCtx: CategoryDrawerContext | null = null;

  readonly displayedColumns = ['name', 'description', 'status', 'updatedAt', 'actions'] as const;
  readonly vm$ = this.facade.vm$;

  constructor() {
    this.facade.refresh();
  }

  openCreate(): void {
    this.openDrawer(null);
  }

  openEdit(c: Category): void {
    this.openDrawer(c);
  }

  closeDrawer(): void {
    void this.drawer.close();
  }

  onSaved(saved: Category): void {
    const created = !this.drawerCtx?.category;
    this.closeDrawer();
    this.snackbar.open(created ? `Catégorie « ${saved.name} » créée` : `Catégorie « ${saved.name} » modifiée`, 'OK', {
      duration: 3000
    });
  }

  toggleActive(c: Category): void {
    const active = c.active === false;
    this.facade.setActive(c.id, active).subscribe({
      next: () =>
        this.snackbar.open(active ? `Catégorie « ${c.name} » réactivée` : `Catégorie « ${c.name} » désactivée`, 'OK', {
          duration: 3000
        }),
      error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 4000 })
    });
  }

  private openDrawer(category: Category | null): void {
    this.drawerCtx = { category };
    void this.drawer.open();
  }
}
