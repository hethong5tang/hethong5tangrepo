
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
    
    // Force reset levelSettings if the count is not 5 to ensure new structure is applied
    const storedLevelSettings = raw.systemSettings?.levelSettings || [];
    const shouldResetLevels = storedLevelSettings.length !== defaultState.systemSettings.levelSettings.length;

    // Fix persistence for legal content: if it's the old default, reset it to new default
    const currentTos = raw.systemSettings?.legalContent?.tos || '';
    if (currentTos.includes('Chào mừng bạn đến với Affiliate SaaS AI!') || 
        currentTos.includes('Cơ chế Tiếp thị Liên kết (Affiliate):') ||
        (currentTos.includes('PHÍ QUẢN LÝ (F2)') && !currentTos.includes('đúng quy định.'))) {
        raw.systemSettings.legalContent = defaultState.systemSettings.legalContent;
    }

    return {
        ...defaultState,
        ...raw,
        systemSettings: { 
            ...defaultState.systemSettings, 
            ...raw.systemSettings,
            legalContent: raw.systemSettings?.legalContent || defaultState.systemSettings.legalContent,
            levelSettings: shouldResetLevels ? defaultState.systemSettings.levelSettings : (raw.systemSettings?.levelSettings || defaultState.systemSettings.levelSettings),
            tierSettings: {
                starter: {
                    ...defaultState.systemSettings.tierSettings.starter,
                    ...(raw.systemSettings?.tierSettings?.starter || {}),
                    benefits: defaultState.systemSettings.tierSettings.starter.benefits
                },
                pro: {
                    ...defaultState.systemSettings.tierSettings.pro,
                    ...(raw.systemSettings?.tierSettings?.pro || {}),
                    benefits: defaultState.systemSettings.tierSettings.pro.benefits
                },
                master: {
                    ...defaultState.systemSettings.tierSettings.master,
                    ...(raw.systemSettings?.tierSettings?.master || {}),
                    benefits: defaultState.systemSettings.tierSettings.master.benefits
                }
            }
        },
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
