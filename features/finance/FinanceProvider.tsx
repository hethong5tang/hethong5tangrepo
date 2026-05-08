
import React, { createContext, useReducer, ReactNode, useEffect } from 'react';
import { MOCK_INITIAL_TRANSACTIONS, MOCK_INITIAL_WITHDRAWALS, MOCK_FUND_TRANSACTIONS, MOCK_INITIAL_MILESTONE_BONUS_REQUESTS, MOCK_DEPOSIT_REQUESTS } from '../../data/mockData';
import { FinanceAction, FinanceState } from './financeTypes';
import { financeReducer } from './financeReducer';
import { FundTransaction, FundType, FundStatus as TFundStatus } from './types';
import { storageService, STORAGE_KEYS } from '../../services/storageService';

const calculateInitialFundStatus = (transactions: FundTransaction[]): Record<FundType, TFundStatus> => {
    const status: Record<FundType, TFundStatus> = {
        [FundType.Admin]: { name: 'Ví Admin (Lợi nhuận)', balance: 10000000, totalIn: 0, totalOut: 0 },
        [FundType.LeaderBonus]: { name: 'Quỹ Thưởng Leader', balance: 10000000, totalIn: 10000000, totalOut: 0 }, // Khởi tạo 10 triệu
        [FundType.Support]: { name: 'Quỹ Hỗ Trợ (Chưa có F1)', balance: 0, totalIn: 0, totalOut: 0 },
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
  allTransactions: MOCK_INITIAL_TRANSACTIONS,
  withdrawalRequests: MOCK_INITIAL_WITHDRAWALS,
  depositRequests: MOCK_DEPOSIT_REQUESTS,
  fundStatus: calculateInitialFundStatus(MOCK_FUND_TRANSACTIONS),
  fundTransactions: MOCK_FUND_TRANSACTIONS,
  milestoneBonusRequests: MOCK_INITIAL_MILESTONE_BONUS_REQUESTS,
};

const init = (initial: FinanceState): FinanceState => {
  return storageService.get(STORAGE_KEYS.FINANCE, initial);
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
