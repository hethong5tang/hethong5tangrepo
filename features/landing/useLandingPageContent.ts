import { createContext, useContext, Dispatch } from 'react';
import { LandingPageState, LandingPageAction } from './types';

export const LandingPageContentContext = createContext<{
    state: LandingPageState;
    dispatch: Dispatch<LandingPageAction>;
} | undefined>(undefined);

export const useLandingPageContent = () => {
    const context = useContext(LandingPageContentContext);
    if (!context) {
        throw new Error('useLandingPageContent must be used within a LandingPageContentProvider');
    }
    return context;
};