
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { 
    ArrowLeftIcon, SparklesIcon, DocumentArrowDownIcon, 
    PhotoIcon, CheckCircleIcon, TrashIcon, ArrowPathIcon, 
    EraserIcon, ClockIcon, SwatchIcon, PaintBrushIcon,
    ArrowUpTrayIcon, CheckIcon, ArrowsRightLeftIcon,
    MagnifyingGlassIcon, ChevronUpIcon, BoltIcon
} from '../Icons';
import { IntegrationTool } from '../../features/settings/types';
import { useAuth } from '../../features/auth/useAuth';
import { useUser } from '../../features/users/useUser';
import { useActions } from '../../features/actions/useActions';
import { useToast } from '../../components/ToastProvider';
import { findUserInTree } from '../../services/userService';
import { GenerationResult } from '../../features/users/types';
import CreditBalanceDisplay from './CreditBalanceDisplay';
import Modal from '../../components/Modal';
import { ColorPickerCircle } from './video-editor/VideoEditorUI';
import { processGreenScreenRemoval } from '../../utils/imageProcessing';
import { useSettings } from '../../features/settings/useSettings';
import { ALL_GEMINI_MODELS } from '../../constants';

interface AiBackgroundRemoverPageProps {
    tool: IntegrationTool;
    onNavigate: (page: string) => void;
}

const AiBackgroundRemoverPage: React.FC<AiBackgroundRemoverPageProps> = ({ tool, onNavigate }) => {
    const { loggedInUser } = useAuth();
    const { userState } = useUser();
    const { handleUseToolCredit, handleSetGenerationHistory, handleDeleteGenerationResult } = useActions();
    const { addToast } = useToast();
    const { settingsState } = useSettings();

    // UseMemo for models
    const activeModels = useMemo(() => {
        // Ưu tiên các model được bật riêng cho công cụ này trong Admin (modelPricing)
        const toolSpecificModels = tool.modelPricing ? Object.keys(tool.modelPricing) : [];
        if (toolSpecificModels.length > 0) {
            const toolFiltered = ALL_GEMINI_MODELS.filter(m => toolSpecificModels.includes(m.id) && m.category === 'image');
            if (toolFiltered.length > 0) return toolFiltered;
        }

        const activeIds = settingsState.systemSettings.activeGeminiModels || [];
        const filtered = ALL_GEMINI_MODELS.filter(m => activeIds.includes(m.id) && m.category === 'image');
        const fallback = ALL_GEMINI_MODELS.filter(m => m.category === 'image');
        return filtered.length > 0 ? filtered : (fallback.length > 0 ? [fallback[0]] : [ALL_GEMINI_MODELS[0]]);
    }, [settingsState.systemSettings.activeGeminiModels, tool.modelPricing]);

    // Use correct key from environment
    const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || '';

    // State
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Mode: Transparent, Color, Prompt
    const [mode, setMode] = useState<'transparent' | 'color' | 'prompt'>('transparent');
    const [targetColor, setTargetColor] = useState('#FFFFFF');
    const [bgPrompt, setBgPrompt] = useState('');
    const [selectedModel, setSelectedModel] = useState<string>(activeModels[0].id);

    useEffect(() => {
        if (!activeModels.some(m => m.id === selectedModel)) {
            setSelectedModel(activeModels[0].id);
        }
    }, [activeModels, selectedModel]);

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showDownloadOptions, setShowDownloadOptions] = useState(false); // New state for download menu

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Comparison Slider
    const [sliderPosition, setSliderPosition] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDraggingSlider, setIsDraggingSlider] = useState(false);

    const freshUser = useMemo(() => loggedInUser ? findUserInTree(userState.allUsers, loggedInUser.id) : null, [userState.allUsers, loggedInUser]);
    const currentCredits = freshUser ? freshUser.creditBalance : 0;
    
    // History Items
    const historyItems = useMemo(() => {
        if (!loggedInUser?.generationHistory) return [];
        return loggedInUser.generationHistory
            .filter(h => h.taskId.startsWith('rmbg_tool_'))
            .sort((a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime());
    }, [loggedInUser]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setUploadedImage(event.target.result as string);
                    setResultImage(null);
                    setSliderPosition(50);
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (isProcessing || !loggedInUser || !uploadedImage) return;
        
        if (mode === 'prompt' && !bgPrompt.trim()) {
            addToast('Vui lòng nhập mô tả nền.', 'error');
            return;
        }

        const cost = tool.creditCost;
        if (currentCredits < cost) {
            addToast(`Không đủ Credit. Cần ${cost} Credit.`, 'error');
            return;
        }

        setIsProcessing(true);
        
        const creditResult = await handleUseToolCredit(loggedInUser.id, { ...tool, creditCost: cost });
        if (!creditResult.success) {
            setIsProcessing(false);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
            const mimeType = uploadedImage.split(';')[0].split(':')[1] || 'image/png';
            const imagePart = { inlineData: { data: uploadedImage.split(',')[1], mimeType } };

            let systemInstruction = "";
            let effectiveTargetColor = targetColor;
            
            if (mode === 'transparent') {
                effectiveTargetColor = '#00FF00'; // Green screen for easy removal
            }

            if (mode === 'prompt') {
                systemInstruction = `
                TASK: Background Replacement (Generative Fill).
                INPUT: An image containing subject(s).
                OUTPUT: Keep the subject exactly as is. Replace the ENTIRE background with a new scene based on this description: "${bgPrompt}".
                
                CRITICAL RULES:
                1. **SUBJECT PRESERVATION**: Do not alter the main subject.
                2. **LIGHTING MATCH**: Ensure the new background lighting matches the subject.
                3. **REALISM**: High quality photorealistic output.
                `;
            } else {
                 systemInstruction = `
                <SYSTEM_INSTRUCTION>
                TASK: Background Replacement (Green Screen / Alpha Matte).
                INPUT: An image containing subject(s).
                OUTPUT: Keep the subject exactly as is. Replace the ENTIRE background with a SOLID PURE COLOR (Hex code: ${effectiveTargetColor}).

                CRITICAL RULES:
                1. **REMOVE FLOOR & GROUND**: You MUST replace the floor, ground, grass, or any surface the subject is standing/sitting on with the solid color.
                2. **REMOVE SHADOWS**: Cast shadows on the ground must be removed.
                3. **SUBJECT ONLY**: Isolate the main subject(s) strictly.
                4. The background must be uniform ${effectiveTargetColor}.
                5. Maintain high resolution and sharp details of the subject edges (hair, fur).
                6. Fix any existing blur or noise in the subject while replacing the background.
                </SYSTEM_INSTRUCTION>
                `;
            }

            const response = await ai.models.generateContent({
                model: selectedModel,
                contents: { parts: [imagePart, { text: systemInstruction }] },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const newImagePart = response.candidates?.[0]?.content?.parts[0];
            if (newImagePart && newImagePart.inlineData?.data) {
                let finalImage = `data:${newImagePart.inlineData.mimeType};base64,${newImagePart.inlineData.data}`;
                
                // If transparent mode, process green screen removal
                if (mode === 'transparent') {
                    finalImage = await processGreenScreenRemoval(finalImage);
                }

                setResultImage(finalImage);
                
                // Save History
                const newResult: GenerationResult = {
                    taskId: `rmbg_tool_${Date.now()}`,
                    date: new Date().toLocaleDateString('vi-VN'),
                    prompt: mode === 'transparent' ? '[Xóa Nền] Trong suốt' : (mode === 'color' ? `[Thay Nền] Màu ${targetColor}` : `[Thay Nền] ${bgPrompt}`),
                    images: [finalImage],
                    settings: { 
                        aspectRatio: 'custom', 
                        quantity: 1, 
                        generationMode: 'Chất lượng', 
                        customRatio: null 
                    },
                    cost: cost,
                    balanceAfter: freshUser ? freshUser.creditBalance - cost : 0,
                    creationTime: new Date().toLocaleTimeString(),
                };
                handleSetGenerationHistory(loggedInUser.id, newResult);
                addToast('Xử lý thành công!', 'success');
            } else {
                throw new Error("API không trả về ảnh.");
            }
        } catch (error) {
            console.error("Error:", error);
            addToast('Lỗi xử lý. Đã hoàn tiền.', 'error');
            const userForRefund = findUserInTree(userState.allUsers, loggedInUser.id);
            if(userForRefund) await handleUseToolCredit(userForRefund.id, { ...tool, creditCost: -cost });
        } finally {
            setIsProcessing(false);
        }
    };
    
    // Updated download handler with scaling
    const handleDownload = (scale: number = 1) => {
        if (!resultImage) return;

        if (scale === 1) {
            const link = document.createElement('a');
            link.href = resultImage;
            link.download = `bg_removed_${Date.now()}.png`;
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
                if (ctx) {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    const link = document.createElement('a');
                    link.href = canvas.toDataURL('image/png');
                    link.download = `bg_removed_${scale}x_${Date.now()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    addToast(`Đã tải xuống ảnh kích thước x${scale}`, 'success');
                }
            };
        }
        setShowDownloadOptions(false);
    };

    const handleLoadHistory = (item: GenerationResult) => {
        setResultImage(item.images[0]);
        // Ideally load original image too, but history usually only stores result.
        // For visual consistency we might set result as uploaded if we want to re-process, but here just viewing.
        setShowHistoryModal(false);
    };
    
    const handleDeleteHistoryItem = (taskId: string) => {
        if (loggedInUser) {
           handleDeleteGenerationResult(loggedInUser.id, taskId);
           addToast('Đã xóa.', 'info');
       }
   };

    return (
        <div className="h-full flex flex-col bg-slate-950 text-gray-300 font-sans">
             {/* History Modal */}
             <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Lịch sử Xử lý" size="lg" hideFooter>
                <div className="max-h-[60vh] overflow-y-auto p-1 space-y-3">
                    {historyItems.length === 0 ? <p className="text-center text-slate-500 py-8">Chưa có lịch sử.</p> : historyItems.map(item => (
                        <div key={item.taskId} className="flex items-center gap-4 p-3 bg-slate-800 border border-slate-700 rounded-xl hover:border-indigo-500 transition-colors">
                            <div className="w-16 h-16 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzFmMjkzNyIvPgo8cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzFmMjkzNyIvPgo8L3N2Zz4=')] rounded-lg overflow-hidden flex-shrink-0 border border-slate-700">
                                <img src={item.images[0]} className="w-full h-full object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{item.prompt}</p>
                                <p className="text-xs text-slate-400">{item.date}</p>
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
                        <EraserIcon className="h-5 w-5 text-indigo-500" />
                        Tách Nền Thông Minh AI
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <CreditBalanceDisplay balance={currentCredits} onAdd={() => onNavigate('Ví Của Tôi')} />
                    <button onClick={() => setShowHistoryModal(true)} className="p-2 text-indigo-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-indigo-900/50"><ClockIcon className="h-5 w-5" /></button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col overflow-y-auto p-6 space-y-6">
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

                    {/* 1. Upload */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">1. Ảnh Gốc</label>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800 transition-all relative overflow-hidden group ${uploadedImage ? 'border-indigo-500 bg-slate-800' : 'border-slate-700'}`}
                        >
                            {uploadedImage ? (
                                <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-contain p-2" />
                            ) : (
                                <div className="text-center p-4">
                                    <ArrowUpTrayIcon className="h-8 w-8 mx-auto mb-2 text-slate-500" />
                                    <p className="text-xs text-slate-400">Tải ảnh lên (JPG, PNG)</p>
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                        </div>
                    </div>

                    {/* 2. Options */}
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-400 uppercase block">2. Tùy chọn Xử lý</label>
                        
                        <div className="flex flex-col gap-2">
                            <button onClick={() => setMode('transparent')} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${mode === 'transparent' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-gray-400 hover:bg-slate-700'}`}>
                                <div className="w-5 h-5 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzNjM2MzYyIvPgo8cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzFmMjkzNyIvPgo8L3N2Zz4=')] rounded border border-gray-500"></div>
                                <span className="text-sm font-medium">Xóa nền (Trong suốt)</span>
                            </button>
                            
                            <button onClick={() => setMode('color')} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${mode === 'color' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-gray-400 hover:bg-slate-700'}`}>
                                <SwatchIcon className="w-5 h-5" />
                                <span className="text-sm font-medium">Thay màu nền</span>
                            </button>
                            
                            {mode === 'color' && (
                                <div className="pl-2 animate-fadeIn">
                                    <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-lg border border-slate-700">
                                        <ColorPickerCircle color={targetColor} onChange={setTargetColor} />
                                        <span className="text-xs font-mono">{targetColor}</span>
                                    </div>
                                </div>
                            )}

                            <button onClick={() => setMode('prompt')} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${mode === 'prompt' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-gray-400 hover:bg-slate-700'}`}>
                                <PaintBrushIcon className="w-5 h-5" />
                                <span className="text-sm font-medium">Thay nền bằng AI</span>
                            </button>

                            {mode === 'prompt' && (
                                <textarea 
                                    value={bgPrompt}
                                    onChange={(e) => setBgPrompt(e.target.value)}
                                    rows={3}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none animate-fadeIn"
                                    placeholder="VD: Bãi biển hoàng hôn, văn phòng hiện đại..."
                                />
                            )}
                        </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-800">
                         <div className="flex justify-between items-center mb-3 text-xs">
                            <span className="text-slate-400">Chi phí:</span>
                            <span className="font-bold text-white flex items-center gap-1"><SparklesIcon className="h-3 w-3 text-yellow-400"/> {tool.creditCost} Credit</span>
                        </div>
                        <button 
                            onClick={handleGenerate}
                            disabled={isProcessing || !uploadedImage}
                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform active:scale-95"
                        >
                            {isProcessing ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <SparklesIcon className="h-5 w-5" />}
                            {isProcessing ? 'Đang xử lý...' : 'Thực hiện ngay'}
                        </button>
                    </div>
                </aside>

                <main className="flex-1 bg-black p-8 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                    
                    {resultImage ? (
                        <div className="flex flex-col gap-6 w-full max-w-5xl h-full z-10 animate-fadeIn">
                             {/* UPDATED HEADER BAR with Z-50 */}
                             <div className="flex justify-between items-center bg-slate-900/80 backdrop-blur-md p-3 rounded-xl border border-slate-800 relative z-50">
                                <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
                                    <CheckCircleIcon className="h-5 w-5" /> Kết quả
                                </h3>
                                <div className="relative">
                                    <button 
                                        onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                                        className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 transition-colors"
                                    >
                                        <DocumentArrowDownIcon className="h-5 w-5" /> Tải xuống <ChevronUpIcon className={`h-3 w-3 transition-transform ${showDownloadOptions ? 'rotate-180' : ''}`} />
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

                            {/* Comparison Slider */}
                            <div className="flex-1 relative flex items-center justify-center overflow-hidden min-h-0">
                                <div 
                                    className="relative w-full h-full max-w-4xl max-h-[70vh] aspect-[3/4] md:aspect-video rounded-xl overflow-hidden shadow-2xl border border-slate-700 select-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzFmMjkzNyIvPgo8cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzFmMjkzNyIvPgo8L3N2Zz4=')]"
                                    ref={containerRef}
                                >
                                    <img src={resultImage} alt="Restored" className="absolute inset-0 w-full h-full object-contain" draggable={false} />
                                    
                                    <div 
                                        className="absolute inset-0 overflow-hidden border-r-2 border-white shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                                        style={{ 
                                            clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                                            transition: isDraggingSlider ? 'none' : 'clip-path 0.1s ease-out'
                                        }}
                                    >
                                         <img src={uploadedImage!} alt="Original" className="absolute inset-0 w-full h-full object-contain bg-black/50" draggable={false} />
                                    </div>

                                    {/* Slider Handle */}
                                    <div 
                                        className="absolute top-0 bottom-0 w-10 cursor-ew-resize z-20 flex items-center justify-center -ml-5"
                                        style={{ left: `${sliderPosition}%` }}
                                    >
                                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                                            <ArrowsRightLeftIcon className="h-4 w-4 text-indigo-600" />
                                        </div>
                                    </div>
                                    
                                    <input
                                        type="range"
                                        min="0" max="100"
                                        value={sliderPosition}
                                        onChange={(e) => setSliderPosition(Number(e.target.value))}
                                        onMouseDown={() => setIsDraggingSlider(true)}
                                        onMouseUp={() => setIsDraggingSlider(false)}
                                        onTouchStart={() => setIsDraggingSlider(true)}
                                        onTouchEnd={() => setIsDraggingSlider(false)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
                                    />
                                    
                                    <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded text-xs text-white">Gốc</div>
                                    <div className="absolute bottom-4 right-4 bg-indigo-600/80 px-3 py-1 rounded text-xs text-white">Kết quả</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                         <div className="text-center space-y-4 opacity-30 z-10">
                            <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-slate-700">
                                <EraserIcon className="h-10 w-10 text-slate-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-400">Chưa có ảnh</h3>
                                <p className="text-slate-600 mt-1">Tải ảnh lên và nhấn thực hiện để bắt đầu.</p>
                            </div>
                        </div>
                    )}
                    
                    {isProcessing && (
                         <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fadeIn">
                             <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                             <p className="text-white font-bold text-lg">AI đang xử lý...</p>
                         </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AiBackgroundRemoverPage;
