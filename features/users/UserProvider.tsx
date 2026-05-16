
import React, { createContext, useReducer, ReactNode, useEffect } from 'react';
import { MOCK_INITIAL_USERS } from '../../data/mockData';
import { UserAction, UserState } from './userTypes';
import { userReducer } from './userReducer';
import { storageService, STORAGE_KEYS } from '../../services/storageService';
import { IS_DEMO_MODE } from '../../config';

const initialState: UserState = {
  allUsers: IS_DEMO_MODE ? MOCK_INITIAL_USERS : [],
};

const init = (defaultState: UserState): UserState => {
  return storageService.get(STORAGE_KEYS.USERS, defaultState);
};

export const UserContext = createContext<{
  userState: UserState;
  userDispatch: React.Dispatch<UserAction>;
} | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userState, userDispatch] = useReducer(userReducer, initialState, init);

  useEffect(() => {
    storageService.set(STORAGE_KEYS.USERS, userState);
  }, [userState]);

  useEffect(() => {
    // Periodic cleanup of expired AI images
    userDispatch({ type: 'CLEANUP_EXPIRED_GENERATIONS' });
    const interval = setInterval(() => {
      userDispatch({ type: 'CLEANUP_EXPIRED_GENERATIONS' });
    }, 15 * 60 * 1000); // Every 15 minutes
    return () => clearInterval(interval);
  }, []);

  const value = { userState, userDispatch };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
