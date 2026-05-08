import { Role } from './types';

export interface RoleState {
  roles: Role[];
}

export type RoleAction =
  | { type: 'ADD_ROLE'; payload: Role }
  | { type: 'UPDATE_ROLE'; payload: Role }
  | { type: 'DELETE_ROLE'; payload: { roleId: string } };
