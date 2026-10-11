import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { Category, CategoryRequest } from '../../../core/models/category.model';
import { CategoriesFacade } from '../data/categories.facade';

/** Mode du panneau : création (category = null) ou modification. */
export type CategoryDrawerContext = { category: Category | null };

/** Panneau latéral de création ou de modification d'une catégorie (même structure que celui des produits). */
@Component({
  selector: 'app-category-drawer',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDividerModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './category-drawer.component.html',
  styleUrl: './category-drawer.component.scss'
})
export class CategoryDrawerComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly facade = inject(CategoriesFacade);

  @Input({ required: true }) ctx!: CategoryDrawerContext;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Category>();

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(255)]]
  });

  saving = false;
  errorMessage: string | null = null;

  get title(): string {
    return this.ctx?.category ? 'Modifier la catégorie' : 'Nouvelle catégorie';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ctx']) {
      this.saving = false;
      this.errorMessage = null;
      this.form.reset({ name: this.ctx?.category?.name ?? '', description: this.ctx?.category?.description ?? '' });
    }
  }

  submit(): void {
    const name = this.form.controls.name.value.trim();
    if (this.form.invalid || !name || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    const payload: CategoryRequest = { name, description: this.form.controls.description.value.trim() || undefined };
    this.saving = true;
    this.errorMessage = null;
    this.facade.save(this.ctx.category?.id ?? null, payload).subscribe({
      next: (category) => {
        this.saving = false;
        this.saved.emit(category);
      },
      error: (e: unknown) => {
        this.saving = false;
        // Ex. : « Une catégorie porte déjà ce nom. » (refus du backend)
        this.errorMessage = e instanceof Error ? e.message : 'Erreur';
      }
    });
  }
}
