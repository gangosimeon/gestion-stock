export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  magasin?: string;
  avatar?: string;
}
