import { Product } from '../../core/models/product.model';

/** État du stock affiché à la vente : rupture, stock faible (seuil d'alerte du produit) ou disponible. */
export type StockLevel = 'out' | 'low' | 'ok';

export function stockLevel(product: Pick<Product, 'stockQuantity' | 'alertThreshold'>): StockLevel {
  if (product.stockQuantity <= 0) return 'out';
  if (product.alertThreshold > 0 && product.stockQuantity <= product.alertThreshold) return 'low';
  return 'ok';
}

export function stockLabel(product: Pick<Product, 'stockQuantity' | 'alertThreshold'>): string {
  switch (stockLevel(product)) {
    case 'out':
      return 'Rupture';
    case 'low':
      return `Stock faible : ${product.stockQuantity}`;
    default:
      return `Stock : ${product.stockQuantity}`;
  }
}

/** Montant au format français, sans décimale : 7 300. */
export function formatFcfa(value: number | null | undefined): string {
  return Math.round(Number(value) || 0).toLocaleString('fr-FR');
}
