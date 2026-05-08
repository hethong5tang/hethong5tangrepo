import React, { useState, useMemo, useRef } from 'react';
import { useSettings } from '../../features/settings/useSettings';
import { ReferralToolItem, SystemSettings } from '../../features/settings/types';
import Modal from '../../components/Modal';
import { useToast } from '../../components/ToastProvider';
import { LinkIcon, PlusIcon, PencilSquareIcon, TrashIcon, FacebookIcon, ZaloIcon, TelegramIcon, MessengerIcon, XCircleIcon, ArrowUpTrayIcon } from '../../components/Icons';
import { useActions } from '../../features/actions/useActions';

const iconMap: Record<string, { component: React.FC<any>, color: string }> = {
  FacebookIcon: { component: FacebookIcon, color: '#1877F2' },
  ZaloIcon: { component: ZaloIcon, color: '#0068FF' },
  MessengerIcon: { component: MessengerIcon, color: '#00B2FF' },
  TelegramIcon: { component: TelegramIcon, color: '#26A5E4' },
};
const iconNames = Object.keys(iconMap);

const EditModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: ReferralToolItem) => void;
    item: Partial<ReferralToolItem> | null;
}> = ({ isOpen, onClose, onSave, item }) => {
    const [formData, setFormData] = useState<Partial<ReferralToolItem>>({});
    const iconFileInputRef = useRef<HTMLInputElement>(null);
    const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
    const [selection, setSelection] = useState({ start: 0, end: 0 });


    React.useEffect(() => {
        if (isOpen) {
            const initialContent = item?.content || '';
            setFormData(item || { icon: 'FacebookIcon', title: '', content: '' });
            setSelection({ start: initialContent.length, end: initialContent.length });
        }
    }, [isOpen, item]);

    const handleSave = () => {
        if (formData.title && formData.content && (formData.icon || formData.customIconUrl)) {
            const selectedIcon = iconMap[formData.icon || 'FacebookIcon'];
            onSave({
                ...formData,
                color: selectedIcon.color
            } as ReferralToolItem);
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

    const handleInsertVariable = (variable: '{userName}' | '{referralLink}') => {
        const currentContent = formData.content || '';
        const { start, end } = selection;

        const newContent = currentContent.substring(0, start) + variable + currentContent.substring(end);
        
        const newCursorPos = start + variable.length;

        setFormData(p => ({ ...p, content: newContent }));
        setSelection({ start: newCursorPos, end: newCursorPos });

        setTimeout(() => {
            if (contentTextareaRef.current) {
                contentTextareaRef.current.focus();
                contentTextareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);
    };
    
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={item?.id ? "Chỉnh sửa Nội dung" : "Tạo Nội dung Mới"}
            confirmText="Lưu"
            onConfirm={handleSave}
            isConfirmDisabled={!formData.title || !formData.content || (!formData.icon && !formData.customIconUrl)}
            size="2xl"
        >
            <div className="space-y-4">
                <input
                    type="file"
                    ref={iconFileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/png, image/jpeg, image/svg+xml, image/webp"
                />
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tiêu đề</label>
                    <div className="relative mt-1 group">
                        <input type="text" value={formData.title || ''} onChange={e => setFormData(p => ({...p, title: e.target.value}))} className="block w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-indigo-500 focus:border-indigo-500 pr-10" />
                        {formData.title && (
                            <button 
                                type="button" 
                                onClick={() => setFormData(p => ({...p, title: ''}))}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 opacity-0 group-focus-within:opacity-100 transition-opacity"
                            >
                                <XCircleIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-600 space-y-3">
                        <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300">Tải lên Icon Tùy chỉnh</h5>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 w-16 h-16">
                                {formData.customIconUrl ? <img src={formData.customIconUrl} alt="Custom Icon" className="object-contain h-full w-full p-1" /> : <span className="text-xs text-slate-500">Xem trước</span>}
                            </div>
                            <div className="space-y-1">
                                <button type="button" onClick={() => iconFileInputRef.current?.click()} className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                                    <ArrowUpTrayIcon className="h-4 w-4" /> Tải lên
                                </button>
                                {formData.customIconUrl && <button type="button" onClick={() => setFormData(p => ({ ...p, customIconUrl: undefined }))} className="text-sm text-red-500 hover:underline block">Xóa</button>}
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Khuyến khích: SVG hoặc PNG nền trong, tỉ lệ 1:1 (vuông), ví dụ: 64x64px.</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-600">
                        <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300">Hoặc chọn Icon có sẵn</h5>
                        <div className="flex items-center gap-4 mt-3">
                             <label className="block text-sm flex-grow">
                                <select value={formData.icon || ''} onChange={e => setFormData(p => ({...p, icon: e.target.value}))} disabled={!!formData.customIconUrl} className="block w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {iconNames.map(name => (
                                        <option key={name} value={name}>{name.replace('Icon', '')}</option>
                                    ))}
                                </select>
                             </label>
                             <div className={`p-3 rounded-full mt-1 transition-opacity ${formData.customIconUrl ? 'bg-slate-200/50 dark:bg-slate-800/50 opacity-50' : 'bg-slate-200 dark:bg-slate-600'}`}>
                                {React.createElement(iconMap[formData.icon || 'FacebookIcon'].component, { className: "h-6 w-6 text-slate-700 dark:text-slate-200" })}
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nội dung</label>
                    <div className="relative mt-1 group">
                        <textarea 
                            ref={contentTextareaRef}
                            value={formData.content || ''} 
                            onChange={e => setFormData(p => ({...p, content: e.target.value}))} 
                            onSelect={e => setSelection({ start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd })}
                            rows={5} 
                            className="block w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-indigo-500 focus:border-indigo-500 pr-10" 
                        />
                         {formData.content && (
                            <button 
                                type="button" 
                                onClick={() => setFormData(p => ({...p, content: ''}))}
                                className="absolute top-2 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 opacity-0 group-focus-within:opacity-100 transition-opacity"
                            >
                                <XCircleIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Chèn nhanh:</span>
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleInsertVariable('{userName}')}
                            className="px-2 py-1 text-xs font-mono bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded hover:bg-slate-300 dark:hover:bg-slate-500"
                        >
                            {'{userName}'}
                        </button>
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleInsertVariable('{referralLink}')}
                            className="px-2 py-1 text-xs font-mono bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded hover:bg-slate-300 dark:hover:bg-slate-500"
                        >
                            {'{referralLink}'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const ReferralContentManagementPage: React.FC = () => {
    const { settingsState } = useSettings();
    const { handleUpdateSystemSettings } = useActions();
    const { referralTools } = settingsState.systemSettings;
    const { addToast } = useToast();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<ReferralToolItem> | null>(null);
    
    const [itemToDelete, setItemToDelete] = useState<ReferralToolItem | null>(null);

    const handleOpenModal = (item: ReferralToolItem | null = null) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleSave = (itemToSave: ReferralToolItem) => {
        let newTools: ReferralToolItem[];
        if (itemToSave.id) {
            newTools = referralTools.map(t => t.id === itemToSave.id ? itemToSave : t);
        } else {
            newTools = [...referralTools, { ...itemToSave, id: `tool_${Date.now()}` }];
        }
        handleUpdateSystemSettings({ ...settingsState.systemSettings, referralTools: newTools });
        setIsModalOpen(false);
    };

    const handleDelete = () => {
        if (itemToDelete) {
            const newTools = referralTools.filter(t => t.id !== itemToDelete.id);
            handleUpdateSystemSettings({ ...settingsState.systemSettings, referralTools: newTools });
            addToast('Đã xóa nội dung mẫu!', 'success');
            setItemToDelete(null);
        }
    };

    return (
        <div className="space-y-6">
            {isModalOpen && <EditModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} item={editingItem} />}
            {itemToDelete && (
                <Modal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} title="Xác nhận Xóa" confirmText="Xóa" onConfirm={handleDelete} confirmButtonVariant="danger">
                    <p>Bạn có chắc muốn xóa nội dung mẫu "{itemToDelete.title}"?</p>
                </Modal>
            )}

            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Quản lý Nội dung Tuyển dụng</h2>
                <button onClick={() => handleOpenModal()} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
                    <PlusIcon className="h-5 w-5" /> Thêm Nội dung
                </button>
            </div>

            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {referralTools.map(item => {
                        const Icon = iconMap[item.icon]?.component;
                        return (
                            <div key={item.id} className="group bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl flex flex-col border border-slate-200 dark:border-slate-700 h-full">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-6 h-6 flex items-center justify-center">
                                            {item.customIconUrl ? (
                                                <img src={item.customIconUrl} alt={item.title} className="h-6 w-6 object-contain" />
                                            ) : (
                                                Icon && <Icon className="h-6 w-6" style={{ color: item.color }} />
                                            )}
                                        </div>
                                        <h4 className="font-bold text-slate-800 dark:text-slate-200">{item.title}</h4>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleOpenModal(item)} className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-full bg-slate-200/50 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700" title="Chỉnh sửa"><PencilSquareIcon className="h-4 w-4" /></button>
                                        <button onClick={() => setItemToDelete(item)} className="p-1.5 text-slate-500 hover:text-red-600 rounded-full bg-slate-200/50 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700" title="Xóa"><TrashIcon className="h-4 w-4" /></button>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap flex-grow">{item.content}</p>
                            </div>
                        );
                    })}
                </div>
                {referralTools.length === 0 && (
                    <div className="text-center py-16 text-slate-500">
                        <LinkIcon className="h-12 w-12 mx-auto text-slate-400 mb-2" />
                        <p className="font-semibold">Chưa có nội dung mẫu nào.</p>
                        <p className="text-sm mt-1">Bấm "Thêm Nội dung" để tạo mẫu đầu tiên cho thành viên.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReferralContentManagementPage;