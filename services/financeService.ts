
import { AdminManagedUser, MembershipTier, UserStatus } from '../features/users/types';
import { SystemSettings, FundSettings } from '../features/settings/types';
import { Transaction, TransactionStatus, TransactionType, FundTransaction, FundType } from '../features/finance/types';

/**
 * Đảm bảo tính toán tài chính chính xác, không thất thoát.
 * Logic: Tổng (Hoa hồng + Lợi nhuận + Quỹ) luôn luôn bằng đúng số tiền phí người dùng đóng.
 */
export const calculateFeePaymentChanges = (
    payingUserId: string,
    feeType: 'participation' | 'maintenance',
    membershipTier: MembershipTier,
    currentUsers: AdminManagedUser[],
    currentSystemSettings: SystemSettings,
    currentFundSettings: FundSettings,
    multiplier: number = 1,
    specificAmount?: number // [NEW] Cho phép truyền số tiền cụ thể (ví dụ: phí nâng cấp chênh lệch)
) => {
    // 1. Xây dựng bản đồ người dùng để truy xuất nhanh
    const userMap = new Map<string, AdminManagedUser>();
    const flatten = (list: AdminManagedUser[]) => {
        list.forEach(u => {
            userMap.set(u.id, u);
            if (u.children) flatten(u.children);
        });
    };
    flatten(currentUsers);

    const payingUser = userMap.get(payingUserId);
    if (!payingUser) return null;

    const sourceEventId = `evt_${Date.now()}_${payingUserId.slice(-4)}`;
    const date = new Date().toISOString().split('T')[0];

    // 2. Lấy cấu hình hoa hồng để xác định số tầng tối đa
    const commissionSettings = feeType === 'participation'
        ? currentSystemSettings.commissionSettings.participationCommissions
        : currentSystemSettings.commissionSettings.maintenanceCommissions;
    
    const maxCommissionLevels = commissionSettings.length;

    // 3. Tính toán tổng phí
    let feeAmount = 0;

    if (specificAmount !== undefined) {
        feeAmount = specificAmount;
    } else {
        let singleMonthFee = 0;
        if (feeType === 'participation') {
            const fees = {
                [MembershipTier.Starter]: currentSystemSettings.participationFee,
                [MembershipTier.Pro]: currentSystemSettings.proParticipationFee,
                [MembershipTier.Master]: currentSystemSettings.masterParticipationFee,
                [MembershipTier.None]: 0
            };
            singleMonthFee = fees[membershipTier] || 0;
        } else {
            const fees = {
                [MembershipTier.Starter]: currentSystemSettings.maintenanceFee,
                [MembershipTier.Pro]: currentSystemSettings.proMaintenanceFee,
                [MembershipTier.Master]: currentSystemSettings.masterMaintenanceFee,
                [MembershipTier.None]: 0
            };
            singleMonthFee = fees[membershipTier] || 0;
        }
        feeAmount = Math.round(singleMonthFee * multiplier);
    }
    
    if (feeAmount <= 0) return null;

    // 4. Phân bổ vào các quỹ (Theo quy tắc 40/60 của dự án)
    // Tổng Quỹ hệ thống (40%): VAT 10%, Thuế DN 3%, Ops 17%, Leader 5%, Support 5%
    const vatPart = Math.floor(feeAmount * 0.10);
    const corpTaxPart = Math.floor(feeAmount * 0.03);
    const opsPart = Math.floor(feeAmount * 0.17);
    const leaderFundPart = Math.floor(feeAmount * 0.05);
    const supportFundPart = Math.floor(feeAmount * 0.05);
    
    const newTransactions: Transaction[] = [];
    const newFundTransactions: FundTransaction[] = [];
    const fundUpdates: { [fundType in FundType]?: { balanceChange: number; totalInChange: number } } = {};

    fundUpdates[FundType.VAT] = { balanceChange: vatPart, totalInChange: vatPart };
    newFundTransactions.push({ id: `ft_vat_${Date.now()}`, date, fund: FundType.VAT, type: 'inflow', amount: vatPart, description: `Thuế VAT (10%) từ ${payingUser.name}` });

    fundUpdates[FundType.CorporateTax] = { balanceChange: corpTaxPart, totalInChange: corpTaxPart };
    newFundTransactions.push({ id: `ft_ctax_${Date.now()}`, date, fund: FundType.CorporateTax, type: 'inflow', amount: corpTaxPart, description: `Thuế TNDN (3%) từ ${payingUser.name}` });

    fundUpdates[FundType.Admin] = { balanceChange: opsPart, totalInChange: opsPart };
    newFundTransactions.push({ id: `ft_ops_${Date.now()}`, date, fund: FundType.Admin, type: 'inflow', amount: opsPart, description: `Chi phí vận hành & API (17%) từ ${payingUser.name}` });

    fundUpdates[FundType.LeaderBonus] = { balanceChange: leaderFundPart, totalInChange: leaderFundPart };
    newFundTransactions.push({ id: `ft_lb_${Date.now()}`, date, fund: FundType.LeaderBonus, type: 'inflow', amount: leaderFundPart, description: `Quỹ Leader (5%) từ ${payingUser.name}` });

    fundUpdates[FundType.Support] = { balanceChange: supportFundPart, totalInChange: supportFundPart };
    newFundTransactions.push({ id: `ft_sp_${Date.now()}`, date, fund: FundType.Support, type: 'inflow', amount: supportFundPart, description: `Quỹ Hỗ trợ (5%) từ ${payingUser.name}` });

    // 5. Tìm upline (Dành cho Affiliate 60%)
    const userUpdates: { [userId: string]: { balanceChange: number; earningsChange: number; supportDebtChange?: number } } = {};
    const upline: AdminManagedUser[] = [];
    let curr = payingUser;
    
    while (curr.parentId && upline.length < 2) {
        const parent = userMap.get(curr.parentId);
        if (!parent) break;
        upline.push(parent);
        curr = parent;
    }

    let distributedCommission = 0;
    const affiliateRates = [40, 20]; // F1 40%, F2 20%

    affiliateRates.forEach((rate, index) => {
        const level = index + 1;
        const potentialCommission = Math.floor(feeAmount * (rate / 100));
        if (index >= upline.length) return;
        const recipient = upline[index];
        if (recipient.status === UserStatus.Suspended || recipient.membershipTier === MembershipTier.None) return;

        const actualCommission = potentialCommission;
        if (actualCommission > 0) {
            distributedCommission += actualCommission;
            let amountToRecover = 0;
            if (recipient.supportDebt && recipient.supportDebt > 0) {
                amountToRecover = Math.min(recipient.supportDebt, actualCommission);
                userUpdates[recipient.id] = { ...userUpdates[recipient.id], supportDebtChange: (userUpdates[recipient.id]?.supportDebtChange || 0) - amountToRecover };
                fundUpdates[FundType.Support] = { ...fundUpdates[FundType.Support], balanceChange: (fundUpdates[FundType.Support]?.balanceChange || 0) + amountToRecover, totalInChange: (fundUpdates[FundType.Support]?.totalInChange || 0) + amountToRecover };
                newFundTransactions.push({ id: `ft_sp_clawback_${Date.now()}_${recipient.id}`, date, fund: FundType.Support, type: 'inflow', amount: amountToRecover, description: `Thu hồi hỗ trợ từ hoa hồng của ${recipient.name}` });
                newTransactions.push({ id: `txn_support_clawback_${Date.now()}_${recipient.id}`, userId: recipient.id, user: { name: recipient.name, avatar: recipient.avatar }, date, type: TransactionType.SupportFund, description: `Khấu trừ ${amountToRecover.toLocaleString('vi-VN')}đ hoàn trả quỹ hỗ trợ`, amount: -amountToRecover, status: TransactionStatus.Completed, sourceEventId });
            }
            userUpdates[recipient.id] = { ...userUpdates[recipient.id], balanceChange: (userUpdates[recipient.id]?.balanceChange || 0) + actualCommission - amountToRecover, earningsChange: (userUpdates[recipient.id]?.earningsChange || 0) + actualCommission };
            newTransactions.push({ id: `txn_comm_${Date.now()}_${recipient.id}`, userId: recipient.id, user: { name: recipient.name, avatar: recipient.avatar }, date, type: level === 1 ? TransactionType.CommissionParticipation : TransactionType.CommissionMaintenance, description: level === 1 ? `Hoa hồng F1 (${rate}%) từ ${payingUser.name}` : `Phí quản lý F2 (${rate}%) từ ${payingUser.name}`, amount: actualCommission, status: TransactionStatus.Completed, sourceEventId, sourceTier: membershipTier });
        }
    });

    // 6. Chênh lệch (nếu thiếu upline F2)
    const unclaimedCommission = (feeAmount * 0.60) - distributedCommission;
    if (unclaimedCommission > 0) {
        fundUpdates[FundType.Admin] = { ...fundUpdates[FundType.Admin], balanceChange: (fundUpdates[FundType.Admin]?.balanceChange || 0) + unclaimedCommission, totalInChange: (fundUpdates[FundType.Admin]?.totalInChange || 0) + unclaimedCommission };
        newFundTransactions.push({ id: `ft_adm_uncl_${Date.now()}`, date, fund: FundType.Admin, type: 'inflow', amount: unclaimedCommission, description: `Hoa hồng vô chủ (Thiếu upline) từ ${payingUser.name}` });
    }

    return { 
        userUpdates, 
        newTransactions, 
        newFundTransactions, 
        fundUpdates, 
        feeAmount, 
        sourceEventId, 
        feeTransaction: {
            id: `txn_fee_${Date.now()}`, userId: payingUser.id,
            user: { name: payingUser.name, avatar: payingUser.avatar },
            date, type: feeType === 'participation' ? TransactionType.ParticipationFee : TransactionType.MaintenanceFee,
            description: `Thanh toán phí ${feeType === 'participation' ? 'tham gia' : 'dịch vụ'} (${multiplier} tháng)`,
            amount: -feeAmount, status: TransactionStatus.Completed, sourceEventId
        }
    };
};
