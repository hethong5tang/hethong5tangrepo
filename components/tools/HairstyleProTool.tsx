
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { 
    ArrowLeftIcon, SparklesIcon, 
    ScissorsIcon, ArrowPathIcon, CheckCircleIcon, UserCircleIcon,
    CheckIcon, XCircleIcon,
    FaceSmileIcon, CubeIcon, ArrowsRightLeftIcon, PlusIcon, ArrowUpTrayIcon, DocumentArrowDownIcon, TrashIcon, BoltIcon
} from '../Icons';
import { IntegrationTool } from '../../features/settings/types';
import { useAuth } from '../../features/auth/useAuth';
import { useUser } from '../../features/users/useUser';
import { useActions } from '../../features/actions/useActions';
import { useToast } from '../../components/ToastProvider';
import { findUserInTree } from '../../services/userService';
import { GenerationResult } from '../../features/users/types';
import CreditBalanceDisplay from './CreditBalanceDisplay';
import { ColorPickerCircle } from './video-editor/VideoEditorUI';
import Modal from '../../components/Modal';

// --- HAIRSTYLE ICONS (SVG PATHS) ---
// Vector silhouettes for hairstyles

const SVG_HEAD_BASE = "M12 22c4.97 0 9-4.03 9-9V9c0-4.97-4.03-9-9-9S3 4.03 3 9v4c0 4.97 4.03 9 9 9z"; // Basic head shape

const HAIR_PATHS: Record<string, string> = {
    // Male Styles
    'undercut': "M4 10V9c0-3.5 3-7 8-7s8 3.5 8 7v1h-1c-1 0-1-1-1-2 0-2-2-4-6-4s-6 2-6 4c0 1 0 2-1 2H4z",
    'pompadour': "M4 11V9c0-4 3-7 8-7s8 3 8 7v2c0 0-2-3-8-3s-8 3-8 3z",
    'buzz_cut': "M4 10c0-4 3.5-7.5 8-7.5s8 3.5 8 7.5v2h-16v-2z",
    'side_part': "M4 10c0-4 3-7 8-7 2 0 4 1 5 2-2 0-4 1-5 3-2 1-3 2-3 2h-5z M17 5c2 1 3 3 3 5v2h-4c0-2-1-4-2-5 1-1 2-2 3-2z",
    'man_bun': "M10 1c0-.55.45-1 1-1s1 .45 1 1v1h-2V1z M4 11c0-4 3.5-7 8-7s8 3 8 7v2h-16v-2z",
    'mullet': "M4 10c0-4 3-7 8-7s8 3 8 7v4l-2 2v3l-2 2H10l-2-2v-3l-2-2v-4z",
    'mohawk': "M10 2h4v8h-4z M5 12h14v2H5z",
    'textured_crop': "M4 10c1-3 4-6 8-6s7 3 8 6v1H4v-1z",
    'slick_back': "M4 11c0-5 3.5-8 8-8s8 3 8 8v1H4v-1z",
    'korean_layer': "M3 11c0-4 3-8 9-8s9 4 9 8v3c-2-2-5-2-9 0-4-2-7-2-9 0v-3z",
    'two_block': "M3 10c0-4 3-8 9-8s9 4 9 8v1h-1c-2 0-2-2-8-2s-6 2-8 2H3v-1z",
    'curly_shag': "M3 10c0-4 3-7 5-7s2 1 4 1 2-1 4-1 5 3 5 7c0 1-1 2-2 2-1 0-2-1-3-1s-2 1-3 1-2-1-3-1-2 1-3 1c-1 0-2-1-2-2z",

    // Female Styles
    'bob_straight': "M4 8c0-4 3.5-7 8-7s8 3 8 7v8h-4v-2H8v2H4V8z",
    'long_wavy': "M4 8c0-4 3.5-7 8-7s8 3 8 7v10c1 1 2-1 4 0v2c-2 1-4-1-5 1s-3 0-5-1v-2c2-1 3 1 4 0V8z M20 8v10c-1 1-2-1-4 0v-2c2-1 3 1 4 0V8z",
    'pixie': "M4 9c0-4 3-7 8-7s8 3 8 7v1c-2-2-4-1-5 0-2-1-4-1-6 0-1-1-3-2-5 0V9z",
    'layer_long': "M4 8c0-4 3.5-7 8-7s8 3 8 7v12l2-2 2 2 2-2 2 2V8z",
    'bangs_curtain': "M4 8c0-4 3.5-7 8-7s8 3 8 7v12H4V8z M12 2c1 3 0 6-2 8 0-2-1-5-2-8h4z",
    'hime_cut': "M4 8c0-4 3.5-7 8-7s8 3 8 7v12h-3v-6h-10v6H4V8z",
    'curly_afro': "M12 0C6 0 2 4 2 9c0 3 2 6 2 8s4 2 8 2 8-2 8-2 2-5 2-8c0-5-4-9-10-9z",
    'braids': "M6 8c0-4 3-7 6-7s6 3 6 7v2c0 4-2 8-4 8s-2-4-2-8h-2c0 4-2 8-4 8S4 14 4 10V8z",
    'ponytail_high': "M12 1c-1 0-2 1-2 2v2c-4 0-7 3-7 7v6h18v-6c0-4-3-7-7-7V3c0-1-1-2-2-2z",
    'shoulder_lob': "M4 8c0-4 3.5-7 8-7s8 3 8 7v6c1 1 3 0 4 2H4c1-2 3-1 4-2V8z",
    'bun_messy': "M10 0c-2 0-3 2-3 4h10c0-2-1-4-3-4H10z M4 9c0-3 3-6 8-6s8 3 8 6v4h-16v-4z",
    'straight_sleek': "M4 8c0-4 3.5-7 8-7s8 3 8 7v14H4V8z",
};

const HairstyleIcon: React.FC<{ id: string; className?: string }> = ({ id, className }) => {
    const path = HAIR_PATHS[id] || HAIR_PATHS['undercut']; // Fallback
    
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
            {/* Face Outline (Light Grey opacity) */}
            <path d={SVG_HEAD_BASE} className="text-slate-700 opacity-30" />
            {/* Hair (Current Color) */}
            <path d={path} />
        </svg>
    );
};

interface HairstyleProToolProps {
    tool: IntegrationTool;
    onNavigate: (page: string) => void;
}

const AVAILABLE_MODELS = [
    { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash (Tiêu chuẩn)' },
    { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro (Chất lượng cao)' },
];

const HAIR_COLORS = [
    { name: 'Đen Tuyền', hex: '#000000' },
    { name: 'Nâu Hạt Dẻ', hex: '#5D4037' },
    { name: 'Nâu Chocolate', hex: '#3E2723' },
    { name: 'Vàng Bạch Kim', hex: '#FFF9C4' },
    { name: 'Vàng Mật Ong', hex: '#FBC02D' },
    { name: 'Đỏ Rượu Vang', hex: '#880E4F' },
    { name: 'Xám Khói', hex: '#9E9E9E' },
    { name: 'Xanh Than', hex: '#1A237E' },
    { name: 'Hồng Pastel', hex: '#F8BBD0' },
    { name: 'Tím Khói', hex: '#7B1FA2' },
];

const MALE_HAIRSTYLES = [
    { id: 'undercut', name: 'Undercut', prompt: 'classic undercut hairstyle, shaved sides, long top' },
    { id: 'pompadour', name: 'Pompadour', prompt: 'pompadour hairstyle, high volume top, slicked back' },
    { id: 'buzz_cut', name: 'Buzz Cut', prompt: 'buzz cut hairstyle, very short hair, military style' },
    { id: 'side_part', name: 'Side Part 7/3', prompt: 'classic side part hairstyle, gentleman look, 7/3 split' },
    { id: 'man_bun', name: 'Man Bun', prompt: 'man bun hairstyle, tied back, hipster style' },
    { id: 'mullet', name: 'Mullet', prompt: 'modern mullet hairstyle, short front, long back, trendy' },
    { id: 'mohawk', name: 'Mohawk', prompt: 'mohawk hairstyle with fade, edgy look' },
    { id: 'textured_crop', name: 'Textured Crop', prompt: 'textured crop top hairstyle, messy fringe, faded sides' },
    { id: 'slick_back', name: 'Slick Back', prompt: 'slicked back hairstyle, wet look, mafia style' },
    { id: 'korean_layer', name: 'Layer Hàn', prompt: 'korean layered hairstyle, two block cut, soft bangs' },
    { id: 'two_block', name: 'Two Block', prompt: 'two block hairstyle, k-pop style, heavy bangs' },
    { id: 'curly_shag', name: 'Curly Shag', prompt: 'curly shaggy hairstyle, medium length, messy curls' },
];

const FEMALE_HAIRSTYLES = [
    { id: 'bob_straight', name: 'Bob Thẳng', prompt: 'straight bob hairstyle, chin length, sleek' },
    { id: 'long_wavy', name: 'Sóng Nước', prompt: 'long wavy hairstyle, beach waves, voluminous' },
    { id: 'pixie', name: 'Pixie', prompt: 'pixie cut hairstyle, very short, chic, edgy' },
    { id: 'layer_long', name: 'Layer Dài', prompt: 'long layered hairstyle, face framing layers, natural movement' },
    { id: 'bangs_curtain', name: 'Mái Bay', prompt: 'long hair with curtain bangs, trendy korean style' },
    { id: 'hime_cut', name: 'Hime Cut', prompt: 'hime cut hairstyle, straight with cheek-length sidelocks' },
    { id: 'curly_afro', name: 'Xoăn Xù', prompt: 'curly afro hairstyle, tight curls, big volume' },
    { id: 'braids', name: 'Tóc Tết', prompt: 'braided hairstyle, french braids or box braids' },
    { id: 'ponytail_high', name: 'Đuôi Ngựa', prompt: 'high ponytail hairstyle, sleek and pulled back' },
    { id: 'shoulder_lob', name: 'Lob Ngang Vai', prompt: 'long bob (lob) hairstyle, shoulder length, messy waves' },
    { id: 'bun_messy', name: 'Búi Rối', prompt: 'messy bun hairstyle, casual updos, loose strands' },
    { id: 'straight_sleek', name: 'Dài Thẳng', prompt: 'very long straight sleek hair, shiny, glass hair' },
];

interface GeneratedHairstyle {
    id: string;
    styleId: string;
    styleName: string;
    imageUrl: string;
    status: 'pending' | 'completed' | 'failed';
}

interface View3DState {
    isOpen: boolean;
    frontImage: string;
    leftImage?: string;
    rightImage?: string;
    backImage?: string;
    currentAngle: number; // 0-100 slider value
    isLoading: boolean;
    styleName: string;
}

const HairstyleProTool: React.FC<HairstyleProToolProps> = ({ tool, onNavigate }) => {
    const { loggedInUser } = useAuth();
    const { userState } = useUser();
    const { handleUseToolCredit, handleSetGenerationHistory, handleDeleteGenerationResult } = useActions();
    const { addToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const refHairInputRef = useRef<HTMLInputElement>(null);

    // State
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [alignedImage, setAlignedImage] = useState<string | null>(null); // The cropped/centered face
    const [isAligning, setIsAligning] = useState(false);
    
    // Reference Hair Image (For Custom Mode)
    const [refHairImage, setRefHairImage] = useState<string | null>(null);
    const [isValidatingRef, setIsValidatingRef] = useState(false);

    // Settings
    const [mode, setMode] = useState<'presets' | 'custom'>('presets');
    const [gender, setGender] = useState<'male' | 'female'>('male');
    const [selectedColor, setSelectedColor] = useState<string>(HAIR_COLORS[0].name);
    const [customColorHex, setCustomColorHex] = useState<string>('#000000');
    const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0].id);
    
    const [results, setResults] = useState<GeneratedHairstyle[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentProcessingIndex, setCurrentProcessingIndex] = useState(0);

    // 3D View State
    const [view3D, setView3D] = useState<View3DState>({
        isOpen: false,
        frontImage: '',
        currentAngle: 50, // Center
        isLoading: false,
        styleName: ''
    });

    const freshUser = useMemo(() => loggedInUser ? findUserInTree(userState.allUsers, loggedInUser.id) : null, [userState.allUsers, loggedInUser]);
    const currentCredits = freshUser ? freshUser.creditBalance : 0;
    
    const availableStyles = gender === 'male' ? MALE_HAIRSTYLES : FEMALE_HAIRSTYLES;
    
    // Cost calculation
    const totalCost = mode === 'presets' 
        ? selectedStyles.length * tool.creditCost 
        : tool.creditCost * 2;

    // --- LOAD HISTORY ---
    useEffect(() => {
        if (loggedInUser?.generationHistory) {
            // Filter only Hairstyle tasks
            const hairHistory = loggedInUser.generationHistory
                .filter(item => item.taskId.startsWith('hair_'))
                .sort((a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime()); // Latest first

            if (hairHistory.length > 0) {
                const historicalResults: GeneratedHairstyle[] = [];
                
                hairHistory.forEach(historyItem => {
                    // Try to parse the style names stored in settings.imageStyle
                    let stylesList: string[] = [];
                    try {
                        // We saved styles as JSON string in handleGenerate below
                        const parsed = JSON.parse(historyItem.settings.imageStyle || '[]');
                        if (Array.isArray(parsed)) {
                            stylesList = parsed.map((p: any) => p.name);
                        }
                    } catch (e) {
                        // Fallback for legacy or single custom styles
                         if (historyItem.prompt.includes('Tùy chỉnh')) {
                             stylesList = ['Tóc Tùy Chọn'];
                         } else {
                             stylesList = Array(historyItem.images.length).fill('Mẫu đã lưu');
                         }
                    }

                    historyItem.images.forEach((img, idx) => {
                        historicalResults.push({
                            id: `${historyItem.taskId}_${idx}`,
                            styleId: 'history', // Marker for history items
                            styleName: stylesList[idx] || 'Kết quả đã lưu',
                            imageUrl: img,
                            status: 'completed'
                        });
                    });
                });
                
                setResults(historicalResults);
            }
        }
    }, [loggedInUser]);

    // Reusable function to process face image (from upload or paste)
    const processFaceImage = (file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                const resultStr = event.target.result as string;
                setUploadedImage(resultStr);
                // Reset everything
                setAlignedImage(null); 
                setResults([]); // Clear history view when new image is uploaded to focus on new task
                setSelectedStyles([]);
                // Auto trigger alignment
                setTimeout(() => handleAutoAlign(resultStr), 500);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFaceImage(e.target.files[0]);
        }
        if (e.target) e.target.value = '';
    };

    // Handle Paste Event (Ctrl+V)
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (e.clipboardData && e.clipboardData.items) {
                for (let i = 0; i < e.clipboardData.items.length; i++) {
                    const item = e.clipboardData.items[i];
                    if (item.type.indexOf('image') !== -1) {
                        const file = item.getAsFile();
                        if (file) {
                            processFaceImage(file);
                            addToast('Đã dán ảnh từ Clipboard!', 'success');
                        }
                        break; // Only take the first image
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    const validateRefImage = async (base64Data: string): Promise<boolean> => {
        setIsValidatingRef(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const mimeType = base64Data.split(';')[0].split(':')[1] || 'image/png';
            const imagePart = { inlineData: { data: base64Data.split(',')[1], mimeType } };
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [imagePart, { text: "Analyze this image. Does it contain a visible hairstyle, a haircut, or a person's head with hair that can be used as a hairstyle reference? Answer only JSON: { \"isValid\": boolean }" }] },
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            isValid: { type: Type.BOOLEAN }
                        }
                    }
                }
            });
            
            const result = JSON.parse(response.text || "{}");
            return result.isValid === true;
        } catch (e) {
            console.error("Validation error:", e);
            return true; // Default to true if API fails to avoid blocking user
        } finally {
            setIsValidatingRef(false);
        }
    };

    const handleRefHairUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (event) => {
                if (event.target?.result) {
                    const base64 = event.target.result as string;
                    
                    // 1. Validate content first
                    const isValid = await validateRefImage(base64);
                    
                    if (isValid) {
                        setRefHairImage(base64);
                    } else {
                        addToast('Ảnh không hợp lệ. Vui lòng tải ảnh có kiểu tóc rõ ràng.', 'error');
                        // Clear input so they can select again
                         if (refHairInputRef.current) refHairInputRef.current.value = '';
                    }
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAutoAlign = async (rawImage: string) => {
        setIsAligning(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const mimeType = rawImage.split(';')[0].split(':')[1] || 'image/png';
            const imagePart = { inlineData: { data: rawImage.split(',')[1], mimeType } };

            const prompt = `
            TASK: Face Alignment & Cropping for ID Photo.
            INPUT: An image of a person.
            INSTRUCTION: 
            1. Detect the face.
            2. Crop the image to a standard portrait ratio (close-up headshot).
            3. Center the face perfectly looking straight at the camera.
            4. Fix any head tilt so eyes are horizontal.
            5. Ensure the lighting is balanced on the face.
            6. Replace background with a clean, neutral grey or white studio background.
            7. Output ONLY the processed image. High quality.
            `;

            const response = await ai.models.generateContent({
                model: selectedModel,
                contents: { parts: [imagePart, { text: prompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const newImagePart = response.candidates?.[0]?.content?.parts[0];
            if (newImagePart && newImagePart.inlineData?.data) {
                const newImage = `data:${newImagePart.inlineData.mimeType};base64,${newImagePart.inlineData.data}`;
                setAlignedImage(newImage);
                addToast('Đã nhận diện và căn chỉnh khuôn mặt thành công!', 'success');
            } else {
                addToast('Không thể căn chỉnh ảnh. Sử dụng ảnh gốc.', 'info');
                setAlignedImage(rawImage);
            }
        } catch (error) {
            console.error("Align error:", error);
            setAlignedImage(rawImage); // Fallback
        } finally {
            setIsAligning(false);
        }
    };

    const toggleStyle = (styleId: string) => {
        setSelectedStyles(prev => 
            prev.includes(styleId) ? prev.filter(id => id !== styleId) : [...prev, styleId]
        );
    };

    const toggleAllStyles = () => {
        if (selectedStyles.length === availableStyles.length) {
            setSelectedStyles([]);
        } else {
            setSelectedStyles(availableStyles.map(s => s.id));
        }
    };
    
    // Function for PRESET generation
    const generateSingleStyle = async (styleId: string): Promise<string | null> => {
        if (!alignedImage) return null;
        
        const styleDef = availableStyles.find(s => s.id === styleId);
        if (!styleDef) return null;

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const mimeType = alignedImage.split(';')[0].split(':')[1] || 'image/png';
        const imagePart = { inlineData: { data: alignedImage.split(',')[1], mimeType } };
        
        const colorPrompt = selectedColor === 'Tùy chỉnh' ? `Hair color code: ${customColorHex}` : `Hair color: ${selectedColor}`;
        
        const prompt = `
        TASK: Hairstyle Virtual Try-On.
        INPUT: A portrait of a person (Face ID).
        INSTRUCTION: Replace the person's current hairstyle with a new specific style.
        TARGET STYLE: ${styleDef.prompt}.
        TARGET COLOR: ${colorPrompt}.
        CONSTRAINTS:
        1. Keep the face, skin tone, and facial features EXACTLY the same (Identity Preservation).
        2. Keep the background exactly the same.
        3. Only change the hair.
        4. Ensure the hair blends naturally with the head shape and forehead.
        5. Photorealistic, 8k resolution, salon photography style.
        `;

        try {
            const response = await ai.models.generateContent({
                model: selectedModel,
                contents: { parts: [imagePart, { text: prompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const newImagePart = response.candidates?.[0]?.content?.parts[0];
            if (newImagePart && newImagePart.inlineData?.data) {
                return `data:${newImagePart.inlineData.mimeType};base64,${newImagePart.inlineData.data}`;
            }
        } catch (e) {
            console.error(`Error generating style ${styleId}:`, e);
        }
        return null;
    };

    // Function for CUSTOM REFERENCE generation
    const generateCustomStyle = async (): Promise<string | null> => {
        if (!alignedImage || !refHairImage) return null;

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        
        const faceMime = alignedImage.split(';')[0].split(':')[1] || 'image/png';
        const facePart = { inlineData: { data: alignedImage.split(',')[1], mimeType: faceMime } };

        const hairMime = refHairImage.split(';')[0].split(':')[1] || 'image/png';
        const hairPart = { inlineData: { data: refHairImage.split(',')[1], mimeType: hairMime } };
        
        const prompt = `
        TASK: Hairstyle Transfer.
        INPUT 1: Target Person (First Image).
        INPUT 2: Reference Hairstyle (Second Image).
        INSTRUCTION: 
        1. Identify the hairstyle from INPUT 2 (Reference).
        2. Apply that EXACT hairstyle onto the person in INPUT 1 (Target).
        3. Keep the person's face, expression, skin tone, and lighting from INPUT 1 unchanged.
        4. Adapt the hair orientation to match the person's head pose.
        5. Blend the hairline naturally.
        OUTPUT: A photorealistic image of the person from Input 1 wearing the hair from Input 2.
        `;

        try {
            const response = await ai.models.generateContent({
                model: selectedModel,
                contents: { parts: [facePart, hairPart, { text: prompt }] }, // Sending both images
                config: { responseModalities: [Modality.IMAGE] },
            });

            const newImagePart = response.candidates?.[0]?.content?.parts[0];
            if (newImagePart && newImagePart.inlineData?.data) {
                return `data:${newImagePart.inlineData.mimeType};base64,${newImagePart.inlineData.data}`;
            }
        } catch (e) {
            console.error(`Error generating custom style:`, e);
        }
        return null;
    };

    const handleGenerate = async () => {
        if (!loggedInUser || !alignedImage) return;
        if (mode === 'presets' && selectedStyles.length === 0) return;
        if (mode === 'custom' && !refHairImage) return;
        
        if (currentCredits < totalCost) {
            addToast('Không đủ Credit để thực hiện.', 'error');
            return;
        }

        const creditResult = await handleUseToolCredit(loggedInUser.id, { ...tool, creditCost: totalCost });
        if (!creditResult.success) return;

        setIsProcessing(true);
        setCurrentProcessingIndex(0);
        // We DO NOT clear results here anymore, we append to them
        // setResults([]); 

        const finalImages: string[] = [];
        const styleNames: string[] = []; // Track names for saving history
        
        if (mode === 'presets') {
            // PRESET FLOW
            const newPlaceholders: GeneratedHairstyle[] = selectedStyles.map(id => ({
                id: `res_${id}_${Date.now()}`,
                styleId: id,
                styleName: availableStyles.find(s => s.id === id)?.name || '',
                imageUrl: '',
                status: 'pending'
            }));
            
            // Prepend new items to results so they appear first
            setResults(prev => [...newPlaceholders, ...prev]);

            for (let i = 0; i < selectedStyles.length; i++) {
                setCurrentProcessingIndex(i + 1);
                const styleId = selectedStyles[i];
                const styleName = availableStyles.find(s => s.id === styleId)?.name || '';
                
                try {
                    const imageUrl = await generateSingleStyle(styleId);
                    setResults(prev => prev.map(item => 
                        item.styleId === styleId && item.status === 'pending' // Check pending to avoid overwriting older same-style items
                            ? { ...item, status: imageUrl ? 'completed' : 'failed', imageUrl: imageUrl || '' } 
                            : item
                    ));
                    if (imageUrl) {
                        finalImages.push(imageUrl);
                        styleNames.push(styleName);
                    }
                } catch (error) {
                    setResults(prev => prev.map(item => 
                        item.styleId === styleId && item.status === 'pending' ? { ...item, status: 'failed' } : item
                    ));
                }
            }
        } else {
            // CUSTOM FLOW
            setCurrentProcessingIndex(1);
             const initialResult: GeneratedHairstyle = {
                id: `custom_${Date.now()}`,
                styleId: 'custom',
                styleName: 'Tóc Mẫu Tự Chọn',
                imageUrl: '',
                status: 'pending'
            };
            setResults(prev => [initialResult, ...prev]);

            try {
                const imageUrl = await generateCustomStyle();
                setResults(prev => prev.map(item => 
                    item.styleId === 'custom' && item.status === 'pending'
                        ? { ...item, status: imageUrl ? 'completed' : 'failed', imageUrl: imageUrl || '' } 
                        : item
                ));
                if (imageUrl) {
                    finalImages.push(imageUrl);
                    styleNames.push('Tóc Mẫu Tự Chọn');
                }
            } catch (error) {
                 setResults(prev => prev.map(item => ({ ...item, status: 'failed' })));
            }
        }

        if (finalImages.length > 0) {
            // Encode style names into imageStyle field as JSON for recovery
            const stylesMetadata = styleNames.map((name, idx) => ({ idx, name }));

            const newResult: GenerationResult = {
                taskId: `hair_${Date.now()}`,
                date: new Date().toLocaleDateString('vi-VN'),
                prompt: `[Tóc AI] ${mode === 'presets' ? `${selectedStyles.length} kiểu` : 'Tùy chỉnh'}`,
                images: finalImages,
                settings: {
                    aspectRatio: 'custom', 
                    quantity: finalImages.length as any, 
                    generationMode: 'Chất lượng', 
                    imageStyle: JSON.stringify(stylesMetadata) // Save style names map
                },
                cost: totalCost,
                balanceAfter: freshUser!.creditBalance - totalCost,
                creationTime: new Date().toLocaleTimeString(),
            };
            handleSetGenerationHistory(loggedInUser.id, newResult);
        }
        
        setIsProcessing(false);
        addToast('Đã hoàn tất tạo mẫu tóc!', 'success');
    };
    
    const handleDownload = (url: string, name: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `hairstyle_${name}_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleDeleteItem = (itemToDelete: GeneratedHairstyle) => {
        // Remove from UI state
        setResults(prev => prev.filter(item => item.id !== itemToDelete.id));
    };

    // --- 3D VIEW LOGIC ---
    const handleOpen3D = async (item: GeneratedHairstyle) => {
        if (!item.imageUrl) return;
        
        setView3D({
            isOpen: true,
            frontImage: item.imageUrl,
            currentAngle: 50, // Center
            isLoading: true,
            styleName: item.styleName
        });

        // Generate Side Views AND Back View
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const mimeType = item.imageUrl.split(';')[0].split(':')[1] || 'image/png';
            const imagePart = { inlineData: { data: item.imageUrl.split(',')[1], mimeType } };
            
            // Prompts
            const leftPrompt = `Based on this front view portrait, generate the LEFT PROFILE VIEW (90 degrees) of the same person. Keep the exact same hairstyle (${item.styleName}) and face features. Neutral background.`;
            const rightPrompt = `Based on this front view portrait, generate the RIGHT PROFILE VIEW (90 degrees) of the same person. Keep the exact same hairstyle (${item.styleName}) and face features. Neutral background.`;
            const backPrompt = `Based on this front view portrait, generate the BACK VIEW (180 degrees) of the same person. Focus on showing the back of the hairstyle (${item.styleName}). Keep the same hair color and texture. Neutral background.`;

            // Parallel Generation for Speed
            const [leftRes, rightRes, backRes] = await Promise.all([
                ai.models.generateContent({ model: selectedModel, contents: { parts: [imagePart, { text: leftPrompt }] }, config: { responseModalities: [Modality.IMAGE] } }),
                ai.models.generateContent({ model: selectedModel, contents: { parts: [imagePart, { text: rightPrompt }] }, config: { responseModalities: [Modality.IMAGE] } }),
                ai.models.generateContent({ model: selectedModel, contents: { parts: [imagePart, { text: backPrompt }] }, config: { responseModalities: [Modality.IMAGE] } })
            ]);

            // Helper to extract image
            const extractImg = (res: any) => {
                const data = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                return data ? `data:${res.candidates[0].content.parts[0].inlineData.mimeType};base64,${data}` : undefined;
            }

            setView3D(prev => ({
                ...prev,
                leftImage: extractImg(leftRes),
                rightImage: extractImg(rightRes),
                backImage: extractImg(backRes),
                isLoading: false
            }));

        } catch (error) {
            console.error("Error generating 3D views:", error);
            addToast('Không thể tạo đầy đủ các góc nhìn 3D.', 'error');
            setView3D(prev => ({ ...prev, isLoading: false }));
        }
    };

    const current3DImage = useMemo(() => {
        const { currentAngle, frontImage, leftImage, rightImage, backImage } = view3D;
        
        // 360 Degree Logic
        if (currentAngle < 15) return backImage || frontImage; // Back (Left side wrap)
        if (currentAngle < 35) return leftImage || frontImage; // Left
        if (currentAngle < 65) return frontImage;              // Front
        if (currentAngle < 85) return rightImage || frontImage; // Right
        return backImage || frontImage;                        // Back (Right side wrap)
    }, [view3D]);

    const getAngleLabel = (angle: number) => {
        if (angle < 15) return 'Phía Sau';
        if (angle < 35) return 'Góc Trái';
        if (angle < 65) return 'Trực Diện';
        if (angle < 85) return 'Góc Phải';
        return 'Phía Sau';
    }

    return (
        <div className="h-full flex flex-col bg-slate-950 text-gray-300">
            {/* 3D VIEW MODAL */}
            <Modal isOpen={view3D.isOpen} onClose={() => setView3D(prev => ({ ...prev, isOpen: false }))} title={`Chế độ xem 3D: ${view3D.styleName}`} size="xl" hideFooter>
                <div className="flex flex-col items-center space-y-6 p-4">
                    <div className="relative w-full max-w-md aspect-[3/4] bg-black rounded-2xl overflow-hidden border border-indigo-500/50 shadow-2xl">
                         {view3D.isLoading && !view3D.backImage && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                                <div className="flex flex-col items-center gap-2">
                                    <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-400" />
                                    <span className="text-xs text-white animate-pulse">Đang tạo các góc nhìn (Trái, Phải, Sau)...</span>
                                </div>
                            </div>
                        )}
                        
                        <img src={current3DImage} alt="3D View" className="w-full h-full object-cover transition-all duration-300" />
                        
                        {/* Angle Indicator */}
                        <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full text-xs text-white border border-white/20 backdrop-blur-sm">
                             {getAngleLabel(view3D.currentAngle)}
                        </div>
                    </div>

                    <div className="w-full max-w-md space-y-2">
                        <div className="flex justify-between text-xs text-gray-400 font-mono uppercase">
                            <span>Sau</span>
                            <span>Trái</span>
                            <span className="text-white font-bold">Trước</span>
                            <span>Phải</span>
                            <span>Sau</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" max="100" 
                            value={view3D.currentAngle} 
                            onChange={(e) => setView3D(prev => ({ ...prev, currentAngle: Number(e.target.value) }))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            disabled={view3D.isLoading}
                        />
                        <p className="text-center text-xs text-slate-500 mt-2 flex items-center justify-center gap-2">
                            <ArrowsRightLeftIcon className="h-3 w-3" /> Kéo thanh trượt để xoay vòng 360 độ
                        </p>
                    </div>
                </div>
            </Modal>

            <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-30 shadow-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate('Kho Tiện Ích')} className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <ArrowLeftIcon className="h-5 w-5" />
                        Quay lại
                    </button>
                    <h1 className="text-lg font-bold text-white flex items-center gap-2">
                        <ScissorsIcon className="h-5 w-5 text-indigo-500" />
                        Tạo Mẫu Tóc AI Pro
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                     <CreditBalanceDisplay balance={currentCredits} onAdd={() => onNavigate('Ví Của Tôi')} />
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* LEFT PANEL: CONTROLS */}
                <aside className="w-96 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
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
                                {AVAILABLE_MODELS.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* 1. Upload */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <span>1. Ảnh khuôn mặt</span>
                                {alignedImage && <span className="text-[10px] bg-green-900/50 text-green-400 px-2 py-0.5 rounded border border-green-700">Đã Căn chỉnh</span>}
                            </label>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800 transition-all relative overflow-hidden group ${isAligning ? 'border-indigo-500 animate-pulse' : 'border-slate-700 hover:border-indigo-500'}`}
                            >
                                {alignedImage || uploadedImage ? (
                                    <>
                                        <img src={alignedImage || uploadedImage!} alt="Uploaded" className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                                        {isAligning && (
                                             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-10">
                                                 <ArrowPathIcon className="h-8 w-8 text-indigo-400 animate-spin mb-2" />
                                                 <p className="text-xs text-indigo-200 font-medium">Đang quét & căn chỉnh...</p>
                                             </div>
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center z-0">
                                            <button className="px-4 py-2 bg-black/60 rounded-lg text-white text-sm font-medium backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">Đổi ảnh</button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center p-4">
                                        <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-2 text-indigo-500">
                                            <FaceSmileIcon className="h-5 w-5" />
                                        </div>
                                        <p className="text-sm font-medium text-white">Tải ảnh chân dung</p>
                                        <p className="text-xs text-slate-500">hoặc Paste (Ctrl+V)</p>
                                    </div>
                                )}
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                            </div>
                        </div>

                        {/* 2. Settings */}
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">2. Cấu hình</label>
                            
                            {/* Gender */}
                            <div className="grid grid-cols-2 gap-2 bg-slate-800 p-1 rounded-lg">
                                <button 
                                    onClick={() => { setGender('male'); setSelectedStyles([]); }} 
                                    className={`py-2 text-sm font-medium rounded-md transition-colors ${gender === 'male' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Nam Giới
                                </button>
                                <button 
                                    onClick={() => { setGender('female'); setSelectedStyles([]); }} 
                                    className={`py-2 text-sm font-medium rounded-md transition-colors ${gender === 'female' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Nữ Giới
                                </button>
                            </div>
                        </div>
                        
                        {/* 3. Mode Selection (New Feature) */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">3. Chế độ</label>
                            <div className="flex bg-slate-800 p-1 rounded-lg">
                                <button 
                                    onClick={() => setMode('presets')} 
                                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${mode === 'presets' ? 'bg-slate-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Chọn từ mẫu
                                </button>
                                <button 
                                    onClick={() => setMode('custom')} 
                                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${mode === 'custom' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Tải ảnh mẫu tóc
                                </button>
                            </div>

                            {mode === 'custom' ? (
                                <div 
                                    onClick={() => refHairInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${isValidatingRef ? 'border-yellow-500 bg-yellow-900/10' : 'border-purple-500/50 hover:border-purple-500 bg-purple-900/10 hover:bg-purple-900/20'}`}
                                >
                                    {isValidatingRef ? (
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <ArrowPathIcon className="h-6 w-6 text-yellow-500 animate-spin" />
                                            <span className="text-xs text-yellow-300 font-medium">Đang kiểm tra ảnh...</span>
                                        </div>
                                    ) : refHairImage ? (
                                        <>
                                            <img src={refHairImage} alt="Ref Hair" className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <button className="px-3 py-1 bg-black/60 rounded text-white text-xs backdrop-blur-sm">Đổi ảnh mẫu</button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center p-4">
                                            <PlusIcon className="h-8 w-8 mx-auto mb-2 text-purple-400" />
                                            <p className="text-sm font-medium text-purple-200">Tải ảnh kiểu tóc mẫu</p>
                                            <p className="text-[10px] text-purple-300/60 mt-1">AI sẽ ghép tóc này vào mặt bạn</p>
                                        </div>
                                    )}
                                    <input type="file" ref={refHairInputRef} onChange={handleRefHairUpload} className="hidden" accept="image/*" disabled={isValidatingRef} />
                                </div>
                            ) : (
                                <>
                                    {/* Color (Only for Presets) */}
                                    <div>
                                        <p className="text-xs text-slate-500 mb-2">Màu nhuộm dự kiến</p>
                                        <div className="grid grid-cols-5 gap-2">
                                            {HAIR_COLORS.map(color => (
                                                <button
                                                    key={color.name}
                                                    onClick={() => setSelectedColor(color.name)}
                                                    className={`w-full aspect-square rounded-full border-2 transition-all relative group ${selectedColor === color.name ? 'border-white scale-110' : 'border-transparent hover:border-slate-600'}`}
                                                    style={{ backgroundColor: color.hex }}
                                                    title={color.name}
                                                >
                                                    {selectedColor === color.name && <CheckIcon className={`w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${['#FFF9C4', '#9E9E9E'].includes(color.hex) ? 'text-black' : 'text-white'}`} />}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="mt-3 flex items-center gap-2">
                                            <label className="text-xs text-slate-500 whitespace-nowrap">Màu tùy chỉnh:</label>
                                            <div className="flex items-center gap-2 flex-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
                                                <ColorPickerCircle color={customColorHex} onChange={(c) => { setCustomColorHex(c); setSelectedColor('Tùy chỉnh'); }} size="h-6 w-6" />
                                                <span className="text-xs font-mono text-slate-300">{customColorHex}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Styles Selection Grid - VISUAL ICONS */}
                                    <div className="flex justify-between items-center mt-4">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Danh sách Kiểu ({selectedStyles.length})</label>
                                        <button onClick={toggleAllStyles} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                                            {selectedStyles.length === availableStyles.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                                        {availableStyles.map(style => {
                                            const isSelected = selectedStyles.includes(style.id);
                                            
                                            return (
                                                <button
                                                    key={style.id}
                                                    onClick={() => toggleStyle(style.id)}
                                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all relative group ${isSelected ? 'bg-indigo-900/30 border-indigo-500 ring-1 ring-indigo-500' : 'bg-slate-800 border-slate-700 hover:border-indigo-500/50 hover:bg-slate-750'}`}
                                                >
                                                    <div className={`w-10 h-10 flex items-center justify-center ${isSelected ? 'text-indigo-300' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                                        <HairstyleIcon id={style.id} className="w-full h-full" />
                                                    </div>
                                                    <span className={`text-[9px] font-bold text-center leading-tight line-clamp-2 uppercase tracking-wide ${isSelected ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                                        {style.name}
                                                    </span>
                                                    {isSelected && (
                                                        <div className="absolute top-1 right-1 bg-indigo-500 rounded-full p-0.5 border border-slate-900 shadow-sm">
                                                            <CheckIcon className="h-2.5 w-2.5 text-white" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>

                     </div>

                     {/* Action Footer */}
                     <div className="p-6 bg-slate-900 border-t border-slate-800 z-10">
                        <div className="flex justify-between items-center mb-4 text-sm">
                            <span className="text-slate-400">Tổng chi phí:</span>
                            <span className="font-bold text-white flex items-center gap-1">
                                <SparklesIcon className="h-4 w-4 text-yellow-400" />
                                {totalCost} Credit
                            </span>
                        </div>
                        <button 
                            onClick={handleGenerate}
                            disabled={!alignedImage || isProcessing || (mode === 'presets' && selectedStyles.length === 0) || (mode === 'custom' && !refHairImage) || isValidatingRef}
                            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform active:scale-95"
                        >
                            {isProcessing ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <ScissorsIcon className="h-5 w-5" />}
                            {isProcessing 
                                ? (mode === 'presets' ? `Đang tạo (${currentProcessingIndex}/${selectedStyles.length})...` : 'Đang ghép tóc...') 
                                : 'Tạo Ngay'}
                        </button>
                    </div>
                </aside>

                {/* RIGHT PANEL: RESULTS */}
                <main className="flex-1 bg-slate-950 p-6 md:p-10 overflow-y-auto">
                    {!uploadedImage && results.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                            <UserCircleIcon className="h-24 w-24 text-slate-600 mb-4" />
                            <h3 className="text-2xl font-bold text-slate-500">Chưa có ảnh</h3>
                            <p className="text-slate-600 mt-2">Vui lòng tải ảnh lên để hệ thống quét khuôn mặt.</p>
                        </div>
                    ) : (
                        <div className="max-w-6xl mx-auto space-y-8">
                            {/* Original Image Preview (Small) - Only show if image is present */}
                            {(alignedImage || uploadedImage) && (
                                <div className="flex items-center gap-4 p-4 bg-slate-900 rounded-xl border border-slate-800 w-fit mx-auto">
                                    <div className="relative">
                                        <img src={alignedImage || uploadedImage!} alt="Original" className="w-16 h-16 rounded-full object-cover border-2 border-slate-600" />
                                        {alignedImage && <div className="absolute -bottom-1 -right-1 bg-green-500 text-black text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-black">ALIGNED</div>}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Ảnh gốc</p>
                                        <p className="text-xs text-slate-500">{alignedImage ? 'Đã căn chỉnh chuẩn' : 'Chờ xử lý...'}</p>
                                    </div>
                                    <div className="h-8 w-px bg-slate-700 mx-2"></div>
                                    <div className="text-xs text-slate-400">
                                        {mode === 'presets' ? (
                                            <>Màu chọn: <span className="text-white font-medium">{selectedColor === 'Tùy chỉnh' ? customColorHex : selectedColor}</span></>
                                        ) : (
                                            <span className="text-purple-400 font-medium">Chế độ Tự chọn</span>
                                        )}
                                    </div>
                                    {refHairImage && mode === 'custom' && (
                                        <>
                                            <div className="h-8 w-px bg-slate-700 mx-2"></div>
                                            <div className="relative">
                                                <img src={refHairImage} alt="Ref Hair" className="w-10 h-10 rounded-md object-cover border border-purple-500" />
                                                <span className="absolute -bottom-2 -right-2 text-[8px] bg-purple-600 text-white px-1 rounded">Mẫu</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                            
                            {/* History Notice if showing history without active upload */}
                            {!uploadedImage && results.length > 0 && (
                                <div className="p-4 bg-blue-900/20 border border-blue-800/50 rounded-xl text-center mb-6">
                                    <p className="text-blue-300 text-sm flex items-center justify-center gap-2">
                                        <DocumentArrowDownIcon className="h-4 w-4" />
                                        Đang hiển thị lịch sử đã lưu. Tải ảnh mới lên để tạo thêm mẫu tóc.
                                    </p>
                                </div>
                            )}

                            {/* Results Grid */}
                            {results.length > 0 ? (
                                <div className={`grid gap-6 animate-fadeIn ${mode === 'custom' ? 'grid-cols-1 max-w-md mx-auto' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                                    {results.map((item) => (
                                        <div key={item.id} className="group relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-indigo-500 transition-all hover:shadow-2xl hover:-translate-y-1">
                                            <div className="aspect-[3/4] bg-slate-950 relative">
                                                {item.status === 'completed' ? (
                                                    <img src={item.imageUrl} alt={item.styleName} className="w-full h-full object-cover" />
                                                ) : item.status === 'failed' ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                                                        <XCircleIcon className="h-10 w-10 mb-2 text-red-900/50" />
                                                        <span className="text-xs">Lỗi tạo ảnh</span>
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-indigo-500">
                                                        <ArrowPathIcon className="h-8 w-8 animate-spin mb-2" />
                                                        <span className="text-xs animate-pulse">Đang tạo...</span>
                                                    </div>
                                                )}
                                                
                                                {/* Overlay Actions */}
                                                {item.status === 'completed' && (
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleDownload(item.imageUrl, item.styleName)} className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform shadow-lg" title="Tải xuống">
                                                                <DocumentArrowDownIcon className="h-5 w-5" />
                                                            </button>
                                                            <button onClick={() => handleOpen3D(item)} className="p-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full hover:scale-110 transition-transform shadow-lg flex items-center gap-1" title="Xem 3D Xoay 360">
                                                                <CubeIcon className="h-5 w-5" />
                                                                <span className="text-xs font-bold">3D</span>
                                                            </button>
                                                            {item.styleId === 'history' && (
                                                                <button onClick={() => handleDeleteItem(item)} className="p-3 bg-red-600 text-white rounded-full hover:scale-110 transition-transform shadow-lg" title="Xóa khỏi danh sách">
                                                                    <TrashIcon className="h-5 w-5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-white/80 font-medium mt-2">Click để xem 3D</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-4 bg-slate-900 border-t border-slate-800">
                                                <h4 className="font-bold text-white text-sm truncate">{item.styleName}</h4>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                                                        {item.styleId === 'history' ? 'Đã lưu' : (gender === 'male' ? 'Nam' : 'Nữ')}
                                                    </span>
                                                    {item.status === 'completed' && <CheckCircleIcon className="h-4 w-4 text-green-500" />}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl">
                                    <SparklesIcon className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                                    <p className="text-slate-500">Chọn kiểu tóc (hoặc tải ảnh mẫu) và nhấn "Tạo Ngay".</p>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default HairstyleProTool;
