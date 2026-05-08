
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
    ArrowLeftIcon, PlayIcon, PauseIcon, ScissorsIcon, 
    FilmIcon, MusicalNoteIcon, DocumentArrowDownIcon, 
    AdjustmentsHorizontalIcon, PlusIcon, TrashIcon,
    SwatchIcon, ClockIcon, SpeakerWaveIcon, ArrowPathIcon,
    SparklesIcon, BackwardIcon, ForwardIcon, StopIcon,
    PhotoIcon, MagnifyingGlassIcon, CheckCircleIcon,
    XCircleIcon, VideoIcon, CursorArrowRaysIcon, 
    ComputerDesktopIcon, EllipsisHorizontalIcon,
    ChatBubbleBottomCenterTextIcon, Square2StackIcon,
    BoltIcon, MicrophoneIcon, CpuChipSolidIcon,
    UserGroupIcon, EyeIcon, ArrowsPointingOutIcon, EyeSlashIcon,
    SpeakerXMarkIcon, LockClosedIcon, LockOpenIcon, ArrowUpTrayIcon,
    MagnetIcon, ArrowsRightLeftIcon, AspectRatio169Icon, AspectRatio916Icon, AspectRatio11Icon, AspectRatio34Icon, AspectRatio43Icon, FrameIcon, ChevronDownIcon,
    CenterAlignmentIcon, ArrowUturnLeftIcon, ArrowUturnRightIcon,
    BoldIcon, ItalicIcon, UnderlineIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, TextArcIcon,
    ChevronRightIcon, ChevronUpIcon, PaintBrushIcon, EraserIcon, CubeIcon, Bars3Icon
} from '../Icons';
import { IntegrationTool } from '../../features/settings/types';
import { useAuth } from '../../features/auth/useAuth';
import { useUser } from '../../features/users/useUser';
import CreditBalanceDisplay from './CreditBalanceDisplay';
import { findUserInTree } from '../../services/userService';
import { useToast } from '../ToastProvider';
import { useActions } from '../../features/actions/useActions';
import { isEqual } from 'lodash-es';
import { InspectorSection, PropertySlider, CompactInput, TimeInput, ColorPickerCircle, KeyframeButton, TimeRuler, WaveformCanvas, TextStyle } from './video-editor/VideoEditorUI';
import { GenerationResult } from '../../features/users/types';
import Modal from '../../components/Modal';

// --- GLOBAL STYLES FOR ANIMATIONS ---
const ANIMATION_STYLES = `
@keyframes enter-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes enter-slide-left { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes enter-slide-right { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes enter-slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes enter-zoom-in { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes enter-page-turn { from { transform: perspective(1000px) rotateY(90deg); opacity: 0; transform-origin: left; } to { transform: perspective(1000px) rotateY(0); opacity: 1; transform-origin: left; } }
@keyframes enter-flip-x { from { transform: perspective(400px) rotateX(90deg); opacity: 0; } to { transform: perspective(400px) rotateX(0); opacity: 1; } }
@keyframes enter-elastic { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { transform: scale(1); opacity: 1; } }

@keyframes loop-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
@keyframes loop-shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); } 20%, 40%, 60%, 80% { transform: translateX(2px); } }
@keyframes loop-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes loop-glow { 0%, 100% { filter: brightness(100%) drop-shadow(0 0 0px rgba(255,255,255,0)); } 50% { filter: brightness(120%) drop-shadow(0 0 10px rgba(255,255,255,0.5)); } }
@keyframes loop-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.anim-enter-fade-in { animation: enter-fade-in 0.8s ease-out forwards; }
.anim-enter-slide-left { animation: enter-slide-left 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
.anim-enter-slide-right { animation: enter-slide-right 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
.anim-enter-slide-up { animation: enter-slide-up 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
.anim-enter-zoom-in { animation: enter-zoom-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
.anim-enter-page-turn { animation: enter-page-turn 1s ease-in-out forwards; }
.anim-enter-flip-x { animation: enter-flip-x 0.8s ease-out forwards; }
.anim-enter-elastic { animation: enter-elastic 1s ease-out forwards; }

.anim-loop-pulse { animation: loop-pulse 2s infinite ease-in-out; }
.anim-loop-shake { animation: loop-shake 3s infinite; }
.anim-loop-float { animation: loop-float 3s infinite ease-in-out; }
.anim-loop-glow { animation: loop-glow 2s infinite alternate; }
.anim-loop-spin { animation: loop-spin 10s linear infinite; }
`;

// --- TYPES & INTERFACES ---

type ClipType = 'video' | 'audio' | 'text' | 'image' | 'effect' | 'transition';
type InteractionMode = 'none' | 'move' | 'resize' | 'rotate' | 'crop-tl' | 'crop-tr' | 'crop-bl' | 'crop-br' | 'crop-t' | 'crop-b' | 'crop-l' | 'crop-r';


interface CanvasPreset {
    id: string;
    label: string;
    width: number;
    height: number;
    icon: React.FC<{className?: string}>;
    description: string;
}

const CANVAS_PRESETS: CanvasPreset[] = [
    { id: '16:9', label: '16:9 (YouTube)', width: 1920, height: 1080, icon: AspectRatio169Icon, description: 'Ngang chuẩn HD' },
    { id: '9:16', label: '9:16 (TikTok/Reels)', width: 1080, height: 1920, icon: AspectRatio916Icon, description: 'Dọc full màn hình' },
    { id: '1:1', label: '1:1 (Instagram)', width: 1080, height: 1080, icon: AspectRatio11Icon, description: 'Vuông' },
    { id: '4:5', label: '4:5 (Feed Dọc)', width: 1080, height: 1350, icon: AspectRatio34Icon, description: 'Dọc Facebook/Insta' },
    { id: '4:3', label: '4:3 (TV Cổ điển)', width: 1440, height: 1080, icon: AspectRatio43Icon, description: 'Chuẩn SD' },
    { id: '3:4', label: '3:4 (Dọc SD)', width: 1080, height: 1440, icon: AspectRatio34Icon, description: 'Dọc chuẩn SD' },
    { id: '21:9', label: '21:9 (Điện ảnh)', width: 2560, height: 1080, icon: FrameIcon, description: 'Siêu rộng (Cinema)' },
    { id: '2:3', label: '2:3 (Pinterest)', width: 1000, height: 1500, icon: AspectRatio34Icon, description: 'Dọc Pinterest' },
];

interface Clip {
    id: string;
    type: ClipType;
    name: string;
    src?: string;
    thumbnail?: string;
    start: number; 
    duration: number; 
    offset: number; 
    trackId: number;
    sourceDuration?: number; 

    x: number; 
    y: number; 
    scale: number; 
    rotation: number; 
    opacity: number; 
    flipH: boolean; 
    flipV: boolean;
    
    crop?: {
        top: number; 
        bottom: number;
        left: number;
        right: number;
    };
    
    mixBlendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';

    borderRadius?: number;
    borderWidth?: number;
    borderColor?: string;
    shadowBlur?: number;
    shadowColor?: string;
    shadowOffsetX?: number;
    shadowOffsetY?: number;

    brightness?: number; 
    contrast?: number; 
    saturation?: number; 
    grayscale?: number; 
    sepia?: number; 
    blur?: number; 
    hueRotate?: number; 
    invert?: number; 

    text?: string; 
    style?: Partial<TextStyle>; 
    
    effectClass?: string; 
    animation?: string; 
    
    chromaKeyEnabled?: boolean;
    chromaKeyColor?: string;
    chromaKeyIntensity?: number;
    chromaKeySmoothness?: number;
    bgRemoved?: boolean;

    volume?: number; 
    speed?: number;
    trimStart?: number;
    trimEnd?: number;
    fadesEnabled?: boolean;
    fadeIn?: number;
    fadeOut?: number;
    vocalRemoverEnabled?: boolean;
    vocalMode?: 'music' | 'vocals';
    noiseReduced?: boolean;
    reverseAudio?: boolean;
    pitch?: number;
    eqEnabled?: boolean;
    eqPreset?: string;
    eqValues?: number[]; 
}

interface Track {
    id: number;
    visible: boolean;
    locked: boolean;
    muted: boolean;
    height: number; 
}

interface MockAsset {
    id: string;
    type: ClipType;
    src?: string;
    thumbnail?: string;
    name: string;
    duration: number; 
    category?: string;
}

type EditorState = {
    clips: Clip[];
    tracks: Track[];
};

// --- HELPERS ---

const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

// --- MOCK RESOURCES ---
const STOCK_MEDIA: MockAsset[] = [];

const DEFAULT_TEXT_STYLE: TextStyle = {
    fontFamily: 'Inter, sans-serif',
    fontSize: 32,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAlign: 'center',
    color: '#FFFFFF',
    letterSpacing: 0,
    lineHeight: 1.2,
    strokeEnabled: false,
    strokeColor: '#000000',
    strokeWidth: 0,
    backgroundEnabled: false,
    backgroundColor: '#000000',
    backgroundOpacity: 100, 
    padding: 0,
    borderRadius: 0,
    shadowEnabled: false,
    shadowColor: '#000000',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    opacity: 100,
    mixBlendMode: 'normal',
    skewX: 0,
    curve: 0,
};

const TEXT_PRESETS: { name: string; style: Partial<TextStyle> }[] = [
    { name: 'Cơ bản', style: DEFAULT_TEXT_STYLE },
    { name: 'Tiêu đề', style: { ...DEFAULT_TEXT_STYLE, fontWeight: 'bold', fontSize: 48 } },
    { name: 'Neon', style: { ...DEFAULT_TEXT_STYLE, color: '#00ffcc', shadowEnabled: true, shadowColor: '#00ffcc', shadowBlur: 20, strokeEnabled: true, strokeColor: '#ffffff', strokeWidth: 2, fontWeight: 'bold' } },
    { name: 'Retro', style: { ...DEFAULT_TEXT_STYLE, color: '#ff9900', shadowEnabled: true, shadowColor: '#660000', shadowOffsetX: 4, shadowOffsetY: 4, fontFamily: 'Lobster, sans-serif', fontSize: 48 } },
    { name: 'Viền Đen', style: { ...DEFAULT_TEXT_STYLE, color: '#ffffff', strokeEnabled: true, strokeColor: '#000000', strokeWidth: 4, fontWeight: 'bold' } },
    { name: 'Viền Trắng', style: { ...DEFAULT_TEXT_STYLE, color: '#000000', strokeEnabled: true, strokeColor: '#ffffff', strokeWidth: 4, fontWeight: 'bold' } },
    { name: 'Nền Đỏ', style: { ...DEFAULT_TEXT_STYLE, color: '#ffffff', backgroundEnabled: true, backgroundColor: '#ff0000', backgroundOpacity: 100, padding: 10, fontWeight: 'bold' } },
    { name: 'Phụ đề', style: { ...DEFAULT_TEXT_STYLE, color: '#ffff00', backgroundEnabled: true, backgroundColor: '#000000', backgroundOpacity: 60, padding: 5, fontSize: 24 } },
    { name: 'Thanh lịch', style: { ...DEFAULT_TEXT_STYLE, fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: 36, color: '#f0f0f0' } },
    { name: 'Nhiễu (Glitch)', style: { ...DEFAULT_TEXT_STYLE, color: '#00ffff', shadowEnabled: true, shadowColor: '#ff00ff', shadowOffsetX: -2, shadowOffsetY: 0, fontWeight: 'bold' } },
];

const EFFECT_PRESETS = [
    { category: 'Màu sắc & Phim', items: [
        { name: 'Teal & Orange', class: 'from-teal-500 to-orange-500 mix-blend-overlay' },
        { name: 'Vintage 1980', class: 'from-yellow-600 to-red-700 mix-blend-soft-light' },
        { name: 'Phim Noir (B&W)', class: 'from-gray-900 to-gray-500 grayscale mix-blend-overlay' },
        { name: 'Moody Dark', class: 'from-slate-900 to-blue-900 mix-blend-multiply' },
        { name: 'Pastel Dream', class: 'from-pink-300 to-blue-300 mix-blend-screen' },
        { name: 'Vibrant Pop', class: 'from-yellow-400 to-pink-500 mix-blend-overlay' },
        { name: 'Cool Mint', class: 'from-green-300 to-cyan-500 mix-blend-soft-light' },
        { name: 'Sepia Warmth', class: 'from-amber-700 to-orange-300 sepia mix-blend-overlay' },
        { name: 'Cinema Rich', class: 'from-red-900 to-black mix-blend-multiply' },
        { name: 'Faded Film', class: 'from-gray-400 to-gray-200 opacity-50 mix-blend-lighten' },
    ]},
    { category: 'Glitch & Retro', items: [
        { name: 'RGB Split', class: 'from-red-500 via-green-500 to-blue-500 mix-blend-difference' },
        { name: 'VHS Distortion', class: 'from-purple-900 to-gray-800 mix-blend-exclusion' },
        { name: 'CRT Scanline', class: 'from-green-900 to-black bg-[size:100%_4px] bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)]' },
        { name: 'Digital Noise', class: 'from-gray-400 to-gray-600 mix-blend-overlay opacity-50' },
        { name: 'Glitch Shake', class: 'from-pink-600 to-cyan-600 mix-blend-hard-light' },
        { name: 'Pixelate', class: 'backdrop-blur-sm' },
        { name: 'Chroma Shift', class: 'from-red-600 to-blue-600 mix-blend-color-dodge' },
        { name: 'Ghosting', class: 'from-white to-transparent mix-blend-screen opacity-50' },
    ]},
    { category: 'Ánh sáng & Glow', items: [
        { name: 'Soft Bloom', class: 'from-white to-pink-200 mix-blend-screen blur-sm' },
        { name: 'Neon Glow', class: 'from-fuchsia-500 to-cyan-500 mix-blend-color-dodge' },
        { name: 'Lens Flare', class: 'from-orange-400 via-transparent to-transparent bg-[radial-gradient(circle_at_top_left,var(--tw-gradient-from),transparent)] mix-blend-screen' },
        { name: 'Light Leak', class: 'from-red-400/50 to-transparent mix-blend-screen' },
        { name: 'Vignette', class: 'bg-[radial-gradient(circle,transparent_60%,black_100%)] mix-blend-multiply' },
        { name: 'God Rays', class: 'from-yellow-100 via-transparent to-transparent mix-blend-overlay' },
        { name: 'Cyber Fog', class: 'from-purple-900 to-slate-800 mix-blend-hard-light opacity-60' },
        { name: 'Starry Night', class: 'from-blue-900 to-black mix-blend-darken' },
    ]},
    { category: 'Biến dạng & Nghệ thuật', items: [
        { name: 'Negative', class: 'invert mix-blend-difference' },
        { name: 'Kaleidoscope', class: 'from-indigo-500 via-purple-500 to-pink-500 mix-blend-hue' },
        { name: 'Mirror', class: 'from-slate-400 to-slate-600 mix-blend-saturation' },
        { name: 'Swirl', class: 'from-orange-400 to-red-500 mix-blend-color' },
        { name: 'Edge Detect', class: 'contrast-200 grayscale mix-blend-luminosity' },
        { name: 'Sketch', class: 'grayscale contrast-150 brightness-125 mix-blend-multiply' },
        { name: 'Emboss', class: 'sepia contrast-125 mix-blend-overlay' },
        { name: 'Oil Paint', class: 'backdrop-contrast-125 backdrop-saturate-150' },
    ]}
];

const BLEND_MODES: { value: string; label: string }[] = [
    { value: 'normal', label: 'Bình thường' },
    { value: 'multiply', label: 'Nhân (Multiply)' },
    { value: 'screen', label: 'Làm sáng (Screen)' },
    { value: 'overlay', label: 'Phủ (Overlay)' },
    { value: 'darken', label: 'Làm tối' },
    { value: 'lighten', label: 'Làm sáng hơn' },
    { value: 'color-dodge', label: 'Color Dodge' },
    { value: 'color-burn', label: 'Color Burn' },
    { value: 'hard-light', label: 'Ánh sáng gắt' },
    { value: 'soft-light', label: 'Ánh sáng mềm' },
    { value: 'difference', label: 'Khác biệt' },
    { value: 'exclusion', label: 'Loại trừ' },
    { value: 'hue', label: 'Màu sắc (Hue)' },
    { value: 'saturation', label: 'Độ bão hòa' },
    { value: 'color', label: 'Màu (Color)' },
    { value: 'luminosity', label: 'Độ sáng' }
];

// --- HELPER COMPONENTS ---


const useHistory = (initialState: EditorState) => {
  const [history, setHistory] = useState([initialState]);
  const [index, setIndex] = useState(0);

  const setState = (action: React.SetStateAction<EditorState>, overwrite = false) => {
    const currentState = history[index];
    const newState = typeof action === 'function' ? (action as (prevState: EditorState) => EditorState)(currentState) : action;
    
    if (!overwrite && isEqual(currentState, newState)) {
        return;
    }

    if (overwrite) {
      const newHistory = [...history];
      newHistory[index] = newState;
      setHistory(newHistory);
    } else {
      const updatedHistory = history.slice(0, index + 1);
      setHistory([...updatedHistory, newState]);
      setIndex(index + 1);
    }
  };
  
  const undo = () => index > 0 && setIndex(index - 1);
  const redo = () => index < history.length - 1 && setIndex(index + 1);

  return {
    state: history[index],
    setState,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
  };
};

// --- VIDEO INSPECTOR COMPONENT ---
const VideoInspector: React.FC<{
    selectedClip: Clip;
    updateSelectedClip: (updates: Partial<Clip>, overwriteHistory?: boolean) => void;
    setEditorState: (action: React.SetStateAction<EditorState>, overwrite?: boolean) => void;
    canvasDimensions: { width: number, height: number };
    isCropping: boolean;
    setIsCropping: (v: boolean) => void;
}> = ({ selectedClip, updateSelectedClip, setEditorState, canvasDimensions, isCropping, setIsCropping }) => {
    const [activeSection, setActiveSection] = useState<string | null>('transform');

    const toggleSection = (section: string) => {
        setActiveSection(prev => (prev === section ? null : section));
    };

    const update = (updates: Partial<Clip>, overwrite = false) => updateSelectedClip(updates, overwrite);

    const handleFit = () => {
        update({ x: 50, y: 50, rotation: 0, scale: 100 }, true);
    };

    const handleFill = () => {
        update({ x: 50, y: 50, rotation: 0, scale: 200 }, true); 
    };
    
    const crop = selectedClip.crop || { top: 0, bottom: 0, left: 0, right: 0 };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] text-white -m-4">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-[#252526]">
                <h3 className="text-xs font-bold uppercase text-gray-300 tracking-wider">Cài đặt Video</h3>
                 <button 
                    onClick={() => {
                        setIsCropping(false);
                        update({ 
                            x: 50, y: 50, scale: 100, rotation: 0, opacity: 100, 
                            borderRadius: 0, borderWidth: 0, shadowBlur: 0,
                            brightness: 100, contrast: 100, saturation: 100,
                            crop: { top: 0, bottom: 0, left: 0, right: 0 }
                        }, true);
                    }} 
                    className="text-[10px] font-bold text-yellow-600 hover:text-yellow-500 transition-colors uppercase"
                >
                    Đặt lại
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
                
                {/* 1. Transform (PRO Layout) */}
                <InspectorSection title="Biến đổi (Transform)" icon={<ArrowsPointingOutIcon className="h-4 w-4"/>} isOpen={activeSection === 'transform'} onToggle={() => toggleSection('transform')}>
                    <div className="space-y-5">
                        {/* Position & Scale Grid */}
                         <div className="grid grid-cols-2 gap-4">
                             <div className="flex flex-col gap-3">
                                <CompactInput label="X" value={selectedClip.x} onChange={v => update({ x: v }, true)} />
                                <CompactInput label="Y" value={selectedClip.y} onChange={v => update({ y: v }, true)} />
                             </div>
                             <div className="flex flex-col gap-3">
                                <CompactInput label="W" value={selectedClip.scale} onChange={v => update({ scale: v }, true)} />
                                <CompactInput label="R" value={selectedClip.rotation} onChange={v => update({ rotation: v }, true)} />
                             </div>
                         </div>

                        {/* Keyframe & Sliders */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                             <span className="text-[10px] text-gray-400 font-bold uppercase">Keyframe</span>
                             <KeyframeButton />
                        </div>
                        
                        {/* Scale Slider */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] text-gray-400"><span>Thu phóng</span><span>{selectedClip.scale.toFixed(0)}%</span></div>
                            <input type="range" min="10" max="300" value={selectedClip.scale} onChange={e => update({ scale: Number(e.target.value) }, true)} onMouseUp={() => setEditorState(prev=>({...prev}))} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gray-400"/>
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-4 gap-2 pt-2">
                             <button onClick={() => update({ flipH: !selectedClip.flipH })} className={`py-1.5 rounded text-[10px] font-medium border transition-colors ${selectedClip.flipH ? 'bg-indigo-900/50 border-indigo-500 text-indigo-300' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}>Lật Ngang</button>
                             <button onClick={() => update({ flipV: !selectedClip.flipV })} className={`py-1.5 rounded text-[10px] font-medium border transition-colors ${selectedClip.flipV ? 'bg-indigo-900/50 border-indigo-500 text-indigo-300' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}>Lật Dọc</button>
                             <button onClick={handleFit} className="py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-[10px] text-gray-300">Vừa khung</button>
                             <button onClick={handleFill} className="py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-[10px] text-gray-300">Lấp đầy</button>
                        </div>
                    </div>
                </InspectorSection>

                 {/* 2. Crop (NEW - Interactive) */}
                 <InspectorSection title="Cắt xén (Crop)" icon={<FrameIcon className="h-4 w-4"/>} isOpen={activeSection === 'crop'} onToggle={() => toggleSection('crop')}>
                    <div className="space-y-4">
                        <p className="text-xs text-gray-500">Bật chế độ cắt để thao tác trực tiếp trên khung hình.</p>
                        <button 
                            onClick={() => setIsCropping(!isCropping)}
                            className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors ${isCropping ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'}`}
                        >
                            <FrameIcon className="h-4 w-4" />
                            {isCropping ? 'Xong (Tắt Crop)' : 'Bật chế độ Cắt'}
                        </button>
                        {isCropping && (
                             <button 
                                onClick={() => update({ crop: { top: 0, bottom: 0, left: 0, right: 0 } }, true)}
                                className="w-full py-2 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                            >
                                Đặt lại (Reset Crop)
                            </button>
                        )}
                    </div>
                 </InspectorSection>

                {/* 3. Compositing */}
                <InspectorSection title="Hòa trộn (Opacity)" icon={<Square2StackIcon className="h-4 w-4"/>} isOpen={activeSection === 'compositing'} onToggle={() => toggleSection('compositing')}>
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <PropertySlider label="Độ mờ" value={selectedClip.opacity} min={0} max={100} unit="%" onChange={v => update({ opacity: v }, true)} onMouseUp={() => setEditorState(prev=>({...prev}))} />
                        </div>
                        <div className="mt-5"><KeyframeButton /></div>
                    </div>
                    <div className="mt-4">
                        <label className="text-[10px] text-gray-500 mb-2 block uppercase">Chế độ hòa trộn</label>
                        <div className="relative">
                            <select value={selectedClip.mixBlendMode || 'normal'} onChange={e => update({ mixBlendMode: e.target.value as any })} className="w-full bg-[#111] border border-gray-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 appearance-none">
                                {BLEND_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon className="h-3 w-3 text-gray-500"/></div>
                        </div>
                    </div>
                </InspectorSection>

                {/* 4. Style & Frame */}
                <InspectorSection title="Kiểu dáng & Viền" icon={<CubeIcon className="h-4 w-4"/>} isOpen={activeSection === 'style'} onToggle={() => toggleSection('style')}>
                     <PropertySlider label="Bo góc" value={selectedClip.borderRadius || 0} min={0} max={100} unit="px" onChange={v => update({ borderRadius: v }, true)} onMouseUp={() => setEditorState(prev=>({...prev}))} />
                     
                     <div className="pt-4 border-t border-gray-800 mt-4">
                        <div className="flex justify-between items-center mb-3">
                             <span className="text-xs text-gray-400 font-bold uppercase">Viền</span>
                             <ColorPickerCircle color={selectedClip.borderColor || '#ffffff'} onChange={c => update({ borderColor: c })} size="h-5 w-5" />
                        </div>
                        <PropertySlider value={selectedClip.borderWidth || 0} min={0} max={20} unit="px" onChange={v => update({ borderWidth: v }, true)} onMouseUp={() => setEditorState(prev=>({...prev}))} />
                     </div>

                     <div className="pt-4 border-t border-gray-800 mt-4">
                         <div className="flex justify-between items-center mb-3">
                             <span className="text-xs text-gray-400 font-bold uppercase">Bóng đổ</span>
                             <ColorPickerCircle color={selectedClip.shadowColor || '#000000'} onChange={c => update({ shadowColor: c })} size="h-5 w-5" />
                        </div>
                        <div className="space-y-4">
                             <PropertySlider label="Độ mờ" value={selectedClip.shadowBlur || 0} min={0} max={50} unit="px" onChange={v => update({ shadowBlur: v }, true)} onMouseUp={() => setEditorState(prev=>({...prev}))} />
                             <div className="grid grid-cols-2 gap-4">
                                <PropertySlider label="X" value={selectedClip.shadowOffsetX || 0} min={-50} max={50} onChange={v => update({ shadowOffsetX: v }, true)} onMouseUp={() => setEditorState(prev=>({...prev}))} />
                                <PropertySlider label="Y" value={selectedClip.shadowOffsetY || 0} min={-50} max={50} onChange={v => update({ shadowOffsetY: v }, true)} onMouseUp={() => setEditorState(prev=>({...prev}))} />
                             </div>
                        </div>
                     </div>
                </InspectorSection>

                {/* 5. Color Adjustments (Grouped) */}
                <InspectorSection title="Màu sắc (Color)" icon={<SwatchIcon className="h-4 w-4"/>} isOpen={activeSection === 'color'} onToggle={() => toggleSection('color')}>
                    <div className="space-y-5">
                        <div>
                            <h5 className="text-[10px] font-bold text-gray-500 uppercase mb-3 tracking-wider">Cơ bản</h5>
                            <PropertySlider label="Độ sáng" value={selectedClip.brightness ?? 100} min={0} max={200} unit="%" onChange={v => update({ brightness: v }, true)} onMouseUp={() => setEditorState(prev=>({...prev}))} />
                            <PropertySlider label="Tương phản" value={selectedClip.contrast ?? 100} min={0} max={200} unit="%" onChange={v => update({ contrast: v }, true)} onMouseUp={() => setEditorState(prev=>({...prev}))} />
                            <PropertySlider label="Bão hòa" value={selectedClip.saturation ?? 100} min={0} max={200} unit="%" onChange={v => update({ saturation: v }, true)} onMouseUp={() => setEditorState(prev=>({...prev}))} />
                        </div>
                        
                        <div className="pt-4 border-t border-gray-800">
                            <h5 className="text-[10px] font-bold text-gray-500 uppercase mb-3 tracking-wider">Hậu kỳ</h5>
                            <PropertySlider label="Nhiệt độ (Sepia)" value={selectedClip.sepia ?? 0} min={0} max={100} unit="%" onChange={v => update({ sepia: v }, true)} onMouseUp={() => setEditorState(prev=>({...prev}))} />
                             <PropertySlider label="Ám màu (Tint)" value={selectedClip.hueRotate ?? 0} min={0} max={360} unit="°" onChange={v => update({ hueRotate: v }, true)} onMouseUp={() => setEditorState(prev=>({...prev}))} />
                             <PropertySlider label="Làm mờ (Blur)" value={selectedClip.blur ?? 0} min={0} max={20} unit="px" onChange={v => update({ blur: v }, true)} onMouseUp={() => setEditorState(prev=>({...prev}))} />
                        </div>
                    </div>
                </InspectorSection>

                 {/* 6. Chroma Key */}
                 <InspectorSection 
                    title="Tách nền xanh (Chroma)" 
                    icon={<SparklesIcon className="h-4 w-4"/>} 
                    isEnabled={selectedClip.chromaKeyEnabled} 
                    onToggleEnable={() => update({ chromaKeyEnabled: !selectedClip.chromaKeyEnabled })}
                    isOpen={activeSection === 'chroma'}
                    onToggle={() => toggleSection('chroma')}
                >
                     <div className="space-y-4">
                        <div className="flex justify-between items-center">
                             <span className="text-xs text-gray-400">Màu cần tách</span>
                             <div className="flex gap-3">
                                 {/* Eyedropper mock */}
                                 <button className="p-1.5 bg-gray-800 rounded hover:bg-gray-700"><span className="text-xs">🖊️</span></button>
                                 <ColorPickerCircle color={selectedClip.chromaKeyColor || '#00ff00'} onChange={c => update({ chromaKeyColor: c })} size="h-6 w-6" />
                             </div>
                        </div>
                        <PropertySlider label="Cường độ" value={selectedClip.chromaKeyIntensity ?? 10} min={0} max={100} onChange={v => update({ chromaKeyIntensity: v }, true)} />
                        <PropertySlider label="Độ mềm viền" value={selectedClip.chromaKeySmoothness ?? 10} min={0} max={100} onChange={v => update({ chromaKeySmoothness: v }, true)} />
                     </div>
                 </InspectorSection>

            </div>
        </div>
    );
};


// --- AUDIO INSPECTOR COMPONENT ---

const AudioInspector: React.FC<{
    selectedClip: Clip;
    updateSelectedClip: (updates: Partial<Clip>, overwriteHistory?: boolean) => void;
}> = ({ selectedClip, updateSelectedClip }) => {
    const [activeSection, setActiveSection] = useState<string | null>('volume');

    const toggleSection = (section: string) => {
        setActiveSection(prev => (prev === section ? null : section));
    };

    const updateAudio = (updates: Partial<Clip>, overwrite = false) => updateSelectedClip(updates, overwrite);
    
    const EQ_PRESETS: Record<string, number[]> = {
        'Mặc định': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        'Tăng Bass': [5, 4, 3, 2, 0, 0, 0, 0, 0, 0],
        'Tăng Treble': [0, 0, 0, 0, 0, 1, 2, 3, 4, 5],
        'Giọng hát': [-2, -1, 0, 2, 4, 4, 3, 1, 0, 0],
        'Pop': [-1, 1, 3, 4, 4, 2, 0, -1, 1, 2],
        'Rock': [4, 3, 1, 0, -1, -1, 0, 2, 3, 4],
        'Jazz': [3, 2, 0, 2, -2, -2, 0, 2, 3, 3]
    };
    
    // EQ Band frequencies
    const eqBands = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    const eqValues = selectedClip.eqValues || Array(10).fill(0);

    const handleEqChange = (index: number, val: number) => {
        const newValues = [...eqValues];
        newValues[index] = val;
        updateAudio({ eqValues: newValues }, true);
    };

    const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const presetName = e.target.value;
        const values = EQ_PRESETS[presetName] || Array(10).fill(0);
        updateAudio({ eqValues: values, eqPreset: presetName }, true);
    };

    const speedOptions = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4, 8, 16];

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] text-white -m-4">
            <div className="p-4 border-b border-gray-800 bg-[#252526]">
                <h3 className="text-xs font-bold uppercase text-gray-300 tracking-wider">Cài đặt Âm thanh</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
                
                {/* Volume (Improved UI) */}
                <InspectorSection title="Âm lượng" icon={<SpeakerWaveIcon className="h-4 w-4"/>} isOpen={activeSection === 'volume'} onToggle={() => toggleSection('volume')}>
                     <div className="space-y-3">
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                                 <button 
                                    onClick={() => updateAudio({ volume: selectedClip.volume === 0 ? 100 : 0 }, true)} 
                                    className={`p-1.5 rounded-md transition-colors ${selectedClip.volume === 0 ? 'bg-red-900/50 text-red-400' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                                    title={selectedClip.volume === 0 ? "Bật tiếng" : "Tắt tiếng"}
                                >
                                    {selectedClip.volume === 0 ? <SpeakerXMarkIcon className="h-4 w-4" /> : <SpeakerWaveIcon className="h-4 w-4" />}
                                </button>
                                <span className="text-xs text-gray-400">Mức độ</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-indigo-400 w-10 text-right">{selectedClip.volume ?? 100}%</span>
                                <button 
                                    onClick={() => updateAudio({ volume: 100 }, true)} 
                                    className="p-1 text-gray-500 hover:text-white rounded-full hover:bg-gray-700 transition-colors"
                                    title="Đặt lại 100%"
                                >
                                    <ArrowPathIcon className="h-3 w-3" />
                                </button>
                            </div>
                        </div>

                        <div className="h-8 flex items-center px-1">
                             <input 
                                type="range" min="0" max="200" value={selectedClip.volume ?? 100} 
                                onChange={(e) => updateAudio({ volume: Number(e.target.value) }, true)}
                                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
                            />
                        </div>
                        
                         <div className="flex justify-between text-[10px] text-gray-600 px-1 font-mono">
                            <span>0%</span>
                            <span>100%</span>
                            <span>200%</span>
                        </div>
                    </div>
                </InspectorSection>

                {/* Trim */}
                <InspectorSection title="Cắt đoạn" icon={<ScissorsIcon className="h-4 w-4"/>} isOpen={activeSection === 'trim'} onToggle={() => toggleSection('trim')}>
                     <div className="flex justify-end mb-2 text-xs text-gray-500 font-mono">{new Date((selectedClip.duration || 0) * 1000).toISOString().substr(11, 8)}</div>
                     <div className="grid grid-cols-2 gap-3">
                        <TimeInput value={0} onChange={() => {}} />
                        <TimeInput value={selectedClip.duration} onChange={() => {}} />
                     </div>
                </InspectorSection>

                 {/* Fades */}
                <InspectorSection 
                    title="Hiệu ứng âm lượng" 
                    icon={<ArrowPathIcon className="h-4 w-4"/>} 
                    isEnabled={selectedClip.fadesEnabled} 
                    onToggleEnable={() => updateAudio({ fadesEnabled: !selectedClip.fadesEnabled })}
                    isOpen={activeSection === 'fades'}
                    onToggle={() => toggleSection('fades')}
                >
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-xs text-gray-400 mb-2"><span>Âm lượng vào dần</span><span className="bg-[#111] px-1.5 py-0.5 rounded font-mono text-[10px]">{selectedClip.fadeIn || 0}s</span></div>
                            <input type="range" min="0" max="5" step="0.1" value={selectedClip.fadeIn || 0} onChange={e => updateAudio({ fadeIn: Number(e.target.value) }, true)} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#888]" />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs text-gray-400 mb-2"><span>Âm lượng ra dần</span><span className="bg-[#111] px-1.5 py-0.5 rounded font-mono text-[10px]">{selectedClip.fadeOut || 0}s</span></div>
                            <input type="range" min="0" max="5" step="0.1" value={selectedClip.fadeOut || 0} onChange={e => updateAudio({ fadeOut: Number(e.target.value) }, true)} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#888]" />
                        </div>
                    </div>
                </InspectorSection>

                {/* Speed */}
                <InspectorSection title="Tốc độ" icon={<ClockIcon className="h-4 w-4"/>} isOpen={activeSection === 'speed'} onToggle={() => toggleSection('speed')}>
                    <div className="flex items-center gap-4 mb-4">
                         <input 
                            type="range" min="0.1" max="16" step="0.1" value={selectedClip.speed ?? 1} 
                            onChange={(e) => updateAudio({ speed: Number(e.target.value) }, true)}
                            className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#888]"
                        />
                        <div className="bg-[#111] border border-gray-700 rounded px-2 py-1 w-12 text-center text-xs text-gray-300 font-mono">
                            {selectedClip.speed ?? 1}x
                        </div>
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                        {speedOptions.map(speed => (
                            <button
                                key={speed}
                                onClick={() => updateAudio({ speed }, true)}
                                className={`px-1 py-1.5 text-[10px] rounded border transition-colors ${selectedClip.speed === speed ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                            >
                                {speed}x
                            </button>
                        ))}
                    </div>
                </InspectorSection>

                {/* Vocal Remover (Visual Cards) */}
                 <InspectorSection 
                    title="Tách lời bài hát" 
                    icon={<MicrophoneIcon className="h-4 w-4"/>} 
                    isEnabled={selectedClip.vocalRemoverEnabled} 
                    onToggleEnable={() => updateAudio({ vocalRemoverEnabled: !selectedClip.vocalRemoverEnabled })}
                    isOpen={activeSection === 'vocal'}
                    onToggle={() => toggleSection('vocal')}
                >
                    <div className="flex gap-3 mt-2">
                         <button 
                            onClick={() => updateAudio({ vocalMode: 'music' })}
                            className={`flex-1 p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 h-20 ${selectedClip.vocalMode !== 'vocals' ? 'border-indigo-500 bg-indigo-900/20 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'border-gray-700 bg-gray-800 hover:bg-gray-750 hover:border-gray-600'}`}
                         >
                             <MusicalNoteIcon className={`h-6 w-6 ${selectedClip.vocalMode !== 'vocals' ? 'text-indigo-400' : 'text-gray-500'}`} />
                             <span className={`text-xs font-bold ${selectedClip.vocalMode !== 'vocals' ? 'text-white' : 'text-gray-400'}`}>Beat</span>
                         </button>
                         <button 
                            onClick={() => updateAudio({ vocalMode: 'vocals' })}
                            className={`flex-1 p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 h-20 ${selectedClip.vocalMode === 'vocals' ? 'border-indigo-500 bg-indigo-900/20 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'border-gray-700 bg-gray-800 hover:bg-gray-750 hover:border-gray-600'}`}
                         >
                             <MicrophoneIcon className={`h-6 w-6 ${selectedClip.vocalMode === 'vocals' ? 'text-indigo-400' : 'text-gray-500'}`} />
                             <span className={`text-xs font-bold ${selectedClip.vocalMode === 'vocals' ? 'text-white' : 'text-gray-400'}`}>Vocal</span>
                         </button>
                    </div>
                 </InspectorSection>

                {/* AI Audio Processing Group (Improved) */}
                <div className="border-b border-gray-800">
                     <div className="p-4 bg-[#1e1e1e]">
                        <div className="flex items-center gap-2 mb-3">
                             <CpuChipSolidIcon className="h-4 w-4 text-indigo-500" />
                             <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Xử lý AI Nâng cao</span>
                        </div>
                        
                        <div className="space-y-3 bg-[#151515] rounded-xl p-3 border border-gray-800">
                            {/* Reduce Noise */}
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded-lg ${selectedClip.noiseReduced ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-800 text-gray-500'}`}>
                                        <SpeakerXMarkIcon className="h-4 w-4"/>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm text-gray-200 font-medium">Khử tiếng ồn</span>
                                        <span className="text-[10px] text-gray-500">Loại bỏ tạp âm nền</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => updateAudio({ noiseReduced: !selectedClip.noiseReduced })}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${selectedClip.noiseReduced ? 'bg-indigo-600' : 'bg-gray-700'}`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition duration-200 ease-in-out ${selectedClip.noiseReduced ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                                </button>
                            </div>

                            <div className="h-px bg-gray-800 w-full"></div>

                            {/* Reverse Audio */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded-lg ${selectedClip.reverseAudio ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-800 text-gray-500'}`}>
                                        <ArrowUturnLeftIcon className="h-4 w-4"/>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm text-gray-200 font-medium">Đảo ngược</span>
                                        <span className="text-[10px] text-gray-500">Phát ngược chiều</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => updateAudio({ reverseAudio: !selectedClip.reverseAudio })}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${selectedClip.reverseAudio ? 'bg-indigo-600' : 'bg-gray-700'}`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition duration-200 ease-in-out ${selectedClip.reverseAudio ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                                </button>
                            </div>
                        </div>
                     </div>
                </div>

                {/* Pitch (Improved UI) */}
                 <InspectorSection title="Cao độ (Pitch)" icon={<AdjustmentsHorizontalIcon className="h-4 w-4 rotate-90"/>} isOpen={activeSection === 'pitch'} onToggle={() => toggleSection('pitch')}>
                    <div className="space-y-5">
                         <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-400 font-medium">Điều chỉnh</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-indigo-400 w-10 text-right bg-[#111] px-1 rounded">{selectedClip.pitch ?? 100}%</span>
                                <button 
                                    onClick={() => updateAudio({ pitch: 100 }, true)} 
                                    className="p-1 text-gray-500 hover:text-white rounded-full hover:bg-gray-700 transition-colors"
                                    title="Đặt lại 100%"
                                >
                                    <ArrowPathIcon className="h-3 w-3" />
                                </button>
                            </div>
                        </div>

                        {/* Centered Slider Concept */}
                        <div className="relative h-6 flex items-center">
                            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-600 z-0"></div>
                            <input 
                                type="range" min="50" max="150" step="1" value={selectedClip.pitch ?? 100} 
                                onChange={(e) => updateAudio({ pitch: Number(e.target.value) }, true)}
                                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 z-10 relative bg-transparent"
                            />
                        </div>

                        {/* Quick Presets */}
                        <div className="grid grid-cols-4 gap-2">
                             <button onClick={() => updateAudio({ pitch: 75 }, true)} className="py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-[10px] font-medium text-gray-300 border border-gray-700 hover:border-gray-600 transition-all">Trầm</button>
                             <button onClick={() => updateAudio({ pitch: 100 }, true)} className="py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-[10px] font-medium text-gray-300 border border-gray-700 hover:border-gray-600 transition-all">Gốc</button>
                             <button onClick={() => updateAudio({ pitch: 125 }, true)} className="py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-[10px] font-medium text-gray-300 border border-gray-700 hover:border-gray-600 transition-all">Cao</button>
                             <button onClick={() => updateAudio({ pitch: 150 }, true)} className="py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-[10px] font-medium text-gray-300 border border-gray-700 hover:border-gray-600 transition-all">Baby</button>
                        </div>
                    </div>
                 </InspectorSection>

                {/* Equalizer (Visual Upgrade) */}
                <InspectorSection title="Bộ cân bằng (EQ)" icon={<AdjustmentsHorizontalIcon className="h-4 w-4 rotate-90"/>} isOpen={activeSection === 'eq'} onToggle={() => toggleSection('eq')}>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-400">Mẫu có sẵn</span>
                            <select 
                                value={selectedClip.eqPreset || 'Mặc định'} 
                                onChange={handlePresetChange} 
                                className="bg-[#111] text-xs text-gray-300 border border-gray-700 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer outline-none"
                            >
                                {Object.keys(EQ_PRESETS).map(preset => (
                                    <option key={preset} value={preset}>{preset}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="flex justify-between h-40 items-center gap-1 px-2 bg-gray-900 p-3 rounded-xl border border-gray-800 relative">
                            {/* Center Line Reference */}
                            <div className="absolute top-1/2 left-2 right-2 h-px bg-gray-700/50 pointer-events-none"></div>
                            
                            {eqBands.map((freq, index) => {
                                const val = eqValues[index];
                                const label = freq >= 1000 ? `${freq/1000}K` : freq;
                                
                                // Calculation for visual bar height and position (growing from center)
                                const isPositive = val > 0;
                                const absVal = Math.abs(val);
                                const heightPercent = (absVal / 12) * 50; // Max height is 50% of container (from center to top/bottom)
                                
                                return (
                                    <div key={index} className="flex flex-col items-center h-full justify-between group w-full relative">
                                        <div className="relative h-full w-2 bg-gray-800/50 rounded-full border border-gray-700/50">
                                            {/* The active bar growing from center */}
                                            <div 
                                                className={`absolute left-0 w-full rounded-full transition-all duration-200 ${isPositive ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]'}`}
                                                style={{
                                                    height: `${Math.max(5, heightPercent)}%`, // Min height for visibility
                                                    [isPositive ? 'bottom' : 'top']: '50%',
                                                }}
                                            ></div>
                                            
                                            {/* Slider input overlay */}
                                            <input 
                                                type="range" min="-12" max="12" step="1" value={val}
                                                onChange={(e) => handleEqChange(index, Number(e.target.value))}
                                                className="absolute inset-0 opacity-0 w-full h-full cursor-ns-resize z-10"
                                                title={`${label}Hz: ${val}dB`}
                                                style={{ writingMode: 'vertical-lr', direction: 'rtl' }} 
                                            />
                                        </div>
                                        <span className="text-[8px] text-gray-500 font-mono mt-1">{label}</span>
                                    </div>
                                )
                            })}
                        </div>
                        
                        <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider px-1">
                            <span>Bass</span>
                            <span>Mid</span>
                            <span>Treble</span>
                        </div>
                    </div>
                </InspectorSection>

            </div>
        </div>
    );
};


// --- TEXT INSPECTOR COMPONENT ---
const TextInspector: React.FC<{
    selectedClip: Clip;
    updateSelectedClip: (updates: Partial<Clip> | { style: Partial<TextStyle> }, overwriteHistory?: boolean) => void;
    setIsEyedropperActive: (active: { target: keyof TextStyle } | null) => void;
    setEditorState: (action: React.SetStateAction<EditorState>, overwrite?: boolean) => void;
}> = ({ selectedClip, updateSelectedClip, setIsEyedropperActive, setEditorState }) => {
    const finalStyle = { ...DEFAULT_TEXT_STYLE, ...selectedClip.style };
    const updateStyle = (styleUpdate: Partial<TextStyle>, overwrite: boolean = false) => updateSelectedClip({ style: styleUpdate }, overwrite);
    
    const [activeSection, setActiveSection] = useState<string | null>('font'); // Default to font

    const toggleSection = (section: string) => {
        setActiveSection(prev => (prev === section ? null : section));
    };
    
    const fontFamilies = ['Inter', 'Arial', 'Georgia', 'Courier New', 'Verdana', 'Roboto', 'Montserrat', 'Lobster', 'Playfair Display', 'Oswald', 'Lato', 'Raleway', 'Poppins', 'Nunito', 'Merriweather', 'Pacifico', 'Caveat', 'Creepster'];
    // ... BLEND_MODES logic ...
    
    // Shadow Math Helpers
    const shadowDistance = Math.round(Math.sqrt(Math.pow(finalStyle.shadowOffsetX, 2) + Math.pow(finalStyle.shadowOffsetY, 2)));
    // Angle: 0 is right, 90 is down. Math.atan2 returns radians.
    let shadowAngle = Math.round(Math.atan2(finalStyle.shadowOffsetY, finalStyle.shadowOffsetX) * (180 / Math.PI));
    if (shadowAngle < 0) shadowAngle += 360;

    const handleShadowDistanceChange = (dist: number) => {
        const rad = shadowAngle * (Math.PI / 180);
        const x = Math.round(dist * Math.cos(rad));
        const y = Math.round(dist * Math.sin(rad));
        updateStyle({ shadowOffsetX: x, shadowOffsetY: y }, true);
    };

    const handleShadowAngleChange = (ang: number) => {
        const rad = ang * (Math.PI / 180);
        const x = Math.round(shadowDistance * Math.cos(rad));
        const y = Math.round(shadowDistance * Math.sin(rad));
        updateStyle({ shadowOffsetX: x, shadowOffsetY: y }, true);
    };

    const handleReset = () => {
        updateSelectedClip({ style: DEFAULT_TEXT_STYLE });
    };

    const StyleButton: React.FC<{ icon: React.ReactNode, active: boolean, onClick: () => void }> = ({ icon, active, onClick }) => (
        <button 
            onClick={onClick} 
            className={`p-1.5 rounded transition-all ${active ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
        >
            {icon}
        </button>
    );
    
    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] text-white -m-4"> 
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-[#252526]">
                <h3 className="text-xs font-bold uppercase text-gray-300 tracking-wider">Văn bản</h3>
                <button onClick={handleReset} className="text-[10px] font-bold text-yellow-600 hover:text-yellow-500 transition-colors uppercase">
                    Đặt lại
                </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
                
                {/* Font Section (Always visible) */}
                 <InspectorSection 
                    title="Phông chữ & Kiểu dáng" 
                    icon={<ChatBubbleBottomCenterTextIcon className="h-4 w-4"/>}
                    isOpen={activeSection === 'font'}
                    onToggle={() => toggleSection('font')}
                >
                     {/* Row 1: Font Family, Size, Color */}
                    <div className="flex items-center gap-2 mb-4">
                         {/* Font Family - 60% */}
                        <div className="relative flex-grow w-3/5">
                             <select 
                                value={finalStyle.fontFamily.split(',')[0]} 
                                onChange={e => updateStyle({ fontFamily: `${e.target.value}, sans-serif` })} 
                                className="w-full bg-[#111] border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 appearance-none truncate"
                            >
                                {fontFamilies.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon className="h-3 w-3 text-gray-500"/></div>
                        </div>

                         {/* Font Size - 20% */}
                        <div className="w-1/5">
                            <input
                                type="number"
                                value={Math.round(finalStyle.fontSize)} 
                                onChange={e => updateStyle({ fontSize: Number(e.target.value) }, true)}
                                className="w-full bg-[#111] border border-gray-700 rounded px-1 py-1.5 text-xs text-white text-center focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                         {/* Color Picker - 20% */}
                        <div className="flex-shrink-0">
                            <ColorPickerCircle color={finalStyle.color} onChange={c => updateStyle({ color: c })} size="h-8 w-8" />
                        </div>
                    </div>

                    {/* Row 2: Style Toolbar (Bold/Italic/Underline | Left/Center/Right) */}
                    <div className="flex items-center justify-between bg-[#111] rounded-lg p-1 border border-gray-700 mb-4">
                        <div className="flex gap-1">
                             <StyleButton icon={<BoldIcon className="h-4 w-4" />} active={finalStyle.fontWeight === 'bold'} onClick={() => updateStyle({ fontWeight: finalStyle.fontWeight === 'bold' ? 'normal' : 'bold' })} />
                             <StyleButton icon={<ItalicIcon className="h-4 w-4" />} active={finalStyle.fontStyle === 'italic'} onClick={() => updateStyle({ fontStyle: finalStyle.fontStyle === 'italic' ? 'normal' : 'italic' })} />
                             <StyleButton icon={<UnderlineIcon className="h-4 w-4" />} active={finalStyle.textDecoration === 'underline'} onClick={() => updateStyle({ textDecoration: finalStyle.textDecoration === 'underline' ? 'none' : 'underline' })} />
                        </div>
                        <div className="w-px bg-gray-700 h-5 mx-1"></div>
                        <div className="flex gap-1">
                            <StyleButton icon={<AlignLeftIcon className="h-4 w-4" />} active={finalStyle.textAlign === 'left'} onClick={() => updateStyle({ textAlign: 'left' })} />
                            <StyleButton icon={<AlignCenterIcon className="h-4 w-4" />} active={finalStyle.textAlign === 'center'} onClick={() => updateStyle({ textAlign: 'center' })} />
                            <StyleButton icon={<AlignRightIcon className="h-4 w-4" />} active={finalStyle.textAlign === 'right'} onClick={() => updateStyle({ textAlign: 'right' })} />
                        </div>
                    </div>
                    
                    {/* Row 3: Spacing */}
                    <div className="grid grid-cols-2 gap-4">
                        <PropertySlider label="Giãn dòng" value={finalStyle.lineHeight} min={0.5} max={3} step={0.1} onChange={v => updateStyle({ lineHeight: v }, true)} onMouseUp={() => setEditorState(prev=>({...prev}))} />
                        <PropertySlider label="Giãn chữ" value={finalStyle.letterSpacing} min={-5} max={20} onChange={v => updateStyle({ letterSpacing: v }, true)} onMouseUp={() => setEditorState(prev=>({...prev}))} />
                    </div>
                </InspectorSection>

                {/* Stroke Section */}
                <InspectorSection 
                    title="Viền chữ (Stroke)" 
                    icon={<div className="w-3.5 h-3.5 border-2 border-gray-400 rounded-sm"></div>} 
                    isEnabled={finalStyle.strokeEnabled}
                    onToggleEnable={() => {
                        const nextState = !finalStyle.strokeEnabled;
                        updateStyle({ strokeEnabled: nextState });
                        if (nextState) setActiveSection('stroke');
                    }}
                    isOpen={activeSection === 'stroke'}
                    onToggle={() => toggleSection('stroke')}
                >
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-xs text-gray-400">Màu viền</span>
                        <ColorPickerCircle color={finalStyle.strokeColor} onChange={c => updateStyle({ strokeColor: c })} />
                    </div>
                    <PropertySlider label="Độ dày" value={finalStyle.strokeWidth} min={0} max={20} onChange={v => updateStyle({ strokeWidth: v }, true)} onMouseUp={() => setEditorState(prev=>({...prev}))} />
                </InspectorSection>

                {/* Background Section */}
                <InspectorSection 
                    title="Nền văn bản" 
                    icon={<div className="w-3.5 h-3.5 bg-gray-500 rounded-sm"></div>} 
                    isEnabled={finalStyle.backgroundEnabled}
                    onToggleEnable={() => {
                         const nextState = !finalStyle.backgroundEnabled;
                         updateStyle({ backgroundEnabled: nextState });
                         if (nextState) setActiveSection('background');
                    }}
                    isOpen={activeSection === 'background'}
                    onToggle={() => toggleSection('background')}
                >
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-xs text-gray-400">Màu nền</span>
                        <ColorPickerCircle color={finalStyle.backgroundColor} onChange={c => updateStyle({ backgroundColor: c })} />
                    </div>
                    <div className="space-y-4">
                        <PropertySlider label="Độ trong suốt" value={finalStyle.backgroundOpacity} min={0} max={100} onChange={v => updateStyle({ backgroundOpacity: v }, true)} onMouseUp={() => setEditorState(prev=>({...prev}))} unit="%" />
                        <PropertySlider label="Khoảng đệm" value={finalStyle.padding} min={0} max={50} onChange={v => updateStyle({ padding: v }, true)} onMouseUp={() => setEditorState(prev=>({...prev}))} unit="px" />
                        <PropertySlider label="Bo góc" value={finalStyle.borderRadius} min={0} max={50} onChange={v => updateStyle({ borderRadius: v }, true)} onMouseUp={() => setEditorState(prev=>({...prev}))} unit="px" />
                    </div>
                </InspectorSection>

                {/* Shadow Section */}
                <InspectorSection 
                    title="Bóng đổ (Shadow)" 
                    icon={<div className="w-3.5 h-3.5 bg-gradient-to-br from-gray-400 to-transparent rounded-full border border-gray-600"></div>} 
                    isEnabled={finalStyle.shadowEnabled}
                    onToggleEnable={() => {
                         const nextState = !finalStyle.shadowEnabled;
                         updateStyle({ shadowEnabled: nextState });
                         if (nextState) setActiveSection('shadow');
                    }}
                    isOpen={activeSection === 'shadow'}
                    onToggle={() => toggleSection('shadow')}
                >
                     <div className="flex justify-between items-center mb-3">
                        <span className="text-xs text-gray-400">Màu bóng</span>
                        <ColorPickerCircle color={finalStyle.shadowColor} onChange={c => updateStyle({ shadowColor: c })} />
                    </div>
                     <div className="space-y-4">
                        <PropertySlider label="Khoảng cách" value={shadowDistance} min={0} max={50} onChange={handleShadowDistanceChange} onMouseUp={() => setEditorState(prev=>({...prev}))} />
                        <PropertySlider label="Độ mờ" value={finalStyle.shadowBlur} min={0} max={50} onChange={v => updateStyle({ shadowBlur: v }, true)} onMouseUp={() => setEditorState(prev=>({...prev}))} />
                        <PropertySlider label="Góc" value={shadowAngle} min={0} max={360} onChange={handleShadowAngleChange} onMouseUp={() => setEditorState(prev=>({...prev}))} unit="°" />
                    </div>
                </InspectorSection>

                {/* Opacity & Blend Section */}
                <InspectorSection 
                    title="Độ trong suốt & Hòa trộn" 
                    icon={<Square2StackIcon className="h-4 w-4"/>}
                    isOpen={activeSection === 'opacity'}
                    onToggle={() => toggleSection('opacity')}
                >
                    <PropertySlider label="Opacity" value={Math.round(finalStyle.opacity)} min={0} max={100} onChange={v => updateStyle({ opacity: v }, true)} onMouseUp={() => setEditorState(prev=>({...prev}))} unit="%" />
                    
                    <div className="space-y-2 mt-4">
                        <label className="text-[10px] text-gray-500 font-bold uppercase">Chế độ hòa trộn</label>
                        <div className="relative">
                            <select 
                                    value={finalStyle.mixBlendMode} 
                                    onChange={e => updateStyle({ mixBlendMode: e.target.value as any })} 
                                    className="w-full bg-[#111] border border-gray-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 appearance-none"
                            >
                                {BLEND_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon className="h-3 w-3 text-gray-500"/></div>
                        </div>
                    </div>
                </InspectorSection>
            </div>
        </div>
    );
};

const CanvasText: React.FC<{ clip: Clip, canvasDimensions: { width: number, height: number } }> = ({ clip, canvasDimensions }) => {
    const style = { ...DEFAULT_TEXT_STYLE, ...clip.style };
    
    const textShadows: string[] = [];
    if (style.strokeEnabled && style.strokeWidth > 0) {
        const sw = style.strokeWidth;
        textShadows.push(
            `-${sw}px -${sw}px 0 ${style.strokeColor}`,
            `${sw}px -${sw}px 0 ${style.strokeColor}`,
            `-${sw}px ${sw}px 0 ${style.strokeColor}`,
            `${sw}px ${sw}px 0 ${style.strokeColor}`
        );
    }
    if (style.shadowEnabled) {
         textShadows.push(`${style.shadowOffsetX}px ${style.shadowOffsetY}px ${style.shadowBlur}px ${style.shadowColor}`);
    }
    
    // Calculate background color with opacity
    let backgroundColor = style.backgroundColor;
    if (style.backgroundEnabled && style.backgroundColor.startsWith('#')) {
         // Convert hex to rgba
        const r = parseInt(style.backgroundColor.slice(1, 3), 16);
        const g = parseInt(style.backgroundColor.slice(3, 5), 16);
        const b = parseInt(style.backgroundColor.slice(5, 7), 16);
        backgroundColor = `rgba(${r}, ${g}, ${b}, ${style.backgroundOpacity / 100})`;
    } else if (!style.backgroundEnabled) {
        backgroundColor = 'transparent';
    }

    return (
        <div style={{
            fontFamily: style.fontFamily,
            fontSize: `${style.fontSize}px`,
            fontWeight: style.fontWeight,
            fontStyle: style.fontStyle,
            textDecoration: style.textDecoration,
            textAlign: style.textAlign,
            color: style.color,
            letterSpacing: `${style.letterSpacing}px`,
            lineHeight: style.lineHeight,
            textShadow: textShadows.join(', '),
            whiteSpace: 'pre-wrap',
            userSelect: 'none',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: style.textAlign === 'left' ? 'flex-start' : style.textAlign === 'right' ? 'flex-end' : 'center',
            backgroundColor: backgroundColor,
            padding: `${style.padding}px`,
            borderRadius: `${style.borderRadius}px`,
        }}>
            {clip.text}
        </div>
    );
};

const AutosizeTextarea: React.FC<{
    clip: Clip;
    canvasHeight: number;
    updateText: (text: string) => void;
    onBlur: () => void;
}> = ({ clip, canvasHeight, updateText, onBlur }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const style = { ...DEFAULT_TEXT_STYLE, ...clip.style };

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateText(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    };

    return (
        <textarea
            ref={textareaRef}
            value={clip.text}
            onChange={handleChange}
            onBlur={onBlur}
            style={{
                fontFamily: style.fontFamily,
                fontSize: `${style.fontSize}px`,
                fontWeight: style.fontWeight,
                fontStyle: style.fontStyle,
                textDecoration: style.textDecoration,
                textAlign: style.textAlign,
                color: style.color,
                letterSpacing: `${style.letterSpacing}px`,
                lineHeight: style.lineHeight,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                overflow: 'hidden',
                whiteSpace: 'pre-wrap',
                width: '100%',
                minWidth: '50px',
                textAlignLast: style.textAlign,
                padding: `${style.padding}px`,
            }}
        />
    );
};

// --- THUMBNAIL GENERATOR ---
const generateVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadeddata = () => {
            video.currentTime = 1; // Capture frame at 1s
        };
        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            } else {
                resolve(''); // Failed
            }
        };
        video.onerror = () => {
             resolve(''); // Failed to load video
        };
        video.src = URL.createObjectURL(file);
    });
};

// --- HELPER: Find Available Track ---
const findAvailableTrack = (tracks: Track[], clips: Clip[], startTime: number, duration: number): number | null => {
    const sortedTracks = [...tracks].sort((a, b) => a.id - b.id);
    for (const track of sortedTracks) {
        const hasCollision = clips.some(c => 
            c.trackId === track.id && 
            (c.start < startTime + duration && c.start + c.duration > startTime) // Check overlap
        );
        
        if (!hasCollision) {
            return track.id;
        }
    }
    return null;
};


// --- MAIN COMPONENT ---

const VideoEditor: React.FC<{ tool: IntegrationTool, onNavigate: (page: string) => void }> = ({ tool, onNavigate }) => {
    const { loggedInUser } = useAuth();
    const { userState } = useUser();
    const { addToast } = useToast();
    const { handleUseToolCredit, handleDeleteGenerationResult, handleSetGenerationHistory } = useActions();
    
    const ANIMATION_PRESETS = [
        { category: 'Vào (In)', items: [
            { name: 'Fade In', class: 'anim-enter-fade-in' },
            { name: 'Slide Left', class: 'anim-enter-slide-left' },
            { name: 'Slide Right', class: 'anim-enter-slide-right' },
            { name: 'Slide Up', class: 'anim-enter-slide-up' },
            { name: 'Zoom In', class: 'anim-enter-zoom-in' },
            { name: 'Page Turn', class: 'anim-enter-page-turn' },
            { name: 'Flip X', class: 'anim-enter-flip-x' },
            { name: 'Elastic', class: 'anim-enter-elastic' },
        ]},
        { category: 'Lặp (Loop)', items: [
            { name: 'Pulse', class: 'anim-loop-pulse' },
            { name: 'Shake', class: 'anim-loop-shake' },
            { name: 'Float', class: 'anim-loop-float' },
            { name: 'Glow', class: 'anim-loop-glow' },
            { name: 'Spin', class: 'anim-loop-spin' },
        ]}
    ];

    const freshUser = useMemo(() => loggedInUser ? findUserInTree(userState.allUsers, loggedInUser.id) : null, [userState.allUsers, loggedInUser]);
    const currentCredits = freshUser ? freshUser.creditBalance : 0;

    // --- STATE ---
    const { 
        state: editorState, 
        setState: setEditorState, 
        undo, 
        redo, 
        canUndo, 
        canRedo 
    } = useHistory({
        clips: [],
        tracks: [{ id: 1, visible: true, locked: false, muted: false, height: 64 }],
    });
    const { clips, tracks } = editorState;

    const [currentTime, setCurrentTime] = useState(0);
    const [zoomLevel, setZoomLevel] = useState(20); 
    const [isPlaying, setIsPlaying] = useState(false);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'media' | 'text' | 'effects' | 'ai'>('media');
    const [mediaFilter, setMediaFilter] = useState<'all' | 'video' | 'image' | 'audio'>('all');
    const [isProcessing, setIsProcessing] = useState(false);
    const [projectDuration, setProjectDuration] = useState(3600); // Default to 1 hour for "infinite" feel
    const [userMedia, setUserMedia] = useState<MockAsset[]>([]);
    const [isMagnetEnabled, setIsMagnetEnabled] = useState(true);
    const [snapLine, setSnapLine] = useState<number | null>(null); 
    const [draggingTrackId, setDraggingTrackId] = useState<number | null>(null); // Drag state for tracks
    const [isExporting, setIsExporting] = useState(false); // NEW: Export state
    
    // History
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    
    const historyItems = useMemo(() => {
        if (!loggedInUser?.generationHistory) return [];
        return loggedInUser.generationHistory
            .filter(h => h.taskId.startsWith('vid_'))
            .sort((a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime());
    }, [loggedInUser]);

    const handleLoadProject = (item: GenerationResult) => {
        if (confirm("Tải lại dự án này sẽ thay thế dự án hiện tại. Bạn có chắc chắn không?")) {
            try {
                 const state = JSON.parse(item.settings.videoState || '{}');
                 if (state.clips && state.tracks) {
                     setEditorState({ clips: state.clips, tracks: state.tracks }, true); // overwrite=true
                     if(state.projectDuration) setProjectDuration(state.projectDuration);
                     setShowHistoryModal(false);
                     addToast('Đã tải lại dự án video.', 'success');
                 }
            } catch (e) {
                console.error("Failed to parse video state", e);
                addToast('Lỗi khi tải dự án.', 'error');
            }
        }
    };
    
    const handleDeleteProject = (taskId: string) => {
         if (loggedInUser) {
            handleDeleteGenerationResult(loggedInUser.id, taskId);
            addToast('Đã xóa dự án khỏi lịch sử.', 'info');
        }
    }

    // CANVAS STATE
    const [selectedPresetId, setSelectedPresetId] = useState<string>('16:9');
    const [editingTextClipId, setEditingTextClipId] = useState<string | null>(null);
    const [isEyedropperActive, setIsEyedropperActive] = useState<{target: keyof TextStyle} | null>(null);
    const [isCropping, setIsCropping] = useState(false);

    // Right Panel Tab State
    const [rightPanelTab, setRightPanelTab] = useState<'properties' | 'canvas'>('canvas');

    useEffect(() => {
        if (selectedClipId) {
            setRightPanelTab('properties');
        } else {
            setRightPanelTab('canvas');
            setIsCropping(false); // Disable crop if no clip selected
        }
    }, [selectedClipId]);

    const activePreset = useMemo(() => 
        CANVAS_PRESETS.find(p => p.id === selectedPresetId) || CANVAS_PRESETS[0]
    , [selectedPresetId]);
    
    const canvasDimensions = useMemo(() => ({
        width: activePreset.width,
        height: activePreset.height
    }), [activePreset]);

    const canvasStyle: React.CSSProperties = {
        width: canvasDimensions.width,
        height: canvasDimensions.height,
    };

    const visibleClips = useMemo(() => {
        return clips
            .filter(c => currentTime >= c.start && currentTime < c.start + c.duration)
            // Sort by track index in the state array, not trackId, to respect reordering
            .sort((a, b) => {
                const indexA = tracks.findIndex(t => t.id === a.trackId);
                const indexB = tracks.findIndex(t => t.id === b.trackId);
                return indexA - indexB;
            }); 
    }, [clips, currentTime, tracks]);

    // Reversed for timeline display (Top of list = Top layer)
    const sortedTracksForTimeline = useMemo(() => {
        return [...tracks].reverse();
    }, [tracks]);
    
    const selectedClip = useMemo(() => 
        clips.find(c => c.id === selectedClipId) || null
    , [clips, selectedClipId]);

    // Interaction State for Canvas Gizmo
    const [interactionMode, setInteractionMode] = useState<InteractionMode>('none');
    const [interactionStart, setInteractionStart] = useState<{
        x: number, y: number, 
        valX: number, valY: number, 
        scale: number, rotation: number,
        cropTop: number, cropBottom: number, cropLeft: number, cropRight: number,
        fontSize?: number 
    } | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const exportCanvasRef = useRef<HTMLCanvasElement>(null); // NEW: Export Canvas
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    const fitScale = useMemo(() => {
        if (containerSize.width === 0 || containerSize.height === 0) return 1;
        const padding = 64;
        const wScale = (containerSize.width - padding) / canvasDimensions.width;
        const hScale = (containerSize.height - padding) / canvasDimensions.height;
        return Math.min(1, wScale, hScale); // Scale down to fit
    }, [containerSize, canvasDimensions]);

    const [showExportModal, setShowExportModal] = useState(false);
    const [exportSettings, setExportSettings] = useState({ resolution: '1080p', fps: 30, format: 'webm' }); // Default webm

    const timelineRef = useRef<HTMLDivElement>(null);
    const timelineScrollRef = useRef<HTMLDivElement>(null);
    const playheadInterval = useRef<any>(null);
    const isScrubbing = useRef(false);
    const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
    const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
    const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    
    // NEW REFS FOR CANCELLATION
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const exportTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isExportCancelledRef = useRef(false);
    
    // Timeline Drag State
    const [timelineAction, setTimelineAction] = useState<{
        type: 'move' | 'resize';
        clipId: string;
        handle?: 'left' | 'right';
        startX: number;
        initialStart: number;
        initialDuration: number;
        initialTrackId: number; 
    } | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // New State for Effects Tab
    const [effectTab, setEffectTab] = useState<'filters' | 'motion'>('filters');

    // --- NEW: DRAW TO CANVAS FUNCTION ---
    const drawToCanvas = useCallback((ctx: CanvasRenderingContext2D) => {
        // Clear canvas
        ctx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvasDimensions.width, canvasDimensions.height);

        visibleClips.forEach(clip => {
            // Calculate transform
            const centerX = (clip.x / 100) * canvasDimensions.width;
            const centerY = (clip.y / 100) * canvasDimensions.height;
            
            ctx.save();
            
            // Apply Global Transform (Move to center of object, rotate, scale)
            ctx.translate(centerX, centerY);
            ctx.rotate((clip.rotation * Math.PI) / 180);
            ctx.scale((clip.scale / 100) * (clip.flipH ? -1 : 1), (clip.scale / 100) * (clip.flipV ? -1 : 1));

            // Opacity
            ctx.globalAlpha = clip.opacity / 100;
            if(clip.mixBlendMode) ctx.globalCompositeOperation = clip.mixBlendMode as GlobalCompositeOperation;
            
            // Draw Content
            if (clip.type === 'video') {
                const videoEl = videoRefs.current.get(clip.id);
                if (videoEl && videoEl.readyState >= 2) {
                     // Draw video centered at current translation point
                     // Assume video fills the clip dimensions. 
                     // Note: In HTML DOM, we set width/height via CSS. 
                     // Here we need to draw based on intrinsic size or mapped size.
                     // Simplified: Draw at fixed reference size (e.g., Canvas Width), scale handles the rest.
                     const drawW = canvasDimensions.width; // Base width for 100% scale
                     const drawH = canvasDimensions.height; // Or aspect ratio based
                     // Better approach: use natural video aspect ratio to fill, like object-fit: cover
                     // For simplicity in this update, we draw video to fill the '100% scale box' which is canvas size
                     ctx.drawImage(videoEl, -drawW / 2, -drawH / 2, drawW, drawH);
                }
            } else if (clip.type === 'image') {
                // Images need to be pre-loaded or cached. 
                // For simplicity, we'll create a new Image object or grab from DOM if possible.
                // Optimization: Cache images. For now, query DOM img if exists?
                // Or just use the src.
                const img = new Image();
                img.src = clip.src || clip.thumbnail || '';
                if (img.complete) {
                     const drawW = canvasDimensions.width;
                     const drawH = canvasDimensions.height;
                     ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
                }
            } else if (clip.type === 'text') {
                 const style = { ...DEFAULT_TEXT_STYLE, ...clip.style };
                 ctx.font = `${style.fontWeight} ${style.fontStyle} ${style.fontSize}px ${style.fontFamily}`;
                 ctx.textAlign = style.textAlign as CanvasTextAlign;
                 ctx.textBaseline = 'middle';
                 ctx.fillStyle = style.color;
                 
                 // Basic Shadow
                 if (style.shadowEnabled) {
                     ctx.shadowColor = style.shadowColor;
                     ctx.shadowBlur = style.shadowBlur;
                     ctx.shadowOffsetX = style.shadowOffsetX;
                     ctx.shadowOffsetY = style.shadowOffsetY;
                 }
                 
                 // Draw Text (Multiline handling is complex, simplifying to single line or basic split)
                 const lines = (clip.text || '').split('\n');
                 const lineHeightPx = style.fontSize * style.lineHeight;
                 const totalHeight = lines.length * lineHeightPx;
                 
                 lines.forEach((line, i) => {
                     const yOffset = (i - (lines.length - 1) / 2) * lineHeightPx;
                     if(style.strokeEnabled) {
                         ctx.lineWidth = style.strokeWidth;
                         ctx.strokeStyle = style.strokeColor;
                         ctx.strokeText(line, 0, yOffset);
                     }
                     ctx.fillText(line, 0, yOffset);
                 });
            } else if (clip.type === 'effect') {
                // Effects are usually CSS filters/overlays. Canvas filters are limited.
                // We can simulate basic color overlays.
                // For gradients, we need to parse the class string or just skip for now.
                // Simple Color Overlay simulation:
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; // Placeholder
                ctx.fillRect(-canvasDimensions.width/2, -canvasDimensions.height/2, canvasDimensions.width, canvasDimensions.height);
            }

            ctx.restore();
        });
    }, [canvasDimensions, visibleClips]);
    
    // --- TRACK REORDERING LOGIC ---
    const moveTrack = (fromId: number, toId: number) => {
        if (fromId === toId) return;
        setEditorState(prev => {
            const newTracks = [...prev.tracks];
            const fromIndex = newTracks.findIndex(t => t.id === fromId);
            const toIndex = newTracks.findIndex(t => t.id === toId);
            
            if (fromIndex === -1 || toIndex === -1) return prev;

            const [movedTrack] = newTracks.splice(fromIndex, 1);
            newTracks.splice(toIndex, 0, movedTrack);
            
            return { ...prev, tracks: newTracks };
        });
    };

    const handleTrackDragStart = (e: React.DragEvent, id: number) => {
        setDraggingTrackId(id);
        e.dataTransfer.effectAllowed = "move";
        // Required for Firefox to allow dragging
        e.dataTransfer.setData("text/plain", String(id));
    };

    const handleTrackDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
    };

    const handleTrackDrop = (e: React.DragEvent, targetId: number) => {
        e.preventDefault();
        if (draggingTrackId !== null) {
            moveTrack(draggingTrackId, targetId);
            setDraggingTrackId(null);
        }
    };

    const handleApplyEffect = (preset: { name: string, class: string }) => {
        const newClipId = `fx_${Date.now()}`;
        
        setEditorState(prev => {
            let newTracks = [...prev.tracks];
            
            // For Effects, we usually want them on top of everything else to apply to layers below.
            // We create a new track at the end of the list (Highest Z-index, Top of Timeline).
            const newTrackId = newTracks.length > 0 ? Math.max(...newTracks.map(t => t.id)) + 1 : 1;
            newTracks.push({ id: newTrackId, visible: true, locked: false, muted: false, height: 64 });
            
            const newClip: Clip = {
                id: newClipId,
                type: 'effect',
                name: preset.name,
                effectClass: preset.class, 
                start: currentTime,
                duration: 5, // Default 5s
                offset: 0,
                trackId: newTrackId,
                x: 50, y: 50, scale: 100, rotation: 0, opacity: 100, flipH: false, flipV: false 
            };
            return { tracks: newTracks, clips: [...prev.clips, newClip] };
        });
        setSelectedClipId(newClipId);
        addToast(`Đã thêm lớp hiệu ứng "${preset.name}" vào Track mới trên cùng`, 'success');
    };
    
    const handleApplyAnimation = (anim: { name: string, class: string }) => {
        if (!selectedClipId) {
            addToast('Vui lòng chọn một clip video, ảnh hoặc văn bản để áp dụng.', 'info');
            return;
        }
        updateSelectedClip({ animation: anim.class }, true);
        addToast(`Đã áp dụng hiệu ứng "${anim.name}"`, 'success');
    };
    
    const handleRemoveAnimation = () => {
        if (!selectedClipId) return;
        updateSelectedClip({ animation: undefined }, true);
        addToast('Đã gỡ bỏ hiệu ứng chuyển động.', 'success');
    };

    const handleFitTimeline = () => {
        // Calculate min duration needed to fit all clips
        const maxEndTime = clips.reduce((max, clip) => Math.max(max, clip.start + clip.duration), 0);
        const durationToFit = Math.max(60, maxEndTime + 10); // Add a small buffer

        if (timelineRef.current) {
            const width = timelineRef.current.clientWidth;
            // Ensure we don't divide by zero
            const newZoom = width / durationToFit;
            setZoomLevel(Math.max(0.1, newZoom)); // Ensure min zoom level
        }
    };

    // --- RESIZE OBSERVER FOR CANVAS ---
    useEffect(() => {
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });

        if (previewContainerRef.current) {
            observer.observe(previewContainerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // --- DYNAMIC DURATION LOGIC (Infinite Timeline) ---
    useEffect(() => {
        const maxEndTime = clips.reduce((max, clip) => {
            const endTime = clip.start + clip.duration;
            return endTime > max ? endTime : max;
        }, 0);
        
        // "Infinite" feel: Always keep at least 10 minutes (600s) buffer beyond the last clip
        // Minimum duration is 1 hour (3600s) to make it feel spacious from the start.
        const newDuration = Math.max(3600, Math.ceil(maxEndTime + 600)); 
        
        if (newDuration !== projectDuration) {
            setProjectDuration(newDuration);
        }
    }, [clips, projectDuration]);

    // --- PLAYBACK LOGIC (Updated to support Export Drawing) ---
    useEffect(() => {
        if (isPlaying) {
            const startTs = Date.now() - (currentTime * 1000);
            playheadInterval.current = requestAnimationFrame(function update() {
                const now = Date.now();
                const newTime = (now - startTs) / 1000;
                
                // --- EXPORT RECORDING HOOK ---
                if (isExporting && exportCanvasRef.current) {
                    const ctx = exportCanvasRef.current.getContext('2d');
                    if (ctx) drawToCanvas(ctx);
                }

                if (timelineScrollRef.current) {
                    const scrollLeft = timelineScrollRef.current.scrollLeft;
                    const clientWidth = timelineScrollRef.current.clientWidth;
                    const playheadPos = newTime * zoomLevel;
                    
                    // Auto-scroll during playback
                    if (playheadPos > scrollLeft + clientWidth - 50) {
                        timelineScrollRef.current.scrollLeft = playheadPos - 50;
                    }
                }

                if (newTime >= projectDuration) {
                    if(newTime > projectDuration) {
                        setIsPlaying(false);
                        setCurrentTime(projectDuration);
                    } else {
                         setCurrentTime(newTime);
                         playheadInterval.current = requestAnimationFrame(update);
                    }
                } else {
                    setCurrentTime(newTime);
                    playheadInterval.current = requestAnimationFrame(update);
                }
            });
        } else {
            cancelAnimationFrame(playheadInterval.current);
        }
        return () => cancelAnimationFrame(playheadInterval.current);
    }, [isPlaying, projectDuration, zoomLevel, isExporting, drawToCanvas]);

    // --- MOUSE WHEEL HANDLER FOR ZOOM & SCROLL ---
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (!timelineScrollRef.current) return;

            if (e.ctrlKey || e.metaKey) {
                // Zooming
                e.preventDefault();
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                setZoomLevel(prev => {
                    const newZoom = Math.min(100, Math.max(0.1, prev * delta));
                    return newZoom;
                });
            } else if (e.shiftKey) {
                // Horizontal Scrolling (Shift+Wheel usually does this natively, but we can enforce smooth logic)
                // Native horizontal scroll is usually fine, but explicit handling allows control speed.
                // timelineScrollRef.current.scrollLeft += e.deltaY;
            }
        };
        
        const container = timelineScrollRef.current;
        if (container) {
            container.addEventListener('wheel', handleWheel, { passive: false });
        }
        return () => {
             if (container) {
                container.removeEventListener('wheel', handleWheel);
             }
        };
    }, []);


     const updateSelectedClip = (updates: Partial<Clip> | { style: Partial<TextStyle> }, overwriteHistory = false) => {
        if (!selectedClipId) return;
        setEditorState(prev => {
            const newClips = prev.clips.map(c => {
                if (c.id === selectedClipId) {
                    if ('style' in updates) {
                        return { ...c, style: { ...c.style, ...updates.style } };
                    }
                    return { ...c, ...updates };
                }
                return c;
            });
            return { ...prev, clips: newClips };
        }, overwriteHistory);
    };

    // --- CANVAS INTERACTION LOGIC (GIZMO) ---
    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            setSelectedClipId(null);
            setEditingTextClipId(null);
            setIsCropping(false);
        }
    };
    
    // EYEDROPPER LOGIC
    const handleEyedropperClick = (e: React.MouseEvent) => {
        if (!isEyedropperActive || !canvasRef.current || !hiddenCanvasRef.current) return;
        e.stopPropagation();

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const scaleX = hiddenCanvasRef.current.width / rect.width;
        const scaleY = hiddenCanvasRef.current.height / rect.height;

        const ctx = hiddenCanvasRef.current.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        
        const pixel = ctx.getImageData(x * scaleX, y * scaleY, 1, 1).data;
        const color = `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${pixel[3] / 255})`;

        updateSelectedClip({ style: { [isEyedropperActive.target]: color } });
        setIsEyedropperActive(null);
    };

    const handleTransformMouseDown = (e: React.MouseEvent, mode: InteractionMode, clipId: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        const clip = clips.find(c => c.id === clipId);
        if (!clip) return;

        if (selectedClipId !== clipId) {
            setSelectedClipId(clipId);
        }
        setEditingTextClipId(null);

        setInteractionMode(mode);
        setInteractionStart({
            x: e.clientX,
            y: e.clientY,
            valX: clip.x,
            valY: clip.y,
            scale: clip.scale,
            rotation: clip.rotation,
            cropTop: clip.crop?.top || 0,
            cropBottom: clip.crop?.bottom || 0,
            cropLeft: clip.crop?.left || 0,
            cropRight: clip.crop?.right || 0,
            fontSize: clip.style?.fontSize || DEFAULT_TEXT_STYLE.fontSize
        });
        
        setIsPlaying(false);
    };

    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (interactionMode === 'none' || !interactionStart || !selectedClipId || !canvasRef.current) return;

            const clip = clips.find(c => c.id === selectedClipId);
            if (!clip) return;

            const rect = canvasRef.current.getBoundingClientRect();
            const deltaX = e.clientX - interactionStart.x;
            const deltaY = e.clientY - interactionStart.y;

            if (interactionMode === 'move') {
                const deltaXPercent = (deltaX / rect.width) * 100;
                const deltaYPercent = (deltaY / rect.height) * 100;

                updateSelectedClip({
                    x: interactionStart.valX + deltaXPercent,
                    y: interactionStart.valY + deltaYPercent
                }, true);
            } 
            else if (interactionMode === 'resize') {
                const centerX = rect.left + (clip.x / 100) * rect.width;
                const centerY = rect.top + (clip.y / 100) * rect.height;
                
                const startDist = Math.hypot(interactionStart.x - centerX, interactionStart.y - centerY);
                const correctCurrentDist = Math.hypot(e.clientX - centerX, e.clientY - centerY);

                const scaleFactor = correctCurrentDist / startDist;
                
                if (clip.type === 'text' && interactionStart.fontSize) {
                     const newFontSize = Math.max(8, interactionStart.fontSize * scaleFactor);
                     updateSelectedClip({ style: { ...clip.style, fontSize: newFontSize } }, true);
                } else {
                    const newScale = Math.max(10, interactionStart.scale * scaleFactor);
                    updateSelectedClip({ scale: newScale }, true);
                }
            }
            else if (interactionMode === 'rotate') {
                const centerX = rect.left + (clip.x / 100) * rect.width;
                const centerY = rect.top + (clip.y / 100) * rect.height;
                
                const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerY);
                const startAngle = Math.atan2(interactionStart.y - centerY, interactionStart.x - centerX);
                
                const deltaAngle = (currentAngle - startAngle) * (180 / Math.PI);
                updateSelectedClip({ rotation: interactionStart.rotation + deltaAngle }, true);
            }
            // --- CROP HANDLERS ---
            else if (interactionMode.startsWith('crop-')) {
                 // Current visual size of the element in pixels (approximate, considering scale)
                 // NOTE: This logic simplifies crop to be relative to the element's CURRENT visual box
                 // A robust implementation requires mapping global mouse delta to element local space.
                 // Here we approximate using element width/height percentage.
                 
                 // Element rendered width/height in px
                 const elWidth = (rect.width * clip.scale) / 100;
                 const elHeight = (rect.height * clip.scale) / 100;
                 
                 // Delta as percentage of element size
                 const dXPercent = (deltaX / elWidth) * 100;
                 const dYPercent = (deltaY / elHeight) * 100;
                 
                 let newCrop = { 
                     top: interactionStart.cropTop, 
                     bottom: interactionStart.cropBottom, 
                     left: interactionStart.cropLeft, 
                     right: interactionStart.cropRight 
                 };

                 // Adjust based on handle
                 if (interactionMode.includes('t')) newCrop.top = Math.max(0, Math.min(100 - newCrop.bottom - 5, interactionStart.cropTop + dYPercent));
                 if (interactionMode.includes('b')) newCrop.bottom = Math.max(0, Math.min(100 - newCrop.top - 5, interactionStart.cropBottom - dYPercent));
                 if (interactionMode.includes('l')) newCrop.left = Math.max(0, Math.min(100 - newCrop.right - 5, interactionStart.cropLeft + dXPercent));
                 if (interactionMode.includes('r')) newCrop.right = Math.max(0, Math.min(100 - newCrop.left - 5, interactionStart.cropRight - dXPercent));
                 
                 updateSelectedClip({ crop: newCrop }, true);
            }
        };

        const handleGlobalMouseUp = () => {
            if(interactionMode !== 'none') {
                const clip = clips.find(c => c.id === selectedClipId);
                if (clip) {
                    setEditorState(prev => ({ ...prev, clips: [...prev.clips] }));
                }
            }
            setInteractionMode('none');
            setInteractionStart(null);
        };

        if (interactionMode !== 'none') {
            window.addEventListener('mousemove', handleGlobalMouseMove);
            window.addEventListener('mouseup', handleGlobalMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [interactionMode, interactionStart, selectedClipId, clips]); 

     // --- SCRUBBING LOGIC ---
    useEffect(() => {
        const handleWindowMouseMove = (e: MouseEvent) => {
            if (isScrubbing.current && timelineScrollRef.current) {
                const rect = timelineScrollRef.current.getBoundingClientRect();
                const x = e.clientX - rect.left + timelineScrollRef.current.scrollLeft;
                let newTime = x / zoomLevel;
                newTime = Math.max(0, Math.min(projectDuration, newTime));
                
                if (isMagnetEnabled) {
                    const snapThreshold = 10 / zoomLevel; 
                    for (const clip of clips) {
                         if (Math.abs(newTime - clip.start) < snapThreshold) newTime = clip.start;
                         else if (Math.abs(newTime - (clip.start + clip.duration)) < snapThreshold) newTime = clip.start + clip.duration;
                    }
                }
                setCurrentTime(newTime);
            }
        };

        const handleWindowMouseUp = () => {
            if (isScrubbing.current) {
                isScrubbing.current = false;
            }
        };

        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);
        
        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };
    }, [zoomLevel, projectDuration, isMagnetEnabled, clips]);

    // --- CLIP DRAGGING & SNAPPING LOGIC ---
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!timelineAction) return;

            const deltaX = e.clientX - timelineAction.startX;
            const timeDelta = deltaX / zoomLevel;

            let newStart = timelineAction.initialStart;
            let newDuration = timelineAction.initialDuration;
            let newTrackId = timelineAction.initialTrackId;
            
            // Calculate Snap Targets
             let snapIndicator = null;
             const snapThreshold = 15 / zoomLevel; 

            if (timelineAction.type === 'move') {
                 newStart = Math.max(0, timelineAction.initialStart + timeDelta);
                 
                 // VERTICAL DRAG LOGIC (TRACK CHANGE)
                 // Allow changing track when moving clip
                 if (timelineScrollRef.current) {
                     const timelineRect = timelineScrollRef.current.getBoundingClientRect();
                     const headerHeight = 24; // h-6
                     const relativeY = e.clientY - timelineRect.top + timelineScrollRef.current.scrollTop - headerHeight;
                     
                     let currentH = 0;
                     // Use the visual order for hit testing
                     for (const track of sortedTracksForTimeline) {
                         if (relativeY >= currentH && relativeY < currentH + track.height) {
                             if (!track.locked) {
                                 newTrackId = track.id;
                             }
                             break;
                         }
                         currentH += track.height;
                     }
                 }

                 if (isMagnetEnabled) {
                    let closestDist = snapThreshold;
                    if (Math.abs(newStart - currentTime) < closestDist) {
                        newStart = currentTime;
                        closestDist = Math.abs(newStart - currentTime);
                        snapIndicator = currentTime;
                    }
                    clips.forEach(c => {
                        if (c.id === timelineAction.clipId) return;
                        if (Math.abs(newStart - c.start) < closestDist) {
                            newStart = c.start;
                            closestDist = Math.abs(newStart - c.start);
                            snapIndicator = c.start;
                        }
                        if (Math.abs(newStart - (c.start + c.duration)) < closestDist) {
                            newStart = c.start + c.duration;
                            closestDist = Math.abs(newStart - (c.start + c.duration));
                            snapIndicator = c.start + c.duration;
                        }
                    });
                }
            } else if (timelineAction.type === 'resize') {
                const clip = clips.find(c => c.id === timelineAction.clipId);
                
                if (timelineAction.handle === 'right') {
                    let d = timelineAction.initialDuration + timeDelta;
                    // Cap duration for video/audio based on source length, allow infinite for image/text/effect
                    if (clip && clip.type !== 'image' && clip.type !== 'text' && clip.type !== 'effect' && clip.sourceDuration) {
                         d = Math.min(d, clip.sourceDuration - clip.offset);
                    }
                    newDuration = Math.max(0.1, d);
                } else if (timelineAction.handle === 'left') {
                    const maxStart = timelineAction.initialStart + timelineAction.initialDuration - 0.1;
                    newStart = Math.min(maxStart, Math.max(0, timelineAction.initialStart + timeDelta));
                    
                    newDuration = timelineAction.initialDuration - (newStart - timelineAction.initialStart);
                }
            }

            setSnapLine(snapIndicator);

            setEditorState(prev => ({
                ...prev,
                clips: prev.clips.map(c => 
                    c.id === timelineAction.clipId ? { 
                        ...c, 
                        start: newStart, 
                        duration: newDuration,
                        trackId: newTrackId,
                    } : c
                )
            }), true);
        };

        const handleMouseUp = () => {
            if (timelineAction) {
                setEditorState(prev => ({...prev})); // Commit history
                setTimelineAction(null);
                setSnapLine(null);
            }
        };

        if (timelineAction) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.classList.add('grabbing');
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.classList.remove('grabbing');
        };
    }, [timelineAction, zoomLevel, clips, isMagnetEnabled, currentTime, setEditorState, tracks, sortedTracksForTimeline]);


    // --- MEDIA SYNC LOGIC ---
    useEffect(() => {
        const syncMedia = (mediaEl: HTMLVideoElement | HTMLAudioElement, clip: Clip) => {
            const track = tracks.find(t => t.id === clip.trackId);
            if (!track || !clip.src || !mediaEl.src) return;

            mediaEl.muted = track.muted;
            if (clip.volume !== undefined) {
                mediaEl.volume = clip.volume / 100;
            }
            if (clip.speed !== undefined) {
                mediaEl.playbackRate = clip.speed;
            }

            const isActive = currentTime >= clip.start && currentTime < clip.start + clip.duration;
            
            if (isActive) {
                const timeSinceStart = currentTime - clip.start;
                const mediaTime = clip.offset + (timeSinceStart * (clip.speed || 1));

                if (Math.abs(mediaEl.currentTime - mediaTime) > 0.3) { 
                    mediaEl.currentTime = mediaTime;
                }
                
                if (isPlaying && mediaEl.paused) {
                    if (mediaEl.readyState >= 2) {
                        mediaEl.play().catch(e => {/* ignore play interrupted error */});
                    }
                } else if (!isPlaying && !mediaEl.paused) {
                    mediaEl.pause();
                }
            } else {
                if (!mediaEl.paused) {
                    mediaEl.pause();
                }
            }
        };

        videoRefs.current.forEach((videoEl, clipId) => {
            const clip = clips.find(c => c.id === clipId);
            if (clip) {
                syncMedia(videoEl, clip);
            }
        });

        audioRefs.current.forEach((audioEl, clipId) => {
            const clip = clips.find(c => c.id === clipId);
            if (clip) {
                syncMedia(audioEl, clip);
            }
        });

    }, [currentTime, isPlaying, clips, tracks]);

    const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsPlaying(false);
        isScrubbing.current = true;

        if (timelineScrollRef.current) {
            const rect = timelineScrollRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left + timelineScrollRef.current.scrollLeft;
            let newTime = x / zoomLevel;
            newTime = Math.max(0, Math.min(projectDuration, newTime));
            setCurrentTime(newTime);
        }
    };

    // --- DYNAMIC TRACK MANAGEMENT ---
    const handleAddTrack = () => {
        setEditorState(prev => {
            const newId = prev.tracks.length > 0 ? Math.max(...prev.tracks.map(t => t.id)) + 1 : 1;
            const newTracks = [...prev.tracks, { id: newId, visible: true, locked: false, muted: false, height: 64 }];
            return { ...prev, tracks: newTracks };
        });
    };

    const handleDeleteTrack = (trackId: number) => {
        if (tracks.length <= 1) {
            addToast('Cần ít nhất một track.', 'info');
            return;
        }
        setEditorState(prev => ({
            tracks: prev.tracks.filter(t => t.id !== trackId),
            clips: prev.clips.filter(c => c.trackId !== trackId)
        }));
    };

    // --- HELPER TO GET MEDIA DURATION ---
    const getMediaDuration = (file: File): Promise<number> => {
        return new Promise((resolve) => {
            if (file.type.startsWith('image/')) {
                 resolve(5); // Default image duration
            } else if (file.type.startsWith('audio/')) {
                const audio = new Audio(URL.createObjectURL(file));
                audio.onloadedmetadata = () => {
                     resolve(audio.duration);
                };
                audio.onerror = () => resolve(10); // Fallback
            } else if (file.type.startsWith('video/')) {
                const video = document.createElement('video');
                video.preload = 'metadata';
                video.onloadedmetadata = () => {
                    resolve(video.duration);
                };
                video.onerror = () => resolve(10); // Fallback
                video.src = URL.createObjectURL(file);
            } else {
                resolve(10); // Default fallback
            }
        });
    };

    // --- ACTIONS ---
    const addClip = (asset: MockAsset) => {
        const newClipId = `clip_${Date.now()}`;
        
        setEditorState(prev => {
            let newTracks = [...prev.tracks];
            let targetTrackId = 1;
            const clipDuration = asset.duration;
            
            // Try to find a free track at currentTime
            const foundTrackId = findAvailableTrack(newTracks, prev.clips, currentTime, clipDuration);
            
            if (foundTrackId !== null) {
                targetTrackId = foundTrackId;
            } else {
                // No free track found, create a new one
                targetTrackId = newTracks.length > 0 ? Math.max(...newTracks.map(t => t.id)) + 1 : 1;
                newTracks.push({ id: targetTrackId, visible: true, locked: false, muted: false, height: 64 });
            }

            const newClip: Clip = {
                id: newClipId, type: asset.type, name: asset.name, src: asset.src, thumbnail: asset.thumbnail,
                start: currentTime, duration: clipDuration, sourceDuration: asset.duration, offset: 0, trackId: targetTrackId,
                x: 50, y: 50, scale: 100, rotation: 0, opacity: 100, flipH: false, flipV: false,
                speed: 1.0, volume: 100, text: asset.type === 'text' ? 'Văn bản mới' : undefined,
                style: asset.type === 'text' ? DEFAULT_TEXT_STYLE : undefined
            };

            return { tracks: newTracks, clips: [...prev.clips, newClip] };
        });

        setSelectedClipId(newClipId);
        addToast(`Đã thêm ${asset.name}`, 'success');
    };
    
    const handleAddTextPreset = (preset: typeof TEXT_PRESETS[0]) => {
        const newClipId = `txt_${Date.now()}`;
        setEditorState(prev => {
            let newTracks = [...prev.tracks];
            let targetTrackId = 1;
            const clipDuration = 5; // Default text duration
            
            const foundTrackId = findAvailableTrack(newTracks, prev.clips, currentTime, clipDuration);
            
            if (foundTrackId !== null) {
                targetTrackId = foundTrackId;
            } else {
                targetTrackId = newTracks.length > 0 ? Math.max(...newTracks.map(t => t.id)) + 1 : 1;
                newTracks.push({ id: targetTrackId, visible: true, locked: false, muted: false, height: 64 });
            }

            const newClip: Clip = {
                id: newClipId, type: 'text', name: preset.name,
                start: currentTime, duration: clipDuration, offset: 0, trackId: targetTrackId,
                x: 50, y: 50, scale: 100, rotation: 0, opacity: 100, flipH: false, flipV: false,
                text: preset.name, 
                style: { ...DEFAULT_TEXT_STYLE, ...preset.style }
            };
            return { tracks: newTracks, clips: [...prev.clips, newClip] };
        });
        setSelectedClipId(newClipId);
        addToast(`Đã thêm kiểu chữ ${preset.name}`, 'success');
    };


    const centerSelectedClip = () => {
        updateSelectedClip({ x: 50, y: 50 });
        addToast('Đã canh giữa clip', 'success');
    };

    const deleteSelectedClip = () => {
        if (!selectedClipId) return;
        const clip = clips.find(c => c.id === selectedClipId);
        const track = clip ? tracks.find(t => t.id === clip.trackId) : null;
        if (track?.locked) {
            addToast('Track đã bị khóa.', 'info');
            return;
        }
        setEditorState(prev => ({ ...prev, clips: prev.clips.filter(c => c.id !== selectedClipId) }));
        setSelectedClipId(null);
    };
    
    const deleteClipById = (clipId: string) => {
        const clip = clips.find(c => c.id === clipId);
        const track = clip ? tracks.find(t => t.id === clip.trackId) : null;
        if (track?.locked) {
            addToast('Track đã bị khóa.', 'info');
            return;
        }
        setEditorState(prev => ({ ...prev, clips: prev.clips.filter(c => c.id !== clipId) }));
        if (selectedClipId === clipId) {
            setSelectedClipId(null);
        }
        addToast('Đã xóa lớp văn bản.', 'success');
    };

    const splitClip = () => {
        if (!selectedClipId) return;
        const clip = clips.find(c => c.id === selectedClipId);
        if (!clip) return;
        const track = tracks.find(t => t.id === clip.trackId);
        if (track?.locked) {
            addToast('Track đã bị khóa.', 'info');
            return;
        }
        
        if (currentTime > clip.start && currentTime < clip.start + clip.duration) {
            const splitPoint = currentTime - clip.start;
            const newDuration1 = splitPoint;
            const newDuration2 = clip.duration - splitPoint;
            
            const clip1 = { ...clip, duration: newDuration1 };
            const clip2 = { ...clip, id: `clip_${Date.now()}_2`, start: currentTime, duration: newDuration2, offset: clip.offset + splitPoint };
            
            setEditorState(prev => ({ ...prev, clips: prev.clips.map(c => c.id === clip.id ? clip1 : c).concat(clip2) }));
            setSelectedClipId(clip2.id);
            addToast('Đã cắt clip', 'success');
        }
    };

    const copyClip = () => {
        if (!selectedClipId) return;
        const clip = clips.find(c => c.id === selectedClipId);
        if (!clip) return;
        
        let targetStart = clip.start + clip.duration;
        
        setEditorState(prev => {
            let newTracks = [...prev.tracks];
            let finalTargetTrack = clip.trackId;
            let finalStart = clip.start + clip.duration;
            
            // Check collision on same track
            const collision = prev.clips.some(c => c.trackId === finalTargetTrack && (c.start < finalStart + clip.duration && c.start + c.duration > finalStart));
            
            if (collision) {
                const freeId = findAvailableTrack(newTracks, prev.clips, finalStart, clip.duration);
                if (freeId !== null) {
                    finalTargetTrack = freeId;
                } else {
                    finalTargetTrack = newTracks.length > 0 ? Math.max(...newTracks.map(t => t.id)) + 1 : 1;
                    newTracks.push({ id: finalTargetTrack, visible: true, locked: false, muted: false, height: 64 });
                }
            }
            
            const newClip = { ...clip, id: `clip_${Date.now()}_copy`, start: finalStart, trackId: finalTargetTrack };
            return { tracks: newTracks, clips: [...prev.clips, newClip] };
        });
    };

    const handleClipMouseDown = (e: React.MouseEvent, clip: Clip) => {
        e.preventDefault();
        e.stopPropagation();
        const track = tracks.find(t => t.id === clip.trackId);
        if (track?.locked) return;
        
        setSelectedClipId(clip.id);
        setTimelineAction({
            type: 'move',
            clipId: clip.id,
            startX: e.clientX,
            initialStart: clip.start,
            initialDuration: clip.duration,
            initialTrackId: clip.trackId
        });
    };
    
    const handleTimelineResizeStart = (e: React.MouseEvent, clip: Clip, handle: 'left' | 'right') => {
        e.preventDefault();
        e.stopPropagation();
        const track = tracks.find(t => t.id === clip.trackId);
        if (track?.locked) return;

        setSelectedClipId(clip.id);
        setTimelineAction({
            type: 'resize',
            clipId: clip.id,
            handle: handle,
            startX: e.clientX,
            initialStart: clip.start,
            initialDuration: clip.duration,
            initialTrackId: clip.trackId
        });
    };

    const renderCanvasContent = (clip: Clip) => {
        const clipPath = clip.crop ? `inset(${clip.crop.top}% ${clip.crop.right}% ${clip.crop.bottom}% ${clip.crop.left}%)` : undefined;
        
        // Apply animation style if set
        const animationStyle = clip.animation ? { animation: clip.animation } : {};
        
        if (clip.type === 'video') {
            return (
                <div 
                    className="w-full h-full flex items-center justify-center bg-black overflow-hidden rounded-inherit" 
                    style={{ clipPath, ...animationStyle }}
                >
                    <video
                        ref={el => {
                            if (el) videoRefs.current.set(clip.id, el);
                            else videoRefs.current.delete(clip.id);
                        }}
                        src={clip.src}
                        className="w-full h-full object-fill"
                        style={{
                            borderRadius: clip.borderRadius ? `${clip.borderRadius}px` : undefined
                        }}
                        muted={true} 
                        playsInline
                    />
                </div>
            );
        }
        if (clip.type === 'image') {
             return (
                <img 
                    src={clip.src || clip.thumbnail} 
                    className="w-full h-full object-fill" 
                    alt="" 
                    style={{
                        borderRadius: clip.borderRadius ? `${clip.borderRadius}px` : undefined,
                        clipPath,
                        ...animationStyle
                    }}
                />
             );
        }
        if (clip.type === 'effect') {
             return (
                 <div className={`w-full h-full ${clip.effectClass}`}></div>
             )
        }
        return null;
    }
    
    // --- REAL EXPORT LOGIC ---
    const handleExport = async () => {
        if (isProcessing || !exportCanvasRef.current || !loggedInUser) return;
        
        // Credit check
        const cost = tool.creditCost;
        const freshUser = findUserInTree(userState.allUsers, loggedInUser.id);
        if (!freshUser || freshUser.creditBalance < cost) {
            addToast('Không đủ Credit để xuất video.', 'error');
            return;
        }

        setIsProcessing(true);
        
        // Deduct credits
        const creditResult = await handleUseToolCredit(loggedInUser.id, { ...tool, creditCost: cost });
        if (!creditResult.success) {
            setIsProcessing(false);
            return;
        }
        
        // Reset cancellation flag
        isExportCancelledRef.current = false;

        try {
            const canvas = exportCanvasRef.current;
            // Use 30 FPS for recording
            const stream = canvas.captureStream(30); 
            
            let mimeType = 'video/webm;codecs=vp9';
            let extension = 'webm';

            if (exportSettings.format === 'mp4') {
                if (MediaRecorder.isTypeSupported('video/mp4')) {
                    mimeType = 'video/mp4';
                    extension = 'mp4';
                } else {
                     console.warn('Browser does not support video/mp4 recording directly. Falling back to WebM.');
                     mimeType = 'video/webm;codecs=vp9';
                     extension = 'webm'; 
                }
            }

            const options = { mimeType };
            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder; // Store ref for cancellation

            const chunks: Blob[] = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };
            
            mediaRecorder.onstop = () => {
                if (isExportCancelledRef.current) {
                    return;
                }

                const blob = new Blob(chunks, { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `video-export-${Date.now()}.${extension}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                // --- SAVE HISTORY ---
                const thumbnail = exportCanvasRef.current?.toDataURL('image/jpeg', 0.5) || '';
                const newResult: GenerationResult = {
                    taskId: `vid_${Date.now()}`,
                    date: new Date().toLocaleDateString('vi-VN'),
                    prompt: `Video Project (${formatTime(projectDuration)})`,
                    images: [thumbnail], 
                    settings: {
                        aspectRatio: 'custom', 
                        quantity: 1,
                        generationMode: 'Chất lượng',
                        customRatio: null,
                        videoState: JSON.stringify({ clips, tracks, projectDuration })
                    },
                    cost: tool.creditCost,
                    balanceAfter: freshUser ? freshUser.creditBalance - tool.creditCost : 0,
                    creationTime: new Date().toLocaleTimeString(),
                };
                if (loggedInUser) handleSetGenerationHistory(loggedInUser.id, newResult);

                setIsProcessing(false);
                setIsExporting(false);
                setShowExportModal(false);
                addToast('Xuất video thành công và đã lưu lịch sử!', 'success');
            };
            
            mediaRecorder.start();
            setIsExporting(true);
            
            // Automate Playback for Recording
            setCurrentTime(0);
            setIsPlaying(true);
            
            // Wait for duration (plus small buffer)
            const durationMs = projectDuration * 1000;
            
            exportTimeoutRef.current = setTimeout(() => {
                 if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                     mediaRecorderRef.current.stop();
                 }
                 setIsPlaying(false);
            }, durationMs + 1000); // Buffer

        } catch (err) {
            console.error("Export error:", err);
            setIsProcessing(false);
            setIsExporting(false);
            addToast('Lỗi khi xuất video.', 'error');
        }
    };

    const handleCancelExport = async () => {
        if (isProcessing) {
            // 1. Set cancellation flag
            isExportCancelledRef.current = true;

            // 2. Stop Timer
            if (exportTimeoutRef.current) {
                clearTimeout(exportTimeoutRef.current);
                exportTimeoutRef.current = null;
            }

            // 3. Stop Recorder
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }

            // 4. Stop Playback
            setIsPlaying(false);
            setIsProcessing(false);
            setIsExporting(false);

            // 5. Refund Credits
             if (loggedInUser) {
                const freshUser = findUserInTree(userState.allUsers, loggedInUser.id);
                 if(freshUser) {
                     await handleUseToolCredit(freshUser.id, { ...tool, creditCost: -tool.creditCost });
                     addToast('Đã hủy xuất video và hoàn lại Credit.', 'info');
                 }
            }
        }
        setShowExportModal(false);
    };

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files) as File[];
            files.forEach(async (file) => {
                let type: ClipType = 'image';
                let thumbnail = '';
                let duration = 5;

                if (file.type.startsWith('video/')) {
                    type = 'video';
                    duration = await getMediaDuration(file);
                    thumbnail = await generateVideoThumbnail(file);
                } else if (file.type.startsWith('audio/')) {
                    type = 'audio';
                    duration = await getMediaDuration(file);
                } else if (file.type.startsWith('image/')) {
                    type = 'image';
                    duration = 5;
                    thumbnail = URL.createObjectURL(file);
                }

                const newAsset: MockAsset = {
                    id: `asset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                    type,
                    src: URL.createObjectURL(file),
                    name: file.name,
                    duration,
                    thumbnail: thumbnail || undefined
                };
                setUserMedia(prev => [...prev, newAsset]);
            });
            addToast(`Đã nhập ${files.length} file.`, 'success');
        }
        if (e.target) e.target.value = '';
    };

    const handleToggleTrack = (trackId: number, property: 'visible' | 'locked' | 'muted') => {
        setEditorState(prev => ({
            ...prev,
            tracks: prev.tracks.map(t => t.id === trackId ? { ...t, [property]: !t[property] } : t)
        }));
    };

    const getTrackColor = (type: ClipType) => {
        switch (type) {
            case 'video': return 'bg-blue-900/50 border-blue-500';
            case 'image': return 'bg-purple-900/50 border-purple-500';
            case 'text': return 'bg-yellow-900/50 border-yellow-500';
            case 'audio': return 'bg-green-900/50 border-green-500';
            case 'effect': return 'bg-pink-900/50 border-pink-500';
            default: return 'bg-gray-800 border-gray-600';
        }
    };

    const SidebarTab: React.FC<{ id: 'media' | 'text' | 'effects' | 'ai', icon: React.FC<{className?: string}>, label: string }> = ({ id, icon: Icon, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`w-full aspect-square flex flex-col items-center justify-center gap-1 transition-colors border-l-2 ${activeTab === id ? 'bg-[#1f1f1f] text-indigo-400 border-indigo-500' : 'text-gray-500 hover:text-gray-300 border-transparent'}`}
        >
            <Icon className="h-5 w-5" />
            <span className="text-[9px] font-medium">{label}</span>
        </button>
    );

    return (
        <div className="h-screen w-full bg-[#121212] text-gray-300 flex flex-col overflow-hidden font-sans select-none">
            <style dangerouslySetInnerHTML={{ __html: ANIMATION_STYLES }} />
            
            {/* HIDDEN EXPORT CANVAS */}
            <canvas 
                ref={exportCanvasRef}
                width={canvasDimensions.width}
                height={canvasDimensions.height}
                className="hidden"
            />

            {/* HISTORY MODAL */}
             <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Lịch sử Dự án Video" size="lg" hideFooter>
                <div className="max-h-[60vh] overflow-y-auto p-1 space-y-3">
                    {historyItems.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            <ClockIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>Chưa có lịch sử dự án nào.</p>
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
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleLoadProject(item)}
                                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors text-xs font-bold px-3"
                                    >
                                        Tải lại
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteProject(item.taskId)}
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
            
            {/* 1. TOP HEADER */}
            <header className="h-12 bg-[#181818] border-b border-[#000] flex items-center justify-between px-4 shrink-0 z-30">
                 <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate('Kho Tiện Ích')} className="p-2 hover:bg-[#333] rounded-lg transition-colors">
                        <ArrowLeftIcon className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-bold text-white">Trình biên tập Pro (Đa lớp)</span>
                </div>
                <div className="flex items-center gap-4">
                     <CreditBalanceDisplay balance={currentCredits} onAdd={() => onNavigate('Ví Của Tôi')} />
                     <button 
                        onClick={() => setShowHistoryModal(true)}
                        className="p-1.5 text-indigo-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-indigo-900/50"
                        title="Lịch sử"
                     >
                        <ClockIcon className="h-4 w-4" />
                     </button>
                     <button onClick={() => setShowExportModal(true)} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded transition-all shadow-lg shadow-indigo-500/20">
                        Xuất Video
                    </button>
                </div>
            </header>
            
            {/* ... Export Modal ... */}
            {showExportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-[#1e1e1e] rounded-xl p-6 w-96 border border-gray-700">
                        <h3 className="text-lg font-bold text-white mb-4">Xuất Video</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400">Độ phân giải (Dựa theo Canvas: {activePreset.label})</label>
                                <div className="mt-1 p-2 bg-black rounded border border-gray-600 text-sm text-white font-mono">
                                    {activePreset.width} x {activePreset.height}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Định dạng</label>
                                <select value={exportSettings.format} onChange={e => setExportSettings(p => ({...p, format: e.target.value}))} className="w-full mt-1 bg-[#2a2a2a] border border-gray-600 rounded p-2 text-sm text-white">
                                    <option value="webm">WebM (Khuyên dùng)</option>
                                    <option value="mp4">MP4 (Nếu trình duyệt hỗ trợ)</option>
                                    <option value="mp3">MP3 (Chỉ âm thanh)</option>
                                </select>
                                {exportSettings.format === 'mp4' && (
                                    <p className="text-[10px] text-orange-400 mt-1">
                                        Lưu ý: Một số trình duyệt (như Chrome) không hỗ trợ xuất MP4 trực tiếp. Hệ thống sẽ cố gắng xuất WebM và đổi tên file.
                                    </p>
                                )}
                            </div>
                             <div className="bg-indigo-900/20 border border-indigo-500/30 rounded p-3 mt-2">
                                 <p className="text-xs text-indigo-300 flex items-center gap-1.5">
                                     <SparklesIcon className="h-4 w-4 text-yellow-400" /> 
                                     <span>Phí xuất video: <strong className="text-white">{tool.creditCost} Credit</strong></span>
                                 </p>
                                 <p className="text-[10px] text-indigo-400 mt-1 ml-5">
                                     Credit sẽ được trừ khi quá trình xuất bắt đầu.
                                 </p>
                             </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={handleCancelExport} className="px-4 py-2 text-sm bg-gray-700 rounded hover:bg-gray-600">
                                {isProcessing ? 'Dừng & Hủy' : 'Hủy'}
                            </button>
                            <button onClick={handleExport} disabled={isProcessing} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-500 disabled:opacity-50">
                                {isProcessing ? 'Đang ghi hình & Xuất...' : 'Thanh toán & Xuất'}
                            </button>
                        </div>
                        {isProcessing && (
                            <p className="text-xs text-yellow-500 mt-2 text-center">Đang phát lại video để ghi hình. Vui lòng đợi...</p>
                        )}
                    </div>
                </div>
            )}

            <div className="flex flex-1 overflow-hidden">
                
                {/* 2. LEFT SIDEBAR */}
                <nav className="w-16 bg-[#181818] flex flex-col border-r border-black z-20">
                    <SidebarTab id="media" icon={FilmIcon} label="Media" />
                    <SidebarTab id="text" icon={ChatBubbleBottomCenterTextIcon} label="Văn bản" />
                    <SidebarTab id="effects" icon={SparklesIcon} label="Hiệu ứng" />
                    <SidebarTab id="ai" icon={CpuChipSolidIcon} label="Công cụ AI" />
                </nav>

                {/* 3. DRAWER (Resources) */}
                <div className="w-80 bg-[#1f1f1f] flex flex-col border-r border-black shrink-0">
                    <div className="flex-1 overflow-y-auto p-0 space-y-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept="video/*,image/*,audio/*" multiple />
                        
                        {/* ... Media Tab Content ... */}
                        {activeTab === 'media' && (
                            <div className="p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider">Media</h4>
                                    <button onClick={() => fileInputRef.current?.click()} className="p-1 hover:text-white text-gray-400 transition-colors"><PlusIcon className="h-4 w-4"/></button>
                                </div>
                                <div className="flex gap-2 mb-2 overflow-x-auto pb-2 scrollbar-none">
                                    <button onClick={() => setMediaFilter('all')} className={`px-3 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${mediaFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>Tất cả</button>
                                    <button onClick={() => setMediaFilter('video')} className={`px-3 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${mediaFilter === 'video' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>Video</button>
                                    <button onClick={() => setMediaFilter('image')} className={`px-3 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${mediaFilter === 'image' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>Ảnh</button>
                                    <button onClick={() => setMediaFilter('audio')} className={`px-3 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${mediaFilter === 'audio' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>Âm thanh</button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    {[...userMedia, ...STOCK_MEDIA].filter(m => mediaFilter === 'all' || m.type === mediaFilter).map(asset => (
                                        <div key={asset.id} onClick={() => addClip(asset)} className="group relative aspect-square bg-gray-800 rounded-lg overflow-hidden cursor-pointer border border-transparent hover:border-indigo-500 transition-all">
                                            {asset.type === 'audio' ? (
                                                 <div className="w-full h-full flex flex-col items-center justify-center p-2">
                                                    <MusicalNoteIcon className="h-8 w-8 text-gray-500 mb-2" />
                                                    <span className="text-[10px] text-center line-clamp-2 text-gray-400">{asset.name}</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <img src={asset.thumbnail || asset.src} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt={asset.name} />
                                                    <div className="absolute bottom-1 right-1 bg-black/60 px-1 rounded text-[9px] text-white font-mono">{formatTime(asset.duration)}</div>
                                                    {asset.type === 'video' && <div className="absolute top-1 right-1"><VideoIcon className="h-3 w-3 text-white drop-shadow-md"/></div>}
                                                </>
                                            )}
                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <PlusIcon className="h-6 w-6 text-white drop-shadow-lg" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ... Text Tab Content ... */}
                        {activeTab === 'text' && (
                            <div className="p-4 space-y-4">
                                <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider">Văn bản</h4>
                                <div className="space-y-2">
                                    {TEXT_PRESETS.map((preset, i) => (
                                        <button key={i} onClick={() => handleAddTextPreset(preset)} className="w-full p-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-left group transition-all hover:border-gray-500">
                                            <span className="text-sm" style={{ 
                                                fontFamily: preset.style.fontFamily, 
                                                fontWeight: preset.style.fontWeight,
                                                fontStyle: preset.style.fontStyle,
                                                color: preset.style.color || 'white',
                                                textShadow: preset.style.shadowEnabled ? `${preset.style.shadowOffsetX}px ${preset.style.shadowOffsetY}px ${preset.style.shadowBlur}px ${preset.style.shadowColor}` : 'none'
                                            }}>{preset.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ... Effects Tab Content (UPDATED) ... */}
                        {activeTab === 'effects' && (
                             <div className="p-4 space-y-4">
                                <div className="flex bg-gray-800 rounded-lg p-1 mb-4">
                                    <button onClick={() => setEffectTab('filters')} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${effectTab === 'filters' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}>Bộ lọc</button>
                                    <button onClick={() => setEffectTab('motion')} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${effectTab === 'motion' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>Hoạt ảnh</button>
                                </div>

                                {effectTab === 'filters' && (
                                    <div className="space-y-6">
                                        {EFFECT_PRESETS.map((category) => (
                                            <div key={category.category}>
                                                <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-3">{category.category}</h4>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {category.items.map((effect) => (
                                                        <button 
                                                            key={effect.name} 
                                                            onClick={() => handleApplyEffect(effect)}
                                                            className="relative h-20 rounded-lg overflow-hidden group"
                                                        >
                                                            <div className={`absolute inset-0 bg-gradient-to-br ${effect.class}`}></div>
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
                                                                <span className="text-xs font-bold text-white text-center px-1 drop-shadow-md">{effect.name}</span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {effectTab === 'motion' && (
                                    <div className="space-y-6">
                                        <div className="p-3 bg-indigo-900/20 border border-indigo-500/30 rounded-lg">
                                            <p className="text-xs text-indigo-200 mb-2">
                                                <span className="font-bold">Lưu ý:</span> Hoạt ảnh được áp dụng trực tiếp vào Clip đang chọn (Video/Ảnh/Chữ).
                                                <br/>Không tạo layer mới trên Timeline.
                                            </p>
                                            {selectedClip ? (
                                                <div className="flex items-center justify-between bg-black/40 p-2 rounded">
                                                    <span className="text-xs font-bold text-white truncate max-w-[120px]">{selectedClip.name}</span>
                                                    {selectedClip.animation && (
                                                        <button onClick={handleRemoveAnimation} className="text-[10px] text-red-400 hover:text-red-300">Gỡ hiệu ứng</button>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-500 italic">Chưa chọn clip nào.</p>
                                            )}
                                        </div>

                                        {ANIMATION_PRESETS.map((category) => (
                                            <div key={category.category}>
                                                <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-3">{category.category}</h4>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {category.items.map((anim) => (
                                                        <button 
                                                            key={anim.name} 
                                                            onClick={() => handleApplyAnimation(anim)}
                                                            disabled={!selectedClipId}
                                                            className={`relative h-12 rounded-lg overflow-hidden group border border-gray-700 hover:border-indigo-500 transition-all ${!selectedClipId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                        >
                                                            <div className="absolute inset-0 bg-gray-800 group-hover:bg-gray-700 transition-colors flex items-center justify-center">
                                                                <span className="text-xs font-medium text-gray-300 group-hover:text-white text-center px-1">{anim.name}</span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'ai' && (
                            <div className="p-4 flex flex-col items-center justify-center h-64 text-center text-gray-500">
                                <CpuChipSolidIcon className="h-12 w-12 mb-3 opacity-50" />
                                <p className="text-sm">Tính năng AI đang được phát triển.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. MAIN PREVIEW & TIMELINE AREA */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#121212]">
                    
                    {/* CANVAS AREA */}
                    <div ref={previewContainerRef} className="flex-1 flex items-center justify-center relative overflow-hidden bg-[#0f172a] p-8" onMouseDown={handleCanvasMouseDown}>
                         <div 
                            ref={canvasRef}
                            className="relative bg-black shadow-2xl overflow-hidden flex-shrink-0" // FIX 3: flex-shrink-0
                            style={{ 
                                ...canvasStyle, 
                                transform: `scale(${Math.max(0.1, fitScale)})`, 
                                transformOrigin: 'center', 
                                cursor: isEyedropperActive ? 'crosshair' : 'default' 
                            }}
                        >
                            {visibleClips.map(clip => (
                                <div
                                    key={clip.id}
                                    id={`canvas-clip-${clip.id}`}
                                    onMouseDown={(e) => handleTransformMouseDown(e, 'move', clip.id)}
                                    className={`absolute group ${selectedClipId === clip.id ? (isCropping ? 'z-20' : 'ring-2 ring-indigo-500 z-10') : 'z-0'}`}
                                    style={{
                                        left: `${clip.x}%`,
                                        top: `${clip.y}%`,
                                        width: clip.type === 'text' ? 'auto' : `${clip.scale}%`,
                                        height: clip.type === 'text' ? 'auto' : (clip.type === 'video' || clip.type === 'image' ? 'auto' : `${clip.scale}%`),
                                        transform: `translate(-50%, -50%) rotate(${clip.rotation}deg) scale(${clip.flipH ? -1 : 1}, ${clip.flipV ? -1 : 1})`,
                                        opacity: clip.opacity / 100,
                                        mixBlendMode: clip.mixBlendMode,
                                        borderRadius: clip.borderRadius ? `${clip.borderRadius}px` : undefined,
                                        border: clip.borderWidth ? `${clip.borderWidth}px solid ${clip.borderColor}` : undefined,
                                        boxShadow: clip.shadowBlur ? `${clip.shadowOffsetX}px ${clip.shadowOffsetY}px ${clip.shadowBlur}px ${clip.shadowColor}` : undefined,
                                        filter: `brightness(${clip.brightness}%) contrast(${clip.contrast}%) saturate(${clip.saturation}%) sepia(${clip.sepia}%) blur(${clip.blur}px) hue-rotate(${clip.hueRotate}deg) invert(${clip.invert}%)`,
                                    }}
                                >
                                     {clip.type === 'text' ? (
                                         editingTextClipId === clip.id ? (
                                            <AutosizeTextarea 
                                                clip={clip} 
                                                canvasHeight={canvasDimensions.height}
                                                updateText={(t) => updateSelectedClip({ text: t })} 
                                                onBlur={() => setEditingTextClipId(null)} 
                                            />
                                         ) : (
                                            <div onDoubleClick={() => setEditingTextClipId(clip.id)} className="cursor-text min-w-[50px] min-h-[20px]">
                                                 <CanvasText clip={clip} canvasDimensions={canvasDimensions} />
                                            </div>
                                         )
                                     ) : (
                                        renderCanvasContent(clip)
                                     )}

                                     {/* Effect Overlay */}
                                     {clip.type === 'effect' && (
                                         <div className={`absolute inset-0 ${clip.effectClass}`}></div>
                                     )}

                                     {/* Resize/Rotate Handles for Selected Clip (Only if NOT cropping) */}
                                     {selectedClipId === clip.id && !isCropping && (
                                        <>
                                            <div className="absolute -top-3 -left-3 w-3 h-3 bg-white border border-indigo-500 rounded-full cursor-nwse-resize" onMouseDown={(e) => handleTransformMouseDown(e, 'resize', clip.id)} />
                                            <div className="absolute -top-3 -right-3 w-3 h-3 bg-white border border-indigo-500 rounded-full cursor-nesw-resize" onMouseDown={(e) => handleTransformMouseDown(e, 'resize', clip.id)} />
                                            <div className="absolute -bottom-3 -left-3 w-3 h-3 bg-white border border-indigo-500 rounded-full cursor-nesw-resize" onMouseDown={(e) => handleTransformMouseDown(e, 'resize', clip.id)} />
                                            <div className="absolute -bottom-3 -right-3 w-3 h-3 bg-white border border-indigo-500 rounded-full cursor-nwse-resize" onMouseDown={(e) => handleTransformMouseDown(e, 'resize', clip.id)} />
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border border-indigo-500 rounded-full cursor-grab flex items-center justify-center" onMouseDown={(e) => handleTransformMouseDown(e, 'rotate', clip.id)}>
                                                <ArrowPathIcon className="w-3 h-3 text-indigo-600" />
                                            </div>
                                        </>
                                     )}

                                     {/* CROP HANDLES (Only if isCropping is true) */}
                                     {selectedClipId === clip.id && isCropping && (
                                        <div className="absolute inset-0 pointer-events-none">
                                            <div className="absolute inset-0 border-2 border-yellow-500 border-dashed pointer-events-none"></div>
                                            
                                            {/* Corners */}
                                            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-yellow-500 cursor-nwse-resize pointer-events-auto" onMouseDown={(e) => handleTransformMouseDown(e, 'crop-tl', clip.id)} />
                                            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-yellow-500 cursor-nesw-resize pointer-events-auto" onMouseDown={(e) => handleTransformMouseDown(e, 'crop-tr', clip.id)} />
                                            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-yellow-500 cursor-nesw-resize pointer-events-auto" onMouseDown={(e) => handleTransformMouseDown(e, 'crop-bl', clip.id)} />
                                            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-yellow-500 cursor-nwse-resize pointer-events-auto" onMouseDown={(e) => handleTransformMouseDown(e, 'crop-br', clip.id)} />
                                            
                                            {/* Sides */}
                                            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-3 bg-yellow-500 cursor-ns-resize pointer-events-auto rounded-full" onMouseDown={(e) => handleTransformMouseDown(e, 'crop-t', clip.id)} />
                                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-3 bg-yellow-500 cursor-ns-resize pointer-events-auto rounded-full" onMouseDown={(e) => handleTransformMouseDown(e, 'crop-b', clip.id)} />
                                            <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-6 bg-yellow-500 cursor-ew-resize pointer-events-auto rounded-full" onMouseDown={(e) => handleTransformMouseDown(e, 'crop-l', clip.id)} />
                                            <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-6 bg-yellow-500 cursor-ew-resize pointer-events-auto rounded-full" onMouseDown={(e) => handleTransformMouseDown(e, 'crop-r', clip.id)} />
                                        </div>
                                     )}
                                </div>
                            ))}
                            
                             {/* Canvas Overlay for Eyedropper */}
                            {isEyedropperActive && (
                                <div 
                                    className="absolute inset-0 z-50" 
                                    onClick={handleEyedropperClick}
                                    style={{ cursor: 'crosshair' }}
                                >
                                     <canvas ref={hiddenCanvasRef} width={canvasDimensions.width} height={canvasDimensions.height} className="hidden" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* TIMELINE AREA */}
                    <div className="h-72 bg-[#181818] border-t border-gray-800 flex flex-col select-none">
                        {/* ... Timeline Toolbar ... */}
                        <div className="h-10 border-b border-gray-800 flex items-center justify-between px-4 bg-[#1f1f1f]">
                             <div className="flex items-center gap-2">
                                <button onClick={() => setIsPlaying(!isPlaying)} className="p-1 text-white hover:text-indigo-400 transition-colors">{isPlaying ? <PauseIcon className="h-5 w-5"/> : <PlayIcon className="h-5 w-5"/>}</button>
                                <button onClick={() => { setIsPlaying(false); setCurrentTime(0); }} className="p-1 text-gray-400 hover:text-white transition-colors"><StopIcon className="h-4 w-4"/></button>
                                <span className="text-xs font-mono text-indigo-400 ml-2 bg-black px-2 py-0.5 rounded border border-gray-700 min-w-[80px] text-center">{formatTime(currentTime)}</span>
                                <div className="h-4 w-px bg-gray-700 mx-2"></div>
                                <button onClick={undo} disabled={!canUndo} className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"><BackwardIcon className="h-4 w-4"/></button>
                                <button onClick={redo} disabled={!canRedo} className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"><ForwardIcon className="h-4 w-4"/></button>
                                <div className="h-4 w-px bg-gray-700 mx-2"></div>
                                <button onClick={splitClip} disabled={!selectedClipId} className="p-1 text-gray-400 hover:text-white disabled:opacity-30" title="Cắt"><ScissorsIcon className="h-4 w-4"/></button>
                                <button onClick={deleteSelectedClip} disabled={!selectedClipId} className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30" title="Xóa"><TrashIcon className="h-4 w-4"/></button>
                                <button onClick={copyClip} disabled={!selectedClipId} className="p-1 text-gray-400 hover:text-white disabled:opacity-30" title="Nhân bản"><Square2StackIcon className="h-4 w-4"/></button>
                                <div className="h-4 w-px bg-gray-700 mx-2"></div>
                                <button onClick={centerSelectedClip} disabled={!selectedClipId} className="p-1 text-gray-400 hover:text-white disabled:opacity-30" title="Canh giữa"><CenterAlignmentIcon className="h-4 w-4"/></button>
                             </div>
                             <div className="flex items-center gap-3">
                                <button onClick={() => setIsMagnetEnabled(!isMagnetEnabled)} className={`p-1 rounded ${isMagnetEnabled ? 'text-indigo-400 bg-indigo-900/30' : 'text-gray-400 hover:text-white'}`} title="Bật/Tắt Hít (Magnet)"><MagnetIcon className="h-4 w-4"/></button>
                                <button onClick={handleFitTimeline} className="p-1 text-gray-400 hover:text-white" title="Vừa màn hình (Fit)"><ArrowsRightLeftIcon className="h-4 w-4" /></button>
                                <button onClick={() => setZoomLevel(Math.max(0.1, zoomLevel - 5))} className="text-gray-400 hover:text-white text-xs">-</button>
                                <input type="range" min="0.1" max="100" step="0.1" value={zoomLevel} onChange={e => setZoomLevel(Number(e.target.value))} className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-gray-400"/>
                                <button onClick={() => setZoomLevel(Math.min(100, zoomLevel + 5))} className="text-gray-400 hover:text-white text-xs">+</button>
                                <button onClick={handleAddTrack} className="p-1 text-gray-400 hover:text-white" title="Thêm track"><PlusIcon className="h-4 w-4"/></button>
                             </div>
                        </div>

                        <div className="flex-1 flex overflow-hidden relative" ref={timelineRef}>
                            {/* Track Headers */}
                            <div className="w-40 flex-shrink-0 bg-[#1f1f1f] border-r border-gray-800 pt-6 z-20 relative shadow-xl">
                                {sortedTracksForTimeline.map(track => (
                                    <div 
                                        key={track.id} 
                                        className={`border-b border-gray-800 px-2 flex items-center justify-between group hover:bg-[#2a2a2a] transition-colors ${draggingTrackId === track.id ? 'opacity-50 border-indigo-500' : ''}`} 
                                        style={{ height: track.height }}
                                        draggable
                                        onDragStart={(e) => handleTrackDragStart(e, track.id)}
                                        onDragOver={handleTrackDragOver}
                                        onDrop={(e) => handleTrackDrop(e, track.id)}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden cursor-grab active:cursor-grabbing">
                                            <Bars3Icon className="h-3 w-3 text-gray-600 flex-shrink-0"/>
                                            <span className="text-[10px] font-bold text-gray-500">T{track.id}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleToggleTrack(track.id, 'visible')} className={`p-1 ${track.visible ? 'text-gray-400 hover:text-white' : 'text-gray-600'}`}>{track.visible ? <EyeIcon className="h-3 w-3"/> : <EyeSlashIcon className="h-3 w-3"/>}</button>
                                            <button onClick={() => handleToggleTrack(track.id, 'muted')} className={`p-1 ${!track.muted ? 'text-gray-400 hover:text-white' : 'text-red-500'}`}>{!track.muted ? <SpeakerWaveIcon className="h-3 w-3"/> : <SpeakerXMarkIcon className="h-3 w-3"/>}</button>
                                            <button onClick={() => handleToggleTrack(track.id, 'locked')} className={`p-1 ${!track.locked ? 'text-gray-400 hover:text-white' : 'text-yellow-500'}`}>{!track.locked ? <LockOpenIcon className="h-3 w-3"/> : <LockClosedIcon className="h-3 w-3"/>}</button>
                                            {tracks.length > 1 && <button onClick={() => handleDeleteTrack(track.id)} className="p-1 text-gray-600 hover:text-red-500"><TrashIcon className="h-3 w-3"/></button>}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Tracks & Clips */}
                            <div className="flex-1 overflow-auto bg-[#121212] relative" ref={timelineScrollRef}>
                                <div style={{ width: projectDuration * zoomLevel, height: '100%' }}>
                                    <TimeRuler duration={projectDuration} zoom={zoomLevel} currentTime={currentTime} />
                                    
                                    {/* Interactive Layer for Ruler Scrubbing */}
                                    <div 
                                        className="absolute top-0 left-0 w-full h-6 z-20 cursor-pointer"
                                        onMouseDown={handleRulerMouseDown}
                                    ></div>

                                    {/* Snap Line */}
                                    {snapLine !== null && (
                                        <div className="absolute top-6 bottom-0 w-px bg-yellow-400 z-30 pointer-events-none" style={{ left: snapLine * zoomLevel }}></div>
                                    )}
                                    
                                    {/* Track Rows */}
                                    {sortedTracksForTimeline.map(track => (
                                        <div key={track.id} className="relative border-b border-gray-800/50 w-full group" style={{ height: track.height }}>
                                            {clips.filter(c => c.trackId === track.id).map(clip => {
                                                const isSelected = selectedClipId === clip.id;
                                                const clipLeft = clip.start * zoomLevel;
                                                const clipWidth = clip.duration * zoomLevel;
                                                const trackColor = getTrackColor(clip.type);

                                                return (
                                                    <div
                                                        key={clip.id}
                                                        className={`absolute top-1 bottom-1 rounded-md overflow-hidden cursor-grab active:cursor-grabbing border border-opacity-20 transition-colors ${trackColor} ${isSelected ? 'border-white border-opacity-100 ring-1 ring-white z-10 shadow-md' : 'border-black border-opacity-20 hover:brightness-110'}`}
                                                        style={{ left: clipLeft, width: clipWidth }}
                                                        onMouseDown={(e) => handleClipMouseDown(e, clip)}
                                                        onClick={(e) => { e.stopPropagation(); setSelectedClipId(clip.id); }}
                                                    >
                                                        <div className="h-full w-full flex flex-col px-2 justify-center relative">
                                                             {/* Waveform Background for Audio */}
                                                             {clip.type === 'audio' && (
                                                                <div className="absolute inset-0 opacity-30 pointer-events-none">
                                                                     <WaveformCanvas color="#ffffff" />
                                                                </div>
                                                             )}
                                                            <div className="flex items-center gap-1.5 relative z-10 overflow-hidden">
                                                                {clip.type === 'text' && <ChatBubbleBottomCenterTextIcon className="h-3 w-3 text-white/70 flex-shrink-0" />}
                                                                {clip.type === 'video' && <FilmIcon className="h-3 w-3 text-white/70 flex-shrink-0" />}
                                                                {clip.type === 'image' && <PhotoIcon className="h-3 w-3 text-white/70 flex-shrink-0" />}
                                                                {clip.type === 'audio' && <MusicalNoteIcon className="h-3 w-3 text-white/70 flex-shrink-0" />}
                                                                {clip.type === 'effect' && <SparklesIcon className="h-3 w-3 text-white/70 flex-shrink-0" />}
                                                                <span className="text-[10px] font-medium text-white truncate leading-none drop-shadow-sm">{clip.name}</span>
                                                            </div>
                                                        </div>

                                                        {/* Resize Handles */}
                                                        {isSelected && !track.locked && (
                                                            <>
                                                                <div className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize hover:bg-white/30 z-20" onMouseDown={(e) => handleTimelineResizeStart(e, clip, 'left')} />
                                                                <div className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-white/30 z-20" onMouseDown={(e) => handleTimelineResizeStart(e, clip, 'right')} />
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                     {/* Playhead Line in Timeline Area */}
                                     <div className="absolute top-0 bottom-0 w-px bg-indigo-500 pointer-events-none z-30" style={{ left: currentTime * zoomLevel }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. RIGHT INSPECTOR */}
                <aside className="w-72 bg-[#1e1e1e] border-l border-gray-800 flex flex-col h-full z-20 overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-800 bg-[#252526]">
                        <button
                            onClick={() => setRightPanelTab('properties')}
                            disabled={!selectedClipId}
                            className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider transition-colors ${
                                rightPanelTab === 'properties' 
                                ? 'text-white border-b-2 border-indigo-500 bg-[#1e1e1e]' 
                                : 'text-gray-500 hover:text-gray-300'
                            } ${!selectedClipId ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                            Thuộc tính
                        </button>
                        <button
                            onClick={() => setRightPanelTab('canvas')}
                            className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider transition-colors ${
                                rightPanelTab === 'canvas' 
                                ? 'text-white border-b-2 border-indigo-500 bg-[#1e1e1e]' 
                                : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            Dự án & Canvas
                        </button>
                    </div>

                    <div className="flex-1 overflow-hidden relative">
                        {rightPanelTab === 'properties' && selectedClipId && selectedClip ? (
                             <div className="absolute inset-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
                                <div className="p-4 border-b border-gray-800 bg-[#252526] flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Thuộc tính {selectedClip.type}</span>
                                    <button onClick={() => deleteClipById(selectedClipId)} className="text-gray-500 hover:text-red-500 transition-colors"><TrashIcon className="h-4 w-4"/></button>
                                </div>
                                <div className="p-4">
                                    {(selectedClip.type === 'video' || selectedClip.type === 'image') && (
                                        <VideoInspector 
                                            selectedClip={selectedClip} 
                                            updateSelectedClip={updateSelectedClip} 
                                            setEditorState={setEditorState}
                                            canvasDimensions={canvasDimensions} 
                                            isCropping={isCropping}
                                            setIsCropping={setIsCropping}
                                        />
                                    )}
                                    {selectedClip.type === 'audio' && (
                                         <AudioInspector selectedClip={selectedClip} updateSelectedClip={updateSelectedClip} />
                                    )}
                                    {selectedClip.type === 'text' && (
                                        <TextInspector 
                                            selectedClip={selectedClip} 
                                            updateSelectedClip={updateSelectedClip} 
                                            setIsEyedropperActive={setIsEyedropperActive} 
                                            setEditorState={setEditorState} 
                                        />
                                    )}
                                    {selectedClip.type === 'effect' && (
                                        <div className="text-center text-gray-500 text-xs mt-4">
                                            Hiệu ứng này không có thuộc tính tùy chỉnh.
                                        </div>
                                    )}
                                </div>
                             </div>
                        ) : (
                             <div className="absolute inset-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
                                <div className="p-4 border-b border-gray-800 bg-[#252526]">
                                    <h3 className="text-xs font-bold uppercase text-gray-300 tracking-wider">Cài đặt Canvas</h3>
                                </div>
                                <div className="p-4 space-y-6">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-400 mb-2 block">Kích thước (Aspect Ratio)</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {CANVAS_PRESETS.map(preset => (
                                                <button
                                                    key={preset.id}
                                                    onClick={() => setSelectedPresetId(preset.id)}
                                                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${selectedPresetId === preset.id ? 'border-indigo-500 bg-indigo-900/20 text-white' : 'border-gray-700 bg-[#252526] text-gray-400 hover:border-gray-500'}`}
                                                >
                                                    <preset.icon className="h-6 w-6 mb-1.5" />
                                                    <span className="text-[10px] font-bold">{preset.label}</span>
                                                    <span className="text-[9px] text-gray-500">{preset.width}x{preset.height}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="text-xs font-semibold text-gray-400 mb-2 block">Thông tin Dự án</label>
                                        <div className="bg-[#252526] rounded-lg p-3 space-y-3 border border-gray-700 text-xs">
                                             <div className="flex justify-between"><span className="text-gray-500">Thời lượng:</span> <span className="text-white font-mono">{formatTime(projectDuration)}</span></div>
                                             <div className="flex justify-between"><span className="text-gray-500">Số lượng Clip:</span> <span className="text-white font-mono">{clips.length}</span></div>
                                             <div className="flex justify-between"><span className="text-gray-500">Số lượng Track:</span> <span className="text-white font-mono">{tracks.length}</span></div>
                                        </div>
                                    </div>
                                </div>
                             </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default VideoEditor;
