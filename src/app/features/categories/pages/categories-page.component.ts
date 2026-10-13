import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ViewChild, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Category } from '../../../core/models/category.model';
import { ActiveStatusFilter } from '../../../core/services/products-api.service';
import { ServerTable } from '../../../shared/table/server-table';
import { CategoriesFacade } from '../data/categories.facade';
import { CategoryDrawerComponent, CategoryDrawerContext } from '../ui/category-drawer.component';

@Component({
  selector: 'app-categories-page',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    CategoryDrawerComponent
  ],
  templateUrl: './categories-page.component.html',
  styleUrl: './categories-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriesPageComponent {
  private readonly facade = inject(CategoriesFacade);
  private readonly snackbar = inject(MatSnackBar);

  readonly statusOptions: { value: ActiveStatusFilter; label: string }[] = [
    { value: 'ALL', label: 'Toutes' },
    { value: 'ACTIVE', label: 'Actives' },
    { value: 'INACTIVE', label: 'Désactivées' }
  ];

  /** Recherche, statut, tri et pagination traités par le backend (écran de gestion : toutes par défaut). */
  readonly table = new ServerTable((query) => this.facade.search(query, query.filters), {
    filters: new FormGroup({ status: new FormControl<ActiveStatusFilter>('ALL', { nonNullable: true }) }),
    sortFields: { name: 'name' },
    reload$: this.facade.refresh$
  });

  @ViewChild('drawer') drawer!: MatDrawer;

  /** Catégorie ouverte dans le panneau latéral (null : panneau fermé). */
  drawerCtx: CategoryDrawerContext | null = null;

  readonly displayedColumns = ['name', 'description', 'status', 'updatedAt', 'actions'] as const;
  readonly vm$ = this.facade.vm$;

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
