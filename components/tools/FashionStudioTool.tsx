
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { 
    ArrowLeftIcon, SparklesIcon, DocumentArrowDownIcon, 
    PhotoIcon, CheckCircleIcon, TrashIcon, ArrowPathIcon, 
    CubeIcon, ClockIcon, ScissorsIcon,
    ShoppingBagIcon, UserIcon, ArrowUpTrayIcon,
    ChevronUpIcon, AdjustmentsHorizontalIcon,
    TagIcon, ArrowsRightLeftIcon,
    PlusIcon, CameraIcon, EyeIcon,
    FilmIcon, MapPinIcon, PencilSquareIcon, BoltIcon
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
import FormattedNumberInput from '../../components/FormattedNumberInput';

interface FashionStudioToolProps {
    tool: IntegrationTool;
    onNavigate: (page: string) => void;
}

const FITS = [
    { id: 'regular', label: 'Vừa vặn (Regular)' },
    { id: 'slim', label: 'Ôm sát (Slim)' },
    { id: 'oversize', label: 'Rộng rãi (Oversize)' },
];

const STYLES = [
    { id: 'untucked', label: 'Thả ngoài (Untucked)' },
    { id: 'tucked', label: 'Sơ vin (Tucked-in)' },
];

const FRAMING_OPTIONS = [
    { id: 'auto', label: 'Tự động (Theo ảnh gốc)' },
    { id: 'full_body', label: 'Toàn thân (Full Body)' },
    { id: 'half_body', label: 'Nửa người (Waist Up)' },
    { id: 'close_up', label: 'Cận cảnh (Close Up)' },
];

const BODY_SHAPES = [
    { id: 'none', label: '✨ Điều chỉnh tự do' }, 
    
    // Female Shapes
    { id: 'hourglass', label: 'Đồng hồ cát (Nữ - Hourglass)' },
    { id: 'pear', label: 'Dáng quả lê (Nữ - Pear)' },
    { id: 'apple', label: 'Dáng quả táo (Nữ - Apple)' },
    { id: 'rectangle', label: 'Dáng chữ nhật (Nữ - Rectangle)' }, 
    { id: 'inverted_triangle', label: 'Tam giác ngược (Nữ - Inverted Triangle)' },
    
    // Male Shapes
    { id: 'trapezoid', label: 'Hình thang (Nam chuẩn - Trapezoid)' },
    { id: 'triangle_male', label: 'Dáng Tam giác (Nam - Triangle)' },
    { id: 'oval_male', label: 'Dáng Oval (Nam - Oval)' },
    { id: 'rectangle_male', label: 'Dáng chữ nhật (Nam - Rectangle)' },
    { id: 'inverted_triangle_male', label: 'Tam giác ngược (Nam - Inverted Triangle)' },
];

interface BodyMetrics {
    height: number;
    weight: number;
    chest: number;
    waist: number;
    hips: number;
    bodyShape: string;
}

interface View3DState {
    isOpen: boolean;
    frontImage: string;
    leftImage?: string;
    rightImage?: string;
    backImage?: string;
    currentAngle: number; 
    isLoading: boolean;
}


type BackgroundMode = 'original' | 'upload' | 'prompt';

const FashionStudioTool: React.FC<FashionStudioToolProps> = ({ tool, onNavigate }) => {
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

    const [userImage, setUserImage] = useState<string | null>(null);
    const [garmentImage, setGarmentImage] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    
    const [fit, setFit] = useState(FITS[0].id);
    const [style, setStyle] = useState(STYLES[0].id);
    const [framing, setFraming] = useState('full_body'); // Default to Full Body
    
    // Background State
    const [bgMode, setBgMode] = useState<BackgroundMode>('original');
    const [bgImage, setBgImage] = useState<string | null>(null);
    const [bgPrompt, setBgPrompt] = useState<string>('');

    const [metrics, setMetrics] = useState<BodyMetrics>({
        height: 175,
        weight: 70,
        chest: 90,
        waist: 75,
        hips: 90,
        bodyShape: 'none'
    });

    const [view3D, setView3D] = useState<View3DState>({
        isOpen: false,
        frontImage: '',
        currentAngle: 50,
        isLoading: false
    });
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false); 
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showDownloadOptions, setShowDownloadOptions] = useState(false);
    const [selectedModel, setSelectedModel] = useState<string>(activeModels[0].id);

    useEffect(() => {
        if (!activeModels.some(m => m.id === selectedModel)) {
            setSelectedModel(activeModels[0].id);
        }
    }, [activeModels, selectedModel]);

    const userInputRef = useRef<HTMLInputElement>(null);
    const garmentInputRef = useRef<HTMLInputElement>(null);
    const bgInputRef = useRef<HTMLInputElement>(null);

    const freshUser = useMemo(() => loggedInUser ? findUserInTree(userState.allUsers, loggedInUser.id) : null, [userState.allUsers, loggedInUser]);
    const currentCredits = freshUser ? freshUser.creditBalance : 0;

    const storageKey = useMemo(() => `tool_fashion_studio_session_${loggedInUser?.id}`, [loggedInUser]);

    const historyItems = useMemo(() => {
        if (!loggedInUser?.generationHistory) return [];
        return loggedInUser.generationHistory
            .filter(h => h.taskId.startsWith('fashion_'))
            .sort((a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime());
    }, [loggedInUser]);

    useEffect(() => {
        const loadSession = () => {
            try {
                const savedSession = localStorage.getItem(storageKey);
                if (savedSession) {
                    const data = JSON.parse(savedSession);
                    if (data.userImage) setUserImage(data.userImage);
                    if (data.garmentImage) setGarmentImage(data.garmentImage);
                    if (data.resultImage) setResultImage(data.resultImage);
                    if (data.fit) setFit(data.fit);
                    if (data.style) setStyle(data.style);
                    if (data.framing) setFraming(data.framing);
                    if (data.metrics) setMetrics(data.metrics);
                    if (data.bgMode) setBgMode(data.bgMode);
                    if (data.bgImage) setBgImage(data.bgImage);
                    if (data.bgPrompt) setBgPrompt(data.bgPrompt);
                }
            } catch (e) { console.error("Failed to load session", e); }
        };
        loadSession();
    }, [storageKey]);

    useEffect(() => {
        const saveSession = () => {
            try {
                const data = { userImage, garmentImage, resultImage, fit, style, framing, metrics, bgMode, bgImage, bgPrompt };
                localStorage.setItem(storageKey, JSON.stringify(data));
            } catch (e) { console.error("Quota exceeded", e); }
        };
        const timeout = setTimeout(saveSession, 1000);
        return () => clearTimeout(timeout);
    }, [userImage, garmentImage, resultImage, fit, style, framing, metrics, bgMode, bgImage, bgPrompt, storageKey]);

    const handleResetSession = () => {
        if (window.confirm("Xóa toàn bộ phiên làm việc hiện tại?")) {
            localStorage.removeItem(storageKey);
            setUserImage(null);
            setGarmentImage(null);
            setResultImage(null);
            setFraming('full_body');
            setBgMode('original');
            setBgImage(null);
            setBgPrompt('');
            addToast('Đã làm mới.', 'success');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'user' | 'garment' | 'bg') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    const res = event.target.result as string;
                    if (type === 'user') setUserImage(res);
                    else if (type === 'garment') setGarmentImage(res);
                    else setBgImage(res);
                }
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
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

    const handleDownload = (input: string | number = 1) => {
        let urlToDownload: string | null = null;
        let scale = 1;

        if (typeof input === 'string') {
            urlToDownload = input;
        } else {
            urlToDownload = resultImage;
            scale = input;
        }

        if (!urlToDownload) return;
        
        if (scale === 1) {
            const link = document.createElement('a');
            link.href = urlToDownload;
            link.download = `fashion_result_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = urlToDownload;
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
                    link.download = `fashion_result_${scale}x_${Date.now()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    addToast(`Đã tải xuống ảnh kích thước x${scale}`, 'success');
                }
            };
        }
        setShowDownloadOptions(false);
    };

    const handleDownloadGarment = () => {
        if (!garmentImage) return;
        const link = document.createElement('a');
        link.href = garmentImage;
        link.download = `garment_ref_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast('Đã tải xuống ảnh trang phục!', 'success');
    };

    const handleExtractGarment = async () => {
        if (isExtracting || !loggedInUser || !garmentImage) return;

        const costExtract = 20;
        if (currentCredits < costExtract) {
            addToast(`Không đủ Credit. Cần ${costExtract} Credit.`, 'error');
            return;
        }

        setIsExtracting(true);
        const creditResult = await handleUseToolCredit(loggedInUser.id, { ...tool, creditCost: costExtract });
        if (!creditResult.success) {
            setIsExtracting(false);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
            const mimeType = garmentImage.split(';')[0].split(':')[1] || 'image/png';
            const imagePart = { inlineData: { data: garmentImage.split(',')[1], mimeType } };

            const prompt = `
            **ROLE**: Expert E-commerce Image Retoucher.
            **TASK**: Create a 'Ghost Mannequin' product shot of the ENTIRE OUTFIT.
            
            **INPUT**: A photo of a person wearing clothing or a flat lay.
            
            **CRITICAL REQUIREMENT**:
            - **PRESERVE FULL LENGTH**: You must extract the garment from the collar down to the very bottom hem. 
            - **DO NOT CROP**: If it is a long dress or pants, do not cut off the bottom.
            - **INCLUDE ALL PIECES**: If the person is wearing a matching set (Top + Bottom) or a dress, extract EVERYTHING as a single unit.

            **EXECUTION**:
            1. Remove the model (Head, Neck, Hands, Legs, Feet) or background.
            2. Reconstruct the neck opening to look hollow if needed.
            3. Place on a pure white background.
            
            <NEGATIVE_CONSTRAINTS>
            - NO cropping the bottom of the clothes.
            - NO skin, hands, or feet visible.
            </NEGATIVE_CONSTRAINTS>
            `;

            const response = await ai.models.generateContent({
                model: selectedModel,
                contents: { parts: [imagePart, { text: prompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const newImagePart = response.candidates?.[0]?.content?.parts[0];
            if (newImagePart && newImagePart.inlineData?.data) {
                const resultBase64 = `data:${newImagePart.inlineData.mimeType};base64,${newImagePart.inlineData.data}`;
                setGarmentImage(resultBase64);
                addToast('Đã tách trang phục hoàn chỉnh (Full Outfit)!', 'success');
            } else {
                throw new Error("API không trả về ảnh.");
            }

        } catch (error) {
            console.error("Extract Error:", error);
            addToast('Lỗi khi tách trang phục. Đã hoàn lại Credit.', 'error');
            const userForRefund = findUserInTree(userState.allUsers, loggedInUser.id);
            if(userForRefund) {
                await handleUseToolCredit(userForRefund.id, { ...tool, creditCost: -costExtract });
            }
        } finally {
            setIsExtracting(false);
        }
    };

    const handleGenerate3D = async () => {
        if (!resultImage || !loggedInUser) return;
        
        const cost3D = 100; 
        if (currentCredits < cost3D) {
            addToast(`Không đủ Credit để tạo 3D. Cần ${cost3D} Credit.`, 'error');
            return;
        }
        
        const creditResult = await handleUseToolCredit(loggedInUser.id, { ...tool, creditCost: cost3D });
        if (!creditResult.success) return;

        setView3D({
            isOpen: true,
            frontImage: resultImage,
            currentAngle: 50,
            isLoading: true
        });

        try {
            const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
            const mimeType = resultImage.split(';')[0].split(':')[1] || 'image/png';
            const imagePart = { inlineData: { data: resultImage.split(',')[1], mimeType } };
            
            const basePrompt = `Based on this front view fashion photo, generate the `;
            const styleContext = `Keep the exact same outfit (texture, color, fit) and the same person's body shape. Neutral studio background. High fidelity.`;

            const [leftRes, rightRes, backRes] = await Promise.all([
                ai.models.generateContent({ 
                    model: selectedModel, 
                    contents: { parts: [imagePart, { text: `${basePrompt} LEFT PROFILE VIEW (90 degrees). ${styleContext}` }] },
                    config: { responseModalities: [Modality.IMAGE] } 
                }),
                ai.models.generateContent({ 
                    model: selectedModel, 
                    contents: { parts: [imagePart, { text: `${basePrompt} RIGHT PROFILE VIEW (90 degrees). ${styleContext}` }] },
                    config: { responseModalities: [Modality.IMAGE] } 
                }),
                ai.models.generateContent({ 
                    model: selectedModel, 
                    contents: { parts: [imagePart, { text: `${basePrompt} BACK VIEW (180 degrees). Focus on how the garment looks from behind. ${styleContext}` }] },
                    config: { responseModalities: [Modality.IMAGE] } 
                })
            ]);

            const extractImg = (res: any) => {
                const data = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                return data ? `data:${res.candidates[0].content.parts[0].inlineData.mimeType};base64,${data}` : undefined;
            };

            setView3D(prev => ({
                ...prev,
                leftImage: extractImg(leftRes),
                rightImage: extractImg(rightRes),
                backImage: extractImg(backRes),
                isLoading: false
            }));
            
            addToast('Đã tạo xong mô hình 360 độ!', 'success');

        } catch (error) {
            console.error("3D Generation Error:", error);
            addToast('Lỗi khi tạo góc nhìn 3D.', 'error');
            setView3D(prev => ({ ...prev, isLoading: false }));
        }
    };

    const handleConvertToVideo = async () => {
        if (!resultImage || !loggedInUser) return;
        
        try {
            addToast('Đang chuẩn bị dữ liệu...', 'info');

            // 1. Compress image to ensure it fits in localStorage
            const compressImage = (src: string): Promise<string> => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.src = src;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(img, 0, 0);
                            // Convert to JPEG with 0.8 quality to reduce size
                            resolve(canvas.toDataURL('image/jpeg', 0.8));
                        } else {
                            resolve(src);
                        }
                    };
                    img.onerror = () => resolve(src);
                });
            };

            const compressedImage = await compressImage(resultImage);

            // 2. Prepare data for Video Generator
            const videoSessionData = {
                mode: 'image',
                inputImage: compressedImage, 
                prompt: "Cinematic slow motion fashion shot, high resolution, 8k, photorealistic, runway walk or elegant pose movement", 
            };
            
            // 3. Save to Video Generator's session storage
            const videoStorageKey = `tool_ai_video_gen_session_${loggedInUser.id}`;
            localStorage.setItem(videoStorageKey, JSON.stringify(videoSessionData));
            
            // 4. Navigate
            onNavigate('Kho Tiện Ích/tool_ai_video_gen');
            addToast('Đã chuyển ảnh sang Studio Video!', 'success');

        } catch (e: any) {
            console.error("Failed to transfer image", e);
            if (e.name === 'QuotaExceededError') {
                addToast('Ảnh quá lớn để chuyển trực tiếp. Vui lòng tải ảnh xuống và tải lên thủ công bên Video Studio.', 'error');
            } else {
                addToast('Có lỗi xảy ra khi chuyển ảnh.', 'error');
            }
        }
    };

    const current3DImage = useMemo(() => {
        const { currentAngle, frontImage, leftImage, rightImage, backImage } = view3D;
        if (currentAngle < 15) return backImage || frontImage;
        if (currentAngle < 35) return leftImage || frontImage;
        if (currentAngle < 65) return frontImage;
        if (currentAngle < 85) return rightImage || frontImage;
        return backImage || frontImage;
    }, [view3D]);
    
    const getAngleLabel = (angle: number) => {
        if (angle < 15) return 'Phía Sau';
        if (angle < 35) return 'Góc Trái';
        if (angle < 65) return 'Trực Diện';
        if (angle < 85) return 'Góc Phải';
        return 'Phía Sau';
    };

    const handleGenerate = async () => {
        if (isProcessing || !loggedInUser || !userImage || !garmentImage) return;
        
        if (bgMode === 'upload' && !bgImage) {
            addToast('Vui lòng tải ảnh nền hoặc chuyển chế độ.', 'error');
            return;
        }
        if (bgMode === 'prompt' && !bgPrompt.trim()) {
            addToast('Vui lòng nhập mô tả bối cảnh hoặc chuyển chế độ.', 'error');
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
            
            const userMime = userImage.split(';')[0].split(':')[1] || 'image/png';
            const userData = userImage.split(',')[1];
            const userPart = { inlineData: { data: userData, mimeType: userMime } };

            const garmentMime = garmentImage.split(';')[0].split(':')[1] || 'image/png';
            const garmentData = garmentImage.split(',')[1];
            const garmentPart = { inlineData: { data: garmentData, mimeType: garmentMime } };
            
            // Build Inputs
            const partsPayload = [userPart, garmentPart];
            let backgroundInstruction = "";

            if (bgMode === 'upload' && bgImage) {
                const bgMime = bgImage.split(';')[0].split(':')[1] || 'image/png';
                const bgData = bgImage.split(',')[1];
                partsPayload.push({ inlineData: { data: bgData, mimeType: bgMime } });
                
                backgroundInstruction = `
                **BACKGROUND SETTING (Input 3)**:
                - INPUT 3 is the TARGET BACKGROUND SCENE.
                - Composite the model (wearing the new garment) into THIS specific scene.
                - **RELIGHTING**: Crucial step. Analyze the light sources in Input 3. Relight the model to match this environment perfectly (shadows on ground, color grading).
                `;
            } else if (bgMode === 'prompt') {
                backgroundInstruction = `
                **BACKGROUND GENERATION**:
                - Generate a background based on this description: "${bgPrompt}".
                - Ensure the lighting on the model matches this new environment (e.g. if sunny beach, hard shadows; if neon city, colorful rim light).
                `;
            } else {
                 backgroundInstruction = `
                 **BACKGROUND**:
                 - Keep the original background from Input 1 if possible, or use a clean, neutral high-end studio background.
                 `;
            }

            const fitLabel = FITS.find(f => f.id === fit)?.label || 'Regular';
            const shapeLabel = BODY_SHAPES.find(s => s.id === metrics.bodyShape)?.label || 'Custom';
            const categoryLabel = "General Clothing";
            
            // --- CAMERA FRAMING INSTRUCTION ---
            let framingInstruction = "";
            if (framing === 'full_body') {
                framingInstruction = "STRICT CAMERA FRAMING: FULL BODY SHOT. Ensure the output image shows the person from head to toe. If the input image is cropped, extend the canvas (Outpaint) to show the full legs and shoes. DO NOT CROP THE LEGS.";
            } else if (framing === 'half_body') {
                framingInstruction = "CAMERA FRAMING: HALF BODY SHOT. Crop or frame the image to show the person from the waist up.";
            } else if (framing === 'close_up') {
                framingInstruction = "CAMERA FRAMING: CLOSE UP. Focus on the upper chest and face to show garment details.";
            } else {
                 framingInstruction = "CAMERA FRAMING: AUTO. Maintain the same framing/crop as the Target Person (Input 1).";
            }

            const systemPrompt = `
            **SYSTEM ROLE**: Elite Fashion Photographer & VFX Compositor.
            **TASK**: Photorealistic Virtual Try-On with Perfect Anatomical Proportions.

            **INPUTS**:
            - **INPUT 1**: TARGET PERSON (Face & Body).
            - **INPUT 2**: GARMENT (Clothing).
            ${bgMode === 'upload' ? '- **INPUT 3**: BACKGROUND.' : ''}

            **MANDATORY RULES (STRICT COMPLIANCE)**:

            1. **FULL GARMENT TRANSFER**:
               - Analyze Input 2 carefully. Is it a dress? A jumpsuit? A top and skirt?
               - You MUST render the **COMPLETE garment** on the target person.
               - **DO NOT CUT OFF** the bottom of a dress or skirt.
               - **DO NOT ADD JEANS** if the input is a dress/skirt. Use bare legs or tights if appropriate for the outfit style.

            2. **PERFECT PROPORTIONS (NO BOBBLEHEAD)**:
               - The head size must be anatomically correct for an adult human (approx 1/7.5 of total height).
               - **DO NOT ENLARGE THE HEAD.**
               - **DO NOT SHRINK THE BODY.**
               - Ensure the shoulders are wide enough to support the head naturally.
               - If the garment is bulky, adjust the body scale, but keep the head size fixed relative to the frame.

            3. **REALISM & LIGHTING**:
               - Match the skin tone of the face to the rest of the body.
               - Cast realistic shadows from the garment onto the skin.
               
            ${backgroundInstruction}

            **SETTINGS**:
            - Garment Type: ${categoryLabel}
            - Fit: ${fitLabel}
            - Body Shape: ${shapeLabel} (${metrics.height}cm, ${metrics.weight}kg)
            
            ${framingInstruction}
            
            <NEGATIVE_CONSTRAINTS>
            - NO Big Heads / Bobbleheads.
            - NO Cropped dresses.
            - NO Random pants appearing under dresses.
            - NO Blurry faces.
            - NO Mismatched lighting.
            </NEGATIVE_CONSTRAINTS>
            `;

            const response = await ai.models.generateContent({
                model: selectedModel,
                contents: { parts: [...partsPayload, { text: systemPrompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const newImagePart = response.candidates?.[0]?.content?.parts[0];
            if (newImagePart && newImagePart.inlineData?.data) {
                const resultBase64 = `data:${newImagePart.inlineData.mimeType};base64,${newImagePart.inlineData.data}`;
                setResultImage(resultBase64);
                
                const newResult: GenerationResult = {
                    taskId: `fashion_${Date.now()}`,
                    date: new Date().toLocaleDateString('vi-VN'),
                    prompt: `[Try-On] ${categoryLabel} - BG: ${bgMode}`,
                    images: [resultBase64],
                    settings: {
                        aspectRatio: 'custom',
                        customRatio: null,
                        quantity: 1,
                        generationMode: 'Chất lượng',
                        imageStyle: 'Realism'
                    },
                    cost: cost,
                    balanceAfter: freshUser ? freshUser.creditBalance - cost : 0,
                    creationTime: new Date().toLocaleTimeString(),
                };

                handleSetGenerationHistory(loggedInUser.id, newResult);
                addToast('Thay đồ thành công!', 'success');
            } else {
                throw new Error("API không trả về ảnh.");
            }

        } catch (error) {
            console.error("Error:", error);
            addToast('Lỗi xử lý, đã hoàn lại Credit.', 'error');
            const userForRefund = findUserInTree(userState.allUsers, loggedInUser.id);
            if(userForRefund) {
                await handleUseToolCredit(userForRefund.id, { ...tool, creditCost: -cost });
            }
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-950 text-gray-300 font-sans">
             {/* HISTORY MODAL */}
             <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Lịch sử Thử Đồ" size="lg" hideFooter>
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

            {/* 3D VIEW MODAL */}
            <Modal isOpen={view3D.isOpen} onClose={() => setView3D(prev => ({ ...prev, isOpen: false }))} title="" size="7xl" hideFooter>
                <div className="flex flex-col h-[85vh]">
                    {/* Main 3D Viewer */}
                    <div className="relative flex-1 bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
                         {view3D.isLoading && !view3D.backImage && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                                <div className="flex flex-col items-center gap-2">
                                    <ArrowPathIcon className="h-10 w-10 animate-spin text-indigo-400" />
                                    <span className="text-sm text-white animate-pulse font-medium">AI đang tái tạo không gian 3D...</span>
                                </div>
                            </div>
                        )}
                        {view3D.frontImage ? (
                            <img 
                                src={current3DImage}
                                alt="3D View" 
                                className="h-full w-full object-contain transition-all duration-200 ease-out" 
                            />
                        ) : null}
                        
                        <div className="absolute top-4 left-4 bg-black/60 px-4 py-2 rounded-full text-sm text-white border border-white/10 backdrop-blur-md font-bold tracking-wide shadow-lg">
                             {getAngleLabel(view3D.currentAngle)}
                        </div>

                        {/* Download Button inside 3D View */}
                        <div className="absolute top-4 right-4">
                            <button 
                                onClick={() => handleDownload(current3DImage)}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors shadow-lg text-xs"
                            >
                                <DocumentArrowDownIcon className="h-4 w-4" /> Tải ảnh góc này
                            </button>
                        </div>
                    </div>

                    {/* Slider Controls */}
                    <div className="w-full max-w-2xl mx-auto mt-6 px-4">
                        <div className="flex justify-between text-xs text-gray-400 font-mono uppercase mb-2 tracking-widest">
                            <span>Sau</span>
                            <span>Trái</span>
                            <span className="text-white font-bold">Trước</span>
                            <span>Phải</span>
                            <span>Sau</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" max="100" value={view3D.currentAngle} 
                            onChange={(e) => setView3D(prev => ({ ...prev, currentAngle: Number(e.target.value) }))}
                            className="w-full h-3 bg-gray-800 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
                            disabled={view3D.isLoading}
                        />
                        <p className="text-center text-sm text-slate-500 mt-3 flex items-center justify-center gap-2">
                            <ArrowsRightLeftIcon className="h-4 w-4" /> Kéo thanh trượt để xoay mô hình
                        </p>
                    </div>
                </div>
            </Modal>

             {/* Header */}
             <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-30 shadow-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate('Kho Tiện Ích')} className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <ArrowLeftIcon className="h-5 w-5" /> Quay lại
                    </button>
                    <h1 className="text-lg font-bold text-white flex items-center gap-2">
                        <ShoppingBagIcon className="h-5 w-5 text-indigo-500" />
                        {tool.title}
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <CreditBalanceDisplay balance={currentCredits} onAdd={() => onNavigate('Ví Của Tôi')} />
                    <button onClick={() => setShowHistoryModal(true)} className="p-2 text-indigo-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-indigo-900/50"><ClockIcon className="h-5 w-5" /></button>
                    <button onClick={handleResetSession} className="p-2 text-gray-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg"><ArrowPathIcon className="h-5 w-5" /></button>
                </div>
            </header>

             <div className="flex flex-1 overflow-hidden">
                {/* LEFT SIDEBAR: CONTROLS (400px) */}
                <aside className="w-96 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
                     {/* WRAP CONTENT IN SCROLLABLE DIV */}
                     <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-slate-700">
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

                        {/* 1. Assets Section */}
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <span>1. HÌNH ẢNH ĐẦU VÀO</span>
                            </label>
                            
                            <div className="space-y-4">
                                {/* User Image Upload */}
                                <div>
                                    <label className="text-[10px] text-slate-500 mb-1 block">Bước 1: Ảnh của bạn (Target Person)</label>
                                    <div 
                                        onClick={() => userInputRef.current?.click()}
                                        className={`h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${userImage ? 'border-indigo-500 bg-slate-800' : 'border-slate-700 hover:border-indigo-500 hover:bg-slate-800'}`}
                                    >
                                        {userImage ? (
                                            <img src={userImage} alt="User" className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
                                        ) : (
                                            <div className="text-center p-2">
                                                <UserIcon className="h-8 w-8 mx-auto mb-1 text-indigo-500" />
                                                <p className="text-xs font-medium text-white">Tải ảnh khuôn mặt/dáng</p>
                                            </div>
                                        )}
                                        {userImage && <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100"><span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded">Đổi ảnh</span></div>}
                                        <input type="file" ref={userInputRef} onChange={(e) => handleFileUpload(e, 'user')} className="hidden" accept="image/*" />
                                    </div>
                                </div>

                                {/* Garment Image Upload */}
                                <div>
                                    <label className="text-[10px] text-slate-500 mb-1 block">Bước 2: Ảnh Trang phục (Garment Reference)</label>

                                    <div 
                                        onClick={() => garmentInputRef.current?.click()}
                                        className={`h-80 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${garmentImage ? 'border-pink-500 bg-slate-800' : 'border-slate-700 hover:border-pink-500 hover:bg-slate-800'}`}
                                    >
                                        {garmentImage ? (
                                            <img src={garmentImage} alt="Garment" className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
                                        ) : (
                                            <div className="text-center p-2">
                                                <ShoppingBagIcon className="h-8 w-8 mx-auto mb-1 text-pink-500" />
                                                <p className="text-xs font-medium text-white">Tải ảnh quần áo</p>
                                                <p className="text-[9px] text-slate-500 mt-0.5">Ảnh trải sàn hoặc treo</p>
                                            </div>
                                        )}
                                        {garmentImage && <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100"><span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded">Đổi ảnh</span></div>}
                                        <input type="file" ref={garmentInputRef} onChange={(e) => handleFileUpload(e, 'garment')} className="hidden" accept="image/*" />
                                    </div>
                                    
                                    {/* EXTRACT & DOWNLOAD BUTTONS */}
                                    {garmentImage && (
                                        <div className="flex gap-2 mt-2">
                                            <button 
                                                onClick={handleExtractGarment}
                                                disabled={isExtracting}
                                                className="flex-1 py-1.5 bg-pink-900/20 hover:bg-pink-900/40 text-pink-300 text-[10px] font-bold uppercase tracking-wide rounded border border-pink-800/50 transition-colors flex items-center justify-center gap-1"
                                            >
                                                {isExtracting ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <ScissorsIcon className="h-3 w-3" />}
                                                {isExtracting ? 'Đang tách...' : 'Tách lấy đồ (Clean)'}
                                            </button>
                                            <button 
                                                onClick={handleDownloadGarment}
                                                className="w-8 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center justify-center transition-colors"
                                                title="Tải ảnh trang phục xuống"
                                            >
                                                <DocumentArrowDownIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 2. Settings Section */}
                        <div className="space-y-5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider border-t border-slate-800 pt-4 block">2. CẤU HÌNH TRANG PHỤC</label>
                            
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Form dáng</label>
                                        <select value={fit} onChange={(e) => setFit(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-indigo-500">
                                            {FITS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Kiểu mặc</label>
                                        <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-indigo-500">
                                            {STYLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                                
                                {/* New Framing Selector */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Khung hình (Framing)</label>
                                    <select value={framing} onChange={(e) => setFraming(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-indigo-500">
                                        {FRAMING_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 3. Body Metrics Section */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-t border-slate-800 pt-4">
                                <label className="text-xs font-bold text-yellow-500 uppercase flex items-center gap-1">
                                    <AdjustmentsHorizontalIcon className="h-3 w-3" /> 3. DÁNG NGƯỜI & SỐ ĐO
                                </label>
                            </div>
                            
                            <div className="space-y-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                <div>
                                    <label className="text-[10px] text-slate-400 mb-1 block">Chọn Dáng người (Shape)</label>
                                    <select 
                                        value={metrics.bodyShape} 
                                        onChange={e => setMetrics(p => ({...p, bodyShape: e.target.value}))} 
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:ring-yellow-500"
                                    >
                                        {BODY_SHAPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                    </select>
                                </div>

                                {/* Only show detailed metrics if 'none' (Free Adjustment) is selected */}
                                {metrics.bodyShape === 'none' && (
                                    <div className="space-y-3 mt-2 pt-2 border-t border-slate-700/50 animate-fadeIn">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><label className="text-[10px] text-slate-400">Cao (cm)</label><FormattedNumberInput value={metrics.height} onChange={(v) => setMetrics(p => ({...p, height: v}))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"/></div>
                                            <div><label className="text-[10px] text-slate-400">Nặng (kg)</label><FormattedNumberInput value={metrics.weight} onChange={(v) => setMetrics(p => ({...p, weight: v}))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"/></div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div><label className="text-[10px] text-slate-400">Ngực</label><FormattedNumberInput value={metrics.chest} onChange={(v) => setMetrics(p => ({...p, chest: v}))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"/></div>
                                            <div><label className="text-[10px] text-slate-400">Eo</label><FormattedNumberInput value={metrics.waist} onChange={(v) => setMetrics(p => ({...p, waist: v}))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"/></div>
                                            <div><label className="text-[10px] text-slate-400">Mông</label><FormattedNumberInput value={metrics.hips} onChange={(v) => setMetrics(p => ({...p, hips: v}))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"/></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* 4. BACKGROUND SETTING (NEW) */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-t border-slate-800 pt-4">
                                <label className="text-xs font-bold text-green-500 uppercase flex items-center gap-1">
                                    <MapPinIcon className="h-3 w-3" /> 4. BỐI CẢNH (BACKGROUND)
                                </label>
                            </div>
                            
                            <div className="space-y-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                {/* Background Mode Toggle */}
                                <div className="flex bg-slate-900 p-1 rounded-lg">
                                    <button 
                                        onClick={() => setBgMode('original')}
                                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-colors ${bgMode === 'original' ? 'bg-slate-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Gốc
                                    </button>
                                    <button 
                                        onClick={() => setBgMode('upload')}
                                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-colors ${bgMode === 'upload' ? 'bg-green-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Upload
                                    </button>
                                    <button 
                                        onClick={() => setBgMode('prompt')}
                                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-colors ${bgMode === 'prompt' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        AI Prompt
                                    </button>
                                </div>
                                
                                {/* Content based on mode */}
                                {bgMode === 'upload' && (
                                    <div 
                                        onClick={() => bgInputRef.current?.click()}
                                        className={`h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${bgImage ? 'border-green-500 bg-slate-800' : 'border-slate-700 hover:border-green-500 hover:bg-slate-800'}`}
                                    >
                                        {bgImage ? (
                                            <>
                                                <img src={bgImage} alt="Background" className="w-full h-full object-cover opacity-80" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <span className="text-xs text-white font-medium">Đổi ảnh</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center p-2">
                                                <PhotoIcon className="h-6 w-6 mx-auto mb-1 text-green-500" />
                                                <p className="text-[10px] font-medium text-white">Tải ảnh nền</p>
                                            </div>
                                        )}
                                        {bgImage && <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100"><span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded">Đổi ảnh</span></div>}
                                        <input type="file" ref={bgInputRef} onChange={(e) => handleFileUpload(e, 'bg')} className="hidden" accept="image/*" />
                                    </div>
                                )}
                                
                                {bgMode === 'prompt' && (
                                    <div>
                                        <textarea 
                                            value={bgPrompt}
                                            onChange={e => setBgPrompt(e.target.value)}
                                            rows={3}
                                            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-2 text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                            placeholder="Mô tả bối cảnh (VD: Bãi biển hoàng hôn, Đường phố Paris...)"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                     </div>

                    {/* Action Footer (FIXED) */}
                    <div className="p-6 bg-slate-900 border-t border-slate-800 z-10 shrink-0">
                        <div className="flex justify-between items-center mb-3 text-xs">
                            <span className="text-slate-400">Chi phí:</span>
                            <span className="font-bold text-white flex items-center gap-1"><SparklesIcon className="h-3 w-3 text-yellow-400"/> {tool.creditCost} Credit</span>
                        </div>
                        <button 
                            onClick={handleGenerate}
                            disabled={isProcessing || !userImage || !garmentImage}
                            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform active:scale-95"
                        >
                            {isProcessing ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <ShoppingBagIcon className="h-5 w-5" />}
                            {isProcessing ? 'Đang thiết kế...' : 'Thử Đồ Ngay'}
                        </button>
                    </div>
                </aside>

                {/* RIGHT PANEL: RESULT */}
                <main className="flex-1 bg-black p-8 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                    
                    {resultImage ? (
                        <div className="w-full h-full max-w-4xl flex flex-col gap-4 animate-fadeIn z-10">
                            <div className="flex justify-between items-center bg-slate-900/80 backdrop-blur-md p-3 rounded-xl border border-slate-800 relative z-50">
                                <h3 className="text-lg font-bold text-green-400 flex items-center gap-2"><CheckCircleIcon className="h-5 w-5" /> Hoàn tất</h3>
                                <div className="relative">
                                    <button onClick={() => setShowDownloadOptions(!showDownloadOptions)} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 shadow-lg">
                                        <DocumentArrowDownIcon className="h-4 w-4" /> Tải xuống <ChevronUpIcon className={`h-3 w-3 transition-transform ${showDownloadOptions ? 'rotate-180' : ''}`} />
                                    </button>
                                     {showDownloadOptions && (
                                        <div className="absolute top-full right-0 mt-2 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-fadeIn z-20">
                                            <button onClick={() => handleDownload(1)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50">1x (Gốc)</button>
                                            <button onClick={() => handleDownload(2)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50">2x (Cao)</button>
                                            <button onClick={() => handleDownload(3)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50">3x (Siêu nét)</button>
                                            <button onClick={() => handleDownload(4)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors">4x (Cực đại)</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex-1 bg-black/40 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden shadow-2xl relative group">
                                <img src={resultImage} alt="Result" className="max-w-full max-h-[80vh] object-contain rounded-lg" />
                                {/* 3D & Video Buttons */}
                                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button onClick={handleConvertToVideo} className="flex items-center gap-2 px-4 py-2 bg-green-600/90 hover:bg-green-500 text-white text-xs font-bold rounded-full shadow-lg backdrop-blur-sm transition-all transform hover:scale-105">
                                        <FilmIcon className="h-4 w-4" /> Video
                                    </button>
                                    <button onClick={handleGenerate3D} className="flex items-center gap-2 px-4 py-2 bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-bold rounded-full shadow-lg backdrop-blur-sm transition-all transform hover:scale-105">
                                        <CubeIcon className="h-4 w-4" /> 3D View
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center opacity-30 z-10">
                            <ShoppingBagIcon className="h-24 w-24 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-slate-400">Studio Trống</h3>
                            <p className="text-slate-500 mt-2">Tải ảnh lên và nhấn "Thử Đồ Ngay" để bắt đầu.</p>
                        </div>
                    )}
                    
                    {isProcessing && (
                         <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center animate-fadeIn">
                             <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                             <p className="text-white font-bold text-lg">AI đang may mẫu...</p>
                         </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default FashionStudioTool;
