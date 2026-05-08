
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { 
    ArrowLeftIcon, SparklesIcon, DocumentArrowDownIcon, 
    PhotoIcon, CheckCircleIcon, TrashIcon, ArrowPathIcon, 
    BriefcaseIcon, CubeIcon,
    ClockIcon,
    PlusIcon,
    CheckIcon,
    ArrowRightIcon,
    XCircleIcon,
    ArrowsPointingOutIcon,
    ChevronUpIcon,
    GlobeAltIcon,
    MapPinIcon,
    UserIcon,
    LightBulbIcon,
    PencilSquareIcon,
    UserGroupIcon
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
import FormattedNumberInput from '../../components/FormattedNumberInput';

interface ProductTryOnToolProps {
    tool: IntegrationTool;
    onNavigate: (page: string) => void;
}

const ProductTryOnTool: React.FC<ProductTryOnToolProps> = ({ tool, onNavigate }) => {
    const { loggedInUser } = useAuth();
    const { userState } = useUser();
    const { handleUseToolCredit, handleSetGenerationHistory, handleDeleteGenerationResult } = useActions();
    const { addToast } = useToast();

    // Images
    const [baseImage, setBaseImage] = useState<string | null>(null); // Input 1 (Background/Context)
    const [mixImages, setMixImages] = useState<string[]>([]);   // Input 2+ (Objects/Subjects)
    const [resultImage, setResultImage] = useState<string | null>(null);
    
    // UI View State
    const [activeView, setActiveView] = useState<'setup' | 'result'>('setup');

    // Inputs
    const [prompt, setPrompt] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false); // New State
    const [processingStatus, setProcessingStatus] = useState(''); 
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showDownloadOptions, setShowDownloadOptions] = useState(false);
    
    // Mode: Add (Combine) vs Replace (Swap)
    const [mixMode, setMixMode] = useState<'add' | 'replace'>('add');

    const baseInputRef = useRef<HTMLInputElement>(null);
    const mixInputRef = useRef<HTMLInputElement>(null);

    const freshUser = useMemo(() => loggedInUser ? findUserInTree(userState.allUsers, loggedInUser.id) : null, [userState.allUsers, loggedInUser]);
    const currentCredits = freshUser ? freshUser.creditBalance : 0;

    // Dynamic Storage Key
    const storageKey = useMemo(() => `tool_image_mixer_session_${loggedInUser?.id}`, [loggedInUser]);

    // Get History Items
    const historyItems = useMemo(() => {
        if (!loggedInUser?.generationHistory) return [];
        return loggedInUser.generationHistory
            .filter(h => h.taskId.startsWith('mixer_'))
            .sort((a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime());
    }, [loggedInUser]);

    // Persistence
    useEffect(() => {
        const loadSession = () => {
            try {
                const savedSession = localStorage.getItem(storageKey);
                if (savedSession) {
                    const data = JSON.parse(savedSession);
                    if (data.baseImage) setBaseImage(data.baseImage);
                    if (data.mixImages && Array.isArray(data.mixImages)) setMixImages(data.mixImages);
                    else if (data.mixImage) setMixImages([data.mixImage]); 
                    if (data.resultImage) {
                        setResultImage(data.resultImage);
                        setActiveView('result'); // Auto switch if result exists
                    }
                    if (data.prompt) setPrompt(data.prompt);
                    if (data.mixMode) setMixMode(data.mixMode);
                }
            } catch (e) { console.error("Failed to load session", e); }
        };
        loadSession();
    }, [storageKey]);

    useEffect(() => {
        const saveSession = () => {
            try {
                const data = { baseImage, mixImages, resultImage, prompt, mixMode };
                localStorage.setItem(storageKey, JSON.stringify(data));
            } catch (e) { console.error("Quota exceeded", e); }
        };
        const timeout = setTimeout(saveSession, 1000);
        return () => clearTimeout(timeout);
    }, [baseImage, mixImages, resultImage, prompt, mixMode, storageKey]);

    const handleResetSession = () => {
        if (window.confirm("Xóa toàn bộ phiên làm việc hiện tại?")) {
            localStorage.removeItem(storageKey);
            setBaseImage(null);
            setMixImages([]);
            setResultImage(null);
            setPrompt('');
            setMixMode('add');
            setActiveView('setup');
            addToast('Đã làm mới.', 'success');
        }
    };

    const processFile = (file: File, type: 'base' | 'mix') => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                const res = event.target.result as string;
                if (type === 'base') {
                    setBaseImage(res);
                } else {
                    setMixImages(prev => [...prev, res]);
                }
            }
        };
        reader.readAsDataURL(file);
    };

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'base' | 'mix') => {
        if (e.target.files) {
            Array.from(e.target.files).forEach(file => processFile(file as File, type));
        }
        e.target.value = '';
    };

    const handleRemoveMixImage = (index: number) => {
        setMixImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleLoadHistoryItem = (item: GenerationResult) => {
        setResultImage(item.images[0]);
        setPrompt(item.prompt.replace('[Mixer] ', ''));
        setShowHistoryModal(false);
        setActiveView('result');
        addToast('Đã tải kết quả từ lịch sử.', 'success');
    };

    const handleDeleteHistoryItem = (taskId: string) => {
        if (loggedInUser) {
            handleDeleteGenerationResult(loggedInUser.id, taskId);
            addToast('Đã xóa.', 'info');
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
                    link.download = `mixer_result_${scale}x_${Date.now()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    addToast(`Đã tải xuống ảnh kích thước x${scale}`, 'success');
                }
            };
        }
        setShowDownloadOptions(false);
    };

    const handleUseResultAsBase = () => {
        if (resultImage) {
            setBaseImage(resultImage);
            setMixImages([]);
            setResultImage(null);
            setActiveView('setup');
            addToast('Đã chuyển ảnh kết quả sang Ảnh nền. Chọn ảnh ghép tiếp theo!', 'success');
        }
    };

    // --- NEW: AI DIRECTOR PROMPT SUGGESTION ---
    const handleSuggestPrompt = async () => {
        if (!baseImage || mixImages.length === 0) {
            addToast('Vui lòng tải ảnh nền và vật thể trước.', 'error');
            return;
        }

        setIsSuggesting(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            const baseMime = baseImage.split(';')[0].split(':')[1] || 'image/png';
            const basePart = { inlineData: { data: baseImage.split(',')[1], mimeType: baseMime } };

            const mixParts = mixImages.map(img => {
                const mime = img.split(';')[0].split(':')[1] || 'image/png';
                return { inlineData: { data: img.split(',')[1], mimeType: mime } };
            });

            const prompt = `
            ROLE: Expert Art Director & VFX Supervisor.
            TASK: Analyze the Background (Image 1) and the Subject(s) (Subsequent Images).
            GOAL: Write a precise PROMPT to composite the subject into the background naturally.

            ANALYSIS REQUIRED:
            1. Identify the background setting (e.g., beach, office, street).
            2. Identify the lighting direction and mood of the background.
            3. Determine the best logical position and action for the subject in this specific scene.
            
            OUTPUT: A single, descriptive sentence in VIETNAMESE describing the final scene.
            Format: "[Action/Position] + [Lighting/Shadow details] + [Mood]"
            Example: "Cô gái đang ngồi thư giãn trên ghế sofa, ánh nắng vàng từ cửa sổ bên phải chiếu vào tạo bóng đổ mềm mại trên sàn."
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', 
                contents: { parts: [basePart, ...mixParts, { text: prompt }] }
            });

            if (response.text) {
                setPrompt(response.text.trim());
                addToast('Đạo diễn AI đã viết kịch bản!', 'success');
            } else {
                 addToast('AI không trả về nội dung. Vui lòng thử lại.', 'info');
            }

        } catch (error) {
            console.error("Suggestion error:", error);
            addToast('Không thể tạo gợi ý lúc này.', 'error');
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleProcess = async () => {
        if (isProcessing || !loggedInUser || !baseImage || mixImages.length === 0) return;

        const cost = tool.creditCost;
        if (currentCredits < cost) {
            addToast('Không đủ Credit.', 'error');
            return;
        }

        let userPrompt = prompt.trim();
        if (!userPrompt) {
             userPrompt = mixMode === 'replace' 
                ? "Replace the main subject in the scene with the provided subjects." 
                : "Insert the provided subjects into the scene naturally.";
        }
        
        setIsProcessing(true);
        
        const creditResult = await handleUseToolCredit(loggedInUser.id, { ...tool, creditCost: cost });
        if (!creditResult.success) {
            setIsProcessing(false);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

            setProcessingStatus('Đang phân tích cấu trúc không gian và ánh sáng...');
            
            const baseMime = baseImage.split(';')[0].split(':')[1] || 'image/png';
            const basePart = { inlineData: { data: baseImage.split(',')[1], mimeType: baseMime } };

            const mixParts = mixImages.map(img => {
                const mime = img.split(';')[0].split(':')[1] || 'image/png';
                return { inlineData: { data: img.split(',')[1], mimeType: mime } };
            });
            
            const subjectCount = mixImages.length;
            let inputsDescription = `- **IMAGE 1 (BACKGROUND/SCENE)**: The environment that MUST BE PRESERVED.\n`;
            for(let i=0; i<subjectCount; i++) {
                inputsDescription += `- **IMAGE ${i+2} (SUBJECT/ACTOR ${i+1})**: The person/object to insert.\n`;
            }

            const modeInstruction = mixMode === 'replace' 
                ? "MODE: REPLACE. IDENTIFY and REMOVE the existing subject(s) in the scene that match the user request. REPLACE them with the provided Subject(s). Do not keep the old subject."
                : "MODE: ADD. INSERT the Subject(s) into the existing scene. Do NOT remove existing people unless they conflict with the new subject's position.";

            // --- SYSTEM PROMPT V4: Enhanced VFX Logic ---
            const systemPrompt = `
            <SYSTEM_INSTRUCTION>
            **ROLE**: Elite VFX Compositor & Environment Specialist.
            **TASK**: Insert Subjects into a Background with PERFECT Integration.

            **CORE CONSTRAINT (THE "HOLY GRAIL" RULE)**:
            - **PRESERVE THE BACKGROUND**: You are FORBIDDEN from changing the existing details of Image 1 (trees, buildings, floor texture, furniture) unless they are behind the new subject.
            - **SCALE & PERSPECTIVE**: The new subject must respect the depth and scale of the scene. Do not make them giant.

            **INPUTS**:
            ${inputsDescription}
            - **USER INTENT**: "${userPrompt}"
            - ${modeInstruction}

            **EXECUTION PROTOCOL**:

            1.  **SCENE ANALYSIS & GEOMETRY**:
                - Analyze the **Perspective Grid** of Image 1. Where is the floor? Where is the horizon?
                - Place the Subject onto this grid. Their feet MUST touch the ground at the correct depth plane.
                - **Scale Lock**: Use reference objects in Image 1 (chairs, doors, other people) to determine the correct height of the new subject.

            2.  **LIGHTING MATCH (RELIGHTING)**:
                - Identify the **Key Light** direction in Image 1.
                - Re-render the Subject's lighting to match.
                - **Color Grading**: Match the White Balance and Black Point.

            3.  **SHADOW GENERATION**:
                - **Contact Shadows**: Dark, sharp shadows right under the feet/base. This anchors the subject.
                - **Cast Shadows**: Softer shadows extending away from the light source.

            **OUTPUT**: A photorealistic composite where the background is untouched (or naturally occluded), and the subject looks like they belong there physically.
            </SYSTEM_INSTRUCTION>
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image', 
                contents: { parts: [basePart, ...mixParts, { text: systemPrompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const newImagePart = response.candidates?.[0]?.content?.parts[0];
            if (newImagePart && newImagePart.inlineData?.data) {
                const aiImage = `data:${newImagePart.inlineData.mimeType};base64,${newImagePart.inlineData.data}`;
                
                setResultImage(aiImage);
                setActiveView('result'); // Switch to result view
                
                const newResult: GenerationResult = {
                    taskId: `mixer_${Date.now()}`,
                    date: new Date().toLocaleDateString('vi-VN'),
                    prompt: `[Mixer] ${prompt || 'Auto merge'} (${subjectCount} subjects)`, 
                    images: [aiImage], 
                    settings: { aspectRatio: 'custom', customRatio: null, quantity: 1, generationMode: 'Chất lượng', imageStyle: 'Realism' },
                    cost: cost,
                    balanceAfter: freshUser ? freshUser.creditBalance - cost : 0,
                    creationTime: new Date().toLocaleTimeString(),
                };

                handleSetGenerationHistory(loggedInUser.id, newResult);
                addToast('Ghép ảnh thành công! (Scale Corrected)', 'success');
            } else {
                throw new Error("API không trả về ảnh.");
            }

        } catch (error) {
            console.error("Error:", error);
            addToast('Lỗi xử lý, đã hoàn lại Credit. Vui lòng thử lại.', 'error');
            const userForRefund = findUserInTree(userState.allUsers, loggedInUser.id);
            if(userForRefund) {
                await handleUseToolCredit(userForRefund.id, { ...tool, creditCost: -cost });
            }
        } finally {
            setIsProcessing(false);
            setProcessingStatus('');
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-950 text-gray-300">
            {/* History Modal */}
            <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Lịch sử Ghép Ảnh" size="lg" hideFooter>
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
                                    <button onClick={() => handleLoadHistoryItem(item)} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500" title="Xem lại"><ArrowPathIcon className="h-4 w-4" /></button>
                                    <button onClick={() => handleDeleteHistoryItem(item.taskId)} className="p-2 bg-slate-700 text-red-400 rounded-lg hover:bg-slate-600" title="Xóa"><TrashIcon className="h-4 w-4" /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Modal>

            {/* Header */}
            <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-30 shadow-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate('Kho Tiện Ích')} className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <ArrowLeftIcon className="h-5 w-5" /> Quay lại
                    </button>
                    <h1 className="text-lg font-bold text-white flex items-center gap-2">
                        <BriefcaseIcon className="h-5 w-5 text-indigo-500" />
                        Ghép Ảnh Thông Minh AI
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <CreditBalanceDisplay balance={currentCredits} onAdd={() => onNavigate('Ví Của Tôi')} />
                    <button onClick={() => setShowHistoryModal(true)} className="p-2 text-indigo-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-indigo-900/50"><ClockIcon className="h-5 w-5" /></button>
                    <button onClick={handleResetSession} className="p-2 text-gray-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg"><ArrowPathIcon className="h-5 w-5" /></button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-4 md:p-8 relative">
                {activeView === 'setup' ? (
                     <div className="max-w-6xl mx-auto h-full flex flex-col gap-6 animate-fadeIn">
                        {/* INPUT AREA - CLEARLY SEPARATED */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            
                            {/* 1. BACKGROUND / SCENE (Left/Top - Larger) */}
                            <div className="md:col-span-7 flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-bold text-indigo-400 uppercase flex items-center gap-2">
                                        <MapPinIcon className="h-5 w-5"/> 1. Ảnh Nền (Bối Cảnh)
                                    </label>
                                    {baseImage && <button onClick={() => setBaseImage(null)} className="text-xs text-red-400 hover:text-red-300">Xóa</button>}
                                </div>
                                <div 
                                    onClick={() => baseInputRef.current?.click()}
                                    className={`flex-1 min-h-[300px] md:min-h-[400px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden bg-slate-900/50 group ${baseImage ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-slate-700 hover:border-indigo-400 hover:bg-slate-800'}`}
                                >
                                    {baseImage ? (
                                        <img src={baseImage} alt="Base" className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="text-center p-6 text-slate-500 group-hover:text-indigo-400 transition-colors">
                                            <PhotoIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                            <p className="text-lg font-medium">Nhấn để tải Ảnh Nền</p>
                                            <p className="text-xs mt-2 opacity-70">Đây là không gian/bối cảnh chính</p>
                                        </div>
                                    )}
                                    <input type="file" ref={baseInputRef} onChange={(e) => handleUpload(e, 'base')} className="hidden" accept="image/*" />
                                </div>
                            </div>

                            {/* 2. SUBJECT / ACTOR (Right/Bottom - List) */}
                            <div className="md:col-span-5 flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-bold text-pink-400 uppercase flex items-center gap-2">
                                        <UserIcon className="h-5 w-5"/> 2. Vật thể / Người ({mixImages.length})
                                    </label>
                                    <button onClick={() => mixInputRef.current?.click()} className="text-xs text-pink-400 hover:text-pink-300 font-semibold flex items-center gap-1 px-2 py-1 bg-pink-900/20 rounded hover:bg-pink-900/40 transition-colors">
                                        <PlusIcon className="h-3 w-3"/> Thêm đối tượng
                                    </button>
                                </div>
                                
                                <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex-1 min-h-[200px] flex flex-col gap-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        {mixImages.map((img, idx) => (
                                            <div key={idx} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-slate-700 group shadow-sm bg-black">
                                                <img src={img} alt={`Mix ${idx}`} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                                    <button 
                                                        onClick={() => handleRemoveMixImage(idx)}
                                                        className="self-center p-1.5 bg-red-600 text-white rounded-full hover:bg-red-500 shadow-lg"
                                                        title="Xóa ảnh này"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <div className="absolute top-2 left-2 bg-pink-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                                    #{idx + 1}
                                                </div>
                                            </div>
                                        ))}
                                        
                                        {/* Quick Add Box */}
                                        <div 
                                            onClick={() => mixInputRef.current?.click()}
                                            className="aspect-[3/4] border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800 hover:border-pink-500 transition-colors text-slate-500 hover:text-pink-400 group"
                                        >
                                            <div className="p-3 bg-slate-800 rounded-full group-hover:bg-pink-900/30 transition-colors mb-2">
                                                <PlusIcon className="h-6 w-6" />
                                            </div>
                                            <span className="text-xs font-medium text-center px-2">Thêm người/vật</span>
                                        </div>
                                    </div>
                                    
                                    {mixImages.length === 0 && (
                                        <div className="flex-1 flex items-center justify-center text-center p-4 text-slate-600 text-sm italic">
                                            Chưa có đối tượng nào. Hãy thêm ảnh người hoặc vật thể muốn ghép.
                                        </div>
                                    )}
                                </div>
                                <input type="file" ref={mixInputRef} onChange={(e) => handleUpload(e, 'mix')} className="hidden" accept="image/*" multiple />
                            </div>
                        </div>

                        {/* Controls Bar */}
                        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
                            {/* Mode Selection */}
                            <div className="flex justify-center mb-2">
                                <div className="bg-slate-800 p-1 rounded-lg flex gap-1 border border-slate-700">
                                    <button 
                                        onClick={() => setMixMode('add')}
                                        className={`px-6 py-2.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${mixMode === 'add' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-slate-700'}`}
                                        title="Thêm đối tượng vào ảnh nền (giữ nguyên người cũ)"
                                    >
                                        <PlusIcon className="h-4 w-4"/> Thêm vào (Add)
                                    </button>
                                    <button 
                                        onClick={() => setMixMode('replace')}
                                        className={`px-6 py-2.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${mixMode === 'replace' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-slate-700'}`}
                                        title="Thay thế đối tượng cũ bằng đối tượng mới"
                                    >
                                        <ArrowPathIcon className="h-4 w-4"/> Thay thế (Replace)
                                    </button>
                                </div>
                            </div>

                            {/* Prompt */}
                            <div className="w-full space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 ml-1">
                                        <SparklesIcon className="h-3 w-3 text-yellow-400" /> Mô tả vị trí & hành động (Tùy chọn)
                                    </label>
                                    <button 
                                        onClick={handleSuggestPrompt}
                                        disabled={isSuggesting || !baseImage || mixImages.length === 0}
                                        className="text-[10px] font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-500 px-3 py-1 rounded-full shadow hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                                    >
                                        {isSuggesting ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <SparklesIcon className="h-3 w-3" />}
                                        ✨ Gợi ý Prompt (AI Đạo Diễn)
                                    </button>
                                </div>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder={mixMode === 'replace' ? "Ví dụ: Thay thế người đang đứng bằng cô gái này..." : "Ví dụ: Chàng trai đang cầm máy ảnh chụp cho cô gái, ánh mắt nhìn nhau..."}
                                        className="w-full pl-4 pr-36 py-4 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-inner"
                                        onKeyPress={(e) => e.key === 'Enter' && handleProcess()}
                                    />
                                    <div className="absolute right-1.5 top-1.5 bottom-1.5">
                                        <button 
                                            onClick={handleProcess}
                                            disabled={!baseImage || mixImages.length === 0 || isProcessing}
                                            className="h-full px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all transform active:scale-95 shadow-md"
                                        >
                                            {isProcessing ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <SparklesIcon className="h-5 w-5" />}
                                            {isProcessing ? (processingStatus || 'Đang ghép...') : 'Ghép ngay'}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500 ml-1">*Mẹo: Mô tả càng chi tiết về vị trí, tương tác và ánh sáng thì ảnh càng thật.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col gap-4 animate-fadeIn pb-6">
                        <div className="flex justify-between items-center bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 shadow-lg mx-auto max-w-4xl w-full">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setActiveView('setup')} className="text-sm font-semibold text-slate-300 hover:text-white flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors border border-slate-700">
                                    <PencilSquareIcon className="h-4 w-4" /> Quay lại chỉnh sửa
                                </button>
                                <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
                                    <CheckCircleIcon className="h-5 w-5"/> Kết quả Hoàn tất
                                </h3>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleUseResultAsBase} className="text-sm font-semibold text-indigo-300 bg-indigo-900/50 hover:bg-indigo-900 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border border-indigo-700">
                                    <ArrowPathIcon className="h-4 w-4" /> Dùng làm ảnh nền
                                </button>
                                <div className="relative">
                                    <button onClick={() => setShowDownloadOptions(!showDownloadOptions)} className="text-sm font-semibold text-white bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg transition-colors">
                                        <DocumentArrowDownIcon className="h-5 w-5" /> Tải xuống <ChevronUpIcon className={`h-3 w-3 transition-transform ${showDownloadOptions ? 'rotate-180' : ''}`} />
                                    </button>
                                    {showDownloadOptions && (
                                        <div className="absolute top-full right-0 mt-2 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-fadeIn z-20">
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

                        <div className="flex-1 w-full flex items-center justify-center p-4">
                             <div className="relative shadow-2xl rounded-lg overflow-hidden border border-slate-800 bg-black/40 backdrop-blur-sm max-w-full max-h-full">
                                 {resultImage ? (
                                    <img src={resultImage} alt="Result" className="max-w-full max-h-[calc(100vh-180px)] object-contain" />
                                 ) : (
                                     <div className="w-96 h-64 flex items-center justify-center text-slate-500">
                                         Không có ảnh kết quả.
                                     </div>
                                 )}
                             </div>
                        </div>
                    </div>
                )}

                {isProcessing && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fadeIn">
                         <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                         <p className="text-white font-bold text-lg">AI đang làm việc...</p>
                         <p className="text-indigo-300 text-sm mt-1">
                             {processingStatus || 'Đang xử lý...'}
                         </p>
                     </div>
                )}
            </main>
        </div>
    );
};

export default ProductTryOnTool;
