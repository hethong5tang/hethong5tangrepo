
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { 
    ArrowLeftIcon, SparklesIcon, DocumentArrowDownIcon, 
    PhotoIcon, CheckCircleIcon, TrashIcon, ArrowPathIcon, 
    CubeIcon, ClockIcon, ScissorsIcon,
    ShoppingBagIcon, UserIcon, ArrowUpTrayIcon,
    ChevronUpIcon, AdjustmentsHorizontalIcon,
    TagIcon, ArrowsRightLeftIcon,
    PlusIcon, PencilSquareIcon,
    PuzzlePieceIcon,
    ArrowsPointingOutIcon,
    Square2StackIcon,
    InformationCircleIcon,
    DocumentTextIcon,
    MapPinIcon,
    BoltIcon
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
import { useToolState } from '../../hooks/useToolState';
import { ColorPickerCircle } from './video-editor/VideoEditorUI';

// --- SUB-TOOL DEFINITIONS ---
type SubToolId = 'creator' | 'mixmatch' | 'segment' | 'analysis3d' | 'techpack';

interface SubTool {
    id: SubToolId;
    name: string;
    icon: React.FC<{className?: string}>;
    desc: string;
}

const SUB_TOOLS: SubTool[] = [
    { id: 'creator', name: 'Sáng Tạo (Creator)', icon: PencilSquareIcon, desc: 'Tạo mẫu mới từ ý tưởng' },
    { id: 'mixmatch', name: 'Phối Đồ (Mix)', icon: Square2StackIcon, desc: 'Gợi ý outfit phối đồ' },
    { id: 'segment', name: 'Tách Đồ (Segment)', icon: ScissorsIcon, desc: 'Tách item riêng biệt' },
    { id: 'analysis3d', name: 'Phân Tích 3D', icon: CubeIcon, desc: 'Xem 360 độ chi tiết' },
    { id: 'techpack', name: 'Hồ Sơ Kỹ Thuật (Pro)', icon: AdjustmentsHorizontalIcon, desc: 'Tạo Tech Pack sản xuất' },
];

const ACCESSORIES_LIST = [
    { id: 'handbag', label: 'Túi xách' },
    { id: 'shoulder_bag', label: 'Túi đeo vai' },
    { id: 'clutch', label: 'Ví cầm tay' },
    { id: 'backpack', label: 'Ba lô thời trang' },
    { id: 'jewelry_gold', label: 'Trang sức Vàng' },
    { id: 'jewelry_silver', label: 'Trang sức Bạc' },
    { id: 'pearls', label: 'Ngọc trai' },
    { id: 'watch', label: 'Đồng hồ' },
    { id: 'sunglasses', label: 'Kính râm' },
    { id: 'hat_cap', label: 'Mũ Lưỡi trai' },
    { id: 'hat_fedora', label: 'Mũ Vành rộng' },
    { id: 'belt', label: 'Thắt lưng da' },
    { id: 'scarf', label: 'Khăn lụa' },
    { id: 'heels', label: 'Giày Cao gót' },
    { id: 'boots', label: 'Boots' },
    { id: 'sneakers', label: 'Sneakers' },
];

// --- STYLE & CATEGORY MAPPING (EXPANDED) ---
const STYLE_CATEGORIES: Record<string, string[]> = {
    'Thời trang Cao cấp (Haute Couture)': [
        'Váy Dạ Hội (Ball Gown)', 'Váy Đuôi Cá (Mermaid)', 'Váy Chữ A (A-Line Gown)', 
        'Váy Cúp Ngực (Strapless)', 'Váy Xẻ Tà Cao (High Slit)', 'Áo Corset Đính Đá', 
        'Váy Lụa Satin Dài', 'Áo Khoác Lông Thú (Faux Fur)', 'Váy Ren Xuyên Thấu', 
        'Váy Kết Hạt (Beaded)', 'Váy Lông Vũ (Feather)', 'Suit Nữ Cách Điệu', 
        'Áo Choàng (Cape)', 'Găng Tay Opera', 'Mũ Couture', 'Váy Cưới Hoàng Gia',
        'Váy Dự Tiệc Cocktail Sang Trọng', 'Bodysuit Đính Kim Cương'
    ],
    'Old Money (Quý Tộc Kín Tiếng)': [
        'Áo Polo Dệt Kim', 'Áo Len Vặn Thừng (Cable Knit)', 'Quần Tây Ống Đứng', 
        'Váy Tennis Xếp Ly', 'Áo Sơ Mi Lụa Trắng', 'Áo Khoác Tweed', 
        'Quần Short Bermuda', 'Áo Blazer Nhung', 'Giày Loafers Da', 
        'Khăn Lụa Vuông', 'Váy Liền Thân Kín Đáo', 'Áo Khoác Dài (Trench Coat)', 
        'Set Đồ Linen', 'Kính Râm Cổ Điển', 'Túi Xách Da Minimal'
    ],
    'Luxury Resort (Nghỉ Dưỡng)': [
        'Váy Maxi Lụa', 'Áo Tunics Voan', 'Quần Ống Rộng Lụa', 
        'Bikini Cut-out', 'Áo Khoác Kimono', 'Mũ Cói Rộng Vành', 
        'Dép Sandal Đính Đá', 'Túi Tote Cói', 'Váy Hở Lưng (Backless)', 
        'Set Đồ Crochet (Móc Len)', 'Áo Yếm (Halter Neck)', 'Quần Short Lụa'
    ],
    'Bridal (Thời Trang Cưới)': [
        'Váy Cưới Công Chúa (Princess)', 'Váy Cưới Đuôi Cá', 'Váy Cưới Boho', 
        'Váy Cưới Ngắn (Short Bridal)', 'Áo Dài Cưới Truyền Thống', 'Khăn Voan (Veil)', 
        'Suit Cưới Nữ', 'Váy Phù Dâu', 'Váy Cưới Minimalist Satin', 'Váy Cưới Ren Tay Dài'
    ],
    'Đường phố (Streetwear)': [
        'Áo Hoodie Oversize', 'Quần Cargo (Túi hộp)', 'Áo Bomber Jacket', 
        'Áo Thun Graphic Tee', 'Quần Jogger', 'Quần Jeans Rách (Ripped)', 
        'Áo Khoác Denim', 'Áo Flannel Caro', 'Mũ Bucket', 
        'Sneaker Chunky', 'Túi Đeo Chéo (Crossbody)', 'Áo Khoác Varsity', 
        'Quần Short Bóng Rổ', 'Áo Jersey Thể Thao', 'Áo Puffer (Phao Béo)'
    ],
    'Y2K (Thập niên 2000)': [
        'Áo Crop Top Baby Tee', 'Quần Jeans Cạp Trễ', 'Váy Ngắn Xếp Ly (Micro Skirt)', 
        'Bộ Nỉ Velour (Velvet Tracksuit)', 'Áo Cardigan Cài Khuy', 'Quần Ống Loe', 
        'Kính Mát Màu', 'Kẹp Tóc Bướm', 'Túi Kẹp Nách (Baguette)', 
        'Áo Yếm (Halter Top)', 'Váy Denim Patchwork', 'Giày Đế Bánh Mì'
    ],
    'Cyberpunk (Techwear)': [
        'Áo Khoác Techwear Chống Nước', 'Quần Chiến Thuật (Tactical)', 'Áo Khoác Có Mũ Trùm', 
        'Bodysuit Neon', 'Găng Tay Hở Ngón', 'Giày Boots Hầm Hố', 
        'Mặt Nạ Công Nghệ', 'Áo Giáp Nhựa (Plastic Armor)', 'Váy Nhựa Trong Suốt (PVC)', 
        'Đèn LED Trang Trí', 'Kính Bảo Hộ (Goggles)', 'Ba Lô Đa Năng'
    ],
    'Bohemian (Du Mục)': [
        'Váy Maxi Họa Tiết Paisley', 'Áo Tunics Thêu', 'Quần Ống Loe (Flare Jeans)', 
        'Áo Khoác Tua Rua (Fringe)', 'Váy Đan Móc (Crochet)', 'Băng Đô Vải', 
        'Trang Sức Lông Vũ', 'Boots Da Lộn', 'Áo Kimono Họa Tiết', 
        'Váy Tầng (Tiered Skirt)', 'Quần Alibaba'
    ],
    'Công sở (Office Chic)': [
        'Bộ Vest (Suit) Nữ', 'Chân Váy Bút Chì', 'Áo Sơ Mi Lụa', 
        'Quần Âu Ống Đứng', 'Áo Blazer Cắt May', 'Váy Liền Thân (Sheath Dress)', 
        'Áo Khoác Dáng Dài (Trench Coat)', 'Giày Cao Gót Mũi Nhọn', 'Túi Xách Tote Da', 
        'Đồng Hồ Dây Kim Loại', 'Áo Gile Vest'
    ],
    'Tối giản (Minimalism)': [
        'Áo Thun Trắng Basic', 'Quần Jeans Ống Đứng', 'Váy Slip Dress Lụa', 
        'Áo Sơ Mi Form Rộng', 'Quần Culottes', 'Áo Len Cổ Lọ Đơn Sắc', 
        'Áo Blazer Màu Be/Đen', 'Giày Mule', 'Túi Xách Trơn', 'Váy Shirt Dress'
    ],
    'Traditional (Truyền Thống)': [
        'Áo Dài Việt Nam', 'Sườn Xám (Cheongsam)', 'Hanbok Hàn Quốc', 
        'Kimono / Yukata Nhật Bản', 'Saree Ấn Độ', 'Áo Bà Ba', 
        'Trang Phục Dân Tộc Thiểu Số', 'Áo Yếm', 'Khăn Đóng / Mấn'
    ]
};

const COMMON_FASHION_COLORS = [
    { hex: '#000000', name: 'Black' },
    { hex: '#FFFFFF', name: 'White' },
    { hex: '#FF0000', name: 'Red' },
    { hex: '#000080', name: 'Navy' },
    { hex: '#F5F5DC', name: 'Beige' },
    { hex: '#FFC0CB', name: 'Pink' },
];


// Interface for consolidated state
interface FashionToolState {
    activeToolId: SubToolId;
    creator: {
        style: string;
        category: string;
        color: string;
        prompt: string;
    };
    mixMatch: {
        images: string[];
        accessories: string[];
    };
    segment: {
        images: string[];
    };
    analysis: {
        images: string[];
    };
    techPack: {
        images: string[];
        notes: string;
        options: {
            includeMeasurements: boolean;
            includeZoomDetails: boolean;
            includeConstruction: boolean;
            includeBackView: boolean;
        };
    };
}

interface FashionToolProps {
    tool: IntegrationTool;
    onNavigate: (page: string) => void;
}


const FashionDesignerTool: React.FC<FashionToolProps> = ({ tool, onNavigate }) => {
    const { loggedInUser } = useAuth();
    const { userState } = useUser();
    const { handleUseToolCredit, handleSetGenerationHistory, handleDeleteGenerationResult } = useActions();
    const { addToast } = useToast();
    const { settingsState } = useSettings();

    // Custom useMemo for models
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

    // Consolidated State using Custom Hook
    const storageKey = useMemo(() => `tool_fashion_designer_session_${loggedInUser?.id}`, [loggedInUser]);
    
    const [state, setState, resetState] = useToolState<FashionToolState>(storageKey, {
        activeToolId: 'creator',
        creator: {
            style: Object.keys(STYLE_CATEGORIES)[0],
            category: STYLE_CATEGORIES[Object.keys(STYLE_CATEGORIES)[0]][0],
            color: '#000000',
            prompt: ''
        },
        mixMatch: { images: [], accessories: [] },
        segment: { images: [] },
        analysis: { images: [] },
        techPack: {
            images: [],
            notes: '',
            options: { includeMeasurements: true, includeZoomDetails: true, includeConstruction: true, includeBackView: true }
        }
    });

    const [selectedModel, setSelectedModel] = useState<string>(activeModels[0].id);

    useEffect(() => {
        if (!activeModels.some(m => m.id === selectedModel)) {
            setSelectedModel(activeModels[0].id);
        }
    }, [activeModels, selectedModel]);

    // Transient State (Not persisted)
    const [view3D, setView3D] = useState<{ isOpen: boolean; images: string[]; angle: number }>({ isOpen: false, images: [], angle: 0 });
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    
    // Result State (Temporary, specific to current session view)
    const [results, setResults] = useState<{ id: string, image: string, toolId: SubToolId, prompt: string, timestamp: number }[]>([]);
    const [selectedResultIndex, setSelectedResultIndex] = useState<number>(0);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const freshUser = useMemo(() => loggedInUser ? findUserInTree(userState.allUsers, loggedInUser.id) : null, [userState.allUsers, loggedInUser]);
    const currentCredits = freshUser ? freshUser.creditBalance : 0;

    const historyItems = useMemo(() => {
        if (!loggedInUser?.generationHistory) return [];
        return loggedInUser.generationHistory
            .filter(h => h.taskId.startsWith('fashion_pro_'))
            .sort((a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime());
    }, [loggedInUser]);

    const currentResult = results[selectedResultIndex];

    // --- HANDLERS ---
    
    const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStyle = e.target.value;
        const newCategory = (STYLE_CATEGORIES[newStyle] && STYLE_CATEGORIES[newStyle].length > 0) 
            ? STYLE_CATEGORIES[newStyle][0] 
            : '';
        setState(prev => ({
            ...prev,
            creator: { ...prev.creator, style: newStyle, category: newCategory }
        }));
    };

    const handleSwitchTool = (targetId: SubToolId, image?: string) => {
        setState(prev => {
            const newState = { ...prev, activeToolId: targetId };
            if (image) {
                if (targetId === 'mixmatch') newState.mixMatch.images = [image];
                if (targetId === 'segment') newState.segment.images = [image];
                if (targetId === 'analysis3d') newState.analysis.images = [image];
                if (targetId === 'techpack') newState.techPack.images = [image];
            }
            return newState;
        });
        if (image) addToast(`Đã chuyển ảnh sang công cụ ${SUB_TOOLS.find(t => t.id === targetId)?.name}`, 'info');
    };
    
    const handleTransferToTryOn = (image: string) => {
        if (!loggedInUser) return;
        try {
            localStorage.setItem(`tool_fashion_studio_session_${loggedInUser.id}`, JSON.stringify({ garmentImage: image, userImage: null, resultImage: null }));
            onNavigate('Kho Tiện Ích/tool_fashion_studio');
            addToast('Đã chuyển trang phục sang Phòng Thử Đồ!', 'success');
        } catch (e) {
            console.error(e);
            addToast('Lỗi khi chuyển dữ liệu.', 'error');
        }
    }
    
    const handleToggleAccessory = (accId: string) => {
        setState(prev => {
            const currentAcc = prev.mixMatch.accessories;
            const newAcc = currentAcc.includes(accId) ? currentAcc.filter(id => id !== accId) : [...currentAcc, accId];
            return { ...prev, mixMatch: { ...prev.mixMatch, accessories: newAcc } };
        });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            Array.from(e.target.files).forEach((file: File) => {
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    if (ev.target?.result) {
                        const res = await ensureSupportedImageFormat(ev.target.result as string);
                        setState(prev => {
                            const newState = { ...prev };
                            if (prev.activeToolId === 'mixmatch') newState.mixMatch.images = [...prev.mixMatch.images, res];
                            else if (prev.activeToolId === 'segment') newState.segment.images = [...prev.segment.images, res];
                            else if (prev.activeToolId === 'analysis3d') newState.analysis.images = [...prev.analysis.images, res];
                            else if (prev.activeToolId === 'techpack') newState.techPack.images = [...prev.techPack.images, res];
                            return newState;
                        });
                    }
                };
                reader.readAsDataURL(file);
            });
        }
        e.target.value = '';
    };

    const handleRemoveImage = (index: number) => {
        setState(prev => {
            const newState = { ...prev };
            if (prev.activeToolId === 'mixmatch') newState.mixMatch.images = prev.mixMatch.images.filter((_, i) => i !== index);
            else if (prev.activeToolId === 'segment') newState.segment.images = prev.segment.images.filter((_, i) => i !== index);
            else if (prev.activeToolId === 'analysis3d') newState.analysis.images = prev.analysis.images.filter((_, i) => i !== index);
            else if (prev.activeToolId === 'techpack') newState.techPack.images = prev.techPack.images.filter((_, i) => i !== index);
            return newState;
        });
    };

    const handleSuggestPrompt = async () => {
        if (isSuggesting) return;
        setIsSuggesting(true);
        try {
            const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
            let context = '';
            
            if (state.activeToolId === 'creator') context = `Style: ${state.creator.style}, Category: ${state.creator.category}`;
            else if (state.activeToolId === 'techpack') context = "Technical Drawing description. Focus on material weight, stitching type, hardware.";
            else context = `Fashion item description for ${state.activeToolId}`;

            const systemPrompt = `
            ROLE: World-Class Fashion Designer & Technical Developer.
            TASK: Create a vivid, professional description for a fashion item based on user selection.
            CONTEXT: ${context}
            INSTRUCTION: Describe the garment in detail suitable for image generation, focusing on: Silhouette, Fabric, Construction, Color.
            OUTPUT: A single, descriptive paragraph in VIETNAMESE.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: { parts: [{ text: systemPrompt }] }
            });

            if (response.text) {
                const text = response.text.trim();
                setState(prev => {
                    const newState = { ...prev };
                    if (prev.activeToolId === 'creator') newState.creator.prompt = text;
                    else if (prev.activeToolId === 'techpack') newState.techPack.notes = text;
                    return newState;
                });
                addToast('Nhà thiết kế AI đã đề xuất ý tưởng!', 'success');
            }
        } catch (error) {
            console.error("Suggestion error:", error);
            addToast('Không thể tạo gợi ý lúc này.', 'error');
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleGenerate = async () => {
        if (isProcessing || !loggedInUser) return;
        
        const cost = tool.creditCost;
        if (currentCredits < cost) {
            addToast('Không đủ Credit.', 'error');
            return;
        }

        // Validation
        if (state.activeToolId === 'creator' && !state.creator.prompt.trim()) { addToast('Vui lòng nhập mô tả.', 'error'); return; }
        if (state.activeToolId === 'mixmatch' && state.mixMatch.images.length === 0) { addToast('Vui lòng tải ảnh lên.', 'error'); return; }
        if (state.activeToolId === 'segment' && state.segment.images.length === 0) { addToast('Vui lòng tải ảnh lên.', 'error'); return; }
        if (state.activeToolId === 'analysis3d' && state.analysis.images.length === 0) { addToast('Vui lòng tải ảnh lên.', 'error'); return; }
        if (state.activeToolId === 'techpack' && state.techPack.images.length === 0) { addToast('Vui lòng tải ảnh lên.', 'error'); return; }

        setIsProcessing(true);
        const creditResult = await handleUseToolCredit(loggedInUser.id, { ...tool, creditCost: cost });
        if (!creditResult.success) { setIsProcessing(false); return; }

        try {
            const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
            let finalPrompt = "";
            let inputParts: any[] = [];
            let activeImages: string[] = [];
            let logPrompt = "";

            switch (state.activeToolId) {
                case 'creator':
                    activeImages = [];
                    logPrompt = state.creator.prompt;
                    finalPrompt = `
                    ROLE: World-Class Fashion Designer.
                    TASK: Create a high-fashion design based on: "${state.creator.prompt}".
                    STYLE: ${state.creator.style}. CATEGORY: ${state.creator.category}. COLOR THEME: ${state.creator.color}.
                    REQUIREMENTS: Photorealistic, 8k, full body, neutral background.
                    `;
                    break;
                case 'mixmatch':
                    activeImages = state.mixMatch.images;
                    logPrompt = "Mix Match";
                    const selectedAccessories = state.mixMatch.accessories.map(id => ACCESSORIES_LIST.find(a => a.id === id)?.label).filter(Boolean).join(', ');
                    finalPrompt = `
                    ROLE: Fashion Stylist. TASK: Create a COMPLETE OUTFIT from inputs.
                    ${selectedAccessories ? `INTEGRATE ACCESSORIES: ${selectedAccessories}.` : ''}
                    OUTPUT: A cohesive outfit image on a model/mannequin.
                    `;
                    break;
                case 'segment':
                    activeImages = state.segment.images;
                    logPrompt = "Segment";
                    finalPrompt = `TASK: Fashion Item Segmentation. EXTRACT MAIN GARMENT. Remove model/background. Create Ghost Mannequin look on white background.`;
                    break;
                case 'analysis3d':
                    activeImages = state.analysis.images;
                    logPrompt = "3D Analysis";
                    finalPrompt = `TASK: 3D Fashion Turnaround. Generate 4 views (Front, Back, Left, Right) of the EXACT OUTFIT in a grid. Neutral background.`;
                    break;
                case 'techpack':
                    activeImages = state.techPack.images;
                    logPrompt = state.techPack.notes || "Tech Pack";
                    finalPrompt = `
                    ROLE: Technical Fashion Designer. TASK: Create a Tech Pack.
                    LANGUAGE: VIETNAMESE.
                    OUTPUT: Flat Sketch (B&W vector style) + Technical Annotations (Dimensions, Zoom details, Construction notes).
                    USER NOTES: "${state.techPack.notes}"
                    `;
                    break;
            }
            
            if (activeImages.length > 0) {
                inputParts = activeImages.map(img => {
                    const mimeType = img.split(';')[0].split(':')[1];
                    const data = img.split(',')[1];
                    return { inlineData: { data, mimeType } };
                });
            }

            const response = await ai.models.generateContent({
                model: selectedModel,
                contents: { parts: [...inputParts, { text: finalPrompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const newImagePart = response.candidates?.[0]?.content?.parts[0];
            if (newImagePart && newImagePart.inlineData?.data) {
                const resultBase64 = `data:${newImagePart.inlineData.mimeType};base64,${newImagePart.inlineData.data}`;
                
                const newResultItem = {
                    id: `res_${Date.now()}`,
                    image: resultBase64,
                    toolId: state.activeToolId,
                    prompt: logPrompt,
                    timestamp: Date.now()
                };
                
                setResults(prev => [newResultItem, ...prev]);
                setSelectedResultIndex(0);

                const newHistory: GenerationResult = {
                    taskId: `fashion_pro_${state.activeToolId}_${Date.now()}`,
                    date: new Date().toLocaleDateString('vi-VN'),
                    prompt: `[${SUB_TOOLS.find(t=>t.id===state.activeToolId)?.name}] ${logPrompt.substring(0, 30)}...`,
                    images: [resultBase64],
                    settings: { aspectRatio: 'custom', quantity: 1, generationMode: 'Chất lượng', customRatio: null },
                    cost: cost,
                    balanceAfter: freshUser ? freshUser.creditBalance - cost : 0,
                    creationTime: new Date().toLocaleTimeString(),
                };
                handleSetGenerationHistory(loggedInUser.id, newHistory);
                addToast('Xử lý thành công!', 'success');
                if (state.activeToolId === 'analysis3d') setView3D({ isOpen: true, images: [resultBase64], angle: 0 });
            } else {
                throw new Error("API không trả về ảnh.");
            }

        } catch (error) {
            console.error(error);
            addToast('Lỗi xử lý. Đã hoàn tiền.', 'error');
            const userForRefund = findUserInTree(userState.allUsers, loggedInUser.id);
            if(userForRefund) await handleUseToolCredit(userForRefund.id, { ...tool, creditCost: -cost });
        } finally {
            setIsProcessing(false);
        }
    };
    
    // ... (Keep existing helpers: handleDownload, handleLoadHistory, etc.)
     const handleDownload = (url: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `fashion_design_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleLoadHistory = (item: GenerationResult) => {
        const newResults = item.images.map((img, idx) => ({ 
            id: `hist_${item.taskId}_${idx}`, 
            image: img, 
            toolId: 'creator' as SubToolId, 
            prompt: item.prompt,
            timestamp: Date.now()
        }));
        setResults(prev => [...newResults, ...prev]);
        setSelectedResultIndex(0);
        setShowHistoryModal(false);
        addToast("Đã tải ảnh từ lịch sử", "success");
    };

    const handleDeleteHistoryItem = (taskId: string) => {
        if (loggedInUser) {
            handleDeleteGenerationResult(loggedInUser.id, taskId);
            addToast('Đã xóa.', 'info');
        }
    };

    // Helper to get active images for UI rendering
    const getActiveInputImages = () => {
        if (state.activeToolId === 'mixmatch') return state.mixMatch.images;
        if (state.activeToolId === 'segment') return state.segment.images;
        if (state.activeToolId === 'analysis3d') return state.analysis.images;
        if (state.activeToolId === 'techpack') return state.techPack.images;
        return [];
    }

    return (
        <div className="h-full flex flex-col bg-[#0f172a] text-gray-300 font-sans">
            {/* History Modal */}
            <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Lịch sử Thiết kế" size="lg" hideFooter>
                <div className="max-h-[60vh] overflow-y-auto p-1 space-y-3">
                    {historyItems.length === 0 ? <p className="text-center text-slate-500 py-8">Chưa có lịch sử.</p> : historyItems.map(item => (
                        <div key={item.taskId} className="flex items-center gap-4 p-3 bg-slate-800 border border-slate-700 rounded-xl hover:border-indigo-500 transition-colors">
                            <img src={item.images[0]} className="h-16 w-16 object-cover rounded-lg bg-black" />
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
            
            {/* 3D View Modal */}
            <Modal isOpen={view3D.isOpen} onClose={() => setView3D(p => ({...p, isOpen: false}))} title="3D Outfit View" size="xl" hideFooter>
                <div className="flex flex-col items-center gap-4">
                    <img src={view3D.images[0]} alt="3D" className="w-full max-h-[60vh] object-contain rounded-lg border border-slate-700" />
                    <p className="text-sm text-slate-400">Hình ảnh phân tích 4 góc độ (Front, Back, Side). Dùng chuột để zoom/pan.</p>
                </div>
            </Modal>

            <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-30 shadow-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate('Kho Tiện Ích')} className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <ArrowLeftIcon className="h-5 w-5" /> Quay lại
                    </button>
                    <h1 className="text-lg font-bold text-white flex items-center gap-2">
                        <ScissorsIcon className="h-5 w-5 text-pink-500" />
                        Fashion Designer AI
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <CreditBalanceDisplay balance={currentCredits} onAdd={() => onNavigate('Ví Của Tôi')} />
                    <button onClick={() => setShowHistoryModal(true)} className="p-2 text-indigo-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-indigo-900/50"><ClockIcon className="h-5 w-5" /></button>
                    <button onClick={resetState} className="p-2 text-gray-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg" title="Làm mới"><ArrowPathIcon className="h-5 w-5" /></button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* SIDEBAR NAVIGATION */}
                <nav className="w-20 bg-[#161b22] border-r border-slate-800 flex flex-col items-center py-4 gap-4 z-20">
                    {SUB_TOOLS.map(t => {
                        const Icon = t.icon;
                        const isActive = state.activeToolId === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => handleSwitchTool(t.id)}
                                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all relative group ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}
                                title={t.name}
                            >
                                <Icon className="h-5 w-5" />
                                <div className="absolute left-full ml-3 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity border border-slate-700">
                                    <p className="font-bold">{t.name}</p>
                                    <p className="text-[10px] text-gray-400 font-normal">{t.desc}</p>
                                </div>
                            </button>
                        );
                    })}
                </nav>

                {/* CONTROL PANEL */}
                <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col overflow-y-auto">
                    <div className="p-6 space-y-6">
                        {/* MODEL SELECTOR */}
                        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 mb-4">
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
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
                                {SUB_TOOLS.find(t => t.id === state.activeToolId)?.name}
                            </h3>
                            <p className="text-xs text-slate-500">{SUB_TOOLS.find(t => t.id === state.activeToolId)?.desc}</p>
                        </div>

                        {/* CREATOR TOOL CONTROLS */}
                        {state.activeToolId === 'creator' && (
                            <div className="space-y-4 animate-fadeIn">
                                <div className="grid grid-cols-1 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 mb-1 block">Phong cách</label>
                                        <select value={state.creator.style} onChange={handleStyleChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white">
                                            {Object.keys(STYLE_CATEGORIES).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 mb-1 block">Loại</label>
                                        <select value={state.creator.category} onChange={e => setState(p => ({...p, creator: {...p.creator, category: e.target.value}}))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white">
                                            {STYLE_CATEGORIES[state.creator.style]?.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 mb-1 block">Màu chủ đạo</label>
                                        <div className="flex items-center gap-2">
                                            <ColorPickerCircle color={state.creator.color} onChange={(c) => setState(p => ({...p, creator: {...p.creator, color: c}}))} />
                                            <span className="text-xs text-slate-500 font-mono flex-1">{state.creator.color}</span>
                                            <div className="flex gap-1">
                                                {['#000000', '#FFFFFF', '#FF0000', '#000080'].map(c => (
                                                    <button 
                                                        key={c} 
                                                        className="w-4 h-4 rounded-full border border-slate-600" 
                                                        style={{backgroundColor: c}}
                                                        onClick={() => setState(p => ({...p, creator: {...p.creator, color: c}}))}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs font-bold text-slate-400 block">Mô tả ý tưởng</label>
                                        <button onClick={handleSuggestPrompt} disabled={isSuggesting} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 disabled:opacity-50">
                                            <SparklesIcon className={`h-3 w-3 ${isSuggesting ? 'animate-spin' : ''}`} />
                                            {isSuggesting ? 'Đang viết...' : '✨ AI Gợi ý Ý tưởng'}
                                        </button>
                                    </div>
                                    <textarea value={state.creator.prompt} onChange={e => setState(p => ({...p, creator: {...p.creator, prompt: e.target.value}}))} rows={4} placeholder="VD: Váy dạ hội đỏ, lụa satin, xẻ tà, đính đá sang trọng..." className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>
                        )}
                        
                        {/* MIXMATCH CONTROLS */}
                        {state.activeToolId === 'mixmatch' && (
                             <div className="space-y-4 animate-fadeIn">
                                 <div>
                                     <label className="text-xs font-bold text-slate-400 mb-1 block">Hình ảnh quần áo (Tops/Bottoms)</label>
                                     <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-700 rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-slate-800 transition-all bg-slate-900/50">
                                        <ArrowUpTrayIcon className="h-6 w-6 text-slate-500 mb-2" />
                                        <span className="text-xs text-slate-400">Tải ảnh lên</span>
                                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" multiple />
                                    </div>
                                    {state.mixMatch.images.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2 mt-2">
                                            {state.mixMatch.images.map((img, idx) => (
                                                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-700 group">
                                                    <img src={img} className="w-full h-full object-cover" />
                                                    <button onClick={() => handleRemoveImage(idx)} className="absolute top-1 right-1 bg-red-600 text-white p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="h-3 w-3"/></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                 </div>
                                 <div className="pt-2 border-t border-slate-800">
                                     <label className="text-xs font-bold text-slate-400 mb-2 block">4. Phụ kiện đi kèm</label>
                                     <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                                         {ACCESSORIES_LIST.map(acc => {
                                             const isSelected = (state.mixMatch.accessories || []).includes(acc.id);
                                             return (
                                                 <button key={acc.id} onClick={() => handleToggleAccessory(acc.id)} className={`px-2 py-1.5 text-[10px] rounded border text-left transition-colors ${isSelected ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-gray-400 border-slate-700 hover:border-slate-500'}`}>
                                                     {acc.label}
                                                 </button>
                                             )
                                         })}
                                     </div>
                                 </div>
                             </div>
                        )}

                        {/* TECHPACK SPECIFIC OPTIONS */}
                        {state.activeToolId === 'techpack' && (
                             <div className="space-y-4 animate-fadeIn">
                                 <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                    <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider block mb-2">Tùy chọn Tech Pack</label>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={state.techPack.options.includeMeasurements} onChange={e => setState(p => ({...p, techPack: {...p.techPack, options: {...p.techPack.options, includeMeasurements: e.target.checked}}}))} className="rounded text-indigo-500 focus:ring-indigo-500 bg-slate-900 border-slate-600" />
                                            <label className="text-xs text-slate-300">Thông số đo (Measurements)</label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={state.techPack.options.includeZoomDetails} onChange={e => setState(p => ({...p, techPack: {...p.techPack, options: {...p.techPack.options, includeZoomDetails: e.target.checked}}}))} className="rounded text-indigo-500 focus:ring-indigo-500 bg-slate-900 border-slate-600" />
                                            <label className="text-xs text-slate-300">Chi tiết phóng to (Zoom)</label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={state.techPack.options.includeConstruction} onChange={e => setState(p => ({...p, techPack: {...p.techPack, options: {...p.techPack.options, includeConstruction: e.target.checked}}}))} className="rounded text-indigo-500 focus:ring-indigo-500 bg-slate-900 border-slate-600" />
                                            <label className="text-xs text-slate-300">Ghi chú cấu trúc (Construction)</label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={state.techPack.options.includeBackView} onChange={e => setState(p => ({...p, techPack: {...p.techPack, options: {...p.techPack.options, includeBackView: e.target.checked}}}))} className="rounded text-indigo-500 focus:ring-indigo-500 bg-slate-900 border-slate-600" />
                                            <label className="text-xs text-slate-300">Mặt sau (Back View)</label>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                         <label className="text-[10px] font-bold text-slate-400 block">Ghi chú kỹ thuật (Optional)</label>
                                          <button onClick={handleSuggestPrompt} disabled={isSuggesting} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 disabled:opacity-50">
                                            <SparklesIcon className={`h-3 w-3 ${isSuggesting ? 'animate-spin' : ''}`} />{isSuggesting ? '...' : 'Gợi ý'}
                                        </button>
                                    </div>
                                    <textarea value={state.techPack.notes} onChange={e => setState(p => ({...p, techPack: {...p.techPack, notes: e.target.value}}))} rows={3} placeholder="VD: Cổ tim sâu, tay phồng..." className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none"/>
                                </div>
                             </div>
                        )}

                        {/* GENERAL IMAGE UPLOAD */}
                        {state.activeToolId !== 'creator' && state.activeToolId !== 'mixmatch' && (
                            <div className="space-y-4 animate-fadeIn">
                                <label className="text-xs font-bold text-slate-400 mb-1 block">Hình ảnh đầu vào</label>
                                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-700 rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-slate-800 transition-all bg-slate-900/50">
                                    <ArrowUpTrayIcon className="h-6 w-6 text-slate-500 mb-2" />
                                    <span className="text-xs text-slate-400">Tải ảnh lên</span>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" multiple />
                                </div>
                                {getActiveInputImages().length > 0 && (
                                    <div className="grid grid-cols-3 gap-2">
                                        {getActiveInputImages().map((img, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-700 group">
                                                <img src={img} className="w-full h-full object-cover" />
                                                <button onClick={() => handleRemoveImage(idx)} className="absolute top-1 right-1 bg-red-600 text-white p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="h-3 w-3"/></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* GENERATE BUTTON */}
                        <div className="pt-4 border-t border-slate-800 mt-auto">
                             <div className="flex justify-between items-center mb-3 text-xs">
                                <span className="text-slate-400">Chi phí:</span>
                                <span className="font-bold text-white flex items-center gap-1"><SparklesIcon className="h-3 w-3 text-yellow-400"/> {tool.creditCost} Credit</span>
                            </div>
                            <button 
                                onClick={handleGenerate}
                                disabled={isProcessing || (state.activeToolId === 'creator' && !state.creator.prompt) || (state.activeToolId === 'mixmatch' && getActiveInputImages().length === 0) || (state.activeToolId !== 'creator' && state.activeToolId !== 'mixmatch' && getActiveInputImages().length === 0)}
                                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform active:scale-95"
                            >
                                {isProcessing ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <SparklesIcon className="h-5 w-5" />}
                                {isProcessing ? 'Đang xử lý...' : 'Thực hiện ngay'}
                            </button>
                        </div>
                    </div>
                </aside>

                {/* MAIN: WORKSPACE / PREVIEW */}
                <main className="flex-1 bg-black overflow-hidden relative flex flex-col">
                     <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                     
                     {results.length === 0 ? (
                         <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                             <CubeIcon className="h-24 w-24 text-slate-600 mb-4" />
                             <h3 className="text-2xl font-bold text-slate-400">Không gian Thiết kế</h3>
                             <p className="text-slate-500 mt-2">Chọn công cụ và bắt đầu sáng tạo.</p>
                         </div>
                     ) : (
                        <div className="flex flex-col h-full z-10 animate-fadeIn">
                             {/* MAIN DISPLAY AREA */}
                             <div className="flex-1 flex items-center justify-center p-6 bg-[#1a1a1a] relative overflow-hidden">
                                 <div className="relative w-full h-full max-h-[75vh] flex flex-col items-center justify-center">
                                      <img src={currentResult.image} alt="Current Result" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-slate-800" />
                                      {/* Floating Action Bar */}
                                      <div className="absolute bottom-6 flex items-center gap-3 px-4 py-2 bg-slate-900/90 backdrop-blur-md rounded-full border border-slate-700 shadow-xl">
                                          <button onClick={() => handleDownload(currentResult.image)} className="p-2 text-white hover:text-green-400 transition-colors" title="Tải xuống"><DocumentArrowDownIcon className="h-5 w-5"/></button>
                                          {state.activeToolId === 'segment' && (
                                              <>
                                                  <div className="w-px h-4 bg-slate-700"></div>
                                                  <button onClick={() => handleTransferToTryOn(currentResult.image)} className="px-3 py-1 text-xs font-bold text-pink-300 hover:text-pink-100 hover:bg-pink-900/30 rounded-full transition-colors flex items-center gap-1"><ShoppingBagIcon className="h-4 w-4" /> Thử Đồ</button>
                                              </>
                                          )}
                                          <div className="w-px h-4 bg-slate-700"></div>
                                          <button onClick={() => handleSwitchTool('mixmatch', currentResult.image)} className="px-3 py-1 text-xs font-bold text-purple-300 hover:text-purple-100 hover:bg-purple-900/30 rounded-full transition-colors">Phối Đồ</button>
                                          <button onClick={() => handleSwitchTool('segment', currentResult.image)} className="px-3 py-1 text-xs font-bold text-blue-300 hover:text-blue-100 hover:bg-blue-900/30 rounded-full transition-colors">Tách Item</button>
                                          <button onClick={() => handleSwitchTool('techpack', currentResult.image)} className="px-3 py-1 text-xs font-bold text-slate-300 hover:text-slate-100 hover:bg-slate-700 rounded-full transition-colors">Bản Vẽ</button>
                                          <div className="w-px h-4 bg-slate-700"></div>
                                          <button onClick={() => handleSwitchTool('analysis3d', currentResult.image)} className="p-2 text-indigo-400 hover:text-indigo-200" title="Xem 3D"><CubeIcon className="h-5 w-5"/></button>
                                      </div>
                                 </div>
                             </div>

                             {/* THUMBNAIL STRIP */}
                             <div className="h-32 bg-slate-900 border-t border-slate-800 p-4 flex gap-4 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 items-center shrink-0">
                                 {results.map((res, index) => (
                                     <button key={res.id} onClick={() => setSelectedResultIndex(index)} className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${selectedResultIndex === index ? 'border-indigo-500 scale-105 shadow-lg' : 'border-slate-700 opacity-70 hover:opacity-100'}`}>
                                         <img src={res.image} className="w-full h-full object-cover" alt={`Result ${index}`} />
                                     </button>
                                 ))}
                             </div>
                        </div>
                     )}
                </main>
            </div>
        </div>
    );
};

export default FashionDesignerTool;
