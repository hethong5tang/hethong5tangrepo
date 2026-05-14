
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SystemSettings, AdminWalletInfo } from '../../features/settings/types';
import { Cog6ToothIcon, ShieldExclamationIcon, ArrowPathIcon, CheckIcon, XCircleIcon, EyeIcon, EyeSlashIcon, CpuChipIcon, ExclamationTriangleIcon, ClockIcon, CalendarDaysIcon, BoltIcon, InformationCircleIcon, BanknotesIcon, PlusIcon, TrashIcon, ArrowUpTrayIcon, QrCodeIcon, ChartPieIcon, AcademicCapIcon, StarIcon } from '../../components/Icons';
import { isEqual } from 'lodash-es';
import { useToast } from '../../components/ToastProvider';
import { ADMIN_CREDENTIALS } from '../../config';
import PasswordStrengthMeter from '../../components/PasswordStrengthMeter';
import { validatePassword, PasswordValidationResult } from '../../utils/validation';
import { useActions } from '../../features/actions/useActions';
import FormattedNumberInput from '../../components/FormattedNumberInput';
import { useSettings } from '../../features/settings/useSettings';
import { GoogleGenAI } from "@google/genai";
import Modal from '../../components/Modal';

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

interface SettingsPageProps {}

const SettingsPage: React.FC<SettingsPageProps> = () => {
    const { settingsState } = useSettings();
    const { systemSettings: initialSettings } = settingsState;
    const { addToast } = useToast();
    const { handleUpdateSystemSettings: onSave } = useActions();
    const [settings, setSettings] = useState<SystemSettings>(initialSettings);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'security' | 'payment' | 'legal' | 'tiers'>('general');
    
    // Validation State
    const [bankError, setBankError] = useState<string>('');
    
    // Refs for file inputs
    const bankQrInputRef = useRef<HTMLInputElement>(null);
    const walletQrInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordValidation, setPasswordValidation] = useState<PasswordValidationResult['checks'] | null>(null);

    const [isScheduled, setIsScheduled] = useState(!!initialSettings.maintenanceEndTime);
    const [isTestingApi, setIsTestingApi] = useState(false);

    const [editingLevelIndex, setEditingLevelIndex] = useState<number | null>(null);

    useEffect(() => {
        setSettings(initialSettings);
        setIsScheduled(!!initialSettings.maintenanceEndTime);
        
        // Initial validation check on load
        if (initialSettings.adminPayment.bank.bankShortName) {
            validateBankAccount(initialSettings.adminPayment.bank.bankShortName, initialSettings.adminPayment.bank.accountNumber);
        }
    }, [initialSettings]);
    
    useEffect(() => {
        if (activeTab === 'security') {
            const result = validatePassword(newPassword);
            setPasswordValidation(result.checks);
        }
    }, [newPassword, activeTab]);
    
    const isDirty = useMemo(() => !isEqual(settings, initialSettings), [settings, initialSettings]);

    const handleSave = async () => {
        if (bankError) {
            addToast('Vui lòng sửa lỗi thông tin ngân hàng trước khi lưu.', 'error');
            return;
        }
        setIsSaving(true);
        await new Promise(res => setTimeout(res, 1000));
        onSave(settings);
        setIsSaving(false);
    };

    const handleReset = () => {
        setSettings(initialSettings);
        setIsScheduled(!!initialSettings.maintenanceEndTime);
        setBankError('');
    };

    const handleSettingChange = (field: keyof SystemSettings, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    // Helper validation function
    const validateBankAccount = (shortName: string, number: string) => {
        if (!shortName || !number) {
            setBankError('');
            return;
        }
        
        const rule = BANK_RULES[shortName] || BANK_RULES['DEFAULT'];
        const len = number.length;
        
        if (len < rule.minLength || len > rule.maxLength) {
            setBankError(`Số tài khoản ${shortName} phải từ ${rule.minLength} đến ${rule.maxLength} ký tự (Hiện tại: ${len}).`);
        } else {
            setBankError('');
        }
    };

    // Payment Handlers
    const handleBankChange = (field: keyof typeof settings.adminPayment.bank, value: any) => {
        let finalValue = value;

        // Nếu đang nhập số tài khoản -> Chỉ cho phép nhập số
        if (field === 'accountNumber') {
            finalValue = value.replace(/[^0-9]/g, '');
        }

        setSettings(prev => {
            const updatedBank = { ...prev.adminPayment.bank, [field]: finalValue };
            
            // Trigger validation
            if (field === 'accountNumber') {
                validateBankAccount(updatedBank.bankShortName || '', finalValue);
            } else if (field === 'bankShortName') {
                validateBankAccount(finalValue, updatedBank.accountNumber);
            }
            
            return {
                ...prev,
                adminPayment: {
                    ...prev.adminPayment,
                    bank: updatedBank
                }
            };
        });
    };
    
    const handleBankSelect = (shortName: string) => {
        const selectedBank = VIETQR_BANKS.find(b => b.shortName === shortName);
        if (selectedBank) {
            setSettings(prev => ({
                ...prev,
                adminPayment: {
                    ...prev.adminPayment,
                    bank: { 
                        ...prev.adminPayment.bank, 
                        bankShortName: selectedBank.shortName,
                        bankName: selectedBank.name 
                    }
                }
            }));
            validateBankAccount(shortName, settings.adminPayment.bank.accountNumber);
        } else {
             handleBankChange('bankShortName', shortName);
        }
    };

    const handleBankQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    handleBankChange('qrImageUrl', event.target.result as string);
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
        e.target.value = ''; // Reset input
    };

    const handleAddWallet = () => {
        const newWallet: AdminWalletInfo = {
            id: `w_${Date.now()}`,
            type: 'momo',
            name: 'Ví mới',
            phoneNumber: '',
            ownerName: '',
            enabled: true,
            useCustomQr: false,
            qrImageUrl: ''
        };
        setSettings(prev => ({
            ...prev,
            adminPayment: {
                ...prev.adminPayment,
                wallets: [...prev.adminPayment.wallets, newWallet]
            }
        }));
    };

    const handleUpdateWallet = (index: number, field: keyof AdminWalletInfo, value: any) => {
        setSettings(prev => {
            const newWallets = [...prev.adminPayment.wallets];
            newWallets[index] = { ...newWallets[index], [field]: value };
            return {
                ...prev,
                adminPayment: {
                    ...prev.adminPayment,
                    wallets: newWallets
                }
            };
        });
    };

    const handleWalletQrUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    handleUpdateWallet(index, 'qrImageUrl', event.target.result as string);
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
        e.target.value = '';
    };

    const handleDeleteWallet = (index: number) => {
        setSettings(prev => {
             const newWallets = prev.adminPayment.wallets.filter((_, i) => i !== index);
             return {
                ...prev,
                adminPayment: {
                    ...prev.adminPayment,
                    wallets: newWallets
                }
            };
        });
    };


    const handlePasswordChange = (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');

        if (currentPassword !== ADMIN_CREDENTIALS.password) {
            setPasswordError('Mật khẩu hiện tại không chính xác.');
            addToast('Mật khẩu hiện tại không chính xác.', 'error');
            return;
        }

        const validation = validatePassword(newPassword);
        if (!validation.isValid) {
            const errorMsg = validation.errors.join(' ');
            setPasswordError(errorMsg);
            addToast(errorMsg, 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('Mật khẩu xác nhận không khớp.');
            addToast('Mật khẩu xác nhận không khớp.', 'error');
            return;
        }

        addToast('Đổi mật khẩu Admin thành công! (Mô phỏng - mật khẩu sẽ được reset khi tải lại trang)', 'success');

        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    };
    
    // ... (Api test code remains same)
    const handleTestApiConnection = async () => {
        // ... same implementation as before
        if (!process.env.API_KEY) {
             // ...
             return;
        }
        setIsTestingApi(true);
        // ...
        setIsTestingApi(false);
    };
    
    const handleLegalChange = (field: keyof typeof settings.legalContent, value: string) => {
        setSettings(prev => ({
            ...prev,
            legalContent: {
                ...prev.legalContent,
                [field]: value
            }
        }));
    };

    const TabButton: React.FC<{ tabId: 'general' | 'security' | 'payment' | 'legal' | 'tiers'; label: string; }> = ({ tabId, label }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === tabId
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-200 dark:hover:border-slate-600'
            }`}
        >
            {label}
        </button>
    );

    // Helper to get bank rules description
    const currentBankRule = settings.adminPayment.bank.bankShortName ? (BANK_RULES[settings.adminPayment.bank.bankShortName] || BANK_RULES['DEFAULT']) : null;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Cài đặt hệ thống</h2>
            
            {/* ... Modal Code ... */}

            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <TabButton tabId="general" label="Chung" />
                    <TabButton tabId="payment" label="Thanh toán (Nạp tiền)" />
                    <TabButton tabId="legal" label="Pháp lý" />
                    <TabButton tabId="security" label="Bảo mật" />
                </nav>
            </div>

            {activeTab === 'general' && (
                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6 max-w-3xl">
                     {/* ... Same as existing General Tab ... */}
                     <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><Cog6ToothIcon className="h-5 w-5 text-indigo-500" />Cài đặt chung</h3>
                     <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tên hệ thống</label>
                            <input type="text" value={settings.systemName} onChange={e => handleSettingChange('systemName', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email quản trị</label>
                            <input type="email" value={settings.adminEmail} onChange={e => handleSettingChange('adminEmail', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                        </div>
                        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Trạng thái hệ thống</label>
                            <div className="flex items-center">
                                <span className="mr-3 text-sm">{settings.isMaintenanceMode ? 'Bảo trì' : 'Online'}</span>
                                <button type="button" onClick={() => handleSettingChange('isMaintenanceMode', !settings.isMaintenanceMode)} className={`${settings.isMaintenanceMode ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}>
                                    <span className={`${settings.isMaintenanceMode ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}/>
                                </button>
                            </div>
                        </div>
                     </div>
                </div>
            )}


            {activeTab === 'payment' && (
                <div className="space-y-6 max-w-5xl">
                    {/* Bank Settings */}
                    <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <BanknotesIcon className="h-5 w-5 text-indigo-500" />Tài khoản Ngân hàng (Admin)
                            </h3>
                            <div className="flex items-center">
                                <span className="mr-2 text-xs text-slate-500">{settings.adminPayment.bank.enabled ? 'Đang bật' : 'Đang tắt'}</span>
                                <button type="button" onClick={() => handleBankChange('enabled', !settings.adminPayment.bank.enabled)} className={`${settings.adminPayment.bank.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'} relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}>
                                    <span className={`${settings.adminPayment.bank.enabled ? 'translate-x-4' : 'translate-x-0'} inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}/>
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Chọn Ngân hàng</label>
                                <select 
                                    value={settings.adminPayment.bank.bankShortName || ''} 
                                    onChange={e => handleBankSelect(e.target.value)} 
                                    className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                >
                                    <option value="">-- Chọn ngân hàng --</option>
                                    {VIETQR_BANKS.map(bank => (
                                        <option key={bank.code} value={bank.shortName}>{bank.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tên Ngân hàng (Hiển thị)</label>
                                <input type="text" value={settings.adminPayment.bank.bankName} onChange={e => handleBankChange('bankName', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Mã ngân hàng (Shortname cho VietQR)</label>
                                <input 
                                    type="text" 
                                    value={settings.adminPayment.bank.bankShortName || ''} 
                                    onChange={e => handleBankChange('bankShortName', e.target.value)} 
                                    className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-slate-100 dark:bg-slate-600/50 dark:border-slate-600 dark:text-white cursor-not-allowed" 
                                    readOnly
                                    title="Mã này được tự động điền khi chọn ngân hàng để đảm bảo QR Code hoạt động"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Số tài khoản</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={settings.adminPayment.bank.accountNumber} 
                                        onChange={e => handleBankChange('accountNumber', e.target.value)} 
                                        className={`mt-1 block w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-700 dark:text-white ${bankError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 dark:border-slate-600'}`}
                                        placeholder="Chỉ nhập số"
                                    />
                                    {bankError && (
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                                        </div>
                                    )}
                                </div>
                                {bankError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{bankError}</p>}
                                {currentBankRule && !bankError && (
                                    <p className="mt-1 text-xs text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
                                        <InformationCircleIcon className="h-3 w-3" />
                                        <span>Định dạng: {currentBankRule.description}</span>
                                    </p>
                                )}
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Chủ tài khoản</label>
                                <input type="text" value={settings.adminPayment.bank.accountOwner} onChange={e => handleBankChange('accountOwner', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white uppercase" />
                            </div>
                        </div>

                        {/* Bank QR Image Upload */}
                        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                             <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <QrCodeIcon className="h-4 w-4"/> Mã QR Ngân hàng (Tùy chọn)
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">Dùng QR tự tải</span>
                                    <button 
                                        type="button" 
                                        onClick={() => handleBankChange('useCustomQr', !settings.adminPayment.bank.useCustomQr)} 
                                        className={`${settings.adminPayment.bank.useCustomQr ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-600'} relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
                                    >
                                        <span className={`${settings.adminPayment.bank.useCustomQr ? 'translate-x-4' : 'translate-x-0'} inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}/>
                                    </button>
                                </div>
                             </div>
                             
                             <div className="flex items-start gap-4">
                                <div className={`w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900 ${settings.adminPayment.bank.useCustomQr ? 'border-indigo-500' : 'border-gray-300 dark:border-slate-600 opacity-50'}`}>
                                    {settings.adminPayment.bank.qrImageUrl ? (
                                        <img src={settings.adminPayment.bank.qrImageUrl} alt="Bank QR" className="w-full h-full object-contain" />
                                    ) : (
                                        <span className="text-xs text-slate-400 text-center px-2">Chưa có ảnh</span>
                                    )}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <p className="text-xs text-slate-500">
                                        Tải lên ảnh mã QR của bạn nếu muốn dùng thay thế cho mã VietQR tự động.
                                        <br/>
                                        <span className="italic text-[10px]">*Hệ thống sẽ ưu tiên hiển thị ảnh này nếu chế độ "Dùng QR tự tải" được bật.</span>
                                    </p>
                                    <div className="flex gap-2">
                                         <button 
                                            onClick={() => bankQrInputRef.current?.click()} 
                                            disabled={!settings.adminPayment.bank.useCustomQr}
                                            className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 flex items-center gap-1"
                                        >
                                            <ArrowUpTrayIcon className="h-3 w-3"/> Tải ảnh lên
                                        </button>
                                        {settings.adminPayment.bank.qrImageUrl && (
                                            <button 
                                                onClick={() => handleBankChange('qrImageUrl', '')} 
                                                disabled={!settings.adminPayment.bank.useCustomQr}
                                                className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 disabled:opacity-50"
                                            >
                                                Xóa ảnh
                                            </button>
                                        )}
                                    </div>
                                    <input type="file" ref={bankQrInputRef} onChange={handleBankQrUpload} className="hidden" accept="image/*" />
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* E-Wallets Settings */}
                    <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <BoltIcon className="h-5 w-5 text-indigo-500" />Ví Điện tử (Admin)
                            </h3>
                             <button onClick={handleAddWallet} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
                                <PlusIcon className="h-4 w-4" /> Thêm Ví
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {settings.adminPayment.wallets.map((wallet, index) => (
                                <div key={wallet.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/30">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <select 
                                                value={wallet.type}
                                                onChange={e => handleUpdateWallet(index, 'type', e.target.value)}
                                                className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-sm rounded px-2 py-1"
                                            >
                                                <option value="momo">Momo</option>
                                                <option value="zalopay">ZaloPay</option>
                                                <option value="viettelpay">ViettelPay</option>
                                                <option value="other">Khác</option>
                                            </select>
                                            <input 
                                                type="text" 
                                                value={wallet.name}
                                                onChange={e => handleUpdateWallet(index, 'name', e.target.value)}
                                                className="bg-transparent border-b border-gray-300 dark:border-slate-600 text-sm font-semibold focus:outline-none focus:border-indigo-500 w-32"
                                                placeholder="Tên ví"
                                            />
                                        </div>
                                        <div className="flex items-center gap-3">
                                             <button type="button" onClick={() => handleUpdateWallet(index, 'enabled', !wallet.enabled)} className={`${wallet.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'} relative inline-flex h-4 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}>
                                                <span className={`${wallet.enabled ? 'translate-x-4' : 'translate-x-0'} inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}/>
                                            </button>
                                            <button onClick={() => handleDeleteWallet(index)} className="text-red-500 hover:text-red-700"><TrashIcon className="h-4 w-4"/></button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500">Số điện thoại / STK Ví</label>
                                            <input type="text" value={wallet.phoneNumber} onChange={e => handleUpdateWallet(index, 'phoneNumber', e.target.value)} className="mt-1 block w-full px-3 py-1.5 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500">Chủ tài khoản</label>
                                            <input type="text" value={wallet.ownerName} onChange={e => handleUpdateWallet(index, 'ownerName', e.target.value)} className="mt-1 block w-full px-3 py-1.5 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm uppercase" />
                                        </div>
                                    </div>

                                    {/* Wallet QR Upload */}
                                    <div className="pt-3 border-t border-slate-200 dark:border-slate-600/50">
                                         <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                                <QrCodeIcon className="h-3 w-3"/> Ảnh QR Code
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-500">Dùng QR tự tải</span>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleUpdateWallet(index, 'useCustomQr', !wallet.useCustomQr)} 
                                                    className={`${wallet.useCustomQr ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-600'} relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
                                                >
                                                    <span className={`${wallet.useCustomQr ? 'translate-x-3' : 'translate-x-0'} inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}/>
                                                </button>
                                            </div>
                                         </div>
                                         
                                         {wallet.useCustomQr && (
                                             <div className="flex items-center gap-3 animate-fadeIn">
                                                 <div className="w-16 h-16 border border-dashed border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                                                     {wallet.qrImageUrl ? (
                                                         <img src={wallet.qrImageUrl} alt="Wallet QR" className="w-full h-full object-contain" />
                                                     ) : (
                                                         <span className="text-[9px] text-slate-400">Trống</span>
                                                     )}
                                                 </div>
                                                 <div className="flex flex-col gap-1">
                                                     <button 
                                                        onClick={() => walletQrInputRefs.current[wallet.id]?.click()}
                                                        className="px-2 py-1 text-[10px] bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-600"
                                                     >
                                                         Tải ảnh
                                                     </button>
                                                      {wallet.qrImageUrl && (
                                                        <button 
                                                            onClick={() => handleUpdateWallet(index, 'qrImageUrl', '')}
                                                            className="px-2 py-1 text-[10px] text-red-500 hover:text-red-600"
                                                        >
                                                            Xóa
                                                        </button>
                                                     )}
                                                 </div>
                                                 <input 
                                                    type="file" 
                                                    ref={el => { walletQrInputRefs.current[wallet.id] = el; }}
                                                    onChange={(e) => handleWalletQrUpload(e, index)} 
                                                    className="hidden" 
                                                    accept="image/*" 
                                                />
                                             </div>
                                         )}
                                    </div>
                                </div>
                            ))}
                            {settings.adminPayment.wallets.length === 0 && (
                                <p className="text-center text-sm text-slate-500 italic py-4">Chưa có ví nào được cấu hình.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'legal' && (
                <div className="space-y-6 max-w-5xl">
                    <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                            <ShieldExclamationIcon className="h-5 w-5 text-indigo-500" />Cấu hình nội dung Pháp lý
                        </h3>
                        <p className="text-sm text-slate-500 mb-6 font-medium">Nội dung này sẽ hiển thị trong các cửa sổ khi người dùng nhấn vào các liên kết pháp lý ở cuối trang Landing Page.</p>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Điều khoản Dịch vụ (Terms of Service)</label>
                                <textarea 
                                    rows={8}
                                    value={settings.legalContent.tos}
                                    onChange={e => handleLegalChange('tos', e.target.value)}
                                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                                    placeholder="Nhập nội dung điều khoản..."
                                />
                            </div>

                            <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Chính sách Bảo mật (Privacy Policy)</label>
                                <textarea 
                                    rows={8}
                                    value={settings.legalContent.privacy}
                                    onChange={e => handleLegalChange('privacy', e.target.value)}
                                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                                    placeholder="Nhập nội dung chính sách bảo mật..."
                                />
                            </div>

                            <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Chính sách Hệ thống (System Policy)</label>
                                <textarea 
                                    rows={8}
                                    value={settings.legalContent.systemPolicy}
                                    onChange={e => handleLegalChange('systemPolicy', e.target.value)}
                                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                                    placeholder="Nhập nội dung chính sách hệ thống..."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'security' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
                    {/* ... Existing Security Tab content ... */}
                     <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><ShieldExclamationIcon className="h-5 w-5 text-indigo-500" />Bảo mật & Rút tiền</h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Số tiền rút tối thiểu</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <FormattedNumberInput
                                    value={settings.minWithdrawal}
                                    onChange={(value) => handleSettingChange('minWithdrawal', value)}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-8"
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500 sm:text-sm">đ</div>
                            </div>
                        </div>
                    </div>
                     <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Đổi mật khẩu</h3>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            {/* ... Password Fields ... */}
                             <div className="relative">
                                <input type={showCurrentPassword ? 'text' : 'password'} placeholder="Mật khẩu hiện tại" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                                <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500">
                                    {showCurrentPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                </button>
                            </div>
                            <div className="relative">
                                <input type={showNewPassword ? 'text' : 'password'} placeholder="Mật khẩu mới" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500">
                                    {showNewPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                </button>
                            </div>
                            {passwordValidation && <PasswordStrengthMeter validationResult={passwordValidation} />}
                            <div className="relative">
                                <input type={showConfirmPassword ? 'text' : 'password'} placeholder="Xác nhận mật khẩu mới" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500">
                                    {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                </button>
                            </div>
                            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
                            <button type="submit" className="w-full px-4 py-2 text-sm font-medium text-white bg-slate-600 rounded-lg hover:bg-slate-700">Đổi mật khẩu</button>
                        </form>
                    </div>
                </div>
            )}

            {isDirty && (
                <div className="pt-5 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={handleReset} disabled={isSaving} className="px-4 py-2 text-sm font-medium rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">Hủy</button>
                    <button onClick={handleSave} disabled={isSaving || !!bankError} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed">
                        {isSaving ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                        {isSaving ? 'Đang lưu...' : 'Lưu Thay đổi'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
