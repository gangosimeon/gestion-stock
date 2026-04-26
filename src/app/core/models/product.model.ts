export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  supplierId?: string;
  purchasePrice: number;
  retailPrice: number;
  wholesalePrice: number;
  stockQuantity: number;
  alertThreshold: number;
}
