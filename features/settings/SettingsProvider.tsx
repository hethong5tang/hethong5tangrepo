
import React, { createContext, useReducer, ReactNode, useEffect } from 'react';
import { MOCK_SYSTEM_SETTINGS, MOCK_FUND_SETTINGS, MOCK_USER_SETTINGS } from '../../config';
import { SettingsAction, SettingsState } from './settingsTypes';
import { settingsReducer } from './settingsReducer';
import { storageService, STORAGE_KEYS } from '../../services/storageService';

const initialState: SettingsState = {
  systemSettings: MOCK_SYSTEM_SETTINGS,
  fundSettings: MOCK_FUND_SETTINGS,
  userSettings: MOCK_USER_SETTINGS,
};

const init = (defaultState: SettingsState): SettingsState => {
    const raw = storageService.get(STORAGE_KEYS.SETTINGS, defaultState);
    // Merge stored settings with default state to ensure new fields in structure updates don't break
    return {
        ...defaultState,
        ...raw,
        systemSettings: { ...defaultState.systemSettings, ...raw.systemSettings },
        fundSettings: { ...defaultState.fundSettings, ...raw.fundSettings },
        userSettings: { ...defaultState.userSettings, ...raw.userSettings }
    };
};

export const SettingsContext = createContext<{
  settingsState: SettingsState;
  settingsDispatch: React.Dispatch<SettingsAction>;
} | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settingsState, settingsDispatch] = useReducer(settingsReducer, initialState, init);
  
  useEffect(() => {
      storageService.set(STORAGE_KEYS.SETTINGS, settingsState);
  }, [settingsState]);
  
  const value = {
    settingsState,
    settingsDispatch,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
