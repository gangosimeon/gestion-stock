import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { LinkWarehouseChoice } from '../data/integration-links-api.service';
import { ReactivateLinkDialogComponent, ReactivateLinkDialogData } from './reactivate-link-dialog.component';
import { RevokeLinkDialogComponent, RevokeLinkDialogData } from './revoke-link-dialog.component';

const PLATEAU: LinkWarehouseChoice = { id: 'w1', code: 'MAG1', name: 'Magasin Plateau', type: 'STORE', active: true };
const YOPOUGON: LinkWarehouseChoice = { id: 'w2', code: 'ENT1', name: 'Entrepôt Yopougon', type: 'WAREHOUSE', active: true };
const COCODY: LinkWarehouseChoice = { id: 'w3', code: 'MAG2', name: 'Magasin Cocody', type: 'STORE', active: true };
const FERME: LinkWarehouseChoice = { id: 'w9', code: 'MAG9', name: 'Magasin fermé', type: 'STORE', active: false };

/** Dialogues de GA2 : reconfirmation des dépôts (réactivation) et confirmation renforcée (révocation). */
describe('Dialogues de gestion des liaisons', () => {
  let closed: unknown[];

  function open<T>(component: Type<T>, data: unknown) {
    closed = [];
    TestBed.configureTestingModule({
      imports: [component],
      providers: [
        provideNoopAnimations(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: (value: unknown) => void closed.push(value) } }
      ]
    });
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const confirm = () => element.querySelector<HTMLButtonElement>('[data-test="confirm"]')!;
    const checkbox = (selector: string) => element.querySelector<HTMLInputElement>(`${selector} input[type="checkbox"]`)!;
    const click = async (target: HTMLElement) => {
      target.click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    return { fixture, element, confirm, checkbox, click };
  }

  // --- Réactivation ----------------------------------------------------------------------------------------

  it('réactivation : dépôts de la liaison encore accessibles présélectionnés, les autres non', () => {
    const data: ReactivateLinkDialogData = { shopName: 'Boutique Awa', candidates: [PLATEAU, YOPOUGON, COCODY], current: [PLATEAU, FERME] };
    const { checkbox } = open(ReactivateLinkDialogComponent, data);
    expect(checkbox('[data-warehouse="w1"]').checked).toBe(true);
    expect(checkbox('[data-warehouse="w2"]').checked).toBe(false);
    expect(checkbox('[data-warehouse="w3"]').checked).toBe(false);
  });

  it('réactivation : dépôts de la liaison qui ne sont plus accessibles signalés, rappel du nouveau responsable', () => {
    const data: ReactivateLinkDialogData = { shopName: 'Boutique Awa', candidates: [PLATEAU], current: [PLATEAU, FERME] };
    const text = open(ReactivateLinkDialogComponent, data).element.textContent ?? '';
    expect(text).toContain('Magasin fermé');
    expect(text).toContain('devenez responsable');
  });

  it('réactivation : au moins un dépôt exigé ; la liste choisie est renvoyée', async () => {
    const data: ReactivateLinkDialogData = { shopName: 'Boutique Awa', candidates: [PLATEAU, YOPOUGON, COCODY], current: [PLATEAU] };
    const { confirm, checkbox, click } = open(ReactivateLinkDialogComponent, data);
    await click(checkbox('[data-warehouse="w1"]'));
    expect(confirm().disabled).toBe(true);
    await click(confirm());
    expect(closed).toEqual([]);
    await click(checkbox('[data-warehouse="w3"]'));
    await click(checkbox('[data-warehouse="w2"]'));
    expect(confirm().disabled).toBe(false);
    await click(confirm());
    expect(closed).toEqual([['w2', 'w3']]);
  });

  it('réactivation : aucun dépôt accessible, message et confirmation impossible', () => {
    const data: ReactivateLinkDialogData = { shopName: 'Boutique Awa', candidates: [], current: [FERME] };
    const { element, confirm } = open(ReactivateLinkDialogComponent, data);
    expect(element.textContent).toContain('Aucun dépôt accessible');
    expect(confirm().disabled).toBe(true);
  });

  // --- Révocation ------------------------------------------------------------------------------------------

  it('révocation : bouton inactif tant que la case explicite n’est pas cochée ; conséquence expliquée', async () => {
    const data: RevokeLinkDialogData = { shopName: 'Boutique <b>Awa</b>' };
    const { element, confirm, checkbox, click } = open(RevokeLinkDialogComponent, data);
    expect(element.textContent).toContain('nouvelle liaison');
    expect(element.textContent).toContain('Boutique <b>Awa</b>');
    expect(element.querySelector('b')).toBeNull();
    expect(confirm().disabled).toBe(true);
    await click(confirm());
    expect(closed).toEqual([]);
    await click(checkbox('[data-test="understood"]'));
    expect(confirm().disabled).toBe(false);
    await click(confirm());
    expect(closed).toEqual([true]);
  });
});
