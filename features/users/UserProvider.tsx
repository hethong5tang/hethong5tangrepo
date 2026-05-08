
import React, { createContext, useReducer, ReactNode, useEffect } from 'react';
import { MOCK_INITIAL_USERS } from '../../data/mockData';
import { UserAction, UserState } from './userTypes';
import { userReducer } from './userReducer';

const initialState: UserState = {
  allUsers: MOCK_INITIAL_USERS,
};

const STORAGE_KEY = 'app_users_v4';

const init = (defaultState: UserState): UserState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultState;
  } catch (error) {
    console.error("Failed to load users from local storage", error);
    return defaultState;
  }
};

export const UserContext = createContext<{
  userState: UserState;
  userDispatch: React.Dispatch<UserAction>;
} | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userState, userDispatch] = useReducer(userReducer, initialState, init);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userState));
    } catch (error) {
      console.error("Failed to save users to local storage", error);
    }
  }, [userState]);

  const value = { userState, userDispatch };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
