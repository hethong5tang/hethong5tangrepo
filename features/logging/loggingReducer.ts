import { LogEntry } from './types';

export interface LoggingState {
    logs: LogEntry[];
}

export type LoggingAction =
    | { type: 'ADD_LOG'; payload: Omit<LogEntry, 'id' | 'timestamp' | 'ipAddress'> };

export const loggingReducer = (state: LoggingState, action: LoggingAction): LoggingState => {
    switch (action.type) {
        case 'ADD_LOG': {
            const newLog: LogEntry = {
                id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                timestamp: new Date().toISOString(),
                ipAddress: '127.0.0.1', // Mock IP
                ...action.payload,
            };
            return {
                ...state,
                logs: [newLog, ...state.logs],
            };
        }
        default:
            return state;
    }
};
