import { Role } from '../../../core/models/role.model';
import { User } from '../../../core/models/user.model';

export interface UsersVm {
  isLoading: boolean;
  errorMessage: string | null;
  canManage: boolean;
  items: User[];
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
