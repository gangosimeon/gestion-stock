import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { DatePickerDirective } from './date-picker.directive';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, DatePickerDirective],
  template: `
    <input type="date" [formControl]="ctrl" appDatePicker #picker="datePicker" />
    <button type="button" (click)="picker.open()">calendrier</button>
  `
})
class HostComponent {
  readonly ctrl = new FormControl('2026-10-13');
}

describe('DatePickerDirective (calendrier des champs de date natifs)', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    const showPicker = vi.fn();
    Object.defineProperty(input, 'showPicker', { value: showPicker, configurable: true });
    return { fixture, input, showPicker };
  }

  it('un clic dans le champ ou sur le bouton ouvre le calendrier, la valeur garde son format', () => {
    const { fixture, input, showPicker } = setup();
    input.click();
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(showPicker).toHaveBeenCalledTimes(2);
    expect(input.classList).toContain('date-picker-input');
    expect(fixture.componentInstance.ctrl.value).toBe('2026-10-13');
  });

  it('champ désactivé : pas de calendrier', () => {
    const { fixture, input, showPicker } = setup();
    fixture.componentInstance.ctrl.disable();
    fixture.detectChanges();
    input.click();
    expect(showPicker).not.toHaveBeenCalled();
  });

  it('navigateur sans calendrier ou ouverture refusée : aucune erreur, la saisie reste possible', () => {
    const { input } = setup();
    Object.defineProperty(input, 'showPicker', {
      value: () => {
        throw new DOMException('NotAllowedError');
      }
    });
    expect(() => input.click()).not.toThrow();
  });
});
