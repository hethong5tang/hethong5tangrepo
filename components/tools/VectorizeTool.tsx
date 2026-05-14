
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { 
    ArrowLeftIcon, ArrowUpTrayIcon, DocumentArrowDownIcon, SparklesIcon, 
    CubeIcon, ArrowPathIcon, TrashIcon, SwatchIcon, AdjustmentsHorizontalIcon,
    CheckIcon, CodeBracketIcon, PhotoIcon, PaintBrushIcon, Square2StackIcon,
    InformationCircleIcon, ClockIcon, BoltIcon
} from '../Icons';
import { IntegrationTool } from '../../features/settings/types';
import { useAuth } from '../../features/auth/useAuth';
import { useUser } from '../../features/users/useUser';
import { useActions } from '../../features/actions/useActions';
import { useToast } from '../../components/ToastProvider';
import { useSettings } from '../../features/settings/useSettings';
import { ALL_GEMINI_MODELS } from '../../constants';
import { findUserInTree } from '../../services/userService';
import { GenerationResult } from '../../features/users/types';
import CreditBalanceDisplay from './CreditBalanceDisplay';
import Modal from '../../components/Modal';

interface VectorizeToolProps {
    tool: IntegrationTool;
    onNavigate: (page: string) => void;
}

type ProcessingMode = 'ai_art' | 'pixel_exact';

const VectorizeTool: React.FC<VectorizeToolProps> = ({ tool, onNavigate }) => {
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
            return ALL_GEMINI_MODELS.filter(m => toolSpecificModels.includes(m.id));
        }

        const activeIds = settingsState.systemSettings.activeGeminiModels || [];
        const filtered = ALL_GEMINI_MODELS.filter(m => activeIds.includes(m.id));
        return filtered.length > 0 ? filtered : [ALL_GEMINI_MODELS[0]];
    }, [settingsState.systemSettings.activeGeminiModels, tool.modelPricing]);

    // Use correct key from environment
    const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || '';

    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [imageDimensions, setImageDimensions] = useState<{w: number, h: number}>({w: 512, h: 512});
    const [resultSvgCode, setResultSvgCode] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Settings
    const [mode, setMode] = useState<ProcessingMode>('pixel_exact');
    const [selectedModel, setSelectedModel] = useState<string>(activeModels[0].id);

    useEffect(() => {
        if (!activeModels.some(m => m.id === selectedModel)) {
            setSelectedModel(activeModels[0].id);
        }
    }, [activeModels, selectedModel]);
    
    // AI Settings
    const [aiStyle, setAiStyle] = useState<'flat' | 'logo' | 'low_poly'>('flat');
    
    // Pixel Settings
    const [pixelDetail, setPixelDetail] = useState<number>(800); // Default high
    const [pixelShape, setPixelShape] = useState<'rect' | 'circle'>('rect');

    // History State
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    const freshUser = useMemo(() => loggedInUser ? findUserInTree(userState.allUsers, loggedInUser.id) : null, [userState.allUsers, loggedInUser]);
    const currentCredits = freshUser ? freshUser.creditBalance : 0;

    // Dynamic Storage Key based on User ID
    const storageKey = useMemo(() => `tool_vectorizer_session_${loggedInUser?.id}`, [loggedInUser]);

    // Get History Items
    const historyItems = useMemo(() => {
        if (!loggedInUser?.generationHistory) return [];
        return loggedInUser.generationHistory
            .filter(h => h.taskId.startsWith('vec_'))
            .sort((a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime());
    }, [loggedInUser]);

    // --- PERSISTENCE LOGIC ---
    useEffect(() => {
        const loadSession = () => {
            try {
                const savedSession = localStorage.getItem(storageKey);
                if (savedSession) {
                    const data = JSON.parse(savedSession);
                    if (data.uploadedImage) setUploadedImage(data.uploadedImage);
                    if (data.resultSvgCode) setResultSvgCode(data.resultSvgCode);
                    if (data.mode) setMode(data.mode);
                    if (data.aiStyle) setAiStyle(data.aiStyle);
                    if (data.pixelDetail) setPixelDetail(data.pixelDetail);
                    if (data.pixelShape) setPixelShape(data.pixelShape);
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
                    resultSvgCode,
                    mode,
                    aiStyle,
                    pixelDetail,
                    pixelShape
                };
                localStorage.setItem(storageKey, JSON.stringify(data));
            } catch (e) {
                console.error("Quota exceeded, cannot save session", e);
            }
        };
        const timeout = setTimeout(saveSession, 1000);
        return () => clearTimeout(timeout);
    }, [uploadedImage, resultSvgCode, mode, aiStyle, pixelDetail, pixelShape, storageKey]);

    const handleResetSession = () => {
        if (window.confirm("Bạn có chắc muốn xóa phiên làm việc hiện tại?")) {
            localStorage.removeItem(storageKey);
            setUploadedImage(null);
            setResultSvgCode(null);
            setMode('pixel_exact');
            addToast('Đã làm mới phiên làm việc.', 'success');
        }
    };

    const handleLoadHistoryItem = (item: GenerationResult) => {
        if (item.images && item.images.length > 0) {
            const dataUri = item.images[0];
            if (dataUri.startsWith('data:image/svg+xml')) {
                try {
                    // Decode the SVG content
                    // Remove the data URI prefix
                    const content = dataUri.replace(/data:image\/svg\+xml;charset=utf-8,/, '');
                    const svgContent = decodeURIComponent(content);
                    setResultSvgCode(svgContent);
                    addToast('Đã tải kết quả từ lịch sử.', 'success');
                    setShowHistoryModal(false);
                    return;
                } catch (e) {
                    console.error("Error decoding SVG from history", e);
                }
            }
        }
        addToast('Không thể tải kết quả này.', 'error');
    };

    const handleDeleteHistoryItem = (taskId: string) => {
        if (loggedInUser) {
            handleDeleteGenerationResult(loggedInUser.id, taskId);
            addToast('Đã xóa kết quả khỏi lịch sử.', 'info');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    const img = new Image();
                    img.onload = () => {
                        const w = img.width;
                        const h = img.height;
                        setImageDimensions({w, h});
                        setUploadedImage(event.target!.result as string);
                        setResultSvgCode(null);
                    };
                    img.src = event.target!.result as string;
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
        if (e.target) e.target.value = '';
    };

    // --- CLIENT-SIDE PIXEL TRACER (Optimized with RLE & Array Join) ---
    const processPixelVector = async () => {
        if (!uploadedImage) return;
        setIsProcessing(true);
        
        // Allow UI to update before heavy calculation
        await new Promise(r => setTimeout(r, 100));

        try {
            const img = new Image();
            img.src = uploadedImage;
            await new Promise(resolve => { img.onload = resolve; });

            const canvas = document.createElement('canvas');
            // Maintain aspect ratio
            const ratio = img.width / img.height;
            let gridW = pixelDetail;
            let gridH = Math.round(pixelDetail / ratio);
            
            if (gridH === 0) gridH = 1;

            canvas.width = gridW;
            canvas.height = gridH;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Canvas error");

            // Draw small (pixelates the image)
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, gridW, gridH);
            
            const imageData = ctx.getImageData(0, 0, gridW, gridH);
            const data = imageData.data;

            // Build SVG using Array for performance
            const svgElements: string[] = [];
            
            if (pixelShape === 'rect') {
                // Run-Length Encoding (RLE) Optimization for Rectangles
                for (let y = 0; y < gridH; y++) {
                    let currentHex = null;
                    let startX = 0;
                    let width = 0;

                    for (let x = 0; x < gridW; x++) {
                        const i = (y * gridW + x) * 4;
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        const a = data[i + 3];

                        // Treat mostly transparent pixels as transparent
                        if (a < 20) {
                            if (currentHex !== null) {
                                // Flush current run
                                svgElements.push(`<rect x="${startX}" y="${y}" width="${width}" height="1" fill="${currentHex}" />`);
                                currentHex = null;
                                width = 0;
                            }
                            continue;
                        }

                        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

                        if (hex === currentHex) {
                            width++;
                        } else {
                            // Flush previous run
                            if (currentHex !== null) {
                                svgElements.push(`<rect x="${startX}" y="${y}" width="${width}" height="1" fill="${currentHex}" />`);
                            }
                            // Start new run
                            currentHex = hex;
                            startX = x;
                            width = 1;
                        }
                    }
                    // Flush end of row
                    if (currentHex !== null) {
                         svgElements.push(`<rect x="${startX}" y="${y}" width="${width}" height="1" fill="${currentHex}" />`);
                    }
                }
            } else {
                // Circle Mode (Dots) - No RLE possible for circles
                for (let y = 0; y < gridH; y++) {
                    for (let x = 0; x < gridW; x++) {
                        const i = (y * gridW + x) * 4;
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        const a = data[i + 3];

                        if (a > 20) {
                            const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
                            svgElements.push(`<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.45" fill="${hex}" />`);
                        }
                    }
                }
            }

            const svgOutput = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${gridW} ${gridH}" shape-rendering="${pixelShape === 'rect' ? 'crispEdges' : 'auto'}" style="background-color: transparent;">
  ${svgElements.join('')}
</svg>`.trim();

            setResultSvgCode(svgOutput);

            // Save to History
            if (loggedInUser) {
                const svgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgOutput)}`;
                const newResult: GenerationResult = {
                    taskId: `vec_px_${Date.now()}`,
                    date: new Date().toLocaleDateString('vi-VN'),
                    prompt: `[Pixel Vector] ${pixelShape === 'rect' ? 'Rect' : 'Circle'} - ${pixelDetail}px`,
                    images: [svgDataUri],
                    settings: {
                        aspectRatio: 'custom', 
                        customRatio: { width: gridW, height: gridH }, 
                        quantity: 1, 
                        generationMode: 'Chất lượng', 
                        imageStyle: 'Pixel'
                    },
                    cost: 0, // Pixel mode is free/client-side
                    balanceAfter: currentCredits,
                    creationTime: new Date().toLocaleTimeString(),
                };
                handleSetGenerationHistory(loggedInUser.id, newResult);
            }

            addToast('Đã tạo Vector Pixel sắc nét!', 'success');

        } catch (e) {
            console.error(e);
            addToast('Lỗi xử lý ảnh.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // --- AI VECTORIZER ---
    const processAiVector = async () => {
        if (isProcessing || !loggedInUser || !uploadedImage) return;

        const cost = tool.creditCost;
        if (currentCredits < cost) {
            addToast('Không đủ Credit để thực hiện.', 'error');
            return;
        }

        setIsProcessing(true);
        setResultSvgCode(null);
        
        const creditResult = await handleUseToolCredit(loggedInUser.id, { ...tool, creditCost: cost });
        if (!creditResult.success) {
            setIsProcessing(false);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
            
            // Prepare low-res version for AI to see structure better without getting lost in noise
            const img = new Image();
            img.src = uploadedImage;
            await new Promise(resolve => { img.onload = resolve });
            
            const canvas = document.createElement('canvas');
            const maxDim = 512;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
                const scale = maxDim / Math.max(w, h);
                w *= scale;
                h *= scale;
            }
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
            const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

            const imagePart = { inlineData: { data: base64Data, mimeType: 'image/jpeg' } };
            
            let stylePrompt = "";
            if (aiStyle === 'logo') stylePrompt = "Minimalist Logo, flat solid colors, sharp lines, simple shapes.";
            if (aiStyle === 'flat') stylePrompt = "High Fidelity Flat Vector Illustration, sharp edges, no gradients, precise details.";
            if (aiStyle === 'low_poly') stylePrompt = "Detailed Low Poly Art, geometric triangles, sharp facets.";

            const systemInstruction = `
You are a professional Vector Graphics Engine.
TASK: Convert the input image into a high-quality SVG vector file (${stylePrompt}).

STRICT OUTPUT RULES:
1. Return ONLY the raw SVG XML code.
2. DO NOT wrap the code in markdown (like \`\`\`xml ... \`\`\`).
3. DO NOT include any conversational text, explanations, or comments.
4. Ensure the SVG is valid and can be rendered immediately.

SVG SPECIFICATIONS:
- ViewBox: "0 0 ${w} ${h}"
- Precision: High detail. Use <path>, <polygon>, and <rect> elements.
- Styling: Use inline styles or attributes.
- Colors: Accurate to original image.
`;

            const response = await ai.models.generateContent({
                model: selectedModel, 
                contents: { parts: [imagePart, { text: "Generate SVG code." }] },
                config: { 
                    systemInstruction: systemInstruction,
                    temperature: 0.2,
                    maxOutputTokens: 8192, 
                },
            });

            let svgCode = response.text || "";
            
            // 1. Strip Markdown code blocks if present
            const markdownMatch = svgCode.match(/```(?:xml|svg)?\s*([\s\S]*?)\s*```/i);
            if (markdownMatch && markdownMatch[1]) {
                svgCode = markdownMatch[1].trim();
            }

            // 2. Locate <svg> tag
            const startIndex = svgCode.indexOf('<svg');
            if (startIndex === -1) {
                throw new Error("AI response did not contain valid SVG markup.");
            }
            
            svgCode = svgCode.substring(startIndex);

            // 3. Handle truncation (Auto-close)
            const endIndex = svgCode.lastIndexOf('</svg>');
            if (endIndex !== -1) {
                svgCode = svgCode.substring(0, endIndex + 6);
            } else {
                // Attempt to close if truncated (simple fix)
                svgCode += '</svg>';
            }

            const svgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgCode)}`;

            const newResult: GenerationResult = {
                taskId: `vec_${Date.now()}`,
                date: new Date().toLocaleDateString('vi-VN'),
                prompt: `[AI Vector] ${aiStyle}`,
                images: [svgDataUri],
                settings: {
                    aspectRatio: 'custom', 
                    customRatio: { width: w, height: h }, 
                    quantity: 1, 
                    generationMode: 'Chất lượng', 
                    imageStyle: aiStyle
                },
                cost: cost,
                balanceAfter: freshUser ? freshUser.creditBalance - cost : 0,
                creationTime: new Date().toLocaleTimeString(),
            };
            
            handleSetGenerationHistory(loggedInUser.id, newResult);
            setResultSvgCode(svgCode);
            addToast('AI đã tạo bản phác thảo Vector!', 'success');

        } catch (error) {
            console.error("AI Error:", error);
            addToast('Lỗi AI sinh mã. Đã hoàn lại Credit.', 'error');
            const userForRefund = findUserInTree(userState.allUsers, loggedInUser.id);
            if(userForRefund) {
                await handleUseToolCredit(userForRefund.id, { ...tool, creditCost: -cost });
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleProcess = () => {
        if (mode === 'pixel_exact') {
            processPixelVector();
        } else {
            processAiVector();
        }
    };

    const handleDownload = () => {
        if (!resultSvgCode) return;
        try {
            const blob = new Blob([resultSvgCode], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `vector_${mode}_${Date.now()}.svg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (e) {
            addToast("Lỗi tải xuống.", "error");
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-950 text-gray-300">
             {/* HISTORY MODAL */}
             <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Lịch sử Vector Hóa" size="lg" hideFooter>
                <div className="max-h-[60vh] overflow-y-auto p-1 space-y-3">
                    {historyItems.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            <ClockIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>Chưa có lịch sử nào.</p>
                        </div>
                    ) : (
                        historyItems.map((item) => (
                            <div key={item.taskId} className="flex items-center gap-4 p-3 bg-slate-800 border border-slate-700 rounded-xl hover:border-indigo-500 transition-colors">
                                <div className="h-16 w-16 bg-slate-900 rounded-lg overflow-hidden flex-shrink-0 border border-slate-700 flex items-center justify-center">
                                    <img src={item.images[0]} alt="Result" className="w-full h-full object-contain" />
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

            <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-30 shadow-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate('Kho Tiện Ích')} className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <ArrowLeftIcon className="h-5 w-5" />
                        Quay lại
                    </button>
                    <h1 className="text-lg font-bold text-white flex items-center gap-2">
                        <CubeIcon className="h-5 w-5 text-indigo-500" />
                        AI Vectorizer Pro
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                     <CreditBalanceDisplay balance={currentCredits} onAdd={() => onNavigate('Ví Của Tôi')} />
                     
                     <button 
                        onClick={() => setShowHistoryModal(true)}
                        className="p-2 text-indigo-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-indigo-900/50"
                        title="Lịch sử"
                     >
                        <ClockIcon className="h-5 w-5" />
                     </button>

                     <button 
                        onClick={handleResetSession}
                        className="p-2 text-gray-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Làm mới phiên làm việc"
                    >
                        <ArrowPathIcon className="h-5 w-5" />
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Controls */}
                <aside className="w-80 bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-6 overflow-y-auto">
                    {/* MODEL SELECTOR */}
                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
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

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">1. Ảnh Gốc (Bitmap)</label>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-6 border-2 border-dashed border-slate-700 rounded-xl hover:border-indigo-500 hover:bg-slate-800 transition-all flex flex-col items-center gap-2 text-slate-400 bg-slate-900"
                        >
                            {uploadedImage ? (
                                <div className="relative w-full h-32 px-2">
                                     <img src={uploadedImage} alt="Preview" className="w-full h-full object-contain rounded-md" />
                                     <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity text-xs text-white font-medium rounded-lg">Đổi ảnh</div>
                                </div>
                            ) : (
                                <>
                                    <ArrowUpTrayIcon className="h-8 w-8 opacity-50" />
                                    <span className="text-sm">Tải ảnh lên (JPG, PNG)</span>
                                </>
                            )}
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                    </div>

                    {/* MODE SELECTION */}
                    <div className="space-y-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase">2. Chọn Phương Pháp</label>
                        
                        <div 
                            onClick={() => setMode('pixel_exact')}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${mode === 'pixel_exact' ? 'bg-indigo-900/30 border-indigo-500 ring-1 ring-indigo-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}
                        >
                            <div className={`mt-0.5 p-1.5 rounded-full ${mode === 'pixel_exact' ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-gray-400'}`}>
                                <Square2StackIcon className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className={`text-sm font-bold ${mode === 'pixel_exact' ? 'text-indigo-300' : 'text-gray-300'}`}>Pixel Vector (Chính xác 100%)</h4>
                                <p className="text-[10px] text-slate-400 mt-1">
                                    Tái tạo từng điểm ảnh thành vector. Giữ nguyên màu sắc và chi tiết tuyệt đối.
                                </p>
                            </div>
                        </div>

                        <div 
                            onClick={() => setMode('ai_art')}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${mode === 'ai_art' ? 'bg-purple-900/30 border-purple-500 ring-1 ring-purple-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}
                        >
                            <div className={`mt-0.5 p-1.5 rounded-full ${mode === 'ai_art' ? 'bg-purple-500 text-white' : 'bg-slate-700 text-gray-400'}`}>
                                <SparklesIcon className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className={`text-sm font-bold ${mode === 'ai_art' ? 'text-purple-300' : 'text-gray-300'}`}>AI Sáng tạo (Nghệ thuật)</h4>
                                <p className="text-[10px] text-slate-400 mt-1">
                                    AI vẽ lại theo phong cách phẳng (Flat) hoặc Logo. Đẹp nhưng có thể thay đổi chi tiết.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CONTROLS PER MODE */}
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                        {mode === 'pixel_exact' ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-400">Độ nét (Resolution)</label>
                                    <span className="text-xs font-mono text-indigo-400">{pixelDetail} px</span>
                                </div>
                                <input 
                                    type="range" min="32" max="2048" step="16"
                                    value={pixelDetail} 
                                    onChange={(e) => setPixelDetail(Number(e.target.value))}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                                <div className="flex justify-between text-[10px] text-slate-500">
                                    <span>Thấp</span>
                                    <span>{pixelDetail > 1000 ? 'Cực đại (Có thể chậm)' : 'Siêu nét'}</span>
                                </div>

                                <div className="pt-2">
                                    <label className="block text-xs font-bold text-slate-400 mb-2">Hình dáng Pixel</label>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setPixelShape('rect')}
                                            className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${pixelShape === 'rect' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-gray-400 border-slate-600'}`}
                                        >
                                            Vuông (Liền mạch)
                                        </button>
                                        <button 
                                            onClick={() => setPixelShape('circle')}
                                            className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${pixelShape === 'circle' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-gray-400 border-slate-600'}`}
                                        >
                                            Tròn (Chấm Dot)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-slate-400">Phong cách AI</label>
                                <select 
                                    value={aiStyle} 
                                    onChange={e => setAiStyle(e.target.value as any)}
                                    className="w-full bg-slate-900 border border-slate-600 text-xs text-white rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="flat">Flat Illustration (Hình họa phẳng - Sắc nét)</option>
                                    <option value="logo">Logo / Icon (Tối giản - Ít màu)</option>
                                    <option value="low_poly">Low Poly (Đa giác - 3D)</option>
                                </select>
                                <div className="flex items-center justify-between text-xs text-slate-400">
                                    <span>Chi phí:</span>
                                    <span className="text-yellow-400 font-bold flex items-center gap-1"><SparklesIcon className="h-3 w-3"/> {tool.creditCost} Credit</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto pt-4">
                        <button 
                            onClick={handleProcess}
                            disabled={!uploadedImage || isProcessing}
                            className={`w-full py-3.5 text-white font-bold rounded-xl shadow-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform active:scale-95 ${mode === 'pixel_exact' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-gradient-to-r from-purple-600 to-pink-600'}`}
                        >
                            {isProcessing ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : (mode === 'pixel_exact' ? <Square2StackIcon className="h-5 w-5" /> : <PaintBrushIcon className="h-5 w-5" />)}
                            {isProcessing ? 'Đang xử lý...' : (mode === 'pixel_exact' ? 'Vector hóa (Pixel Exact)' : 'AI Vẽ Vector')}
                        </button>
                    </div>
                </aside>

                {/* Main Preview */}
                <main className="flex-1 bg-slate-950 p-4 md:p-8 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 pointer-events-none" 
                        style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                    </div>

                    {!uploadedImage ? (
                        <div className="text-center space-y-4 opacity-50">
                            <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-slate-700">
                                <CubeIcon className="h-10 w-10 text-slate-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-500">Sẵn sàng chuyển đổi</h3>
                            <p className="text-slate-600 max-w-xs mx-auto">Chọn ảnh để biến đổi thành Vector SVG chuyên nghiệp.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row gap-6 h-full w-full max-w-7xl">
                            {/* Original */}
                            <div className="flex-1 flex flex-col gap-2 min-h-0">
                                <div className="flex justify-between text-xs font-bold uppercase text-slate-500 px-1">
                                    <span>Ảnh gốc (Bitmap)</span>
                                </div>
                                <div className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex items-center justify-center shadow-inner overflow-hidden">
                                    <img src={uploadedImage} alt="Original" className="max-w-full max-h-full object-contain" />
                                </div>
                            </div>

                            {/* Result */}
                            <div className="flex-1 flex flex-col gap-2 min-h-0">
                                <div className="flex justify-between text-xs font-bold uppercase text-indigo-400 px-1">
                                    <span>Kết quả Vector (SVG)</span>
                                    {resultSvgCode && <span className="flex items-center gap-1 text-green-500"><CheckIcon className="h-3 w-3"/> Hoàn tất</span>}
                                </div>
                                <div className="flex-1 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzFmMjkzNyIvPgo8cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzFmMjkzNyIvPgo8L3N2Zz4=')] rounded-2xl border border-indigo-500/30 p-4 flex items-center justify-center shadow-lg relative group overflow-hidden">
                                    {resultSvgCode ? (
                                        <>
                                            <div 
                                                className="w-full h-full flex items-center justify-center"
                                                dangerouslySetInnerHTML={{ __html: resultSvgCode }} 
                                                style={{ maxWidth: '100%', maxHeight: '100%' }}
                                            />
                                            
                                            <div className="absolute bottom-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                                <button onClick={handleDownload} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-full shadow-xl flex items-center gap-2 transition-transform hover:scale-105">
                                                    <DocumentArrowDownIcon className="h-4 w-4" /> Tải xuống SVG
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center text-slate-600">
                                            {isProcessing ? (
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                                    <span className="text-sm font-medium text-indigo-400 animate-pulse">
                                                        {mode === 'pixel_exact' ? 'Đang tạo vector siêu nét...' : 'AI đang vẽ lại...'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 opacity-50">
                                                    <CodeBracketIcon className="h-10 w-10" />
                                                    <span>Kết quả sẽ hiện ở đây</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default VectorizeTool;
