import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatOption } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSelect } from '@angular/material/select';

/** Touches laissées au mat-select : navigation et validation dans la liste. */
const SELECT_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab', 'PageUp', 'PageDown']);

/** Texte comparable : sans accents ni majuscules (« Électricité » est trouvé par « electr »). */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Recherche dans un mat-select : à placer en premier enfant du mat-select.
 * ```html
 * <mat-select formControlName="productId">
 *   <app-select-search />
 *   @for (p of products; track p.id) { <mat-option [value]="p.id">{{ p.name }}</mat-option> }
 * </mat-select>
 * ```
 * Filtre les options sur leur texte affiché ; les flèches et Entrée restent gérées par la liste.
 * Le filtre est vidé à chaque fermeture.
 */
@Component({
  selector: 'app-select-search',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="select-search" (keydown)="onKeydown($event)" (click)="$event.stopPropagation()">
      <mat-icon class="select-search__icon">search</mat-icon>
      <input
        #input
        type="text"
        class="select-search__input"
        [placeholder]="placeholder"
        autocomplete="off"
        aria-label="Rechercher dans la liste"
        (input)="filter(input.value)"
      />
      @if (query) {
        <button type="button" class="select-search__clear" aria-label="Effacer la recherche" (click)="clear(true)">
          <mat-icon>close</mat-icon>
        </button>
      }
    </div>
    @if (query && noMatch) {
      <div class="select-search__empty">Aucun résultat</div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        position: sticky;
        top: 0;
        z-index: 2;
        background: var(--mat-select-panel-background-color, #fff);
      }
      .select-search {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.12);
      }
      .select-search__icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        opacity: 0.6;
      }
      .select-search__input {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        background: transparent;
        font: inherit;
        font-size: 14px;
        padding: 6px 0;
      }
      .select-search__clear {
        display: inline-flex;
        border: none;
        background: transparent;
        cursor: pointer;
        padding: 0;
        opacity: 0.6;
      }
      .select-search__clear mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      .select-search__empty {
        padding: 12px 16px;
        font-size: 13px;
        opacity: 0.7;
      }
    `
  ]
})
export class SelectSearchComponent implements AfterViewInit {
  private readonly select = inject(MatSelect);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('input') private input?: ElementRef<HTMLInputElement>;

  placeholder = 'Rechercher...';
  query = '';
  noMatch = false;

  private readonly hidden = new Set<MatOption>();

  ngAfterViewInit(): void {
    this.select.openedChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((open) => {
      if (open) {
        this.installSkip();
        // Après l'ouverture du panneau : le curseur va dans le champ de recherche.
        setTimeout(() => this.input?.nativeElement.focus());
      } else {
        this.clear(false);
      }
    });
    // Options rechargées pendant une recherche : le filtre s'applique aux nouvelles.
    this.select.options.changes.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.query) this.apply();
    });
  }

  filter(value: string): void {
    this.query = normalize(value);
    this.apply();
  }

  clear(refocus: boolean): void {
    this.query = '';
    if (this.input) this.input.nativeElement.value = '';
    this.apply();
    if (refocus) this.input?.nativeElement.focus();
  }

  /** Les touches de saisie restent dans le champ (sinon la liste les interprète : espace = sélection). */
  onKeydown(event: KeyboardEvent): void {
    if (!SELECT_KEYS.has(event.key)) {
      event.stopPropagation();
    }
  }

  private apply(): void {
    this.hidden.clear();
    let visible = 0;
    this.select.options?.forEach((option) => {
      const match = !this.query || normalize(option.viewValue).includes(this.query);
      option._getHostElement().style.display = match ? '' : 'none';
      if (match) visible++;
      else this.hidden.add(option);
    });
    this.noMatch = visible === 0;
    // La navigation au clavier saute les options masquées et part de la première visible.
    if (this.query && visible > 0) {
      this.installSkip();
      this.select._keyManager?.setFirstItemActive();
    }
    this.cdr.markForCheck();
  }

  private installSkip(): void {
    this.select._keyManager?.skipPredicate((option: MatOption) => option.disabled || this.hidden.has(option));
  }
}
