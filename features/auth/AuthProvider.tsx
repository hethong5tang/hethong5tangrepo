
import React, { createContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { UserRole } from '../../types';
import { AdminManagedUser, MembershipTier, UserStatus } from '../users/types';
import { Permission } from '../roles/types';
import { useToast } from '../../components/ToastProvider';
import { useUser } from '../users/useUser';
import { useRoles } from '../roles/useRoles';
import { ADMIN_CREDENTIALS } from '../../config';
import { findUserInTree } from '../../services/userService';
import { LoggableAction } from '../logging/types';
import { useActions } from '../actions/useActions';
import { useLogging } from '../logging/useLogging';
import { supabase } from '../../services/supabaseClient';


interface AuthContextType {
    userRole: UserRole | null;
    loggedInUser: AdminManagedUser | null;
    permissions: Permission[];
    hasPermission: (permission: Permission) => boolean;
    handleLogin: (email: string, password: string) => { success: boolean; message: string; requires2fa?: boolean; userId?: string; };
    handleGoogleLogin: () => Promise<void>;
    handleLogout: () => void;
    handleFinalize2faLogin: (userId: string, code: string) => { success: boolean; message: string };
    // This is needed by ActionsProvider to complete the login flow after registration
    setPendingLoginId: (id: string | null) => void;
    pendingGoogleAuth: { email: string; name?: string } | null;
    clearPendingGoogleAuth: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { addToast } = useToast();
  const { userState, userDispatch } = useUser();
  const { allUsers } = userState;
  const { roleState } = useRoles();
  const { loggingDispatch } = useLogging();
  
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [pendingLoginId, setPendingLoginId] = useState<string | null>(null);
  const [pendingGoogleAuth, setPendingGoogleAuth] = useState<{email: string, name?: string} | null>(null);

  const loggedInUser = useMemo(() => {
    if (!loggedInUserId) return null;
    if (loggedInUserId === 'admin') {
      return {
        id: 'admin',
        name: 'Quản trị viên Cấp cao',
        email: ADMIN_CREDENTIALS.email,
        level: -1,
        membershipTier: MembershipTier.Master,
        status: UserStatus.Active,
      } as AdminManagedUser;
    }
    return findUserInTree(allUsers, loggedInUserId);
  }, [loggedInUserId, allUsers]);

  const handleOAuthSession = async (session: any) => {
    const email = session.user.email;
    const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name;
    
    if (email) {
        const existingUser = findUserRecursive(allUsers, email);
        if (existingUser) {
            performLogin(existingUser);
            addToast('Đăng nhập bằng Google thành công!', 'success');
            setPendingGoogleAuth(null);
        } else {
            // User not in our system, save info for registration
            setPendingGoogleAuth({ email, name });
            addToast(`Xác thực Google thành công cho ${email}. Vui lòng hoàn tất đăng ký để tạo tài khoản.`, 'info');
        }
    }
  };

  // Listener for Supabase Auth Popup Callback (Inside the popup)
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            // If we are in the popup window
            if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', session }, '*');
                window.close();
            } else {
                // If we are in main window and session synced automatically
                handleOAuthSession(session);
            }
        }
    });

    return () => {
        authListener.subscription.unsubscribe();
    };
  }, [allUsers]);

  // Listener for cross-window messages when user triggers OAuth popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data.session) {
        handleOAuthSession(event.data.session);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [allUsers]);

  useEffect(() => {
    if (pendingLoginId && allUsers.length > 0) {
        const user = findUserInTree(allUsers, pendingLoginId);
        if (user) {
            setUserRole(UserRole.User);
            setLoggedInUserId(user.id);
            setPendingLoginId(null); 
            window.location.hash = 'Bảng điều khiển';
        }
    }
  }, [pendingLoginId, allUsers]);


  const findUserRecursive = (users: AdminManagedUser[], emailToFind: string): AdminManagedUser | undefined => {
    const lowerCaseEmailToFind = emailToFind.toLowerCase();
    for (const user of users) {
        if (user.email.toLowerCase() === lowerCaseEmailToFind) return user;
        if (user.children) {
            const found = findUserRecursive(user.children, emailToFind);
            if (found) return found;
        }
    }
    return undefined;
  };
  
  const logAction = (payload: any) => {
    loggingDispatch({ type: 'ADD_LOG', payload });
  };

  const hasPermission = (permission: Permission): boolean => {
    return permissions.includes(permission);
  };

  const performLogin = (user: AdminManagedUser) => {
    if (user.roleId) {
        const role = roleState.roles.find(r => r.id === user.roleId);
        setUserRole(UserRole.Admin);
        setPermissions(role ? role.permissions : []);
        addToast(`Chào mừng quản trị viên ${user.name}!`, 'success');
    } else {
        setUserRole(UserRole.User);
        setPermissions([]);
        addToast(`Chào mừng trở lại, ${user.name}!`, 'success');
    }
    setLoggedInUserId(user.id);
    // Cập nhật ngày hoạt động cuối cùng
    const now = new Date().toISOString().split('T')[0];
    if (user.id !== 'admin') {
      userDispatch({ 
        type: 'UPDATE_USER', 
        payload: { id: user.id, lastActiveDate: now } 
      });
    }
    window.location.hash = 'Bảng điều khiển';
  };

  const handleGoogleLogin = async () => {
      const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
              skipBrowserRedirect: true,
              redirectTo: window.location.origin
          }
      });
      if (error) {
          addToast(error.message, 'error');
          return;
      }
      if (data?.url) {
          window.open(data.url, 'oauth_popup', 'width=600,height=700');
      }
  };

  const handleLogin = (email: string, password: string): { success: boolean; message: string; requires2fa?: boolean; userId?: string; } => {
    if (email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase() && password === ADMIN_CREDENTIALS.password) {
      setUserRole(UserRole.Admin);
      setLoggedInUserId('admin'); 
      setPermissions(Object.values(Permission)); 
      addToast('Đăng nhập với vai trò Quản trị viên Cấp cao thành công!', 'success');
      window.location.hash = 'Bảng điều khiển';
      return { success: true, message: 'Đăng nhập thành công!' };
    }

    const user = findUserRecursive(allUsers, email);

    if (user && user.password === password) {
      // Check if account is suspended or dead
      if (user.status === UserStatus.Suspended) {
        addToast('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.', 'error');
        logAction({
          userId: user.id,
          userName: user.name,
          actionType: LoggableAction.LOGIN_FAILURE,
          details: `Đăng nhập thất bại: Tài khoản đang bị khóa (Suspended)`,
          status: 'failure'
        });
        return { success: false, message: 'Tài khoản đã bị khóa.' };
      }

      // Logic check tài khoản chết (1 năm không hoạt động)
      const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : new Date(user.joinDate);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      if (lastActive < oneYearAgo || user.status === UserStatus.Dead) {
        addToast('Tài khoản đã ngừng hoạt động (trên 1 năm). Vui lòng liên hệ Admin để mở lại.', 'error');
        // Đồng bộ status Dead nếu chưa có
        if (user.status !== UserStatus.Dead) {
          userDispatch({ type: 'UPDATE_USER', payload: { id: user.id, status: UserStatus.Dead } });
        }
        logAction({
            userId: user.id,
            userName: user.name,
            actionType: LoggableAction.LOGIN_FAILURE,
            details: `Đăng nhập thất bại: Tài khoản chết (Dead account)`,
            status: 'failure'
        });
        return { success: false, message: 'Tài khoản đã ngừng hoạt động.' };
      }
      
      // Check for 2FA
      if (user.twoFactorEnabled) {
          return { success: true, message: 'Vui lòng nhập mã xác thực 2 yếu tố.', requires2fa: true, userId: user.id };
      }

      performLogin(user);
      return { success: true, message: 'Đăng nhập thành công!' };
    }

    return { success: false, message: 'Email hoặc mật khẩu không chính xác.' };
  };

  const handleFinalize2faLogin = (userId: string, code: string): { success: boolean; message: string } => {
    // In a real app, this would be a backend call to verify the code against the user's secret.
    // For this simulation, we'll accept any 6-digit code.
    if (!/^\d{6}$/.test(code)) {
        return { success: false, message: 'Mã xác thực phải là 6 chữ số.' };
    }
    
    // Simulating success
    const user = findUserInTree(allUsers, userId);
    if (user) {
        performLogin(user);
        return { success: true, message: 'Đăng nhập thành công!' };
    }

    return { success: false, message: 'Lỗi: Không tìm thấy người dùng để đăng nhập.' };
  };

  const handleLogout = async () => {
    // CLEAR SESSION DATA FOR TOOLS
    if (loggedInUserId) {
        localStorage.removeItem(`tool_bg_remover_session_${loggedInUserId}`);
        localStorage.removeItem(`tool_portrait_editor_session_${loggedInUserId}`);
        localStorage.removeItem(`tool_photo_restore_session_${loggedInUserId}`);
    }

    await supabase.auth.signOut();
    setUserRole(null);
    setLoggedInUserId(null);
    setPermissions([]);
    window.location.hash = '';
  };
  
  const clearPendingGoogleAuth = () => setPendingGoogleAuth(null);
  
  const value = {
    userRole,
    loggedInUser,
    permissions,
    hasPermission,
    handleLogin,
    handleGoogleLogin,
    handleLogout,
    handleFinalize2faLogin,
    setPendingLoginId,
    pendingGoogleAuth,
    clearPendingGoogleAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

