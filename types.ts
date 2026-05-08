export enum UserRole {
  Admin = 'admin',
  User = 'user',
}

export enum ActionType {
  VIEW_USER = 'VIEW_USER',
  PREPARE_WITHDRAWAL = 'PREPARE_WITHDRAWAL',
  NAVIGATE = 'NAVIGATE',
}

export interface Action {
  type: ActionType;
  payload: any;
}

export interface Message {
    sender: 'user' | 'ai';
    text: string;
    action?: {
      type: ActionType;
      payload: any;
      label: string;
    };
}
