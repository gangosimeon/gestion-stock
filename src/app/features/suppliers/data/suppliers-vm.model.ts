export interface SuppliersVm {
  isLoading: boolean;
  errorMessage: string | null;
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
