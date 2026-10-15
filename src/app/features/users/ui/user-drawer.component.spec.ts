import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { User } from '../../../core/models/user.model';
import { UserDrawerComponent, UserDrawerContext } from './user-drawer.component';

const API = environment.apiUrl;
const PLATEAU = { id: '3f0c8e1a-0000-4000-8000-000000000001', name: 'Magasin Plateau', active: true };
const COCODY = { id: '3f0c8e1a-0000-4000-8000-000000000002', name: 'Magasin Cocody', active: true };
const FERME = { id: '3f0c8e1a-0000-4000-8000-000000000003', name: 'Ancien magasin', active: false };

const ALICE: User = {
  id: '0b6a1c52-0000-4000-8000-000000000001',
  username: 'alice',
  fullName: 'Alice Kouamé',
  roles: ['CAISSIER'],
  isActive: true,
  defaultWarehouseId: PLATEAU.id,
  warehouseIds: [PLATEAU.id, FERME.id]
};

describe('UserDrawerComponent (dépôts de l’utilisateur)', () => {
  let http: HttpTestingController;

  function open(ctx: UserDrawerContext) {
    TestBed.configureTestingModule({
      imports: [UserDrawerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations()]
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(UserDrawerComponent);
    fixture.componentRef.setInput('ctx', ctx);
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();
    http.expectOne(`${API}/warehouses`).flush({ items: [PLATEAU, COCODY, FERME], total: 3 });
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  afterEach(() => http.verify());

  it('création : dépôts autorisés et dépôt par défaut envoyés au backend', () => {
    const drawer = open({ mode: 'CREATE', user: null });
    drawer.form.patchValue({ username: 'bob.k', fullName: 'Bob Konan', roles: ['CAISSIER'] });
    drawer.form.controls.warehouseIds.setValue([COCODY.id]);
    expect(drawer.form.controls.defaultWarehouseId.value).toBe(COCODY.id);

    drawer.submit();

    const req = http.expectOne(`${API}/users`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({ warehouseIds: [COCODY.id], defaultWarehouseId: COCODY.id });
    req.flush({ ...ALICE, id: 'b', username: 'bob.k' });
  });

  it('dépôt par défaut obligatoire et choisi parmi les dépôts autorisés', () => {
    const drawer = open({ mode: 'CREATE', user: null });
    drawer.form.patchValue({ username: 'bob.k', fullName: 'Bob Konan', roles: ['CAISSIER'] });
    drawer.form.controls.warehouseIds.setValue([PLATEAU.id, COCODY.id]);
    drawer.form.controls.defaultWarehouseId.setValue('');
    drawer.form.controls.warehouseIds.markAsTouched();

    expect(drawer.form.errors).toEqual({ defaultRequired: true });
    expect(drawer.warehouseError()).toContain('Choisissez le dépôt par défaut');
    drawer.submit();
    http.expectNone(`${API}/users`);

    // Dépôt par défaut retiré de la liste : il n'est plus choisi.
    drawer.form.controls.defaultWarehouseId.setValue(COCODY.id);
    drawer.form.controls.warehouseIds.setValue([PLATEAU.id]);
    expect(drawer.form.controls.defaultWarehouseId.value).toBe('');
  });

  it('modification : les dépôts actuels sont repris ; un dépôt désactivé n’est pas renvoyé', () => {
    const drawer = open({ mode: 'EDIT', user: ALICE });
    expect(drawer.form.controls.warehouseIds.value).toEqual([PLATEAU.id, FERME.id]);
    expect(drawer.form.controls.defaultWarehouseId.value).toBe(PLATEAU.id);

    drawer.submit();

    const req = http.expectOne(`${API}/users/${ALICE.id}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toMatchObject({ warehouseIds: [PLATEAU.id], defaultWarehouseId: PLATEAU.id });
    req.flush(ALICE);
  });

  it('modification : tout retirer à un utilisateur qui a un dépôt par défaut est refusé', () => {
    const drawer = open({ mode: 'EDIT', user: ALICE });
    drawer.form.controls.warehouseIds.setValue([]);
    drawer.form.controls.warehouseIds.markAsTouched();

    expect(drawer.form.errors).toEqual({ keepOneWarehouse: true });
    expect(drawer.warehouseError()).toContain('Gardez au moins un dépôt');
    drawer.submit();
    http.expectNone(`${API}/users/${ALICE.id}`);
  });
});
