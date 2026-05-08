
import React, { useState, useEffect } from 'react';
import { useSettings } from '../../features/settings/useSettings';
import { useActions } from '../../features/actions/useActions';
import { SystemSettings, LevelSetting } from '../../features/settings/types';
import Modal from '../../components/Modal';
import { PencilSquareIcon, TrashIcon, PlusIcon, TrophyIcon, XCircleIcon, BanknotesIcon, InformationCircleIcon } from '../../components/Icons';
import FormattedNumberInput from '../../components/FormattedNumberInput';
import { isEqual } from 'lodash-es';

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
            const initialData = level || { name: '', requiredEarnings: 0, bonusAmount: 0, rewardPercentage: 0, branchRequirements: [] };
            setFormData(initialData);
            setPercentInput((initialData.rewardPercentage || 0).toString().replace('.', ','));
        }
    }, [isOpen, level]);

    const calculateBonus = (earnings: number, percentage: number) => {
        return Math.floor(earnings * (percentage / 100));
    };

    const handleSave = () => {
        if (formData.name && (formData.requiredEarnings || 0) >= 0) {
            onSave({
                ...formData,
                bonusAmount: formData.bonusAmount || 0,
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
                            2. Doanh thu Yêu cầu
                        </label>
                        <div className="relative">
                            <FormattedNumberInput
                                value={formData.requiredEarnings || 0}
                                onChange={(value) => {
                                    const percentage = formData.rewardPercentage || 0;
                                    const newBonus = calculateBonus(value, percentage);
                                    setFormData(p => ({ ...p, requiredEarnings: value, bonusAmount: newBonus }));
                                }}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white pr-8 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                             <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500 font-medium">đ</div>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Mức doanh thu cần đạt để thăng cấp.</p>
                    </div>

                    {/* 3. Tỷ lệ thưởng */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            3. Tỷ lệ thưởng (% Quỹ Leader)
                        </label>
                        <div className="relative">
                             <FormattedNumberInput
                                value={formData.rewardPercentage || 0}
                                onChange={(percentage) => {
                                    const earnings = formData.requiredEarnings || 0;
                                    const newBonus = calculateBonus(earnings, percentage);
                                    setFormData(p => ({ 
                                        ...p, 
                                        rewardPercentage: percentage, 
                                        bonusAmount: newBonus 
                                    }));
                                }}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white pr-8 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="0,0"
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500 font-medium">%</div>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Dùng để tính ra Tiền thưởng bên dưới.</p>
                    </div>
                </div>

                {/* 4. Tiền thưởng thăng cấp (Kết quả) */}
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-xl p-4">
                    <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2">
                        4. Tiền thưởng thăng cấp (Kết quả tự động)
                    </label>
                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <div className="relative">
                                <FormattedNumberInput
                                    value={formData.bonusAmount || 0}
                                    onChange={(value) => setFormData(p => ({ ...p, bonusAmount: value }))}
                                    className="block w-full px-4 py-3 text-xl font-bold border-2 border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 pr-10 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                                />
                                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-emerald-500 font-bold text-lg">đ</div>
                            </div>
                        </div>
                        <div className="shrink-0 pb-2">
                            <BanknotesIcon className="h-8 w-8 text-emerald-500/50" />
                        </div>
                    </div>
                    <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/60 mt-2 font-medium italic">
                        * Số tiền này được tính dựa trên: {formData.requiredEarnings?.toLocaleString('vi-VN')}đ × {formData.rewardPercentage}%
                    </p>
                </div>

                {/* 5. Điều kiện nhánh */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                            5. Điều kiện nhánh (F1+)
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
    const { handleUpdateSystemSettings } = useActions();

    const [levels, setLevels] = useState<LevelSetting[]>(settingsState.systemSettings.levelSettings);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLevel, setEditingLevel] = useState<Partial<LevelSetting> | null>(null);
    const [deletingLevel, setDeletingLevel] = useState<LevelSetting | null>(null);
    
    useEffect(() => {
        setLevels(settingsState.systemSettings.levelSettings);
    }, [settingsState.systemSettings.levelSettings]);

    const handleSave = (levelToSave: LevelSetting) => {
        let newLevels;
        if (levelToSave.level) {
            newLevels = levels.map(l => l.level === levelToSave.level ? levelToSave : l);
        } else {
            const newLevelNumber = levels.length > 0 ? Math.max(...levels.map(l => l.level)) + 1 : 1;
            newLevels = [...levels, { ...levelToSave, level: newLevelNumber }];
        }
        
        newLevels.sort((a, b) => a.requiredEarnings - b.requiredEarnings);
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
            {isModalOpen && <EditLevelModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} level={editingLevel} />}
            {deletingLevel && (
                <Modal isOpen={!!deletingLevel} onClose={() => setDeletingLevel(null)} title="Xác nhận Xóa" confirmText="Xóa" onConfirm={handleDelete} confirmButtonVariant="danger">
                    <p>Bạn có chắc muốn xóa cấp bậc "{deletingLevel.name}"?</p>
                </Modal>
            )}

            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Quản lý Cấp bậc & Thưởng thăng cấp</h2>
                <button onClick={() => { setEditingLevel(null); setIsModalOpen(true); }} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
                    <PlusIcon className="h-5 w-5" /> Thêm Cấp bậc
                </button>
            </div>
            
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 flex items-start gap-3">
                <InformationCircleIcon className="h-6 w-6 text-indigo-500 shrink-0 mt-0.5" />
                <div className="text-sm text-indigo-800 dark:text-indigo-200">
                    <p className="font-bold">Cơ chế Thưởng thăng cấp (Fixed):</p>
                    <p className="mt-1">
                        Khi thành viên đạt đủ doanh thu tích lũy để lên cấp, họ sẽ nhận được khoản thưởng cố định thiết lập bên dưới. 
                        Khoản thưởng này được ưu tiên chi trả từ <strong>Quỹ Thưởng Leader</strong> trước khi thực hiện chia quỹ theo trọng số cho các thành tích phụ khác.
                    </p>
                </div>
            </div>

            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Tên gọi</th>
                                <th scope="col" className="px-6 py-3 text-right">Doanh thu phát sinh yêu cầu (Reset khi qua cấp)</th>
                                <th scope="col" className="px-6 py-3 text-right">Thưởng thăng cấp</th>
                                <th scope="col" className="px-6 py-3 text-right">Tỷ lệ chia thưởng</th>
                                <th scope="col" className="px-6 py-3 text-right">Điều kiện nhánh</th>
                                <th scope="col" className="px-6 py-3 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {levels.map(level => (
                                <tr key={level.level} className="border-b border-slate-200/50 dark:border-slate-700/50">
                                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{level.name}</td>
                                    <td className="px-6 py-4 text-right font-medium text-blue-500">
                                        {level.requiredEarnings === 0 
                                            ? 'Mục tiêu mặc định (0đ)' 
                                            : `Đạt thêm ${level.requiredEarnings.toLocaleString('vi-VN')}đ${level.requiredEarnings >= 1000000000 ? ` (${level.requiredEarnings / 1000000000} Tỷ)` : ''}`}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-green-500">
                                        {level.bonusAmount.toLocaleString('vi-VN')}đ
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-orange-500">
                                        {level.rewardPercentage || 0}%
                                    </td>
                                    <td className="px-6 py-4 text-right text-xs font-medium text-slate-600 dark:text-slate-400 space-y-1">
                                        {level.branchRequirements && level.branchRequirements.length > 0
                                            ? level.branchRequirements.map((r, i) => <div key={i}>{r.count} nhánh đạt Cấp {r.targetLevel}</div>)
                                            : <span className="italic">Không có</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => { setEditingLevel(level); setIsModalOpen(true); }} className="p-1 text-indigo-600 hover:text-indigo-900"><PencilSquareIcon className="h-4 w-4"/></button>
                                            <button onClick={() => setDeletingLevel(level)} className="p-1 text-red-600 hover:text-red-900"><TrashIcon className="h-4 w-4"/></button>
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
    );
};

export default LevelManagementPage;
