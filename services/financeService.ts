
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
        // Nếu có số tiền cụ thể (VD: Nâng cấp), dùng số tiền đó
        feeAmount = specificAmount;
    } else {
        // Nếu không, tra cứu giá gốc từ cài đặt
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

    // 4. Phân bổ vào các quỹ (Tính theo % trên tổng phí)
    const newTransactions: Transaction[] = [];
    const newFundTransactions: FundTransaction[] = [];
    const fundUpdates: { [fundType in FundType]?: { balanceChange: number; totalInChange: number } } = {};
    
    const profitCfg = feeType === 'participation' 
        ? currentSystemSettings.profitSettings.participation 
        : currentSystemSettings.profitSettings.maintenance;

    const adminProfitPart = Math.floor(feeAmount * (profitCfg.adminWallet / 100));
    const leaderFundPart = Math.floor(feeAmount * (profitCfg.leaderBonusFund / 100));
    const supportFundPart = Math.floor(feeAmount * (profitCfg.supportFund / 100));
    
    const totalAllocatedToSystem = adminProfitPart + leaderFundPart + supportFundPart;

    if (leaderFundPart > 0) {
        fundUpdates[FundType.LeaderBonus] = { balanceChange: leaderFundPart, totalInChange: leaderFundPart };
        newFundTransactions.push({
            id: `ft_lb_${Date.now()}`, date, fund: FundType.LeaderBonus, type: 'inflow',
            amount: leaderFundPart, description: `Trích từ phí của ${payingUser.name}`
        });
    }
    if (supportFundPart > 0) {
        fundUpdates[FundType.Support] = { balanceChange: supportFundPart, totalInChange: supportFundPart };
        newFundTransactions.push({
            id: `ft_sp_${Date.now()}`, date, fund: FundType.Support, type: 'inflow',
            amount: supportFundPart, description: `Trích từ phí của ${payingUser.name}`
        });
    }

    // 5. Tìm upline
    const userUpdates: { [userId: string]: { balanceChange: number; earningsChange: number; supportDebtChange?: number } } = {};
    const upline: AdminManagedUser[] = [];
    let curr = payingUser;
    
    while (curr.parentId && upline.length < maxCommissionLevels) {
        const parent = userMap.get(curr.parentId);
        if (!parent) break;
        upline.push(parent);
        curr = parent;
    }

    let distributedCommission = 0;
    let unclaimedTiers: string[] = []; // Theo dõi các tầng không trả được

    commissionSettings.forEach((setting, index) => {
        const level = index + 1;
        const potentialCommission = Math.floor(feeAmount * (setting.percentage / 100));
        
        // Kiểm tra điều kiện nhận: Không có upline HOẶC upline bị khóa HOẶC upline chưa kích hoạt gói
        if (index >= upline.length) {
            unclaimedTiers.push(`F${level} (Thiếu cấp)`);
            return;
        }
        
        const recipient = upline[index];
        
        // RULE: CHỈ chặn Suspended và None. PendingFee VẪN nhận được tiền.
        if (recipient.status === UserStatus.Suspended || recipient.membershipTier === MembershipTier.None) {
            unclaimedTiers.push(`F${level} (Bị khóa/Chưa kích hoạt)`);
            return;
        }

        // Cơ chế giới hạn hoa hồng theo gói của người nhận
        // LƯU Ý: Phần này vẫn dùng giá gói chuẩn để tính "Entitlement Cap" (Hạn mức hưởng)
        // Dù người dưới đóng bao nhiêu, người trên chỉ hưởng tối đa theo % của gói họ đang sở hữu.
        let uplineSingleMonthFee = 0;
        if (feeType === 'participation') {
            if (recipient.membershipTier === MembershipTier.Pro) uplineSingleMonthFee = currentSystemSettings.proParticipationFee;
            else if (recipient.membershipTier === MembershipTier.Master) uplineSingleMonthFee = currentSystemSettings.masterParticipationFee;
            else uplineSingleMonthFee = currentSystemSettings.participationFee;
        } else {
            if (recipient.membershipTier === MembershipTier.Pro) uplineSingleMonthFee = currentSystemSettings.proMaintenanceFee;
            else if (recipient.membershipTier === MembershipTier.Master) uplineSingleMonthFee = currentSystemSettings.masterMaintenanceFee;
            else uplineSingleMonthFee = currentSystemSettings.maintenanceFee;
        }

        const uplineFeeAmount = Math.round(uplineSingleMonthFee * multiplier);
        const entitlementLimit = Math.floor(uplineFeeAmount * (setting.percentage / 100));

        const actualCommission = Math.min(potentialCommission, entitlementLimit);
        
        if (potentialCommission > actualCommission) {
            unclaimedTiers.push(`F${level} (Chênh lệch gói)`);
        }

        if (actualCommission > 0) {
            distributedCommission += actualCommission;
            
            let amountToRecover = 0;
            if (recipient.supportDebt && recipient.supportDebt > 0) {
                amountToRecover = Math.min(recipient.supportDebt, actualCommission);
                
                userUpdates[recipient.id] = {
                    ...userUpdates[recipient.id],
                    supportDebtChange: (userUpdates[recipient.id]?.supportDebtChange || 0) - amountToRecover
                };
                
                fundUpdates[FundType.Support] = {
                    balanceChange: (fundUpdates[FundType.Support]?.balanceChange || 0) + amountToRecover,
                    totalInChange: (fundUpdates[FundType.Support]?.totalInChange || 0) + amountToRecover,
                };
                
                newFundTransactions.push({
                    id: `ft_sp_clawback_${Date.now()}_${recipient.id}`, date, fund: FundType.Support, type: 'inflow',
                    amount: amountToRecover, description: `Hệ thống nhận lại ${amountToRecover.toLocaleString('vi-VN')}đ hỗ trợ hoàn lại từ ${recipient.name} do thành viên này đã hoạt động trở lại.`
                });
                
                newTransactions.push({
                    id: `txn_support_clawback_${Date.now()}_${recipient.id}`,
                    userId: recipient.id,
                    user: { name: recipient.name, avatar: recipient.avatar },
                    date,
                    type: TransactionType.SupportFund,
                    description: `Hệ thống đã trích ra số tiền ${amountToRecover.toLocaleString('vi-VN')}đ (đúng với số tiền bạn đã nhận hỗ trợ trước đây) từ hoa hồng bạn vừa kiếm được để hoàn trả lại quỹ hỗ trợ.`,
                    amount: -amountToRecover,
                    status: TransactionStatus.Completed,
                    sourceEventId,
                });
            }

            userUpdates[recipient.id] = {
                ...userUpdates[recipient.id],
                balanceChange: (userUpdates[recipient.id]?.balanceChange || 0) + actualCommission - amountToRecover,
                earningsChange: (userUpdates[recipient.id]?.earningsChange || 0) + actualCommission
            };
            newTransactions.push({
                id: `txn_comm_${Date.now()}_${recipient.id}`, userId: recipient.id,
                user: { name: recipient.name, avatar: recipient.avatar },
                date, type: feeType === 'participation' ? TransactionType.CommissionParticipation : TransactionType.CommissionMaintenance,
                description: `Hoa hồng F${level} từ ${payingUser.name}`,
                amount: actualCommission, status: TransactionStatus.Completed,
                sourceEventId, sourceTier: membershipTier
            });
        }
    });

    // 6. Lợi nhuận Admin = (Phần % cố định)
    const finalAdminProfit = adminProfitPart;
    
    let adminDescription = `Lợi nhuận Admin từ phí của ${payingUser.name}`;

    newTransactions.push({
        id: `txn_sys_profit_${Date.now()}`, userId: 'system', user: { name: 'Hệ thống', avatar: '' },
        date, type: TransactionType.SystemProfit,
        description: adminDescription,
        amount: finalAdminProfit, status: TransactionStatus.Completed,
        sourceEventId
    });

    // 7. Chênh lệch hoa hồng (CommissionDifference)
    const totalCommissionDifference = feeAmount - (leaderFundPart + supportFundPart + distributedCommission + finalAdminProfit);

    if (totalCommissionDifference > 0) {
        let diffDescription = `Chênh lệch hoa hồng từ phí của ${payingUser.name}`;
        if (unclaimedTiers.length > 0) {
            diffDescription += ` (Gồm dư thừa từ: ${unclaimedTiers.join(', ')})`;
        }
        newTransactions.push({
            id: `txn_comm_diff_${Date.now()}`, userId: 'system', user: { name: 'Hệ thống', avatar: '' },
            date, type: TransactionType.CommissionDifference,
            description: diffDescription,
            amount: totalCommissionDifference, status: TransactionStatus.Completed,
            sourceEventId
        });
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
            description: `Thanh toán phí ${feeType === 'participation' ? 'tham gia' : 'duy trì'} (${multiplier} tháng)`,
            amount: -feeAmount, status: TransactionStatus.Completed, sourceEventId
        }
    };
};
