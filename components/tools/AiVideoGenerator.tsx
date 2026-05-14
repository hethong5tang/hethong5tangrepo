
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { 
    ArrowLeftIcon, FilmIcon, SparklesIcon, ArrowPathIcon, 
    DocumentArrowDownIcon, PhotoIcon, VideoIcon, 
    ChatBubbleBottomCenterTextIcon, ArrowUpTrayIcon,
    CheckCircleIcon, TrashIcon, ExclamationTriangleIcon,
    AdjustmentsHorizontalIcon, ClockIcon, PlayIcon,
    EyeIcon, PlusIcon, ForwardIcon, BoltIcon
} from '../Icons';
import { IntegrationTool } from '../../features/settings/types';
import { useAuth } from '../../features/auth/useAuth';
import { useUser } from '../../features/users/useUser';
import { useActions } from '../../features/actions/useActions';
import { useToast } from '../../components/ToastProvider';
import { useSettings } from '../../features/settings/useSettings';
import { ALL_GEMINI_MODELS } from '../../constants';
import { findUserInTree } from '../../services/userService';
import { GenerationResult, AspectRatio } from '../../features/users/types';
import CreditBalanceDisplay from './CreditBalanceDisplay';
import Modal from '../../components/Modal';

interface AiVideoGeneratorProps {
    tool: IntegrationTool;
    onNavigate: (page: string) => void;
}

const VIDEO_STYLES = [
    { id: 'cinematic', label: 'Điện ảnh (Cinematic)', prompt: 'cinematic lighting, 8k, photorealistic, high detail, movie look, shallow depth of field' },
    { id: 'anime', label: 'Anime Nhật Bản', prompt: 'anime style, studio ghibli, vibrant colors, 2d animation, detailed background' },
    { id: '3d_render', label: '3D Hoạt hình (Pixar)', prompt: '3d render, pixar style, unreal engine 5, cute, volumetric lighting, cgi' },
    { id: 'cyberpunk', label: 'Cyberpunk (Neon)', prompt: 'cyberpunk, neon lights, futuristic city, rain, dark atmosphere, high contrast' },
    { id: 'nature', label: 'Thiên nhiên (Nature)', prompt: 'national geographic style, nature documentary, 4k, wildlife, realistic texture' },
    { id: 'drone', label: 'Flycam (Drone View)', prompt: 'drone shot, aerial view, establishing shot, smooth motion, wide angle' },
    { id: 'vintage_film', label: 'Phim Cổ (1920s)', prompt: 'vintage film, black and white, film grain, flickering effect, 1920s movie style, silent film' },
    { id: 'retro_vhs', label: 'Retro VHS (90s)', prompt: 'vhs aesthetic, 90s home video, glitch effect, low fidelity, retro style' },
    { id: 'watercolor', label: 'Tranh Màu Nước', prompt: 'watercolor painting style, artistic, soft edges, paint strokes, dreamy' },
    { id: 'claymation', label: 'Đất Sét (Claymation)', prompt: 'claymation style, stop motion look, plasticine texture, handmade feel' },
    { id: 'pixel_art', label: 'Pixel Art (Game)', prompt: 'pixel art style, 8-bit, retro game, blocky, vibrant' },
    { id: 'scifi', label: 'Khoa Học Viễn Tưởng', prompt: 'sci-fi, spaceship, alien planet, futuristic technology, sleek, metallic' },
    { id: 'fantasy', label: 'Thần Thoại (Fantasy)', prompt: 'fantasy world, magic, dragons, epic scenery, mystical atmosphere' },
    { id: 'horror', label: 'Kinh Dị (Horror)', prompt: 'horror movie style, dark, eerie, scary, fog, suspenseful' },
    { id: 'low_poly', label: 'Low Poly', prompt: 'low poly style, geometric shapes, flat shading, minimalist 3d' },
    { id: 'isometric', label: 'Góc nhìn 3D (Isometric)', prompt: 'isometric view, miniature world, diorama, detailed' },
];

const generateVideoThumbnail = (videoUrl: string): Promise<string> => {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.crossOrigin = "anonymous";
        video.preload = 'metadata';
        video.onloadeddata = () => {
            video.currentTime = 0.5;
        };
        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            } else {
                resolve('');
            }
        };
        video.onerror = () => resolve(''); 
        video.src = videoUrl;
    });
};

const AiVideoGenerator: React.FC<AiVideoGeneratorProps> = ({ tool, onNavigate }) => {
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
    
    // Wizard State
    const [currentStep, setCurrentStep] = useState<1 | 2>(1); // 1: Input & Config, 2: Result
    
    // Inputs
    const [mode, setMode] = useState<'text' | 'image'>('text');
    const [prompt, setPrompt] = useState('');
    const [inputImage, setInputImage] = useState<string | null>(null);
    const [selectedStyle, setSelectedStyle] = useState<string>('');
    const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
    const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

    // Extension State
    const [isExtending, setIsExtending] = useState(false);
    const [lastVideoObject, setLastVideoObject] = useState<any>(null);

    // Settings
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
    const [selectedModel, setSelectedModel] = useState<string>(activeModels[0].id);

    useEffect(() => {
        if (!activeModels.some(m => m.id === selectedModel)) {
            setSelectedModel(activeModels[0].id);
        }
    }, [activeModels, selectedModel]);

    // Processing
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [progressStatus, setProgressStatus] = useState('');
    
    // History
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const freshUser = useMemo(() => loggedInUser ? findUserInTree(userState.allUsers, loggedInUser.id) : null, [userState.allUsers, loggedInUser]);
    const currentCredits = freshUser ? freshUser.creditBalance : 0;
    
    // Dynamic Storage Key based on User ID
    const storageKey = useMemo(() => `tool_ai_video_gen_session_${loggedInUser?.id}`, [loggedInUser]);

    // --- PERSISTENCE LOGIC ---
    useEffect(() => {
        const loadSession = () => {
            try {
                const savedSession = localStorage.getItem(storageKey);
                if (savedSession) {
                    const data = JSON.parse(savedSession);
                    // Load basic inputs but not heavy video result state unless needed
                    if (data.mode) setMode(data.mode);
                    if (data.prompt) setPrompt(data.prompt);
                    if (data.inputImage) setInputImage(data.inputImage);
                    
                    // If image mode and prompt is pre-filled, show a toast to inform user
                    if (data.mode === 'image' && data.inputImage) {
                         addToast('Đã nhận ảnh từ công cụ khác. Sẵn sàng tạo video!', 'info');
                    }
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
                    mode,
                    prompt,
                    inputImage: inputImage?.length && inputImage.length < 5000000 ? inputImage : null, // Limit large images in storage
                };
                localStorage.setItem(storageKey, JSON.stringify(data));
            } catch (e) {
                console.error("Quota exceeded, cannot save session", e);
            }
        };
        const timeout = setTimeout(saveSession, 1000);
        return () => clearTimeout(timeout);
    }, [mode, prompt, inputImage, storageKey]);

    // History Items
    const historyItems = useMemo(() => {
        if (!loggedInUser?.generationHistory) return [];
        return loggedInUser.generationHistory
            .filter(h => h.taskId.startsWith('vid_ai_'))
            .sort((a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime());
    }, [loggedInUser]);

    const handleAnalyzeImage = async (imageToAnalyze: string | null = null) => {
        const targetImage = imageToAnalyze || inputImage;
        
        if (!targetImage) {
            addToast('Vui lòng tải ảnh lên trước.', 'error');
            return;
        }
        setIsAnalyzingImage(true);
        // Clear previous prompt to show it's working
        setPrompt('Đang phân tích hình ảnh và sáng tạo kịch bản...'); 
        
        try {
            const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
            const mimeType = targetImage.split(';')[0].split(':')[1];
            const base64Data = targetImage.split(',')[1];
            const imagePart = { inlineData: { data: base64Data, mimeType } };

            const systemInstruction = `
            Đóng vai một Đạo diễn điện ảnh Hollywood và Chuyên gia kỹ xảo (VFX) chuyên nghiệp.
            Nhiệm vụ: Phân tích bức ảnh đầu vào và viết một kịch bản video (Prompt) cực kỳ chi tiết để biến bức ảnh tĩnh này thành một đoạn video ngắn sống động.

            HÃY MÔ TẢ CHI TIẾT CÁC YẾU TỐ SAU (Output bằng Tiếng Việt):
            1. **CHUYỂN ĐỘNG CỦA CHỦ THỂ (Subject Motion):** Mô tả chi tiết hành động. Ví dụ: Nếu là người, họ đang cười, quay đầu, hay tóc bay trong gió? Nếu là phong cảnh, có mây trôi, nước chảy, lá rơi không? Hãy tưởng tượng ra chuyển động tự nhiên nhất.
            2. **CHUYỂN ĐỘNG CAMERA (Camera Movement):** Đề xuất góc máy điện ảnh. Ví dụ: "Dolly Zoom chậm rãi vào khuôn mặt", "Pan ngang qua phong cảnh", "Flycam bay lướt qua", "Góc máy thấp (Low angle) uy nghi".
            3. **ÁNH SÁNG & KHÔNG KHÍ (Lighting & Atmosphere):** Mô tả hiệu ứng ánh sáng. Ví dụ: "Ánh nắng vàng giờ vàng (Golden Hour) chiếu xuyên qua kẽ lá", "Ánh đèn Neon Cyberpunk phản chiếu trên mặt đường ướt", "Sương mù mờ ảo bí ẩn".
            4. **CHI TIẾT MÔI TRƯỜNG:** Bụi bay, mưa rơi, tuyết, hay các hạt sáng (particles) lơ lửng.

            **ĐỊNH DẠNG OUTPUT:** 
            Viết thành một đoạn văn mô tả liền mạch, súc tích (khoảng 50-80 từ), tập trung vào sự chuyển động và cảm xúc. Bắt đầu ngay vào mô tả.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash', 
                contents: { parts: [imagePart, { text: "Phân tích ảnh và viết prompt video." }] },
                config: { systemInstruction }
            });
            
            if (response.text) {
                setPrompt(response.text.trim());
                addToast('Đạo diễn AI đã hoàn tất kịch bản!', 'success');
            }
        } catch (e) {
            console.error(e);
            addToast('Lỗi khi phân tích ảnh.', 'error');
            setPrompt(''); // Reset if failed
        } finally {
            setIsAnalyzingImage(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    const res = event.target.result as string;
                    setInputImage(res);
                    // AUTO TRIGGER ANALYSIS
                    handleAnalyzeImage(res);
                    
                    // Reset extension state if new image uploaded
                    setIsExtending(false);
                    setLastVideoObject(null);
                }
            };
            reader.readAsDataURL(file);
        }
        if (e.target) e.target.value = '';
    };

    const enhancePrompt = async () => {
        if (!prompt.trim()) return;
        setIsEnhancingPrompt(true);
        try {
            const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: { parts: [{ text: `Enhance this video prompt to be more descriptive, cinematic, and detailed for an AI video generator. Keep it under 50 words. Original: "${prompt}"` }] }
            });
            if (response.text) {
                setPrompt(response.text.trim());
                addToast('Đã tối ưu hóa mô tả!', 'success');
            }
        } catch (e) {
            console.error(e);
            addToast('Không thể tối ưu hóa prompt.', 'error');
        } finally {
            setIsEnhancingPrompt(false);
        }
    };

    const handleGenerate = async () => {
        if (isGenerating || !loggedInUser) return;
        
        // Validation
        if (isExtending) {
             if (!lastVideoObject) { addToast('Không tìm thấy video gốc để mở rộng.', 'error'); return; }
             if (!prompt.trim()) { addToast('Vui lòng nhập mô tả cho phần tiếp theo của video.', 'error'); return; }
        } else {
             if (mode === 'text' && !prompt.trim()) { addToast('Vui lòng nhập mô tả video.', 'error'); return; }
             if (mode === 'image' && !inputImage) { addToast('Vui lòng tải lên ảnh đầu vào.', 'error'); return; }
        }

        const cost = tool.creditCost;
        if (currentCredits < cost) {
            addToast(`Không đủ Credit. Cần ${cost} Credit.`, 'error');
            return;
        }

        const creditResult = await handleUseToolCredit(loggedInUser.id, { ...tool, creditCost: cost });
        if (!creditResult.success) return;

        setIsGenerating(true);
        setGeneratedVideoUrl(null); // Clear preview to show loading
        setProgressStatus('Đang khởi tạo mô hình Veo...');

        const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

        try {
            let operation: any;
            
            // Append style to prompt if selected (only for new generations or if user wants to shift style in extension)
            let finalPrompt = prompt;
            if (selectedStyle && !isExtending) {
                const stylePrompt = VIDEO_STYLES.find(s => s.id === selectedStyle)?.prompt;
                if (stylePrompt) finalPrompt = `${finalPrompt}, ${stylePrompt}`;
            }

            if (isExtending) {
                // Extension Mode
                setProgressStatus('Đang mở rộng video (giữ nguyên nhân vật & bối cảnh)...');
                
                // Note: Extension usually works best with the pro model, but we respect the selected model if compatible.
                // However, Veo extension often requires specific model capabilities.
                // If user selected 'fast', but extension requires 'generate-preview', we might need to fallback or use selected if valid.
                // For now, we use the selected model, assuming user knows or we default to a capable one.
                // NOTE: @google/genai documentation says extension might be model-specific.
                // We'll use selectedModel.
                operation = await ai.models.generateVideos({
                    model: selectedModel,
                    prompt: finalPrompt, // Describe what happens NEXT
                    video: lastVideoObject, // Pass previous video object
                    config: { 
                        numberOfVideos: 1, 
                        resolution: '720p', // Mandatory for extension often
                        aspectRatio: aspectRatio 
                    }
                });
            } else if (mode === 'text') {
                // Text to Video
                operation = await ai.models.generateVideos({
                    model: selectedModel,
                    prompt: finalPrompt,
                    config: { numberOfVideos: 1, resolution, aspectRatio }
                });
            } else {
                // Image to Video
                const mimeType = inputImage!.split(';')[0].split(':')[1];
                const base64Data = inputImage!.split(',')[1];
                
                operation = await ai.models.generateVideos({
                    model: selectedModel,
                    prompt: finalPrompt || "Animate this image naturally, high quality, cinematic movement", 
                    image: { imageBytes: base64Data, mimeType: mimeType },
                    config: { numberOfVideos: 1, resolution: '720p', aspectRatio } // Image-to-video often safer at 720p
                });
            }

            setProgressStatus('Đang render video (quá trình có thể mất 1-2 phút)...');

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 8000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            const generatedVideoData = operation.response?.generatedVideos?.[0]?.video;
            const downloadLink = generatedVideoData?.uri;
            
            if (downloadLink && generatedVideoData) {
                // Store video object for future extension
                setLastVideoObject(generatedVideoData);
                
                setProgressStatus('Đang tải xuống video...');
                const videoResponse = await fetch(`${downloadLink}&key=${GEMINI_KEY}`);
                if (!videoResponse.ok) throw new Error("Không thể tải video.");
                
                const videoBlob = await videoResponse.blob();
                const videoObjectUrl = URL.createObjectURL(videoBlob);
                
                setGeneratedVideoUrl(videoObjectUrl);
                setCurrentStep(2); // Move to result view
                
                const successMsg = isExtending ? 'Đã mở rộng video thành công!' : 'Tạo video thành công!';
                addToast(successMsg, 'success');
                
                // History Save
                const thumbnailBase64 = await generateVideoThumbnail(videoObjectUrl);
                const newResult: GenerationResult = {
                    taskId: `vid_ai_${Date.now()}`,
                    date: new Date().toLocaleDateString('vi-VN'),
                    prompt: `[Veo ${isExtending ? 'Extend' : (mode === 'text' ? 'Text' : 'Image')}] ${prompt}`,
                    images: [thumbnailBase64],
                    settings: { aspectRatio: 'custom', customRatio: { width: 1920, height: 1080 }, quantity: 1, generationMode: 'Chất lượng', videoState: '' },
                    cost: cost,
                    balanceAfter: freshUser ? freshUser.creditBalance - cost : 0,
                    creationTime: new Date().toLocaleTimeString(),
                };
                handleSetGenerationHistory(loggedInUser.id, newResult);

            } else {
                throw new Error("API không trả về đường dẫn video.");
            }

        } catch (error: any) {
            console.error("Video Generation Error:", error);
            addToast('Tạo video thất bại. Đã hoàn lại Credit.', 'error');
            const userForRefund = findUserInTree(userState.allUsers, loggedInUser.id);
            if(userForRefund) await handleUseToolCredit(userForRefund.id, { ...tool, creditCost: -cost });
        } finally {
            setIsGenerating(false);
            setProgressStatus('');
        }
    };

    const handleDownload = () => {
        if (generatedVideoUrl) {
            const a = document.createElement('a');
            a.href = generatedVideoUrl;
            a.download = `veo_video_${Date.now()}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };
    
    const handleExtendVideo = () => {
        if (lastVideoObject) {
            setIsExtending(true);
            setCurrentStep(1); // Go back to input
            setPrompt(''); // Clear prompt so user can describe what happens NEXT
            addToast('Đã chuyển sang chế độ mở rộng. Hãy nhập mô tả cho diễn biến tiếp theo.', 'info');
        }
    };
    
    const handleReset = () => {
        setGeneratedVideoUrl(null); 
        setCurrentStep(1); 
        setIsExtending(false); 
        setLastVideoObject(null);
        setPrompt('');
    };

    const handleDeleteHistoryItem = (taskId: string) => {
         if (loggedInUser) {
            handleDeleteGenerationResult(loggedInUser.id, taskId);
            addToast('Đã xóa video khỏi lịch sử.', 'info');
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#0f172a] text-slate-200 font-sans">
            {/* History Modal */}
            <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Lịch sử Tạo Video" size="lg" hideFooter>
                <div className="max-h-[60vh] overflow-y-auto p-1 space-y-3">
                    {historyItems.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            <ClockIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>Chưa có lịch sử nào.</p>
                        </div>
                    ) : (
                        historyItems.map((item) => (
                            <div key={item.taskId} className="flex items-center gap-4 p-3 bg-slate-800 border border-slate-700 rounded-xl hover:border-indigo-500 transition-colors">
                                <div className="h-16 w-24 bg-slate-900 rounded-lg overflow-hidden flex-shrink-0 border border-slate-700">
                                    <img src={item.images[0]} alt="Result" className="h-full w-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{item.prompt}</p>
                                    <p className="text-xs text-slate-400 mt-1">{item.date} • {item.creationTime}</p>
                                </div>
                                <button onClick={() => handleDeleteHistoryItem(item.taskId)} className="p-2 bg-slate-700 text-red-400 rounded-lg hover:bg-slate-600" title="Xóa"><TrashIcon className="h-4 w-4" /></button>
                            </div>
                        ))
                    )}
                </div>
            </Modal>

            <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-30 shadow-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate('Kho Tiện Ích')} className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors">
                        <ArrowLeftIcon className="h-5 w-5" /> Quay lại
                    </button>
                    <h1 className="text-lg font-bold text-white flex items-center gap-2">
                        <FilmIcon className="h-6 w-6 text-indigo-500" />
                        Tạo video từ ảnh và chữ
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <CreditBalanceDisplay balance={currentCredits} onAdd={() => onNavigate('Ví Của Tôi')} />
                    <button onClick={() => setShowHistoryModal(true)} className="p-2 text-indigo-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-indigo-900/50"><ClockIcon className="h-5 w-5" /></button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* LEFT: CONTROLS */}
                <aside className="w-96 bg-[#161b22] border-r border-slate-800 flex flex-col overflow-y-auto">
                    <div className="p-6 space-y-8">
                        
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
                        
                        {/* Extension Mode Indicator */}
                        {isExtending && (
                            <div className="p-3 bg-green-900/30 border border-green-600/50 rounded-xl flex items-center gap-3 animate-fadeIn">
                                <div className="p-2 bg-green-600/20 rounded-full text-green-400">
                                    <ForwardIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-green-300">Chế độ Mở Rộng Video</h4>
                                    <p className="text-[10px] text-green-200/70">AI sẽ tạo thêm 5-7s tiếp theo dựa trên video trước, giữ nguyên nhân vật & bối cảnh.</p>
                                </div>
                                <button onClick={handleReset} className="ml-auto text-xs text-red-400 hover:text-red-300 underline">Hủy</button>
                            </div>
                        )}

                        {/* Step 1: Mode (Hidden if Extending) */}
                        {!isExtending && (
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">BƯỚC 1: CHỌN CHẾ ĐỘ</label>
                                <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                                    <button 
                                        onClick={() => { setMode('text'); setCurrentStep(1); }}
                                        className={`flex-1 py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${mode === 'text' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        <ChatBubbleBottomCenterTextIcon className="h-4 w-4" /> Từ Văn Bản
                                    </button>
                                    <button 
                                        onClick={() => { setMode('image'); setCurrentStep(1); }}
                                        className={`flex-1 py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${mode === 'image' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        <PhotoIcon className="h-4 w-4" /> Từ Hình Ảnh
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Input */}
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">BƯỚC 2: NHẬP NỘI DUNG</label>
                            
                            {mode === 'image' && !isExtending && (
                                <div className="space-y-3">
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`relative border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-800/50 group ${inputImage ? 'border-indigo-500' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800'}`}
                                    >
                                        {inputImage ? (
                                            <>
                                                <img src={inputImage} alt="Input" className="w-full h-full object-contain rounded-lg p-1" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                                                    <span className="text-white text-xs font-bold">Đổi ảnh</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center text-slate-500">
                                                <ArrowUpTrayIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">Tải ảnh lên</p>
                                            </div>
                                        )}
                                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                                    </div>
                                    
                                    {inputImage && (
                                        <button 
                                            onClick={() => handleAnalyzeImage()}
                                            disabled={isAnalyzingImage}
                                            className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                        >
                                            {isAnalyzingImage ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> : <EyeIcon className="h-3.5 w-3.5" />}
                                            {isAnalyzingImage ? 'Đang phân tích...' : '✨ Phân tích lại (AI Director)'}
                                        </button>
                                    )}
                                </div>
                            )}

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs text-slate-300 font-medium">
                                        {isExtending ? 'Mô tả diễn biến tiếp theo' : 'Mô tả Video (Prompt)'}
                                    </label>
                                    {(mode === 'text' || isExtending) && (
                                        <button 
                                            onClick={enhancePrompt} 
                                            disabled={isEnhancingPrompt || !prompt}
                                            className="text-[10px] flex items-center gap-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                                        >
                                            <SparklesIcon className={`h-3 w-3 ${isEnhancingPrompt ? 'animate-spin' : ''}`} /> Tối ưu bằng AI
                                        </button>
                                    )}
                                </div>
                                <textarea 
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    rows={5}
                                    placeholder={isExtending ? "Ví dụ: Nhân vật quay đầu lại và mỉm cười..." : (mode === 'text' ? "Mô tả video bạn muốn tạo... (VD: Cảnh quay flycam trên một thành phố tương lai vào ban đêm)" : "Mô tả chuyển động cho ảnh... (AI sẽ tự động điền sau khi tải ảnh)")}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                                />
                            </div>

                            {/* Style Presets */}
                            <div className="space-y-2">
                                <label className="text-xs text-slate-500">Phong cách (Tùy chọn)</label>
                                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                                    {VIDEO_STYLES.map(style => (
                                        <button
                                            key={style.id}
                                            onClick={() => setSelectedStyle(selectedStyle === style.id ? '' : style.id)}
                                            className={`px-3 py-1.5 text-[10px] font-bold rounded-full border transition-all ${selectedStyle === style.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                            title={style.prompt}
                                        >
                                            {style.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Step 3: Config */}
                        <div className="space-y-4 pt-4 border-t border-slate-800">
                             <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">BƯỚC 3: CẤU HÌNH</label>
                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                     <label className="block text-[10px] text-slate-500 mb-1">Tỉ lệ khung hình</label>
                                     <select 
                                        value={aspectRatio} 
                                        onChange={e => setAspectRatio(e.target.value as any)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white focus:ring-indigo-500"
                                        disabled={isExtending} // Aspect ratio locked during extension
                                     >
                                         <option value="16:9">16:9 (Ngang - YouTube)</option>
                                         <option value="9:16">9:16 (Dọc - TikTok)</option>
                                     </select>
                                 </div>
                                 <div>
                                     <label className="block text-[10px] text-slate-500 mb-1">Độ phân giải</label>
                                     <select 
                                        value={resolution}
                                        onChange={e => setResolution(e.target.value as any)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white focus:ring-indigo-500"
                                        disabled={isExtending} // Resolution locked to 720p during extension (API limitation)
                                     >
                                         <option value="720p">720p {isExtending ? '(Locked)' : '(Nhanh)'}</option>
                                         {!isExtending && <option value="1080p">1080p (Rõ nét)</option>}
                                     </select>
                                 </div>
                             </div>
                        </div>
                    </div>

                    {/* Footer Action */}
                    <div className="p-6 bg-slate-900 border-t border-slate-800 mt-auto">
                        <div className="flex justify-between items-center mb-4 text-sm">
                            <span className="text-slate-400">Chi phí ước tính:</span>
                            <span className="font-bold text-white flex items-center gap-1">
                                <SparklesIcon className="h-4 w-4 text-yellow-400" />
                                {tool.creditCost} Credit
                            </span>
                        </div>
                        <button 
                            onClick={handleGenerate}
                            disabled={isGenerating || (!isExtending && mode === 'text' && !prompt.trim()) || (!isExtending && mode === 'image' && !inputImage)}
                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
                        >
                            {isGenerating ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : (isExtending ? <ForwardIcon className="h-5 w-5" /> : <FilmIcon className="h-5 w-5" />)}
                            {isGenerating ? 'Đang tạo video...' : (isExtending ? 'MỞ RỘNG VIDEO NGAY' : 'TẠO VIDEO NGAY')}
                        </button>
                    </div>
                </aside>

                {/* RIGHT: PREVIEW STAGE */}
                <main className="flex-1 bg-black flex items-center justify-center relative p-8">
                     <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

                     <div className="w-full max-w-5xl h-full flex flex-col">
                         {generatedVideoUrl ? (
                             <div className="relative w-full h-full flex flex-col items-center justify-center animate-fadeIn">
                                 <div className="relative w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 group max-h-[80vh]">
                                    <video 
                                        ref={videoRef}
                                        src={generatedVideoUrl} 
                                        controls 
                                        autoPlay 
                                        loop 
                                        className="w-full h-full object-contain"
                                    />
                                 </div>
                                 <div className="flex gap-4 mt-6">
                                     <button onClick={handleReset} className="px-6 py-2.5 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 border border-slate-700 transition-colors">
                                         Làm video mới
                                     </button>
                                     <button onClick={handleExtendVideo} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 shadow-lg flex items-center gap-2 transition-colors border border-indigo-500/50">
                                         <ForwardIcon className="h-5 w-5" /> Tiếp tục tạo (Giữ bối cảnh)
                                     </button>
                                     <button onClick={handleDownload} className="px-8 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 shadow-lg flex items-center gap-2 transition-colors">
                                         <DocumentArrowDownIcon className="h-5 w-5" /> Tải xuống MP4
                                     </button>
                                 </div>
                             </div>
                         ) : (
                             <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                                 {isGenerating ? (
                                     <div className="flex flex-col items-center gap-4 z-10">
                                         <div className="w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                         <div>
                                            <h3 className="text-2xl font-bold text-white">AI Đang Sản Xuất...</h3>
                                            <p className="text-indigo-400 mt-2 font-mono">{progressStatus}</p>
                                         </div>
                                     </div>
                                 ) : (
                                     <div className="opacity-30">
                                         <FilmIcon className="h-32 w-32 mx-auto text-slate-500 mb-4" />
                                         <h3 className="text-3xl font-bold text-slate-400">Preview Stage</h3>
                                         <p className="text-slate-500 mt-2">Video của bạn sẽ xuất hiện tại đây sau khi hoàn tất.</p>
                                     </div>
                                 )}
                             </div>
                         )}
                     </div>
                </main>
            </div>
        </div>
    );
};

export default AiVideoGenerator;
