
import { GoogleGenAI, Modality } from '@google/genai';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useActions } from '../../features/actions/useActions';
import { useAuth } from '../../features/auth/useAuth';
import { GenerationResult } from '../../features/users/types';
import { useUser } from '../../features/users/useUser';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  BoltIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  CpuChipIcon,
  CubeIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  PaintBrushIcon,
  SparklesIcon,
  SwatchIcon,
  TableCellsIcon,
  TrashIcon,
  XCircleIcon,
} from '../Icons';
import { IntegrationTool, IntegrationType } from '../../features/settings/types';
import { useToast } from '../../components/ToastProvider';
import { useSettings } from '../../features/settings/useSettings';
import { ALL_GEMINI_MODELS } from '../../constants';
import { findUserInTree } from '../../services/userService';
import Modal from '../../components/Modal';
import { ensureSupportedImageFormat } from '../../utils/imageProcessing';
import CreditBalanceDisplay from './CreditBalanceDisplay';

interface MenuDesignerToolProps {
  tool: IntegrationTool;
  onNavigate: (page: string) => void;
}

const MENU_LAYOUTS = [
  { id: 'single_page_classic', name: '1 Cột Cổ điển', desc: 'Danh sách thẳng hàng, dễ đọc.' },
  { id: 'two_column_modern', name: '2 Cột Hiện đại', desc: 'Tối ưu không gian, kèm hình ảnh.' },
  { id: 'grid_gallery', name: 'Lưới Hình ảnh', desc: 'Tập trung vào hình ảnh món ăn.' },
  { id: 'minimalist_clean', name: 'Tối giản', desc: 'Tinh tế, sang trọng.' },
  { id: 'trifold_brochure', name: 'Gấp 3 (Brochure)', desc: 'Phong cách tờ rơi cầm tay.' },
  { id: 'chalkboard_bistro', name: 'Bảng đen Bistro', desc: 'Phong cách vẽ tay phấn trắng.' }
];

const COLOR_THEMES = [
  { id: 'luxury_gold_black', name: 'Sang trọng (Vàng & Đen)', hex: '#FFD700' },
  { id: 'fresh_organic', name: 'Tươi mới (Xanh lá)', hex: '#4CAF50' },
  { id: 'warm_appetizing', name: 'Kích thích (Đỏ & Cam)', hex: '#FF5722' },
  { id: 'ocean_blue', name: 'Thanh mát (Xanh dương)', hex: '#2196F3' },
  { id: 'pastel_sweet', name: 'Ngọt ngào (Pastel Pink)', hex: '#F06292' },
  { id: 'coffee_vintage', name: 'Hoài cổ (Nâu & Be)', hex: '#795548' },
];

const ARTISTIC_STYLES = [
  { id: 'hyper_realistic', name: 'Ảnh chụp siêu thực (8K)' },
  { id: 'watercolor_art', name: 'Tranh vẽ màu nước' },
  { id: 'chalkboard', name: 'Bảng phấn (Chalkboard)' },
  { id: 'vector_flat', name: 'Đồ họa phẳng (Flat Vector)' },
  { id: 'oil_painting', name: 'Sơn dầu cổ điển' },
  { id: 'sketch_pencil', name: 'Phác thảo bút chì' }
];

const MenuDesignerTool: React.FC<MenuDesignerToolProps> = ({ tool, onNavigate }) => {
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

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [menuContent, setMenuContent] = useState('');

  // Configuration
    const [selectedModel, setSelectedModel] = useState<string>(activeModels[0].id);

    useEffect(() => {
        if (!activeModels.some(m => m.id === selectedModel)) {
            setSelectedModel(activeModels[0].id);
        }
    }, [activeModels, selectedModel]);
  const [selectedLayout, setSelectedLayout] = useState(MENU_LAYOUTS[0].id);
  const [selectedColorTheme, setSelectedColorTheme] = useState(COLOR_THEMES[0].id);
  const [selectedArtStyle, setSelectedArtStyle] = useState(ARTISTIC_STYLES[0].id);

  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const freshUser = useMemo(
    () => (loggedInUser ? findUserInTree(userState.allUsers, loggedInUser.id) : null),
    [userState.allUsers, loggedInUser]
  );
  const currentCredits = freshUser ? freshUser.creditBalance : 0;
  const isProModel = selectedModel === 'gemini-3-pro-image-preview';

  const currentModelCost = useMemo(() => {
    if (tool.modelPricing && tool.modelPricing[selectedModel] !== undefined) {
      return tool.modelPricing[selectedModel];
    }
    return tool.creditCost;
  }, [tool, selectedModel]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const res = await ensureSupportedImageFormat(event.target.result as string);
          setUploadedImage(res);
          scanMenuContent(res);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const scanMenuContent = async (imageSrc: string) => {
    setIsScanning(true);
    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
      const mimeType = imageSrc.split(';')[0].split(':')[1] || 'image/png';
      const imagePart = { inlineData: { data: imageSrc.split(',')[1], mimeType } };
      const prompt = "Trích xuất toàn bộ danh sách món ăn và giá từ ảnh này. Sắp xếp theo danh mục (Khai vị, Món chính, Đồ uống...). Trả về văn bản thuần túy.";

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
      });

      if (response.text) {
        setMenuContent(response.text.trim());
        addToast('Đã nhận diện nội dung thực đơn!', 'success');
      }
    } catch (error) {
      console.error('Scan error:', error);
      addToast('Lỗi nhận diện văn bản.', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectApiKey = async () => {
    try {
      await (window as any).aistudio.openSelectKey();
      setShowApiKeyModal(false);
      handleGenerate(true);
    } catch (error) {
      console.error('Error opening key selector:', error);
      addToast('Không thể mở hộp thoại chọn API Key.', 'error');
    }
  };

  const handleGenerate = async (bypassKeyCheck = false) => {
    if (isGenerating || !loggedInUser) return;
    if (!menuContent.trim()) {
      addToast('Vui lòng nhập nội dung thực đơn.', 'error');
      return;
    }

    if (isProModel && !bypassKeyCheck) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        setShowApiKeyModal(true);
        return;
      }
    }

    const cost = currentModelCost;
    if (currentCredits < cost) {
      addToast(`Không đủ Credit. Cần ${cost} Credit.`, 'error');
      return;
    }

    setIsGenerating(true);
    const creditResult = await handleUseToolCredit(loggedInUser.id, { ...tool, creditCost: cost });
    if (!creditResult.success) {
      setIsGenerating(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
      const layoutName = MENU_LAYOUTS.find((l) => l.id === selectedLayout)?.name;
      const themeName = COLOR_THEMES.find((c) => c.id === selectedColorTheme)?.name;
      const styleName = ARTISTIC_STYLES.find((s) => s.id === selectedArtStyle)?.name;

      const systemPrompt = `
            ROLE: Senior Professional Menu Designer.
            TASK: Create a stunning, production-ready menu design.
            LAYOUT: ${layoutName}.
            ART STYLE: ${styleName}.
            COLOR THEME: ${themeName}.
            CONTENT TO INCLUDE: 
            ${menuContent}

            REQUIREMENTS:
            1. All text must be perfectly legible with professional typography.
            2. High contrast between text and background.
            3. Use decorative elements related to the theme.
            4. If layout involves images, generate appetizing illustrations for the items.
            5. Output must be photorealistic, 8k resolution.
            `;

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: { parts: [{ text: systemPrompt }] },
        config: { responseModalities: [Modality.IMAGE] },
      });

      const newImagePart = response.candidates?.[0]?.content?.parts[0];
      if (newImagePart && newImagePart.inlineData?.data) {
        const resultBase64 = `data:${newImagePart.inlineData.mimeType};base64,${newImagePart.inlineData.data}`;
        setResultImage(resultBase64);

        const newResult: GenerationResult = {
          taskId: `menu_${Date.now()}`,
          date: new Date().toLocaleDateString('vi-VN'),
          prompt: `[Menu] ${layoutName} - ${styleName}`,
          images: [resultBase64],
          settings: { aspectRatio: 'custom', quantity: 1, generationMode: 'Chất lượng', customRatio: null, imageStyle: styleName },
          cost,
          balanceAfter: freshUser ? freshUser.creditBalance - cost : 0,
          creationTime: new Date().toLocaleTimeString(),
        };
        handleSetGenerationHistory(loggedInUser.id, newResult);
        addToast('Thiết kế menu hoàn tất!', 'success');
      }
    } catch (error: any) {
      console.error('Error:', error);
      if (error.message?.includes("Requested entity was not found")) {
        addToast('Dữ liệu API không tồn tại. Vui lòng chọn lại API Key.', 'error');
        setShowApiKeyModal(true);
      } else {
        addToast('Lỗi xử lý. Đã hoàn tiền.', 'error');
      }
      const userForRefund = findUserInTree(userState.allUsers, loggedInUser.id);
      if (userForRefund)
        await handleUseToolCredit(userForRefund.id, { ...tool, creditCost: -currentModelCost });
    } finally {
      setIsGenerating(false);
    }
  };

  // Force dark colors for inputs to match system
  const inputClasses = "w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none shadow-sm transition-all";
  const selectClasses = "w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 appearance-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none shadow-sm cursor-pointer transition-all";

  return (
    <div className="h-full flex flex-col bg-[#0f172a] text-slate-300 font-sans">
      <header className="h-16 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-30 shadow-md">
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('Kho Tiện Ích')} className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-indigo-400 p-2 rounded-lg hover:bg-slate-800 transition-colors">
            <ArrowLeftIcon className="h-5 w-5" /> Quay lại
          </button>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-indigo-500" />
            Menu Designer AI Pro
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <CreditBalanceDisplay balance={currentCredits} onAdd={() => onNavigate('Ví Của Tôi')} />
          <button onClick={() => setShowHistoryModal(true)} className="p-2 text-slate-400 hover:text-indigo-400 bg-slate-800 rounded-lg border border-slate-700 transition-all"><ClockIcon className="h-5 w-5" /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-96 bg-[#0f172a] border-r border-slate-800 flex flex-col overflow-hidden shadow-xl z-10">
          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-slate-700">
            
            {/* MODEL SELECTOR */}
            <div className={`p-5 rounded-2xl border-2 transition-all ${isProModel ? 'bg-amber-900/10 border-amber-500/30' : 'bg-indigo-900/10 border-indigo-500/30'}`}>
                <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-3 ${isProModel ? 'text-amber-400' : 'text-indigo-400'}`}>
                    <BoltIcon className="h-3 w-3" /> AI ENGINE CORE
                </label>
                <div className="relative">
                    <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className={selectClasses}>
                        {activeModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <DocumentTextIcon className="h-4 w-4" /> 1. NỘI DUNG THỰC ĐƠN
              </label>
              
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl h-24 flex flex-col items-center justify-center cursor-pointer transition-all ${uploadedImage ? 'border-green-500 bg-green-900/10' : 'border-slate-700 hover:border-indigo-500 hover:bg-indigo-900/10'}`}
              >
                {isScanning ? <ArrowPathIcon className="h-6 w-6 animate-spin text-indigo-500" /> : uploadedImage ? <CheckCircleIcon className="h-6 w-6 text-green-500" /> : <ArrowUpTrayIcon className="h-6 w-6 text-slate-500" />}
                <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-tighter">{isScanning ? 'Đang phân tích...' : 'Scan từ ảnh thực đơn cũ'}</p>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
              </div>

              <textarea 
                value={menuContent} 
                onChange={(e) => setMenuContent(e.target.value)} 
                rows={6} 
                className={`${inputClasses} resize-none`}
                placeholder="Nhập tên món và giá (VD: Phở Bò - 50k)..." 
              />
            </div>

            <div className="space-y-6 pt-4 border-t border-slate-800">
               <label className="text-xs font-black text-slate-500 uppercase tracking-widest">2. CẤU HÌNH THẨM MỸ</label>
               
               <div className="space-y-4">
                 <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Bố cục (Layout)</span>
                    <div className="relative">
                        <select value={selectedLayout} onChange={e => setSelectedLayout(e.target.value)} className={selectClasses}>
                            {MENU_LAYOUTS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                        <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
                    </div>
                 </div>

                 <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Phong cách nghệ thuật</span>
                    <div className="relative">
                        <select value={selectedArtStyle} onChange={e => setSelectedArtStyle(e.target.value)} className={selectClasses}>
                            {ARTISTIC_STYLES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Tông màu chủ đạo</span>
                    <div className="grid grid-cols-3 gap-2">
                        {COLOR_THEMES.map(c => (
                            <button 
                                key={c.id} 
                                onClick={() => setSelectedColorTheme(c.id)} 
                                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${selectedColorTheme === c.id ? 'border-indigo-500 bg-indigo-900/30 ring-1 ring-indigo-500' : 'border-slate-700 bg-slate-800 hover:border-indigo-500/50'}`}
                            >
                                <div className="w-5 h-5 rounded-full shadow-inner border border-black/10" style={{backgroundColor: c.hex}}></div>
                                <span className="text-[9px] font-bold text-slate-400 truncate w-full text-center uppercase">{c.name.split(' (')[0]}</span>
                            </button>
                        ))}
                    </div>
                 </div>
               </div>
            </div>
          </div>

          <div className="p-6 bg-[#0f172a] border-t border-slate-800">
            <div className="flex justify-between items-center mb-4 text-xs">
              <span className="text-slate-500 font-bold uppercase tracking-widest">Phí thiết kế:</span>
              <span className="font-black text-indigo-400 flex items-center gap-1 transition-all transform scale-110">
                <SparklesIcon className="h-4 w-4 text-yellow-500" /> {currentModelCost} P
              </span>
            </div>
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating || !menuContent.trim()}
              className="w-full py-4 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              {isGenerating ? <ArrowPathIcon className="h-5 w-5 animate-spin mx-auto" /> : 'BẮT ĐẦU THIẾT KẾ'}
            </button>
          </div>
        </aside>

        <main className="flex-1 bg-black p-8 flex items-center justify-center relative overflow-auto">
          {resultImage ? (
            <div className="w-full h-full max-w-4xl flex flex-col gap-6 animate-fadeIn">
               <div className="flex justify-between items-center bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-black uppercase tracking-widest text-green-400">Thiết kế hoàn tất</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setResultImage(null)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold uppercase transition-colors border border-slate-700">Làm lại</button>
                    <button onClick={() => {const link = document.createElement('a'); link.href = resultImage; link.download = `menu_${Date.now()}.png`; link.click();}} className="px-6 py-2.5 bg-green-600 hover:bg-green-700 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all transform hover:scale-105">Tải xuống</button>
                  </div>
               </div>
               <div className="flex-1 bg-slate-900 p-2 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex items-center justify-center">
                    <img src={resultImage} className="max-w-full max-h-[75vh] object-contain rounded-lg" alt="Result" />
               </div>
            </div>
          ) : (
            <div className="text-center space-y-4 opacity-20 transform hover:scale-105 transition-transform duration-1000">
              <TableCellsIcon className="h-32 w-32 mx-auto text-slate-500" />
              <div className="space-y-1">
                <h3 className="text-2xl font-black uppercase tracking-widest text-slate-400">Studio Thiết Kế</h3>
                <p className="text-sm font-medium">Hoàn tất cấu hình bên trái để bắt đầu thiết kế</p>
              </div>
            </div>
          )}
          {isGenerating && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fadeIn">
               <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
               <p className="text-white font-black uppercase tracking-[0.3em] text-lg animate-pulse">AI is Designing...</p>
               <p className="text-xs text-slate-500 mt-2 italic">Quá trình này có thể mất 30-60 giây</p>
            </div>
          )}
        </main>
      </div>

      <Modal isOpen={showApiKeyModal} onClose={() => setShowApiKeyModal(false)} title="Xác thực Premium" confirmText="Chọn API Key" onConfirm={handleSelectApiKey}>
          <p className="text-sm text-slate-400 leading-relaxed">Mô hình <strong className="text-indigo-400">Gemini 3 Pro</strong> yêu cầu sử dụng API Key cá nhân từ dự án có trả phí của bạn để đảm bảo băng thông và chất lượng cao nhất.
          Để biết thêm thông tin, vui lòng xem <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">tài liệu thanh toán</a>.</p>
      </Modal>
    </div>
  );
};

export default MenuDesignerTool;
