import { Component, computed, input } from '@angular/core';

import { Product } from '../../core/models/product.model';
import { ProductThumbComponent } from './product-thumb.component';
import { formatFcfa, stockLabel, stockLevel } from './product-stock';

/**
 * Ligne produit d'une liste de choix (recherche de la caisse) : photo, nom, référence, état du stock
 * et prix, sur une ligne. À placer dans une mat-option.
 */
@Component({
  selector: 'app-product-option',
  standalone: true,
  imports: [ProductThumbComponent],
  template: `
    <span class="opt">
      <app-product-thumb [productId]="product().id" [version]="product().imageVersion" [name]="product().name" [size]="36" />
      <span class="opt__text">
        <span class="opt__name">{{ product().name }}</span>
        <span class="opt__meta" [class.opt__meta--quiet]="level() === 'ok'">
          <span class="opt__sku">{{ product().sku }}</span>
          <span class="opt__stock" [class]="'opt__stock opt__stock--' + level()">{{ stock() }}</span>
        </span>
      </span>
      <span class="opt__price">{{ price() }} <small>FCFA</small></span>
    </span>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .opt {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 4px 0;
        min-width: 0;
      }
      .opt__text {
        flex: 1;
        min-width: 0;
        display: grid;
        line-height: 1.3;
      }
      .opt__name {
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .opt__meta {
        font-size: 12px;
        color: var(--color-text-secondary);
        display: flex;
        gap: 8px;
        align-items: center;
        white-space: nowrap;
        overflow: hidden;
      }
      .opt__stock {
        padding: 0 6px;
        border-radius: 999px;
        font-weight: 600;
        background: var(--color-neutral-soft);
        color: var(--color-neutral-text);
      }
      .opt__stock--low {
        background: var(--color-warning-soft);
        color: var(--color-warning-text);
      }
      .opt__stock--out {
        background: var(--color-danger-soft);
        color: var(--color-danger-text);
      }
      .opt__price {
        flex: none;
        font-weight: 700;
        color: var(--color-primary);
        font-variant-numeric: tabular-nums;
      }
      .opt__price small {
        font-size: 11px;
      }

      /* Téléphone : l'essentiel seulement (photo, nom, prix) ; le stock n'apparaît que s'il faut
         réagir (stock faible, rupture). La référence reste utilisable dans la recherche. */
      @media (max-width: 600px) {
        .opt {
          gap: 10px;
        }
        .opt__name {
          white-space: normal;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          font-size: 14px;
        }
        .opt__sku,
        .opt__meta--quiet {
          display: none;
        }
      }
    `
  ]
})
export class ProductOptionComponent {
  readonly product = input.required<Product>();
  readonly unitPrice = input.required<number>();

  readonly level = computed(() => stockLevel(this.product()));
  readonly stock = computed(() => stockLabel(this.product()));
  readonly price = computed(() => formatFcfa(this.unitPrice()));
}
