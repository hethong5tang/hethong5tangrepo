
import { Transaction, WithdrawalRequest, FundStatus, FundType, FundTransaction, DepositRequest, MilestoneBonusRequest } from "./types";
import { AdminManagedUser } from '../users/types';

export interface FinanceState {
  allTransactions: Transaction[];
  withdrawalRequests: WithdrawalRequest[];
  depositRequests: DepositRequest[];
  fundStatus: Record<FundType, FundStatus>;
  fundTransactions: FundTransaction[];
  milestoneBonusRequests: MilestoneBonusRequest[];
}

export type FinanceAction =
  | { type: 'ADD_WITHDRAWAL_REQUEST'; payload: WithdrawalRequest }
  | { type: 'PROCESS_WITHDRAWAL_APPROVE'; payload: WithdrawalRequest }
  | { type: 'PROCESS_WITHDRAWAL_REJECT'; payload: WithdrawalRequest }
  | { type: 'BATCH_PROCESS_WITHDRAWALS'; payload: { ids: string[]; decision: 'approve' | 'reject'; requests: WithdrawalRequest[] } }
  | { type: 'ADD_DEPOSIT_REQUEST'; payload: DepositRequest }
  | { type: 'PROCESS_DEPOSIT_APPROVE'; payload: DepositRequest }
  | { type: 'PROCESS_DEPOSIT_REJECT'; payload: DepositRequest }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'ADD_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'APPLY_FEE_PAYMENT_CHANGES'; payload: { changes: any; newUser: AdminManagedUser } }
  | { type: 'PROCESS_SUPPORT_FUND_PAYOUT'; payload: { totalPayout: number; transactions: Transaction[]; userCount: number } }
  | { type: 'PROCESS_LEADER_FUND_PAYOUT'; payload: { amount: number; description: string } }
  | { type: 'PROCESS_LEADER_FUND_BATCH_PAYOUT'; payload: { totalAmount: number; transactions: Transaction[]; fundTransaction: FundTransaction } }
  | { type: 'PROCESS_SUPPORT_FUND_BATCH_PAYOUT'; payload: { totalAmount: number; transactions: Transaction[]; fundTransaction: FundTransaction } }
  | { type: 'PROCESS_ADMIN_WALLET_BATCH_PAYOUT'; payload: { totalAmount: number; transactions: Transaction[]; fundTransaction: FundTransaction } }
  | { type: 'REMOVE_TRANSACTIONS_BY_USER_IDS'; payload: { userIds: string[] } }
  | { type: 'ADD_MILESTONE_BONUS_REQUEST'; payload: MilestoneBonusRequest }
  | { type: 'PROCESS_MILESTONE_BONUS_APPROVE'; payload: { request: MilestoneBonusRequest; transaction: Transaction; fundTransaction: FundTransaction } }
  | { type: 'PROCESS_MILESTONE_BONUS_REJECT'; payload: { request: MilestoneBonusRequest; fundTransaction: FundTransaction } }
  | { type: 'BATCH_PROCESS_MILESTONE_BONUS_APPROVE'; payload: { requestIds: string[]; transactions: Transaction[]; fundTransactions: FundTransaction[] } }
  | { type: 'BATCH_PROCESS_MILESTONE_BONUS_REJECT'; payload: { requestIds: string[]; fundTransactions: FundTransaction[] } };
