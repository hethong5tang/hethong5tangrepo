

import React, { createContext, useReducer, ReactNode, useCallback } from 'react';
import { MOCK_INITIAL_NOTIFICATIONS } from '../../data/mockData';
import { NotificationAction, NotificationState } from './notificationTypes';
import { notificationReducer } from './notificationReducer';

const initialState: NotificationState = {
  notifications: MOCK_INITIAL_NOTIFICATIONS,
  levelUpInfo: null,
};

export const NotificationContext = createContext<{
  notificationState: NotificationState;
  notificationDispatch: React.Dispatch<NotificationAction>;
} | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notificationState, notificationDispatch] = useReducer(notificationReducer, initialState);

  const value = { 
    notificationState, 
    notificationDispatch, 
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};