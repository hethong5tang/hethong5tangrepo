
import React, { createContext, useReducer, ReactNode, useEffect } from 'react';
import { MOCK_INITIAL_USERS } from '../../data/mockData';
import { UserAction, UserState } from './userTypes';
import { userReducer } from './userReducer';
import { storageService, STORAGE_KEYS } from '../../services/storageService';

const initialState: UserState = {
  allUsers: MOCK_INITIAL_USERS,
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

  const value = { userState, userDispatch };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
