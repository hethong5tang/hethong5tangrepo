
import { MembershipTier } from "../users/types";

export enum TransactionStatus {
  Completed = 'completed',
  Pending = 'pending',
  Failed = 'failed',
}

export enum TransactionType {
  ParticipationFee = 'participation_fee',
  MaintenanceFee = 'maintenance_fee',
  Payout = 'payout',
  PenaltyFee = 'penalty_fee',
  LeaderBonus = 'leader_bonus',
  SupportFund = 'support_fund',
  CommissionParticipation = 'commission_participation',
  CommissionMaintenance = 'commission_maintenance',
  Withdrawal = 'withdrawal',
  Deposit = 'deposit',
  SystemProfit = 'system_profit',
  CommissionDifference = 'commission_difference',
  FundAllocation = 'fund_allocation',
  SupportFundPayout = 'support_fund_payout',
  CreditConversion = 'credit_conversion',
  AdminAdjustment = 'admin_adjustment',
}

export enum WithdrawalStatus {
    Pending = 'pending',
    Approved = 'approved',
    Rejected = 'rejected'
}

export enum FundType {
    Admin = 'admin_wallet', 
    LeaderBonus = 'leader_bonus',
    Support = 'support'
}

export interface Commission {
  id: string;
  amount: number;
  fromUser: string;
  level: number;
  date: string;
  type: 'participation' | 'maintenance';
}

export interface Leader {
  rank: number;
  name: string;
  avatar: string;
  revenue: number;
  teamSize: number;
}

export interface Transaction {
    id: string;
    userId: string; 
    user?: { 
        name: string;
        avatar: string;
    };
    date: string;
    type: TransactionType;
    description: string;
    amount: number; // Biến động VNĐ
    creditAmount?: number; // Biến động Credit
    status: TransactionStatus;
    requestId?: string; 
    sourceEventId?: string; 
    sourceTier?: MembershipTier; 
    metadata?: any; // NEW: Lưu trữ dữ liệu chi tiết (ví dụ: thông số tính thưởng Leader)
}

export interface WithdrawalRequest {
    id: string;
    userId: string;
    user: {
        name: string;
        avatar: string;
    };
    requestDate: string;
    updatedAt: string;
    amount: number;
    status: WithdrawalStatus;
    paymentMethod: 'bank' | 'momo';
    isSupportWallet?: boolean;
}

export interface DepositRequest {
    id: string;
    userId: string;
    user: {
        name: string;
        avatar: string;
    };
    requestDate: string;
    amount: number;
    status: 'pending' | 'completed' | 'failed';
    transferCode?: string; 
    paymentMethod: 'bank_transfer' | 'momo_qr';
}


export interface FundTransaction {
    id: string;
    date: string;
    fund: FundType;
    type: 'inflow' | 'outflow';
    amount: number;
    description: string;
}

export interface FundStatus {
    name: string;
    balance: number;
    totalIn: number;
    totalOut: number;
}

export enum MilestoneBonusRequestStatus {
    Pending = 'pending',
    Approved = 'approved',
    Rejected = 'rejected'
}

export interface MilestoneBonusRequest {
    id: string;
    userId: string;
    user: {
        name: string;
        avatar: string;
    };
    milestoneId: string;
    networkSizeAchieved: number;
    bonusAmount: number;
    requestDate: string;
    status: MilestoneBonusRequestStatus;
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
    [TransactionType.ParticipationFee]: 'Phí Tham Gia',
    [TransactionType.MaintenanceFee]: 'Phí Duy Trì',
    [TransactionType.Payout]: 'Ví Admin Chi Trả', 
    [TransactionType.PenaltyFee]: 'Phí Phạt',
    [TransactionType.LeaderBonus]: 'Thưởng Leader',
    [TransactionType.SupportFund]: 'Nạp Quỹ Hỗ Trợ',
    [TransactionType.CommissionParticipation]: 'Hoa Hồng (Tham Gia)',
    [TransactionType.CommissionMaintenance]: 'Hoa Hồng (Duy Trì)',
    [TransactionType.Withdrawal]: 'Yêu Cầu Rút Tiền',
    [TransactionType.Deposit]: 'Nạp Tiền',
    [TransactionType.SystemProfit]: 'Thu Nhập Ví Admin', 
    [TransactionType.FundAllocation]: 'Phân Bổ Quỹ',
    [TransactionType.SupportFundPayout]: 'Chi Trả Quỹ Hỗ Trợ',
    [TransactionType.CommissionDifference]: 'Chênh lệch Ví Admin', 
    [TransactionType.CreditConversion]: 'Đổi Credit',
    [TransactionType.AdminAdjustment]: 'Điều chỉnh tài khoản',
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
    [TransactionStatus.Completed]: "Hoàn thành",
    [TransactionStatus.Pending]: "Đang chờ",
    [TransactionStatus.Failed]: "Thất bại",
};
