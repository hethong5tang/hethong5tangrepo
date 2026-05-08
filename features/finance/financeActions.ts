
import { AdminManagedUser, MembershipTier, UserStatus } from '../users/types';
import { WithdrawalRequest, Transaction, TransactionType, TransactionStatus, WithdrawalStatus, FundType, MilestoneBonusRequest, MilestoneBonusRequestStatus, FundTransaction, DepositRequest } from './types';
import { findUserInTree } from '../../services/userService';
import { LogEntry, LoggableAction } from '../logging/types';
import { calculateFeePaymentChanges } from '../../services/financeService';

export const createFinanceActions = (deps: {
    financeState: any;
    financeDispatch: any;
    userState: any;
    userDispatch: any;
    settingsState: any;
    notificationDispatch: any;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    loggedInUser: AdminManagedUser | null;
    logAction: (payload: Omit<LogEntry, 'id' | 'timestamp' | 'ipAddress'>) => void;
}) => {
    const { financeState, financeDispatch, userState, userDispatch, settingsState, notificationDispatch, addToast, loggedInUser, logAction } = deps;

    // --- NEW: User tạo yêu cầu nạp tiền (Real Flow) ---
    const handleCreateDepositRequest = (amount: number, method: 'bank_transfer' | 'momo_qr', transferCode: string) => {
        if (!loggedInUser) return;

        const newRequest: DepositRequest = {
            id: `dep_${Date.now()}`,
            userId: loggedInUser.id,
            user: { name: loggedInUser.name, avatar: loggedInUser.avatar },
            requestDate: new Date().toISOString().split('T')[0],
            amount: amount,
            status: 'pending', // Quan trọng: Luôn là pending chờ Admin duyệt
            transferCode: transferCode,
            paymentMethod: method
        };

        financeDispatch({ type: 'ADD_DEPOSIT_REQUEST', payload: newRequest });
        
        // Thông báo cho Admin
        notificationDispatch({ 
            type: 'ADD_NOTIFICATION', 
            payload: { 
                userId: 'admin', 
                message: `Yêu cầu nạp tiền mới: ${amount.toLocaleString('vi-VN')}đ từ ${loggedInUser.name} (Mã: ${transferCode}).`, 
                link: 'Tài chính' 
            } 
        });

        logAction({
            userId: loggedInUser.id,
            userName: loggedInUser.name,
            actionType: LoggableAction.DEPOSIT_SUCCESS, // Lưu log là user đã tạo yêu cầu
            details: `Tạo yêu cầu nạp ${amount.toLocaleString('vi-VN')}đ qua ${method === 'bank_transfer' ? 'Ngân hàng' : 'Ví điện tử'}. Mã: ${transferCode}`,
            status: 'info'
        });

        addToast('Đã gửi yêu cầu nạp tiền. Vui lòng chờ Admin phê duyệt.', 'success');
    };

    // --- ADMIN: Xử lý duyệt/từ chối nạp tiền ---
    const handleProcessDeposit = (requestId: string, decision: 'approve' | 'reject') => {
        const request = financeState.depositRequests.find((r: DepositRequest) => r.id === requestId);
        if (!request || request.status !== 'pending') return;

        if (decision === 'approve') {
            const user = findUserInTree(userState.allUsers, request.userId);
            if (user) {
                // 1. Cập nhật trạng thái yêu cầu trong Finance
                financeDispatch({ type: 'PROCESS_DEPOSIT_APPROVE', payload: request });
                
                // 2. Cộng tiền vào ví User
                userDispatch({ 
                    type: 'UPDATE_USER', 
                    payload: { id: user.id, balance: user.balance + request.amount } 
                });

                addToast(`Đã duyệt nạp ${request.amount.toLocaleString('vi-VN')}đ cho ${user.name}.`, 'success');
                
                // 3. Thông báo cho User
                notificationDispatch({ 
                    type: 'ADD_NOTIFICATION', 
                    payload: { 
                        userId: request.userId, 
                        message: `Yêu cầu nạp tiền ${request.amount.toLocaleString('vi-VN')}đ của bạn đã được duyệt thành công!`, 
                        link: 'Ví Của Tôi' 
                    } 
                });

                if (loggedInUser) {
                    logAction({
                        userId: loggedInUser.id,
                        userName: loggedInUser.name,
                        actionType: LoggableAction.DEPOSIT_SUCCESS,
                        details: `Admin duyệt nạp tiền #${request.id} cho ${user.name}: +${request.amount.toLocaleString('vi-VN')}đ.`,
                        status: 'success'
                    });
                }
            }
        } else {
             // Từ chối
             financeDispatch({ type: 'PROCESS_DEPOSIT_REJECT', payload: request });
             addToast(`Đã từ chối yêu cầu nạp tiền của ${request.user.name}.`, 'info');
             
             notificationDispatch({ 
                type: 'ADD_NOTIFICATION', 
                payload: { 
                    userId: request.userId, 
                    message: `Yêu cầu nạp tiền ${request.amount.toLocaleString('vi-VN')}đ của bạn đã bị từ chối. Vui lòng liên hệ hỗ trợ nếu có sai sót.`, 
                    link: 'Hỗ trợ' 
                } 
            });
        }
    };

    const handleNewWithdrawalRequest = (amount: number, paymentMethod: 'bank' | 'momo', pin: string, isSupportWallet: boolean = false): { success: boolean, message?: string } => {
        if (!loggedInUser) return { success: false, message: 'Bạn cần đăng nhập để thực hiện.' };

        if (!loggedInUser.pin) { return { success: false, message: 'Vui lòng thiết lập mã PIN trong cài đặt bảo mật.' }; }
        if (loggedInUser.pin !== pin) { return { success: false, message: 'Mã PIN không chính xác.' }; }
        
        if (!isSupportWallet && loggedInUser.status !== UserStatus.Active) {
            return { success: false, message: 'Tài khoản đang bị hạn chế. Vui lòng thanh toán các khoản phí quá hạn.' };
        }
        
        let availableBalance = isSupportWallet ? (loggedInUser.supportWalletBalance || 0) : loggedInUser.balance;
        
        if (amount <= 0) { return { success: false, message: 'Số tiền không hợp lệ.' }; }
        if (amount > availableBalance) { return { success: false, message: 'Số dư ví không đủ để thực hiện lệnh này.' }; }
        
        const packagePrice = loggedInUser.membershipTier === MembershipTier.Master ? settingsState.systemSettings.masterParticipationFee :
                             loggedInUser.membershipTier === MembershipTier.Pro ? settingsState.systemSettings.proParticipationFee :
                             settingsState.systemSettings.participationFee;
                             
        const minWithdrawal = isSupportWallet ? (packagePrice * 0.2) : settingsState.systemSettings.minWithdrawal;
        
        if (amount < minWithdrawal) { 
            return { success: false, message: `Số tiền rút tối thiểu là ${minWithdrawal.toLocaleString('vi-VN')}đ.` }; 
        }

        const now = new Date().toISOString().split('T')[0];
        const newRequest: WithdrawalRequest = {
            id: `wd_${Date.now()}`, 
            userId: loggedInUser.id,
            user: { name: loggedInUser.name, avatar: loggedInUser.avatar },
            requestDate: now,
            updatedAt: now,
            amount,
            status: WithdrawalStatus.Pending, 
            paymentMethod,
            isSupportWallet
        };
        
        financeDispatch({ type: 'ADD_WITHDRAWAL_REQUEST', payload: newRequest });
        
        if (isSupportWallet) {
            userDispatch({ type: 'UPDATE_USER', payload: { id: loggedInUser.id, supportWalletBalance: (loggedInUser.supportWalletBalance || 0) - amount } });
        } else {
            userDispatch({ type: 'UPDATE_USER', payload: { id: loggedInUser.id, balance: loggedInUser.balance - amount } });
        }
        
        // Thông báo cho Admin
        notificationDispatch({ 
            type: 'ADD_NOTIFICATION', 
            payload: { 
                userId: 'admin', 
                message: `Yêu cầu rút tiền ${isSupportWallet ? 'từ Ví hỗ trợ ' : ''}mới: ${amount.toLocaleString('vi-VN')}đ từ ${loggedInUser.name}.`, 
                link: 'Tài chính' 
            } 
        });

        addToast('Lệnh rút tiền đã được gửi và đang chờ phê duyệt.', 'success');
        
        logAction({
            userId: loggedInUser.id,
            userName: loggedInUser.name,
            actionType: LoggableAction.WITHDRAWAL_REQUEST,
            details: `Rút ${amount.toLocaleString('vi-VN')}đ qua ${paymentMethod.toUpperCase()}${isSupportWallet ? ' (Ví hỗ trợ)' : ''}.`,
            status: 'info'
        });

        return { success: true };
    };

    const handleProcessWithdrawal = (requestId: string, decision: 'approve' | 'reject') => {
        const request = financeState.withdrawalRequests.find((r: WithdrawalRequest) => r.id === requestId);
        if (!request) return;
        
        const actionType = decision === 'approve' ? 'PROCESS_WITHDRAWAL_APPROVE' : 'PROCESS_WITHDRAWAL_REJECT';
        financeDispatch({ type: actionType, payload: request });

        if (loggedInUser) {
            logAction({
                userId: loggedInUser.id,
                userName: loggedInUser.name,
                actionType: LoggableAction.WITHDRAWAL_PROCESSED,
                details: `${decision === 'approve' ? 'Duyệt' : 'Từ chối'} lệnh rút #${request.id} của ${request.user.name} (${request.amount.toLocaleString('vi-VN')}đ).`,
                status: decision === 'approve' ? 'success' : 'info'
            });
        }

        if (decision === 'reject') {
            const user = findUserInTree(userState.allUsers, request.userId);
            if (user) {
                if (request.isSupportWallet) {
                    userDispatch({ type: 'UPDATE_USER', payload: { id: request.userId, supportWalletBalance: (user.supportWalletBalance || 0) + request.amount }});
                } else {
                    userDispatch({ type: 'REFUND_USER_BALANCE', payload: { userId: request.userId, amount: request.amount }});
                }
            }
            addToast(`Đã từ chối lệnh rút của ${request.user.name}.`, 'info');
            notificationDispatch({ 
                type: 'ADD_NOTIFICATION', 
                payload: { 
                    userId: request.userId, 
                    message: `Lệnh rút tiền ${request.amount.toLocaleString('vi-VN')}đ của bạn đã bị từ chối. Tiền đã được hoàn lại ví.`, 
                    link: 'Ví Của Tôi' 
                } 
            });
        } else {
            addToast(`Đã phê duyệt lệnh rút của ${request.user.name}.`, 'success');
            notificationDispatch({ 
                type: 'ADD_NOTIFICATION', 
                payload: { 
                    userId: request.userId, 
                    message: `Chúc mừng! Lệnh rút tiền ${request.amount.toLocaleString('vi-VN')}đ của bạn đã được thực hiện thành công.`, 
                    link: 'Ví Của Tôi' 
                } 
            });
        }
    };

    const handleBatchProcessWithdrawals = (ids: string[], decision: 'approve' | 'reject') => {
        const selectedRequests = financeState.withdrawalRequests.filter((r: WithdrawalRequest) => ids.includes(r.id) && r.status === WithdrawalStatus.Pending);
        
        if (selectedRequests.length === 0) return;

        financeDispatch({ 
            type: 'BATCH_PROCESS_WITHDRAWALS', 
            payload: { ids, decision, requests: selectedRequests } 
        });

        selectedRequests.forEach((request: WithdrawalRequest) => {
            if (decision === 'reject') {
                const user = findUserInTree(userState.allUsers, request.userId);
                if (user) {
                    if (request.isSupportWallet) {
                        userDispatch({ type: 'UPDATE_USER', payload: { id: request.userId, supportWalletBalance: (user.supportWalletBalance || 0) + request.amount }});
                    } else {
                        userDispatch({ type: 'REFUND_USER_BALANCE', payload: { userId: request.userId, amount: request.amount }});
                    }
                }
                notificationDispatch({ 
                    type: 'ADD_NOTIFICATION', 
                    payload: { 
                        userId: request.userId, 
                        message: `Lệnh rút tiền ${request.amount.toLocaleString('vi-VN')}đ của bạn đã bị từ chối. Tiền đã được hoàn lại ví.`, 
                        link: 'Ví Của Tôi' 
                    } 
                });
            } else {
                notificationDispatch({ 
                    type: 'ADD_NOTIFICATION', 
                    payload: { 
                        userId: request.userId, 
                        message: `Chúc mừng! Lệnh rút tiền ${request.amount.toLocaleString('vi-VN')}đ của bạn đã được thực hiện thành công.`, 
                        link: 'Ví Của Tôi' 
                    } 
                });
            }
        });

        const statusMsg = decision === 'approve' ? 'phê duyệt' : 'từ chối';
        addToast(`Đã ${statusMsg} hàng loạt ${selectedRequests.length} yêu cầu thành công!`, 'success');

        if (loggedInUser) {
            logAction({
                userId: loggedInUser.id,
                userName: loggedInUser.name,
                actionType: LoggableAction.WITHDRAWAL_BATCH_PROCESSED,
                details: `${decision === 'approve' ? 'Duyệt' : 'Từ chối'} hàng loạt ${selectedRequests.length} lệnh rút tiền.`,
                status: 'success'
            });
        }
    };

    const handleProcessLeaderFundPayout = (
        payoutData: { userId: string, user: { name: string, avatar: string }, amount: number, reason: string, metadata?: any }[], 
        description?: string,
        sourceFund: FundType = FundType.LeaderBonus
    ) => {
        const fund = financeState.fundStatus[sourceFund];
        
        // Handle Batch Payout
        const recipients = payoutData;
        const totalAmount = recipients.reduce((sum, r) => sum + r.amount, 0);

        if (totalAmount <= 0) {
             addToast('Tổng số tiền chi thưởng phải lớn hơn 0.', 'error');
             return;
        }
        if (totalAmount > fund.balance) {
             addToast(`Tổng chi (${totalAmount.toLocaleString('vi-VN')}đ) vượt quá số dư ${sourceFund === FundType.LeaderBonus ? 'quỹ Leader' : sourceFund === FundType.Support ? 'quỹ Hỗ Trợ' : 'ví Admin'} (${fund.balance.toLocaleString('vi-VN')}đ).`, 'error');
             return;
        }

        const date = new Date().toISOString().split('T')[0];
        const transactions: Transaction[] = [];
        const userUpdates: Partial<AdminManagedUser>[] = [];

        recipients.forEach(recipient => {
            // Transaction Record
            transactions.push({
                id: `txn_payout_${Date.now()}_${recipient.userId}`,
                userId: recipient.userId,
                user: recipient.user,
                date,
                type: sourceFund === FundType.Support ? TransactionType.SupportFundPayout : TransactionType.LeaderBonus,
                description: recipient.reason,
                amount: recipient.amount,
                status: TransactionStatus.Completed,
                metadata: recipient.metadata // Pass metadata through
            });

            // Update User Balance Logic Preparation
            const user = findUserInTree(userState.allUsers, recipient.userId);
            if (user) {
                userUpdates.push({
                    id: user.id,
                    balance: user.balance + recipient.amount,
                    totalEarnings: user.totalEarnings + recipient.amount
                });

                // Notification
                notificationDispatch({
                    type: 'ADD_NOTIFICATION',
                    payload: {
                        userId: recipient.userId,
                        message: `Chúc mừng! Bạn nhận được thưởng: ${recipient.amount.toLocaleString('vi-VN')}đ. Lý do: ${recipient.reason}`,
                        link: 'Ví Của Tôi'
                    }
                });
            }
        });

        const fundTransaction: FundTransaction = {
            id: `ft_out_${sourceFund}_${Date.now()}`,
            date,
            fund: sourceFund,
            type: 'outflow',
            amount: -totalAmount,
            description: description || `Chi thưởng cho ${recipients.length} người`,
            metadata: {
                users: recipients.map(r => ({
                    user: r.user,
                    reason: r.reason,
                    payoutAmount: r.amount
                })),
                totalAmount
            }
        };

        // Dispatch Finance Updates
        financeDispatch({ 
            type: sourceFund === FundType.LeaderBonus ? 'PROCESS_LEADER_FUND_BATCH_PAYOUT' : 
                  sourceFund === FundType.Support ? 'PROCESS_SUPPORT_FUND_BATCH_PAYOUT' : 
                  'PROCESS_ADMIN_WALLET_BATCH_PAYOUT', 
            payload: { totalAmount, transactions, fundTransaction, fund: sourceFund } 
        });

        // Dispatch User Updates
        userDispatch({ type: 'BULK_UPDATE_USERS', payload: userUpdates });

        addToast(`Đã chi thưởng thành công cho ${recipients.length} thành viên. Tổng: ${totalAmount.toLocaleString('vi-VN')}đ`, 'success');
        
        if (loggedInUser) {
            logAction({
                userId: loggedInUser.id,
                userName: loggedInUser.name,
                actionType: LoggableAction.FUND_PAYOUT_LEADER,
                details: `Chi quỹ ${sourceFund}: ${totalAmount.toLocaleString('vi-VN')}đ cho ${recipients.length} người. Nội dung: ${description}`,
                status: 'success'
            });
        }
    };

    const handleProcessSupportFundPayout = () => {
        const { fundSettings, systemSettings } = settingsState;
        const supportFund = financeState.fundStatus[FundType.Support];
        let availableBalance = supportFund.balance;

        const flattenUsers = (usersToFlatten: AdminManagedUser[]): AdminManagedUser[] => {
            return usersToFlatten.flatMap(u => [u, ...(u.children ? flattenUsers(u.children) : [])]);
        };
        const allFlatUsers = flattenUsers(userState.allUsers);

        // Lọc người dùng đủ điều kiện
        const eligibleUsers = allFlatUsers.filter(u => {
            if (u.f1Count > 0) return false;
            
            // Tính toán totalPayoutLimit (50% giá trị gói)
            const packagePrice = u.membershipTier === MembershipTier.Master ? systemSettings.masterParticipationFee :
                                 u.membershipTier === MembershipTier.Pro ? systemSettings.proParticipationFee :
                                 systemSettings.participationFee;
            
            const totalPayoutLimit = packagePrice * 0.5; // Giới hạn là 50% vốn
            return u.totalSupportReceived < totalPayoutLimit;
        });

        if (eligibleUsers.length === 0) {
            addToast("Không có thành viên nào đủ điều kiện nhận hỗ trợ trong đợt này.", 'info');
            return;
        }

        const transactions: Transaction[] = [];
        const userUpdates: Partial<AdminManagedUser>[] = [];
        let totalPayout = 0;

        // "quỹ sẽ chia đều 500k cho 1 người [cho tất cả eligible]"
        const payoutPerUser = Math.floor(availableBalance / eligibleUsers.length);

        if (payoutPerUser <= 0) {
             addToast("Quỹ hỗ trợ hiện không đủ để chia cho các thành viên.", 'info');
             return;
        }

        for (const user of eligibleUsers) {
            const packagePrice = user.membershipTier === MembershipTier.Master ? systemSettings.masterParticipationFee :
                                 user.membershipTier === MembershipTier.Pro ? systemSettings.proParticipationFee :
                                 systemSettings.participationFee;
            const totalPayoutLimit = packagePrice * 0.5;
            const remainingTotalLimit = Math.max(0, totalPayoutLimit - user.totalSupportReceived);
            
            // Chỉ chi tối đa đến mức giới hạn còn lại
            const actualPayout = Math.min(payoutPerUser, remainingTotalLimit);

            if (actualPayout > 0) {
                totalPayout += actualPayout;
                
                transactions.push({
                    id: `txn_sfp_${Date.now()}_${user.id}`,
                    userId: user.id,
                    user: { name: user.name, avatar: user.avatar },
                    date: new Date().toISOString().split('T')[0],
                    type: TransactionType.SupportFundPayout,
                    description: 'Nhận hỗ trợ từ Quỹ Chung vào Ví Hỗ Trợ',
                    amount: actualPayout,
                    status: TransactionStatus.Completed,
                });
                
                userUpdates.push({
                    id: user.id,
                    supportWalletBalance: (user.supportWalletBalance || 0) + actualPayout,
                    supportDebt: (user.supportDebt || 0) + actualPayout,
                    totalSupportReceived: (user.totalSupportReceived || 0) + actualPayout,
                });

                notificationDispatch({
                    type: 'ADD_NOTIFICATION',
                    payload: {
                        userId: user.id,
                        message: `Bạn được hệ thống hỗ trợ ${actualPayout.toLocaleString('vi-VN')}đ từ Quỹ Chung vào Ví Hỗ Trợ. Số tiền này sẽ được thu hồi từ hoa hồng đầu tiên của bạn.`,
                        link: 'Ví Của Tôi',
                    }
                });
            }
        }

        if (totalPayout > 0) {
            financeDispatch({ type: 'PROCESS_SUPPORT_FUND_PAYOUT', payload: { totalPayout, transactions, userCount: userUpdates.length } });
            userUpdates.forEach(update => userDispatch({ type: 'UPDATE_USER', payload: update }));
            addToast(`Đã giải ngân ${totalPayout.toLocaleString('vi-VN')}đ hỗ trợ cho ${userUpdates.length} TV.`, 'success');
            
            if (loggedInUser) {
                logAction({
                    userId: loggedInUser.id,
                    userName: loggedInUser.name,
                    actionType: LoggableAction.FUND_PAYOUT_SUPPORT,
                    details: `Giải ngân quỹ hỗ trợ: ${totalPayout.toLocaleString('vi-VN')}đ cho ${userUpdates.length} người dùng.`,
                    status: 'success'
                });
            }
        }
    };

    return {
        handleCreateDepositRequest,
        handleNewWithdrawalRequest,
        handleProcessWithdrawal,
        handleProcessDeposit,
        handleBatchProcessWithdrawals,
        handleProcessLeaderFundPayout,
        handleProcessSupportFundPayout,
    };
};
