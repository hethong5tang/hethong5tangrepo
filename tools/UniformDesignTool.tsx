
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { 
    ArrowLeftIcon, SparklesIcon, DocumentArrowDownIcon, 
    PhotoIcon, CheckCircleIcon, TrashIcon, ArrowPathIcon, 
    BriefcaseIcon, ClockIcon, PlusIcon,
    ChevronUpIcon, MagnifyingGlassIcon,
    ArrowUpTrayIcon, ShoppingBagIcon
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
import { ensureSupportedImageFormat } from '../../utils/imageProcessing';
import { ColorPickerCircle } from './video-editor/VideoEditorUI';

// Data definitions for Uniforms
const UNIFORM_CATEGORIES = [
    { 
        id: 'corporate', 
        name: 'Doanh nghiệp (Corporate)', 
        items: [
            { id: 'polo', name: 'Áo Polo đồng phục' },
            { id: 'shirt', name: 'Áo Sơ mi văn phòng' },
            { id: 'vest', name: 'Áo Vest / Blazer' },
            { id: 'tshirt', name: 'Áo Thun sự kiện' }
        ]
    },
    { 
        id: 'hospitality', 
        name: 'Nhà hàng / Khách sạn', 
        items: [
            { id: 'chef_coat', name: 'Áo Bếp (Chef Coat)' },
            { id: 'apron', name: 'Tạp dề (Apron)' },
            { id: 'waistcoat', name: 'Gile phục vụ' },
            { id: 'housekeeping', name: 'Đồ buồng phòng' }
        ]
    },
    { 
        id: 'medical', 
        name: 'Y tế / Spa', 
        items: [
            { id: 'scrubs', name: 'Bộ Scrubs (Phẫu thuật)' },
            { id: 'lab_coat', name: 'Áo Blouse trắng' },
            { id: 'spa_tunic', name: 'Váy / Bộ Spa' }
        ]
    },
    { 
        id: 'industrial', 
        name: 'Bảo hộ lao động', 
        items: [
            { id: 'coverall', name: 'Đồ bảo hộ liền thân (Coverall)' },
            { id: 'work_jacket', name: 'Áo khoác kỹ thuật' },
            { id: 'high_vis', name: 'Áo phản quang' }
        ]
    },
    { 
        id: 'school', 
        name: 'Học đường', 
        items: [
            { id: 'school_shirt', name: 'Sơ mi trắng học sinh' },
            { id: 'pe_kit', name: 'Đồ thể dục' },
            { id: 'graduation', name: 'Áo cử nhân' }
        ]
    },
    { 
        id: 'sports', 
        name: 'Thể thao', 
        items: [
            { id: 'soccer', name: 'Áo bóng đá' },
            { id: 'basketball', name: 'Áo bóng rổ' },
            { id: 'esports', name: 'Áo đấu Esports' }
        ]
    }
];

const FABRICS = [
    { id: 'cotton', name: 'Cotton (Mềm, lì)' },
    { id: 'pique', name: 'Vải Cá sấu (Pique - Polo)' },
    { id: 'polyester', name: 'Polyester (Bóng nhẹ, thể thao)' },
    { id: 'silk', name: 'Lụa / Satin (Bóng)' },
    { id: 'denim', name: 'Denim / Jeans' },
    { id: 'linen', name: 'Linen (Đũi - Nhăn nhẹ)' },
    { id: 'khaki', name: 'Kaki (Dày, đứng form)' },
    { id: 'waterproof', name: 'Vải dù / Chống nước' }
];

interface UniformDesignToolProps {
    tool: IntegrationTool;
    onNavigate: (page: string) => void;
}

const UniformDesignTool: React.FC<UniformDesignToolProps> = ({ tool, onNavigate }) => {
    const { loggedInUser } = useAuth();
    const { userState } = useUser();
    const { handleUseToolCredit, handleSetGenerationHistory, handleDeleteGenerationResult } = useActions();
    const { addToast } = useToast();

    // State
    const [categoryId, setCategoryId] = useState<string>(UNIFORM_CATEGORIES[0].id);
    const [itemId, setItemId] = useState<string>(UNIFORM_CATEGORIES[0].items[0].id);
    
    const [primaryColor, setPrimaryColor] = useState('#1e3a8a'); // Default Navy
    const [secondaryColor, setSecondaryColor] = useState('#ffffff'); // Default White
    const [fabric, setFabric] = useState(FABRICS[0].id);
    
    const [logoImage, setLogoImage] = useState<string | null>(null);
    const [designNotes, setDesignNotes] = useState('');
    
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showDownloadOptions, setShowDownloadOptions] = useState(false);

    const logoInputRef = useRef<HTMLInputElement>(null);

    const freshUser = useMemo(() => loggedInUser ? findUserInTree(userState.allUsers, loggedInUser.id) : null, [userState.allUsers, loggedInUser]);
    const currentCredits = freshUser ? freshUser.creditBalance : 0;
    
    // Derived State
    const currentCategory = UNIFORM_CATEGORIES.find(c => c.id === categoryId);
    const currentItems = currentCategory?.items || [];
    const currentItemName = currentItems.find(i => i.id === itemId)?.name || itemId;

    // History Items
    const historyItems = useMemo(() => {
        if (!loggedInUser?.generationHistory) return [];
        return loggedInUser.generationHistory
            .filter(h => h.taskId.startsWith('uniform_'))
            .sort((a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime());
    }, [loggedInUser]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (event) => {
                if (event.target?.result) {
                    const res = await ensureSupportedImageFormat(event.target.result as string);
                    setLogoImage(res);
                }
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (isProcessing || !loggedInUser) return;

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
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const inputParts: any[] = [];
            
            if (logoImage) {
                const mimeType = logoImage.split(';')[0].split(':')[1];
                const data = logoImage.split(',')[1];
                inputParts.push({ inlineData: { data, mimeType } });
            }

            const designInstruction = currentItemName;
            const fabricTexture = FABRICS.find(f => f.id === fabric)?.name || 'Standard Fabric';
            const colorInstruction = `Primary Color: ${primaryColor} (Hex), Secondary/Accent Color: ${secondaryColor} (Hex)`;

            const logoInstruction = logoImage 
                ? "LOGO INSTRUCTION: Place the provided logo image on the left chest (for shirts/jackets) or center (for aprons). Apply realistic displacement mapping so it follows the fabric wrinkles."
                : "NO LOGO provided. Keep the chest area clean.";

            const systemPrompt = `
            ROLE: Professional 3D Fashion Designer & Technical Illustrator.
            TASK: Generate a high-fidelity 3D Product Mockup of a uniform.
            
            VISUAL STYLE:
            - **GHOST MANNEQUIN / INVISIBLE MODEL**: Display the garment as a 3D form but without a human model visible. Clean, professional product photography style.
            - **STRICT FRONT VIEW ONLY**: Generate a single image showing ONLY the FRONT. Absolute prohibition on back views or multiple angles.
            - **FILL THE FRAME (90% COVERAGE)**: The garment must occupy 85-90% of the image canvas. Zoom in tightly.
            - **NO WHITE SPACE**: The item should extend close to the top, bottom, and side edges. Minimal padding.
            - **BACKGROUND**: Pure white or very light grey studio background.
            - **LIGHTING**: Soft, even studio lighting to show fabric texture details.

            PRODUCT SPECIFICATIONS:
            - **Item**: ${designInstruction}
            - **Context**: Uniform for "${currentCategory?.name}".
            - **Material**: ${fabricTexture} (Ensure texture is visible).
            - **Colors**: ${colorInstruction} -> IMPORTANT: Apply the secondary color strictly to collars, cuffs, piping, or buttons to create contrast.
            - **User Notes**: ${designNotes}
            
            ${logoInstruction}

            EXECUTION DETAILS:
            - If it's a Polo shirt, make the collar and sleeve hems the secondary color.
            - Ensure details like buttons, pockets, and stitching are visible.
            - Output should look like a premium e-commerce product listing.
            `;
            
            inputParts.push({ text: systemPrompt });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: inputParts },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const newImagePart = response.candidates?.[0]?.content?.parts[0];
            if (newImagePart && newImagePart.inlineData?.data) {
                const resultBase64 = `data:${newImagePart.inlineData.mimeType};base64,${newImagePart.inlineData.data}`;
                setResultImage(resultBase64);
                
                const newResult: GenerationResult = {
                    taskId: `uniform_${Date.now()}`,
                    date: new Date().toLocaleDateString('vi-VN'),
                    prompt: `[Uniform] ${currentItemName} - ${currentCategory?.name}`,
                    images: [resultBase64],
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
                addToast('Thiết kế thành công!', 'success');
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
    
    const handleDownload = () => {
        if (!resultImage) return;
        const link = document.createElement('a');
        link.href = resultImage;
        link.download = `uniform_design_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleLoadHistory = (item: GenerationResult) => {
        setResultImage(item.images[0]);
        setShowHistoryModal(false);
        addToast('Đã tải thiết kế.', 'success');
    };
    
    const handleDeleteHistoryItem = (taskId: string) => {
        if (loggedInUser) {
            handleDeleteGenerationResult(loggedInUser.id, taskId);
            addToast('Đã xóa.', 'info');
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#0f172a] text-gray-300 font-sans">
             {/* History Modal */}
             <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Lịch sử Thiết kế Đồng phục" size="lg" hideFooter>
                <div className="max-h-[60vh] overflow-y-auto p-1 space-y-3">
                    {historyItems.length === 0 ? <p className="text-center text-slate-500 py-8">Chưa có lịch sử.</p> : historyItems.map(item => (
                        <div key={item.taskId} className="flex items-center gap-4 p-3 bg-slate-800 border border-slate-700 rounded-xl hover:border-indigo-500 transition-colors">
                            <img src={item.images[0]} className="h-16 w-16 object-cover rounded-lg bg-black" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{item.prompt}</p>
                                <p className="text-xs text-slate-400 mt-1">{item.date}</p>
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
                    <button onClick={() => onNavigate('Kho Tiện Ích')} className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors">
                        <ArrowLeftIcon className="h-5 w-5" /> Quay lại
                    </button>
                    <h1 className="text-lg font-bold text-white flex items-center gap-2">
                        <BriefcaseIcon className="h-5 w-5 text-indigo-500" />
                        Thiết Kế Đồng Phục
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <CreditBalanceDisplay balance={currentCredits} onAdd={() => onNavigate('Ví Của Tôi')} />
                    <button onClick={() => setShowHistoryModal(true)} className="p-2 text-indigo-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-indigo-900/50"><ClockIcon className="h-5 w-5" /></button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* LEFT: CONTROLS */}
                <aside className="w-96 bg-slate-900 border-r border-slate-800 flex flex-col overflow-y-auto p-6 space-y-6">
                    
                    {/* 1. Category */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">1. Loại Đồng phục</label>
                        <select 
                            value={categoryId} 
                            onChange={(e) => {
                                setCategoryId(e.target.value);
                                const newCat = UNIFORM_CATEGORIES.find(c => c.id === e.target.value);
                                if (newCat && newCat.items.length > 0) setItemId(newCat.items[0].id);
                            }}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mb-3"
                        >
                            {UNIFORM_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        
                        <div className="grid grid-cols-2 gap-2">
                             {currentItems.map(item => (
                                 <button
                                     key={item.id}
                                     onClick={() => setItemId(item.id)}
                                     className={`px-2 py-2 text-xs font-medium rounded-lg text-left truncate transition-all ${itemId === item.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-gray-400 hover:bg-slate-700'}`}
                                 >
                                     {item.name}
                                 </button>
                             ))}
                        </div>
                    </div>

                    {/* 2. Style Details */}
                    <div className="space-y-4 pt-4 border-t border-slate-800">
                        <label className="text-xs font-bold text-slate-400 uppercase block">2. Chi tiết & Màu sắc</label>
                        
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-slate-500">Màu chính</label>
                                <div className="flex items-center gap-2">
                                    <ColorPickerCircle color={primaryColor} onChange={setPrimaryColor} />
                                    <span className="text-xs font-mono text-slate-400">{primaryColor}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-slate-500">Màu phối (Cổ/Viền)</label>
                                <div className="flex items-center gap-2">
                                    <ColorPickerCircle color={secondaryColor} onChange={setSecondaryColor} />
                                    <span className="text-xs font-mono text-slate-400">{secondaryColor}</span>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Chất liệu vải</label>
                                <select value={fabric} onChange={e => setFabric(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white">
                                    {FABRICS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    {/* 3. Logo Upload */}
                    <div className="space-y-2 pt-4 border-t border-slate-800">
                         <label className="text-xs font-bold text-slate-400 uppercase block">3. Logo Thương hiệu (Tùy chọn)</label>
                         <div 
                            onClick={() => logoInputRef.current?.click()}
                            className={`h-24 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${logoImage ? 'border-indigo-500 bg-slate-800' : 'border-slate-700 hover:border-indigo-500 hover:bg-slate-800'}`}
                        >
                            {logoImage ? (
                                <img src={logoImage} alt="Logo" className="h-full object-contain p-2" />
                            ) : (
                                <div className="text-center">
                                    <PlusIcon className="h-6 w-6 mx-auto mb-1 text-slate-500" />
                                    <span className="text-xs text-slate-500">Tải logo (PNG trong suốt)</span>
                                </div>
                            )}
                             {logoImage && <button onClick={(e) => { e.stopPropagation(); setLogoImage(null); }} className="absolute top-1 right-1 bg-red-600 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="h-3 w-3"/></button>}
                            <input type="file" ref={logoInputRef} onChange={handleFileUpload} className="hidden" accept="image/png" />
                        </div>
                    </div>

                    {/* 4. Notes */}
                    <div className="pt-4 border-t border-slate-800">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">4. Ghi chú thêm</label>
                        <textarea 
                            value={designNotes} 
                            onChange={e => setDesignNotes(e.target.value)} 
                            rows={3} 
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                            placeholder="VD: Cổ tim, tay bo chun, túi ngực bên trái..."
                        />
                    </div>

                    {/* Action */}
                    <div className="mt-auto pt-6 border-t border-slate-800">
                        <div className="flex justify-between items-center mb-3 text-xs">
                            <span className="text-slate-400">Chi phí:</span>
                            <span className="font-bold text-white flex items-center gap-1"><SparklesIcon className="h-3 w-3 text-yellow-400"/> {tool.creditCost} Credit</span>
                        </div>
                        <button 
                            onClick={handleGenerate}
                            disabled={isProcessing}
                            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform active:scale-95"
                        >
                            {isProcessing ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <ShoppingBagIcon className="h-5 w-5" />}
                            {isProcessing ? 'Đang thiết kế...' : 'Tạo Mẫu Ngay'}
                        </button>
                    </div>
                </aside>

                {/* RIGHT: PREVIEW */}
                <main className="flex-1 bg-black p-8 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                    
                    {resultImage ? (
                        <div className="w-full h-full max-w-4xl flex flex-col gap-4 animate-fadeIn z-10">
                            <div className="flex justify-between items-center bg-slate-900/80 backdrop-blur-md p-3 rounded-xl border border-slate-800">
                                <h3 className="text-lg font-bold text-green-400 flex items-center gap-2"><CheckCircleIcon className="h-5 w-5" /> Hoàn tất</h3>
                                <div className="relative">
                                    <button onClick={() => setShowDownloadOptions(!showDownloadOptions)} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 shadow-lg">
                                        <DocumentArrowDownIcon className="h-4 w-4" /> Tải xuống <ChevronUpIcon className={`h-3 w-3 transition-transform ${showDownloadOptions ? 'rotate-180' : ''}`} />
                                    </button>
                                     {showDownloadOptions && (
                                        <div className="absolute top-full right-0 mt-2 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-fadeIn z-20">
                                            <button onClick={handleDownload} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors">Tải ảnh gốc</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex-1 bg-black/40 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden shadow-2xl relative group">
                                <img src={resultImage} alt="Result" className="max-w-full max-h-[80vh] object-contain rounded-lg" />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center opacity-30 z-10">
                            <BriefcaseIcon className="h-24 w-24 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-slate-400">Studio Đồng Phục</h3>
                            <p className="text-slate-500 mt-2">Chọn loại đồng phục và nhấn "Tạo Mẫu Ngay".</p>
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

export default UniformDesignTool;
