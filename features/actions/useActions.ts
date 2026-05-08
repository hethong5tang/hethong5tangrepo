

import { useContext } from 'react';
import { ActionsContext } from './ActionsProvider';

export const useActions = () => {
    const context = useContext(ActionsContext);
    if (context === undefined) {
        throw new Error('useActions must be used within an ActionsProvider');
    }
    return context;
};