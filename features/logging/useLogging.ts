import { useContext } from 'react';
import { LoggingContext } from './LoggingProvider';

export const useLogging = () => {
    const context = useContext(LoggingContext);
    if (context === undefined) {
        throw new Error('useLogging must be used within a LoggingProvider');
    }
    return context;
};
