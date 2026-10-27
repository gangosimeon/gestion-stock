import { Component, computed, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, firstValueFrom } from 'rxjs';

import { ProductImageInfo, ProductImagesService } from '../../../core/services/product-images.service';
import { ProductThumbComponent } from '../../../shared/product-image/product-thumb.component';

/**
 * Photo facultative d'un produit, dans sa fiche. Produit existant : ajout, remplacement et retrait
 * immédiats. Nouveau produit : la photo choisie est envoyée juste après l'enregistrement de la fiche
 * ({@link uploadPending}). Sur téléphone, le choix propose l'appareil photo ou la galerie.
 */
@Component({
  selector: 'app-product-photo',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, ProductThumbComponent],
  template: `
    <div class="photo">
      <div class="photo__preview">
        @if (pendingUrl(); as src) {
          <img class="photo__pending" [src]="src" alt="Photo choisie" />
        } @else if (productId()) {
          <app-product-thumb [productId]="productId()!" [version]="currentVersion()" [size]="96" alt="Photo du produit" />
        } @else {
          <app-product-thumb productId="" [size]="96" />
        }
      </div>
      <div class="photo__side">
        <span class="photo__label">Photo du produit <span class="photo__optional">(facultative)</span></span>
        @if (editable()) {
          <div class="photo__actions">
            <input #fileInput type="file" accept="image/*" hidden (change)="onFile($event)" />
            <button mat-stroked-button type="button" (click)="fileInput.click()" [disabled]="busy()">
              @if (busy()) { <mat-spinner diameter="16" /> } @else { <mat-icon>photo_camera</mat-icon> }
              {{ hasPhoto() ? 'Changer' : 'Ajouter une photo' }}
            </button>
            @if (hasPhoto()) {
              <button mat-button type="button" (click)="remove()" [disabled]="busy()">
                <mat-icon>delete</mat-icon>
                Retirer
              </button>
            }
          </div>
          @if (pendingUrl() && !productId()) {
            <span class="photo__hint">La photo sera enregistrée avec le produit.</span>
          }
        }
        @if (error()) {
          <span class="photo__error" role="alert">{{ error() }}</span>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .photo {
        display: flex;
        gap: 16px;
        align-items: center;
        flex-wrap: wrap;
      }
      .photo__pending {
        width: 96px;
        height: 96px;
        object-fit: cover;
        border-radius: var(--radius-md);
        border: 1px solid var(--color-border-light);
        display: block;
      }
      .photo__side {
        display: grid;
        gap: 6px;
      }
      .photo__label {
        font-weight: 600;
      }
      .photo__optional,
      .photo__hint {
        font-weight: 400;
        font-size: 12px;
        color: var(--color-text-secondary);
      }
      .photo__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .photo__actions mat-spinner {
        display: inline-block;
        margin-right: 6px;
        vertical-align: middle;
      }
      .photo__error {
        font-size: 13px;
        color: var(--color-danger-text);
      }
    `
  ]
})
export class ProductPhotoComponent {
  private readonly images = inject(ProductImagesService);

  /** Produit enregistré ; null pour un nouveau produit (photo envoyée après l'enregistrement). */
  readonly productId = input<string | null>(null);
  readonly version = input<string | null | undefined>(null);
  readonly editable = input(false);

  /** Nouvelle version de la photo (null : photo retirée). */
  readonly changed = output<string | null>();

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  /** Version connue après un envoi ou un retrait ; sinon celle du produit. */
  private readonly override = signal<{ value: string | null } | null>(null);
  readonly currentVersion = computed(() => {
    const o = this.override();
    return o ? o.value : (this.version() ?? null);
  });

  private pending: Blob | null = null;
  readonly pendingUrl = signal<string | null>(null);

  readonly hasPhoto = computed(() => !!this.currentVersion() || !!this.pendingUrl());

  async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.error.set(null);
    this.busy.set(true);
    try {
      const photo = await this.images.prepare(file);
      const id = this.productId();
      if (id) {
        await this.send(this.images.upload(id, photo));
      } else {
        this.setPending(photo);
      }
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Photo refusée.');
    } finally {
      this.busy.set(false);
    }
  }

  async remove(): Promise<void> {
    this.error.set(null);
    const id = this.productId();
    if (!id) {
      this.setPending(null);
      return;
    }
    this.busy.set(true);
    try {
      await firstValueFrom(this.images.remove(id));
      this.override.set({ value: null });
      this.changed.emit(null);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Retrait impossible.');
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * Nouveau produit enregistré : envoi de la photo choisie. L'échec n'annule pas le produit ; il est
   * signalé (la photo pourra être ajoutée depuis la fiche).
   */
  async uploadPending(productId: string): Promise<boolean> {
    if (!this.pending) return true;
    try {
      await this.send(this.images.upload(productId, this.pending));
      this.setPending(null);
      return true;
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Envoi de la photo impossible.');
      return false;
    }
  }

  private async send(upload$: Observable<ProductImageInfo>): Promise<void> {
    const info = await firstValueFrom(upload$);
    this.override.set({ value: info.version });
    this.changed.emit(info.version);
  }

  private setPending(photo: Blob | null): void {
    const previous = this.pendingUrl();
    if (previous) URL.revokeObjectURL(previous);
    this.pending = photo;
    this.pendingUrl.set(photo ? URL.createObjectURL(photo) : null);
  }
}
