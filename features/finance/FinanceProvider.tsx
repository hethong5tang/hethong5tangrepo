
import React, { createContext, useReducer, ReactNode, useEffect } from 'react';
import { MOCK_INITIAL_TRANSACTIONS, MOCK_INITIAL_WITHDRAWALS, MOCK_FUND_TRANSACTIONS, MOCK_INITIAL_MILESTONE_BONUS_REQUESTS, MOCK_DEPOSIT_REQUESTS } from '../../data/mockData';
import { FinanceAction, FinanceState } from './financeTypes';
import { financeReducer } from './financeReducer';
import { FundTransaction, FundType, FundStatus as TFundStatus } from './types';
import { storageService, STORAGE_KEYS } from '../../services/storageService';
import { IS_DEMO_MODE } from '../../config';

const calculateInitialFundStatus = (transactions: FundTransaction[]): Record<FundType, TFundStatus> => {
    const status: Record<FundType, TFundStatus> = {
        [FundType.Admin]: { name: 'Ví Admin (Lợi nhuận)', balance: IS_DEMO_MODE ? 10000000 : 0, totalIn: 0, totalOut: 0 },
        [FundType.LeaderBonus]: { name: 'Quỹ Thưởng Leader', balance: IS_DEMO_MODE ? 10000000 : 0, totalIn: IS_DEMO_MODE ? 10000000 : 0, totalOut: 0 }, 
        [FundType.Support]: { name: 'Quỹ Hỗ Trợ (Chưa có F1)', balance: 0, totalIn: 0, totalOut: 0 },
        [FundType.VAT]: { name: 'Quỹ Thuế VAT', balance: 0, totalIn: 0, totalOut: 0 },
        [FundType.CorporateTax]: { name: 'Quỹ Thuế TNDN', balance: 0, totalIn: 0, totalOut: 0 },
        [FundType.TNCN_TAX]: { name: 'Thanh khoản Thuế TNCN', balance: 0, totalIn: 0, totalOut: 0 },
    };

    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(a.date).getTime());

    sortedTransactions.forEach(tx => {
        const fund = status[tx.fund];
        if (fund) {
            // Chúng ta cộng thêm vào balance gốc
            fund.balance += tx.amount;
            if (tx.type === 'inflow') {
                fund.totalIn += tx.amount;
            } else { 
                fund.totalOut += Math.abs(tx.amount);
            }
        }
    });

    return status;
};

const defaultState: FinanceState = {
  allTransactions: IS_DEMO_MODE ? MOCK_INITIAL_TRANSACTIONS : [],
  withdrawalRequests: IS_DEMO_MODE ? MOCK_INITIAL_WITHDRAWALS : [],
  depositRequests: IS_DEMO_MODE ? MOCK_DEPOSIT_REQUESTS : [],
  fundStatus: calculateInitialFundStatus(IS_DEMO_MODE ? MOCK_FUND_TRANSACTIONS : []),
  fundTransactions: IS_DEMO_MODE ? MOCK_FUND_TRANSACTIONS : [],
  milestoneBonusRequests: IS_DEMO_MODE ? MOCK_INITIAL_MILESTONE_BONUS_REQUESTS : [],
};

const init = (initial: FinanceState): FinanceState => {
  const stored = storageService.get(STORAGE_KEYS.FINANCE, initial);
  
  // Ensure all fund types are initialized in fundStatus
  const migratedFundStatus = { ...initial.fundStatus, ...(stored.fundStatus || {}) };
  
  return {
    ...initial,
    ...stored,
    fundStatus: migratedFundStatus
  };
};

export const FinanceContext = createContext<{
  financeState: FinanceState;
  financeDispatch: React.Dispatch<FinanceAction>;
} | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [financeState, financeDispatch] = useReducer(financeReducer, defaultState, init);
  
  useEffect(() => {
      storageService.set(STORAGE_KEYS.FINANCE, financeState);
  }, [financeState]);

  const value = { 
    financeState, 
    financeDispatch,
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
};
