import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { finalize, take } from 'rxjs';

import { Warehouse } from '../../../core/models/warehouse.model';
import { WarehouseTypeFilter, WarehousesApiService } from '../../../core/services/warehouses-api.service';
import { ActiveStatusFilter } from '../../../core/services/products-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { FilterResetComponent } from '../../../shared/table/filter-reset.component';
import { ServerTable } from '../../../shared/table/server-table';

@Component({
  selector: 'app-warehouses-list-page',
  standalone: true,
  imports: [
    FilterResetComponent,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatSelectModule,
    CommonModule,
    AsyncPipe,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  templateUrl: './warehouses-list-page.component.html',
  styleUrl: './warehouses-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WarehousesListPageComponent {
  private readonly api = inject(WarehousesApiService);
  private readonly fb = inject(FormBuilder);
  private readonly snackbar = inject(MatSnackBar);
  private readonly auth = inject(AuthService);

  /** Interface seulement : le backend exige warehouse:manage pour créer un dépôt. */
  readonly canManage$ = this.auth.hasPermission$('warehouse:manage');
  /** Le filtre de statut n'a d'effet que pour qui voit tous les dépôts (warehouse:all). */
  readonly canSeeAll$ = this.auth.hasPermission$('warehouse:all');

  readonly typeLabels: Record<WarehouseTypeFilter, string> = { STORE: 'Magasin', WAREHOUSE: 'Entrepôt' };
  readonly typeOptions = Object.entries(this.typeLabels).map(([value, label]) => ({ value: value as WarehouseTypeFilter, label }));
  readonly statusOptions: { value: ActiveStatusFilter; label: string }[] = [
    { value: 'ACTIVE', label: 'Actifs' },
    { value: 'INACTIVE', label: 'Désactivés' },
    { value: 'ALL', label: 'Tous' }
  ];

  /** Recherche, filtres, tri et pagination traités par le backend. */
  readonly table = new ServerTable((query) => this.api.findPage(query, query.filters), {
    filters: new FormGroup({
      type: new FormControl<WarehouseTypeFilter | null>(null),
      status: new FormControl<ActiveStatusFilter>('ACTIVE', { nonNullable: true })
    }),
    sortFields: { code: 'code', name: 'name', type: 'type' }
  });

  isSubmitting = false;

  readonly displayedColumns = ['code', 'name', 'type', 'main'] as const;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]]
  });

  typeLabel(w: Warehouse): string {
    return (w.type && this.typeLabels[w.type as WarehouseTypeFilter]) || w.type || '—';
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.form.disable();

    const name = this.form.controls.name.value.trim();

    this.api
      .create({ name })
      .pipe(
        take(1),
        finalize(() => {
          this.isSubmitting = false;
          this.form.enable();
        })
      )
      .subscribe({
        next: () => {
          this.snackbar.open('Dépôt ajouté', 'OK', { duration: 2500 });
          // Recharge aussi le sélecteur de magasin de l'en-tête.
          window.location.reload();
        },
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
      });
  }
}
