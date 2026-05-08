
import { AdminManagedUser, MembershipTier, UserStatus, UpgradeResult, GenerationResult } from '../users/types';
import { Transaction, TransactionType, TransactionStatus, MilestoneBonusRequest, MilestoneBonusRequestStatus, FundTransaction } from '../finance/types';
import { calculateFeePaymentChanges } from '../../services/financeService';
import { findUserAndChildrenIds, addUserToTree, bulkRemoveUsersFromTree, findUserInTree } from '../../services/userService';
import { ADMIN_CREDENTIALS } from '../../config';
import { LogEntry, LoggableAction } from '../logging/types';
import { IntegrationTool } from '../settings/types';

export const createUserActions = (deps: {
    userState: any;
    userDispatch: any;
    financeDispatch: any;
    notificationDispatch: any;
    settingsState: any;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    loggedInUser: AdminManagedUser | null;
    logAction: (payload: Omit<LogEntry, 'id' | 'timestamp' | 'ipAddress'>) => void;
}) => {
    const { userState, userDispatch, financeDispatch, notificationDispatch, settingsState, addToast, loggedInUser, logAction } = deps;

    const checkAndApplyLevelUp = (userId: string, newTotalEarnings: number): Partial<AdminManagedUser> | null => {
        const user = findUserInTree(userState.allUsers, userId);
        if (!user) return null;
        const { levelSettings } = settingsState.systemSettings;
        const currentLevel = user.rankLevel;
        const addedEarnings = newTotalEarnings - user.totalEarnings;
        let currentRev = Math.max(0, user.currentLevelRevenue || 0) + addedEarnings;
        
        const nextLevelInfo = levelSettings.find((l: any) => l.level === currentLevel + 1);
        
        if (nextLevelInfo && currentRev >= nextLevelInfo.requiredEarnings) {
            let branchReqsMet = true;
            if (nextLevelInfo.branchRequirements && nextLevelInfo.branchRequirements.length > 0) {
                const flattenUsers = (list: AdminManagedUser[]): AdminManagedUser[] => list.flatMap(u => [u, ...(u.children ? flattenUsers(u.children) : [])]);
                const allDownlines = user.children ? flattenUsers(user.children) : [];
                
                for (const req of nextLevelInfo.branchRequirements) {
                    const countAtTarget = allDownlines.filter(dl => dl.rankLevel >= req.targetLevel).length;
                    if (countAtTarget < req.count) {
                        branchReqsMet = false;
                        break;
                    }
                }
            }
            
            if (branchReqsMet) {
                const newLevelName = nextLevelInfo.name || `Cấp ${nextLevelInfo.level}`;
                notificationDispatch({ type: 'ADD_NOTIFICATION', payload: { userId, message: `Chúc mừng! Bạn đã thăng hạng lên cấp bậc ${newLevelName}.`, link: 'Bảng điều khiển' } });
                return { rankLevel: nextLevelInfo.level, currentLevelRevenue: 0, pendingLevelUpInfo: { levelName: newLevelName } };
            }
        }
        
        return { currentLevelRevenue: currentRev };
    };

    const handleFullAddUser = (newUser: AdminManagedUser, parentId?: string): { success: boolean, message?: string } => {
        if (newUser.roleId && parentId) return { success: false, message: 'Tài khoản quản trị phải ở cấp cao nhất.' };
        
        // Kiểm tra trùng lặp (optimized)
        const allFlat = (list: AdminManagedUser[]): AdminManagedUser[] => list.flatMap(u => [u, ...(u.children ? allFlat(u.children) : [])]);
        const flatUsers = allFlat(userState.allUsers);
        
        // FIX: Check email duplicate (always) AND phone duplicate (ONLY if phone provided)
        const isEmailDuplicate = flatUsers.some(u => u.email.toLowerCase() === newUser.email.toLowerCase());
        const isPhoneDuplicate = newUser.phone && newUser.phone.trim() !== '' 
            ? flatUsers.some(u => u.phone === newUser.phone) 
            : false;

        if (isEmailDuplicate) {
            return { success: false, message: 'Email đã được sử dụng.' };
        }
        if (isPhoneDuplicate) {
            return { success: false, message: 'Số điện thoại đã được sử dụng.' };
        }

        // FIX: Đảm bảo parentId được gán cho user object, vì hàm tính toán tài chính dựa vào thuộc tính này của user
        if (parentId && !newUser.parentId) {
            newUser.parentId = parentId;
        }

        userDispatch({ type: 'ADD_USER', payload: { newUser, parentId } });
        
        if (newUser.membershipTier !== MembershipTier.None) {
            const updatedTree = addUserToTree([...userState.allUsers], newUser, parentId);
            const changes = calculateFeePaymentChanges(newUser.id, 'participation', newUser.membershipTier, updatedTree, settingsState.systemSettings, settingsState.fundSettings);
            if (changes) {
                const bulkUpdates: any[] = [];
                Object.keys(changes.userUpdates).forEach(uid => {
                    const u = findUserInTree(updatedTree, uid);
                    if (u) {
                        const newEarnings = u.totalEarnings + changes.userUpdates[uid].earningsChange;
                        const levelUpUpdate = checkAndApplyLevelUp(u.id, newEarnings);
                        
                        const debtChange = changes.userUpdates[uid].supportDebtChange || 0;
                        if (debtChange < 0) {
                            const recoveredAmount = Math.abs(debtChange);
                            // Notify User
                            notificationDispatch({
                                type: 'ADD_NOTIFICATION',
                                payload: {
                                    userId: u.id,
                                    message: `Hệ thống đã trích ra ${recoveredAmount.toLocaleString('vi-VN')}đ từ hoa hồng bạn vừa kiếm được để hoàn trả lại số tiền đã nhận hỗ trợ từ hệ thống.`,
                                    link: 'Ví Của Tôi'
                                }
                            });
                            // Notify Admin
                            notificationDispatch({
                                type: 'ADD_NOTIFICATION',
                                payload: {
                                    userId: 'admin',
                                    message: `Admin đã nhận được ${recoveredAmount.toLocaleString('vi-VN')}đ hỗ trợ hoàn lại từ ${u.name} do thành viên này đã bắt đầu hoạt động trở lại.`,
                                    link: 'Quỹ hỗ trợ'
                                }
                            });
                        }

                        bulkUpdates.push({
                            id: u.id,
                            balance: u.balance + changes.userUpdates[uid].balanceChange,
                            totalEarnings: newEarnings,
                            supportDebt: Math.max(0, (u.supportDebt || 0) + debtChange),
                            ...(levelUpUpdate || {})
                        });
                    }
                });
                userDispatch({ type: 'BULK_UPDATE_USERS', payload: bulkUpdates });
                financeDispatch({ type: 'APPLY_FEE_PAYMENT_CHANGES', payload: { changes, newUser } });
            }
        }
        
        addToast(`Đã thêm người dùng mới: ${newUser.name}`, 'success');
        return { success: true };
    };

    const handlePayDues = () => {
        if (!loggedInUser) return;
        const freshUser = findUserInTree(userState.allUsers, loggedInUser.id);
        if (!freshUser) return;
    
        const { systemSettings, fundSettings } = settingsState;
        const { membershipTier, missedMaintenanceMonths, balance } = freshUser;
    
        let maintenanceFee = membershipTier === MembershipTier.Pro ? systemSettings.proMaintenanceFee : 
                         membershipTier === MembershipTier.Master ? systemSettings.masterMaintenanceFee : 
                         systemSettings.maintenanceFee;
    
        const monthsToPay = Math.max(1, missedMaintenanceMonths);
        const baseDue = maintenanceFee * monthsToPay;
        const penaltyAmount = Math.round(baseDue * (systemSettings.penaltyFeeRate / 100));
        const totalDue = baseDue + penaltyAmount;
    
        if (balance < totalDue) {
            addToast(`Cần ${totalDue.toLocaleString('vi-VN')}đ, hiện có ${balance.toLocaleString('vi-VN')}đ.`, 'error');
            return;
        }
    
        const nextDueDate = new Date();
        nextDueDate.setDate(nextDueDate.getDate() + (30 * monthsToPay));
    
        const changes = calculateFeePaymentChanges(freshUser.id, 'maintenance', membershipTier, userState.allUsers, systemSettings, fundSettings, monthsToPay);
        if (changes) {
            const bulkUpdates: any[] = [{
                id: freshUser.id,
                balance: freshUser.balance - totalDue,
                status: UserStatus.Active,
                missedMaintenanceMonths: 0,
                accumulatedPenalty: 0,
                nextMaintenanceDate: nextDueDate.toISOString().split('T')[0],
            }];

            Object.keys(changes.userUpdates).forEach(uid => {
                const u = findUserInTree(userState.allUsers, uid);
                if (u) {
                    const newEarnings = u.totalEarnings + changes.userUpdates[uid].earningsChange;
                    const levelUp = checkAndApplyLevelUp(u.id, newEarnings);
                    
                    const debtChange = changes.userUpdates[uid].supportDebtChange || 0;
                    if (debtChange < 0) {
                        const recoveredAmount = Math.abs(debtChange);
                        // Notify User
                        notificationDispatch({
                            type: 'ADD_NOTIFICATION',
                            payload: {
                                userId: u.id,
                                message: `Hệ thống đã trích ra ${recoveredAmount.toLocaleString('vi-VN')}đ từ hoa hồng bạn vừa kiếm được để hoàn trả lại số tiền đã nhận hỗ trợ từ hệ thống.`,
                                link: 'Ví Của Tôi'
                            }
                        });
                        // Notify Admin
                        notificationDispatch({
                            type: 'ADD_NOTIFICATION',
                            payload: {
                                userId: 'admin',
                                message: `Admin đã nhận được ${recoveredAmount.toLocaleString('vi-VN')}đ hỗ trợ hoàn lại từ ${u.name} do thành viên này đã bắt đầu hoạt động trở lại.`,
                                link: 'Quỹ hỗ trợ'
                            }
                        });
                    }

                    bulkUpdates.push({
                        id: u.id,
                        balance: u.balance + changes.userUpdates[uid].balanceChange,
                        totalEarnings: newEarnings,
                        supportDebt: Math.max(0, (u.supportDebt || 0) + debtChange),
                        ...(levelUp || {})
                    });
                }
            });

            userDispatch({ type: 'BULK_UPDATE_USERS', payload: bulkUpdates });
            financeDispatch({ type: 'APPLY_FEE_PAYMENT_CHANGES', payload: { changes, newUser: freshUser } });
            
            if (penaltyAmount > 0) {
                financeDispatch({ type: 'ADD_TRANSACTION', payload: {
                    id: `txn_pen_${Date.now()}`, userId: freshUser.id, date: new Date().toISOString().split('T')[0],
                    type: TransactionType.PenaltyFee, description: `Phí phạt trễ hạn`, amount: -penaltyAmount, status: TransactionStatus.Completed
                }});
            }
            addToast('Thanh toán phí duy trì thành công!', 'success');
        }
    };

    const handleUpgradeTier = (newTier: MembershipTier): UpgradeResult => {
        if (!loggedInUser) return { success: false };
        const freshUser = findUserInTree(userState.allUsers, loggedInUser.id);
        if (!freshUser || newTier === freshUser.membershipTier) return { success: false };

        const fees = { 
            [MembershipTier.Starter]: settingsState.systemSettings.participationFee, 
            [MembershipTier.Pro]: settingsState.systemSettings.proParticipationFee, 
            [MembershipTier.Master]: settingsState.systemSettings.masterParticipationFee, 
            [MembershipTier.None]: 0 
        };
        
        // [FIX] Calculate Differential Cost
        const currentFee = fees[freshUser.membershipTier] || 0;
        const newFee = fees[newTier];
        const upgradeCost = Math.max(0, newFee - currentFee); // Ensure non-negative

        if (freshUser.balance < upgradeCost) return { success: false, needed: upgradeCost - freshUser.balance };

        // [FIX] Pass specificAmount (upgradeCost) to calculator
        const changes = calculateFeePaymentChanges(
            freshUser.id, 
            'participation', 
            newTier, 
            userState.allUsers, 
            settingsState.systemSettings, 
            settingsState.fundSettings, 
            1, 
            upgradeCost // Pass the differential amount
        );
        
        if(!changes) return { success: false };
        
        const bulkUpdates: any[] = [{
            id: freshUser.id,
            balance: freshUser.balance - upgradeCost, // Deduct only the difference
            creditBalance: freshUser.creditBalance + (upgradeCost / 1000), // Bonus credits based on payment
            membershipTier: newTier,
            nextMaintenanceDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }];

        Object.keys(changes.userUpdates).forEach(uid => {
            const u = findUserInTree(userState.allUsers, uid);
            if (u) {
                const newEarnings = u.totalEarnings + changes.userUpdates[uid].earningsChange;
                const levelUp = checkAndApplyLevelUp(u.id, newEarnings);
                
                const debtChange = changes.userUpdates[uid].supportDebtChange || 0;
                if (debtChange < 0) {
                    const recoveredAmount = Math.abs(debtChange);
                    // Notify User
                    notificationDispatch({
                        type: 'ADD_NOTIFICATION',
                        payload: {
                            userId: u.id,
                            message: `Hệ thống đã trích ra ${recoveredAmount.toLocaleString('vi-VN')}đ từ hoa hồng bạn vừa kiếm được để hoàn trả lại số tiền đã nhận hỗ trợ từ hệ thống.`,
                            link: 'Ví Của Tôi'
                        }
                    });
                    // Notify Admin
                    notificationDispatch({
                        type: 'ADD_NOTIFICATION',
                        payload: {
                            userId: 'admin',
                            message: `Admin đã nhận được ${recoveredAmount.toLocaleString('vi-VN')}đ hỗ trợ hoàn lại từ ${u.name} do thành viên này đã bắt đầu hoạt động trở lại.`,
                            link: 'Quỹ hỗ trợ'
                        }
                    });
                }

                bulkUpdates.push({ 
                    id: u.id, 
                    balance: u.balance + changes.userUpdates[uid].balanceChange, 
                    totalEarnings: newEarnings, 
                    supportDebt: Math.max(0, (u.supportDebt || 0) + debtChange),
                    ...(levelUp || {}) 
                });
            }
        });

        userDispatch({ type: 'BULK_UPDATE_USERS', payload: bulkUpdates });
        financeDispatch({ type: 'APPLY_FEE_PAYMENT_CHANGES', payload: { changes, newUser: { ...freshUser, membershipTier: newTier } } });
        addToast(`Nâng cấp gói ${newTier} thành công!`, 'success');
        return { success: true };
    };

    const handleUpdateUser = (updatedUser: AdminManagedUser): { success: boolean, message?: string } => {
        if (loggedInUser?.id !== 'admin' && updatedUser.email === ADMIN_CREDENTIALS.email) return { success: false, message: 'Hành động bị cấm.'};
        userDispatch({ type: 'UPDATE_USER', payload: updatedUser });
        addToast('Cập nhật thành công!', 'success');
        return { success: true };
    };

    const handleDeleteUser = (userId: string) => {
        const u = findUserInTree(userState.allUsers, userId);
        if (!u || u.f1Count > 0 || u.email === ADMIN_CREDENTIALS.email) {
            addToast('Không thể xóa người dùng này.', 'error');
            return;
        }
        userDispatch({ type: 'DELETE_USER', payload: { userId } });
        addToast('Đã xóa người dùng.', 'info');
    };

    const handleSetPin = (pin: string) => {
        if (!loggedInUser) return { success: false };
        userDispatch({ type: 'UPDATE_USER', payload: { id: loggedInUser.id, pin } });
        addToast('Đã tạo mã PIN.', 'success');
        return { success: true };
    };

    const handleChangePin = (oldPin: string, newPin: string) => {
        if (!loggedInUser || loggedInUser.pin !== oldPin) return { success: false, message: 'PIN cũ sai.' };
        userDispatch({ type: 'UPDATE_USER', payload: { id: loggedInUser.id, pin: newPin } });
        addToast('Đã đổi mã PIN.', 'success');
        return { success: true };
    };

    const handleResetPinWithPassword = (password: string, newPin: string) => {
        if (!loggedInUser || password !== loggedInUser.password) return { success: false, message: 'Mật khẩu sai.' };
        userDispatch({ type: 'UPDATE_USER', payload: { id: loggedInUser.id, pin: newPin } });
        addToast('Đã reset mã PIN.', 'success');
        return { success: true };
    };

    const handleAutomaticDeposit = (userId: string, userName: string, userAvatar: string, amount: number) => {
        const u = findUserInTree(userState.allUsers, userId);
        if (!u) return;
        userDispatch({ type: 'UPDATE_USER', payload: { id: userId, balance: u.balance + amount } });
        financeDispatch({ type: 'ADD_TRANSACTION', payload: {
            id: `dep_${Date.now()}`, userId, user: { name: userName, avatar: userAvatar },
            date: new Date().toISOString().split('T')[0], type: TransactionType.Deposit,
            description: 'Nạp tiền thành công', amount, status: TransactionStatus.Completed
        }});
        addToast('Nạp tiền thành công!', 'success');
    };

    const handleConvertVndToCredits = (userId: string, currentBalance: number, currentCredits: number, userName: string, userAvatar: string, vndAmount: number) => {
        const u = findUserInTree(userState.allUsers, userId);
        if (!u || u.balance < vndAmount) return;
        const credits = vndAmount / 1000;
        userDispatch({ type: 'UPDATE_USER', payload: { id: userId, balance: u.balance - vndAmount, creditBalance: u.creditBalance + credits } });
        financeDispatch({ type: 'ADD_TRANSACTION', payload: {
            id: `conv_${Date.now()}`, userId, user: { name: userName, avatar: userAvatar },
            date: new Date().toISOString().split('T')[0], type: TransactionType.CreditConversion,
            description: `Đổi ${vndAmount.toLocaleString()}đ sang ${credits} P`, amount: -vndAmount, status: TransactionStatus.Completed
        }});
        addToast('Đổi Credit thành công!', 'success');
    };

    const handleUseToolCredit = async (userId: string, tool: IntegrationTool) => {
        const u = findUserInTree(userState.allUsers, userId);
        if (!u || (tool.creditCost > 0 && u.creditBalance < tool.creditCost)) return { success: false };
        userDispatch({ type: 'ADJUST_USER_CREDIT', payload: { userId, amount: -tool.creditCost } });
        return { success: true };
    };

    const handleSetGenerationHistory = (userId: string, result: GenerationResult) => {
        userDispatch({ type: 'ADD_GENERATION_RESULT', payload: { userId, result } });
    };

    const handleDeleteGenerationResult = (userId: string, taskId: string) => {
        userDispatch({ type: 'DELETE_GENERATION_RESULT', payload: { userId, taskId } });
    };

    const handleDeleteSingleImage = (userId: string, taskId: string, imageIndex: number) => {
        userDispatch({ type: 'DELETE_SINGLE_IMAGE_FROM_RESULT', payload: { userId, taskId, imageIndex } });
    };

    return {
        handleFullAddUser, handleUpdateUser, handleDeleteUser, handlePayDues, handleUpgradeTier,
        handleSetPin, handleChangePin, handleResetPinWithPassword, handleAutomaticDeposit,
        handleConvertVndToCredits, handleUseToolCredit, handleSetGenerationHistory,
        handleDeleteGenerationResult, handleDeleteSingleImage
    };
};
