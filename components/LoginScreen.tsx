
import React, { useState, useEffect } from 'react';
import { EnvelopeIcon, KeyIcon, EyeIcon, EyeSlashIcon, UserCircleIcon, UserPlusIcon, ClipboardDocumentIcon, CheckIcon, InformationCircleIcon, DevicePhoneMobileIcon, XCircleIcon } from './Icons';
import { useAuth } from '../features/auth/useAuth';
import PasswordStrengthMeter from './PasswordStrengthMeter';
import { validatePassword, PasswordValidationResult } from '../utils/validation';
import { ADMIN_CREDENTIALS } from '../config';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<{success: boolean, message: string, requires2fa?: boolean, userId?: string}>;
  onGoogleLogin: () => Promise<void>;
  onFinalize2faLogin: (userId: string, code: string) => Promise<{ success: boolean, message: string }>;
  // Cập nhật kiểu trả về thành Promise
  onRegister: (name: string, email: string, password: string, parentId: string | null, phone: string) => Promise<{ success: boolean, message: string }>;
  onForgotPassword: (email: string) => Promise<{ success: boolean, message: string }>;
  referrerId?: string | null;
  referrerName?: string | null;
  isMaintenanceMode?: boolean;
  maintenanceEndTime?: string | null;
  onShowLegal?: (type: 'tos' | 'privacy') => void;
}

interface LoginHintGroup {
    group: string;
    hints: { role: string; email: string; pass: string; description: string }[];
}

const loginHints: LoginHintGroup[] = [
    {
        group: '1. Quản trị hệ thống',
        hints: [
            { role: 'Quản trị viên', email: 'admin@example.com', pass: 'adminpassword', description: 'Đầy đủ quyền quản lý Cài đặt, Duyệt yêu cầu rút/nạp tiền, Quản lý tài khoản' }
        ]
    },
    {
        group: '2. Kịch bản: Cây hệ thống',
        hints: [
            { role: 'Trùm Mạng Lưới', email: 'boss@example.com', pass: 'bosspassword', description: 'Tài khoản F0, người đứng đầu hệ thống thử nghiệm' },
            { role: 'Thành viên F1', email: 'f1.test@example.com', pass: 'password', description: 'Cấp F1 - Hưởng hoa hồng trực tiếp' },
            { role: 'Thành viên F2', email: 'f2.test@example.com', pass: 'password', description: 'Cấp F2 - Tuyến dưới gián tiếp' },
            { role: 'Thành viên F3', email: 'f3.test@example.com', pass: 'password', description: 'Cấp F3 (không sinh hoa hồng cho F0)' },
            { role: 'Thành viên F4', email: 'f4.test@example.com', pass: 'password', description: 'Cấp F4 (không sinh hoa hồng cho F0)' },
            { role: 'Thành viên F5', email: 'f5.test@example.com', pass: 'password', description: 'Cấp F5 (để test sự giới hạn số tầng)' }
        ]
    },
    {
        group: '3. Kịch bản: Các nghiệp vụ đặc biệt',
        hints: [
            { role: 'Leader đạt mốc', email: 'leader.test@example.com', pass: 'leaderpassword', description: 'Có nhiều thành viên F1, để kiểm tra tính năng Thưởng Leader' },
            { role: 'Người dùng vi phạm', email: 'violator@example.com', pass: 'violatorpassword', description: 'Tài khoản đang bị khóa do thiếu phí thuê bao (Đang nợ phạt)' },
            { role: 'Người dùng mới', email: 'newbie@example.com', pass: 'password', description: 'Chưa có F1 nào mạng lưới trống, dùng để test Ref Link' }
        ]
    }
];

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onGoogleLogin, onFinalize2faLogin, onRegister, onForgotPassword, referrerId, referrerName, isMaintenanceMode, maintenanceEndTime, onShowLegal }) => {
    const { pendingGoogleAuth, clearPendingGoogleAuth } = useAuth();
    const [view, setView] = useState<'login' | 'register' | 'forgot' | 'verify2fa'>('login');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Login state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // 2FA state
    const [userIdFor2fa, setUserIdFor2fa] = useState<string | null>(null);
    const [twoFactorCode, setTwoFactorCode] = useState('');

    // Register state
    const [registerName, setRegisterName] = useState('');
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerPhone, setRegisterPhone] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordValidation, setPasswordValidation] = useState<PasswordValidationResult['checks'] | null>(null);
    const [referralCode, setReferralCode] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    const [registerSuccess, setRegisterSuccess] = useState(false);

    // Forgot Password state
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotMessage, setForgotMessage] = useState({ type: '', text: '' });
    
    const [copyStatus, setCopyStatus] = useState<Record<string, boolean>>({});
    const [countdown, setCountdown] = useState('');
    const [isHintsOpen, setIsHintsOpen] = useState(false);
    const isDemoMode = typeof window !== 'undefined' && window.location.hostname.includes('-dev-');

    // Auto-fill admin credentials in all environments (development, staging, prod)
    useEffect(() => {
        if (view === 'login') {
            setLoginEmail(ADMIN_CREDENTIALS.email);
            setLoginPassword(ADMIN_CREDENTIALS.password);
        }
    }, [view]);

    // Watch for pending Google Auth to auto-fill
    useEffect(() => {
        if (pendingGoogleAuth) {
            setRegisterEmail(pendingGoogleAuth.email);
            if (pendingGoogleAuth.name) {
                setRegisterName(pendingGoogleAuth.name);
            }
            // Set a dummy password for Google users since the system requires one in handleRegister
            // In a real app this would be random/empty and handled differently
            setRegisterPassword('GoogleOAuth_' + Math.random().toString(36).slice(-8));
            setConfirmPassword(''); // confirmed via OAuth
            setView('register');
        }
    }, [pendingGoogleAuth]);

    useEffect(() => {
        if (!maintenanceEndTime) return;

        const interval = setInterval(() => {
            const endTime = new Date(maintenanceEndTime).getTime();
            const now = new Date().getTime();
            const distance = endTime - now;

            if (distance < 0) {
                setCountdown('');
                clearInterval(interval);
                return;
            }

            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            setCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(interval);
    }, [maintenanceEndTime]);

    useEffect(() => {
        if (referrerId) {
            setReferralCode(referrerId);
            if (!isMaintenanceMode) {
              setView('register');
            }
        }
    }, [referrerId, isMaintenanceMode]);
    
    useEffect(() => {
        if (isMaintenanceMode && view === 'register') {
            setView('login');
        }
    }, [isMaintenanceMode, view]);


    useEffect(() => {
        if (view === 'register') {
            const result = validatePassword(registerPassword);
            setPasswordValidation(result.checks);
        }
    }, [registerPassword, view]);

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (isMaintenanceMode && loginEmail.toLowerCase() !== ADMIN_CREDENTIALS.email.toLowerCase()) {
            return;
        }

        setIsLoading(true);
        const result = await onLogin(loginEmail, loginPassword);
        setIsLoading(false);

        if (result.success) {
            if (result.requires2fa && result.userId) {
                setUserIdFor2fa(result.userId);
                setView('verify2fa');
            }
        } else {
            setError(result.message);
        }
    };

    const handle2faSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!userIdFor2fa) return;

        setIsLoading(true);
        const result = await onFinalize2faLogin(userIdFor2fa, twoFactorCode);
        setIsLoading(false);
        
        if (!result.success) {
            setError(result.message);
        }
    };
    
    const handleManualRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (isMaintenanceMode) {
            setError('Chức năng đăng ký tạm thời bị vô hiệu hóa do bảo trì.');
            return;
        }

        if (!agreedToTerms) {
            setError('Bạn phải đồng ý với Điều khoản và Chính sách để tiếp tục.');
            return;
        }

        if (registerPassword !== confirmPassword && !pendingGoogleAuth) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }

        const validation = validatePassword(registerPassword);
        if (!validation.isValid && !pendingGoogleAuth) {
            setError(validation.errors.join(' '));
            return;
        }

        setIsLoading(true);
        const result = await onRegister(registerName, registerEmail, registerPassword, referralCode, registerPhone);
        
        if (result.success) {
            // Hiển thị phần "Xác nhận gửi email"
            setRegisterSuccess(true);
            if (pendingGoogleAuth) clearPendingGoogleAuth();
        } else {
            setError(result.message);
        }
        setIsLoading(false);
    };

    const handleGoogleRegister = async () => {
        setError('');
        
        if (isMaintenanceMode) {
            setError('Chức năng đăng ký tạm thời bị vô hiệu hóa do bảo trì.');
            return;
        }

        setIsLoading(true);
        // Gọi Google Login từ props
        await onGoogleLogin();
        setIsLoading(false);
    };

    const handleGoogleLoginBtn = async () => {
        setError('');
        setIsLoading(true);
        await onGoogleLogin();
        setIsLoading(false);
    };

    const handleForgotSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotMessage({ type: '', text: '' });
        setError('');
        setIsLoading(true);
        const result = await onForgotPassword(forgotEmail);
        setForgotMessage({ type: result.success ? 'success' : 'error', text: result.message });
        setIsLoading(false);
        if (result.success) {
            setForgotEmail('');
        }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(prev => ({ ...prev, [id]: true }));
        setTimeout(() => setCopyStatus(prev => ({ ...prev, [id]: false })), 2000);
    };

    const tabClasses = (tabName: 'login' | 'register') => {
        const isDisabled = tabName === 'register' && isMaintenanceMode;
        return `w-1/2 py-3 text-center font-semibold border-b-2 transition-colors ${
            isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${
            view === tabName 
            ? 'border-indigo-500 text-indigo-600' 
            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
        }`;
    }
    
  return (
    <div className="p-8">
         {isMaintenanceMode && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md text-sm text-yellow-800 dark:text-yellow-300 flex items-center gap-2 mb-6">
              <InformationCircleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0" />
              {countdown ? (
                  <span>Hệ thống sẽ hoạt động trở lại sau: <span className="font-bold tabular-nums">{countdown}</span></span>
              ) : (
                  <span>Hệ thống đang bảo trì.</span>
              )}
          </div>
        )}
        {view === 'login' || view === 'register' ? (
            <div className="flex border-b border-gray-200 mb-6">
                <div onClick={() => setView('login')} className={tabClasses('login')}>Đăng nhập</div>
                <div onClick={() => !isMaintenanceMode && setView('register')} className={tabClasses('register')}>Đăng ký</div>
            </div>
        ) : (
            <div className="mb-6 text-center">
               <h3 className="text-xl font-semibold text-gray-800">
                {view === 'forgot' ? 'Đặt lại mật khẩu' : 'Xác thực hai yếu tố'}
               </h3>
            </div>
        )}

        {/* --- FORM LOGIN --- */}
        {view === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                    <label htmlFor="login-email" className="sr-only">Email</label>
                    <div className="relative group">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><EnvelopeIcon className="h-5 w-5 text-gray-400" /></div>
                        <input id="login-email" type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="block w-full rounded-md border border-gray-200 bg-white pl-10 pr-10 py-2.5 text-gray-900 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Email" />
                        {loginEmail && (
                            <button type="button" onClick={() => setLoginEmail('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 opacity-0 group-focus-within:opacity-100 transition-opacity">
                                <XCircleIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>
                <div>
                    <label htmlFor="login-password" className="sr-only">Mật khẩu</label>
                    <div className="relative group">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><KeyIcon className="h-5 w-5 text-gray-400" /></div>
                        <input id="login-password" type={showPassword ? 'text' : 'password'} required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="block w-full rounded-md border border-gray-200 bg-white pl-10 pr-20 py-2.5 text-gray-900 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Mật khẩu" />
                        {loginPassword && (
                             <button type="button" onClick={() => setLoginPassword('')} className="absolute inset-y-0 right-10 flex items-center pr-3 text-slate-400 hover:text-slate-600 opacity-0 group-focus-within:opacity-100 transition-opacity">
                                <XCircleIcon className="h-5 w-5" />
                            </button>
                        )}
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3">{showPassword ? <EyeSlashIcon className="h-5 w-5 text-gray-400" /> : <EyeIcon className="h-5 w-5 text-gray-400" />}</button>
                    </div>
                </div>
                <div className="flex items-center justify-end">
                    <div className="text-sm">
                        <a href="#" onClick={(e) => { e.preventDefault(); setView('forgot'); setError(''); }} className="font-medium text-indigo-600 hover:text-indigo-500">
                            Quên mật khẩu?
                        </a>
                    </div>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div>
                    <button type="submit" disabled={isLoading} className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-500/50">
                        {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
                    </button>
                </div>
                
                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Hoặc tiếp tục với</span>
                    </div>
                </div>

                <div className="text-center">
                    <button 
                        type="button" 
                        disabled={isLoading || isMaintenanceMode} 
                        onClick={handleGoogleLoginBtn}
                        className="group relative w-full flex justify-center items-center gap-3 py-2.5 px-4 border border-slate-300 shadow-sm text-sm font-semibold rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all hover:shadow-md"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Đăng nhập bằng Google
                    </button>
                </div>
            </form>
        )}
        
        {/* --- FORM 2FA --- */}
        {view === 'verify2fa' && (
            <form onSubmit={handle2faSubmit} className="space-y-4">
                <p className="text-sm text-center text-slate-600">Mở ứng dụng xác thực của bạn và nhập mã 6 số để tiếp tục.</p>
                <div>
                    <label htmlFor="2fa-code" className="sr-only">Mã xác thực</label>
                    <div className="relative group">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><DevicePhoneMobileIcon className="h-5 w-5 text-gray-400" /></div>
                        <input
                            id="2fa-code"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            required
                            value={twoFactorCode}
                            onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
                            maxLength={6}
                            className="block w-full text-center tracking-[0.5em] text-lg font-semibold rounded-md border border-gray-200 bg-white px-10 py-2.5 text-gray-900 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500 sm:text-base"
                            placeholder="_ _ _ _ _ _"
                        />
                    </div>
                </div>

                {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                
                <div>
                    <button type="submit" disabled={isLoading || twoFactorCode.length !== 6} className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-500/50">
                        {isLoading ? 'Đang xử lý...' : 'Xác minh'}
                    </button>
                </div>

                 <div className="text-center">
                    <button type="button" onClick={() => { setView('login'); setError(''); setUserIdFor2fa(null); setTwoFactorCode(''); }} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                        &larr; Quay lại Đăng nhập
                    </button>
                </div>
            </form>
        )}

        {/* --- FORM REGISTER --- */}
        {view === 'register' && (
             <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                {pendingGoogleAuth && (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-md text-sm text-indigo-800 flex items-center gap-2">
                        <InformationCircleIcon className="h-5 w-5 text-indigo-500 flex-shrink-0" />
                        <div>
                            <p>Đã xác thực Google: <strong>{pendingGoogleAuth.email}</strong></p>
                            <p className="text-xs mt-1">Vui lòng hoàn thành thông tin bên dưới để tạo tài khoản trong hệ thống.</p>
                        </div>
                        <button onClick={clearPendingGoogleAuth} className="ml-auto text-indigo-400 hover:text-indigo-600">
                            <XCircleIcon className="h-4 w-4" />
                        </button>
                    </div>
                )}
                
                {referrerName && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800 flex items-center gap-2">
                        <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
                        <span>Bạn được giới thiệu bởi <span className="font-bold">{referrerName}</span>.</span>
                    </div>
                )}
                
                {registerSuccess ? (
                    <div className="text-center space-y-4">
                        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                            <h3 className="font-bold text-green-800 text-lg mb-2">Đăng ký thành công!</h3>
                            <p className="text-green-700 mb-4">
                                Một email xác thực đã được gửi đến địa chỉ email của bạn. Vui lòng kiểm tra hộp thư đến và nhấn vào link xác thực để kích hoạt tài khoản.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    alert("Mô phỏng: Bạn đã bấm vào link xác thực thành công!");
                                    setView('login');
                                    setRegisterSuccess(false);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-green-100 transition-colors border border-green-300 font-medium"
                            >
                                <EnvelopeIcon className="h-5 w-5" />
                                [Mô phỏng] Bấm vào link xác thực
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div>
                            <label htmlFor="register-ref" className="block text-xs font-medium text-slate-500 mb-1 ml-1 flex justify-between">
                                <span>Mã giới thiệu <span className="text-gray-400 font-normal">(Không bắt buộc)</span></span>
                                <span className="text-indigo-500">Dùng cho cả Email & Google</span>
                            </label>
                            <div className="relative group">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><UserPlusIcon className="h-5 w-5 text-gray-400" /></div>
                                <input id="register-ref" type="text" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} className="block w-full rounded-md border border-gray-200 bg-white pl-10 pr-10 py-2.5 text-gray-900 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Nhập mã giới thiệu nếu có" />
                                <div className="mt-1 text-[10px] text-gray-400 ml-1 italic">
                                    Nếu để trống, bạn sẽ đăng ký trực tiếp hệ thống.
                                </div>
                                {referralCode && (
                                    <button type="button" onClick={() => setReferralCode('')} className="absolute inset-y-0 right-0 top-0 h-[42px] flex items-center pr-3 text-slate-400 hover:text-slate-600 opacity-0 group-focus-within:opacity-100 transition-opacity">
                                        <XCircleIcon className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="register-email" className="sr-only">Email</label>
                            <div className="relative group">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><EnvelopeIcon className="h-5 w-5 text-gray-400" /></div>
                                <input id="register-email" type="email" required={view === 'register' && !isLoading} value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} className="block w-full rounded-md border border-gray-200 bg-white pl-10 pr-10 py-2.5 text-gray-900 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Email" />
                                {registerEmail && (
                                    <button type="button" onClick={() => setRegisterEmail('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 opacity-0 group-focus-within:opacity-100 transition-opacity">
                                        <XCircleIcon className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {!pendingGoogleAuth && (
                            <>
                                <div>
                                    <label htmlFor="register-password" className="sr-only">Mật khẩu</label>
                                    <div className="relative group">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><KeyIcon className="h-5 w-5 text-gray-400" /></div>
                                        <input id="register-password" type={showPassword ? 'text' : 'password'} required={view === 'register' && !isLoading} value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} className="block w-full rounded-md border border-gray-200 bg-white pl-10 pr-20 py-2.5 text-gray-900 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Mật khẩu" />
                                         {registerPassword && (
                                             <button type="button" onClick={() => setRegisterPassword('')} className="absolute inset-y-0 right-10 flex items-center pr-3 text-slate-400 hover:text-slate-600 opacity-0 group-focus-within:opacity-100 transition-opacity">
                                                <XCircleIcon className="h-5 w-5" />
                                            </button>
                                        )}
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3">{showPassword ? <EyeSlashIcon className="h-5 w-5 text-gray-400" /> : <EyeIcon className="h-5 w-5 text-gray-400" />}</button>
                                    </div>
                                </div>

                                {passwordValidation && <PasswordStrengthMeter validationResult={passwordValidation} />}

                                <div>
                                    <label htmlFor="register-confirm-password" className="sr-only">Xác nhận Mật khẩu</label>
                                    <div className="relative group">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><KeyIcon className="h-5 w-5 text-gray-400" /></div>
                                        <input id="register-confirm-password" type={showPassword ? 'text' : 'password'} required={view === 'register' && !isLoading} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="block w-full rounded-md border border-gray-200 bg-white pl-10 pr-10 py-2.5 text-gray-900 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Xác nhận Mật khẩu" />
                                        {confirmPassword && (
                                            <button type="button" onClick={() => setConfirmPassword('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 opacity-0 group-focus-within:opacity-100 transition-opacity">
                                                <XCircleIcon className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-100">{error}</p>}
                        
                        <div className="flex items-start gap-2 py-2">
                            <input
                                id="agree-terms"
                                type="checkbox"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="agree-terms" className="text-xs text-slate-500 leading-normal">
                                Tôi đã đọc và đồng ý với{' '}
                                <button 
                                    type="button" 
                                    onClick={() => onShowLegal?.('tos')}
                                    className="text-indigo-600 hover:underline font-medium"
                                >
                                    Điều khoản dịch vụ
                                </button>
                                {' '}và{' '}
                                <button 
                                    type="button" 
                                    onClick={() => onShowLegal?.('privacy')}
                                    className="text-indigo-600 hover:underline font-medium"
                                >
                                    Chính sách bảo mật
                                </button>
                                .
                            </label>
                        </div>

                        <div className="pt-2 text-center">
                            <button 
                                type="button" 
                                disabled={isLoading || isMaintenanceMode} 
                                onClick={handleManualRegister}
                                className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-500/50 transition-all font-medium"
                            >
                                {isLoading ? 'Đang xử lý...' : (pendingGoogleAuth ? 'Hoàn tất đăng ký bằng Google' : 'Tạo tài khoản')}
                            </button>
                        </div>

                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">Hoặc tiếp tục với</span>
                            </div>
                        </div>

                        <div className="text-center">
                            <button 
                                type="button" 
                                disabled={isLoading || isMaintenanceMode} 
                                onClick={handleGoogleRegister}
                                className="group relative w-full flex justify-center items-center gap-3 py-2.5 px-4 border border-slate-300 shadow-sm text-sm font-semibold rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all hover:shadow-md"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                                Đăng ký bằng Google
                            </button>
                        </div>
                    </>
                )}
            </form>
        )}

        {/* --- FORM FORGOT PASSWORD --- */}
        {view === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-sm text-center text-slate-600">Nhập email đã đăng ký. Trong bản mô phỏng này, mật khẩu của bạn sẽ được đặt lại thành một giá trị mặc định.</p>
                <div>
                    <label htmlFor="forgot-email" className="sr-only">Email</label>
                    <div className="relative group">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><EnvelopeIcon className="h-5 w-5 text-gray-400" /></div>
                        <input id="forgot-email" type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="block w-full rounded-md border border-gray-200 bg-white pl-10 pr-10 py-2.5 text-gray-900 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Email" />
                         {forgotEmail && (
                            <button type="button" onClick={() => setForgotEmail('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 opacity-0 group-focus-within:opacity-100 transition-opacity">
                                <XCircleIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>

                {forgotMessage.text && (
                    <div className={`p-3 rounded-md text-sm ${forgotMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                        {forgotMessage.text}
                    </div>
                )}
                
                <div>
                    <button type="submit" disabled={isLoading} className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-500/50">
                        {isLoading ? 'Đang xử lý...' : 'Gửi yêu cầu đặt lại'}
                    </button>
                </div>

                <div className="text-center">
                    <button type="button" onClick={() => { setView('login'); setForgotMessage({ type: '', text: ''}); }} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                        &larr; Quay lại Đăng nhập
                    </button>
                </div>
            </form>
        )}

      {/* --- MOCK LOGIN HINTS --- */}
      {isDemoMode && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <button 
                onClick={() => setIsHintsOpen(!isHintsOpen)} 
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors"
            >
                Gợi ý Đăng nhập (Demo)
                <svg className={`w-4 h-4 transform transition-transform ${isHintsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            
            {isHintsOpen && (
                <div className="text-xs text-gray-500 space-y-3 mt-4">
                    {loginHints.map((group, groupIdx) => (
                        <div key={groupIdx} className="mb-4 last:mb-0 border border-gray-100 rounded-md p-2 bg-white shadow-sm">
                            <p className="font-semibold text-xs text-blue-800 mb-2">{group.group}</p>
                            <div className="space-y-3 pl-1">
                                {group.hints.map(hint => (
                                    <div key={hint.role} className="flex flex-col border-l-2 border-blue-200 pl-2">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-1">
                                            <span className="font-bold text-gray-900">{hint.role}</span>
                                            <div className="flex items-center gap-2 mt-1 sm:mt-0 flex-wrap">
                                                <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200">{hint.email}</code>
                                                <button onClick={() => { setLoginEmail(hint.email); handleCopy(hint.email, hint.email); }} className="text-gray-400 hover:text-blue-600 transition-colors" title="Copy & Fill Email">
                                                    {copyStatus[hint.email] ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                                                </button>
                                                <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200">{hint.pass}</code>
                                                <button onClick={() => { setLoginPassword(hint.pass); handleCopy(hint.pass, hint.pass); }} className="text-gray-400 hover:text-blue-600 transition-colors" title="Copy & Fill Password">
                                                    {copyStatus[hint.pass] ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-gray-500 italic mt-0.5">{hint.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default React.memo(LoginScreen);
