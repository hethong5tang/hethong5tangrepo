
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { 
    ArrowLeftIcon, SparklesIcon, DocumentArrowDownIcon, 
    PhotoIcon, CheckCircleIcon, TrashIcon, ArrowPathIcon, 
    UserGroupIcon, ClockIcon, PlusIcon,
    ChevronUpIcon, MagnifyingGlassIcon, MapPinIcon,
    ArrowUpTrayIcon, UserIcon, XCircleIcon, PaintBrushIcon,
    ChatBubbleBottomCenterTextIcon, CheckIcon, BoltIcon
} from '../Icons';
import { IntegrationTool } from '../../features/settings/types';
import { useAuth } from '../../features/auth/useAuth';
import { useUser } from '../../features/users/useUser';
import { useActions } from '../../features/actions/useActions';
import { useToast } from '../../components/ToastProvider';
import { useSettings } from '../../features/settings/useSettings';
import { ALL_GEMINI_MODELS } from '../../constants';
import { findUserInTree } from '../../services/userService';
import { GenerationResult, ImageQuantity } from '../../features/users/types';
import CreditBalanceDisplay from './CreditBalanceDisplay';
import Modal from '../../components/Modal';
import { ensureSupportedImageFormat } from '../../utils/imageProcessing';

interface ImageMixerToolProps {
    tool: IntegrationTool;
    onNavigate: (page: string) => void;
}

const ImageMixerTool: React.FC<ImageMixerToolProps> = ({ tool, onNavigate }) => {
    const { loggedInUser } = useAuth();
    const { userState } = useUser();
    const { handleUseToolCredit, handleSetGenerationHistory, handleDeleteGenerationResult } = useActions();
    const { addToast } = useToast();
    const { settingsState } = useSettings();

    // UseMemo for active models
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

    // --- STATE ---
    // bgMode 'upload' means user wants to provide a background image. 'prompt' means AI generates it.
    // Default to 'prompt' (AI generation) as it's more magical/default behavior now.
    const [bgMode, setBgMode] = useState<'upload' | 'prompt'>('prompt');
    const [bgImage, setBgImage] = useState<string | null>(null);
    const [bgPrompt, setBgPrompt] = useState<string>('');
    const [subjectImages, setSubjectImages] = useState<string[]>([]);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [imageQuantity, setImageQuantity] = useState<ImageQuantity>(1);

    const [selectedModel, setSelectedModel] = useState<string>(activeModels[0].id);

    useEffect(() => {
        if (!activeModels.some(m => m.id === selectedModel)) {
            setSelectedModel(activeModels[0].id);
        }
    }, [activeModels, selectedModel]);

    const [isProcessing, setIsProcessing] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showDownloadOptions, setShowDownloadOptions] = useState(false);
    
    // Refs
    const bgInputRef = useRef<HTMLInputElement>(null);
    const subjectInputRef = useRef<HTMLInputElement>(null);

    const freshUser = useMemo(() => loggedInUser ? findUserInTree(userState.allUsers, loggedInUser.id) : null, [userState.allUsers, loggedInUser]);
    const currentCredits = freshUser ? freshUser.creditBalance : 0;
    
    // Cost
    const totalCost = tool.creditCost * imageQuantity;

    // History Items
    const historyItems = useMemo(() => {
        if (!loggedInUser?.generationHistory) return [];
        return loggedInUser.generationHistory
            .filter(h => h.taskId.startsWith('mixer_'))
            .sort((a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime());
    }, [loggedInUser]);

    // Local Storage Persistence
    const storageKey = useMemo(() => `tool_image_mixer_session_${loggedInUser?.id}`, [loggedInUser]);

    useEffect(() => {
        const loadSession = () => {
            try {
                const savedSession = localStorage.getItem(storageKey);
                if (savedSession) {
                    const data = JSON.parse(savedSession);
                    if (data.bgMode) setBgMode(data.bgMode);
                    if (data.bgImage) setBgImage(data.bgImage);
                    if (data.bgPrompt) setBgPrompt(data.bgPrompt);
                    if (data.subjectImages) setSubjectImages(data.subjectImages);
                    if (data.resultImage) setResultImage(data.resultImage);
                }
            } catch (e) { console.error("Failed to load session", e); }
        };
        loadSession();
    }, [storageKey]);

    useEffect(() => {
        const saveSession = () => {
            try {
                const data = { bgMode, bgImage, bgPrompt, subjectImages, resultImage };
                localStorage.setItem(storageKey, JSON.stringify(data));
            } catch (e) { console.error("Quota exceeded", e); }
        };
        const timeout = setTimeout(saveSession, 1000);
        return () => clearTimeout(timeout);
    }, [bgMode, bgImage, bgPrompt, subjectImages, resultImage, storageKey]);

    const handleResetSession = () => {
        if (window.confirm("Xóa toàn bộ phiên làm việc hiện tại?")) {
            localStorage.removeItem(storageKey);
            setBgImage(null);
            setBgPrompt('');
            setSubjectImages([]);
            setResultImage(null);
            setBgMode('prompt');
            addToast('Đã làm mới.', 'success');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'bg' | 'subject') => {
        if (e.target.files && e.target.files.length > 0) {
            (Array.from(e.target.files) as File[]).forEach(file => {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    if (event.target?.result) {
                        const res = await ensureSupportedImageFormat(event.target.result as string);
                        if (type === 'bg') {
                            setBgImage(res);
                        } else {
                            setSubjectImages(prev => [...prev, res]);
                        }
                    }
                };
                reader.readAsDataURL(file);
            });
        }
        e.target.value = '';
    };

    const handleRemoveSubject = (index: number) => {
        setSubjectImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleGenerate = async () => {
        if (isProcessing || !loggedInUser) return;
        
        // Validation
        if (!bgPrompt.trim()) {
             addToast('Vui lòng mô tả ý tưởng/kịch bản của bức ảnh.', 'error');
             return;
        }

        if (bgMode === 'upload' && !bgImage) {
            addToast('Bạn đã chọn chế độ tải ảnh nền nhưng chưa tải ảnh.', 'error');
            return;
        }

        if (subjectImages.length === 0) {
            addToast('Vui lòng thêm ít nhất một chủ thể (người/vật).', 'error');
            return;
        }

        if (currentCredits < totalCost) {
            addToast(`Không đủ Credit. Cần ${totalCost} Credit.`, 'error');
            return;
        }

        setIsProcessing(true);
        const creditResult = await handleUseToolCredit(loggedInUser.id, { ...tool, creditCost: totalCost });
        if (!creditResult.success) { setIsProcessing(false); return; }

        try {
            const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
            
            // Build Inputs
            const parts: any[] = [];
            let instructions = "";
            let inputCounter = 1;

            // 1. Background (Optional)
            if (bgMode === 'upload' && bgImage) {
                const bgMime = bgImage.split(';')[0].split(':')[1];
                const bgData = bgImage.split(',')[1];
                parts.push({ inlineData: { data: bgData, mimeType: bgMime } });
                instructions += `- **INPUT IMAGE ${inputCounter}**: BACKGROUND SCENE. Use this environment as the base.\n`;
                inputCounter++;
            } else {
                 instructions += `- **BACKGROUND**: Generate a new scene based on the Context Description.\n`;
            }

            // 2. Subjects
            subjectImages.forEach((img, idx) => {
                const mimeType = img.split(';')[0].split(':')[1];
                const data = img.split(',')[1];
                parts.push({ inlineData: { data, mimeType } });
                instructions += `- **INPUT IMAGE ${inputCounter}**: SUBJECT ${idx + 1}. Isolate this subject (remove original background).\n`;
                inputCounter++;
            });

            const systemPrompt = `
            **SYSTEM ROLE**: Expert Digital Compositor & VFX Artist (Hollywood Level).
            **TASK**: Multi-Subject Composition into a Scene.
            
            **INPUTS**:
            ${instructions}

            **CONTEXT DESCRIPTION (PROMPT)**:
            "${bgPrompt}"

            **CRITICAL EXECUTION PROTOCOL (PHOTOREALISM)**:
            
            1.  **SCENE UNDERSTANDING**: 
                - If a Background Image is provided, analyze its lighting, perspective, and depth.
                - If NO Background Image is provided, GENERATE a high-quality scene matching the Context Description.

            2.  **ACTION & INTERACTION**:
                - Place the subjects according to the Context Description (e.g., walking, sitting, talking).
                - Do NOT just paste them in the center. Make them interact with the environment.

            3.  **RELIGHTING (Crucial)**: 
                - Analyze the Light Source Direction of the final scene.
                - **RE-LIGHT** the Subject(s) to match this direction exactly. 
                - If the background is backlit/sunset, the subject MUST be in shadow/silhouette or rim-lit.
                - If the background has strong side light, the subject face must show corresponding shadows.

            4.  **PHYSICS & SHADOWS**:
                - **Contact Shadows**: Generate dark, sharp, grounding shadows immediately under the feet/base/body. NO FLOATY SUBJECTS.
                - **Cast Shadows**: Generate realistic shadows extending away from the light source.

            5.  **COLOR GRADING & BLENDING**:
                - Match the subject's white balance (warm/cool) to the background scene.
                - Allow background light to "wrap" slightly around the edges of the subject (Light Wrap).

            **OUTPUT**: A single, cohesive, photorealistic photograph where the subjects look like they were physically present at the scene.
            `;

            const response = await ai.models.generateContent({
                model: selectedModel,
                contents: { parts: [...parts, { text: systemPrompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const newImagePart = response.candidates?.[0]?.content?.parts[0];
            if (newImagePart && newImagePart.inlineData?.data) {
                const resultBase64 = `data:${newImagePart.inlineData.mimeType};base64,${newImagePart.inlineData.data}`;
                setResultImage(resultBase64);
                
                const newResult: GenerationResult = {
                    taskId: `mixer_${Date.now()}`,
                    date: new Date().toLocaleDateString('vi-VN'),
                    prompt: `[Mixer] ${bgPrompt.substring(0, 30)}...`,
                    images: [resultBase64],
                    settings: { aspectRatio: 'custom', customRatio: null, quantity: 1, generationMode: 'Chất lượng', imageStyle: 'Realism' },
                    cost: totalCost,
                    balanceAfter: freshUser ? freshUser.creditBalance - totalCost : 0,
                    creationTime: new Date().toLocaleTimeString(),
                };
                handleSetGenerationHistory(loggedInUser.id, newResult);
                addToast('Ghép ảnh thành công!', 'success');
            } else {
                throw new Error("API không trả về ảnh.");
            }

        } catch (error) {
            console.error("Error:", error);
            addToast('Lỗi xử lý, đã hoàn lại Credit.', 'error');
            const userForRefund = findUserInTree(userState.allUsers, loggedInUser.id);
            if(userForRefund) await handleUseToolCredit(userForRefund.id, { ...tool, creditCost: -totalCost });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = (scale: number = 1) => {
        if (!resultImage) return;
        
        if (scale === 1) {
            const link = document.createElement('a');
            link.href = resultImage;
            link.download = `mixer_result_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
             const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = resultImage;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth * scale;
                canvas.height = img.naturalHeight * scale;
                const ctx = canvas.getContext('2d');
                if(ctx) {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const link = document.createElement('a');
                    link.href = canvas.toDataURL('image/png');
                    link.download = `mixer_result_${scale}x.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    addToast(`Đã tải xuống ảnh kích thước x${scale}`, 'success');
                }
            };
        }
        setShowDownloadOptions(false);
    };

    const handleLoadHistoryItem = (item: GenerationResult) => {
        setResultImage(item.images[0]);
        setShowHistoryModal(false);
        addToast('Đã tải kết quả từ lịch sử.', 'success');
    };

    const handleDeleteHistoryItem = (taskId: string) => {
        if (loggedInUser) {
            handleDeleteGenerationResult(loggedInUser.id, taskId);
            addToast('Đã xóa.', 'info');
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-950 text-gray-300 font-sans">
             {/* HISTORY MODAL */}
             <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Lịch sử Ghép Ảnh" size="lg" hideFooter>
                <div className="max-h-[60vh] overflow-y-auto p-1 space-y-3">
                    {historyItems.length === 0 ? <p className="text-center text-slate-500 py-8">Chưa có lịch sử.</p> : historyItems.map(item => (
                        <div key={item.taskId} className="flex items-center gap-4 p-3 bg-slate-800 border border-slate-700 rounded-xl hover:border-indigo-500 transition-colors">
                            <img src={item.images[0]} className="h-16 w-16 object-cover rounded-lg bg-black" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{item.prompt}</p>
                                <p className="text-xs text-slate-400 mt-1">{item.date} • {item.creationTime}</p>
                            </div>
                            <button onClick={() => handleLoadHistoryItem(item)} className="p-2 bg-indigo-600 text-white rounded-lg"><ArrowPathIcon className="h-4 w-4"/></button>
                            <button onClick={() => handleDeleteHistoryItem(item.taskId)} className="p-2 bg-slate-700 text-red-400 rounded-lg hover:bg-slate-600"><TrashIcon className="h-4 w-4"/></button>
                        </div>
                    ))}
                </div>
            </Modal>

            <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-30 shadow-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate('Kho Tiện Ích')} className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <ArrowLeftIcon className="h-5 w-5" /> Quay lại
                    </button>
                    <h1 className="text-lg font-bold text-white flex items-center gap-2">
                        <UserGroupIcon className="h-5 w-5 text-indigo-500" />
                        Ghép Ảnh Đa Năng AI
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <CreditBalanceDisplay balance={currentCredits} onAdd={() => onNavigate('Ví Của Tôi')} />
                    <button onClick={() => setShowHistoryModal(true)} className="p-2 text-indigo-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-indigo-900/50"><ClockIcon className="h-5 w-5" /></button>
                    <button onClick={handleResetSession} className="p-2 text-gray-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg"><ArrowPathIcon className="h-5 w-5" /></button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* LEFT PANEL */}
                <aside className="w-96 bg-slate-900 border-r border-slate-800 flex flex-col overflow-y-auto p-6 space-y-8">
                    
                    {/* MODEL SELECTOR */}
                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 mb-2">
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

                    {/* 1. Subjects (Moved Up) */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-pink-400 uppercase tracking-wider flex items-center gap-2">
                                <UserGroupIcon className="h-4 w-4"/> 1. Chủ thể ({subjectImages.length})
                            </label>
                            <button onClick={() => subjectInputRef.current?.click()} className="text-[10px] bg-pink-900/30 text-pink-300 px-2 py-1 rounded hover:bg-pink-900/50 flex items-center gap-1 transition-colors">
                                <PlusIcon className="h-3 w-3"/> Thêm
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            {subjectImages.map((img, idx) => (
                                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-700 group bg-black">
                                    <img src={img} className="w-full h-full object-cover" />
                                    <button onClick={() => handleRemoveSubject(idx)} className="absolute top-1 right-1 bg-red-600 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="h-3 w-3"/></button>
                                    <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 rounded">{idx + 1}</div>
                                </div>
                            ))}
                            <div 
                                onClick={() => subjectInputRef.current?.click()}
                                className="aspect-square border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-pink-500 hover:bg-slate-800 transition-colors text-slate-500 group"
                            >
                                <div className="p-2 rounded-full bg-slate-800 group-hover:bg-pink-900/20 mb-1 transition-colors">
                                    <PlusIcon className="h-5 w-5 text-slate-500 group-hover:text-pink-400" />
                                </div>
                                <span className="text-[10px]">Thêm Người/Vật</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-500">AI sẽ tự động tách nền từng chủ thể.</p>
                        <input type="file" ref={subjectInputRef} onChange={(e) => handleFileUpload(e, 'subject')} className="hidden" accept="image/*" multiple />
                    </div>

                    {/* 2. BACKGROUND IMAGE (OPTIONAL) */}
                    <div className="space-y-4 pt-6 border-t border-slate-800">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <MapPinIcon className="h-4 w-4 text-indigo-400"/> 2. Ảnh Nền (Tùy chọn)
                            </label>
                            
                            <div className="flex items-center">
                                <button
                                    type="button"
                                    onClick={() => setBgMode(prev => prev === 'upload' ? 'prompt' : 'upload')}
                                    className={`${bgMode === 'upload' ? 'bg-indigo-600' : 'bg-gray-700'} relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                                >
                                    <span className={`${bgMode === 'upload' ? 'translate-x-4' : 'translate-x-0'} pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                                </button>
                                <span className="ml-2 text-xs text-slate-400 cursor-pointer" onClick={() => setBgMode(prev => prev === 'upload' ? 'prompt' : 'upload')}>Dùng ảnh có sẵn</span>
                            </div>
                        </div>

                        {bgMode === 'upload' && (
                            <div className="animate-fadeIn">
                                <div 
                                    onClick={() => bgInputRef.current?.click()}
                                    className={`h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${bgImage ? 'border-indigo-500 bg-slate-800' : 'border-slate-700 hover:border-indigo-500 hover:bg-slate-800'}`}
                                >
                                    {bgImage ? (
                                        <>
                                            <img src={bgImage} alt="BG" className="w-full h-full object-cover opacity-80" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <span className="text-xs text-white font-medium">Đổi ảnh</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center p-2">
                                            <PhotoIcon className="h-6 w-6 mx-auto mb-1 text-slate-500" />
                                            <p className="text-xs font-medium text-slate-400">Tải ảnh nền</p>
                                        </div>
                                    )}
                                    <input type="file" ref={bgInputRef} onChange={(e) => handleFileUpload(e, 'bg')} className="hidden" accept="image/*" />
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* 3. SCENE DESCRIPTION & CONTEXT (Moved Down) */}
                    <div className="space-y-4 pt-6 border-t border-slate-800">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <ChatBubbleBottomCenterTextIcon className="h-4 w-4 text-indigo-400"/> 3. Kịch bản & Bối cảnh (Prompt)
                        </label>
                        <div className="space-y-2 animate-fadeIn">
                            <textarea 
                                value={bgPrompt}
                                onChange={(e) => setBgPrompt(e.target.value)}
                                rows={5}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none placeholder-slate-500"
                                placeholder="Mô tả chi tiết bối cảnh và hành động của các chủ thể. (VD: Các chủ thể đang cắm trại trong rừng thông, ánh nắng chiều chiếu vào, hoặc đang ngồi họp trong văn phòng kính...)"
                            />
                            <p className="text-[10px] text-slate-500">
                                💡 Mô tả càng chi tiết về hành động và môi trường, AI ghép càng tự nhiên. AI sẽ dùng mô tả này để tạo nền (nếu không có ảnh) và điều chỉnh ánh sáng chủ thể.
                            </p>
                        </div>
                    </div>

                    {/* Action */}
                    <div className="mt-auto pt-6 border-t border-slate-800">
                         <div className="flex justify-between items-center mb-3 text-xs">
                            <span className="text-slate-400">Chi phí:</span>
                            <span className="font-bold text-white flex items-center gap-1"><SparklesIcon className="h-3 w-3 text-yellow-400"/> {totalCost} Credit</span>
                        </div>
                        <button 
                            onClick={handleGenerate}
                            disabled={isProcessing || !bgPrompt.trim() || subjectImages.length === 0}
                            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform active:scale-95"
                        >
                            {isProcessing ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <PaintBrushIcon className="h-5 w-5" />}
                            {isProcessing ? 'Đang ghép...' : 'Ghép Ảnh Ngay'}
                        </button>
                    </div>
                </aside>

                {/* RIGHT PANEL: RESULT */}
                <main className="flex-1 bg-black p-8 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                    
                    {resultImage ? (
                        <div className="max-w-5xl w-full h-full flex flex-col gap-6 z-10 animate-fadeIn">
                             <div className="flex justify-between items-center bg-slate-900/80 backdrop-blur-md p-3 rounded-xl border border-slate-800 relative z-50">
                                <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
                                    <CheckCircleIcon className="h-5 w-5" /> Kết quả
                                </h3>
                                <div className="relative">
                                    <button onClick={() => setShowDownloadOptions(!showDownloadOptions)} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 shadow-lg transition-colors">
                                        <DocumentArrowDownIcon className="h-4 w-4" /> Tải xuống <ChevronUpIcon className={`h-3 w-3 transition-transform ${showDownloadOptions ? 'rotate-180' : ''}`} />
                                    </button>
                                     {showDownloadOptions && (
                                        <div className="absolute top-full right-0 mt-2 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-fadeIn z-20">
                                            <button onClick={() => handleDownload(1)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50">1x (Gốc)</button>
                                            <button onClick={() => handleDownload(2)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50">2x (Cao)</button>
                                            <button onClick={() => handleDownload(4)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors">4x (Cực đại)</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex-1 bg-black/40 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden shadow-2xl">
                                <img src={resultImage} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
                            </div>
                        </div>
                    ) : (
                         <div className="text-center space-y-4 opacity-30 z-10">
                            <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-slate-700">
                                <UserGroupIcon className="h-10 w-10 text-slate-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-400">Không gian trống</h3>
                                <p className="text-slate-600 mt-1">Viết kịch bản và chọn chủ thể để bắt đầu.</p>
                            </div>
                        </div>
                    )}

                    {isProcessing && (
                         <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fadeIn">
                             <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                             <p className="text-white font-bold text-lg">AI đang xử lý & ghép ảnh...</p>
                         </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ImageMixerTool;
