
import React, { createContext, useReducer, ReactNode } from 'react';
import { MOCK_INITIAL_SUPPORT_TICKETS } from '../../data/mockData';
import { SupportAction, SupportState } from './supportTypes';
import { supportReducer } from './supportReducer';

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
  supportTickets: MOCK_INITIAL_SUPPORT_TICKETS,
};
