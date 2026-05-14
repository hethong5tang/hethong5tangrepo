
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { 
    ArrowLeftIcon, SparklesIcon, DocumentArrowDownIcon, 
    PhotoIcon, CheckCircleIcon, TrashIcon, ArrowPathIcon, 
    PresentationChartLineIcon, ClockIcon, PlusIcon,
    ChevronUpIcon, MagnifyingGlassIcon, TagIcon,
    Square2StackIcon, SwatchIcon, FrameIcon,
    ArrowUpTrayIcon, ChatBubbleBottomCenterTextIcon,
    LightBulbIcon, CubeIcon, UserGroupIcon, UserIcon, BoltIcon
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
import { ensureSupportedImageFormat } from '../../utils/imageProcessing';

interface AdCreatorToolProps {
    tool: IntegrationTool;
    onNavigate: (page: string) => void;
}

type CreateMode = 'new' | 'mimic';
type ImageQuantity = 1 | 2 | 3 | 4;
type ModelMode = 'none' | 'ai' | 'upload';

const FORMAT_OPTIONS: { id: string, label: string, ratio: AspectRatio, desc: string }[] = [
    { id: 'fb_post', label: 'Facebook Post', ratio: '4:5', desc: 'Tối ưu hiển thị trên Feed (1080x1350)' },
    { id: 'insta_story', label: 'Story / Reels', ratio: '9:16', desc: 'Full màn hình dọc (1080x1920)' },
    { id: 'banner_web', label: 'Website Banner', ratio: '16:9', desc: 'Ngang chuẩn (1920x1080)' },
    { id: 'poster', label: 'Poster / Standee', ratio: '2:3', desc: 'In ấn hoặc dựng đứng' },
    { id: 'square', label: 'Vuông (Instagram)', ratio: '1:1', desc: 'Đa dụng (1080x1080)' },
];

const STYLE_PRESETS = [
    'Minimalist (Tối giản & Sang trọng)', 
    'Luxury (Vàng son & Đẳng cấp)', 
    'Pop Art (Sôi động & Tương phản)', 
    'Cyberpunk (Neon & Tương lai)', 
    'Vintage (Cổ điển & Hoài niệm)', 
    'Eco Natural (Xanh mát & Thiên nhiên)',
    'Corporate Professional (Doanh nghiệp)', 
    'E-commerce Sale (Khuyến mãi bùng nổ)',
    'Cinematic (Điện ảnh & Kịch tính)',
    '3D Render (Nổi khối & Hiện đại)'
];

const LIGHTING_OPTIONS = [
    { id: 'studio', label: 'Studio Softbox', desc: 'Ánh sáng mềm, đều, chuyên nghiệp.' },
    { id: 'sunlight', label: 'Nắng tự nhiên', desc: 'Rực rỡ, bóng đổ sắc nét, tươi tắn.' },
    { id: 'golden_hour', label: 'Giờ vàng (Golden Hour)', desc: 'Ấm áp, lãng mạn, ngược sáng.' },
    { id: 'neon', label: 'Neon Glow', desc: 'Ánh sáng màu, tương phản cao, hiện đại.' },
    { id: 'moody', label: 'Moody & Dark', desc: 'Tối, bí ẩn, chỉ chiếu sáng điểm nhấn.' },
    { id: 'product', label: 'Product Photography', desc: 'Sạch sẽ, nền trắng/xám, bóng đổ nhẹ.' }
];

const COMPOSITION_OPTIONS = [
    { id: 'center', label: 'Trung tâm (Hero)', desc: 'Sản phẩm nằm chính giữa, nổi bật nhất.' },
    { id: 'rule_of_thirds', label: 'Quy tắc 1/3', desc: 'Cân đối, nghệ thuật, dành không gian cho chữ.' },
    { id: 'flat_lay', label: 'Flat Lay (Từ trên xuống)', desc: 'Sắp đặt trên mặt phẳng, nhiều phụ kiện.' },
    { id: 'floating', label: 'Bay lơ lửng (Floating)', desc: 'Sản phẩm bay trong không trung, năng động.' },
    { id: 'perspective', label: 'Góc thấp (Low Angle)', desc: 'Góc nhìn từ dưới lên, tạo vẻ uy quyền.' }
];

const TEXT_STYLES = [
    { id: 'modern', label: 'Hiện đại (Sans-Serif)', desc: 'Phông chữ không chân, nét đậm, rõ ràng (Montserrat/Roboto).' },
    { id: 'elegant', label: 'Thanh lịch (Serif)', desc: 'Phông chữ có chân, sang trọng, quý phái (Playfair Display).' },
    { id: 'handwritten', label: 'Chữ viết tay (Script)', desc: 'Nghệ thuật, mềm mại, cá tính (Dancing Script).' },
    { id: 'neon', label: 'Hiệu ứng Neon', desc: 'Chữ phát sáng, màu sắc rực rỡ trên nền tối.' },
    { id: '3d_bold', label: '3D Nổi khối (High-End)', desc: 'Chữ 3D đậm, bóng đổ vật lý thực tế.' },
    { id: 'metallic', label: 'Kim loại (Gold/Silver)', desc: 'Hiệu ứng mạ vàng/bạc, phản chiếu ánh sáng.' },
    { id: 'minimal', label: 'Tối giản (Thin)', desc: 'Nét mảnh, tinh tế, khoảng cách rộng.' }
];

const MODEL_POSES = [
    { id: 'holding', label: 'Cầm sản phẩm (Tay)', desc: 'Tay cầm sản phẩm đưa về phía trước.' },
    { id: 'holding_face', label: 'Cầm cạnh mặt', desc: 'Tạo dáng cầm sản phẩm gần khuôn mặt (Mỹ phẩm).' },
    { id: 'using', label: 'Đang sử dụng', desc: 'Đang thoa kem, đang uống, đang dùng sản phẩm.' },
    { id: 'standing_next', label: 'Đứng cạnh bên', desc: 'Đứng bên cạnh sản phẩm (Sản phẩm lớn/Xe).' },
    { id: 'presenting', label: 'Tay mời/Giới thiệu', desc: 'Hai tay hoặc một tay hướng về sản phẩm.' }
];

const AdCreatorTool: React.FC<AdCreatorToolProps> = ({ tool, onNavigate }) => {
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

    // Inputs
    const [mode, setMode] = useState<CreateMode>('new');
    const [productImage, setProductImage] = useState<string | null>(null);
    const [referenceImage, setReferenceImage] = useState<string | null>(null);
    
    // Model Settings
    const [modelMode, setModelMode] = useState<ModelMode>('none');
    const [uploadedModelImage, setUploadedModelImage] = useState<string | null>(null);
    const [modelGender, setModelGender] = useState('Nữ (Female)');
    const [modelAge, setModelAge] = useState('Trẻ (Young Adult)');
    const [modelPose, setModelPose] = useState(MODEL_POSES[0].id);

    // Config
    const [selectedFormat, setSelectedFormat] = useState<string>(FORMAT_OPTIONS[0].id);
    const [selectedStyle, setSelectedStyle] = useState<string>(STYLE_PRESETS[0]);
    const [selectedLighting, setSelectedLighting] = useState<string>(LIGHTING_OPTIONS[0].id);
    const [selectedComposition, setSelectedComposition] = useState<string>(COMPOSITION_OPTIONS[0].id);
    const [selectedModel, setSelectedModel] = useState<string>(activeModels[0].id);

    useEffect(() => {
        if (!activeModels.some(m => m.id === selectedModel)) {
            setSelectedModel(activeModels[0].id);
        }
    }, [activeModels, selectedModel]);
    
    // Text & Content
    const [textOverlay, setTextOverlay] = useState('');
    const [selectedTextStyle, setSelectedTextStyle] = useState<string>(TEXT_STYLES[0].id);
    const [userPrompt, setUserPrompt] = useState('');
    const [imageQuantity, setImageQuantity] = useState<ImageQuantity>(1);
    
    // Result
    const [resultImages, setResultImages] = useState<string[]>([]);
    const [selectedResultIndex, setSelectedResultIndex] = useState(0);
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [isSuggestingPrompt, setIsSuggestingPrompt] = useState(false);
    const [isExtractingRef, setIsExtractingRef] = useState(false);
    
    // Options
    const [showDownloadOptions, setShowDownloadOptions] = useState(false);

    // History
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    const productInputRef = useRef<HTMLInputElement>(null);
    const referenceInputRef = useRef<HTMLInputElement>(null);
    const modelInputRef = useRef<HTMLInputElement>(null);

    const freshUser = useMemo(() => loggedInUser ? findUserInTree(userState.allUsers, loggedInUser.id) : null, [userState.allUsers, loggedInUser]);
    const currentCredits = freshUser ? freshUser.creditBalance : 0;

    // History Items
    const historyItems = useMemo(() => {
        if (!loggedInUser?.generationHistory) return [];
        return loggedInUser.generationHistory
            .filter(h => h.taskId.startsWith('ad_'))
            .sort((a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime());
    }, [loggedInUser]);

    const totalCost = tool.creditCost * imageQuantity;

    const extractPromptFromImage = async (base64Image: string) => {
        setIsExtractingRef(true);
        try {
            const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
            const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/png';
            const imagePart = { inlineData: { data: base64Image.split(',')[1], mimeType } };

            const systemPrompt = `
            ROLE: Expert Art Director & Photographer.
            TASK: Analyze the provided advertising image and extract an EXTREMELY DETAILED description to recreate its style and vibe.
            
            FOCUS ON THESE ELEMENTS (Be specific):
            1. **Atmosphere & Mood**: (e.g., Luxury, Minimalist, Energetic, Vintage, Dark & Moody).
            2. **Lighting**: (e.g., Soft window light, Hard neon rim light, Golden hour sun, Studio strobe). Mention direction and color of light.
            3. **Color Palette**: List the dominant colors and accent colors (e.g., Pastel Pink & Mint Green, or Black & Gold).
            4. **Background & Environment**: Describe materials (marble, wood, silk), props (flowers, podiums, water ripples), and setting (beach, studio, kitchen).
            5. **Composition**: Camera angle (low, high, top-down), depth of field (bokeh background), and object placement.
            
            OUTPUT:
            A single, dense, descriptive paragraph in VIETNAMESE. Do not use bullet points. Start directly with the description.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash', // Using Flash for fast description
                contents: { parts: [imagePart, { text: systemPrompt }] }
            });

            if (response.text) {
                setUserPrompt(response.text.trim());
                addToast('Đã trích xuất chi tiết từ ảnh mẫu!', 'success');
            } else {
                addToast('Không thể phân tích ảnh mẫu.', 'error');
            }
        } catch (error) {
            console.error("Extraction error:", error);
            addToast('Lỗi khi phân tích ảnh mẫu.', 'error');
        } finally {
            setIsExtractingRef(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'reference' | 'model') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (event) => {
                if (event.target?.result) {
                    const rawRes = event.target.result as string;
                    const processedRes = await ensureSupportedImageFormat(rawRes);
                    if (type === 'product') setProductImage(processedRes);
                    else if (type === 'reference') {
                        setReferenceImage(processedRes);
                        // Auto extract prompt when reference is uploaded
                        extractPromptFromImage(processedRes);
                    }
                    else if (type === 'model') setUploadedModelImage(processedRes);
                }
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleLoadHistoryItem = (item: GenerationResult) => {
        setResultImages(item.images);
        setSelectedResultIndex(0);
        setShowHistoryModal(false);
        addToast('Đã tải kết quả từ lịch sử.', 'success');
    };

    const handleDeleteHistoryItem = (taskId: string) => {
        if (loggedInUser) {
            handleDeleteGenerationResult(loggedInUser.id, taskId);
            addToast('Đã xóa.', 'info');
        }
    };

    const handleDownload = (scale: number = 1) => {
        const currentImage = resultImages[selectedResultIndex];
        if (!currentImage) return;

        if (scale === 1) {
            const link = document.createElement('a');
            link.href = currentImage;
            link.download = `ad_creative_${Date.now()}_${selectedResultIndex + 1}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // Upscale logic
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = currentImage;
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
                    link.download = `ad_creative_${Date.now()}_${scale}x.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    addToast(`Đã tải xuống ảnh kích thước x${scale}`, 'success');
                }
            };
        }
        setShowDownloadOptions(false);
    };

    const handleSuggestPrompt = async () => {
        if (!productImage) {
            addToast('Vui lòng tải ảnh sản phẩm trước để AI phân tích.', 'error');
            return;
        }
        if (isSuggestingPrompt) return;

        setIsSuggestingPrompt(true);
        try {
            const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
            const mimeType = productImage.split(';')[0].split(':')[1] || 'image/png';
            const imagePart = { inlineData: { data: productImage.split(',')[1], mimeType } };

            const systemPrompt = `
            ROLE: World-Class Creative Director.
            TASK: Analyze the product image and generate a HIGH-END advertising concept description (Prompt).
            
            CONTEXT:
            - Style: ${selectedStyle}
            - Lighting: ${LIGHTING_OPTIONS.find(l => l.id === selectedLighting)?.label}
            - Model Included: ${modelMode !== 'none' ? 'YES' : 'NO'}
            
            INSTRUCTION:
            Suggest a scene that elevates the product value. Describe the background materials, props, lighting mood, and color palette.
            If Model is YES, suggest how they interact with the product.
            
            OUTPUT: ONLY the prompt text in VIETNAMESE. Concise, descriptive (under 60 words).
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: { parts: [imagePart, { text: systemPrompt }] }
            });

            if (response.text) {
                setUserPrompt(response.text.trim());
                addToast('AI đã đề xuất ý tưởng bối cảnh chuyên nghiệp!', 'success');
            } else {
                 addToast('AI không trả về nội dung. Vui lòng thử lại.', 'info');
            }
        } catch (error) {
            console.error("Suggestion error:", error);
            addToast('Không thể tạo gợi ý lúc này.', 'error');
        } finally {
            setIsSuggestingPrompt(false);
        }
    };

    const handleGenerate = async () => {
        if (isProcessing || !loggedInUser) return;
        
        // Validation
        if (!productImage) {
            addToast('Vui lòng tải lên ảnh sản phẩm.', 'error');
            return;
        }
        if (mode === 'mimic' && !referenceImage) {
            addToast('Chế độ Bắt chước cần ảnh mẫu (Reference).', 'error');
            return;
        }
        if (modelMode === 'upload' && !uploadedModelImage) {
            addToast('Vui lòng tải lên ảnh người mẫu.', 'error');
            return;
        }

        if (currentCredits < totalCost) {
            addToast(`Không đủ Credit. Cần ${totalCost} Credit.`, 'error');
            return;
        }

        setIsProcessing(true);
        setResultImages([]); // Clear previous
        setSelectedResultIndex(0);
        
        const creditResult = await handleUseToolCredit(loggedInUser.id, { ...tool, creditCost: totalCost });
        if (!creditResult.success) {
            setIsProcessing(false);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
            
            // 1. Product Image Part
            const productMime = productImage.split(';')[0].split(':')[1] || 'image/png';
            const productData = productImage.split(',')[1];
            const productPart = { inlineData: { data: productData, mimeType: productMime } };
            
            const formatInfo = FORMAT_OPTIONS.find(f => f.id === selectedFormat) || FORMAT_OPTIONS[0];
            const textStyleInfo = TEXT_STYLES.find(t => t.id === selectedTextStyle) || TEXT_STYLES[0];
            const lightingInfo = LIGHTING_OPTIONS.find(l => l.id === selectedLighting);
            const compInfo = COMPOSITION_OPTIONS.find(c => c.id === selectedComposition);
            
            const parts = [productPart];
            
            // --- PROMPT CONSTRUCTION ---

            const typographyInstruction = textOverlay 
                ? `
                <TYPOGRAPHY_LAYER>
                CONTENT: "${textOverlay}"
                LANGUAGE: VIETNAMESE (Must render accents perfectly: sắc, huyền, hỏi, ngã, nặng).
                FONT_STYLE: ${textStyleInfo.label}. ${textStyleInfo.desc}.
                PLACEMENT: Integrate text naturally into the ${compInfo?.label} composition using negative space.
                EFFECTS: Apply professional blending. High contrast for readability.
                </TYPOGRAPHY_LAYER>
                ` 
                : "NO TEXT OVERLAY.";

            // Model Instruction
            let modelInstruction = "";
            if (modelMode === 'ai') {
                const poseInfo = MODEL_POSES.find(p => p.id === modelPose);
                modelInstruction = `
                <HUMAN_MODEL>
                GENERATE: A realistic human model.
                ATTRIBUTES: ${modelGender}, ${modelAge}. Professional attire fitting the scene.
                POSE: ${poseInfo?.label} (${poseInfo?.desc}).
                INTERACTION: The model MUST interact with the product (Image 1) realistically.
                HANDS_FIX: Ensure fingers holding the product are anatomically correct (5 fingers, natural grip).
                SKIN: Realistic texture, not plastic. Lighting on face must match the scene.
                </HUMAN_MODEL>
                `;
            } else if (modelMode === 'upload' && uploadedModelImage) {
                const modelMime = uploadedModelImage.split(';')[0].split(':')[1] || 'image/png';
                const modelData = uploadedModelImage.split(',')[1];
                const modelPart = { inlineData: { data: modelData, mimeType: modelMime } };
                parts.push(modelPart); // Add Model as Image 2 (if no reference) or Image 3
                
                modelInstruction = `
                <HUMAN_MODEL>
                SOURCE: Use the provided Model Image (Look for the human face input).
                TASK: Integrate this specific person into the scene.
                POSE: Adapt their pose to interact with the product if possible, or place them naturally next to it.
                RELIGHTING: Re-light the model's face and body to match the ${lightingInfo?.label} of the ad scene.
                </HUMAN_MODEL>
                `;
            }

            let basePrompt = "";

            if (mode === 'new') {
                basePrompt = `
                SYSTEM_ROLE: Senior Art Director & 3D Visualizer.
                TASK: Generate a Award-Winning Product Advertisement.
                
                <INPUT_ANALYSIS>
                PRODUCT: See Image 1. Keep the product identifiable. Improve lighting/texture if needed.
                </INPUT_ANALYSIS>

                <DESIGN_SPECS>
                - FORMAT: ${formatInfo.label} (${formatInfo.ratio}).
                - STYLE: ${selectedStyle}.
                - LIGHTING: ${lightingInfo?.label} - ${lightingInfo?.desc}.
                - COMPOSITION: ${compInfo?.label} - ${compInfo?.desc}.
                </DESIGN_SPECS>

                ${modelInstruction}

                <CREATIVE_BRIEF>
                ${userPrompt || 'Create a high-end, commercially viable scene that highlights the product features.'}
                </CREATIVE_BRIEF>
                
                ${typographyInstruction}

                <EXECUTION_RULES>
                1. PHOTOREALISM: The output must look like a real photo or high-end 3D render.
                2. COLOR HARMONY: Use a color palette that complements the product.
                3. SHADOWS: Generate physically accurate contact shadows.
                4. DEPTH: Use depth of field (bokeh) to focus on the product/model.
                </EXECUTION_RULES>
                `;
            } else {
                // Mimic Mode
                if (referenceImage) {
                    const refMime = referenceImage.split(';')[0].split(':')[1] || 'image/png';
                    const refData = referenceImage.split(',')[1];
                    const refPart = { inlineData: { data: refData, mimeType: refMime } };
                    parts.push(refPart);
                }
                
                basePrompt = `
                SYSTEM_ROLE: Master Graphic Designer & Style Copier.
                TASK: "Design Reconstruction" (Style Transfer + Layout Mimicry).
                
                INPUTS:
                - Image 1: THE PRODUCT.
                - Image Reference: THE STYLE & LAYOUT TARGET.
                ${modelMode === 'upload' ? '- Image Model: THE PERSON to include.' : ''}

                <DECONSTRUCTION_PHASE>
                Analyze the Reference Image deeply (Composition, Lighting, Colors, Graphics).
                </DECONSTRUCTION_PHASE>

                <RECONSTRUCTION_PHASE>
                Create a NEW image using the Product from Image 1, placing it into the "World" of the Reference.
                ${modelInstruction}
                - If User Override Style is "${selectedStyle}", blend that influence in.
                </RECONSTRUCTION_PHASE>
                
                ${typographyInstruction}
                
                <USER_CONTEXT>
                ${userPrompt}
                </USER_CONTEXT>

                GOAL: A seamless, high-end ad that looks like it was designed by the same agency.
                `;
            }

            const generatedImages: string[] = [];

            for (let i = 0; i < imageQuantity; i++) {
                setStatusMessage(`Đang thiết kế ấn phẩm ${i + 1}/${imageQuantity}...`);
                
                // Add variety parameter
                const varietySeed = i > 0 ? `\nVARIATION ${i}: Try a slightly different camera angle or prop arrangement for variety.` : "";

                const response = await ai.models.generateContent({
                    model: selectedModel,
                    contents: { parts: [...parts, { text: basePrompt + varietySeed }] },
                    config: { responseModalities: [Modality.IMAGE] },
                });

                const newImagePart = response.candidates?.[0]?.content?.parts[0];
                if (newImagePart && newImagePart.inlineData?.data) {
                    const resultBase64 = `data:${newImagePart.inlineData.mimeType};base64,${newImagePart.inlineData.data}`;
                    generatedImages.push(resultBase64);
                }
            }

            if (generatedImages.length > 0) {
                setResultImages(generatedImages);
                
                const newResult: GenerationResult = {
                    taskId: `ad_${Date.now()}`,
                    date: new Date().toLocaleDateString('vi-VN'),
                    prompt: `[Ad Creative] ${mode === 'new' ? selectedStyle : `Mimic (${selectedStyle})`} ${modelMode !== 'none' ? '+ Model' : ''}`,
                    images: generatedImages,
                    settings: {
                        aspectRatio: 'custom',
                        customRatio: null,
                        quantity: imageQuantity,
                        generationMode: 'Chất lượng',
                        imageStyle: selectedStyle
                    },
                    cost: totalCost,
                    balanceAfter: freshUser ? freshUser.creditBalance - totalCost : 0,
                    creationTime: new Date().toLocaleTimeString(),
                };
                handleSetGenerationHistory(loggedInUser.id, newResult);
                addToast(`Đã tạo thành công ${generatedImages.length} ấn phẩm!`, 'success');
            } else {
                throw new Error("API không trả về ảnh.");
            }

        } catch (error) {
            console.error("Error:", error);
            addToast('Lỗi tạo ảnh (vui lòng kiểm tra định dạng ảnh). Đã hoàn lại Credit.', 'error');
            const userForRefund = findUserInTree(userState.allUsers, loggedInUser.id);
            if(userForRefund) {
                await handleUseToolCredit(userForRefund.id, { ...tool, creditCost: -totalCost });
            }
        } finally {
            setIsProcessing(false);
            setStatusMessage('');
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-950 text-gray-300">
            {/* History Modal */}
            <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Lịch sử Thiết kế" size="lg" hideFooter>
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
                                    <p className="text-xs text-slate-400 mt-1">{item.date} • {item.images.length} ảnh</p>
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

            <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-30 shadow-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate('Kho Tiện Ích')} className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <ArrowLeftIcon className="h-5 w-5" /> Quay lại
                    </button>
                    <h1 className="text-lg font-bold text-white flex items-center gap-2">
                        <PresentationChartLineIcon className="h-6 w-6 text-indigo-500" />
                        Ad Creative Studio AI
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <CreditBalanceDisplay balance={currentCredits} onAdd={() => onNavigate('Ví Của Tôi')} />
                    <button onClick={() => setShowHistoryModal(true)} className="p-2 text-indigo-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-indigo-900/50"><ClockIcon className="h-5 w-5" /></button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* LEFT PANEL: CONFIGURATION */}
                <aside className="w-96 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
                        
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
                        
                        {/* Mode Switcher */}
                        <div className="bg-slate-800 p-1 rounded-lg flex">
                            <button 
                                onClick={() => setMode('new')}
                                className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${mode === 'new' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                <PlusIcon className="h-3 w-3 inline mr-1"/> Thiết kế Mới
                            </button>
                            <button 
                                onClick={() => setMode('mimic')}
                                className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${mode === 'mimic' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                <Square2StackIcon className="h-3 w-3 inline mr-1"/> Bắt chước Mẫu
                            </button>
                        </div>

                        {/* 1. Product Image (Required) */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase block">1. Ảnh Sản phẩm (Bắt buộc)</label>
                            <div 
                                onClick={() => productInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${productImage ? 'border-green-500 bg-slate-800' : 'border-slate-700 hover:border-indigo-500 hover:bg-slate-800'}`}
                            >
                                {productImage ? (
                                    <img src={productImage} alt="Product" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <div className="text-center">
                                        <ArrowUpTrayIcon className="h-8 w-8 mx-auto mb-2 text-slate-600 group-hover:text-indigo-400" />
                                        <span className="text-xs text-slate-500">Upload Sản phẩm</span>
                                    </div>
                                )}
                                <input type="file" ref={productInputRef} onChange={(e) => handleFileUpload(e, 'product')} className="hidden" accept="image/*" />
                            </div>
                        </div>

                        {/* 2. Reference Image (Mimic Mode Only) */}
                        {mode === 'mimic' && (
                            <div className="space-y-4 animate-fadeIn">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-purple-400 uppercase block">2. Ảnh Mẫu Quảng Cáo</label>
                                    <div 
                                        onClick={() => referenceInputRef.current?.click()}
                                        className={`border-2 border-dashed rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${referenceImage ? 'border-purple-500 bg-slate-800' : 'border-slate-700 hover:border-purple-500 hover:bg-slate-800'}`}
                                    >
                                        {referenceImage ? (
                                            <>
                                                <img src={referenceImage} alt="Reference" className="w-full h-full object-contain p-2" />
                                                {isExtractingRef && (
                                                     <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm z-10">
                                                         <ArrowPathIcon className="h-6 w-6 animate-spin text-purple-400" />
                                                         <span className="text-[10px] text-white mt-1">Đang phân tích...</span>
                                                     </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-center">
                                                <PhotoIcon className="h-8 w-8 mx-auto mb-2 text-slate-600 group-hover:text-purple-400" />
                                                <span className="text-xs text-slate-500">Upload Ảnh Mẫu để AI học</span>
                                            </div>
                                        )}
                                        <input type="file" ref={referenceInputRef} onChange={(e) => handleFileUpload(e, 'reference')} className="hidden" accept="image/*" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Phong cách Thiết kế (Override)</label>
                                    <select 
                                        value={selectedStyle}
                                        onChange={(e) => setSelectedStyle(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-indigo-500"
                                    >
                                        {STYLE_PRESETS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                        
                        {/* 3. Human Model Integration (NEW) */}
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold text-pink-400 uppercase flex items-center gap-2">
                                    <UserIcon className="h-4 w-4"/> 3. Người mẫu (Model)
                                </label>
                                <select 
                                    value={modelMode} 
                                    onChange={(e) => setModelMode(e.target.value as ModelMode)} 
                                    className="bg-slate-800 border border-slate-700 text-[10px] rounded px-2 py-1 text-white"
                                >
                                    <option value="none">Không dùng</option>
                                    <option value="ai">AI Tạo (Mới)</option>
                                    <option value="upload">Tải ảnh lên</option>
                                </select>
                            </div>
                            
                            {modelMode === 'ai' && (
                                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 space-y-2 animate-fadeIn">
                                    <div className="grid grid-cols-2 gap-2">
                                        <select value={modelGender} onChange={e => setModelGender(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white">
                                            <option>Nữ (Female)</option><option>Nam (Male)</option>
                                        </select>
                                        <select value={modelAge} onChange={e => setModelAge(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white">
                                            <option>Trẻ (Young Adult)</option><option>Trung niên (Middle Aged)</option><option>Teenager</option>
                                        </select>
                                    </div>
                                    <select value={modelPose} onChange={e => setModelPose(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white">
                                        {MODEL_POSES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                                    </select>
                                </div>
                            )}
                            
                            {modelMode === 'upload' && (
                                <div 
                                    onClick={() => modelInputRef.current?.click()}
                                    className={`border border-dashed rounded-lg h-24 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800 transition-all animate-fadeIn ${uploadedModelImage ? 'border-pink-500' : 'border-slate-600'}`}
                                >
                                    {uploadedModelImage ? (
                                        <img src={uploadedModelImage} alt="Model" className="w-full h-full object-contain p-1" />
                                    ) : (
                                        <div className="text-center text-slate-500">
                                            <span className="text-[10px]">Upload Ảnh Người mẫu</span>
                                        </div>
                                    )}
                                    <input type="file" ref={modelInputRef} onChange={(e) => handleFileUpload(e, 'model')} className="hidden" accept="image/*" />
                                </div>
                            )}
                        </div>

                        {/* 4. Detailed Settings (New Mode) */}
                        {mode === 'new' && (
                            <div className="space-y-4 animate-fadeIn border-t border-slate-800 pt-4">
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">4. Chi tiết Thiết kế</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Kích thước</label>
                                        <select value={selectedFormat} onChange={(e) => setSelectedFormat(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:ring-indigo-500">
                                            {FORMAT_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Phong cách</label>
                                        <select value={selectedStyle} onChange={(e) => setSelectedStyle(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:ring-indigo-500">
                                            {STYLE_PRESETS.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Ánh sáng</label>
                                        <select value={selectedLighting} onChange={(e) => setSelectedLighting(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:ring-indigo-500">
                                            {LIGHTING_OPTIONS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Bố cục</label>
                                        <select value={selectedComposition} onChange={(e) => setSelectedComposition(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:ring-indigo-500">
                                            {COMPOSITION_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 5. Text & Prompt */}
                        <div className="space-y-4 border-t border-slate-800 pt-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Nội dung chữ (Headline/CTA)</label>
                                <input 
                                    type="text" 
                                    value={textOverlay}
                                    onChange={(e) => setTextOverlay(e.target.value)}
                                    placeholder="VD: Giảm giá 50%, Mua Ngay..." 
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 mb-2"
                                />
                                
                                {/* Typography Style Selection */}
                                {textOverlay && (
                                    <div className="animate-fadeIn">
                                        <label className="text-[10px] font-bold text-indigo-400 uppercase block mb-1 flex items-center gap-1">
                                            <ChatBubbleBottomCenterTextIcon className="h-3 w-3" /> Kiểu chữ & Typography
                                        </label>
                                        <select 
                                            value={selectedTextStyle}
                                            onChange={(e) => setSelectedTextStyle(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-indigo-500"
                                        >
                                            {TEXT_STYLES.map(t => (
                                                <option key={t.id} value={t.id}>{t.label}</option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-slate-500 mt-1 ml-1 italic">
                                            {TEXT_STYLES.find(t => t.id === selectedTextStyle)?.desc}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase block">Gợi ý thêm cho AI (Prompt)</label>
                                    <button 
                                        onClick={handleSuggestPrompt}
                                        disabled={!productImage || isSuggestingPrompt}
                                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <SparklesIcon className={`h-3 w-3 ${isSuggestingPrompt ? 'animate-spin' : ''}`} /> 
                                        {isSuggestingPrompt ? 'Đang suy nghĩ...' : 'AI Gợi ý'}
                                    </button>
                                </div>
                                <textarea 
                                    value={userPrompt}
                                    onChange={(e) => setUserPrompt(e.target.value)}
                                    rows={3}
                                    placeholder="VD: Đặt sản phẩm trên bàn gỗ, ánh sáng nắng sớm, có hoa trang trí..." 
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600"
                                />
                            </div>
                        </div>

                         {/* 6. Quantity Selection */}
                         <div className="space-y-2 border-t border-slate-800 pt-4">
                            <label className="text-xs font-bold text-slate-400 uppercase block">Số lượng ảnh kết quả</label>
                            <div className="grid grid-cols-4 gap-2">
                                {[1, 2, 3, 4].map((num) => (
                                    <button 
                                        key={num}
                                        onClick={() => setImageQuantity(num as ImageQuantity)}
                                        className={`py-2 rounded-lg text-sm font-bold transition-colors border ${imageQuantity === num ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-gray-400 hover:bg-slate-700'}`}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Action Footer */}
                    <div className="p-6 bg-slate-900 border-t border-slate-800 z-10">
                        <div className="flex justify-between items-center mb-4 text-sm">
                            <span className="text-slate-400">Chi phí:</span>
                            <span className="font-bold text-white flex items-center gap-1">
                                <SparklesIcon className="h-4 w-4 text-yellow-400" />
                                {totalCost} Credit
                            </span>
                        </div>
                        <button 
                            onClick={handleGenerate}
                            disabled={isProcessing || !productImage || (mode === 'mimic' && !referenceImage)}
                            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform active:scale-95"
                        >
                            {isProcessing ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <SparklesIcon className="h-5 w-5" />}
                            {isProcessing ? 'Đang thiết kế...' : `Tạo ${imageQuantity} Ấn Phẩm`}
                        </button>
                    </div>
                </aside>

                {/* RIGHT PANEL: PREVIEW */}
                <main className="flex-1 bg-slate-950 p-6 flex flex-col items-center justify-center relative">
                    {/* Grid Background */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none" 
                        style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                    </div>

                    {resultImages.length === 0 ? (
                        <div className="text-center space-y-4 opacity-40 z-10">
                            <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-slate-700">
                                <PresentationChartLineIcon className="h-10 w-10 text-slate-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-400">Studio Trống</h3>
                                <p className="text-slate-600 mt-1">Điền thông tin bên trái và nhấn "Tạo Ấn Phẩm".</p>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl w-full h-full flex flex-col gap-4 z-10 animate-fadeIn">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
                                    <CheckCircleIcon className="h-5 w-5" /> Kết quả ({resultImages.length})
                                </h3>
                                <div className="relative">
                                    <button onClick={() => setShowDownloadOptions(!showDownloadOptions)} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 shadow-lg transition-colors">
                                        <DocumentArrowDownIcon className="h-4 w-4" /> Tải xuống <ChevronUpIcon className={`h-3 w-3 transition-transform ${showDownloadOptions ? 'rotate-180' : ''}`} />
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
                            
                            <div className="flex-1 bg-[#1e1e1e] rounded-2xl border border-slate-800 p-4 flex flex-col items-center justify-center shadow-2xl overflow-hidden relative group">
                                <div className="flex-1 flex items-center justify-center w-full h-full overflow-hidden">
                                     <img src={resultImages[selectedResultIndex]} alt="Ad Result" className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
                                </div>
                                
                                {/* Thumbnails for Multi-Image */}
                                {resultImages.length > 1 && (
                                    <div className="mt-4 flex gap-2 overflow-x-auto pb-2 w-full justify-center">
                                        {resultImages.map((img, idx) => (
                                            <button 
                                                key={idx} 
                                                onClick={() => setSelectedResultIndex(idx)}
                                                className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${selectedResultIndex === idx ? 'border-indigo-500 scale-105' : 'border-slate-700 hover:border-slate-500'}`}
                                            >
                                                <img src={img} className="w-full h-full object-cover" alt={`Thumbnail ${idx}`} />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {isProcessing && (
                         <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center animate-fadeIn">
                             <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                             <p className="text-white font-bold text-lg">{statusMessage}</p>
                             <p className="text-indigo-300 text-sm mt-1">AI đang vẽ bố cục & xử lý ánh sáng...</p>
                         </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AdCreatorTool;
