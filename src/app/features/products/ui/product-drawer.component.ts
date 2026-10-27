import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS, MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Observable, finalize, of, switchMap, take } from 'rxjs';

import { Category } from '../../../core/models/category.model';
import { Product } from '../../../core/models/product.model';
import { ProductRequest, toProductRequest } from '../../../core/services/products-api.service';
import { Supplier } from '../../../core/models/supplier.model';
import { ProductsFacade } from '../data/products.facade';
import { ProductDrawerMode } from '../data/product-vm.model';
import { SelectSearchComponent } from '../../../shared/select/select-search.component';
import { ProductPhotoComponent } from './product-photo.component';

export interface ProductDrawerContext {
  mode: ProductDrawerMode;
  productId: string | null;
  categories: Category[];
  suppliers: Supplier[];
  /** Permission product:update (interface seulement). */
  canUpdate?: boolean;
}

@Component({
  selector: 'app-product-drawer',
  standalone: true,
  imports: [
    SelectSearchComponent,
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    ProductPhotoComponent
  ],
  providers: [
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
      useValue: { duration: 3000 }
    }
  ],
  templateUrl: './product-drawer.component.html',
  styleUrl: './product-drawer.component.scss'
})
export class ProductDrawerComponent {
  private readonly fb = inject(FormBuilder);
  private readonly facade = inject(ProductsFacade);
  private readonly snackbar = inject(MatSnackBar);

  @Input({ required: true }) ctx!: ProductDrawerContext;
  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  @ViewChild(ProductPhotoComponent) private photo?: ProductPhotoComponent;

  isLoading = false;
  loadError: string | null = null;

  loadedProduct: Product | null = null;

  readonly form = this.fb.nonNullable.group({
    sku: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    categoryId: ['', [Validators.required]],
    supplierId: [''],
    purchasePrice: [0, [Validators.required, Validators.min(0)]],
    retailPrice: [0, [Validators.required, Validators.min(0)]],
    wholesalePrice: [0, [Validators.required, Validators.min(0)]],
    alertThreshold: [0, [Validators.required, Validators.min(0)]]
  });

  ngOnChanges(): void {
    this.loadError = null;
    this.loadedProduct = null;

    if (this.ctx.mode === 'create') {
      this.form.reset({
        sku: '',
        name: '',
        categoryId: this.ctx.categories[0]?.id ?? '',
        supplierId: '',
        purchasePrice: 0,
        retailPrice: 0,
        wholesalePrice: 0,
        alertThreshold: 0
      });
      return;
    }

    if (!this.ctx.productId) return;

    this.isLoading = true;
    this.form.disable();

    this.facade
      .getProductById(this.ctx.productId)
      .pipe(
        take(1),
        finalize(() => {
          this.isLoading = false;
          this.form.enable();
        })
      )
      .subscribe({
        next: (p) => {
          this.loadedProduct = p;
          this.form.reset({
            sku: p.sku,
            name: p.name,
            categoryId: p.categoryId,
            supplierId: p.supplierId ?? '',
            purchasePrice: p.purchasePrice,
            retailPrice: p.retailPrice,
            wholesalePrice: p.wholesalePrice,
            alertThreshold: p.alertThreshold
          });

          if (this.ctx.mode === 'detail') {
            this.form.disable();
          }
        },
        error: (e: unknown) => {
          this.loadError = e instanceof Error ? e.message : 'Erreur de chargement';
        }
      });
  }

  get title(): string {
    if (this.ctx.mode === 'create') return 'Nouveau produit';
    if (this.ctx.mode === 'edit') return 'Modifier le produit';
    return 'Détail produit';
  }

  get canSubmit(): boolean {
    return this.ctx.mode !== 'detail';
  }



  submit(): void {
    if (!this.canSubmit) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.form.disable();

    const raw = this.form.getRawValue();

    // PUT = remplacement complet : on repart des valeurs actuelles (code-barres, marque,
    // fournisseur… absents du formulaire), puis on applique la saisie. Aucun stock envoyé.
    const current = this.ctx.mode === 'edit' && this.loadedProduct ? toProductRequest(this.loadedProduct) : null;
    const payload: ProductRequest = {
      ...current,
      sku: raw.sku.trim(),
      name: raw.name.trim(),
      categoryId: raw.categoryId,
      supplierId: raw.supplierId || null,
      purchasePrice: raw.purchasePrice,
      retailPrice: raw.retailPrice,
      wholesalePrice: raw.wholesalePrice,
      alertThreshold: raw.alertThreshold
    };

    this.facade
      .save(payload, this.ctx.mode === 'edit' ? this.ctx.productId : null)
      .pipe(
        take(1),
        finalize(() => {
          this.isLoading = false;
          this.form.enable();
        })
      )
      .subscribe({
        next: (product) => void this.afterSave(product),
        error: (e: unknown) => {
          this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK');
        }
      });
  }

  /** Nouveau produit : la photo choisie est envoyée une fois la fiche enregistrée. */
  private async afterSave(product: Product): Promise<void> {
    const photoSent = this.ctx.mode === 'create' && this.photo ? await this.photo.uploadPending(product.id) : true;
    this.snackbar.open(photoSent ? 'Enregistré' : 'Produit enregistré, mais la photo n’a pas pu être envoyée.', 'OK');
    if (photoSent) this.saved.emit();
  }

  /** Photo ajoutée, remplacée ou retirée : la liste des produits affiche la nouvelle vignette. */
  onPhotoChanged(): void {
    this.facade.refresh();
  }

  /** Changer la photo : droit de modifier le produit (ou de le créer, pour un nouveau produit). */
  get photoEditable(): boolean {
    return this.ctx.mode === 'create' || (this.ctx.mode === 'edit' && this.ctx.canUpdate !== false);
  }

  requestEdit(): void {
    if (!this.ctx.productId) return;
    this.ctx = { ...this.ctx, mode: 'edit' };
    this.form.enable();
  }

  requestClose(): void {
    this.close.emit();
  }

  fieldError(path: keyof typeof this.form.controls): string | null {
    const c = this.form.controls[path];
    if (!c.touched || !c.errors) return null;

    if (c.errors['required']) return 'Champ obligatoire';
    if (c.errors['min']) return 'Valeur invalide';
    if (c.errors['maxlength']) return 'Trop long';

    return 'Invalide';
  }
}
