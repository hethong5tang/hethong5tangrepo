

import { AdminManagedUser } from "../users/types";

export const createNotificationActions = (deps: {
    notificationDispatch: any;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    userDispatch: any;
    loggedInUser: AdminManagedUser | null;
}) => {
    const { notificationDispatch, addToast, userDispatch, loggedInUser } = deps;

    const handleSendBulkNotifications = (userIds: string[], message: string, link?: string) => {
        notificationDispatch({ type: 'SEND_BULK_NOTIFICATIONS', payload: { userIds, message, link } });
        addToast(`Đã gửi thông báo tới ${userIds.length} người dùng.`, 'success');
    };

    const markNotificationsAsRead = (userId: string | 'admin') => {
        notificationDispatch({ type: 'MARK_AS_READ', payload: { userId } });
    };
    
    const markOneAsRead = (notificationId: string) => {
        notificationDispatch({ type: 'MARK_ONE_AS_READ', payload: { notificationId } });
    };

    const handleShowLevelUpNotification = (levelName: string) => {
        // Step 1: Show the modal immediately
        notificationDispatch({ type: 'SHOW_LEVEL_UP', payload: { levelName } });

        // Step 2: Immediately clear the flag from the user state
        // This prevents the popup from re-triggering on re-renders, fixing the infinite loop.
        if (loggedInUser) {
            userDispatch({
                type: 'UPDATE_USER',
                payload: { id: loggedInUser.id, pendingLevelUpInfo: null },
            });
        }
    };

    const clearLevelUpNotification = () => {
        // This action's only job now is to close the modal.
        notificationDispatch({ type: 'CLEAR_LEVEL_UP' });
    };

    return {
        handleSendBulkNotifications,
        markNotificationsAsRead,
        markOneAsRead,
        clearLevelUpNotification,
        handleShowLevelUpNotification,
    };
};