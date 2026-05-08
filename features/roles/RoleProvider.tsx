
import React, { createContext, useReducer, ReactNode } from 'react';
import { MOCK_ROLES, ALL_PERMISSIONS } from '../../config';
import { RoleAction, RoleState } from './roleTypes';
import { roleReducer } from './roleReducer';
import { Permission } from './types';

const initialState: RoleState = {
  roles: MOCK_ROLES,
};

export const RoleContext = createContext<{
  roleState: RoleState;
  roleDispatch: React.Dispatch<RoleAction>;
  allPermissions: { id: Permission; name: string; description: string }[];
} | undefined>(undefined);

export const RoleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [roleState, roleDispatch] = useReducer(roleReducer, initialState);

  const value = { 
    roleState, 
    roleDispatch,
    allPermissions: ALL_PERMISSIONS,
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};