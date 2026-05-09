
import { AdminManagedUser, MembershipTier, UserStatus } from '../users/types';
import { ADMIN_CREDENTIALS } from '../../config';
import { findUserInTree } from '../../services/userService';
import { LogEntry, LoggableAction } from '../logging/types';
import { userApi } from '../../api/userApi'; // Import API mới

// Helper to find user by email (Giữ lại cho ForgotPassword - có thể refactor sau)
const findUserByEmailRecursive = (users: AdminManagedUser[], emailToFind: string): AdminManagedUser | undefined => {
    const lowerCaseEmailToFind = emailToFind.toLowerCase().trim();
    for (const user of users) {
        if (user.email.toLowerCase().trim() === lowerCaseEmailToFind) return user;
        if (user.children) {
            const found = findUserByEmailRecursive(user.children, emailToFind);
            if (found) return found;
        }
    }
    return undefined;
};

export const createAuthActions = (deps: {
    userState: any;
    userDispatch: any;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    setPendingLoginId: (id: string | null) => void;
    handleFullAddUser: (newUser: AdminManagedUser, parentId?: string) => { success: boolean, message?: string };
    logAction: (payload: Omit<LogEntry, 'id' | 'timestamp' | 'ipAddress'>) => void;
}) => {
    const { userState, userDispatch, addToast, setPendingLoginId, handleFullAddUser, logAction } = deps;

    // Chuyển sang async function
    const handleRegister = async (name: string, email: string, password: string, parentId: string | null, phone: string): Promise<{ success: boolean; message: string }> => {
        // 1. Chuẩn hóa dữ liệu
        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();
        const cleanPhone = phone.trim().replace(/\s/g, ''); 
        const trimmedParentId = (parentId && parentId.trim() !== '') ? parentId.trim() : null;
        
        // 2. Validate phía "Server" (thông qua Mock API)
        // Thay vì check trực tiếp userState.allUsers, ta gọi API checkExists
        // Điều này giúp tách biệt logic: UI không cần biết cấu trúc dữ liệu user nằm ở đâu.
        try {
            const checkResult = await userApi.checkUserExists(cleanEmail, cleanPhone);
            if (checkResult.exists) {
                const msg = checkResult.field === 'email' ? 'Email đã được sử dụng.' : 'Số điện thoại đã được sử dụng.';
                return { success: false, message: msg };
            }
        } catch (error) {
            return { success: false, message: 'Lỗi kết nối máy chủ. Vui lòng thử lại.' };
        }

        let parentUser: AdminManagedUser | undefined;
        if (trimmedParentId) {
            // Phần này vẫn dùng state local vì cần object parent để tính level
            // Trong thực tế, Backend sẽ tự handle việc này dựa trên parentId gửi lên.
            parentUser = findUserInTree(userState.allUsers, trimmedParentId);
            if (!parentUser) {
                return { success: false, message: 'Mã giới thiệu không hợp lệ.' };
            }
        }
        
        const now = new Date();
        
        const newUser: AdminManagedUser = {
          id: `usr_${Date.now()}`, 
          name: cleanName, 
          email: cleanEmail, 
          password,
          parentId: trimmedParentId || undefined, // FIX: Gán parentId vào object user
          avatar: `https://picsum.photos/id/${Math.floor(Math.random() * 500)}/100`,
          joinDate: now.toISOString().split('T')[0],
          nextMaintenanceDate: undefined,
          level: parentUser ? parentUser.level + 1 : 0,
          rankLevel: 0,
          pendingLevelUpInfo: null,
          membershipTier: MembershipTier.None,
          status: UserStatus.Active,
          f1Count: 0, networkSize: 0, totalEarnings: 0, balance: 0, creditBalance: 0, 
          phone: cleanPhone,
          bankName: '', bankAccountNumber: '', bankAccountName: cleanName, children: [],
          totalSupportReceived: 0, missedMaintenanceMonths: 0, accumulatedPenalty: 0
        };
        
        // 3. Gọi action cập nhật state (Optimistic UI update)
        // Trong tương lai, chỗ này sẽ là `await userApi.createUser(newUser)`
        const result = handleFullAddUser(newUser, trimmedParentId || undefined);
        
        if (!result.success) {
            logAction({
                userId: 'system',
                userName: 'System',
                actionType: LoggableAction.REGISTER_FAILURE,
                details: `Registration failed for email ${cleanEmail}. Reason: ${result.message}`,
                status: 'failure'
            });
            return { success: false, message: result.message || 'Đăng ký thất bại.' };
        }
        
        setPendingLoginId(newUser.id);
        
        addToast('Đăng ký thành công! Chào mừng bạn. Vui lòng kích hoạt gói để bắt đầu.', 'success');
        logAction({
            userId: newUser.id,
            userName: newUser.name,
            actionType: LoggableAction.REGISTER_SUCCESS,
            details: `User ${newUser.name} (ID: ${newUser.id}) registered successfully.`,
            status: 'success'
        });
        return { success: true, message: 'Đăng ký thành công!' };
    };

    const handleForgotPassword = (email: string): { success: boolean; message: string; } => {
        const user = findUserByEmailRecursive(userState.allUsers, email);
        if (user) {
          userDispatch({ type: 'UPDATE_USER', payload: { ...user, password: 'password123' } });
          logAction({
            userId: user.id,
            userName: user.name,
            actionType: LoggableAction.FORGOT_PASSWORD,
            details: `User ${user.name} (ID: ${user.id}) requested a password reset.`,
            status: 'info'
          });
        }
        addToast('Yêu cầu đặt lại mật khẩu đã được gửi.', 'info');
        return { success: true, message: 'Nếu email của bạn tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.' };
    };

    return {
        handleRegister,
        handleForgotPassword,
    };
};
