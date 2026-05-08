
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SystemSettings, Achievement, AchievementMetric } from '../../features/settings/types';
import Modal from '../../components/Modal';
import { useToast } from '../../components/ToastProvider';
import { 
    PencilSquareIcon, TrashIcon, PlusIcon, XCircleIcon, UserGroupIcon, CurrencyDollarIcon, 
    UsersIcon, TrophyIcon, BanknotesIcon, ArrowTrendingUpIcon, ArrowUpTrayIcon,
    TableCellsIcon, SparklesIcon, CrownIcon, InformationCircleIcon, CheckCircleIcon,
    ArrowRightIcon, ExclamationTriangleIcon, LifebuoyIcon, BanknotesIcon as FundIcon
} from '../../components/Icons';
import { useActions } from '../../features/actions/useActions';
import { useSettings } from '../../features/settings/useSettings';
import { useUser } from '../../features/users/useUser';
import { useFinance } from '../../features/finance/useFinance';
import { FundType } from '../../features/finance/types';
import { AdminManagedUser } from '../../features/users/types';
import FormattedNumberInput from '../../components/FormattedNumberInput';

const achievementIcons: { name: string, component: React.FC<{ className?: string }> }[] = [
    { name: 'UserGroupIcon', component: UserGroupIcon },
    { name: 'CurrencyDollarIcon', component: CurrencyDollarIcon },
    { name: 'UsersIcon', component: UsersIcon },
    { name: 'TrophyIcon', component: TrophyIcon },
    { name: 'BanknotesIcon', component: BanknotesIcon },
    { name: 'ArrowTrendingUpIcon', component: ArrowTrendingUpIcon },
];

const metricLabels: Record<AchievementMetric, string> = {
    [AchievementMetric.F1Count]: 'Số lượng F1',
    [AchievementMetric.NetworkSize]: 'Quy mô Mạng lưới',
    [AchievementMetric.TotalEarnings]: 'Tổng Thu nhập',
};

// --- Modals ---
const AchievementModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (achievement: Achievement) => void;
    achievement: Partial<Achievement> | null;
}> = ({ isOpen, onClose, onSave, achievement }) => {
    const [formData, setFormData] = useState<Partial<Achievement>>({});
    const iconFileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setFormData(achievement || { 
                icon: 'TrophyIcon', 
                weight: 1, 
                bonusAmount: 0,
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                rule: { metric: AchievementMetric.F1Count, target: 1 },
                isActive: true
            });
        }
    }, [isOpen, achievement]);
    
    const handleSave = () => {
        if (formData.name && formData.description && (formData.icon || formData.customIconUrl) && formData.rule?.metric && formData.rule.target > 0) {
            onSave(formData as Achievement);
        }
    };
    
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setFormData(p => ({ ...p, customIconUrl: event.target?.result as string }));
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
        if (e.target) e.target.value = '';
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={achievement?.id ? "Chỉnh sửa Sự kiện" : "Thêm Sự kiện mới"}
            confirmText="Lưu"
            onConfirm={handleSave}
            size="2xl"
        >
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative group">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tên Sự kiện</label>
                        <input type="text" placeholder="Ví dụ: Đua top tuyển dụng tháng 5" value={formData.name || ''} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="block w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 pr-10" />
                        {formData.name && (
                            <button
                                type="button"
                                onClick={() => setFormData(p => ({...p, name: ''}))}
                                className="absolute inset-y-0 right-0 top-6 flex items-center pr-3 text-slate-400 hover:text-slate-600 opacity-0 group-focus-within:opacity-100 transition-opacity"
                            >
                                <XCircleIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Trạng thái</label>
                        <select 
                            value={formData.isActive ? 'active' : 'inactive'} 
                            onChange={e => setFormData(p => ({ ...p, isActive: e.target.value === 'active' }))}
                            className="block w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                        >
                            <option value="active">Đang kích hoạt</option>
                            <option value="inactive">Tạm ngưng</option>
                        </select>
                    </div>
                </div>

                 <div className="relative group">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nội dung diễn giải</label>
                    <textarea placeholder="Giải thích về sự kiện và cách thức tham gia..." value={formData.description || ''} onChange={e => setFormData(p => ({...p, description: e.target.value}))} rows={3} className="block w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 shadow-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Thời gian Bắt đầu</label>
                        <input type="date" value={formData.startDate || ''} onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))} className="block w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Thời gian Kết thúc</label>
                        <input type="date" value={formData.endDate || ''} onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))} className="block w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-600 space-y-3">
                        <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300">Banner / Icon Sự kiện</h5>
                        <input type="file" ref={iconFileInputRef} onChange={handleFileUpload} className="hidden" accept="image/png, image/jpeg, image/svg+xml" />
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 w-16 h-16">
                                {formData.customIconUrl ? <img src={formData.customIconUrl} alt="Custom Icon" className="object-contain h-full w-full p-1" /> : <span className="text-xs text-slate-500 uppercase font-bold">Preview</span>}
                            </div>
                            <div className="space-y-1">
                                <button type="button" onClick={() => iconFileInputRef.current?.click()} className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 px-3 py-1 rounded border border-indigo-200 transition-colors">
                                    <ArrowUpTrayIcon className="h-4 w-4" /> Tải ảnh lên
                                </button>
                                {formData.customIconUrl && <button type="button" onClick={() => setFormData(p => ({ ...p, customIconUrl: undefined }))} className="text-xs text-red-500 hover:underline block ml-1">Xóa ảnh</button>}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-600">
                        <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300">Hoặc chọn Icon Hệ thống</h5>
                        <div className="flex items-center gap-4 mt-3">
                             <label className="block text-sm flex-grow">
                                <select value={formData.icon || ''} onChange={e => setFormData(p => ({...p, icon: e.target.value}))} disabled={!!formData.customIconUrl} className="block w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <option value="" disabled>Chọn icon</option>
                                    {achievementIcons.map(icon => <option key={icon.name} value={icon.name}>{icon.name.replace('Icon', '')}</option>)}
                                </select>
                             </label>
                             <div className={`p-3 rounded-full mt-1 transition-opacity ${formData.customIconUrl ? 'bg-slate-200/50 dark:bg-slate-800/50 opacity-50' : 'bg-slate-200 dark:bg-slate-600'}`}>
                                {React.createElement(achievementIcons.find(i => i.name === formData.icon)?.component || TrophyIcon, { className: "h-6 w-6 text-slate-700 dark:text-slate-200" })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border border-indigo-100 dark:border-indigo-900/30 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/10">
                    <h4 className="font-bold text-sm mb-3 text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                        <SparklesIcon className="h-4 w-4" /> Điều kiện đạt giải & Phần thưởng
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loại điều kiện</label>
                            <select
                                value={formData.rule?.metric || ''}
                                onChange={e => setFormData(p => ({ ...p, rule: { ...p.rule, metric: e.target.value as AchievementMetric, target: p.rule?.target || 1 } }))}
                                className="block w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                            >
                                <option value="" disabled>Chọn chỉ số</option>
                                {Object.entries(metricLabels).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Số lượng mục tiêu</label>
                            <FormattedNumberInput
                                placeholder="VD: 1.000..."
                                value={formData.rule?.target || 0}
                                onChange={val => setFormData(p => ({ ...p, rule: { ...p.rule, metric: p.rule?.metric || AchievementMetric.F1Count, target: val } }))}
                                className="block w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tiền thưởng (VNĐ)</label>
                            <FormattedNumberInput
                                value={formData.bonusAmount || 0}
                                onChange={val => setFormData(p => ({ ...p, bonusAmount: val }))}
                                className="block w-full px-3 py-2 border rounded-md bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-bold"
                            />
                             <p className="text-[10px] text-slate-400 mt-1">Admin tự nhập số tiền thưởng</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Giới hạn người lĩnh</label>
                            <FormattedNumberInput
                                placeholder="Không giới hạn"
                                value={formData.winnerLimit || 0}
                                onChange={val => setFormData(p => ({ ...p, winnerLimit: val || undefined }))}
                                className="block w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                            />
                             <p className="text-[10px] text-slate-400 mt-1">VD: 50 người đầu tiên</p>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};


// --- Main Component ---
const AchievementManagementPage: React.FC = () => {
    const { settingsState } = useSettings();
    const { userState: { allUsers } } = useUser();
    const { financeState: { fundStatus } } = useFinance();
    const { 
        handleUpdateSystemSettings: onSave, 
        handleProcessLeaderFundPayout: onProcessPayout 
    } = useActions();
    const { addToast } = useToast();
    
    const latestSettingsRef = useRef(settingsState.systemSettings);
    useEffect(() => {
        latestSettingsRef.current = settingsState.systemSettings;
    }, [settingsState.systemSettings]);

    const achievements = settingsState.systemSettings.leaderAchievements;
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAchievement, setEditingAchievement] = useState<Partial<Achievement> | null>(null);
    const [deletingAchievement, setDeletingAchievement] = useState<Achievement | null>(null);

    // Winner Management State
    const [managingWinnersAchievement, setManagingWinnersAchievement] = useState<Achievement | null>(null);
    const [selectedFund, setSelectedFund] = useState<FundType>(FundType.Support);

    const flattenUsers = (list: AdminManagedUser[]): AdminManagedUser[] => 
        list.flatMap(u => [u, ...(u.children ? flattenUsers(u.children) : [])]);
    
    const allFlatUsers = useMemo(() => flattenUsers(allUsers), [allUsers]);

    const handleOpenModal = (achievement: Achievement | null = null) => {
        setEditingAchievement(achievement);
        setIsModalOpen(true);
    };

    const handleSave = (achievementToSave: Achievement) => {
        const currentAchievements = latestSettingsRef.current.leaderAchievements;
        let newAchievements;
        if (achievementToSave.id) {
            newAchievements = currentAchievements.map(a => a.id === achievementToSave.id ? achievementToSave : a);
        } else {
            newAchievements = [...currentAchievements, { ...achievementToSave, id: `ach_${Date.now()}`, claimedUserIds: [] }];
        }
        onSave({ ...latestSettingsRef.current, leaderAchievements: newAchievements });
        setIsModalOpen(false);
    };

    const handlePayout = (achievement: Achievement, winnersToPay: AdminManagedUser[]) => {
        if (!achievement.bonusAmount || achievement.bonusAmount <= 0) return;
        
        const totalAmount = winnersToPay.length * achievement.bonusAmount;
        const currentFundBalance = fundStatus[selectedFund].balance;

        if (currentFundBalance < totalAmount) {
            addToast(`Số dư ${selectedFund === FundType.Support ? 'Quỹ Hỗ Trợ' : 'Ví Admin'} không đủ để chi trả!`, "error");
            return;
        }

        const payoutData = winnersToPay.map(u => ({
            userId: u.id,
            user: { name: u.name, avatar: u.avatar },
            amount: achievement.bonusAmount!,
            reason: `Chi thưởng sự kiện: ${achievement.name}`,
            metadata: { 
                eventReward: { 
                    eventId: achievement.id,
                    targetReached: achievement.rule.target
                } 
            }
        }));

        // Reuse leader payout logic but we might need to customize the fund type if needed
        // For now the existing tool allows batch payout. We'll simulate the fund subtraction.
        // In a real app we'd have a specific `handleProcessEventPayout(fundType, data)`
        onProcessPayout(payoutData, `Chi thưởng Sự kiện: ${achievement.name} - ${winnersToPay.length} người nhận`, selectedFund);
        
        // Update claimed IDs
        const newClaimedIds = [...(achievement.claimedUserIds || []), ...winnersToPay.map(u => u.id)];
        const updatedAchievement = { ...achievement, claimedUserIds: newClaimedIds };
        
        const currentAchievements = latestSettingsRef.current.leaderAchievements;
        const newAchievements = currentAchievements.map(a => a.id === achievement.id ? updatedAchievement : a);
        onSave({ ...latestSettingsRef.current, leaderAchievements: newAchievements });
        
        setManagingWinnersAchievement(null);
        addToast(`Đã chi thưởng thành công cho ${winnersToPay.length} thành viên!`, "success");
    };

    const getQualifiedUsers = (ach: Achievement) => {
        return allFlatUsers.filter(u => {
            const val = u[ach.rule.metric] as number || 0;
            const reached = val >= ach.rule.target;
            const notClaimed = !(ach.claimedUserIds || []).includes(u.id);
            return reached && notClaimed;
        });
    };

    const handleDelete = () => {
        if(deletingAchievement) {
            const currentAchievements = latestSettingsRef.current.leaderAchievements;
            const newAchievements = currentAchievements.filter(a => a.id !== deletingAchievement.id);
            onSave({ ...latestSettingsRef.current, leaderAchievements: newAchievements });
            setDeletingAchievement(null);
        }
    };

    return (
        <div className="space-y-6">
            {isModalOpen && <AchievementModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} achievement={editingAchievement} />}
            
            {deletingAchievement && (
                <Modal isOpen={!!deletingAchievement} onClose={() => setDeletingAchievement(null)} title="Xác nhận Xóa" confirmText="Xóa" onConfirm={handleDelete} confirmButtonVariant="danger">
                    <p>Bạn có chắc muốn xóa thành tích "{deletingAchievement.name}"?</p>
                </Modal>
            )}

            {managingWinnersAchievement && (
                <WinnerManagementModal 
                    achievement={managingWinnersAchievement} 
                    qualifiedUsers={getQualifiedUsers(managingWinnersAchievement)}
                    fundStatus={fundStatus}
                    selectedFund={selectedFund}
                    setSelectedFund={setSelectedFund}
                    onClose={() => setManagingWinnersAchievement(null)}
                    onPay={(users) => handlePayout(managingWinnersAchievement, users)}
                />
            )}

            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Quản lý Sự kiện</h2>
                <button onClick={() => handleOpenModal()} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-md transition-all active:scale-95">
                    <PlusIcon className="h-5 w-5" /> Thêm Sự kiện Mới
                </button>
            </div>

            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <SparklesIcon className="h-5 w-5 text-indigo-500"/> Các Sự kiện đang thiết lập
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {achievements.map(ach => {
                        const Icon = achievementIcons.find(i => i.name === ach.icon)?.component || SparklesIcon;
                        const isExpired = ach.endDate && new Date(ach.endDate) < new Date();
                        const isStarting = ach.startDate && new Date(ach.startDate) > new Date();
                        
                        let statusBadge = null;
                        if (!ach.isActive) {
                            statusBadge = <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Tạm ngưng</span>;
                        } else if (isExpired) {
                            statusBadge = <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Hết hạn</span>;
                        } else if (isStarting) {
                            statusBadge = <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Sắp diễn ra</span>;
                        } else {
                            statusBadge = <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Đang diễn ra</span>;
                        }

                        return (
                            <div key={ach.id} className="group bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl flex flex-col border border-slate-200 dark:border-slate-700 h-full hover:shadow-md transition-shadow relative overflow-hidden">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-700">
                                            {ach.customIconUrl ? (
                                                <img src={ach.customIconUrl} alt={ach.name} className="h-10 w-10 object-contain" />
                                            ) : (
                                                <Icon className="h-7 w-7" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{ach.name}</h4>
                                                {statusBadge}
                                            </div>
                                            <p className="text-[11px] text-slate-500 font-medium">
                                                {ach.startDate ? new Date(ach.startDate).toLocaleDateString('vi-VN') : '...'} - {ach.endDate ? new Date(ach.endDate).toLocaleDateString('vi-VN') : '...'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleOpenModal(ach)} className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700"><PencilSquareIcon className="h-4 w-4" /></button>
                                        <button onClick={() => setDeletingAchievement(ach)} className="p-1.5 text-slate-500 hover:text-red-600 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700"><TrashIcon className="h-4 w-4" /></button>
                                    </div>
                                </div>

                                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed italic" title={ach.description}>
                                    "{ach.description}"
                                </p>
                                
                                <div className="mt-auto pt-3 border-t border-slate-200 dark:border-slate-700">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Giải ngân:</span>
                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                            {(ach.claimedUserIds?.length || 0)} / {ach.winnerLimit || '∞'} suất
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[10px] font-bold text-emerald-600 uppercase">Thưởng nóng:</span>
                                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                            {ach.bonusAmount?.toLocaleString('vi-VN')}đ
                                        </span>
                                    </div>

                                    <div className="pt-2">
                                        <button 
                                            onClick={() => setManagingWinnersAchievement(ach)}
                                            className="w-full py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2 hover:text-indigo-600 transition-colors group/btn"
                                        >
                                            <CheckCircleIcon className="h-4 w-4 text-slate-400 group-hover/btn:text-indigo-600" />
                                            Duyệt thưởng {getQualifiedUsers(ach).length > 0 && (
                                                <span className="h-4 w-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] animate-pulse">
                                                    {getQualifiedUsers(ach).length}
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {achievements.length === 0 && (
                        <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-900/20 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                            <SparklesIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">Chưa có sự kiện nào được tạo.</p>
                            <button onClick={() => handleOpenModal()} className="mt-4 text-indigo-600 font-bold hover:underline">Tạo sự kiện đầu tiên</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const WinnerManagementModal: React.FC<{
    achievement: Achievement;
    qualifiedUsers: AdminManagedUser[];
    fundStatus: any;
    selectedFund: FundType;
    setSelectedFund: (fund: FundType) => void;
    onClose: () => void;
    onPay: (users: AdminManagedUser[]) => void;
}> = ({ achievement, qualifiedUsers, fundStatus, selectedFund, setSelectedFund, onClose, onPay }) => {
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    
    useEffect(() => {
        // By default select all qualified users up to the remaining limit
        const limit = achievement.winnerLimit || 999999;
        const currentCount = achievement.claimedUserIds?.length || 0;
        const remaining = Math.max(0, limit - currentCount);
        
        setSelectedUsers(qualifiedUsers.slice(0, remaining).map(u => u.id));
    }, [qualifiedUsers, achievement]);

    const usersToPay = qualifiedUsers.filter(u => selectedUsers.includes(u.id));
    const totalAmount = usersToPay.length * (achievement.bonusAmount || 0);
    const fundBalance = fundStatus[selectedFund].balance;
    const isInsufficient = fundBalance < totalAmount;

    return (
        <Modal 
            isOpen={true} 
            onClose={onClose} 
            title={`Duyệt thưởng: ${achievement.name}`}
            confirmText={`Chi trả ${totalAmount.toLocaleString()}đ`}
            onConfirm={() => onPay(usersToPay)}
            confirmDisabled={selectedUsers.length === 0 || isInsufficient}
            size="2xl"
        >
            <div className="space-y-6">
                <div className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Chọn Nguồn Tiền</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button 
                                onClick={() => setSelectedFund(FundType.LeaderBonus)}
                                className={`p-3 rounded-lg border flex items-center gap-3 transition-all ${selectedFund === FundType.LeaderBonus ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                            >
                                <FundIcon className={`h-5 w-5 ${selectedFund === FundType.LeaderBonus ? 'text-indigo-200' : 'text-slate-400'}`} />
                                <div className="text-left">
                                    <p className="text-[10px] font-bold uppercase opacity-80">Quỹ Leader 5%</p>
                                    <p className="text-sm font-black">{fundStatus[FundType.LeaderBonus].balance.toLocaleString()}đ</p>
                                </div>
                            </button>
                            <button 
                                onClick={() => setSelectedFund(FundType.Support)}
                                className={`p-3 rounded-lg border flex items-center gap-3 transition-all ${selectedFund === FundType.Support ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                            >
                                <LifebuoyIcon className={`h-5 w-5 ${selectedFund === FundType.Support ? 'text-indigo-200' : 'text-slate-400'}`} />
                                <div className="text-left">
                                    <p className="text-[10px] font-bold uppercase opacity-80">Quỹ Hỗ Trợ 5%</p>
                                    <p className="text-sm font-black">{fundStatus[FundType.Support].balance.toLocaleString()}đ</p>
                                </div>
                            </button>
                            <button 
                                onClick={() => setSelectedFund(FundType.Admin)}
                                className={`p-3 rounded-lg border flex items-center gap-3 transition-all ${selectedFund === FundType.Admin ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                            >
                                <CurrencyDollarIcon className={`h-5 w-5 ${selectedFund === FundType.Admin ? 'text-indigo-200' : 'text-slate-400'}`} />
                                <div className="text-left">
                                    <p className="text-[10px] font-bold uppercase opacity-80">Ví Admin 10%</p>
                                    <p className="text-sm font-black">{fundStatus[FundType.Admin].balance.toLocaleString()}đ</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            Thành viên đủ điều kiện ({qualifiedUsers.length})
                        </h4>
                        <div className="text-[11px] text-slate-500 font-medium">
                            Giới hạn còn lại: <span className="font-bold text-slate-800 dark:text-slate-200">{Math.max(0, (achievement.winnerLimit || 999999) - (achievement.claimedUserIds?.length || 0))}</span>
                        </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                        {qualifiedUsers.length > 0 ? qualifiedUsers.map(user => (
                            <div key={user.id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedUsers.includes(user.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedUsers(p => [...p, user.id]);
                                            else setSelectedUsers(p => p.filter(id => id !== user.id));
                                        }}
                                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <img src={user.avatar} className="h-8 w-8 rounded-full border border-slate-200" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{user.name}</p>
                                        <p className="text-[10px] text-slate-500">ID: {user.id}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-emerald-600">+{achievement.bonusAmount?.toLocaleString()}đ</p>
                                    <p className="text-[10px] text-slate-400 capitalize">{metricLabels[achievement.rule.metric]}: {user[achievement.rule.metric]}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="p-8 text-center text-slate-400 italic">
                                <UsersIcon className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                Chưa có ai đạt mốc mới.
                            </div>
                        )}
                    </div>
                </div>

                {isInsufficient && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-red-700 dark:text-red-400">Số dư không đủ!</p>
                            <p className="text-xs text-red-600 dark:text-red-500">Bạn cần thêm {(totalAmount - fundBalance).toLocaleString()}đ để chi trả cho {selectedUsers.length} người này.</p>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default AchievementManagementPage;
