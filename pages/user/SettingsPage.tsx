
import React, { useState, useEffect, useMemo } from 'react';
import { AdminManagedUser, UserSettings } from '../../features/users/types';
import { useAuth } from '../../features/auth/useAuth';
import { useToast } from '../../components/ToastProvider';
import { ArrowPathIcon, EyeIcon, EyeSlashIcon, CheckIcon, BellIcon, ShieldCheckIcon, CpuChipIcon, InformationCircleIcon, ExclamationTriangleIcon, XCircleIcon, KeyIcon, CreditCardIcon, BanknotesIcon } from '../../components/Icons';
import { isEqual } from 'lodash-es';
import PasswordStrengthMeter from '../../components/PasswordStrengthMeter';
import { validatePassword, PasswordValidationResult } from '../../utils/validation';
import Modal from '../../components/Modal';
import { useActions } from '../../features/actions/useActions';
import { useSettings } from '../../features/settings/useSettings';

// --- CONSTANTS & HELPERS FOR BANK VALIDATION ---

// Danh sách ngân hàng chuẩn VietQR
const VIETQR_BANKS = [
    { code: 'MB', name: 'MBBank (Quân Đội)', shortName: 'MB' },
    { code: 'VCB', name: 'Vietcombank (Ngoại Thương)', shortName: 'VCB' },
    { code: 'TCB', name: 'Techcombank (Kỹ Thương)', shortName: 'TCB' },
    { code: 'ACB', name: 'ACB (Á Châu)', shortName: 'ACB' },
    { code: 'VPB', name: 'VPBank (Việt Nam Thịnh Vượng)', shortName: 'VPB' },
    { code: 'ICB', name: 'VietinBank (Công Thương)', shortName: 'ICB' },
    { code: 'BIDV', name: 'BIDV (Đầu tư & Phát triển)', shortName: 'BIDV' },
    { code: 'TPB', name: 'TPBank (Tiên Phong)', shortName: 'TPB' },
    { code: 'STB', name: 'Sacombank (Sài Gòn Thương Tín)', shortName: 'STB' },
    { code: 'HDB', name: 'HDBank (Phát triển TP.HCM)', shortName: 'HDB' },
    { code: 'VIB', name: 'VIB (Quốc Tế)', shortName: 'VIB' },
    { code: 'MSB', name: 'MSB (Hàng Hải)', shortName: 'MSB' },
    { code: 'OCB', name: 'OCB (Phương Đông)', shortName: 'OCB' },
    { code: 'SHB', name: 'SHB (Sài Gòn - Hà Nội)', shortName: 'SHB' },
    { code: 'LPB', name: 'LPBank (Lộc Phát)', shortName: 'LPB' },
    { code: 'SSB', name: 'SeABank (Đông Nam Á)', shortName: 'SSB' },
    { code: 'EIB', name: 'Eximbank (Xuất Nhập Khẩu)', shortName: 'EIB' },
    { code: 'VCCB', name: 'VietCapitalBank (Bản Việt)', shortName: 'VCCB' },
];

// Cấu hình quy tắc validate số tài khoản
interface BankRule {
    minLength: number;
    maxLength: number;
    description: string;
}

const BANK_RULES: Record<string, BankRule> = {
    'VCB': { minLength: 13, maxLength: 13, description: 'thường có 13 số (bắt đầu bằng 0)' },
    'TCB': { minLength: 14, maxLength: 14, description: 'thường có 14 số (bắt đầu bằng 19)' },
    'MB':  { minLength: 9, maxLength: 14, description: 'từ 9-14 số (bao gồm số điện thoại, tứ quý...)' },
    'ACB': { minLength: 8, maxLength: 11, description: 'thường có 8-9 số, tối đa 11 số' },
    'ICB': { minLength: 12, maxLength: 12, description: 'thường có 12 số (bắt đầu bằng 10 hoặc 711)' }, // Vietinbank
    'BIDV':{ minLength: 14, maxLength: 14, description: 'thường có 14 số' },
    'VPB': { minLength: 8, maxLength: 16, description: 'độ dài linh hoạt (thường 8-16 số)' },
    'TPB': { minLength: 11, maxLength: 11, description: 'thường có 11 số' },
    'VIB': { minLength: 15, maxLength: 15, description: 'thường có 15 số (bắt đầu bằng 6)' },
    'STB': { minLength: 12, maxLength: 12, description: 'thường có 12 số' }, // Sacombank
    'DEFAULT': { minLength: 6, maxLength: 20, description: 'từ 6 đến 20 số' }
};

const ToggleSwitch = ({ label, enabled, onToggle, description }: { label: string, enabled: boolean, onToggle: () => void, description?: string }) => (
    <div className="flex items-center justify-between py-4">
       <span className="flex flex-grow flex-col pr-4">
         <span className="text-sm font-medium leading-6 text-slate-900 dark:text-slate-200">{label}</span>
         {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
       </span>
       <button
         type="button"
         onClick={onToggle}
         className={`${enabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:focus:ring-offset-slate-800`}
         aria-checked={enabled}
       >
         <span className={`${enabled ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}/>
       </button>
   </div>
);

const ForgotPinModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onReset: (password: string, newPin: string) => { success: boolean; message?: string };
}> = ({ isOpen, onClose, onReset }) => {
    const [password, setPassword] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmNewPin, setConfirmNewPin] = useState('');
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [showPin, setShowPin] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setPassword('');
            setNewPin('');
            setConfirmNewPin('');
            setError('');
            setIsProcessing(false);
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        setError('');
        if (!password) { setError('Vui lòng nhập mật khẩu đăng nhập.'); return; }
        if (!/^\d{4}$/.test(newPin)) { setError('Mã PIN mới phải là 4 chữ số.'); return; }
        if (newPin !== confirmNewPin) { setError('Mã PIN xác nhận không khớp.'); return; }

        setIsProcessing(true);
        const result = onReset(password, newPin);
        if (!result.success && result.message) {
            setError(result.message);
        } else {
            onClose(); // Close on success
        }
        setIsProcessing(false);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Đặt lại Mã PIN"
            confirmText={isProcessing ? "Đang xử lý..." : "Đặt lại PIN"}
            onConfirm={handleConfirm}
            isConfirmDisabled={isProcessing}
        >
            <div className="space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Để đặt lại mã PIN, vui lòng xác thực bằng cách nhập mật khẩu đăng nhập của bạn, sau đó tạo một mã PIN mới.
                </p>
                
                <div>
                    <label className="text-sm font-medium">Mật khẩu đăng nhập</label>
                    <div className="relative mt-1">
                        <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required className="block w-full px-3 pr-10 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500">
                            {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium">Mã PIN mới (4 số)</label>
                    <div className="relative mt-1">
                        <input type={showPin ? 'text' : 'password'} value={newPin} onChange={e => setNewPin(e.target.value)} required maxLength={4} className="block w-full px-3 pr-10 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium">Xác nhận PIN mới</label>
                    <div className="relative mt-1">
                        <input type={showPin ? 'text' : 'password'} value={confirmNewPin} onChange={e => setConfirmNewPin(e.target.value)} required maxLength={4} className="block w-full px-3 pr-10 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <input type="checkbox" id="show-reset-pin" checked={showPin} onChange={() => setShowPin(!showPin)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                    <label htmlFor="show-reset-pin" className="text-sm">Hiển thị PIN</label>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
        </Modal>
    );
};

const TwoFactorSetupModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (code: string) => void;
}> = ({ isOpen, onClose, onConfirm }) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const mockSecret = 'JBSWY3DPEHPK3PXP'; // For display only
    const mockQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/Monetize:user@example.com?secret=${mockSecret}&issuer=Monetize`;

    const handleConfirm = () => {
        setError('');
        if (!/^\d{6}$/.test(code)) {
            setError('Mã xác thực phải là 6 chữ số.');
            return;
        }
        // In a real app, you'd verify the code against the secret on the backend.
        // Here, we'll just simulate success.
        onConfirm(code);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Thiết lập Xác thực 2 Lớp (2FA)" hideFooter>
            <div className="space-y-4">
                <p className="text-sm text-slate-500">Quét mã QR bằng ứng dụng xác thực của bạn (Google Authenticator, Authy, etc.), sau đó nhập mã 6 số để hoàn tất.</p>
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="p-2 bg-white rounded-lg inline-block shadow-md">
                        <img src={mockQrCodeUrl} alt="2FA QR Code" />
                    </div>
                    <p className="text-sm">Hoặc nhập mã này thủ công:</p>
                    <code className="px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-md font-mono tracking-widest">{mockSecret}</code>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Mã xác thực (6 số)</label>
                    <input
                        type="text"
                        value={code}
                        onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                        maxLength={6}
                        placeholder="_ _ _ _ _ _"
                        className="block w-full text-center tracking-[1em] px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                    />
                    {error && <p className="text-xs text-red-500 text-center">{error}</p>}
                </div>
                <div className="flex gap-4 pt-4">
                    <button onClick={onClose} className="w-full px-4 py-2 text-sm font-medium bg-slate-200 dark:bg-slate-600 rounded-md">Hủy</button>
                    <button onClick={handleConfirm} disabled={code.length !== 6} className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md disabled:bg-indigo-400">Xác minh & Kích hoạt</button>
                </div>
            </div>
        </Modal>
    );
};

const SettingsPage: React.FC = () => {
    const { loggedInUser: user } = useAuth();
    const { settingsState } = useSettings();
    const { userSettings } = settingsState;
    const { handleUpdateUser, handleSetPin, handleChangePin, handleResetPinWithPassword, handleUpdateUserSettings } = useActions();
    const { addToast } = useToast();
    const [settings, setSettings] = useState<UserSettings>(userSettings);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'security' | 'payment' | 'notifications' | 'automation'>('security');
    
    // Password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordValidation, setPasswordValidation] = useState<PasswordValidationResult['checks'] | null>(null);

    // PIN state
    const [newPin, setNewPin] = useState('');
    const [confirmNewPin, setConfirmNewPin] = useState('');
    const [currentPin, setCurrentPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [isForgotPinModalOpen, setIsForgotPinModalOpen] = useState(false);

    // 2FA State
    const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
    const [isDisable2FAModalOpen, setIsDisable2FAModalOpen] = useState(false);
    const [disable2FAPassword, setDisable2FAPassword] = useState('');
    const [disable2FAError, setDisable2FAError] = useState('');

    // Payment State
    const [paymentForm, setPaymentForm] = useState({
        bankShortName: '', // Temp field for dropdown logic
        bankName: '',
        bankAccountNumber: '',
        bankAccountName: '',
        momoPhoneNumber: ''
    });
    const [bankError, setBankError] = useState('');

    useEffect(() => {
        if (user) {
            // Attempt to match user's bank name with VIETQR list to pre-fill select
            const matchedBank = VIETQR_BANKS.find(b => b.name === user.bankName || b.shortName === user.bankName);
            setPaymentForm({
                bankShortName: matchedBank ? matchedBank.shortName : (user.bankName ? 'OTHER' : ''), // Use 'OTHER' or empty if not found
                bankName: user.bankName || '',
                bankAccountNumber: user.bankAccountNumber || '',
                bankAccountName: user.bankAccountName || '',
                momoPhoneNumber: user.momoPhoneNumber || ''
            });
            // Initial validation if data exists
            if (matchedBank) validateBankAccount(matchedBank.shortName, user.bankAccountNumber);
        }
    }, [user]);

    useEffect(() => {
        setSettings(userSettings);
    }, [userSettings]);
    
    useEffect(() => {
        if (activeTab === 'security') {
            const result = validatePassword(newPassword);
            setPasswordValidation(result.checks);
        }
    }, [newPassword, activeTab]);
    
    if (!user) {
        return null;
    }
    
    const isDirty = useMemo(() => !isEqual(settings, userSettings), [settings, userSettings]);
    
    // Check if Payment Form is dirty
    const isPaymentDirty = useMemo(() => {
        return (
            paymentForm.bankName !== (user.bankName || '') ||
            paymentForm.bankAccountNumber !== (user.bankAccountNumber || '') ||
            paymentForm.bankAccountName !== (user.bankAccountName || '') ||
            paymentForm.momoPhoneNumber !== (user.momoPhoneNumber || '')
        );
    }, [paymentForm, user]);


    // --- PAYMENT HELPERS ---

    const validateBankAccount = (shortName: string, number: string) => {
        if (!shortName || !number) {
            setBankError('');
            return;
        }
        
        const rule = BANK_RULES[shortName] || BANK_RULES['DEFAULT'];
        const len = number.length;
        
        if (len < rule.minLength || len > rule.maxLength) {
            setBankError(`STK ${shortName} phải từ ${rule.minLength}-${rule.maxLength} số (Hiện tại: ${len})`);
        } else {
            setBankError('');
        }
    };

    const handlePaymentChange = (field: keyof typeof paymentForm, value: string) => {
        let cleanValue = value;
        
        if (field === 'bankAccountNumber' || field === 'momoPhoneNumber') {
            cleanValue = value.replace(/[^0-9]/g, '');
        }
        if (field === 'bankAccountName') {
            cleanValue = value.toUpperCase();
        }

        setPaymentForm(prev => {
            const newState = { ...prev, [field]: cleanValue };
            
            // Trigger validation if bank details change
            if (field === 'bankAccountNumber' || field === 'bankShortName') {
                // If checking account number, use existing short name or the one being updated
                const shortName = field === 'bankShortName' ? cleanValue : newState.bankShortName;
                const accNum = field === 'bankAccountNumber' ? cleanValue : newState.bankAccountNumber;
                if (shortName && shortName !== 'OTHER') {
                    validateBankAccount(shortName, accNum);
                }
            }

            return newState;
        });
    };

    const handleBankSelect = (shortName: string) => {
        const selectedBank = VIETQR_BANKS.find(b => b.shortName === shortName);
        if (selectedBank) {
            setPaymentForm(prev => ({
                ...prev,
                bankShortName: selectedBank.shortName,
                bankName: selectedBank.name
            }));
            validateBankAccount(selectedBank.shortName, paymentForm.bankAccountNumber);
        } else {
            // Case for custom/other bank if we allowed it (currently just resetting)
             setPaymentForm(prev => ({
                ...prev,
                bankShortName: '',
                bankName: ''
            }));
            setBankError('');
        }
    };

    const handleSavePayment = async () => {
        if (bankError) {
             addToast('Vui lòng kiểm tra lại số tài khoản ngân hàng.', 'error');
             return;
        }

        setIsSaving(true);
        // Simulate API delay
        await new Promise(res => setTimeout(res, 500));
        
        const updateData = {
            id: user.id,
            bankName: paymentForm.bankName,
            bankAccountNumber: paymentForm.bankAccountNumber,
            bankAccountName: paymentForm.bankAccountName,
            momoPhoneNumber: paymentForm.momoPhoneNumber
        };

        const result = handleUpdateUser(updateData as AdminManagedUser);
        
        if (result.success) {
            // addToast is handled inside handleUpdateUser but let's confirm here for payment specific
            // Actually handleUpdateUser shows generic toast. We can add specific one if needed.
        }
        setIsSaving(false);
    };

    // --- OTHER HANDLERS ---

    const handleToggle = (key: keyof UserSettings['notifications']) => {
        setSettings(prev => ({
            ...prev,
            notifications: { ...prev.notifications, [key]: !prev.notifications[key] },
        }));
    };
    
    const handleSaveSettings = async () => {
        setIsSaving(true);
        await new Promise(res => setTimeout(res, 1000)); // Simulate API call
        handleUpdateUserSettings(settings);
        setIsSaving(false);
    }
    
    const handleResetSettings = () => {
        setSettings(userSettings);
    };

    const handlePasswordChange = (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');

        if (!user.password) {
             addToast('Không thể đổi mật khẩu cho tài khoản này (thiếu mật khẩu gốc).', 'error');
             return;
        }

        if (currentPassword !== user.password) {
            setPasswordError('Mật khẩu hiện tại không chính xác.');
            return;
        }

        const validation = validatePassword(newPassword);
        if (!validation.isValid) {
            setPasswordError(validation.errors.join(' '));
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('Mật khẩu xác nhận không khớp.');
            return;
        }
        
        handleUpdateUser({ ...user, password: newPassword });
        addToast('Đổi mật khẩu thành công!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    };

    const handlePinFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPinError('');
        
        if (!/^\d{4}$/.test(newPin)) {
            setPinError('Mã PIN phải là 4 chữ số.');
            return;
        }
        if (newPin !== confirmNewPin) {
            setPinError('Mã PIN xác nhận không khớp.');
            return;
        }

        let result;
        if (user.pin) { // Change PIN
            if (!/^\d{4}$/.test(currentPin)) {
                setPinError('PIN hiện tại phải là 4 chữ số.');
                return;
            }
            result = handleChangePin(currentPin, newPin);
        } else { // Create PIN
            result = handleSetPin(newPin);
        }

        if (result.success) {
            setCurrentPin('');
            setNewPin('');
            setConfirmNewPin('');
        } else if(result.message) {
            setPinError(result.message);
        }
    };
    
    const handleLogoutAllDevices = () => {
        addToast("Đã đăng xuất khỏi tất cả các thiết bị khác (mô phỏng).", 'success');
    };

    const handleConfirm2FASetup = (code: string) => {
        // Here you would normally verify the code. We simulate success.
        handleUpdateUser({ ...user, twoFactorEnabled: true, twoFactorSecret: 'JBSWY3DPEHPK3PXP' });
        addToast('Xác thực hai yếu tố đã được kích hoạt!', 'success');
    };
    
    const handleDisable2FA = () => {
        setDisable2FAError('');
        if (disable2FAPassword !== user.password) {
            setDisable2FAError('Mật khẩu không chính xác.');
            return;
        }
        handleUpdateUser({ ...user, twoFactorEnabled: false, twoFactorSecret: undefined });
        addToast('Xác thực hai yếu tố đã được vô hiệu hóa.', 'info');
        setIsDisable2FAModalOpen(false);
        setDisable2FAPassword('');
    };


    const TabButton: React.FC<{ tabId: 'security' | 'payment' | 'notifications' | 'automation'; label: string; icon: React.ReactNode }> = ({ tabId, label, icon }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-3 text-left p-3 rounded-lg transition-colors ${
                activeTab === tabId
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
        >
            {icon}
            <span>{label}</span>
        </button>
    );

    const SaveFooter = ({ onSave, isDirty }: { onSave: () => void, isDirty: boolean }) => (
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
            <button onClick={handleResetSettings} disabled={!isDirty || isSaving} className="px-4 py-2 text-sm font-medium rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
                Hủy
            </button>
            <button onClick={onSave} disabled={!isDirty || isSaving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed">
                {isSaving ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                {isSaving ? 'Đang lưu...' : 'Lưu Cài đặt'}
            </button>
        </div>
    );

     return (
        <>
            <ForgotPinModal isOpen={isForgotPinModalOpen} onClose={() => setIsForgotPinModalOpen(false)} onReset={handleResetPinWithPassword} />
            <TwoFactorSetupModal isOpen={is2FAModalOpen} onClose={() => setIs2FAModalOpen(false)} onConfirm={handleConfirm2FASetup} />
             <Modal isOpen={isDisable2FAModalOpen} onClose={() => setIsDisable2FAModalOpen(false)} title="Vô hiệu hóa 2FA" confirmText="Xác nhận" onConfirm={handleDisable2FA}>
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">Nhập mật khẩu của bạn để xác nhận vô hiệu hóa xác thực hai yếu tố.</p>
                     <div className="relative">
                        <input type="password" value={disable2FAPassword} onChange={e => setDisable2FAPassword(e.target.value)} className="block w-full px-3 py-2 border rounded-md" />
                    </div>
                    {disable2FAError && <p className="text-sm text-red-500">{disable2FAError}</p>}
                </div>
            </Modal>
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Cài đặt Tài khoản</h2>
                
                 <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="w-full md:w-60 flex-shrink-0 space-y-2">
                        <TabButton tabId="security" label="Bảo mật" icon={<ShieldCheckIcon className="h-5 w-5" />} />
                        <TabButton tabId="payment" label="Thanh toán" icon={<CreditCardIcon className="h-5 w-5" />} />
                        <TabButton tabId="notifications" label="Thông báo" icon={<BellIcon className="h-5 w-5" />} />
                        <TabButton tabId="automation" label="Tự động hóa" icon={<CpuChipIcon className="h-5 w-5" />} />
                    </div>

                    <div className="flex-1 w-full">
                        {activeTab === 'security' && (
                            <div className="space-y-6">
                                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Bảo mật 2 Lớp (2FA)</h3>
                                    <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                                        <div>
                                            <p className={`font-semibold ${user.twoFactorEnabled ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                                Trạng thái: {user.twoFactorEnabled ? 'Đã Kích hoạt' : 'Chưa Kích hoạt'}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Bảo vệ tài khoản của bạn khỏi truy cập trái phép.</p>
                                        </div>
                                        {user.twoFactorEnabled ? (
                                            <button onClick={() => setIsDisable2FAModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Vô hiệu hóa</button>
                                        ) : (
                                            <button onClick={() => setIs2FAModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Thiết lập</button>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Đổi Mật khẩu</h3>
                                        <form onSubmit={handlePasswordChange} className="space-y-4">
                                            <div className="relative">
                                                <input type={showCurrentPassword ? 'text' : 'password'} placeholder="Mật khẩu hiện tại" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="block w-full px-3 pr-10 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                                                <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500">
                                                    {showCurrentPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <input type={showNewPassword ? 'text' : 'password'} placeholder="Mật khẩu mới" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="block w-full px-3 pr-10 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                                                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500">
                                                    {showNewPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                                </button>
                                            </div>
                                            {passwordValidation && <PasswordStrengthMeter validationResult={passwordValidation} />}
                                            <div className="relative">
                                                <input type={showConfirmPassword ? 'text' : 'password'} placeholder="Xác nhận mật khẩu mới" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="block w-full px-3 pr-10 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500">
                                                    {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                                </button>
                                            </div>
                                            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
                                            <button type="submit" className="w-full px-4 py-2 text-sm font-medium text-white bg-slate-600 rounded-lg hover:bg-slate-700">Đổi mật khẩu</button>
                                        </form>
                                    </div>
                                    <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Mã PIN Rút Tiền</h3>
                                            {user.pin && (
                                                <button onClick={() => setIsForgotPinModalOpen(true)} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Quên mã PIN?</button>
                                            )}
                                        </div>
                                        <form onSubmit={handlePinFormSubmit} className="space-y-4">
                                            {user.pin && <input type={showPin ? 'text' : 'password'} placeholder="PIN hiện tại" value={currentPin} onChange={e => setCurrentPin(e.target.value)} required maxLength={4} className="block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />}
                                            <input type={showPin ? 'text' : 'password'} placeholder={user.pin ? "PIN mới (4 số)" : "Nhập PIN (4 số)"} value={newPin} onChange={e => setNewPin(e.target.value)} required maxLength={4} className="block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                                            <input type={showPin ? 'text' : 'password'} placeholder="Xác nhận PIN mới" value={confirmNewPin} onChange={e => setConfirmNewPin(e.target.value)} required maxLength={4} className="block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                                            <div className="flex items-center gap-2"><input type="checkbox" id="show-pin" checked={showPin} onChange={() => setShowPin(!showPin)} className="rounded text-indigo-600 focus:ring-indigo-500" /><label htmlFor="show-pin" className="text-sm">Hiển thị PIN</label></div>
                                            {pinError && <p className="text-sm text-red-500">{pinError}</p>}
                                            <button type="submit" className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">{user.pin ? 'Đổi Mã PIN' : 'Tạo Mã PIN'}</button>
                                        </form>
                                    </div>
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/10 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-red-500/20 p-6">
                                    <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2 flex items-center gap-2"><ExclamationTriangleIcon className="h-5 w-5" />Vùng Nguy hiểm</h3>
                                    <p className="text-sm text-red-700 dark:text-red-400 mb-4">Các hành động này có thể gây ra những thay đổi không thể hoàn tác.</p>
                                    <button onClick={handleLogoutAllDevices} className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/40">
                                        Đăng xuất khỏi tất cả thiết bị khác
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'payment' && (
                             <div className="space-y-6">
                                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6 max-w-3xl">
                                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                                        <BanknotesIcon className="h-5 w-5 text-indigo-500" />
                                        Tài khoản Ngân hàng (Nhận Hoa hồng)
                                    </h3>
                                    <div className="space-y-4">
                                         <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Chọn Ngân hàng</label>
                                            <select 
                                                value={paymentForm.bankShortName} 
                                                onChange={e => handleBankSelect(e.target.value)} 
                                                className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                            >
                                                <option value="">-- Chọn ngân hàng --</option>
                                                {VIETQR_BANKS.map(bank => (
                                                    <option key={bank.code} value={bank.shortName}>{bank.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Số tài khoản</label>
                                                <div className="relative mt-1">
                                                    <input 
                                                        type="text" 
                                                        value={paymentForm.bankAccountNumber} 
                                                        onChange={e => handlePaymentChange('bankAccountNumber', e.target.value)}
                                                        className={`block w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-700 dark:text-white ${bankError ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-slate-600 focus:ring-indigo-500'}`}
                                                    />
                                                     {bankError && (
                                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                                                        </div>
                                                    )}
                                                </div>
                                                {bankError && <p className="mt-1 text-xs text-red-500">{bankError}</p>}
                                                {paymentForm.bankShortName && !bankError && (
                                                    <p className="mt-1 text-xs text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
                                                        <InformationCircleIcon className="h-3 w-3" />
                                                        <span>{BANK_RULES[paymentForm.bankShortName]?.description || BANK_RULES['DEFAULT'].description}</span>
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Chủ tài khoản (Không dấu)</label>
                                                <input 
                                                    type="text" 
                                                    value={paymentForm.bankAccountName} 
                                                    onChange={e => handlePaymentChange('bankAccountName', e.target.value)}
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white uppercase"
                                                />
                                            </div>
                                         </div>
                                    </div>
                                </div>
                                
                                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6 max-w-3xl">
                                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                                        <CreditCardIcon className="h-5 w-5 text-pink-500" />
                                        Ví điện tử (Momo)
                                    </h3>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Số điện thoại Momo</label>
                                        <input 
                                            type="text" 
                                            value={paymentForm.momoPhoneNumber} 
                                            onChange={e => handlePaymentChange('momoPhoneNumber', e.target.value)}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                            placeholder="09xxx..."
                                        />
                                    </div>
                                </div>
                                <SaveFooter onSave={handleSavePayment} isDirty={isPaymentDirty} />
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6 max-w-2xl">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Cài đặt Thông báo</h3>
                                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                                    <ToggleSwitch label="Nhận hoa hồng mới" enabled={settings.notifications.newCommission} onToggle={() => handleToggle('newCommission')} />
                                    <ToggleSwitch label="Trạng thái rút tiền thay đổi" enabled={settings.notifications.withdrawalStatusChange} onToggle={() => handleToggle('withdrawalStatusChange')} />
                                    <ToggleSwitch label="Hoạt động mạng lưới mới" enabled={settings.notifications.networkActivity} onToggle={() => handleToggle('networkActivity')} />
                                </div>
                                <SaveFooter onSave={handleSaveSettings} isDirty={isDirty} />
                            </div>
                        )}
                        {activeTab === 'automation' && (
                            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6 max-w-2xl">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Tự động hóa tài khoản</h3>
                                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                                    <ToggleSwitch 
                                        label="Tự động gia hạn phí duy trì"
                                        description="Khi bật, hệ thống sẽ tự động trừ phí duy trì từ ví của bạn khi đến hạn, miễn là bạn có đủ số dư."
                                        enabled={settings.autoRenewMaintenance}
                                        onToggle={() => setSettings(prev => ({ ...prev, autoRenewMaintenance: !prev.autoRenewMaintenance }))}
                                    />
                                </div>
                                <SaveFooter onSave={handleSaveSettings} isDirty={isDirty} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default SettingsPage;
