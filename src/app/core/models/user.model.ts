import { Role } from './role.model';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  roles: Role[];
  role?: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  isActive: boolean;
  magasin?: string;
  avatar?: string;
}
