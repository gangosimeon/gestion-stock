import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Product } from '../../../core/models/product.model';
import { WarehouseContextService } from '../../../core/services/warehouse-context.service';
import { SalesFacade } from './sales.facade';

const API = environment.apiUrl;
const PLATEAU = { id: '3f0c8e1a-0000-4000-8000-000000000001', name: 'Magasin Plateau' };
const COCODY = { id: '3f0c8e1a-0000-4000-8000-000000000002', name: 'Magasin Cocody' };

function product(id: string, stockQuantity: number): Product {
  return {
    id,
    sku: `SKU-${id.slice(-2)}`,
    name: `Produit ${id.slice(-2)}`,
    categoryId: 'c',
    purchasePrice: 1000,
    retailPrice: 2000,
    wholesalePrice: 1500,
    stockQuantity,
    alertThreshold: 1
  };
}

const AT_PLATEAU = product('4e2f0a10-0000-4000-8000-000000000001', 5);
const AT_COCODY = product('4e2f0a10-0000-4000-8000-000000000002', 9);

describe('SalesFacade : changement de magasin', () => {
  let facade: SalesFacade;
  let ctx: WarehouseContextService;
  let http: HttpTestingController;
  let confirmAnswer: boolean;
  let dialogOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    confirmAnswer = false;
    dialogOpen = vi.fn(() => ({ afterClosed: () => of(confirmAnswer) }));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MatDialog, useValue: { open: dialogOpen } }
      ]
    });
    ctx = TestBed.inject(WarehouseContextService);
    ctx.select(PLATEAU);
    facade = TestBed.inject(SalesFacade);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function load(products: Product[]): void {
    facade.refresh();
    http.expectOne(`${API}/products`).flush({ items: products, total: products.length });
    http.expectOne(`${API}/customers`).flush({ items: [], total: 0 });
  }

  async function cart(): Promise<string[]> {
    return (await firstValueFrom(facade.vm$)).cart.map((r) => r.productId);
  }

  it('panier vide : le magasin change sans confirmation', async () => {
    load([AT_PLATEAU]);

    expect(await ctx.requestSelect(COCODY)).toBe(true);
    expect(dialogOpen).not.toHaveBeenCalled();
    expect(ctx.warehouseId).toBe(COCODY.id);
  });

  it('panier rempli et refus : magasin et panier conservés', async () => {
    load([AT_PLATEAU]);
    facade.addProductToCart(AT_PLATEAU.id);

    expect(await ctx.requestSelect(COCODY)).toBe(false);
    expect(dialogOpen).toHaveBeenCalledTimes(1);
    expect(ctx.warehouseId).toBe(PLATEAU.id);
    expect(await cart()).toEqual([AT_PLATEAU.id]);
  });

  it('panier rempli et confirmation : panier vidé, catalogue du magasin précédent effacé', async () => {
    load([AT_PLATEAU]);
    facade.addProductToCart(AT_PLATEAU.id);
    confirmAnswer = true;

    expect(await ctx.requestSelect(COCODY)).toBe(true);
    expect(ctx.warehouseId).toBe(COCODY.id);
    const vm = await firstValueFrom(facade.vm$);
    expect(vm.cart).toEqual([]);
    expect(vm.products).toEqual([]);
  });

  it('réponse d’un chargement de l’ancien magasin : jamais affichée à la place du nouveau', async () => {
    facade.refresh();
    const oldProducts = http.expectOne(`${API}/products`);
    const oldCustomers = http.expectOne(`${API}/customers`);

    await ctx.requestSelect(COCODY);
    load([AT_COCODY]);
    expect(oldProducts.cancelled).toBe(true);
    expect(oldCustomers.cancelled).toBe(true);
    expect((await firstValueFrom(facade.vm$)).products.map((p) => p.id)).toEqual([AT_COCODY.id]);
  });
});
