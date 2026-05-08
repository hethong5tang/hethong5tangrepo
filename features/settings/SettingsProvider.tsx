
import React, { createContext, useReducer, ReactNode, useEffect } from 'react';
import { MOCK_SYSTEM_SETTINGS, MOCK_FUND_SETTINGS, MOCK_USER_SETTINGS } from '../../config';
import { SettingsAction, SettingsState } from './settingsTypes';
import { settingsReducer } from './settingsReducer';

const initialState: SettingsState = {
  systemSettings: MOCK_SYSTEM_SETTINGS,
  fundSettings: MOCK_FUND_SETTINGS,
  userSettings: MOCK_USER_SETTINGS,
};

const STORAGE_KEY = 'app_settings_v3';

const init = (defaultState: SettingsState): SettingsState => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            // Merge stored settings with default state to ensure new fields in structure updates don't break the app
            const parsed = JSON.parse(stored);
            return {
                ...defaultState,
                ...parsed,
                systemSettings: { ...defaultState.systemSettings, ...parsed.systemSettings },
                fundSettings: { ...defaultState.fundSettings, ...parsed.fundSettings },
                userSettings: { ...defaultState.userSettings, ...parsed.userSettings }
            };
        }
        return defaultState;
    } catch (error) {
        console.error("Failed to load settings from local storage", error);
        return defaultState;
    }
};

export const SettingsContext = createContext<{
  settingsState: SettingsState;
  settingsDispatch: React.Dispatch<SettingsAction>;
} | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settingsState, settingsDispatch] = useReducer(settingsReducer, initialState, init);
  
  useEffect(() => {
      try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsState));
      } catch (error) {
          console.error("Failed to save settings to local storage", error);
      }
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
