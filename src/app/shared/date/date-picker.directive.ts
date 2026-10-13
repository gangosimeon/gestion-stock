import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/**
 * Champ de date natif (type date, datetime-local ou month) : un clic dans le champ ouvre le
 * calendrier du navigateur. La saisie au clavier reste possible et la valeur ne change pas de
 * format (chaîne AAAA-MM-JJ, AAAA-MM-JJTHH:mm ou AAAA-MM), contrairement à un calendrier Material
 * qui produirait des objets Date.
 *
 * ```html
 * <input matInput type="date" formControlName="dateFrom" appDatePicker #from="datePicker" />
 * <button mat-icon-button matSuffix type="button" (click)="from.open()"><mat-icon>calendar_month</mat-icon></button>
 * ```
 */
@Directive({
  selector: 'input[appDatePicker]',
  standalone: true,
  exportAs: 'datePicker',
  host: { class: 'date-picker-input' }
})
export class DatePickerDirective {
  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;

  @HostListener('click')
  open(): void {
    if (this.input.disabled || this.input.readOnly) return;
    try {
      // Navigateurs récents (Chrome, Edge, Firefox, Safari 16+) ; sinon le champ reste saisissable.
      this.input.showPicker?.();
    } catch {
      // Ouverture refusée hors d'un geste utilisateur : rien à faire, la saisie reste possible.
    }
    this.input.focus();
  }
}
