import { StockAlertType } from '../../../core/models/alert.model';
import { Category } from '../../../core/models/category.model';
import { Product } from '../../../core/models/product.model';
import { Supplier } from '../../../core/models/supplier.model';

export interface ProductListVm {
  isLoading: boolean;
  errorMessage: string | null;
  products: Product[];
  /** Niveau de stock calculé par le backend, par produit (absent = disponible). */
  stockLevels: ReadonlyMap<string, StockAlertType>;
  categories: Category[];
  suppliers: Supplier[];
  filter: string;
  // Interface seulement : le backend contrôle product:create / update / delete à chaque appel.
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export type ProductDrawerMode = 'create' | 'edit' | 'detail';

export interface ProductDrawerState {
  opened: boolean;
  mode: ProductDrawerMode;
  productId: string | null;
}
