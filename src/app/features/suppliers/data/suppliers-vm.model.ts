import { Supplier } from '../../../core/models/supplier.model';

export interface SuppliersVm {
  isLoading: boolean;
  errorMessage: string | null;
  suppliers: Supplier[];
  filter: string;
}

export type SupplierDrawerMode = 'CREATE' | 'EDIT';

export interface SupplierDrawerState {
  opened: boolean;
  mode: SupplierDrawerMode;
  supplierId: string | null;
}
