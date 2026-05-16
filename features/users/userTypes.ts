
import { AdminManagedUser, UserStatus, GenerationResult } from "./types";

export interface UserState {
  allUsers: AdminManagedUser[];
}

export type UserAction =
  | { type: 'ADD_USER'; payload: { newUser: AdminManagedUser; parentId?: string } }
  | { type: 'UPDATE_USER'; payload: Partial<AdminManagedUser> & { id: string } }
  // Added BULK_UPDATE_USERS action type with id requirement for each item
  | { type: 'BULK_UPDATE_USERS'; payload: (Partial<AdminManagedUser> & { id: string })[] }
  | { type: 'BULK_UPDATE_STATUS'; payload: { userIds: string[]; status: UserStatus } }
  | { type: 'DELETE_USER'; payload: { userId: string } }
  | { type: 'SET_USER_TREE'; payload: AdminManagedUser[] }
  | { type: 'REFUND_USER_BALANCE'; payload: { userId: string; amount: number } }
  | { type: 'ADD_GENERATION_RESULT'; payload: { userId: string; result: GenerationResult } }
  | { type: 'DELETE_GENERATION_RESULT'; payload: { userId: string; taskId: string } }
  | { type: 'DELETE_SINGLE_IMAGE_FROM_RESULT'; payload: { userId: string; taskId: string; imageIndex: number } }
  | { type: 'ADJUST_USER_CREDIT'; payload: { userId: string; amount: number } }
  | { type: 'CLEANUP_EXPIRED_GENERATIONS' };
