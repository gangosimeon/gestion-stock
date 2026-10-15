import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { WarehouseDetailsDialogComponent, WarehouseDetailsDialogData } from './warehouse-details-dialog.component';

const COCODY = {
  id: '3f0c8e1a-0000-4000-8000-000000000002', name: 'Magasin Cocody', code: 'MAG-02', type: 'STORE',
  address: 'Riviera 2', phone: null, main: true, active: true, createdAt: '2026-10-01T08:30:00Z'
};

describe('WarehouseDetailsDialogComponent (détail d’un dépôt)', () => {
  function render(data: WarehouseDetailsDialogData): HTMLElement {
    TestBed.configureTestingModule({
      imports: [WarehouseDetailsDialogComponent],
      providers: [{ provide: MAT_DIALOG_DATA, useValue: data }]
    });
    const fixture = TestBed.createComponent(WarehouseDetailsDialogComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('affiche code, type, statut, dépôt principal et coordonnées (— si absentes)', () => {
    const el = render({ warehouse: COCODY, typeLabel: 'Magasin', canEdit: true });
    const text = el.textContent ?? '';

    expect(text).toContain('Magasin Cocody');
    expect(text).toContain('MAG-02');
    expect(text).toContain('Actif');
    expect(text).toContain('Dépôt principal');
    expect(text).toContain('Riviera 2');
    expect(text).toContain('—');
    expect(text).toContain('Modifier');
  });

  it('sans droit de gestion : pas de bouton « Modifier »', () => {
    const el = render({ warehouse: { ...COCODY, main: false }, typeLabel: 'Magasin', canEdit: false });

    expect(el.textContent).not.toContain('Modifier');
    expect(el.textContent).not.toContain('Dépôt principal');
  });
});
