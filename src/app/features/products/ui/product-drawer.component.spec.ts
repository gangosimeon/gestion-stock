import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { Product } from '../../../core/models/product.model';
import { ProductDrawerComponent } from './product-drawer.component';

const API = environment.apiUrl;

const PRODUCT: Product = {
  id: '9d1f5c3a-0000-4000-8000-000000000001',
  sku: 'MON-RB3025',
  name: 'Monture Ray-Ban RB3025',
  categoryId: '9d1f5c3a-0000-4000-8000-0000000000c1',
  supplierId: '9d1f5c3a-0000-4000-8000-0000000000f1',
  purchasePrice: 15000,
  retailPrice: 35000,
  wholesalePrice: 28000,
  stockQuantity: 7,
  alertThreshold: 3,
  barcode: '8053672611724',
  description: 'Aviateur',
  brandId: '9d1f5c3a-0000-4000-8000-0000000000b1',
  unit: 'PAIR',
  maxStockLevel: 20,
  active: true
};

describe('ProductDrawerComponent (formulaire produit)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProductDrawerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations()]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('modification : PUT complet (champs hors formulaire conservés), sans stock', () => {
    const fixture = TestBed.createComponent(ProductDrawerComponent);
    const drawer = fixture.componentInstance;
    drawer.ctx = {
      mode: 'edit',
      productId: PRODUCT.id,
      categories: [{ id: PRODUCT.categoryId, name: 'Montures' }],
      suppliers: [],
      canUpdate: true
    };
    drawer.ngOnChanges();
    http.expectOne(`${API}/products/${PRODUCT.id}`).flush(PRODUCT);
    fixture.detectChanges();

    // Le stock est affiché en lecture seule, pas saisissable.
    expect(drawer.form.contains('stockQuantity')).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Stock du dépôt courant');

    drawer.form.patchValue({ name: 'Monture RB3025 (2026)', retailPrice: 36000 });
    drawer.submit();

    const put = http.expectOne(`${API}/products/${PRODUCT.id}`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({
      sku: 'MON-RB3025',
      name: 'Monture RB3025 (2026)',
      categoryId: PRODUCT.categoryId,
      supplierId: PRODUCT.supplierId,
      purchasePrice: 15000,
      retailPrice: 36000,
      wholesalePrice: 28000,
      alertThreshold: 3,
      barcode: '8053672611724',
      description: 'Aviateur',
      brandId: PRODUCT.brandId,
      unit: 'PAIR',
      maxStockLevel: 20
    });
    put.flush(PRODUCT);
    // Rechargement de la liste après enregistrement (aucun abonné ici : pas d'appel).
  });

  it('création : pas de stock ; fournisseur choisi parmi ceux du backend', () => {
    const fixture = TestBed.createComponent(ProductDrawerComponent);
    const drawer = fixture.componentInstance;
    drawer.ctx = {
      mode: 'create',
      productId: null,
      categories: [{ id: PRODUCT.categoryId, name: 'Montures' }],
      suppliers: [{ id: PRODUCT.supplierId, name: 'Essilor' } as never],
      canUpdate: true
    };
    drawer.ngOnChanges();
    fixture.detectChanges();
    expect(drawer.form.controls.supplierId.value).toBe('');
    drawer.form.patchValue({
      sku: 'ETUI-1',
      name: 'Étui rigide',
      supplierId: PRODUCT.supplierId ?? '',
      purchasePrice: 1000,
      retailPrice: 2500,
      wholesalePrice: 2000
    });
    drawer.submit();

    const post = http.expectOne(`${API}/products`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toMatchObject({ sku: 'ETUI-1', categoryId: PRODUCT.categoryId, supplierId: PRODUCT.supplierId });
    expect(post.request.body).not.toHaveProperty('stockQuantity');
    post.flush({ ...PRODUCT, sku: 'ETUI-1' }, { status: 201, statusText: 'Created' });
  });
});
