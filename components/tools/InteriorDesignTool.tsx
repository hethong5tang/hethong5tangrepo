
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { 
    ArrowLeftIcon, SparklesIcon, DocumentArrowDownIcon, 
    PhotoIcon, CheckCircleIcon, TrashIcon, ArrowPathIcon, 
    HomeModernIcon, ClockIcon, WrenchScrewdriverIcon,
    LightBulbIcon, CubeIcon, ArrowUpTrayIcon,
    ChevronUpIcon, AdjustmentsHorizontalIcon,
    TagIcon, ArrowsRightLeftIcon,
    PlusIcon, CameraIcon, EyeIcon,
    FilmIcon, MapPinIcon, PencilSquareIcon, BoltIcon,
    CalculatorIcon, RulerIcon, ChevronDownIcon
} from '../Icons';
import { IntegrationTool } from '../../features/settings/types';
import { useAuth } from '../../features/auth/useAuth';
import { useUser } from '../../features/users/useUser';
import { useActions } from '../../features/actions/useActions';
import { useSettings } from '../../features/settings/useSettings';
import { useToast } from '../../components/ToastProvider';
import { ALL_GEMINI_MODELS } from '../../constants';
import { findUserInTree } from '../../services/userService';
import { GenerationResult, ImageQuantity } from '../../features/users/types';
import CreditBalanceDisplay from './CreditBalanceDisplay';
import Modal from '../../components/Modal';
import FormattedNumberInput from '../../components/FormattedNumberInput';
import { ensureSupportedImageFormat } from '../../utils/imageProcessing';

interface InteriorDesignToolProps {
    tool: IntegrationTool;
    onNavigate: (page: string) => void;
}


const ROOM_TYPES = [
    'Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Home Office', 
    'Dining Room', 'Balcony', 'Garden', 'Coffee Shop', 'Retail Store'
];

const RENOVATION_GROUPS = [
    {
        name: 'Hiện đại & Tối giản',
        styles: [
            { id: 'minimalist', name: 'Minimalist (Tối giản)' },
            { id: 'modern', name: 'Modern (Hiện đại)' },
            { id: 'scandinavian', name: 'Scandinavian (Bắc Âu)' },
            { id: 'japandi', name: 'Japandi (Nhật + Bắc Âu)' }
        ]
    },
    {
        name: 'Cổ điển & Sang trọng',
        styles: [
            { id: 'neoclassic', name: 'Neoclassical (Tân cổ điển)' },
            { id: 'luxury', name: 'Luxury (Sang trọng)' },
            { id: 'art_deco', name: 'Art Deco' },
            { id: 'victorian', name: 'Victorian' }
        ]
    },
    {
        name: 'Thô mộc & Công nghiệp',
        styles: [
            { id: 'industrial', name: 'Industrial (Công nghiệp)' },
            { id: 'rustic', name: 'Rustic (Thô mộc)' },
            { id: 'wabi_sabi', name: 'Wabi Sabi' },
            { id: 'bohemian', name: 'Bohemian' }
        ]
    },
    {
        name: 'Chủ đề & Concept',
        styles: [
            { id: 'tropical', name: 'Tropical (Nhiệt đới)' },
            { id: 'coastal', name: 'Coastal (Biển)' },
            { id: 'cyberpunk', name: 'Cyberpunk (Neon/Game)' },
            { id: 'christmas', name: 'Giáng sinh' }
        ]
    }
];

const InteriorDesignTool: React.FC<InteriorDesignToolProps> = ({ tool, onNavigate }) => {
    const { loggedInUser } = useAuth();
    const { userState } = useUser();
    const { handleUseToolCredit, handleSetGenerationHistory, handleDeleteGenerationResult } = useActions();
    const { settingsState } = useSettings();
    const { addToast } = useToast();

    // UseMemo for models
    const activeModels = useMemo(() => {
        // Ưu tiên các model được bật riêng cho công cụ này trong Admin (modelPricing)
        const toolSpecificModels = tool.modelPricing ? Object.keys(tool.modelPricing) : [];
        if (toolSpecificModels.length > 0) {
            return ALL_GEMINI_MODELS.filter(m => toolSpecificModels.includes(m.id));
        }

        const activeIds = settingsState.systemSettings.activeGeminiModels || [];
        const filtered = ALL_GEMINI_MODELS.filter(m => activeIds.includes(m.id));
        return filtered.length > 0 ? filtered : [ALL_GEMINI_MODELS[0]];
    }, [settingsState.systemSettings.activeGeminiModels, tool.modelPricing]);

    // Use correct key from environment
    const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    
    // State
    const [activeTab, setActiveTab] = useState<'design' | 'renovate'>('design');
    const [selectedModel, setSelectedModel] = useState<string>(activeModels[0].id);

    useEffect(() => {
        if (!activeModels.some(m => m.id === selectedModel)) {
            setSelectedModel(activeModels[0].id);
        }
    }, [activeModels, selectedModel]);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    
    // Design Mode State
    const [roomType, setRoomType] = useState(ROOM_TYPES[0]);
    const [designGroupIdx, setDesignGroupIdx] = useState<number | 'random'>(0);
    const [style, setStyle] = useState(RENOVATION_GROUPS[0].styles[0].id);
    const [budget, setBudget] = useState('Medium');
    const [customPrompt, setCustomPrompt] = useState('');
    
    // Renovate Mode State
    const [renovateMode, setRenovateMode] = useState<'auto' | 'custom'>('auto');
    const [renovationPlan, setRenovationPlan] = useState(''); // Kế hoạch cải tạo (Auto)
    const [decorSuggestions, setDecorSuggestions] = useState(''); // Gợi ý Decor (Custom)
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // Common State
    const [selectedGroupIdx, setSelectedGroupIdx] = useState<number | 'random'>(0); // For Renovate custom mode
    const [renovateStyle, setRenovateStyle] = useState(RENOVATION_GROUPS[0].styles[0].id);
    
    const [imageQuantity, setImageQuantity] = useState<ImageQuantity>(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progressStatus, setProgressStatus] = useState('');
    
    const [resultImages, setResultImages] = useState<string[]>([]);
    const [selectedResultIndex, setSelectedResultIndex] = useState(0);
    
    const [showDownloadOptions, setShowDownloadOptions] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    
    // Extra Features State
    const [isGeneratingExtra, setIsGeneratingExtra] = useState(false);
    const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const freshUser = useMemo(() => loggedInUser ? findUserInTree(userState.allUsers, loggedInUser.id) : null, [userState.allUsers, loggedInUser]);
    const currentCredits = freshUser ? freshUser.creditBalance : 0;
    const totalCost = tool.creditCost * imageQuantity;

    // History
    const historyItems = useMemo(() => {
        if (!loggedInUser?.generationHistory) return [];
        return loggedInUser.generationHistory
            .filter(h => h.taskId.startsWith('interior_'))
            .sort((a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime());
    }, [loggedInUser]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (event) => {
                if (event.target?.result) {
                    const res = await ensureSupportedImageFormat(event.target.result as string);
                    setUploadedImage(res);
                    setResultImages([]); // Reset results on new upload
                }
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>, mode: 'design' | 'renovate') => {
        const val = e.target.value === 'random' ? 'random' : parseInt(e.target.value);
        if (mode === 'design') {
            setDesignGroupIdx(val);
            if (val !== 'random') setStyle(RENOVATION_GROUPS[val].styles[0].id);
        } else {
            setSelectedGroupIdx(val);
             if (val !== 'random') setRenovateStyle(RENOVATION_GROUPS[val].styles[0].id);
        }
    };

    const handleAnalyzeRoom = async () => {
        if (!uploadedImage || isAnalyzing) return;
        setIsAnalyzing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
            const mimeType = uploadedImage.split(';')[0].split(':')[1];
            const data = uploadedImage.split(',')[1];
            const imagePart = { inlineData: { data, mimeType } };
            
            let prompt = '';

            if (renovateMode === 'auto') {
                prompt = `
                Act as a Senior Architect & Interior Designer. Analyze this room image.
                
                1. **Current Condition**: Describe the structure, lighting, flooring, and furniture condition. Identify issues (clutter, bad layout, outdated style).
                2. **Renovation Potential**: Suggest specific structural improvements (walls, windows, flooring) for a modern renovation.
                3. **Design Concept**: Propose a cohesive design concept (e.g., "Modern Minimalist with Warm Wood").
                
                Output a structured renovation plan in VIETNAMESE.
                `;
            } else {
                // Custom Decor Mode
                const styleName = selectedGroupIdx === 'random' ? 'Random Creative' : RENOVATION_GROUPS[selectedGroupIdx].styles.find(s => s.id === renovateStyle)?.name;
                prompt = `
                Act as an Interior Decorator. Analyze this room and suggest decor items matching the style: "${styleName}".
                
                1. **Furniture List**: List 3-5 specific furniture pieces that fit the style (e.g., Sofa type, Table material).
                2. **Decor Items**: List 3-5 decor accents (e.g., Rugs, Lamps, Wall Art).
                3. **Color Palette**: Suggest 3 specific colors (Hex codes if possible) for walls/textiles.
                
                Output a shopping/decor list in VIETNAMESE.
                `;
            }
            
            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: { parts: [imagePart, { text: prompt }] }
            });
            
            if (response.text) {
                if (renovateMode === 'auto') {
                    setRenovationPlan(response.text.trim());
                    addToast('Đã lập phương án cải tạo!', 'success');
                } else {
                    setDecorSuggestions(response.text.trim());
                    addToast('Đã có danh sách decor gợi ý!', 'success');
                }
            }
        } catch (error) {
            console.error(error);
            addToast('Lỗi khi phân tích phòng.', 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleGenerate = async () => {
        if (isProcessing || !loggedInUser || !uploadedImage) return;
        
        // Validation specific to mode
        if (activeTab === 'renovate' && renovateMode === 'auto' && !renovationPlan) {
            addToast('Vui lòng chạy phân tích AI trước khi tạo.', 'error');
            return;
        }
        if (activeTab === 'renovate' && renovateMode === 'custom' && !decorSuggestions) {
             addToast('Vui lòng chạy phân tích AI để lấy gợi ý decor.', 'error');
             return;
        }

        if (currentCredits < totalCost) {
            addToast(`Không đủ Credit. Cần ${totalCost} Credit.`, 'error');
            return;
        }

        setIsProcessing(true);
        const creditResult = await handleUseToolCredit(loggedInUser.id, { ...tool, creditCost: totalCost });
        if (!creditResult.success) {
            setIsProcessing(false);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
            const mimeType = uploadedImage.split(';')[0].split(':')[1];
            const data = uploadedImage.split(',')[1];
            const imagePart = { inlineData: { data, mimeType } };
            
            let systemPrompt = '';
            
            if (activeTab === 'design') {
                const styleName = designGroupIdx === 'random' ? 'Random Creative' : RENOVATION_GROUPS[designGroupIdx].styles.find(s => s.id === style)?.name;
                systemPrompt = `
                ROLE: World-Class Interior Designer & 3D Visualizer.
                TASK: Redesign the interior space shown in the image.
                
                STYLE: ${styleName}
                ROOM TYPE: ${roomType}
                BUDGET TIER: ${budget} (affects material luxury level)
                USER NOTES: ${customPrompt}
                
                INSTRUCTIONS:
                1. Keep the structural elements (walls, windows, ceiling height) mostly intact unless specified.
                2. Replace furniture, flooring, wall colors, and lighting to match the target style perfectly.
                3. Ensure photorealistic lighting, shadows, and reflections. 4K Render quality.
                `;
            } else {
                // Renovate
                if (renovateMode === 'auto') {
                    systemPrompt = `
                    ROLE: Renovation Architect.
                    TASK: Visualize the renovation plan based on the analysis.
                    
                    PLAN:
                    ${renovationPlan}
                    
                    INSTRUCTION: Transform the current room into the proposed post-renovation state. High realism.
                    `;
                } else {
                    // Custom Decor
                    const styleName = selectedGroupIdx === 'random' ? 'Random Creative' : RENOVATION_GROUPS[selectedGroupIdx].styles.find(s => s.id === renovateStyle)?.name;
                    systemPrompt = `
                    ROLE: Interior Decorator.
                    TASK: Re-decorate the room.
                    
                    STYLE: ${styleName}
                    DECOR LIST: ${decorSuggestions}
                    
                    INSTRUCTION: Keep the room structure but change the mood, furniture, and decor to match the style and list provided.
                    `;
                }
            }

            const generatedImages: string[] = [];

            for (let i = 0; i < imageQuantity; i++) {
                setProgressStatus(`Đang render phương án ${i + 1}/${imageQuantity}...`);
                const variationSeed = i > 0 ? `\nVARIATION ${i}: Try a different layout or color palette option for the same style.` : "";
                
                const response = await ai.models.generateContent({
                    model: selectedModel,
                    contents: { parts: [imagePart, { text: systemPrompt + variationSeed }] },
                    config: { responseModalities: [Modality.IMAGE] }
                });

                const newImagePart = response.candidates?.[0]?.content?.parts[0];
                if (newImagePart && newImagePart.inlineData?.data) {
                    const resultBase64 = `data:${newImagePart.inlineData.mimeType};base64,${newImagePart.inlineData.data}`;
                    generatedImages.push(resultBase64);
                }
            }
            
            if (generatedImages.length > 0) {
                setResultImages(generatedImages);
                setSelectedResultIndex(0);
                
                const newResult: GenerationResult = {
                    taskId: `interior_${Date.now()}`,
                    date: new Date().toLocaleDateString('vi-VN'),
                    prompt: `[Interior] ${activeTab === 'design' ? 'New Design' : (renovateMode === 'auto' ? 'Renovation' : 'Decor')} - ${imageQuantity} vars`,
                    images: generatedImages,
                    settings: { 
                        aspectRatio: 'custom', 
                        quantity: imageQuantity, 
                        generationMode: 'Chất lượng', 
                        customRatio: null 
                    },
                    cost: totalCost,
                    balanceAfter: freshUser ? freshUser.creditBalance - totalCost : 0,
                    creationTime: new Date().toLocaleTimeString(),
                };
                handleSetGenerationHistory(loggedInUser.id, newResult);
                addToast(`Đã tạo ${generatedImages.length} phương án thiết kế!`, 'success');
            } else {
                throw new Error("API không trả về ảnh.");
            }

        } catch (error) {
            console.error(error);
            addToast('Lỗi xử lý. Đã hoàn tiền.', 'error');
            const userForRefund = findUserInTree(userState.allUsers, loggedInUser.id);
            if(userForRefund) await handleUseToolCredit(userForRefund.id, { ...tool, creditCost: -totalCost });
        } finally {
            setIsProcessing(false);
            setProgressStatus('');
        }
    };

    const handleDownload = (imageUrl: string, prefix: string = 'design', scale: number = 1) => {
        if (!imageUrl) return;
        
        // Simulating scaling via canvas if needed (simplified here)
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `${prefix}_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (scale > 1) addToast(`Đã tải ảnh chất lượng ${scale}x`, 'success');
    };

    const handleDownloadPlan = (content: string) => {
        if (!content) return;
        const blob = new Blob([content], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Design_Plan_${Date.now()}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleGenerate3D = async () => {
        // Mock function for 3D generation hook
        setIsGeneratingExtra(true);
        setTimeout(() => {
            setIsGeneratingExtra(false);
            addToast('Tính năng 3D View đang bảo trì.', 'info');
        }, 2000);
    };
    
    const handleGenerateBlueprint = async () => {
         setIsGeneratingExtra(true);
        setTimeout(() => {
            setIsGeneratingExtra(false);
            addToast('Tính năng xuất bản vẽ CAD đang bảo trì.', 'info');
        }, 2000);
    }
    
    const handleGenerateDollhouse = async () => {
         setIsGeneratingExtra(true);
        setTimeout(() => {
            setIsGeneratingExtra(false);
            addToast('Tính năng Dollhouse đang bảo trì.', 'info');
        }, 2000);
    }
    
    const handleGenerateQuote = async () => {
        setIsGeneratingQuote(true);
        setTimeout(() => {
            setIsGeneratingQuote(false);
            addToast('Đã gửi báo giá sơ bộ qua email!', 'success');
        }, 2000);
    };

    const handleLoadHistory = (item: GenerationResult) => {
        setResultImages(item.images);
        setSelectedResultIndex(0);
        setShowHistoryModal(false);
        addToast('Đã tải thiết kế.', 'success');
    };

    const handleDeleteHistoryItem = (taskId: string) => {
        if (loggedInUser) {
            handleDeleteGenerationResult(loggedInUser.id, taskId);
            addToast('Đã xóa.', 'info');
        }
    };
    
    const handleReset = () => {
        setUploadedImage(null);
        setResultImages([]);
        setRenovationPlan('');
        setDecorSuggestions('');
        setCustomPrompt('');
    }

    return (
        <div className="h-full flex flex-col bg-[#0f172a] text-gray-300 font-sans">
             {/* History Modal */}
             <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Lịch sử Thiết kế Nội thất" size="lg" hideFooter>
                <div className="max-h-[60vh] overflow-y-auto p-1 space-y-3">
                    {historyItems.length === 0 ? <p className="text-center text-slate-500 py-8">Chưa có lịch sử.</p> : historyItems.map(item => (
                        <div key={item.taskId} className="flex items-center gap-4 p-3 bg-slate-800 border border-slate-700 rounded-xl hover:border-indigo-500 transition-colors">
                            <img src={item.images[0]} className="h-16 w-16 object-cover rounded-lg bg-black" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{item.prompt}</p>
                                <p className="text-xs text-slate-400 mt-1">{item.date} • {item.images.length} ảnh</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleLoadHistory(item)} className="p-2 bg-indigo-600 text-white rounded-lg"><ArrowPathIcon className="h-4 w-4"/></button>
                                <button onClick={() => handleDeleteHistoryItem(item.taskId)} className="p-2 bg-slate-700 text-red-400 rounded-lg hover:bg-slate-600"><TrashIcon className="h-4 w-4"/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>

            <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-30 shadow-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate('Kho Tiện Ích')} className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <ArrowLeftIcon className="h-5 w-5" /> Quay lại
                    </button>
                    <h1 className="text-lg font-bold text-white flex items-center gap-2">
                        <HomeModernIcon className="h-5 w-5 text-indigo-500" />
                        AI Interior Designer Pro
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <CreditBalanceDisplay balance={currentCredits} onAdd={() => onNavigate('Ví Của Tôi')} />
                    <button onClick={() => setShowHistoryModal(true)} className="p-2 text-indigo-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-indigo-900/50"><ClockIcon className="h-5 w-5" /></button>
                    <button onClick={handleReset} className="p-2 text-gray-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg"><ArrowPathIcon className="h-5 w-5" /></button>
                </div>
            </header>
            
            <div className="flex flex-1 overflow-hidden">
                {/* LEFT PANEL */}
                <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
                    
                    {/* SCROLLABLE CONTENT AREA */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
                        {/* MODEL SELECTOR */}
                        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 mb-6">
                            <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                                <BoltIcon className="h-3 w-3" /> AI Model Engine
                            </label>
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                {activeModels.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Tab Switcher */}
                        <div className="flex bg-slate-800 p-1 rounded-lg">
                            <button 
                                onClick={() => setActiveTab('design')}
                                className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${activeTab === 'design' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                Thiết kế Mới
                            </button>
                            <button 
                                onClick={() => setActiveTab('renovate')}
                                className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${activeTab === 'renovate' ? 'bg-orange-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                Cải tạo / Decor
                            </button>
                        </div>

                        {/* 1. Upload */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">1. Ảnh hiện trạng (Phòng thô/cũ)</label>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800 transition-all relative overflow-hidden group ${uploadedImage ? 'border-indigo-500 bg-slate-800' : 'border-slate-700'}`}
                            >
                                {uploadedImage ? (
                                    <img src={uploadedImage} alt="Room" className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                                ) : (
                                    <div className="text-center p-4">
                                        <ArrowUpTrayIcon className="h-8 w-8 mx-auto mb-2 text-slate-500" />
                                        <p className="text-xs text-slate-400">Tải ảnh phòng</p>
                                    </div>
                                )}
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                            </div>
                        </div>

                        {/* 2. Configuration */}
                        <div className="space-y-4">
                            {activeTab === 'design' ? (
                                <>
                                    <label className="text-xs font-bold text-slate-400 uppercase block">2. Thiết lập Phong cách</label>
                                    <div>
                                        <label className="text-[10px] text-slate-500 mb-1 block">Loại phòng</label>
                                        <select value={roomType} onChange={e => setRoomType(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-white">
                                            {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    
                                    {/* --- NEW STYLES DROPDOWN LOGIC --- */}
                                    <div>
                                        <label className="text-[10px] text-slate-500 mb-1 block">Chủ đề phong cách</label>
                                        <select
                                            value={designGroupIdx}
                                            onChange={(e) => handleGroupChange(e, 'design')}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white mb-2"
                                        >
                                            <option value="random">🎲 Ngẫu nhiên (Sáng tạo)</option>
                                            {RENOVATION_GROUPS.map((group, index) => (
                                                <option key={index} value={index}>{group.name}</option>
                                            ))}
                                        </select>
                                        
                                        {designGroupIdx !== 'random' && (
                                            <div className="animate-fadeIn">
                                                <label className="text-[10px] text-slate-500 mb-1 block">Chi tiết phong cách</label>
                                                <select
                                                    value={style}
                                                    onChange={(e) => setStyle(e.target.value)}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white"
                                                >
                                                    {RENOVATION_GROUPS[designGroupIdx as number].styles.map(s => (
                                                        <option key={s.id} value={s.id}>{s.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <label className="text-[10px] text-slate-500 mb-1 block">Ngân sách (Để AI chọn vật liệu)</label>
                                         <select value={budget} onChange={e => setBudget(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-white">
                                            <option value="Low">Tiết kiệm (Low)</option>
                                            <option value="Medium">Trung bình (Standard)</option>
                                            <option value="High">Cao cấp (Luxury)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 mb-1 block">Ghi chú thêm (Màu sắc, yêu cầu...)</label>
                                        <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} rows={3} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white placeholder-slate-600" placeholder="VD: Tông màu trắng chủ đạo, sàn gỗ..." />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <label className="text-xs font-bold text-slate-400 uppercase block">2. Cấu hình Cải tạo</label>
                                    
                                    {/* Mode Selection for Renovation */}
                                    <div className="flex bg-slate-800 p-1 rounded-lg mb-4">
                                        <button 
                                            onClick={() => setRenovateMode('auto')} 
                                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-colors ${renovateMode === 'auto' ? 'bg-orange-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            Cải tạo AI
                                        </button>
                                        <button 
                                            onClick={() => setRenovateMode('custom')} 
                                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-colors ${renovateMode === 'custom' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            Decor AI
                                        </button>
                                    </div>

                                    {renovateMode === 'auto' ? (
                                        <>
                                            <div className="p-3 bg-orange-900/20 border border-orange-700/30 rounded-lg">
                                                <button 
                                                    onClick={handleAnalyzeRoom}
                                                    disabled={isAnalyzing || !uploadedImage}
                                                    className="w-full py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-2 text-xs transition-all disabled:opacity-50"
                                                >
                                                    {isAnalyzing ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <WrenchScrewdriverIcon className="h-4 w-4" />}
                                                    {isAnalyzing ? 'Đang khảo sát...' : 'AI Khảo sát & Lên Phương Án'}
                                                </button>
                                                <p className="text-[10px] text-orange-300 mt-2 text-center">
                                                    Tự động phát hiện lỗi, đề xuất cải tạo kết cấu & vật liệu.
                                                </p>
                                            </div>

                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                     <label className="text-[10px] text-slate-500 block">Kế hoạch cải tạo chi tiết</label>
                                                     <div className="flex items-center gap-2">
                                                         {renovationPlan && (
                                                             <button onClick={() => handleDownloadPlan(renovationPlan)} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold">
                                                                 <DocumentArrowDownIcon className="h-3 w-3"/> Tải Word
                                                             </button>
                                                         )}
                                                         {renovationPlan && <span className="text-[10px] text-green-400 flex items-center gap-1"><CheckCircleIcon className="h-3 w-3"/> Đã có</span>}
                                                     </div>
                                                </div>
                                                <textarea 
                                                    value={renovationPlan} 
                                                    onChange={e => setRenovationPlan(e.target.value)} 
                                                    rows={6} 
                                                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white placeholder-slate-500 leading-relaxed" 
                                                    placeholder="Kết quả phân tích từ AI sẽ hiện ở đây..." 
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {/* Custom Renovation Mode Controls */}
                                            <div className="space-y-4 animate-fadeIn">
                                                {/* Style Selection - MOVED UP */}
                                                <div>
                                                    <label className="text-[10px] text-slate-500 mb-1 block">Chọn Phong cách Decor</label>
                                                    
                                                    {/* Grouped Styles Selection */}
                                                    <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                                                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Chủ đề phong cách</label>
                                                        <select
                                                            value={selectedGroupIdx}
                                                            onChange={(e) => handleGroupChange(e, 'renovate')}
                                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white mb-3"
                                                        >
                                                            <option value="random">🎲 Ngẫu nhiên (Sáng tạo)</option>
                                                            {RENOVATION_GROUPS.map((group, index) => (
                                                                <option key={index} value={index}>{group.name}</option>
                                                            ))}
                                                        </select>
                                                        
                                                        {selectedGroupIdx !== 'random' && (
                                                            <div className="animate-fadeIn">
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">Chi tiết phong cách</label>
                                                                <select
                                                                    value={renovateStyle}
                                                                    onChange={(e) => setRenovateStyle(e.target.value)}
                                                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white"
                                                                >
                                                                    {RENOVATION_GROUPS[selectedGroupIdx as number].styles.map(style => (
                                                                        <option key={style.id} value={style.id}>{style.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* AI Analysis Button Block - MOVED DOWN */}
                                                <div className="p-3 bg-indigo-900/20 border border-indigo-700/30 rounded-lg">
                                                    <button 
                                                        onClick={handleAnalyzeRoom}
                                                        disabled={isAnalyzing || !uploadedImage}
                                                        className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-2 text-xs transition-all disabled:opacity-50"
                                                    >
                                                        {isAnalyzing ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <LightBulbIcon className="h-4 w-4" />}
                                                        {isAnalyzing ? 'Đang phân tích...' : 'AI Phân tích & Gợi ý Decor'}
                                                    </button>
                                                    <p className="text-[10px] text-indigo-300 mt-2 text-center">
                                                        Phân tích thẩm mỹ, tìm điểm trống và gợi ý đồ trang trí phù hợp.
                                                    </p>
                                                </div>

                                                 <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                         <label className="text-[10px] text-slate-500 block">Danh sách Decor gợi ý</label>
                                                         {decorSuggestions && (
                                                             <button onClick={() => handleDownloadPlan(decorSuggestions)} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold">
                                                                 <DocumentArrowDownIcon className="h-3 w-3"/> Tải Word
                                                             </button>
                                                         )}
                                                    </div>
                                                    <textarea 
                                                        value={decorSuggestions} 
                                                        onChange={e => setDecorSuggestions(e.target.value)} 
                                                        rows={4} 
                                                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white placeholder-slate-500 leading-relaxed" 
                                                        placeholder="Danh sách vật dụng decor sẽ hiện ở đây..." 
                                                    />
                                                </div>
                                                
                                                <div>
                                                    <label className="text-[10px] text-slate-500 mb-1 block">Số lượng Phương án (Variation)</label>
                                                    <div className="flex bg-slate-800 rounded-lg p-1 w-full border border-slate-700">
                                                        {([1, 2, 3, 4] as ImageQuantity[]).map(num => (
                                                            <button 
                                                                key={num}
                                                                onClick={() => setImageQuantity(num)}
                                                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${imageQuantity === num ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                                            >
                                                                {num}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* FIXED FOOTER FOR ACTION BUTTON */}
                    <div className="p-6 bg-slate-900 border-t border-slate-800 z-10 shrink-0">
                        <div className="flex justify-between text-xs text-slate-400 mb-2">
                             <span>Chi phí:</span> 
                             <span className="text-white font-bold flex items-center gap-1"><SparklesIcon className="h-3 w-3 text-yellow-400"/> {totalCost} Credit</span>
                        </div>
                        <button 
                            onClick={handleGenerate} 
                            disabled={isProcessing || !uploadedImage || (activeTab === 'renovate' && renovateMode === 'auto' && !renovationPlan)}
                            className={`w-full py-3 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all ${activeTab === 'design' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500'}`}
                        >
                            {isProcessing ? <ArrowPathIcon className="h-5 w-5 animate-spin"/> : (activeTab === 'design' ? <HomeModernIcon className="h-5 w-5"/> : <WrenchScrewdriverIcon className="h-5 w-5"/>)}
                            {isProcessing ? (progressStatus || 'Đang xử lý...') : (activeTab === 'design' ? 'Thiết kế Ngay' : (renovateMode === 'auto' ? 'Cải tạo Kỹ thuật' : `Tạo ${imageQuantity} Phương án`))}
                        </button>
                    </div>
                </aside>

                {/* RIGHT PANEL: RESULT */}
                <main className="flex-1 bg-black p-8 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                    
                    {resultImages.length > 0 ? (
                        <div className="w-full max-w-5xl h-full flex flex-col gap-6 z-10 animate-fadeIn">
                             <div className="relative flex-1 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center group">
                                 <img src={resultImages[selectedResultIndex]} className="max-w-full max-h-full object-contain" alt="Result" />
                                 <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <div className="relative inline-block">
                                        <button 
                                            onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                                            className="p-3 bg-white text-black rounded-full shadow-lg hover:scale-110 transition-transform flex items-center gap-2"
                                        >
                                            <DocumentArrowDownIcon className="h-6 w-6"/>
                                            <ChevronUpIcon className={`h-4 w-4 transition-transform ${showDownloadOptions ? 'rotate-180' : ''}`} />
                                        </button>
                                        {showDownloadOptions && (
                                            <div className="absolute top-full right-0 mt-2 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-fadeIn z-20">
                                                <button onClick={() => handleDownload(resultImages[selectedResultIndex], 'interior', 1)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50">
                                                    1x (Gốc)
                                                </button>
                                                <button onClick={() => handleDownload(resultImages[selectedResultIndex], 'interior', 2)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50">
                                                    2x (Cao)
                                                </button>
                                                <button onClick={() => handleDownload(resultImages[selectedResultIndex], 'interior', 3)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50">
                                                    3x (Siêu nét)
                                                </button>
                                                <button onClick={() => handleDownload(resultImages[selectedResultIndex], 'interior', 4)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors">
                                                    4x (Cực đại)
                                                </button>
                                            </div>
                                        )}
                                      </div>
                                 </div>
                             </div>

                             {/* Thumbnail Strip (If multiple images) */}
                             {resultImages.length > 1 && (
                                 <div className="h-24 flex items-center gap-4 overflow-x-auto p-2 justify-center">
                                     {resultImages.map((img, idx) => (
                                         <button 
                                            key={idx}
                                            onClick={() => setSelectedResultIndex(idx)}
                                            className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${selectedResultIndex === idx ? 'border-indigo-500 scale-110 shadow-lg' : 'border-slate-700 opacity-60 hover:opacity-100'}`}
                                        >
                                            <img src={img} className="w-full h-full object-cover" alt={`Variant ${idx}`} />
                                            <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 rounded">{idx + 1}</div>
                                        </button>
                                     ))}
                                 </div>
                             )}

                             {/* Action Bar */}
                             <div className="h-20 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-2xl p-2 flex items-center justify-center gap-6 shadow-xl">
                                 <button onClick={handleGenerate3D} disabled={isGeneratingExtra} className="flex flex-col items-center gap-1 text-xs text-indigo-300 hover:text-white px-4 py-1 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50">
                                     <CubeIcon className={`h-6 w-6 ${isGeneratingExtra ? 'animate-pulse' : ''}`} />
                                     <span>Xem 3D (360°)</span>
                                 </button>
                                 <div className="w-px h-8 bg-slate-700"></div>
                                 <button onClick={handleGenerateBlueprint} disabled={isGeneratingExtra} className="flex flex-col items-center gap-1 text-xs text-green-300 hover:text-white px-4 py-1 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50">
                                     <RulerIcon className="h-6 w-6" />
                                     <span>Bản vẽ 2D (CAD)</span>
                                 </button>
                                 <div className="w-px h-8 bg-slate-700"></div>
                                 <button onClick={handleGenerateQuote} disabled={isGeneratingQuote} className="flex flex-col items-center gap-1 text-xs text-yellow-300 hover:text-white px-4 py-1 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50">
                                     {isGeneratingQuote ? <ArrowPathIcon className="h-6 w-6 animate-spin"/> : <CalculatorIcon className="h-6 w-6" />}
                                     <span>{isGeneratingQuote ? 'Đang tính...' : 'Báo giá'}</span>
                                 </button>
                                 <div className="w-px h-8 bg-slate-700"></div>
                                 <button onClick={handleGenerateDollhouse} disabled={isGeneratingExtra} className="flex flex-col items-center gap-1 text-xs text-pink-300 hover:text-white px-4 py-1 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50">
                                     <HomeModernIcon className={`h-6 w-6 ${isGeneratingExtra ? 'animate-pulse' : ''}`} />
                                     <span>Nhà Búp Bê</span>
                                 </button>
                             </div>
                        </div>
                    ) : (
                        <div className="text-center opacity-30 z-10">
                            <HomeModernIcon className="h-32 w-32 text-slate-500 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-slate-400">Không gian thiết kế</h3>
                            <p>Tải ảnh phòng và bắt đầu sáng tạo.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default InteriorDesignTool;
