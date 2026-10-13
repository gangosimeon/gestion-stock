export type ClientDrawerMode = 'CREATE' | 'EDIT';

export type ClientDrawerState =
  | { opened: false }
  | {
      opened: true;
      mode: ClientDrawerMode;
      customerId: string | null;
    };

export interface ClientsVm {
  isLoading: boolean;
  errorMessage: string | null;
  drawer: ClientDrawerState;
  // Interface seulement : le backend revérifie chaque permission.
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  /** customer:credit — fixer ou changer le plafond de crédit. */
  canCredit: boolean;
}
