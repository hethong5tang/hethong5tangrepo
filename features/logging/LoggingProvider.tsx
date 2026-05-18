import React, { createContext, useReducer, ReactNode, useEffect } from 'react';
import { LogEntry, LoggableAction } from './types';
import { loggingReducer, LoggingState, LoggingAction } from './loggingReducer';
import { storageService, STORAGE_KEYS } from '../../services/storageService';

export const LoggingContext = createContext<{
    loggingState: LoggingState;
    loggingDispatch: React.Dispatch<LoggingAction>;
} | undefined>(undefined);

export const LoggingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [loggingState, loggingDispatch] = useReducer(loggingReducer, {
        logs: storageService.get(STORAGE_KEYS.LOGS, [])
    });

    // Persist logs whenever they change
    useEffect(() => {
        storageService.set(STORAGE_KEYS.LOGS, loggingState.logs);
    }, [loggingState.logs]);

    const value = { loggingState, loggingDispatch };

    return (
        <LoggingContext.Provider value={value}>
            {children}
        </LoggingContext.Provider>
    );
};
