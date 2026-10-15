import { TestBed } from '@angular/core/testing';

import { WarehouseContextService } from './warehouse-context.service';

const PLATEAU = { id: '3f0c8e1a-0000-4000-8000-000000000001', name: 'Magasin Plateau' };
const COCODY = { id: '3f0c8e1a-0000-4000-8000-000000000002', name: 'Magasin Cocody' };

describe('WarehouseContextService (changement de dépôt)', () => {
  let ctx: WarehouseContextService;
  let changes: string[];

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    ctx = TestBed.inject(WarehouseContextService);
    changes = [];
  });

  it('émet seulement les vrais changements, jamais la valeur présente à l’abonnement', () => {
    ctx.select(PLATEAU);
    ctx.warehouseChanged$.subscribe((id) => changes.push(id));

    ctx.select(PLATEAU);
    ctx.select({ ...PLATEAU, name: 'Plateau (renommé)' });
    expect(changes).toEqual([]);

    ctx.select(COCODY);
    expect(changes).toEqual([COCODY.id]);
  });

  it('choix oublié puis dépôt appliqué par le backend : un seul changement, vers le nouveau dépôt', () => {
    ctx.select(PLATEAU);
    ctx.warehouseChanged$.subscribe((id) => changes.push(id));

    ctx.reset();
    expect(changes).toEqual([]);
    ctx.select(COCODY);
    expect(changes).toEqual([COCODY.id]);
  });

  it('premier dépôt d’une session (aucun choix enregistré) : pas de rechargement inutile', () => {
    ctx.warehouseChanged$.subscribe((id) => changes.push(id));
    ctx.select(PLATEAU);
    expect(changes).toEqual([]);
  });

  it('un contrôle qui refuse annule le changement ; accepté, le dépôt change', async () => {
    ctx.select(PLATEAU);
    let answer = false;
    const check = vi.fn(() => answer);
    const remove = ctx.addSwitchCheck(check);

    expect(await ctx.requestSelect(COCODY)).toBe(false);
    expect(ctx.warehouseId).toBe(PLATEAU.id);

    answer = true;
    expect(await ctx.requestSelect(COCODY)).toBe(true);
    expect(ctx.warehouseId).toBe(COCODY.id);
    expect(check).toHaveBeenCalledTimes(2);

    // Même dépôt : rien à demander. Contrôle retiré : plus consulté.
    expect(await ctx.requestSelect(COCODY)).toBe(false);
    remove();
    expect(await ctx.requestSelect(PLATEAU)).toBe(true);
    expect(check).toHaveBeenCalledTimes(2);
  });
});
