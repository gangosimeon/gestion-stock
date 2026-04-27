import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { finalize, take } from 'rxjs';

import { Product } from '../../../core/models/product.model';
import { CreateInventorySessionRequest } from '../../../core/services/inventory-api.service';
import { InventoryFacade } from '../data/inventory.facade';

@Component({
  selector: 'app-inventory-count-page',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    DecimalPipe,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  templateUrl: './inventory-count-page.component.html',
  styleUrl: './inventory-count-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryCountPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly facade = inject(InventoryFacade);
  private readonly snackbar = inject(MatSnackBar);

  isSubmitting = false;

  readonly vm$ = this.facade.vm$;

  readonly displayedColumns = ['product', 'system', 'physical', 'diff'] as const;

  readonly note = new FormControl<string>('', { nonNullable: true });
  readonly qtyGroup = new FormGroup<Record<string, FormControl<number>>>({});

  constructor() {
    this.facade.refresh();

    this.vm$.subscribe((vm) => {
      for (const p of vm.products) {
        if (this.qtyGroup.controls[p.id]) continue;
        this.qtyGroup.addControl(p.id, new FormControl<number>(p.stockQuantity, { nonNullable: true }));
      }
    });
  }

  systemQty(p: Product): number {
    return Number(p.stockQuantity ?? 0);
  }

  physicalCtrl(productId: string): FormControl<number> {
    return this.qtyGroup.controls[productId] as FormControl<number>;
  }

  diff(p: Product): number {
    const physical = Number(this.physicalCtrl(p.id).value ?? 0);
    return physical - this.systemQty(p);
  }

  submit(products: Product[]): void {
    if (this.isSubmitting) return;

    const lines = products
      .map((p) => ({ productId: p.id, physicalQuantity: Number(this.physicalCtrl(p.id).value ?? 0) }))
      .filter((l) => Number.isFinite(l.physicalQuantity) && l.physicalQuantity >= 0);

    if (lines.length === 0) {
      this.snackbar.open('Aucune ligne', 'OK', { duration: 2500 });
      return;
    }

    const payload: CreateInventorySessionRequest = {
      note: this.note.value.trim() ? this.note.value.trim() : undefined,
      lines
    };

    this.isSubmitting = true;

    (this.facade.createSession(payload) as any)
      .pipe(
        take(1),
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: () => this.snackbar.open('Inventaire enregistré', 'OK', { duration: 2500 }),
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
      });
  }
}
