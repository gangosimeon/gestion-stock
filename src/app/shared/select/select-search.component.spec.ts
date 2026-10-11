import { Component, ViewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { SelectSearchComponent } from './select-search.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MatSelectModule, SelectSearchComponent],
  template: `
    <mat-select [formControl]="ctrl">
      <app-select-search />
      @for (o of options; track o) {
        <mat-option [value]="o">{{ o }}</mat-option>
      }
    </mat-select>
  `
})
class HostComponent {
  @ViewChild(MatSelect) select!: MatSelect;
  readonly ctrl = new FormControl<string | null>(null);
  readonly options = ['Électricité', 'Loyer', 'Transport', 'Fournitures'];
}

describe('SelectSearchComponent (recherche dans un mat-select)', () => {
  function open() {
    TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideNoopAnimations()] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    fixture.componentInstance.select.open();
    fixture.detectChanges();
    const input = document.querySelector('.select-search__input') as HTMLInputElement;
    const visible = () =>
      fixture.componentInstance.select.options.filter((o) => o._getHostElement().style.display !== 'none').map((o) => o.viewValue);
    const type = (text: string) => {
      input.value = text;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    return { fixture, input, visible, type };
  }

  it('filtre les options sur leur texte, sans tenir compte des accents ni des majuscules', () => {
    const { visible, type } = open();
    expect(visible().length).toBe(4);
    type('ELECTR');
    expect(visible()).toEqual(['Électricité']);
    type('o');
    expect(visible()).toEqual(['Loyer', 'Transport', 'Fournitures']);
  });

  it('aucun résultat : message affiché ; à la fermeture le filtre est vidé', async () => {
    const { fixture, visible, type } = open();
    type('zzz');
    expect(visible()).toEqual([]);
    expect(document.querySelector('.select-search__empty')?.textContent).toContain('Aucun résultat');
    fixture.componentInstance.select.close();
    fixture.detectChanges();
    // La fermeture (et son événement openedChange) se termine de façon asynchrone.
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    expect(visible().length).toBe(4);
  });

  it("l'espace et les lettres restent dans le champ (pas de sélection par la liste)", () => {
    const { fixture, input } = open();
    const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    input.dispatchEvent(space);
    fixture.detectChanges();
    expect(fixture.componentInstance.ctrl.value).toBeNull();
  });
});
