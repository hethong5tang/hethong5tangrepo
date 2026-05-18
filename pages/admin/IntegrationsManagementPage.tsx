
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSettings } from '../../features/settings/useSettings';
import { useActions } from '../../features/actions/useActions';
import { SystemSettings, IntegrationTool, IntegrationType } from '../../features/settings/types';
import Modal from '../../components/Modal';
import { 
    PlusIcon, PencilSquareIcon, TrashIcon, SparklesIcon, UserCircleIcon, 
    ChartBarIcon, CurrencyDollarIcon, PuzzlePieceIcon, CpuChipIcon, XCircleIcon, 
    ArrowUpTrayIcon, CodeBracketIcon, ComputerDesktopIcon, PhotoIcon, VideoIcon, 
    FaceSmileIcon, BanknotesIcon, DocumentArrowDownIcon, ClockIcon, ArrowsUpDownIcon,
    Bars3Icon, ChevronUpIcon, ChevronDownIcon, BoltIcon, DocumentTextIcon,
    ExclamationTriangleIcon, MagnifyingGlassIcon, AdjustmentsHorizontalIcon, CheckCircleIcon,
    SpeakerWaveIcon
} from '../../components/Icons';
import { useToast } from '../../components/ToastProvider';
import FormattedNumberInput from '../../components/FormattedNumberInput';
import { ensureSupportedImageFormat } from '../../utils/imageProcessing';

import { ALL_GEMINI_MODELS, isModelInCategory } from '../../constants';

// Constants removed as they are now dynamic from systemSettings
const CREDIT_VAL = 1000;

const AI_MODEL_OPTIONS = ALL_GEMINI_MODELS.map(m => ({
    ...m,
    provider: 'Google'
}));

const iconMap: Record<string, React.FC<{className?: string}>> = {
    SparklesIcon, UserCircleIcon, ChartBarIcon, CurrencyDollarIcon, PuzzlePieceIcon, 
    CpuChipIcon, ComputerDesktopIcon, PhotoIcon, VideoIcon, FaceSmileIcon, 
    PencilSquareIcon, DocumentTextIcon, SpeakerWaveIcon
};

const iconNames = Object.keys(iconMap);

const EditModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: IntegrationTool) => void;
    item: Partial<IntegrationTool> | null;
    systemSettings: SystemSettings;
}> = ({ isOpen, onClose, onSave, item, systemSettings }) => {
    const [formData, setFormData] = useState<Partial<IntegrationTool>>({});
    const [searchModel, setSearchModel] = useState('');
    const [filterCat, setFilterCat] = useState('all');
    const [markupPercent, setMarkupPercent] = useState<number>(0);
    const iconInputRef = useRef<HTMLInputElement>(null);

    const { apiCatalog = [], apiUsdRate = 25500 } = systemSettings;

    useEffect(() => {
        if (isOpen) {
            setFormData(item || { icon: 'PuzzlePieceIcon', title: '', description: '', modelPricing: {}, category: 'image' });
            
            if (item?.category) {
                setFilterCat(item.category);
            } else {
                // Auto-filter based on tool type if category is missing
                const id = (item?.id || '').toLowerCase();
                const title = (item?.title || '').toLowerCase();
                if (id.includes('video') || title.includes('video')) setFilterCat('video');
                else if (id.includes('text') || id.includes('writer') || id.includes('ocr') || title.includes('văn bản') || title.includes('viết') || title.includes('nội dung')) setFilterCat('text');
                else if (id.includes('image') || title.includes('ảnh') || title.includes('hình')) setFilterCat('image');
                else setFilterCat('all');
            }
        }
    }, [isOpen, item]);

    const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (event) => {
                if (event.target?.result) {
                    const processed = await ensureSupportedImageFormat(event.target.result as string);
                    setFormData(p => ({ ...p, customIconUrl: processed }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleApplyMarkup = () => {
        if (markupPercent === 0) return;
        const newPricing = { ...(formData.modelPricing || {}) };
        AI_MODEL_OPTIONS.forEach(model => {
            if (model.category === filterCat || filterCat === 'all') {
                const catalogItem = apiCatalog.find((c: any) => {
                    const cId = (c.modelId || c.id || '').toLowerCase();
                    const mId = (model.id || '').toLowerCase();
                    return cId === mId || cId.includes(mId) || mId.includes(cId);
                });
                const baseCostVnd = (catalogItem?.basePriceUsd || 0) * apiUsdRate;
                if (baseCostVnd > 0) {
                    const targetRevenue = baseCostVnd * (1 + markupPercent / 100);
                    newPricing[model.id] = Math.ceil(targetRevenue / CREDIT_VAL);
                }
            }
        });
        setFormData(p => ({ ...p, modelPricing: newPricing }));
        setMarkupPercent(0);
    };

    const filteredModels = useMemo(() => {
        return AI_MODEL_OPTIONS.filter(m => {
            const matchSearch = m.name.toLowerCase().includes(searchModel.toLowerCase());
            const matchCat = filterCat === 'all' || isModelInCategory(m, filterCat);
            return matchSearch && matchCat;
        });
    }, [searchModel, filterCat]);

    const inputClasses = "w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none shadow-sm transition-all";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={item?.id ? "Chỉnh sửa Tiện ích" : "Tạo Tiện ích Mới"} confirmText="Lưu cấu hình" onConfirm={() => onSave(formData as IntegrationTool)} size="5xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-h-[75vh] overflow-hidden">
                
                {/* Cột trái: Thông tin chung */}
                <div className="lg:col-span-4 space-y-5 overflow-y-auto pr-2 scrollbar-thin">
                    <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">1. Thông tin chung</label>
                    <div className="space-y-4">
                        {/* Phần Upload Icon */}
                        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden relative group text-slate-900 dark:text-white">
                                {formData.customIconUrl ? (
                                    <img src={formData.customIconUrl} alt="Icon" className="w-full h-full object-contain p-2" />
                                ) : (
                                    React.createElement(iconMap[formData.icon || 'PuzzlePieceIcon'] || PuzzlePieceIcon, { className: "h-8 w-8 text-indigo-500" })
                                )}
                                <div onClick={() => iconInputRef.current?.click()} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                    <ArrowUpTrayIcon className="h-5 w-5 text-white" />
                                </div>
                            </div>
                            <div className="flex-1 space-y-1">
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Biểu tượng</p>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => iconInputRef.current?.click()} className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded-md font-bold uppercase">Upload</button>
                                    {formData.customIconUrl && <button type="button" onClick={() => setFormData(p => ({...p, customIconUrl: undefined}))} className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md font-bold uppercase">Xóa</button>}
                                </div>
                                <input type="file" ref={iconInputRef} onChange={handleIconUpload} className="hidden" accept="image/*" />
                            </div>
                        </div>

                        <input type="text" placeholder="Tên tiện ích" value={formData.title || ''} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} className={inputClasses} />
                        <textarea placeholder="Mô tả công cụ..." value={formData.description || ''} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={4} className={inputClasses} />
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <span className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Loại Công Cụ</span>
                                <select value={formData.category || 'image'} onChange={e => {
                                    const newCat = e.target.value;
                                    setFormData(p => ({ ...p, category: newCat }));
                                    setFilterCat(newCat);
                                }} className={`${inputClasses} appearance-none font-bold`}>
                                    <option value="image">Hình ảnh</option>
                                    <option value="text">Văn bản</option>
                                    <option value="video">Video</option>
                                    <option value="audio">Âm thanh</option>
                                    <option value="all">Khác (Tất cả model)</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <span className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Icon Mặc định</span>
                                <select value={formData.icon || ''} onChange={e => setFormData(p => ({ ...p, icon: e.target.value }))} className={`${inputClasses} appearance-none`}>
                                    {iconNames.map(name => <option key={name} value={name}>{name.replace('Icon', '')}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* DANH SÁCH TÁC VỤ PHỤ (SUB-TOOLS) */}
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tác vụ phụ (Mã API)</label>
                                <button type="button" onClick={() => setFormData(p => ({...p, subTools: [...(p.subTools || []), { id: '', name: '', creditCost: p.creditCost || 10 }]}))} className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded font-bold uppercase hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors">
                                    + Thêm
                                </button>
                            </div>
                            
                            <div className="space-y-2">
                                {formData.subTools?.length === 0 || !formData.subTools ? (
                                    <p className="text-[10px] text-slate-400 italic text-center py-2">Chưa có tác vụ phụ nào.</p>
                                ) : formData.subTools.map((st, index) => (
                                    <div key={index} className="flex flex-col gap-2 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl relative group">
                                        <button type="button" onClick={() => {
                                            const newSubTools = [...formData.subTools!];
                                            newSubTools.splice(index, 1);
                                            setFormData(p => ({...p, subTools: newSubTools}));
                                        }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        </button>
                                        <input type="text" placeholder="Mã tác vụ (Ví dụ: remove_background)" value={st.id} onChange={e => {
                                            const newSubTools = [...formData.subTools!];
                                            newSubTools[index].id = e.target.value;
                                            setFormData(p => ({...p, subTools: newSubTools}));
                                        }} className={`${inputClasses} !py-2 !text-xs font-mono`} title="Mã này sẽ được hệ thống check tự động khi gọi API" />
                                        <div className="flex gap-2">
                                            <input type="text" placeholder="Tên hiển thị (Tách nền)" value={st.name} onChange={e => {
                                                const newSubTools = [...formData.subTools!];
                                                newSubTools[index].name = e.target.value;
                                                setFormData(p => ({...p, subTools: newSubTools}));
                                            }} className={`${inputClasses} flex-1 !py-2 !text-xs`} />
                                            <div className="w-24">
                                                <FormattedNumberInput value={st.creditCost || 0} onChange={v => {
                                                    const newSubTools = [...formData.subTools!];
                                                    newSubTools[index].creditCost = v;
                                                    setFormData(p => ({...p, subTools: newSubTools}));
                                                }} className={`${inputClasses} !py-2 !text-xs text-center`} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cột phải: Marketplace định giá */}
                <div className="lg:col-span-8 flex flex-col bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase flex items-center gap-2 tracking-wider text-balance">
                                <BoltIcon className="h-4 w-4" /> 2. Model Pricing (Bắt buộc thiết lập)
                            </h4>
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="relative">
                                    <input type="number" placeholder="Lãi %" value={markupPercent || ''} onChange={e => setMarkupPercent(Number(e.target.value))} className="w-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500" />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">%</span>
                                </div>
                                <button onClick={handleApplyMarkup} className="text-[10px] font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap">Tự tính giá bán</button>
                            </div>
                        </div>

                        {/* Thanh công cụ Tìm kiếm & Lọc */}
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input type="text" placeholder="Tìm tên model..." value={searchModel} onChange={e => setSearchModel(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/10" />
                            </div>
                            <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 gap-1">
                                {['all', 'image', 'video', 'text', 'audio'].map(cat => (
                                    <button key={cat} onClick={() => setFilterCat(cat)} className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${filterCat === cat ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                                        {cat === 'all' ? 'Tất cả' : cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Danh sách Model */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                        <p className="text-[10px] text-slate-400 italic px-2 mb-2">Nhấn dấu tích xanh để mở model và đặt giá. Model nào không tích sẽ không xuất hiện trong công cụ của User.</p>
                        {filteredModels.length > 0 ? filteredModels.map(model => {
                            const hasPrice = formData.modelPricing?.hasOwnProperty(model.id);
                            const userPrice = hasPrice ? formData.modelPricing![model.id] : 0;
                            
                            const catalogItem = apiCatalog.find((c: any) => {
                                const cId = (c.modelId || c.id || '').toLowerCase();
                                const mId = (model.id || '').toLowerCase();
                                return cId === mId || cId.includes(mId) || mId.includes(cId);
                            });
                            const baseCostVnd = (catalogItem?.basePriceUsd || 0) * apiUsdRate;
                            const profitVnd = (userPrice * CREDIT_VAL) - baseCostVnd;

                            return (
                                <div key={model.id} className={`p-4 rounded-xl border transition-all ${hasPrice ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-500/50 shadow-md' : 'bg-slate-50/50 dark:bg-slate-900/10 border-slate-100 dark:border-slate-800 opacity-60'}`}>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold text-xs truncate ${hasPrice ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>{model.name}</span>
                                                <span className="text-[8px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded uppercase font-black">{model.provider}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">Giá gốc: ~{Math.round(baseCostVnd).toLocaleString()}đ ({catalogItem?.unit || 'lần'})</p>
                                        </div>
                                        
                                        <div className="flex items-center gap-4">
                                            {hasPrice && (
                                                <div className="text-right">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Giá bán:</span>
                                                        <FormattedNumberInput 
                                                            value={userPrice} 
                                                            onChange={v => setFormData(p => ({ ...p, modelPricing: { ...p.modelPricing, [model.id]: v } }))} 
                                                            className="w-16 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-indigo-600 dark:text-indigo-400 font-black text-right outline-none focus:ring-1 focus:ring-indigo-500" 
                                                        />
                                                    </div>
                                                    <div className={`text-[10px] font-bold mt-1 ${profitVnd < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                        {profitVnd < 0 ? `LỖ: ${Math.round(Math.abs(profitVnd)).toLocaleString()}đ` : `LÃI: +${Math.round(profitVnd).toLocaleString()}đ`}
                                                    </div>
                                                </div>
                                            )}
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    const newPricing = { ...formData.modelPricing };
                                                    if (hasPrice) delete newPricing[model.id];
                                                    else {
                                                        // Default to markup recommended price if possible
                                                        const recPrice = Math.ceil((baseCostVnd * 1.5) / CREDIT_VAL) || 10;
                                                        newPricing[model.id] = recPrice;
                                                    }
                                                    setFormData(p => ({ ...p, modelPricing: newPricing }));
                                                }}
                                                className={`p-2 rounded-full transition-colors ${hasPrice ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-700 text-slate-300 dark:text-slate-600 hover:text-indigo-400'}`}
                                            >
                                                <CheckCircleIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="flex flex-col items-center justify-center py-10 opacity-30 text-slate-900 dark:text-white">
                                <MagnifyingGlassIcon className="h-10 w-10 mb-2" />
                                <p className="text-sm font-bold uppercase">Không tìm thấy model nào</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Hiển thị {filteredModels.length} trên tổng số {AI_MODEL_OPTIONS.length} model tích hợp.</p>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const IntegrationsManagementPage: React.FC = () => {
    const { settingsState } = useSettings();
    const { handleUpdateSystemSettings } = useActions();
    const { integrationTools } = settingsState.systemSettings;
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<IntegrationTool> | null>(null);

    const [activeTab, setActiveTab] = useState<'image' | 'text' | 'video' | 'audio'>('image');

    const handleSave = (itemToSave: IntegrationTool) => {
        let newTools: IntegrationTool[];
        // Ensure category is set
        const finalTool = { ...itemToSave };
        if (!finalTool.category) {
            const id = (finalTool.id || '').toLowerCase();
            const title = (finalTool.title || '').toLowerCase();
            if (id.includes('video') || title.includes('video')) finalTool.category = 'video';
            else if (id.includes('text') || id.includes('writer') || id.includes('ocr') || title.includes('văn bản') || title.includes('viết')) finalTool.category = 'text';
            else if (id.includes('audio') || title.includes('âm thanh')) finalTool.category = 'audio';
            else finalTool.category = 'image';
        }

        if (itemToSave.id) newTools = integrationTools.map(t => t.id === itemToSave.id ? finalTool : t);
        else newTools = [...integrationTools, { ...finalTool, id: `tool_${Date.now()}` }];
        handleUpdateSystemSettings({ ...settingsState.systemSettings, integrationTools: newTools });
        setIsModalOpen(false);
    };

    const groupedTools = useMemo(() => {
        const textTools: IntegrationTool[] = [];
        const videoTools: IntegrationTool[] = [];
        const imageTools: IntegrationTool[] = [];
        const audioTools: IntegrationTool[] = [];
        
        integrationTools.forEach(t => {
            let cat = t.category;
            if (!cat) {
                const id = (t.id || '').toLowerCase();
                const title = (t.title || '').toLowerCase();
                if (id.includes('video') || title.includes('video')) cat = 'video';
                else if (id.includes('text') || id.includes('writer') || id.includes('ocr') || title.includes('văn bản') || title.includes('viết') || title.includes('nội dung')) cat = 'text';
                else if (id.includes('audio') || title.includes('âm thanh')) cat = 'audio';
                else cat = 'image';
            }
            if (cat === 'video') videoTools.push(t);
            else if (cat === 'text') textTools.push(t);
            else if (cat === 'audio') audioTools.push(t);
            else imageTools.push(t);
        });
        
        return { text: textTools, video: videoTools, image: imageTools, audio: audioTools };
    }, [integrationTools]);

    const tabs = [
        { id: 'image', label: 'Hình ảnh', icon: PhotoIcon, color: 'from-pink-500 to-rose-500', count: groupedTools.image.length },
        { id: 'text', label: 'Văn bản', icon: DocumentTextIcon, color: 'from-blue-500 to-indigo-500', count: groupedTools.text.length },
        { id: 'video', label: 'Video', icon: VideoIcon, color: 'from-purple-500 to-violet-500', count: groupedTools.video.length },
        { id: 'audio', label: 'Âm thanh', icon: SpeakerWaveIcon, color: 'from-amber-500 to-yellow-500', count: groupedTools.audio.length },
    ] as const;

    const renderToolCard = (tool: IntegrationTool) => {
        const Icon = iconMap[tool.icon] || PuzzlePieceIcon;
        return (
            <div key={tool.id} className="bg-white dark:bg-slate-800 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 hover:border-indigo-500/30 transition-all p-6 group flex flex-col h-full">
                <div className="flex items-start justify-between mb-4 flex-shrink-0">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-400 text-white shadow-lg transform group-hover:rotate-3 transition-transform overflow-hidden">
                        {tool.customIconUrl ? (
                            <img src={tool.customIconUrl} alt={tool.title} className="h-6 w-6 object-contain" />
                        ) : (
                            <Icon className="h-6 w-6" />
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => { setEditingItem(tool); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 dark:bg-slate-700 rounded-full transition-colors"><PencilSquareIcon className="h-4 w-4"/></button>
                        <button className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 dark:bg-slate-700 rounded-full transition-colors"><TrashIcon className="h-4 w-4"/></button>
                    </div>
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg flex-shrink-0">{tool.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-3 leading-relaxed flex-grow">{tool.description}</p>
                
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex-shrink-0">
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bảng giá Model ({Object.keys(tool.modelPricing || {}).length})</p>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                        {Object.entries(tool.modelPricing || {}).slice(0, 3).map(([mId, price]) => (
                            <div key={mId} className="flex justify-between items-center text-[10px] bg-slate-50 dark:bg-slate-900/30 p-2 rounded-lg">
                                <span className="text-slate-600 dark:text-slate-400 font-bold uppercase tracking-tighter truncate w-32">{mId.replace('gemini-', '').replace('preview', 'pro')}</span>
                                <span className="font-black text-indigo-600 dark:text-indigo-400">{price} P</span>
                            </div>
                        ))}
                        {Object.keys(tool.modelPricing || {}).length > 3 && (
                            <p className="text-center text-[9px] text-slate-400 italic">và {Object.keys(tool.modelPricing || {}).length - 3} model khác...</p>
                        )}
                        {(!tool.modelPricing || Object.keys(tool.modelPricing).length === 0) && (
                            <div className="flex justify-between items-center text-[10px] bg-slate-50 dark:bg-slate-900/30 p-2 rounded-lg">
                                <span className="text-slate-600 dark:text-slate-400 font-bold italic">Chưa đặt giá riêng cho model</span>
                                <span className="font-black text-slate-400">---</span>
                            </div>
                        )}
                    </div>
                    
                    {tool.subTools && tool.subTools.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tác vụ phụ ({tool.subTools.length})</p>
                            <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                                {tool.subTools.slice(0, 3).map((st, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-[10px] bg-indigo-50/50 dark:bg-indigo-900/20 p-2 rounded-lg">
                                        <span className="text-slate-700 dark:text-slate-300 font-bold truncate flex-1">{st.name}</span>
                                        <span className="font-black text-indigo-600 dark:text-indigo-400">{st.creditCost} P</span>
                                    </div>
                                ))}
                                {tool.subTools.length > 3 && (
                                    <p className="text-center text-[9px] text-slate-400 italic">và {tool.subTools.length - 3} tác vụ khác...</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {isModalOpen && <EditModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} item={editingItem} systemSettings={settingsState.systemSettings} />}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-full md:w-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                activeTab === tab.id 
                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md transform scale-105' 
                                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >
                            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-500' : ''}`} />
                            {tab.label}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                                activeTab === tab.id 
                                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' 
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
                
                <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
                    <PlusIcon className="h-5 w-5" /> Thêm công cụ
                </button>
            </div>

            <div className="min-h-[400px]">
                {/* HIỂN THỊ CÔNG CỤ THEO TAB ĐANG CHỌN */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {groupedTools[activeTab].map(tool => renderToolCard(tool))}
                    
                    {groupedTools[activeTab].length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-40">
                            <PuzzlePieceIcon className="w-16 h-16 mb-4 text-slate-300" />
                            <p className="text-lg font-bold text-slate-400 uppercase tracking-widest">Chưa có công cụ nào trong nhóm này</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IntegrationsManagementPage;
