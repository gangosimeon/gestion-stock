import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { Product } from '../../core/models/product.model';
import { ProductCardComponent } from './product-card.component';
import { ProductOptionComponent } from './product-option.component';
import { stockLabel, stockLevel } from './product-stock';
import { productHue, productInitials } from './product-thumb.component';

const CEMENT: Product = {
  id: 'p1',
  sku: 'CIM-45',
  name: 'Ciment CPJ-45 (50 kg)',
  categoryId: 'c',
  purchasePrice: 5000,
  retailPrice: 7300,
  wholesalePrice: 7000,
  stockQuantity: 50,
  alertThreshold: 5
};

describe('Produits à la vente : carte, ligne de choix, pastille et stock', () => {
  let http: HttpTestingController;

  function render<T>(component: Type<T>, inputs: Record<string, unknown>) {
    TestBed.configureTestingModule({ imports: [component], providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(component);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    return { fixture, root, text: () => root.textContent?.replace(/\s+/g, ' ') ?? '' };
  }

  afterEach(() => http?.verify());

  it('état du stock : rupture, stock faible (seuil d’alerte), disponible', () => {
    expect(stockLevel({ stockQuantity: 0, alertThreshold: 5 })).toBe('out');
    expect(stockLevel({ stockQuantity: 3, alertThreshold: 5 })).toBe('low');
    expect(stockLevel({ stockQuantity: 3, alertThreshold: 0 })).toBe('ok');
    expect(stockLabel({ stockQuantity: 0, alertThreshold: 5 })).toBe('Rupture');
    expect(stockLabel({ stockQuantity: 3, alertThreshold: 5 })).toBe('Stock faible : 3');
    expect(stockLabel({ stockQuantity: 50, alertThreshold: 5 })).toBe('Stock : 50');
  });

  it('sans photo : initiales et teinte stables, tirées du nom', () => {
    expect(productInitials('Ciment CPJ-45 (50 kg)')).toBe('CC');
    expect(productInitials('Fer à béton 10 mm')).toBe('FB');
    expect(productInitials('Clous 5 cm (kg)')).toBe('CC');
    expect(productInitials('Peinture à eau 5 L')).toBe('PE');
    expect(productInitials('fer')).toBe('F');
    expect(productInitials('42.5')).toBe('4');
    expect(productInitials('  ')).toBe('?');
    expect(productHue('Ciment')).toBe(productHue('Ciment'));
  });

  it('carte : nom, prix, état du stock, quantité au panier ; un toucher choisit le produit', () => {
    const { fixture, root, text } = render(ProductCardComponent, { product: { ...CEMENT, stockQuantity: 3 }, unitPrice: 7300, inCart: 2 });
    expect(text()).toContain('Ciment CPJ-45 (50 kg)');
    expect(text()).toMatch(/7\s?300 FCFA/);
    expect(text()).toContain('Stock faible : 3');
    expect(root.querySelector('.card__badge')?.textContent).toBe('2');
    expect(root.querySelector('.thumb__initials')?.textContent).toBe('CC');
    expect(root.querySelector('button')?.getAttribute('aria-label')).toMatch(/Ciment CPJ-45 \(50 kg\), 7\s?300 FCFA, Stock faible : 3, 2 dans le panier/);

    const picked: Product[] = [];
    fixture.componentInstance.pick.subscribe((p) => picked.push(p));
    root.querySelector('button')!.click();
    expect(picked.map((p) => p.id)).toEqual(['p1']);
  });

  it('carte avec photo : image chargée (authentifiée) à la place des initiales', () => {
    (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = () => 'blob:local/photo';
    const { fixture, root } = render(ProductCardComponent, { product: { ...CEMENT, imageVersion: 'v1' }, unitPrice: 7300 });
    http.expectOne(`${environment.apiUrl}/products/p1/image`).flush(new Blob(['jpeg']));
    fixture.detectChanges();
    expect(root.querySelector('img')?.getAttribute('src')).toBe('blob:local/photo');
    expect(root.querySelector('.thumb__initials')).toBeNull();
  });

  it('carte en rupture : signalée', () => {
    const { root, text } = render(ProductCardComponent, { product: { ...CEMENT, stockQuantity: 0 }, unitPrice: 7300 });
    expect(text()).toContain('Rupture');
    expect(root.querySelector('.card--out')).not.toBeNull();
  });

  it('ligne de choix : photo, nom, référence, stock et prix sur une ligne', () => {
    const { text, root } = render(ProductOptionComponent, { product: CEMENT, unitPrice: 7000 });
    expect(text()).toContain('Ciment CPJ-45 (50 kg)');
    expect(text()).toContain('CIM-45');
    expect(text()).toContain('Stock : 50');
    expect(text()).toMatch(/7\s?000 FCFA/);
    expect(root.querySelector('app-product-thumb')).not.toBeNull();
  });
});
