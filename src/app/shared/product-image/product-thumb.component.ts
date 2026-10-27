import { Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

import { ProductImagesService } from '../../core/services/product-images.service';

/** Teintes douces des pastilles sans photo (choisie d'après le nom : stable d'un affichage à l'autre). */
const HUES = [210, 160, 30, 280, 350, 190, 100, 250];

/** Petits mots ignorés pour les initiales (« Fer à béton » → « FB »). */
const MINOR_WORDS = new Set(['a', 'à', 'au', 'aux', 'de', 'des', 'du', 'd', 'en', 'et', 'la', 'le', 'les', 'l', 'pour', 'sur', 'un', 'une']);

/**
 * Initiales d'un produit : premières lettres des deux premiers mots significatifs, sans petits mots ni
 * nombres (« Ciment CPJ-45 » → « CC », « Clous 5 cm » → « CC », « Fer à béton » → « FB »).
 */
export function productInitials(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/[\s()/]+/).filter((w) => /^\p{L}/u.test(w));
  const significant = words.filter((w) => !MINOR_WORDS.has(w.toLowerCase()));
  const chosen = (significant.length > 0 ? significant : words).slice(0, 2);
  if (chosen.length > 0) return chosen.map((w) => w[0]).join('').toUpperCase();
  const any = (name ?? '').match(/[\p{L}\p{N}]/u);
  return any ? any[0].toUpperCase() : '?';
}

export function productHue(name: string | null | undefined): number {
  let hash = 0;
  for (const ch of name ?? '') hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return HUES[Math.abs(hash) % HUES.length];
}

/**
 * Photo d'un produit (liste, caisse, fiche). Sans photo : pastille aux initiales du produit, d'une
 * teinte propre à son nom (repérage visuel rapide), à la même taille. Taille fixe en pixels, ou
 * {@link fill} pour occuper tout le conteneur (carte produit).
 */
@Component({
  selector: 'app-product-thumb',
  standalone: true,
  template: `
    <span
      class="thumb"
      [class.thumb--fill]="fill()"
      [style.width.px]="fill() ? null : size()"
      [style.height.px]="fill() ? null : size()"
      [style.--thumb-hue]="hue()"
    >
      @if (url(); as src) {
        <img [src]="src" [alt]="alt()" loading="lazy" decoding="async" />
      } @else {
        <span class="thumb__initials" aria-hidden="true" [style.font-size.px]="fill() ? null : size() * 0.38">{{ initials() }}</span>
      }
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        flex: none;
      }
      /* Remplit le conteneur positionné (zone photo de la carte), avec ou sans photo. */
      :host(.thumb-host--fill) {
        position: absolute;
        inset: 0;
        display: block;
      }
      .thumb {
        display: grid;
        place-items: center;
        overflow: hidden;
        border-radius: var(--radius-md);
        background: hsl(var(--thumb-hue) 70% 94%);
        color: hsl(var(--thumb-hue) 45% 35%);
      }
      .thumb--fill {
        width: 100%;
        height: 100%;
        border-radius: inherit;
      }
      .thumb__initials {
        font-weight: 700;
        letter-spacing: 0.02em;
        line-height: 1;
      }
      .thumb--fill .thumb__initials {
        font-size: 32px;
      }
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      :host-context(html[data-theme='dark']) .thumb {
        background: hsl(var(--thumb-hue) 30% 22%);
        color: hsl(var(--thumb-hue) 60% 80%);
      }
    `
  ],
  host: { '[class.thumb-host--fill]': 'fill()' }
})
export class ProductThumbComponent {
  private readonly images = inject(ProductImagesService);

  readonly productId = input.required<string>();
  readonly version = input<string | null | undefined>(null);
  /** Nom du produit : initiales et teinte de la pastille sans photo. */
  readonly name = input<string | null | undefined>(null);
  readonly size = input(40);
  /** Occupe tout le conteneur (taille donnée par le parent). */
  readonly fill = input(false);
  readonly alt = input('');

  readonly initials = computed(() => productInitials(this.name()));
  readonly hue = computed(() => productHue(this.name()));

  private readonly key = computed(() => ({ id: this.productId(), version: this.version() }));

  readonly url = toSignal(toObservable(this.key).pipe(switchMap(({ id, version }) => this.images.url(id, version))), {
    initialValue: null
  });
}
