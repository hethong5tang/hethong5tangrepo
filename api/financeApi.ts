
import { Transaction, WithdrawalRequest, FundStatus, FundType } from '../features/finance/types';
import { storageService, STORAGE_KEYS } from '../services/storageService';
import { MOCK_INITIAL_TRANSACTIONS, MOCK_INITIAL_WITHDRAWALS, MOCK_FUND_TRANSACTIONS } from '../data/mockData';
import { FinanceState } from '../features/finance/financeTypes';
import { IS_DEMO_MODE } from '../config';

// Dữ liệu mặc định
const defaultFinanceState: FinanceState = {
    allTransactions: IS_DEMO_MODE ? MOCK_INITIAL_TRANSACTIONS : [],
    withdrawalRequests: IS_DEMO_MODE ? MOCK_INITIAL_WITHDRAWALS : [],
    depositRequests: [],
    fundStatus: {
        [FundType.Admin]: { name: 'Ví Admin (API/Server/Lợi nhuận)', balance: IS_DEMO_MODE ? 10000000 : 0, totalIn: 0, totalOut: 0 },
        [FundType.LeaderBonus]: { name: 'Quỹ Thưởng Leader', balance: IS_DEMO_MODE ? 10000000 : 0, totalIn: IS_DEMO_MODE ? 10000000 : 0, totalOut: 0 },
        [FundType.Support]: { name: 'Quỹ Hỗ Trợ', balance: 0, totalIn: 0, totalOut: 0 },
        [FundType.VAT]: { name: 'Thuế VAT (10%)', balance: 0, totalIn: 0, totalOut: 0 },
        [FundType.CorporateTax]: { name: 'Thuế Doanh nghiệp (3%)', balance: 0, totalIn: 0, totalOut: 0 },
        [FundType.TNCN_TAX]: { name: 'Thuế TNCN (10%)', balance: 0, totalIn: 0, totalOut: 0 },
    },
    fundTransactions: IS_DEMO_MODE ? MOCK_FUND_TRANSACTIONS : [],
    milestoneBonusRequests: [],
};

export const financeApi = {
    /**
     * Lấy lịch sử giao dịch (Giả lập GET /api/transactions)
     */
    getTransactions: async (userId?: string): Promise<Transaction[]> => {
        await storageService.simulateNetwork(300);
        const state = storageService.get<FinanceState>(STORAGE_KEYS.FINANCE, defaultFinanceState);
        if (userId) {
            return state.allTransactions.filter(t => t.userId === userId);
        }
        return state.allTransactions;
    },

    /**
     * Tạo yêu cầu rút tiền (Giả lập POST /api/withdrawals)
     */
    createWithdrawalRequest: async (request: WithdrawalRequest): Promise<{ success: boolean }> => {
        await storageService.simulateNetwork(600);
        // Server validation logic would go here
        return { success: true };
    },

    /**
     * Lấy số dư quỹ hệ thống (Giả lập GET /api/funds)
     */
    getSystemFunds: async (): Promise<Record<FundType, FundStatus>> => {
        await storageService.simulateNetwork(200);
        const state = storageService.get<FinanceState>(STORAGE_KEYS.FINANCE, defaultFinanceState);
        return state.fundStatus;
    }
};
