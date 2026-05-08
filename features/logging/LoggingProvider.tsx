import React, { createContext, useReducer, ReactNode } from 'react';
import { LogEntry, LoggableAction } from './types';
import { loggingReducer, LoggingState, LoggingAction } from './loggingReducer';

const initialState: LoggingState = {
    logs: [],
};

export const LoggingContext = createContext<{
    loggingState: LoggingState;
    loggingDispatch: React.Dispatch<LoggingAction>;
} | undefined>(undefined);

export const LoggingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [loggingState, loggingDispatch] = useReducer(loggingReducer, initialState);
    const value = { loggingState, loggingDispatch };

    return (
        <LoggingContext.Provider value={value}>
            {children}
        </LoggingContext.Provider>
    );
};
