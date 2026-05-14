
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { ArrowLeftIcon, SparklesIcon, ArrowPathIcon, ArrowUpTrayIcon, DocumentArrowDownIcon, TrashIcon, ClockIcon, ArrowsRightLeftIcon, ChevronUpIcon, BoltIcon } from '../Icons';
import { IntegrationTool } from '../../features/settings/types';
import { useAuth } from '../../features/auth/useAuth';
import { useUser } from '../../features/users/useUser';
import { useActions } from '../../features/actions/useActions';
import { useToast } from '../../components/ToastProvider';
import { findUserInTree } from '../../services/userService';
import { GenerationResult } from '../../features/users/types';
import CreditBalanceDisplay from './CreditBalanceDisplay';
import Modal from '../../components/Modal';
import { useSettings } from '../../features/settings/useSettings';
import { ALL_GEMINI_MODELS } from '../../constants';

interface RestorationViewProps {
    tool: IntegrationTool;
    initialImage?: string | null;
    onBack?: () => void;
    onNavigate?: (page: string) => void;
}


const PhotoRestoration: React.FC<RestorationViewProps> = ({ tool, initialImage, onBack, onNavigate }) => {
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

    const [uploadedImage, setUploadedImage] = useState<string | null>(initialImage || null);
    const [isRestoring, setIsRestoring] = useState(false);
    const [colorize, setColorize] = useState(false);
    const [restoredImage, setRestoredImage] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState<string>(activeModels[0].id);

    useEffect(() => {
        if (!activeModels.some(m => m.id === selectedModel)) {
            setSelectedModel(activeModels[0].id);
        }
    }, [activeModels, selectedModel]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Comparison Slider State
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDraggingSlider, setIsDraggingSlider] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // UI State
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showDownloadOptions, setShowDownloadOptions] = useState(false);

    // Get fresh credit balance
    const freshUser = useMemo(() => loggedInUser ? findUserInTree(userState.allUsers, loggedInUser.id) : null, [userState.allUsers, loggedInUser]);
    const currentCredits = freshUser ? freshUser.creditBalance : 0;

    // Dynamic Storage Key based on User ID
    const storageKey = useMemo(() => `tool_photo_restore_session_${loggedInUser?.id}`, [loggedInUser]);

    // Get History Items
    const historyItems = useMemo(() => {
        if (!loggedInUser?.generationHistory) return [];
        return loggedInUser.generationHistory
            .filter(h => h.taskId.startsWith('rest_'))
            .sort((a, b) => {
                // Sort by timestamp in taskId (rest_12345678)
                const timeA = parseInt(a.taskId.split('_')[1] || '0');
                const timeB = parseInt(b.taskId.split('_')[1] || '0');
                return timeB - timeA;
            });
    }, [loggedInUser]);

    // --- PERSISTENCE LOGIC ---
    useEffect(() => {
        const loadSession = () => {
            try {
                const savedSession = localStorage.getItem(storageKey);
                if (savedSession) {
                    const data = JSON.parse(savedSession);
                    if (data.uploadedImage) setUploadedImage(data.uploadedImage);
                    if (data.restoredImage) setRestoredImage(data.restoredImage);
                    if (typeof data.colorize === 'boolean') setColorize(data.colorize);
                }
            } catch (e) {
                console.error("Failed to load session", e);
            }
        };
        loadSession();
    }, [storageKey]);

    useEffect(() => {
        const saveSession = () => {
            try {
                const data = {
                    uploadedImage,
                    restoredImage,
                    colorize
                };
                localStorage.setItem(storageKey, JSON.stringify(data));
            } catch (e) {
                console.error("Quota exceeded, cannot save session", e);
            }
        };
        const timeout = setTimeout(saveSession, 1000);
        return () => clearTimeout(timeout);
    }, [uploadedImage, restoredImage, colorize, storageKey]);

    const handleResetSession = () => {
        if (window.confirm("Bạn có chắc muốn xóa phiên làm việc hiện tại?")) {
            localStorage.removeItem(storageKey);
            setUploadedImage(null);
            setRestoredImage(null);
            setColorize(false);
            setSliderPosition(50);
            addToast('Đã làm mới phiên làm việc.', 'success');
        }
    };

    const handleLoadHistoryItem = (item: GenerationResult) => {
        if (item.images && item.images.length > 0) {
            setUploadedImage(item.images[0]); // In history we usually only save the result. 
            // Ideally we should save original too, but for now we set result as uploaded to allow viewing.
            // If the user wants to compare, they need the original session.
            // For better UX, we assume the history item IS the restored image.
            setRestoredImage(item.images[0]);
            
            if (item.prompt.includes('Có tô màu')) setColorize(true);
            else setColorize(false);
            
            setShowHistoryModal(false);
            addToast('Đã tải ảnh từ lịch sử.', 'success');
        }
    };

    const handleDeleteHistoryItem = (taskId: string) => {
        if (loggedInUser) {
            handleDeleteGenerationResult(loggedInUser.id, taskId);
            addToast('Đã xóa ảnh khỏi lịch sử.', 'info');
        }
    };

    const processFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setUploadedImage(event.target.result as string);
                setRestoredImage(null); 
                setSliderPosition(50);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
        if (e.target) e.target.value = '';
    };

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (e.clipboardData && e.clipboardData.items) {
                for (let i = 0; i < e.clipboardData.items.length; i++) {
                    const item = e.clipboardData.items[i];
                    if (item.type.indexOf('image') !== -1) {
                        const file = item.getAsFile();
                        if (file) {
                            processFile(file);
                            addToast('Đã dán ảnh từ Clipboard!', 'success');
                        }
                        break; 
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    const handleBack = () => {
        if (restoredImage) {
            setRestoredImage(null); 
            return;
        }
        if (onBack) {
            onBack();
        } else if (onNavigate) {
            onNavigate('Kho Tiện Ích');
        }
    };

    // Updated handleDownload to support scaling
    const handleDownload = (scale: number = 1) => {
        if (!restoredImage) return;

        if (scale === 1) {
            const link = document.createElement('a');
            link.href = restoredImage;
            link.download = `restored_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = restoredImage;
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
                    link.download = `restored_${scale}x_${Date.now()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    addToast(`Đã tải xuống ảnh kích thước x${scale}`, 'success');
                }
            };
        }
        setShowDownloadOptions(false);
    };
    
    // --- SLIDER LOGIC ---
    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSliderPosition(Number(e.target.value));
    };

    const handleRestore = async () => {
        if (isRestoring || !loggedInUser || !uploadedImage) return;

        const cost = tool.creditCost;
        const freshUser = findUserInTree(userState.allUsers, loggedInUser.id);
        if (!freshUser || freshUser.creditBalance < cost) {
            addToast('Không đủ Credit để thực hiện.', 'error');
            return;
        }

        setIsRestoring(true);
        
        const creditResult = await handleUseToolCredit(loggedInUser.id, { ...tool, creditCost: cost });
        if (!creditResult.success) {
            setIsRestoring(false);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
            const mimeType = uploadedImage.split(';')[0].split(':')[1] || 'image/png';
            const imagePart = { inlineData: { data: uploadedImage.split(',')[1], mimeType } };
            
            // Enhanced Prompt: 30-Year Expert Persona
            const colorInstruction = colorize 
                ? "COLORIZATION: REQUIRED. Apply beautiful, rich, and historically accurate colors. Skin tones must be vibrant and lifelike, not flat. Make the image look like it was taken with modern color film." 
                : "COLORIZATION: DISABLED. Maintain the original Black & White / Sepia tone, but clean up stains and improve contrast.";

            const textPart = { text: `
            SYSTEM_ROLE: Digital Photo Restoration Master with 30 years of experience.
            TASK: Restore the provided old/damaged photograph to its pristine original state.

            <OBJECTIVE>
            Your goal is to perform a high-end digital restoration. The result must be sharp, clear, and beautifully colored (if requested), appearing as if the photo was taken today with a high-quality camera, while maintaining 100% fidelity to the original content.
            </OBJECTIVE>

            <INSTRUCTIONS>
            1. **DAMAGE REMOVAL**: Meticulously heal scratches, tears, creases, dust, and mold spots. Restore missing pieces based strictly on immediate surrounding context.
            2. **CLARITY ENHANCEMENT**: significantly improve sharpness and definition. Remove blur and film grain. Ensure textures (skin, fabric, background) are crisp and realistic.
            3. **FIDELITY PRESERVATION**: DO NOT change any physical features. The eyes, nose, mouth, and facial structure must remain EXACTLY as they are in the original, just sharper. Do not "beautify" to modern standards if it changes identity.
            4. **LIGHTING & CONTRAST**: Correct exposure issues, balance shadows and highlights to reveal hidden details.
            5. ${colorInstruction}
            </INSTRUCTIONS>

            <STRICT_NEGATIVE_CONSTRAINTS>
            - **NO ADDITIONS**: Do NOT add accessories, changing clothing, or modify the background content.
            - **NO ARTISTIC FILTERS**: Do not make it look like a painting, drawing, or 3D render. It must look like a photograph.
            - **NO IDENTITY CHANGE**: The person must look identical to the original subject.
            </STRICT_NEGATIVE_CONSTRAINTS>

            OUTPUT: A high-resolution, professionally restored version of the input image.
            ` };

            const response = await ai.models.generateContent({
                model: selectedModel,
                contents: { parts: [imagePart, textPart] },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const newImagePart = response.candidates?.[0]?.content?.parts[0];
            if (newImagePart && newImagePart.inlineData?.data) {
                const newImage = `data:${newImagePart.inlineData.mimeType};base64,${newImagePart.inlineData.data}`;
                
                const newResult: GenerationResult = {
                    taskId: `rest_${Date.now()}`, // Use timestamp for sorting in history
                    date: new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                    prompt: `[Khôi phục] ${colorize ? 'Có tô màu' : 'Giữ nguyên màu'}`,
                    images: [newImage],
                    settings: {
                        aspectRatio: 'custom', 
                        customRatio: null, 
                        quantity: 1, 
                        generationMode: 'Chất lượng', 
                        imageStyle: 'Mặc định'
                    },
                    cost: cost,
                    balanceAfter: freshUser.creditBalance - cost,
                    creationTime: new Date().toLocaleTimeString('en-GB'),
                };

                handleSetGenerationHistory(loggedInUser.id, newResult);
                addToast('Khôi phục ảnh thành công!', 'success');
                setRestoredImage(newImage);
                setSliderPosition(50); // Reset slider to center
            } else {
                throw new Error("API không trả về ảnh hợp lệ.");
            }

        } catch (error) {
            console.error("Lỗi khôi phục ảnh:", error);
            addToast('Khôi phục thất bại, Credit đã được hoàn lại.', 'error');
            const userForRefund = findUserInTree(userState.allUsers, loggedInUser.id);
            if(userForRefund) {
                await handleUseToolCredit(userForRefund.id, { ...tool, creditCost: -cost });
            }
        } finally {
            setIsRestoring(false);
        }
    };

    return (
        <div className="h-full flex flex-col items-center justify-center bg-black p-4 md:p-8 text-gray-300 relative overflow-hidden">
             <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Lịch sử Khôi phục Ảnh" size="lg" hideFooter>
                <div className="max-h-[60vh] overflow-y-auto p-1 space-y-3">
                    {historyItems.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            <ClockIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>Chưa có lịch sử nào.</p>
                        </div>
                    ) : (
                        historyItems.map((item) => (
                            <div key={item.taskId} className="flex items-center gap-4 p-3 bg-slate-800 border border-slate-700 rounded-xl hover:border-indigo-500 transition-colors">
                                <div className="h-16 w-16 bg-slate-900 rounded-lg overflow-hidden flex-shrink-0 border border-slate-700">
                                    <img src={item.images[0]} alt="Result" className="h-full w-full object-contain" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{item.prompt}</p>
                                    <p className="text-xs text-slate-400 mt-1">{item.date} • {item.creationTime}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleLoadHistoryItem(item)}
                                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
                                        title="Xem lại"
                                    >
                                        <ArrowPathIcon className="h-4 w-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteHistoryItem(item.taskId)}
                                        className="p-2 bg-slate-700 text-red-400 rounded-lg hover:bg-slate-600 hover:text-red-300 transition-colors"
                                        title="Xóa"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
             </Modal>

             <div className="absolute top-4 left-4 z-20">
                <button onClick={handleBack} className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white p-2 rounded-lg bg-gray-800/80 hover:bg-gray-800 transition-colors backdrop-blur-md">
                    <ArrowLeftIcon className="h-5 w-5" />
                    {restoredImage ? 'Quay lại chỉnh sửa' : 'Quay lại'}
                </button>
            </div>
            <div className="absolute top-4 right-4 flex items-center gap-4 z-20">
                <CreditBalanceDisplay balance={currentCredits} onAdd={() => onNavigate && onNavigate('Ví Của Tôi')} />
                 <button 
                    onClick={() => setShowHistoryModal(true)}
                    className="p-2 text-indigo-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors border border-indigo-900/50 backdrop-blur-md"
                    title="Lịch sử"
                 >
                    <ClockIcon className="h-5 w-5" />
                 </button>
                 <button 
                    onClick={handleResetSession}
                    className="p-2 text-gray-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors backdrop-blur-md"
                    title="Làm mới phiên làm việc"
                >
                    <ArrowPathIcon className="h-5 w-5" />
                </button>
            </div>

            {restoredImage ? (
                 <div className="max-w-6xl w-full h-full flex flex-col gap-6 animate-fadeIn z-10">
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                        <h2 className="text-2xl font-bold text-white text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Kết quả Phục hồi</h2>
                        <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-900/50 px-3 py-1 rounded-full border border-slate-700">
                             <ArrowsRightLeftIcon className="h-4 w-4" />
                             <span>Kéo thanh trượt để so sánh Trước / Sau</span>
                        </div>
                    </div>
                    
                    {/* COMPARISON SLIDER */}
                    <div className="flex-grow relative w-full flex items-center justify-center overflow-hidden min-h-0">
                        <div 
                            className="relative w-full h-full max-w-4xl max-h-[70vh] aspect-[3/4] md:aspect-video rounded-xl overflow-hidden shadow-2xl border border-slate-700 select-none"
                            ref={containerRef}
                        >
                            {/* "After" Image (Background layer) */}
                            <img 
                                src={restoredImage} 
                                alt="Restored" 
                                className="absolute inset-0 w-full h-full object-contain bg-[#1e1e1e]" 
                                draggable={false}
                            />
                            
                            {/* "Before" Image (Foreground layer, clipped) */}
                            <div 
                                className="absolute inset-0 overflow-hidden"
                                style={{ 
                                    clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                                    transition: isDraggingSlider ? 'none' : 'clip-path 0.1s ease-out'
                                }}
                            >
                                 <img 
                                    src={uploadedImage!} 
                                    alt="Original" 
                                    className="absolute inset-0 w-full h-full object-contain bg-[#1e1e1e]" 
                                    draggable={false}
                                />
                                {/* Label for Before */}
                                <div className="absolute top-4 left-4 bg-black/60 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md border border-white/10">TRƯỚC</div>
                            </div>

                            {/* Label for After */}
                            <div className="absolute top-4 right-4 bg-indigo-600/80 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md border border-white/10">SAU</div>

                            {/* Slider Handle */}
                            <div 
                                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20"
                                style={{ left: `${sliderPosition}%` }}
                            >
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg transform active:scale-110 transition-transform">
                                    <ArrowsRightLeftIcon className="h-4 w-4 text-indigo-600" />
                                </div>
                            </div>
                            
                            {/* Invisible Range Input for Interaction */}
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={sliderPosition}
                                onChange={handleSliderChange}
                                onMouseDown={() => setIsDraggingSlider(true)}
                                onMouseUp={() => setIsDraggingSlider(false)}
                                onTouchStart={() => setIsDraggingSlider(true)}
                                onTouchEnd={() => setIsDraggingSlider(false)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
                            />
                        </div>
                    </div>
                    
                    <div className="flex justify-center gap-4 flex-shrink-0 pb-4">
                         <button onClick={() => setRestoredImage(null)} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors text-sm border border-slate-600">
                            Làm ảnh khác
                         </button>
                         <div className="relative">
                            <button 
                                onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-lg font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-indigo-500/20 transition-all text-sm"
                            >
                                <DocumentArrowDownIcon className="h-5 w-5" /> Tải ảnh phục hồi <ChevronUpIcon className={`h-3 w-3 transition-transform ${showDownloadOptions ? 'rotate-180' : ''}`} />
                            </button>
                             {showDownloadOptions && (
                                <div className="absolute bottom-full right-0 mb-2 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-fadeIn z-20">
                                    <button onClick={() => handleDownload(1)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50">
                                        1x (Gốc)
                                    </button>
                                    <button onClick={() => handleDownload(2)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50">
                                        2x (Cao)
                                    </button>
                                    <button onClick={() => handleDownload(3)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50">
                                        3x (Siêu nét)
                                    </button>
                                    <button onClick={() => handleDownload(4)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors">
                                        4x (Cực đại)
                                    </button>
                                </div>
                            )}
                         </div>
                    </div>
                </div>
            ) : (
                 <div className="max-w-4xl w-full space-y-8 z-10">
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-bold text-white">Khôi phục & Làm nét Ảnh cũ</h2>
                        <p className="text-gray-400">Công nghệ AI chuyên sâu: Khử nhiễu, xóa xước và tái tạo chi tiết khuôn mặt.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        {/* Upload Section */}
                        <div className="space-y-4">
                            <div 
                                className={`border-2 border-dashed rounded-2xl h-96 flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden ${uploadedImage ? 'border-indigo-500 bg-black' : 'border-gray-700 hover:border-indigo-500 hover:bg-gray-900/50'}`}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                                
                                {uploadedImage ? (
                                    <img src={uploadedImage} alt="Uploaded" className="max-w-full max-h-full object-contain" />
                                ) : (
                                    <div className="text-center space-y-4">
                                        <div className="p-4 bg-gray-800 rounded-full inline-block">
                                            <ArrowUpTrayIcon className="h-8 w-8 text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-semibold text-white">Tải ảnh lên</p>
                                            <p className="text-sm text-gray-500">JPG, PNG hoặc WebP</p>
                                        </div>
                                    </div>
                                )}
                                {uploadedImage && (
                                    <div className="absolute bottom-4 right-4 bg-black/70 px-3 py-1 rounded-full text-xs text-white backdrop-blur-md border border-gray-600">
                                        Nhấn để thay đổi
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Controls Section */}
                        <div className="bg-[#1e1e1e] p-6 rounded-2xl border border-gray-700 space-y-6 h-auto min-h-96 flex flex-col shadow-xl">
                            
                             {/* MODEL SELECTOR */}
                            <div className="bg-gray-800 p-3 rounded-xl border border-gray-700">
                                <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                                    <BoltIcon className="h-3 w-3" /> AI Model Engine
                                </label>
                                <select
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    {activeModels.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-3">Chế độ Màu sắc</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setColorize(false)}
                                        className={`p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 ${!colorize ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                                    >
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-500 to-gray-800 border border-gray-400"></div>
                                        Giữ nguyên màu gốc
                                    </button>
                                    <button
                                        onClick={() => setColorize(true)}
                                        className={`p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 ${colorize ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                                    >
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-400 via-yellow-400 to-blue-400 border border-white/20"></div>
                                        Tô màu & Phục hồi
                                    </button>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-3 bg-gray-900/50 p-2 rounded-lg border border-gray-800">
                                    {colorize 
                                        ? "AI sẽ phân tích bối cảnh để tô màu da, quần áo và môi trường một cách tự nhiên nhất." 
                                        : "Tăng độ nét, khử nhiễu và xóa vết xước nhưng vẫn giữ nguyên tông màu hoài cổ của ảnh."}
                                </p>
                            </div>

                            <div className="p-4 bg-indigo-900/20 border border-indigo-800 rounded-xl space-y-2 mt-auto">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-300">Chi phí thực hiện:</span>
                                    <span className="text-lg font-bold text-white flex items-center gap-1">
                                        <SparklesIcon className="h-4 w-4 text-yellow-400" /> {tool.creditCost} Credit
                                    </span>
                                </div>
                                <div className="h-1 w-full bg-indigo-900/50 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 w-2/3"></div>
                                </div>
                            </div>

                            <div>
                                <button 
                                    onClick={handleRestore}
                                    disabled={!uploadedImage || isRestoring}
                                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] shadow-lg"
                                >
                                    {isRestoring ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <SparklesIcon className="h-5 w-5" />}
                                    {isRestoring ? 'Đang xử lý...' : 'Bắt đầu Phục hồi'}
                                </button>
                            </div>
                        </div>
                    </div>
                 </div>
            )}
            
            {/* Background Decor */}
            <div className="absolute inset-0 pointer-events-none opacity-20 z-0" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        </div>
    );
};

export default PhotoRestoration;
