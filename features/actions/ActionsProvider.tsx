import React, { createContext, ReactNode, useMemo } from 'react';
import { useToast } from '../../components/ToastProvider';
import { useFinance } from '../finance/useFinance';
import { useUser } from '../users/useUser';
import { useNotification } from '../notifications/useNotification';
import { useSupport } from '../support/useSupport';
import { useSettings } from '../settings/useSettings';
import { useRoles } from '../roles/useRoles';
import { useAuth } from '../auth/useAuth';
import { useLogging } from '../logging/useLogging';
import { LogEntry, LoggableAction } from '../logging/types';

import { createAuthActions } from '../auth/authActions';
import { createFinanceActions } from '../finance/financeActions';
import { createNotificationActions } from '../notifications/notificationActions';
import { createRoleActions } from '../roles/roleActions';
import { createSettingsActions } from '../settings/settingsActions';
import { createSupportActions } from '../support/supportActions';
import { createUserActions } from '../users/userActions';

// Define the shape of the context value by merging the return types of all action creators
type AllActions = ReturnType<typeof createAuthActions> &
                  ReturnType<typeof createFinanceActions> &
                  ReturnType<typeof createNotificationActions> &
                  ReturnType<typeof createRoleActions> &
                  ReturnType<typeof createSettingsActions> &
                  ReturnType<typeof createSupportActions> &
                  ReturnType<typeof createUserActions>;

export const ActionsContext = createContext<AllActions | undefined>(undefined);

export const ActionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // 1. Gather all dependencies (states, dispatches, hooks)
    const { addToast } = useToast();
    const { financeState, financeDispatch } = useFinance();
    const { userState, userDispatch } = useUser();
    const { notificationState, notificationDispatch } = useNotification();
    const { supportState, supportDispatch } = useSupport();
    const { settingsState, settingsDispatch } = useSettings();
    const { roleState, roleDispatch } = useRoles();
    const { loggedInUser, setPendingLoginId } = useAuth();
    const { loggingDispatch } = useLogging();

    // 2. Compose all actions using useMemo for performance.
    // The actions object will only be recreated if a dependency changes.
    const actions = useMemo(() => {
        const logAction = (payload: Omit<LogEntry, 'id' | 'timestamp' | 'ipAddress'>) => {
            loggingDispatch({ type: 'ADD_LOG', payload });
        };

        const settingsActions = createSettingsActions({ settingsDispatch, addToast, logAction, loggedInUser });
        
        const notificationActions = createNotificationActions({
            notificationDispatch,
            addToast,
            userDispatch,
            loggedInUser,
        });

        const roleActions = createRoleActions({ roleDispatch, addToast });
        
        const userActions = createUserActions({
            userState, userDispatch, financeDispatch, notificationDispatch,
            settingsState, addToast, loggedInUser, logAction
        });

        const authActions = createAuthActions({
            userState, userDispatch, addToast, setPendingLoginId, logAction,
            handleFullAddUser: userActions.handleFullAddUser, 
        });

        const supportActions = createSupportActions({
            supportState, supportDispatch, notificationDispatch, addToast
        });

        const financeActions = createFinanceActions({
            financeState, financeDispatch, userState, userDispatch,
            settingsState, notificationDispatch, addToast, loggedInUser, logAction
        });

        // 3. Combine all action groups into a single object
        return {
            ...authActions,
            ...financeActions,
            ...notificationActions,
            ...roleActions,
            ...settingsActions,
            ...supportActions,
            ...userActions,
        };
    }, [
        addToast, financeState, financeDispatch, userState, userDispatch,
        notificationState, notificationDispatch, supportState, supportDispatch,
        settingsState, settingsDispatch, roleState, roleDispatch,
        loggedInUser, setPendingLoginId, loggingDispatch
    ]);

    return (
        <ActionsContext.Provider value={actions}>
            {children}
        </ActionsContext.Provider>
    );
};
