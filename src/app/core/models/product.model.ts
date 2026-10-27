export type ProductUnit = 'UNIT' | 'PAIR' | 'BOX';

export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  supplierId?: string | null;
  purchasePrice: number;
  retailPrice: number;
  wholesalePrice: number;
  /** Stock du dépôt courant, calculé par le backend (lecture seule). */
  stockQuantity: number;
  alertThreshold: number;
  // Champs du backend absents du formulaire : conservés tels quels lors d'une modification.
  barcode?: string | null;
  description?: string | null;
  brandId?: string | null;
  brandName?: string | null;
  unit?: ProductUnit | null;
  maxStockLevel?: number | null;
  active?: boolean;
  /** Version de la photo (empreinte) ; absente sans photo. Image : GET /api/products/{id}/image. */
  imageVersion?: string | null;
}
