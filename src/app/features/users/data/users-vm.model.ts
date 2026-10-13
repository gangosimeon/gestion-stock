import { Role } from '../../../core/models/role.model';

export interface UsersVm {
  isLoading: boolean;
  errorMessage: string | null;
  canManage: boolean;
}

export type UserDrawerMode = 'CREATE' | 'EDIT';

export interface UserDrawerState {
  opened: boolean;
  mode: UserDrawerMode;
  userId: string | null;
}

export const roleLabels: Record<Role, string> = {
  ADMIN: 'Admin',
  CAISSIER: 'Caissier',
  GESTIONNAIRE: 'Gestionnaire'
};
