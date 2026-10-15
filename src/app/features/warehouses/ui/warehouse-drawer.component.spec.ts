import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { environment } from '../../../../environments/environment';
import { WarehouseDrawerComponent } from './warehouse-drawer.component';

const URL = `${environment.apiUrl}/warehouses`;
const COCODY = {
  id: '3f0c8e1a-0000-4000-8000-000000000002', name: 'Magasin Cocody', code: 'MAG-02', type: 'STORE',
  address: 'Riviera 2', phone: '0102030405', active: true
};

describe('WarehouseDrawerComponent (création d’un dépôt)', () => {
  let http: HttpTestingController;

  function setup(warehouse: unknown = null): WarehouseDrawerComponent {
    TestBed.configureTestingModule({
      imports: [WarehouseDrawerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()]
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(WarehouseDrawerComponent);
    fixture.componentRef.setInput('ctx', { warehouse });
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  afterEach(() => http.verify());

  it('envoie nom et type choisis ; champs facultatifs vides non envoyés (code généré par le backend)', () => {
    const drawer = setup();
    const saved = vi.fn();
    drawer.saved.subscribe(saved);
    drawer.form.setValue({ name: '  Entrepôt Yopougon ', type: 'WAREHOUSE', code: '', address: ' ', phone: '' });

    drawer.submit();

    const req = http.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({ name: 'Entrepôt Yopougon', type: 'WAREHOUSE' });
    req.flush({ id: 'n', name: 'Entrepôt Yopougon', code: 'DEP-01', type: 'WAREHOUSE', active: true });
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({ code: 'DEP-01' }));
  });

  it('code, adresse et téléphone saisis sont transmis', () => {
    const drawer = setup();
    drawer.form.setValue({ name: 'Magasin Plateau', type: 'STORE', code: 'MAG-10', address: 'Avenue Chardy', phone: '+225 07 00 00 00' });

    drawer.submit();

    const req = http.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({
      name: 'Magasin Plateau',
      type: 'STORE',
      code: 'MAG-10',
      address: 'Avenue Chardy',
      phone: '+225 07 00 00 00'
    });
    req.flush({ id: 'n', name: 'Magasin Plateau' });
  });

  it('type obligatoire, code et téléphone contrôlés comme par le backend : rien n’est envoyé', () => {
    const drawer = setup();
    drawer.form.setValue({ name: 'Magasin Plateau', type: null, code: 'MAG 10', address: '', phone: 'appeler' });

    drawer.submit();

    http.expectNone(URL);
    expect(drawer.form.controls.type.hasError('required')).toBe(true);
    expect(drawer.form.controls.code.hasError('pattern')).toBe(true);
    expect(drawer.form.controls.phone.hasError('pattern')).toBe(true);
  });

  it('modification : formulaire prérempli, PUT du dépôt ; adresse vidée envoyée absente (effacée par le backend)', () => {
    const drawer = setup(COCODY);
    expect(drawer.title).toBe('Modifier le dépôt');
    expect(drawer.form.getRawValue()).toEqual({
      name: 'Magasin Cocody', type: 'STORE', code: 'MAG-02', address: 'Riviera 2', phone: '0102030405'
    });
    const saved = vi.fn();
    drawer.saved.subscribe(saved);
    drawer.form.patchValue({ name: 'Entrepôt Cocody', type: 'WAREHOUSE', address: '' });

    drawer.submit();

    const req = http.expectOne(`${URL}/${COCODY.id}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Entrepôt Cocody', type: 'WAREHOUSE', code: 'MAG-02', phone: '0102030405' });
    req.flush({ ...COCODY, name: 'Entrepôt Cocody', type: 'WAREHOUSE', address: null });
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({ name: 'Entrepôt Cocody' }));
  });

  it('refus du backend (code déjà utilisé) : message affiché, panneau ouvert', () => {
    const drawer = setup();
    const saved = vi.fn();
    drawer.saved.subscribe(saved);
    drawer.form.setValue({ name: 'Magasin Plateau', type: 'STORE', code: 'MAG-01', address: '', phone: '' });

    drawer.submit();

    http
      .expectOne((r) => r.url === URL && r.method === 'POST')
      .flush(
        { status: 409, code: 'WAREHOUSE_CODE_ALREADY_USED', message: 'Ce code de dépôt est déjà utilisé.' },
        { status: 409, statusText: 'Conflict' }
      );
    expect(drawer.errorMessage).toBe('Ce code de dépôt est déjà utilisé.');
    expect(drawer.saving).toBe(false);
    expect(saved).not.toHaveBeenCalled();
  });
});
