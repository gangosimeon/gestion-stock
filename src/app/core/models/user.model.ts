import { Role } from './role.model';

export interface User {
  id: string;
  username: string;
  fullName: string;
  phone?: string;
  roles: Role[];
  isActive: boolean;
}
