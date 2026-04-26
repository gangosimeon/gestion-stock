import { Category } from '../../../core/models/category.model';
import { Product } from '../../../core/models/product.model';
import { Supplier } from '../../../core/models/supplier.model';

export interface ProductListVm {
  isLoading: boolean;
  errorMessage: string | null;
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  filter: string;
}

export type ProductDrawerMode = 'create' | 'edit' | 'detail';

export interface ProductDrawerState {
  opened: boolean;
  mode: ProductDrawerMode;
  productId: string | null;
}
