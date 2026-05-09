
import React, { createContext, useReducer, ReactNode } from 'react';
import { MOCK_INITIAL_SUPPORT_TICKETS } from '../../data/mockData';
import { SupportAction, SupportState } from './supportTypes';
import { supportReducer } from './supportReducer';
import { IS_DEMO_MODE } from '../../config';

export const SupportContext = createContext<{
  supportState: SupportState;
  supportDispatch: React.Dispatch<SupportAction>;
} | undefined>(undefined);

export const SupportProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [supportState, supportDispatch] = useReducer(supportReducer, initialState);

  const value = { 
    supportState, 
    supportDispatch,
  };

  return (
    <SupportContext.Provider value={value}>
      {children}
    </SupportContext.Provider>
  );
};

const initialState: SupportState = {
  supportTickets: IS_DEMO_MODE ? MOCK_INITIAL_SUPPORT_TICKETS : [],
};
