import { Notification } from "./types";

export interface NotificationState {
  notifications: Notification[];
  levelUpInfo: { levelName: string } | null;
}

export type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; payload: { userId: string | 'admin'; message: string; link?: string } }
  | { type: 'MARK_AS_READ'; payload: { userId: string | 'admin' } }
  | { type: 'MARK_ONE_AS_READ'; payload: { notificationId: string } }
  | { type: 'SEND_BULK_NOTIFICATIONS'; payload: { userIds: string[]; message: string; link?: string } }
  | { type: 'SHOW_LEVEL_UP'; payload: { levelName: string } }
  | { type: 'CLEAR_LEVEL_UP' };