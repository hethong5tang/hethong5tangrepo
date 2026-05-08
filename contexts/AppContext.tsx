import React, { ReactNode } from 'react';
import { SettingsProvider } from '../features/settings/SettingsProvider';
import { NotificationProvider } from '../features/notifications/NotificationProvider';
import { SupportProvider } from '../features/support/SupportProvider';
import { UserProvider } from '../features/users/UserProvider';
import { FinanceProvider } from '../features/finance/FinanceProvider';
import { RoleProvider } from '../features/roles/RoleProvider';
import { AuthProvider } from '../features/auth/AuthProvider';
import { LandingPageContentProvider } from '../features/landing/LandingPageContentProvider';
import { ActionsProvider } from '../features/actions/ActionsProvider';
import { LoggingProvider } from '../features/logging/LoggingProvider';

/**
 * This component consolidates all the application's context providers into a single component.
 * This cleans up index.tsx and makes it easier to manage the provider hierarchy.
 */
export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <SettingsProvider>
      <NotificationProvider>
        <SupportProvider>
          <UserProvider>
            <FinanceProvider>
              <RoleProvider>
                <LoggingProvider>
                  <AuthProvider>
                    <ActionsProvider>
                      <LandingPageContentProvider>
                        {children}
                      </LandingPageContentProvider>
                    </ActionsProvider>
                  </AuthProvider>
                </LoggingProvider>
              </RoleProvider>
            </FinanceProvider>
          </UserProvider>
        </SupportProvider>
      </NotificationProvider>
    </SettingsProvider>
  );
};