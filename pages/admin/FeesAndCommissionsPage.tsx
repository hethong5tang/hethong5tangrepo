
import React, { useState, useMemo, useEffect } from 'react';
import { CommissionSetting, SystemSettings } from '../../features/settings/types';
import { Permission } from '../../features/roles/types';
import { CurrencyDollarIcon, ArrowPathIcon, CheckIcon, TrashIcon, PlusIcon, XCircleIcon, BanknotesIcon, Cog6ToothIcon, ReceiptPercentIcon } from '../../components/Icons';
import { isEqual } from 'lodash-es';
import Modal from '../../components/Modal';
import { useAuth } from '../../features/auth/useAuth';
import { useToast } from '../../components/ToastProvider';
import { useActions } from '../../features/actions/useActions';
import { MembershipTier } from '../../features/users/types';
import FormattedNumberInput from '../../components/FormattedNumberInput';
import { useSettings } from '../../features/settings/useSettings';

const NumberInput: React.FC<{ label: string; value: number; onChange: (value: number) => void; adornment?: string; }> = ({ label, value, onChange, adornment }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        <div className="mt-1 relative rounded-md shadow-sm">
            <FormattedNumberInput
                value={value}
                onChange={onChange}
                className={`block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${adornment ? 'pr-8' : ''}`}
            />
            {adornment && <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500 sm:text-sm">{adornment}</div>}
        </div>
    </div>
);

const CurrencyInput: React.FC<{ label: string; value: number; onChange: (value: number) => void; }> = ({ label, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        <div className="mt-1 relative rounded-md shadow-sm">
            <FormattedNumberInput
                value={value}
                onChange={onChange}
                className="block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-8"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500 sm:text-sm">đ</div>
        </div>
    </div>
);


interface FeesAndCommissionsPageProps {}

export const FeesAndCommissionsPage: React.FC<FeesAndCommissionsPageProps> = () => {
    const { settingsState } = useSettings();
    const { systemSettings: initialSettings } = settingsState;
    const { hasPermission } = useAuth();
    const { addToast } = useToast();
    const { handleUpdateSystemSettings: onSave, handleResetSystemSettingsToDefault: onResetToDefault } = useActions();
    const canEdit = hasPermission(Permission.SETTINGS_FEES_COMMISSIONS_EDIT);

    const [settings, setSettings] = useState<SystemSettings>(initialSettings);
    const [isSaving, setIsSaving] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('fees');
    const [commissionType, setCommissionType] = useState('participation');
    
    useEffect(() => {
        setSettings(initialSettings);
    }, [initialSettings]);

    const handleSave = async () => {
        setIsSaving(true);
        await new Promise(res => setTimeout(res, 1000));
        onSave(settings);
        setIsSaving(false);
    };

    const feesKeys: (keyof SystemSettings)[] = [
        'participationFee', 'maintenanceFee', 
        'proParticipationFee', 'proMaintenanceFee',
        'masterParticipationFee', 'masterMaintenanceFee',
        'penaltyFeeRate', 'commissionSettings', 'profitSettings',
        'tierSettings'
    ];
    
    const isDirty = useMemo(() => !isEqual(
         Object.fromEntries(feesKeys.map(k => [k, (settings as any)[k]])),
        Object.fromEntries(feesKeys.map(k => [k, (initialSettings as any)[k]]))
    ), [settings, initialSettings]);


    const handleSettingChange = (field: keyof SystemSettings, value: any) => {
        if (!canEdit) return;
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleTierSettingChange = (tier: MembershipTier, field: 'name' | 'visible', value: string | boolean) => {
        if (!canEdit) return;
        setSettings(prev => ({
            ...prev,
            tierSettings: {
                ...prev.tierSettings,
                [tier]: {
                    ...prev.tierSettings[tier as keyof typeof prev.tierSettings],
                    [field]: value,
                },
            },
        }));
    };

    const handleProfitSettingChange = (feeType: 'participation' | 'maintenance', key: keyof SystemSettings['profitSettings']['participation'] | keyof SystemSettings['profitSettings']['maintenance'], value: number) => {
        if (!canEdit) return;
        setSettings(prev => ({
            ...prev,
            profitSettings: {
                ...prev.profitSettings,
                [feeType]: {
                    ...prev.profitSettings[feeType],
                    [key]: value,
                }
            }
        }));
    };

    const handleCommissionChange = (type: 'participation' | 'maintenance', index: number, value: number) => {
        if (!canEdit) return;
        
        const commissionKey = type === 'participation' ? 'participationCommissions' : 'maintenanceCommissions';
        
        const updatedCommissions = [...settings.commissionSettings[commissionKey]];
        updatedCommissions[index] = { ...updatedCommissions[index], percentage: value };

        handleSettingChange('commissionSettings', {
            ...settings.commissionSettings,
            [commissionKey]: updatedCommissions,
        });
    };
    
    const handleAddTier = (type: 'participation' | 'maintenance') => {
        if (!canEdit) return;
        const commissionKey = type === 'participation' ? 'participationCommissions' : 'maintenanceCommissions';
        const currentCommissions = settings.commissionSettings[commissionKey];
        const newLevel = currentCommissions.length + 1;

        const newCommissions = [
            ...currentCommissions,
            { level: `F${newLevel}`, percentage: 0 }
        ];

        /* Fix: Cannot find name 'updatedCommissions'. Replaced with 'newCommissions'. */
        handleSettingChange('commissionSettings', {
            ...settings.commissionSettings,
            [commissionKey]: newCommissions,
        });
    };

    const handleRemoveTier = (type: 'participation' | 'maintenance', indexToRemove: number) => {
        if (!canEdit) return;
        const commissionKey = type === 'participation' ? 'participationCommissions' : 'maintenanceCommissions';
        const currentCommissions = settings.commissionSettings[commissionKey];
        
        if (currentCommissions.length <= 1) {
            addToast('Phải có ít nhất 1 tầng hoa hồng.', 'error');
            return;
        }

        const newCommissions = currentCommissions
            .filter((_, index) => index !== indexToRemove)
            .map((commission, index) => ({
                ...commission,
                level: `F${index + 1}`
            }));

        handleSettingChange('commissionSettings', {
            ...settings.commissionSettings,
            [commissionKey]: newCommissions,
        });
    };

    const participationTotalAllocation = settings.profitSettings.participation.adminWallet + (settings.profitSettings.participation.vat || 10) + (settings.profitSettings.participation.corporateTax || 3) + settings.profitSettings.participation.leaderBonusFund + settings.profitSettings.participation.supportFund;
    const participationCommissionablePercentage = 100 - participationTotalAllocation;

    const maintenanceTotalAllocation = settings.profitSettings.maintenance.adminWallet + (settings.profitSettings.maintenance.vat || 10) + (settings.profitSettings.maintenance.corporateTax || 3) + settings.profitSettings.maintenance.leaderBonusFund + settings.profitSettings.maintenance.supportFund;
    const maintenanceCommissionablePercentage = 100 - maintenanceTotalAllocation;

    const TabButton: React.FC<{ tabName: string, label: string }> = ({ tabName, label }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                activeTab === tabName 
                ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
        >
            {label}
        </button>
    );

    const levelSettings = settingsState.systemSettings.levelSettings || [];

    return (
        <div className="space-y-6">
            <Modal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                title="Xác nhận Khôi phục"
                confirmText="Đồng ý Khôi phục"
                onConfirm={() => { onResetToDefault(); setIsResetModalOpen(false); }}
                confirmButtonVariant="danger"
            >
                <p className="text-sm text-slate-500 dark:text-slate-400">Bạn có chắc chắn muốn khôi phục tất cả cài đặt Phí & Chiết khấu về trạng thái mặc định không?</p>
            </Modal>

            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Phí & Chiết khấu</h2>
                {canEdit && (
                    <button onClick={() => setIsResetModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50 rounded-lg hover:bg-red-200 dark:hover:bg-red-900">
                        <ArrowPathIcon className="h-4 w-4" /> Khôi phục Mặc định
                    </button>
                )}
            </div>

            <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg self-start">
                <TabButton tabName="fees" label="Cài đặt Phí & Gói" />
                <TabButton tabName="commissions" label="Hoa hồng Hệ thống" />
                <TabButton tabName="profit" label="Phân bổ Quỹ" />
            </div>

            <div className="space-y-6">
                {activeTab === 'fees' && (
                    <div className="space-y-6">
                         <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><Cog6ToothIcon className="h-5 w-5 text-indigo-500" />Tên Gói Thành Viên</h3>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tên gói Starter</label>
                                    <input type="text" value={settings.tierSettings.starter.name} onChange={e => handleTierSettingChange(MembershipTier.Starter, 'name', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tên gói Pro</label>
                                    <input type="text" value={settings.tierSettings.pro.name} onChange={e => handleTierSettingChange(MembershipTier.Pro, 'name', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tên gói Master</label>
                                    <input type="text" value={settings.tierSettings.master.name} onChange={e => handleTierSettingChange(MembershipTier.Master, 'name', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><BanknotesIcon className="h-5 w-5 text-indigo-500" />Phí Gói Thành viên</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <CurrencyInput label={`${settings.tierSettings.starter.name} - Phí đăng ký`} value={settings.participationFee} onChange={value => handleSettingChange('participationFee', value)} />
                                <CurrencyInput label={`${settings.tierSettings.starter.name} - Phí thuê bao`} value={settings.maintenanceFee} onChange={value => handleSettingChange('maintenanceFee', value)} />
                                <CurrencyInput label={`${settings.tierSettings.pro.name} - Phí đăng ký`} value={settings.proParticipationFee} onChange={value => handleSettingChange('proParticipationFee', value)} />
                                <CurrencyInput label={`${settings.tierSettings.pro.name} - Phí thuê bao`} value={settings.proMaintenanceFee} onChange={value => handleSettingChange('proMaintenanceFee', value)} />
                                <CurrencyInput label={`${settings.tierSettings.master.name} - Phí đăng ký`} value={settings.masterParticipationFee} onChange={value => handleSettingChange('masterParticipationFee', value)} />
                                <CurrencyInput label={`${settings.tierSettings.master.name} - Phí thuê bao`} value={settings.masterMaintenanceFee} onChange={value => handleSettingChange('masterMaintenanceFee', value)} />
                            </div>
                        </div>
                         <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                             <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><Cog6ToothIcon className="h-5 w-5 text-indigo-500" />Phí Khác</h3>
                             <NumberInput label="Tỷ lệ % Phạt trễ phí thuê bao" value={settings.penaltyFeeRate} onChange={value => handleSettingChange('penaltyFeeRate', value)} adornment="%" />
                         </div>
                    </div>
                )}

                {activeTab === 'commissions' && (
                     <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                         <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2"><ReceiptPercentIcon className="h-5 w-5 text-indigo-500" />Cấu hình Hoa hồng Tầng (F1-Fn)</h3>
                             <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                                 <button onClick={() => setCommissionType('participation')} className={`px-3 py-1 text-xs font-semibold rounded-md ${commissionType === 'participation' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-500 dark:text-slate-400'}`}>Phí Đăng ký</button>
                                 <button onClick={() => setCommissionType('maintenance')} className={`px-3 py-1 text-xs font-semibold rounded-md ${commissionType === 'maintenance' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-500 dark:text-slate-400'}`}>Phí Thuê bao</button>
                             </div>
                         </div>
                        {(() => {
                            const type = commissionType as 'participation' | 'maintenance';
                            const commissions = settings.commissionSettings[type === 'participation' ? 'participationCommissions' : 'maintenanceCommissions'];
                            const baseAmount = type === 'participation' ? settings.participationFee : settings.maintenanceFee;
                            
                            // Calculate based on profit allocation
                            const allocatedToFunds = type === 'participation' 
                                ? (settings.profitSettings.participation.adminWallet + (settings.profitSettings.participation.vat || 10) + (settings.profitSettings.participation.corporateTax || 3) + settings.profitSettings.participation.leaderBonusFund + settings.profitSettings.participation.supportFund)
                                : (settings.profitSettings.maintenance.adminWallet + (settings.profitSettings.maintenance.vat || 10) + (settings.profitSettings.maintenance.corporateTax || 3) + settings.profitSettings.maintenance.leaderBonusFund + settings.profitSettings.maintenance.supportFund);
                            
                            const commissionablePercentage = 100 - allocatedToFunds;
                            const commissionableAmount = baseAmount * (commissionablePercentage / 100);
                            const totalCommissionPercentage = commissions.reduce((acc, c) => acc + c.percentage, 0);

                            return (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="p-4 bg-slate-100 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Trích Quỹ (Cố định 40%)</p>
                                            <p className="text-2xl font-bold text-orange-600">
                                                {allocatedToFunds}%
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                Thuế 13% + Admin 17% + Leader 5% + Hỗ trợ 5%
                                            </p>
                                        </div>
                                        <div className="p-4 bg-slate-100 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Tổng Hoa hồng (60%)</p>
                                            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                                {totalCommissionPercentage}%
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-1">Phân bổ 2 tầng F1-F2</p>
                                        </div>
                                        <div className="p-4 bg-slate-100 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Kiểm tra Logic</p>
                                            <p className={`text-2xl font-bold ${(allocatedToFunds + totalCommissionPercentage) === 100 ? 'text-green-600' : 'text-red-600'}`}>
                                                {(allocatedToFunds + totalCommissionPercentage) === 100 ? '✅ Hợp lệ' : '❌ Sai số'}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-1">Tổng (Quỹ + HH) phải = 100%</p>
                                        </div>
                                    </div>
                                    {/* Table starts here */}
                                    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                        <table className="w-full text-sm">
                                            <thead className="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left">Tầng</th>
                                                    <th className="px-6 py-3 text-left">Tỷ lệ (% trên Tổng)</th>
                                                    <th className="px-6 py-3 text-left">Số tiền ({settings.tierSettings.starter.name})</th>
                                                    <th className="px-6 py-3 text-left">Số tiền ({settings.tierSettings.pro.name})</th>
                                                    <th className="px-6 py-3 text-left">Số tiền ({settings.tierSettings.master.name})</th>
                                                    {canEdit && <th className="px-6 py-3 text-right">Hành động</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                                                {commissions.map((c, index) => {
                                                    const feeStarter = type === 'participation' ? settings.participationFee : settings.maintenanceFee;
                                                    const feePro = type === 'participation' ? settings.proParticipationFee : settings.proMaintenanceFee;
                                                    const feeMaster = type === 'participation' ? settings.masterParticipationFee : settings.masterMaintenanceFee;

                                                    // Calculate directly from total fee as requested
                                                    const amountStarter = Math.floor(feeStarter * (c.percentage/100));
                                                    const amountPro = Math.floor(feePro * (c.percentage/100));
                                                    const amountMaster = Math.floor(feeMaster * (c.percentage/100));
                                                    return (
                                                        <tr key={index} className="group hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                                                            <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{c.level}</td>
                                                            <td className="px-6 py-4">
                                                                <div className="relative max-w-[140px]">
                                                                    <FormattedNumberInput
                                                                        value={c.percentage}
                                                                        onChange={(val) => handleCommissionChange(type, index, val)}
                                                                        className="block w-full px-3 py-1.5 border rounded-md bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-sm font-bold text-indigo-600 dark:text-indigo-400"
                                                                    />
                                                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500 font-bold">%</div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-bold">{amountStarter.toLocaleString('vi-VN')}đ</td>
                                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-bold">{amountPro.toLocaleString('vi-VN')}đ</td>
                                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-bold">{amountMaster.toLocaleString('vi-VN')}đ</td>
                                                            {canEdit && (
                                                                <td className="px-6 py-4 text-right">
                                                                    {index > 0 && <button onClick={() => handleRemoveTier(type, index)} className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-full hover:bg-red-50"><TrashIcon className="h-5 w-5" /></button>}
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    {canEdit && (
                                        <button onClick={() => handleAddTier(type)} className="mt-4 w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50 flex items-center justify-center gap-2">
                                            <PlusIcon className="h-4 w-4" /> Thêm Tầng
                                        </button>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                )}

                {activeTab === 'profit' && (
                    <div className="space-y-6">
                        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><CurrencyDollarIcon className="h-5 w-5 text-indigo-500" />Phân bổ Quỹ & Lợi nhuận</h3>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium text-slate-800 dark:text-slate-200">Nguồn từ Phí Đăng ký</h4>
                                        <span className="text-xs text-slate-500">Tổng phân bổ cho Quỹ: {settings.profitSettings.participation.adminWallet + (settings.profitSettings.participation.vat || 10) + (settings.profitSettings.participation.corporateTax || 3) + settings.profitSettings.participation.leaderBonusFund + settings.profitSettings.participation.supportFund}%</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-2">
                                        <NumberInput label="Ví Admin" value={settings.profitSettings.participation.adminWallet} onChange={value => handleProfitSettingChange('participation', 'adminWallet', value)} adornment="%" />
                                        <NumberInput label="Thuế VAT" value={settings.profitSettings.participation.vat || 10} onChange={value => handleProfitSettingChange('participation', 'vat', value)} adornment="%" />
                                        <NumberInput label="Thuế TNDN" value={settings.profitSettings.participation.corporateTax || 3} onChange={value => handleProfitSettingChange('participation', 'corporateTax', value)} adornment="%" />
                                        <NumberInput label="Quỹ Leader" value={settings.profitSettings.participation.leaderBonusFund} onChange={value => handleProfitSettingChange('participation', 'leaderBonusFund', value)} adornment="%" />
                                        <NumberInput label="Quỹ Hỗ Trợ" value={settings.profitSettings.participation.supportFund} onChange={value => handleProfitSettingChange('participation', 'supportFund', value)} adornment="%" />
                                    </div>
                                    <div className="mt-2 text-[10px] text-slate-500 italic">Số % còn lại ({100 - (settings.profitSettings.participation.adminWallet + (settings.profitSettings.participation.vat || 10) + (settings.profitSettings.participation.corporateTax || 3) + settings.profitSettings.participation.leaderBonusFund + settings.profitSettings.participation.supportFund)}%) sẽ dùng để chi trả Chiết khấu Hệ thống.</div>
                                </div>

                                 <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium text-slate-800 dark:text-slate-200">Nguồn từ Phí Thuê bao</h4>
                                        <span className="text-xs text-slate-500">Tổng phân bổ cho Quỹ: {settings.profitSettings.maintenance.adminWallet + (settings.profitSettings.maintenance.vat || 10) + (settings.profitSettings.maintenance.corporateTax || 3) + settings.profitSettings.maintenance.leaderBonusFund + settings.profitSettings.maintenance.supportFund}%</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-2">
                                        <NumberInput label="Ví Admin" value={settings.profitSettings.maintenance.adminWallet} onChange={value => handleProfitSettingChange('maintenance', 'adminWallet', value)} adornment="%" />
                                        <NumberInput label="Thuế VAT" value={settings.profitSettings.maintenance.vat || 10} onChange={value => handleProfitSettingChange('maintenance', 'vat', value)} adornment="%" />
                                        <NumberInput label="Thuế TNDN" value={settings.profitSettings.maintenance.corporateTax || 3} onChange={value => handleProfitSettingChange('maintenance', 'corporateTax', value)} adornment="%" />
                                        <NumberInput label="Quỹ Leader" value={settings.profitSettings.maintenance.leaderBonusFund || 0} onChange={value => handleProfitSettingChange('maintenance', 'leaderBonusFund', value)} adornment="%" />
                                        <NumberInput label="Quỹ Hỗ Trợ" value={settings.profitSettings.maintenance.supportFund} onChange={value => handleProfitSettingChange('maintenance', 'supportFund', value)} adornment="%" />
                                    </div>
                                    <div className="mt-2 text-[10px] text-slate-500 italic">Số % còn lại ({100 - (settings.profitSettings.maintenance.adminWallet + (settings.profitSettings.maintenance.vat || 10) + (settings.profitSettings.maintenance.corporateTax || 3) + settings.profitSettings.maintenance.leaderBonusFund + settings.profitSettings.maintenance.supportFund)}%) sẽ dùng để chi trả Chiết khấu Hệ thống.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {canEdit && (
                <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={() => setSettings(initialSettings)} disabled={!isDirty || isSaving} className="px-6 py-2.5 text-sm font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        Hủy
                    </button>
                    <button onClick={handleSave} disabled={!isDirty || isSaving} className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed">
                        {isSaving ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <CheckIcon className="h-5 w-5" />}
                        {isSaving ? 'Đang lưu...' : 'Lưu Thay đổi'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default FeesAndCommissionsPage;
