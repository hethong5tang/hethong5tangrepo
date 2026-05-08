
import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../../features/settings/useSettings';
import { useActions } from '../../features/actions/useActions';
import { LeaderboardMetric, LeaderboardSettings, LeaderboardTimeframe, SystemSettings, LeaderboardMockLeader } from '../../features/settings/types';
import { CheckIcon, ArrowPathIcon, PlusIcon, PencilSquareIcon, TrashIcon, ArrowUpTrayIcon, XCircleIcon } from '../../components/Icons';
import { isEqual } from 'lodash-es';
import Modal from '../../components/Modal';
import FormattedNumberInput from '../../components/FormattedNumberInput';

const metricLabels: Record<LeaderboardMetric, string> = {
    [LeaderboardMetric.F1Count]: 'Số F1 mới',
    /* Fixed: Changed NetworkSize to Network_size to match enum definition */
    [LeaderboardMetric.Network_size]: 'Tổng thành viên mới trong mạng lưới',
    [LeaderboardMetric.TotalEarnings]: 'Tổng thu nhập',
};

const timeframeLabels: Record<LeaderboardTimeframe, string> = {
    'monthly': 'Theo Tháng (reset hàng tháng)',
    'quarterly': 'Theo Quý (reset hàng quý)',
    'yearly': 'Theo Năm (reset hàng năm)',
    'all_time': 'Tất cả thời gian',
};

const EditMockLeaderModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (leader: LeaderboardMockLeader) => void;
    leader: Partial<LeaderboardMockLeader> | null;
    metric: LeaderboardMetric;
}> = ({ isOpen, onClose, onSave, leader, metric }) => {
    const [formData, setFormData] = useState<Partial<LeaderboardMockLeader>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setFormData(leader || { name: '', avatar: '', score: 0 });
    }, [leader]);

    const handleSave = () => {
        if (formData.name && formData.avatar && formData.score !== undefined) {
            onSave(formData as LeaderboardMockLeader);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setFormData(p => ({ ...p, avatar: event.target?.result as string }));
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
        if (e.target) e.target.value = '';
    };
    
    const scoreLabel = metricLabels[metric];
    const scoreUnit = metric === LeaderboardMetric.TotalEarnings ? 'VNĐ' : metric === LeaderboardMetric.F1Count ? 'F1' : 'TV';
    const isCurrency = metric === LeaderboardMetric.TotalEarnings;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={leader?.id ? "Chỉnh sửa Leader Mẫu" : "Thêm Leader Mẫu"} confirmText="Lưu" onConfirm={handleSave}>
            <div className="space-y-6">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                <div className="flex items-center gap-4">
                    <img src={formData.avatar || 'https://via.placeholder.com/100'} alt="Avatar Preview" className="h-16 w-16 rounded-full object-cover bg-slate-200" />
                    <div>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm font-medium text-indigo-600 hover:underline">Tải ảnh lên</button>
                        <p className="text-xs text-slate-500 mt-1">Hoặc dán link ảnh vào ô bên dưới.</p>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">URL ảnh đại diện</label>
                    <div className="relative mt-1">
                        <input type="text" placeholder="Dán link ảnh hoặc tải lên" value={formData.avatar || ''} onChange={e => setFormData(p => ({...p, avatar: e.target.value}))} className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500 pr-10" />
                        {formData.avatar && (
                            <button type="button" onClick={() => setFormData(p => ({...p, avatar: ''}))} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                                <XCircleIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tên Leader</label>
                    <div className="relative mt-1">
                        <input type="text" placeholder="Tên Leader" value={formData.name || ''} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500 pr-10" />
                        {formData.name && (
                            <button type="button" onClick={() => setFormData(p => ({...p, name: ''}))} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                                <XCircleIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{scoreLabel}</label>
                    <div className="relative mt-1">
                        <FormattedNumberInput
                            value={formData.score || 0}
                            onChange={(value) => setFormData(p => ({...p, score: value }))}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500 pr-16"
                        />
                         <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                            {scoreUnit}
                        </div>
                        {(formData.score || 0) > 0 && (
                             <button type="button" onClick={() => setFormData(p => ({...p, score: 0}))} className="absolute inset-y-0 right-10 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                                <XCircleIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const LeaderboardManagementPage: React.FC = () => {
    const { settingsState } = useSettings();
    const { handleUpdateSystemSettings } = useActions();
    
    const [settings, setSettings] = useState<SystemSettings>(settingsState.systemSettings);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLeader, setEditingLeader] = useState<Partial<LeaderboardMockLeader> | null>(null);

    useEffect(() => {
        setSettings(settingsState.systemSettings);
    }, [settingsState.systemSettings]);

    const isDirty = !isEqual(settings, settingsState.systemSettings);

    const handleSave = async () => {
        setIsSaving(true);
        await new Promise(res => setTimeout(res, 1000));
        handleUpdateSystemSettings(settings);
        setIsSaving(false);
    };

    const handleReset = () => {
        setSettings(settingsState.systemSettings);
    };
    
    const handleChange = (part: 'leaderboardSettings' | 'leaderboardMockData', field: string, value: any) => {
        setSettings(prev => ({
            ...prev,
            [part]: {
                ...prev[part],
                [field]: value,
            }
        }));
    };
    
    const handleSaveMockLeader = (leaderToSave: LeaderboardMockLeader) => {
        let newLeaders;
        if (leaderToSave.id) {
            newLeaders = settings.leaderboardMockData.leaders.map(l => l.id === leaderToSave.id ? leaderToSave : l);
        } else {
            newLeaders = [...settings.leaderboardMockData.leaders, { ...leaderToSave, id: `mock_${Date.now()}` }];
        }
        handleChange('leaderboardMockData', 'leaders', newLeaders.sort((a,b) => b.score - a.score));
        setIsModalOpen(false);
    };

    const handleDeleteMockLeader = (id: string) => {
        const newLeaders = settings.leaderboardMockData.leaders.filter(l => l.id !== id);
        handleChange('leaderboardMockData', 'leaders', newLeaders);
    };
    
    const formatScore = (score: number, metric: LeaderboardMetric) => {
        const formattedScore = score.toLocaleString('vi-VN');
        switch (metric) {
            case LeaderboardMetric.F1Count: return `${formattedScore} F1`;
            /* Fixed: Changed NetworkSize to Network_size */
            case LeaderboardMetric.Network_size: return `${formattedScore} TV`;
            case LeaderboardMetric.TotalEarnings: return `${formattedScore}đ`;
            default: return formattedScore;
        }
    };

    return (
        <div className="space-y-6">
            {isModalOpen && <EditMockLeaderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveMockLeader} leader={editingLeader} metric={settings.leaderboardMockData.metric} />}

            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Quản lý Bảng xếp hạng</h2>
            
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6 max-w-3xl">
                 <div className="flex items-center justify-between">
                   <span className="flex flex-grow flex-col">
                     <span className="text-sm font-medium leading-6 text-slate-900 dark:text-slate-200">Sử dụng Dữ liệu Mẫu</span>
                     <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Khi bật, BXH sẽ hiển thị dữ liệu mẫu do bạn tạo thay vì dữ liệu thật.</p>
                   </span>
                   <button
                     type="button"
                     onClick={() => setSettings(p => ({...p, useLeaderboardMockData: !p.useLeaderboardMockData}))}
                     className={`${settings.useLeaderboardMockData ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
                   >
                     <span className={`${settings.useLeaderboardMockData ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}/>
                   </button>
               </div>
            </div>

            {settings.useLeaderboardMockData ? (
                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6 max-w-3xl animate-fadeIn">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Cài đặt Bảng Xếp hạng Mẫu</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tiêu đề</label>
                            <div className="relative mt-1">
                                <input type="text" value={settings.leaderboardMockData.title} onChange={e => handleChange('leaderboardMockData', 'title', e.target.value)} className="block w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-indigo-500 focus:ring-indigo-500 pr-10" />
                                {settings.leaderboardMockData.title && (
                                    <button type="button" onClick={() => handleChange('leaderboardMockData', 'title', '')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                                        <XCircleIcon className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Mô tả</label>
                            <div className="relative mt-1">
                                <textarea value={settings.leaderboardMockData.description} onChange={e => handleChange('leaderboardMockData', 'description', e.target.value)} rows={2} className="block w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-indigo-500 focus:ring-indigo-500 pr-10" />
                                {settings.leaderboardMockData.description && (
                                    <button type="button" onClick={() => handleChange('leaderboardMockData', 'description', '')} className="absolute top-2 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                                        <XCircleIcon className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cơ cấu Tính điểm (Mẫu)</label>
                            <select value={settings.leaderboardMockData.metric} onChange={e => handleChange('leaderboardMockData', 'metric', e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-indigo-500 focus:ring-indigo-500">
                                {Object.entries(metricLabels).map(([key, label]) => ( <option key={key} value={key}>{label}</option> ))}
                            </select>
                        </div>
                        <div className="space-y-2 pt-2">
                             <h4 className="text-sm font-medium">Danh sách Leaders (Top 10)</h4>
                            {settings.leaderboardMockData.leaders.map((leader, index) => (
                                <div key={leader.id} className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-700/50 rounded-md">
                                    <span className="font-bold text-slate-500 w-6 text-center">{index + 1}</span>
                                    <img src={leader.avatar} alt={leader.name} className="h-8 w-8 rounded-full" />
                                    <span className="flex-grow font-semibold text-slate-800 dark:text-slate-200">{leader.name}</span>
                                    <span className="text-green-500 font-medium">{formatScore(leader.score, settings.leaderboardMockData.metric)}</span>
                                    <button onClick={() => { setEditingLeader(leader); setIsModalOpen(true); }} className="p-1 text-slate-500 hover:text-indigo-600"><PencilSquareIcon className="h-4 w-4" /></button>
                                    <button onClick={() => handleDeleteMockLeader(leader.id)} className="p-1 text-slate-500 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button>
                                </div>
                            ))}
                             {settings.leaderboardMockData.leaders.length < 10 && (
                                <button onClick={() => { setEditingLeader(null); setIsModalOpen(true); }} className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <PlusIcon className="h-4 w-4" /> Thêm Leader
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6 max-w-3xl animate-fadeIn">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Cài đặt Bảng Xếp hạng Thật</h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tiêu đề</label>
                            <input type="text" value={settings.leaderboardSettings.title} onChange={(e) => handleChange('leaderboardSettings', 'title', e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-indigo-500 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Mô tả</label>
                            <textarea rows={3} value={settings.leaderboardSettings.description} onChange={(e) => handleChange('leaderboardSettings', 'description', e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-indigo-500 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cơ cấu Tính điểm</label>
                            <select value={settings.leaderboardSettings.metric} onChange={(e) => handleChange('leaderboardSettings', 'metric', e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-indigo-500 focus:ring-indigo-500">
                                {Object.entries(metricLabels).map(([key, label]) => ( <option key={key} value={key}>{label}</option> ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Khung thời gian</label>
                            <select value={settings.leaderboardSettings.timeframe} onChange={(e) => handleChange('leaderboardSettings', 'timeframe', e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-indigo-500 focus:ring-indigo-500">
                                {Object.entries(timeframeLabels).map(([key, label]) => ( <option key={key} value={key}>{label}</option> ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}
            
            {isDirty && (
                <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 mt-6 max-w-3xl">
                    <button onClick={handleReset} disabled={isSaving} className="px-6 py-2.5 text-sm font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50">Hủy</button>
                    <button onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">
                        {isSaving ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <CheckIcon className="h-5 w-5" />}
                        {isSaving ? 'Đang lưu...' : 'Lưu Thay đổi'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default LeaderboardManagementPage;
