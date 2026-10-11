import { Supplier } from '../../../core/models/supplier.model';

export interface SuppliersVm {
  isLoading: boolean;
  errorMessage: string | null;
  suppliers: Supplier[];
  filter: string;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export type SupplierDrawerMode = 'CREATE' | 'EDIT';

export interface SupplierDrawerState {
  opened: boolean;
  mode: SupplierDrawerMode;
  supplierId: string | null;
}
