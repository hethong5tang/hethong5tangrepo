import { Notification } from './types';
import { NotificationAction, NotificationState } from './notificationTypes';

export const notificationReducer = (state: NotificationState, action: NotificationAction): NotificationState => {
  switch (action.type) {
    case 'ADD_NOTIFICATION': {
      const { userId, message, link } = action.payload;
      const newNotification: Notification = {
        id: `notif_${Date.now()}`,
        userId,
        message,
        link,
        date: new Date().toISOString().split('T')[0],
        isRead: false,
      };
      return {
        ...state,
        notifications: [newNotification, ...state.notifications],
      };
    }
    
    case 'MARK_AS_READ': {
      const { userId } = action.payload;
      return {
        ...state,
        notifications: state.notifications.map(n =>
          (n.userId === userId && !n.isRead) ? { ...n, isRead: true } : n
        ),
      };
    }

    case 'MARK_ONE_AS_READ': {
        const { notificationId } = action.payload;
        return {
            ...state,
            notifications: state.notifications.map(n =>
                n.id === notificationId ? { ...n, isRead: true } : n
            ),
        };
    }

    case 'SEND_BULK_NOTIFICATIONS': {
        const { userIds, message, link } = action.payload;
        const newNotifications: Notification[] = userIds.map(userId => ({
            id: `notif_${Date.now()}_${userId}`,
            userId,
            message,
            link,
            date: new Date().toISOString().split('T')[0],
            isRead: false,
        }));
        return {
            ...state,
            notifications: [...newNotifications, ...state.notifications],
        };
    }

    case 'SHOW_LEVEL_UP':
      return {
        ...state,
        levelUpInfo: action.payload,
      };

    case 'CLEAR_LEVEL_UP':
      return {
        ...state,
        levelUpInfo: null,
      };

    default:
      return state;
  }
};