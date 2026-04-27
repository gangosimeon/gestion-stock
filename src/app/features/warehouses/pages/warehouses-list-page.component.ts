import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { catchError, finalize, map, of, startWith, take } from 'rxjs';

import { Warehouse } from '../../../core/models/warehouse.model';
import { WarehousesApiService } from '../../../core/services/warehouses-api.service';
import { PaginatedResult } from '../../../core/services/products-api.service';

type Vm = {
  isLoading: boolean;
  errorMessage: string | null;
  warehouses: Warehouse[];
};

@Component({
  selector: 'app-warehouses-list-page',
  standalone: true,
  imports: [
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

  isSubmitting = false;

  readonly displayedColumns = ['id', 'name'] as const;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]]
  });

  readonly vm$ = this.api.list().pipe(
    map((r: PaginatedResult<Warehouse>) => ({ isLoading: false, errorMessage: null, warehouses: r.items } satisfies Vm)),
    startWith({ isLoading: true, errorMessage: null, warehouses: [] } satisfies Vm),
    catchError((e: unknown) =>
      of({ isLoading: false, errorMessage: e instanceof Error ? e.message : 'Erreur', warehouses: [] } satisfies Vm)
    )
  );

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
          window.location.reload();
        },
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
      });
  }
}
