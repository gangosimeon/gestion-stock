import { Component, computed, input, output } from '@angular/core';

import { Product } from '../../core/models/product.model';
import { ProductThumbComponent } from './product-thumb.component';
import { formatFcfa, stockLabel, stockLevel } from './product-stock';

/**
 * Carte produit à toucher pour l'ajouter à la vente (caisse rapide, caisse complète) : photo (ou
 * pastille aux initiales), nom, prix bien lisible, état du stock et quantité déjà dans le panier.
 * Un seul bouton, accessible au clavier et lu en entier par les lecteurs d'écran.
 */
@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [ProductThumbComponent],
  template: `
    <button
      type="button"
      class="card"
      [class.card--out]="level() === 'out'"
      [class.card--selected]="inCart() > 0"
      (click)="pick.emit(product())"
      [attr.aria-label]="ariaLabel()"
    >
      <span class="card__media">
        <app-product-thumb [productId]="product().id" [version]="product().imageVersion" [name]="product().name" [fill]="true" />
        @if (inCart() > 0) {
          <span class="card__badge" aria-hidden="true">{{ inCart() }}</span>
        }
        <span class="card__stock" [class]="'card__stock card__stock--' + level()" aria-hidden="true">{{ stock() }}</span>
      </span>
      <span class="card__body">
        <span class="card__name" [title]="product().name">{{ product().name }}</span>
        <span class="card__sku">{{ product().sku }}</span>
        <span class="card__price">{{ price() }} <small>FCFA</small></span>
      </span>
    </button>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .card {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 0;
        overflow: hidden;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        background: var(--color-surface);
        color: var(--color-text);
        font: inherit;
        text-align: left;
        cursor: pointer;
        touch-action: manipulation;
        box-shadow: var(--shadow-xs);
        transition:
          transform var(--duration-fast) var(--ease-out),
          box-shadow var(--duration-fast) var(--ease-out),
          border-color var(--duration-fast) var(--ease-out);
      }
      .card:hover {
        border-color: var(--color-primary);
        box-shadow: var(--shadow-md);
        transform: translateY(-1px);
      }
      .card:active {
        transform: scale(0.98);
      }
      .card:focus-visible {
        outline: 3px solid var(--color-primary);
        outline-offset: 2px;
      }
      .card--selected {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 1px var(--color-primary);
      }
      .card--out .card__media,
      .card--out .card__price {
        opacity: 0.55;
      }
      .card__media {
        position: relative;
        display: block;
        width: 100%;
        aspect-ratio: 4 / 3;
        background: var(--color-surface-muted);
        border-radius: 0;
      }
      .card__badge {
        position: absolute;
        top: 8px;
        right: 8px;
        min-width: 28px;
        height: 28px;
        padding: 0 8px;
        border-radius: 14px;
        background: var(--color-primary);
        color: #fff;
        font-size: 14px;
        font-weight: 700;
        display: grid;
        place-items: center;
        box-shadow: var(--shadow-sm);
      }
      .card__stock {
        position: absolute;
        left: 8px;
        bottom: 8px;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        backdrop-filter: blur(4px);
      }
      .card__stock--ok {
        background: rgb(255 255 255 / 85%);
        color: #334155;
      }
      .card__stock--low {
        background: var(--color-warning-soft);
        color: var(--color-warning-text);
      }
      .card__stock--out {
        background: var(--color-danger-soft);
        color: var(--color-danger-text);
      }
      .card__body {
        display: grid;
        gap: 2px;
        padding: 8px 10px 10px;
        min-width: 0;
      }
      .card__name {
        font-weight: 600;
        line-height: 1.25;
        min-height: 2.5em;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        overflow-wrap: anywhere;
      }
      .card__sku {
        font-size: 11px;
        color: var(--color-text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .card__price {
        margin-top: 2px;
        font-size: 17px;
        font-weight: 700;
        color: var(--color-primary);
        font-variant-numeric: tabular-nums;
      }
      .card__price small {
        font-size: 11px;
        font-weight: 600;
      }
    `
  ]
})
export class ProductCardComponent {
  readonly product = input.required<Product>();
  /** Prix affiché (détail ou gros, selon la vente). */
  readonly unitPrice = input.required<number>();
  /** Quantité déjà dans le panier (badge). */
  readonly inCart = input(0);

  readonly pick = output<Product>();

  readonly level = computed(() => stockLevel(this.product()));
  readonly stock = computed(() => stockLabel(this.product()));
  readonly price = computed(() => formatFcfa(this.unitPrice()));
  readonly ariaLabel = computed(
    () =>
      `${this.product().name}, ${this.price()} FCFA, ${this.stock()}` +
      (this.inCart() > 0 ? `, ${this.inCart()} dans le panier` : '')
  );
}
