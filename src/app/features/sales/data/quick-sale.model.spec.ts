import { Product } from '../../../core/models/product.model';
import {
  KeyValueStore,
  exactProduct,
  favoriteProducts,
  preferredSalesMode,
  recordSoldProducts,
  rememberSalesMode,
  searchProducts
} from './quick-sale.model';

function product(id: string, name: string, extra: Partial<Product> = {}): Product {
  return {
    id,
    sku: id.toUpperCase(),
    name,
    categoryId: 'c',
    purchasePrice: 0,
    retailPrice: 1000,
    wholesalePrice: 900,
    stockQuantity: 10,
    alertThreshold: 0,
    ...extra
  };
}

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => (data[k] = v) };
}

const CEMENT = product('cim-45', 'Ciment CPJ-45 (50 kg)', { barcode: '6001234567890' });
const IRON = product('fer-10', 'Fer à béton 10 mm');
const NAILS = product('clo-5', 'Clous 5 cm', { stockQuantity: 0 });
const PAINT = product('pei-5', 'Peinture à eau 5 L');
const CATALOG = [CEMENT, IRON, NAILS, PAINT];

describe('Caisse rapide — recherche', () => {
  it('tous les mots, dans n’importe quel ordre, sans tenir compte des accents ni de la casse', () => {
    expect(searchProducts(CATALOG, 'cpj ciment')).toEqual([CEMENT]);
    expect(searchProducts(CATALOG, 'BETON')).toEqual([IRON]);
    expect(searchProducts(CATALOG, 'a eau')).toEqual([PAINT]);
    expect(searchProducts(CATALOG, 'fer-10')).toEqual([IRON]); // référence
    expect(searchProducts(CATALOG, '600123')).toEqual([CEMENT]); // code-barres
    expect(searchProducts(CATALOG, '   ')).toEqual([]);
  });

  it('les articles dont le nom commence par la saisie passent en premier', () => {
    const ciseaux = product('cis', 'Ciseaux à tôle');
    expect(searchProducts([CEMENT, ciseaux], 'ci').map((p) => p.id)).toEqual(['cim-45', 'cis']);
    expect(searchProducts([product('a', 'Pointe ciment'), CEMENT], 'ciment')[0]).toBe(CEMENT);
  });

  it('Entrée / lecteur de codes-barres : code-barres ou référence exacts, sinon résultat unique', () => {
    expect(exactProduct(CATALOG, '6001234567890')).toBe(CEMENT);
    expect(exactProduct(CATALOG, 'FER-10')).toBe(IRON);
    expect(exactProduct(CATALOG, 'peinture')).toBe(PAINT);
    // Ambigu ou introuvable : rien n'est ajouté à l'aveugle.
    expect(exactProduct([CEMENT, product('cim-42', 'Ciment CPA 42.5')], 'ciment')).toBeNull();
    expect(exactProduct(CATALOG, 'inconnu')).toBeNull();
    expect(exactProduct(CATALOG, '')).toBeNull();
  });
});

describe('Caisse rapide — articles favoris (appris sur l’appareil, par dépôt)', () => {
  it('premier usage : articles en stock, par ordre alphabétique', () => {
    expect(favoriteProducts(memoryStore(), 'w1', CATALOG, 3).map((p) => p.id)).toEqual(['cim-45', 'fer-10', 'pei-5']);
  });

  it('les articles les plus vendus passent en tête, complétés par des articles en stock', () => {
    const store = memoryStore();
    recordSoldProducts(store, 'w1', ['pei-5', 'fer-10']);
    recordSoldProducts(store, 'w1', ['pei-5', 'pei-5']); // compté une fois par vente

    expect(favoriteProducts(store, 'w1', CATALOG, 3).map((p) => p.id)).toEqual(['pei-5', 'fer-10', 'cim-45']);
    // Un autre dépôt garde ses propres favoris.
    expect(favoriteProducts(store, 'w2', CATALOG, 1).map((p) => p.id)).toEqual(['cim-45']);
  });

  it('un article retiré du catalogue disparaît des favoris ; un stockage illisible est ignoré', () => {
    const store = memoryStore();
    recordSoldProducts(store, 'w1', ['ancien']);
    expect(favoriteProducts(store, 'w1', CATALOG, 1).map((p) => p.id)).toEqual(['cim-45']);

    const broken = memoryStore({ 'geststock.quickSale.favorites.w1': '{pas du json' });
    expect(favoriteProducts(broken, 'w1', CATALOG, 2)).toHaveLength(2);
    recordSoldProducts(broken, 'w1', ['fer-10']);
    expect(favoriteProducts(broken, 'w1', CATALOG, 1)).toEqual([IRON]);
  });

  it('le nombre d’articles retenus est borné', () => {
    const store = memoryStore();
    recordSoldProducts(store, 'w1', Array.from({ length: 80 }, (_, i) => `p${i}`));
    expect(Object.keys(JSON.parse(store.data['geststock.quickSale.favorites.w1']))).toHaveLength(60);
  });
});

describe('Caisse rapide — mode mémorisé', () => {
  it('caisse complète par défaut ; le dernier mode utilisé est retenu', () => {
    const store = memoryStore();
    expect(preferredSalesMode(store)).toBe('full');
    rememberSalesMode('quick', store);
    expect(preferredSalesMode(store)).toBe('quick');
    rememberSalesMode('full', store);
    expect(preferredSalesMode(store)).toBe('full');
  });
});
