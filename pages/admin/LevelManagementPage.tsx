
import React, { useState, useEffect, useMemo } from 'react';
import { useSettings } from '../../features/settings/useSettings';
import { useActions } from '../../features/actions/useActions';
import { SystemSettings, LevelSetting } from '../../features/settings/types';
import Modal from '../../components/Modal';
import { PencilSquareIcon, TrashIcon, PlusIcon, TrophyIcon, XCircleIcon, BanknotesIcon, InformationCircleIcon, SparklesIcon, Cog6ToothIcon } from '../../components/Icons';
import FormattedNumberInput from '../../components/FormattedNumberInput';
import { isEqual } from 'lodash-es';
import { useFinance } from '../../features/finance/useFinance';
import { useUser } from '../../features/users/useUser';
import { AdminManagedUser, UserStatus } from '../../features/users/types';
import { FundType, TransactionType } from '../../features/finance/types';
import { useToast } from '../../components/ToastProvider';
import Pagination from '../../components/Pagination';

const EditLevelModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (level: LevelSetting) => void;
    level: Partial<LevelSetting> | null;
}> = ({ isOpen, onClose, onSave, level }) => {
    const [formData, setFormData] = useState<Partial<LevelSetting>>({});
    const [percentInput, setPercentInput] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            const initialData = level || { name: '', requiredGroupRevenue: 0, rewardPercentage: 0, honorAward: '', branchRequirements: [], f1Requirement: 0 };
            setFormData(initialData);
            setPercentInput((initialData.rewardPercentage || 0).toString().replace('.', ','));
        }
    }, [isOpen, level]);

    const calculateBonus = (earnings: number, percentage: number) => {
        return Math.floor(earnings * (percentage / 100));
    };

    const handleSave = () => {
        if (formData.name && (formData.requiredGroupRevenue || 0) >= 0) {
            onSave({
                ...formData,
                honorAward: formData.honorAward || '',
                rewardPercentage: formData.rewardPercentage || 0,
            } as LevelSetting);
        }
    };

    const addBranchRequirement = () => {
        setFormData(p => ({
            ...p,
            branchRequirements: [...(p.branchRequirements || []), { targetLevel: 1, count: 1 }]
        }));
    };

    const updateBranchReq = (index: number, key: keyof LevelSetting['branchRequirements'][0], value: number) => {
        setFormData(p => {
            const reqs = [...(p.branchRequirements || [])];
            reqs[index] = { ...reqs[index], [key]: value };
            return { ...p, branchRequirements: reqs };
        });
    };

    const removeBranchReq = (index: number) => {
        setFormData(p => ({
            ...p,
            branchRequirements: (p.branchRequirements || []).filter((_, i) => i !== index)
        }));
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={level?.level ? "Chỉnh sửa Cấp bậc" : "Thêm Cấp bậc mới"}
            confirmText="Lưu"
            onConfirm={handleSave}
            isConfirmDisabled={!formData.name}
        >
            <div className="space-y-6">
                {/* 1. Tên Cấp bậc */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        1. Tên Cấp bậc
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Ví dụ: Cấp 1 - Đồng..."
                            value={formData.name || ''}
                            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white pr-10 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                         {formData.name && (
                            <button type="button" onClick={() => setFormData(p => ({ ...p, name: '' }))} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                                <XCircleIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    {/* 2. Doanh thu Yêu cầu */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            2. Doanh số Nhóm
                        </label>
                        <div className="relative">
                            <FormattedNumberInput
                                value={formData.requiredGroupRevenue || 0}
                                onChange={(value) => {
                                    setFormData(p => ({ ...p, requiredGroupRevenue: value }));
                                }}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white pr-8 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                             <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500 font-medium">đ</div>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Mức doanh số nhóm cần đạt để thăng cấp.</p>
                    </div>

                    {/* 3. Tỷ lệ thưởng */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            3. Đồng chia Quỹ Leader
                        </label>
                        <div className="relative">
                             <FormattedNumberInput
                                value={formData.rewardPercentage || 0}
                                onChange={(percentage) => {
                                    setFormData(p => ({ 
                                        ...p, 
                                        rewardPercentage: percentage 
                                    }));
                                }}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white pr-8 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="0,0"
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500 font-medium">%</div>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Phần trăm nhận được từ Bể Quỹ Leader.</p>
                    </div>
                </div>

                {/* 4. Thưởng vinh danh (Tùy chọn) */}
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-xl p-4">
                    <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2">
                        4. Thưởng vinh danh
                    </label>
                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={formData.honorAward || ''}
                                    placeholder="Ví dụ: Thưởng nóng 2tr... hoặc Chuyến du lịch..."
                                    onChange={(e) => setFormData(p => ({ ...p, honorAward: e.target.value }))}
                                    className="block w-full px-3 py-2 border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. Điều kiện F1 */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        5. Nhánh F1 tham gia gói bất kỳ
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            min="0"
                            value={formData.f1Requirement || 0}
                            onChange={(e) => setFormData(p => ({ ...p, f1Requirement: parseInt(e.target.value) || 0 }))}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white pr-8 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Số lượng người do F1 trực tiếp giới thiệu tham gia mảng.</p>
                </div>

                {/* 6. Điều kiện nhánh */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                            6. Điều kiện tuyến dưới
                        </label>
                        <button 
                            type="button" 
                            onClick={addBranchRequirement} 
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                        >
                            <PlusIcon className="h-3.5 w-3.5"/> Thêm điều kiện
                        </button>
                    </div>
                    {(!formData.branchRequirements || formData.branchRequirements.length === 0) ? (
                        <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 italic">Chưa có điều kiện về cấp độ cấp dưới.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {formData.branchRequirements.map((req, index) => (
                                <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg group animate-in fade-in slide-in-from-top-1">
                                    <span className="text-sm font-medium text-slate-500">Cần</span>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        value={req.count} 
                                        onChange={e => updateBranchReq(index, 'count', parseInt(e.target.value))} 
                                        className="w-16 px-2 py-1.5 text-sm font-bold text-center border border-slate-300 rounded-md bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    />
                                    <span className="text-sm font-medium text-slate-500">nhánh đạt Cấp</span>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        value={req.targetLevel} 
                                        onChange={e => updateBranchReq(index, 'targetLevel', parseInt(e.target.value))} 
                                        className="w-16 px-2 py-1.5 text-sm font-bold text-center border border-slate-300 rounded-md bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => removeBranchReq(index)} 
                                        className="text-slate-400 hover:text-red-500 transition-colors ml-auto"
                                    >
                                        <XCircleIcon className="h-6 w-6"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

const LevelManagementPage: React.FC = () => {
    const { settingsState } = useSettings();
    const { handleUpdateSystemSettings, handleProcessLeaderFundPayout } = useActions();
    const { financeState: { fundStatus, allTransactions } } = useFinance();
    const { userState: { allUsers: users } } = useUser();
    const { addToast } = useToast();

    const [levels, setLevels] = useState<LevelSetting[]>(settingsState.systemSettings.levelSettings);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLevel, setEditingLevel] = useState<Partial<LevelSetting> | null>(null);
    const [deletingLevel, setDeletingLevel] = useState<LevelSetting | null>(null);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isConfirmPayoutOpen, setIsConfirmPayoutOpen] = useState(false);
    
    const [activePayoutTab, setActivePayoutTab] = useState<number>(0);
    const [selectedHistory, setSelectedHistory] = useState<FundTransaction | null>(null);
    const [pageTab, setPageTab] = useState<'payout' | 'levels'>('payout');
    
    // Filters for history
    const [searchQuery, setSearchQuery] = useState('');
    const [monthFilter, setMonthFilter] = useState('');

    // Auto Payout Settings State
    const [autoPayoutSettings, setAutoPayoutSettings] = useState({
        enabled: settingsState.systemSettings.profitSettings?.leaderFundAutoPayout || false,
        day: settingsState.systemSettings.profitSettings?.leaderFundPayoutDay || 1
    });

    useEffect(() => {
        setLevels(settingsState.systemSettings.levelSettings);
        setAutoPayoutSettings({
            enabled: settingsState.systemSettings.profitSettings?.leaderFundAutoPayout || false,
            day: settingsState.systemSettings.profitSettings?.leaderFundPayoutDay || 1
        });
    }, [settingsState.systemSettings]);

    // Calculate Leader Payouts
    const leaderFund = fundStatus[FundType.LeaderBonus];
    const { poolData, totalPoolValue, totalFixedValue } = useMemo(() => {
        const flattenUsers = (list: AdminManagedUser[]): AdminManagedUser[] => list.flatMap(u => [u, ...(u.children ? flattenUsers(u.children) : [])]);
        const allFlatUsers = flattenUsers(users);
        const { levelSettings } = settingsState.systemSettings;

        const totalFixed = 0; 
        const remainingBalance = leaderFund.balance - totalFixed;
        
        const pools = levelSettings.filter(l => (l.rewardPercentage || 0) > 0).map(lvl => {
            const usersInLevel = allFlatUsers.filter(u => u.status === UserStatus.Active && u.rankLevel === lvl.level);
            return {
                level: lvl.level,
                name: lvl.name,
                rewardPercentage: lvl.rewardPercentage || 0,
                usersCount: usersInLevel.length,
                users: usersInLevel
            };
        });

        const totalRewardPercentage = pools.reduce((sum, p) => sum + p.rewardPercentage, 0);
        
        let poolValue = 0;
        const pData = pools.map(pool => {
            let poolAmount = 0;
            let payoutPerUser = 0;
            if (totalRewardPercentage > 0 && remainingBalance > 0) {
                poolAmount = Math.floor(remainingBalance * (pool.rewardPercentage / totalRewardPercentage));
                if (pool.usersCount > 0) {
                    payoutPerUser = Math.floor(poolAmount / pool.usersCount);
                }
            }
            poolValue += (payoutPerUser * pool.usersCount);
            return { ...pool, poolAmount, payoutPerUser, availablePool: poolAmount };
        });

        return { poolData: pData, totalPoolValue: poolValue, totalFixedValue: totalFixed };
    }, [users, settingsState.systemSettings.levelSettings, leaderFund.balance]);

    const handleSaveAutoSettings = () => {
        handleUpdateSystemSettings({
            ...settingsState.systemSettings,
            profitSettings: {
                ...settingsState.systemSettings.profitSettings,
                leaderFundAutoPayout: autoPayoutSettings.enabled,
                leaderFundPayoutDay: autoPayoutSettings.day
            }
        } as SystemSettings);
        addToast("Đã cập nhật cài đặt chi trả", "success");
        setIsSettingsModalOpen(false);
    };

    const handleProcessManualPayout = () => {
        if (totalPoolValue <= 0) {
            addToast("Không có chi trả nào đợt này", "info");
            return;
        }

        const payoutData: any[] = [];
        poolData.forEach(pool => {
            if (pool.payoutPerUser > 0) {
                pool.users.forEach(u => {
                    payoutData.push({
                        userId: u.id,
                        user: { name: u.name, avatar: u.avatar },
                        amount: pool.payoutPerUser,
                        reason: `Đồng chia Quỹ (Danh hiệu ${pool.name})`,
                        metadata: { leaderBonus: { isFixed: false, level: pool.level } }
                    });
                });
            }
        });

        const prevMonthDate = new Date();
        prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
        const periodStr = `Tháng ${prevMonthDate.getMonth() + 1}/${prevMonthDate.getFullYear()}`;
        
        handleProcessLeaderFundPayout(payoutData, `Chi thưởng Leader - Đợt ${periodStr}`);
        addToast("Đã thực hiện chi trả thành công", "success");
        setIsConfirmPayoutOpen(false);
    };

    // History from FundTransactions (Batches)
    const { financeState: { fundTransactions } } = useFinance();
    const [historyPage, setHistoryPage] = useState(1);
    const historyPageSize = 10;
    
    const leaderHistories = useMemo(() => {
        // Lấy các giao dịch outflow từ LeaderBonus
        let list = fundTransactions.filter(ft => ft.fund === FundType.LeaderBonus && ft.type === 'outflow');
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            list = list.filter(h => h.description.toLowerCase().includes(query));
        }
        
        if (monthFilter) {
            // monthFilter is "YYYY-MM"
            list = list.filter(h => h.date.startsWith(monthFilter));
        }

        return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [fundTransactions, searchQuery, monthFilter]);

    const totalHistoryPages = Math.ceil(leaderHistories.length / historyPageSize);
    const paginatedHistories = leaderHistories.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize);

    const handleSave = (levelToSave: LevelSetting) => {
        let newLevels;
        if (levelToSave.level) {
            newLevels = levels.map(l => l.level === levelToSave.level ? levelToSave : l);
        } else {
            const newLevelNumber = levels.length > 0 ? Math.max(...levels.map(l => l.level)) + 1 : 1;
            newLevels = [...levels, { ...levelToSave, level: newLevelNumber }];
        }
        
        newLevels.sort((a, b) => (a.requiredGroupRevenue || a.requiredEarnings || 0) - (b.requiredGroupRevenue || b.requiredEarnings || 0));
        const finalLevels = newLevels.map((level, index) => ({ ...level, level: index + 1 }));

        handleUpdateSystemSettings({ ...settingsState.systemSettings, levelSettings: finalLevels });
        setIsModalOpen(false);
    };

    const handleDelete = () => {
        if (deletingLevel) {
            let newLevels = levels.filter(l => l.level !== deletingLevel.level);
            newLevels = newLevels.map((level, index) => ({ ...level, level: index + 1 }));
            handleUpdateSystemSettings({ ...settingsState.systemSettings, levelSettings: newLevels });
            setDeletingLevel(null);
        }
    };
    
    return (
        <div className="space-y-6">
            {isSettingsModalOpen && (
                <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="Cài đặt Chi trả LeaderFund" onConfirm={handleSaveAutoSettings} confirmText="Lưu thiết lập">
                    <div className="space-y-4">
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                            <input type="checkbox" checked={autoPayoutSettings.enabled} onChange={e => setAutoPayoutSettings(p => ({ ...p, enabled: e.target.checked }))} className="w-5 h-5 text-indigo-600 rounded" />
                            <div>
                                <p className="font-bold">Chi trả Tự động</p>
                                <p className="text-xs text-slate-500">Hệ thống sẽ tự động tổng kết và chi trả</p>
                            </div>
                        </label>
                        {autoPayoutSettings.enabled && (
                            <div>
                                <label className="block text-sm font-semibold mb-1">Ngày chi trả (Hàng tháng)</label>
                                <input type="number" min="1" max="28" value={autoPayoutSettings.day} onChange={e => setAutoPayoutSettings(p => ({ ...p, day: parseInt(e.target.value) || 1 }))} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800" />
                                <p className="text-xs text-slate-500 mt-1">Giờ chi trả tự động là 00:00 của ngày được chọn. Kỳ thanh toán luôn tính cho số liệu của tháng trước đó.</p>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {isConfirmPayoutOpen && (
                <Modal 
                    isOpen={isConfirmPayoutOpen} 
                    onClose={() => setIsConfirmPayoutOpen(false)} 
                    title="Xác nhận Chi trả Đồng chia Quỹ" 
                    onConfirm={handleProcessManualPayout} 
                    confirmText="Xác nhận Chi trả"
                    size="4xl"
                >
                    <div className="space-y-4">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <InformationCircleIcon className="w-5 h-5 text-indigo-500" />
                                <span className="text-sm text-indigo-800 dark:text-indigo-200 font-medium">Chọn các Tab để kiểm tra danh sách thành viên đủ điều kiện</span>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Quỹ hiện tại</p>
                                <p className="text-sm font-black text-indigo-600">{leaderFund.balance.toLocaleString()}đ</p>
                            </div>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex border-b border-slate-200 dark:border-slate-700">
                            {poolData.map((pool, idx) => (
                                <button
                                    key={pool.level}
                                    onClick={() => setActivePayoutTab(idx)}
                                    className={`px-4 py-2 text-xs font-bold transition-all border-b-2 -mb-[2px] ${
                                        activePayoutTab === idx 
                                        ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10" 
                                        : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    }`}
                                >
                                    Cấp {pool.level} ({pool.usersCount})
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="min-h-[300px] max-h-[50vh] overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
                            {poolData[activePayoutTab] && (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    <div className="p-3 bg-white dark:bg-slate-800 flex justify-between items-center sticky top-0 z-10 shadow-sm border-b dark:border-slate-700">
                                        <div>
                                            <h4 className="font-black text-slate-700 dark:text-slate-200 text-sm uppercase">{poolData[activePayoutTab].name}</h4>
                                            <p className="text-[10px] text-slate-500">Tỷ lệ cộng hưởng: {poolData[activePayoutTab].rewardPercentage}%</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-500 uppercase italic">Thực nhận mỗi người</p>
                                            <p className="text-sm font-black text-emerald-600">+{poolData[activePayoutTab].payoutPerUser.toLocaleString()}đ</p>
                                        </div>
                                    </div>
                                    
                                    {poolData[activePayoutTab].usersCount > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-100 dark:bg-slate-800">
                                            {poolData[activePayoutTab].users.map(u => (
                                                <div key={u.id} className="px-4 py-3 flex justify-between items-center bg-white dark:bg-slate-900">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <img src={u.avatar} alt="" className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-700 shadow-sm" />
                                                            <div className="absolute -bottom-1 -right-1 bg-indigo-500 text-[8px] text-white px-1 rounded-full border border-white">L{u.rankLevel}</div>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{u.name}</p>
                                                            <p className="text-[10px] text-slate-500">ID: {u.id.substring(0, 8)}...</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">+{poolData[activePayoutTab].payoutPerUser.toLocaleString()}đ</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-20 text-center">
                                            <TrophyIcon className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                                            <p className="text-sm text-slate-400 italic">Chưa có thành viên nào đạt cấp độ này</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Summary Footer Area */}
                        <div className="mt-2 p-4 bg-slate-900 dark:bg-black rounded-xl text-white shadow-lg overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <BanknotesIcon className="w-20 h-20 rotate-12" />
                            </div>
                            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Tổng quan đợt chi trả</p>
                                    <div className="flex gap-6">
                                        <div>
                                            <p className="text-lg font-black leading-tight">{poolData.reduce((s, p) => s + p.usersCount, 0)}</p>
                                            <p className="text-[10px] text-slate-500 uppercase">Thành viên</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-black leading-tight">{poolData.filter(p => p.usersCount > 0).length}</p>
                                            <p className="text-[10px] text-slate-500 uppercase">Cấp độ hưởng</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center sm:text-right">
                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Tổng cộng tiền chi</p>
                                    <p className="text-3xl font-black text-amber-400 drop-shadow-sm truncate">
                                        {totalPoolValue.toLocaleString()}<span className="text-lg ml-1">VND</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {isModalOpen && <EditLevelModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} level={editingLevel} />}
            {deletingLevel && (
                <Modal isOpen={!!deletingLevel} onClose={() => setDeletingLevel(null)} title="Xác nhận Xóa" confirmText="Xóa" onConfirm={handleDelete} confirmButtonVariant="danger">
                    <p>Bạn có chắc muốn xóa cấp bậc "{deletingLevel.name}"?</p>
                </Modal>
            )}

            <div className="flex flex-col gap-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Quản lý Cấp bậc & Thưởng thăng cấp</h2>
                
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shadow-sm w-full sm:w-auto">
                        <button
                            onClick={() => setPageTab('payout')}
                            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition-all ${pageTab === 'payout' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Quản lý Chi trả
                        </button>
                        <button
                            onClick={() => setPageTab('levels')}
                            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition-all ${pageTab === 'levels' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Quản lý Cấp bậc
                        </button>
                    </div>

                    <div className="w-full sm:w-auto flex justify-end">
                        {pageTab === 'payout' ? (
                            <button 
                                onClick={() => setIsSettingsModalOpen(true)} 
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all active:scale-95"
                            >
                                <Cog6ToothIcon className="h-5 w-5 text-slate-500" /> 
                                <span className="hidden sm:inline">Cài đặt Chi trả</span>
                            </button>
                        ) : (
                            <button 
                                onClick={() => { setEditingLevel(null); setIsModalOpen(true); }} 
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-md transition-all active:scale-95"
                            >
                                <PlusIcon className="h-5 w-5" /> 
                                <span className="hidden sm:inline">Thêm Cấp bậc</span>
                                <span className="sm:hidden">Thêm</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {pageTab === 'payout' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Dashboard Pools */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {poolData.map((p) => (
                    <div key={p.level} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 shadow-sm transition-all hover:shadow-md h-full flex flex-col justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1 justify-between mb-2 whitespace-nowrap">
                                <span className="truncate max-w-[70%]">L{p.level} - {p.name}</span>
                                <span className="text-orange-500 shrink-0">{p.rewardPercentage}%</span>
                            </p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 tracking-tight">{p.availablePool.toLocaleString()}đ</p>
                        </div>
                        <div>
                            <hr className="my-2 border-slate-100 dark:border-slate-700" />
                            <div className="flex justify-between text-[11px] items-center">
                                <span className="text-slate-500">Đạt: <span className="font-bold text-slate-700 dark:text-slate-300">{p.usersCount}</span></span>
                                <span className="text-slate-500 ml-1">Nhận: <span className="font-bold text-emerald-600 truncate">+{p.payoutPerUser > 0 ? p.payoutPerUser.toLocaleString() : '0'}đ</span></span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-start gap-3">
                    <TrophyIcon className="h-6 w-6 text-indigo-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-bold text-indigo-900 dark:text-indigo-100">Chi trả Thưởng Leader Kỳ này</p>
                        <p className="text-sm text-indigo-700 dark:text-indigo-300">Tổng quỹ hiện tại: <strong className="text-indigo-800 dark:text-indigo-200">{leaderFund.balance.toLocaleString()}đ</strong>. Chế độ chi trả: <strong>{autoPayoutSettings.enabled ? `Tự động (Ngày ${autoPayoutSettings.day})` : 'Thủ công'}</strong></p>
                    </div>
                </div>
                <button
                    onClick={() => setIsConfirmPayoutOpen(true)}
                    disabled={totalPoolValue <= 0}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-lg whitespace-nowrap shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all flex items-center gap-2"
                >
                    <BanknotesIcon className="w-5 h-5" /> Thực hiện Chi trả
                </button>
            </div>
            
            {/* Lịch sử chi trả */}
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6 mt-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Lịch sử Chi trả Đồng chia</h3>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <input 
                                type="text" 
                                placeholder="Tìm theo nội dung..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <input 
                            type="month" 
                            value={monthFilter}
                            onChange={e => setMonthFilter(e.target.value)}
                            className="px-3 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                         <thead className="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-6 py-3">Kỳ / Tên Giao dịch</th>
                                <th className="px-6 py-3">Ngày T.hiện</th>
                                <th className="px-6 py-3">Chi tiết</th>
                                <th className="px-6 py-3 text-right">Tổng Chi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedHistories.length > 0 ? paginatedHistories.map((h, i) => (
                                <tr key={i} className="border-b border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-50/20 transition-colors">
                                    <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">{h.description}</td>
                                    <td className="px-6 py-4">{h.date}</td>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={() => setSelectedHistory(h)}
                                            className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                                        >
                                            <InformationCircleIcon className="w-4 h-4" /> Xem chi tiết
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-red-500">{Math.abs(h.amount).toLocaleString()}đ</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500 italic">Không tìm thấy dữ liệu phù hợp.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalHistoryPages > 1 && (
                    <div className="mt-4 flex justify-end">
                        <Pagination currentPage={historyPage} totalPages={totalHistoryPages} onPageChange={setHistoryPage} />
                    </div>
                )}
            </div>
            </div>
            )}

            {pageTab === 'levels' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Cấp bậc & Huy hiệu</th>
                                <th scope="col" className="px-6 py-3 text-right">Doanh số Nhóm (Tích luỹ)</th>
                                <th scope="col" className="px-6 py-3 text-right">Điều kiện Tuyến dưới</th>
                                <th scope="col" className="px-6 py-3 text-right">Đồng chia Quỹ Leader</th>
                                <th scope="col" className="px-6 py-3 text-right">Thưởng Vinh danh</th>
                                <th scope="col" className="px-6 py-3 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {levels.map(level => (
                                <tr key={level.level} className="border-b border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-50/30 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 font-bold text-xs">
                                                L{level.level}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wide">{level.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="font-bold text-indigo-600 dark:text-indigo-400">
                                            {(level.requiredGroupRevenue || level.requiredEarnings || 0) === 0 
                                                ? 'Mặc định' 
                                                : `${(level.requiredGroupRevenue || level.requiredEarnings || 0).toLocaleString('vi-VN')}đ`}
                                        </div>
                                        {(level.requiredGroupRevenue || level.requiredEarnings || 0) >= 1000000000 && (
                                            <div className="text-[10px] text-slate-400 uppercase font-medium">
                                                {`(${(level.requiredGroupRevenue || level.requiredEarnings || 0) / 1000000000} Tỷ đồng)`}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            {level.f1Requirement ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-50 dark:bg-sky-900/20 rounded text-[10px] font-bold text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                                                    {level.f1Requirement} F1 tham gia
                                                </span>
                                            ) : null}
                                            {level.branchRequirements && level.branchRequirements.length > 0 ? (
                                                level.branchRequirements.map((r, i) => (
                                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                                        <SparklesIcon className="h-2.5 w-2.5 text-amber-500" />
                                                        {r.count}x Nhánh L{r.targetLevel}
                                                    </span>
                                                ))
                                            ) : (
                                                !level.f1Requirement ? <span className="text-slate-400 italic text-xs">Không yêu cầu</span> : null
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full font-bold">
                                            <TrophyIcon className="h-3.5 w-3.5" />
                                            {level.rewardPercentage || 0}%
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {level.honorAward ? (
                                            <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                                {level.honorAward}
                                            </div>
                                        ) : (
                                            <span className="text-slate-300">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <button 
                                                onClick={() => { setEditingLevel(level); setIsModalOpen(true); }} 
                                                className="p-2 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-all"
                                                title="Sửa cấp bậc"
                                            >
                                                <PencilSquareIcon className="h-5 w-5"/>
                                            </button>
                                            <button 
                                                onClick={() => setDeletingLevel(level)} 
                                                className="p-2 text-red-600 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-all"
                                                title="Xóa cấp bậc"
                                            >
                                                <TrashIcon className="h-5 w-5"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {levels.length === 0 && (
                        <div className="text-center py-16 text-slate-500">
                            <TrophyIcon className="h-12 w-12 mx-auto text-slate-400 mb-2" />
                            <p className="font-semibold">Chưa có cấp bậc nào.</p>
                            <p className="text-sm mt-1">Bấm "Thêm Cấp bậc" để tạo hệ thống thăng hạng.</p>
                        </div>
                    )}
                </div>
            </div>
            </div>
            )}

            {selectedHistory && (
                <Modal 
                    isOpen={!!selectedHistory} 
                    onClose={() => setSelectedHistory(null)} 
                    title={`Chi tiết: ${selectedHistory.description}`} 
                    size="3xl"
                >
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <p className="text-[10px] uppercase font-bold text-slate-500">Ngày thực hiện</p>
                                <p className="text-sm font-medium">{selectedHistory.date}</p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <p className="text-[10px] uppercase font-bold text-slate-500">Tổng chi thưởng</p>
                                <p className="text-sm font-black text-red-500">{Math.abs(selectedHistory.amount).toLocaleString()}đ</p>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold uppercase text-slate-500 mb-3">Danh sách thành viên nhận thưởng</h4>
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg max-h-[400px] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Thành viên</th>
                                            <th className="px-4 py-2 text-left">Lý do / Cấp độ</th>
                                            <th className="px-4 py-2 text-right">Số tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {selectedHistory.metadata?.users?.map((u: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <img src={u.user.avatar} className="w-6 h-6 rounded-full" alt="" />
                                                        <span className="font-medium text-xs">{u.user.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-500">{u.reason}</td>
                                                <td className="px-4 py-3 text-right font-bold text-emerald-600">+{u.payoutAmount.toLocaleString()}đ</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default LevelManagementPage;
