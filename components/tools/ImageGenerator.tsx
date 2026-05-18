
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GoogleGenAI, Modality, GeneratedImage } from '@google/genai';
import { 
    PhotoIcon, VideoIcon, MusicalNoteIcon, StarIcon, AdjustmentsHorizontalIcon, EllipsisHorizontalIcon, 
    DocumentArrowDownIcon, PlusIcon, CpuChipSolidIcon, ArrowPathIcon, MagnifyingGlassIcon, Squares2X2Icon, 
    InformationCircleIcon, XCircleIcon, ClipboardDocumentIcon, AspectRatioMoreIcon, TrashIcon, 
    ArrowsPointingOutIcon, SparklesIcon, AspectRatio11Icon, AspectRatio43Icon, AspectRatio169Icon, 
    AspectRatio34Icon, AspectRatio916Icon, EraserIcon, PaintBrushIcon as ArtIcon, ArrowLeftIcon, ArrowUpTrayIcon,
    CheckCircleIcon, TagIcon, ChevronDownIcon, FilmIcon, BoltIcon
} from '../Icons';
import { useSettings } from '../../features/settings/useSettings';
import { ALL_GEMINI_MODELS, isModelInCategory } from '../../constants';

// Removed local ALL_IMAGE_MODELS to sync with global constants
import { IntegrationTool } from '../../features/settings/types';
import { useAuth } from '../../features/auth/useAuth';
import { useActions } from '../../features/actions/useActions';
import { useToast } from '../../components/ToastProvider';
import { findUserInTree } from '../../services/userService';
import { useUser } from '../../features/users/useUser';
import FormattedNumberInput from '../../components/FormattedNumberInput';
import Modal from '../../components/Modal';
import Tooltip from '../../components/Tooltip';
import { GenerationResult, AspectRatio, ImageQuantity, GenerationMode } from '../../features/users/types';
import { setDpi, processGreenScreenRemoval } from '../../utils/imageProcessing';
import CreditBalanceDisplay from './CreditBalanceDisplay';
import ExpandView from './image-gen/ExpandView';
import ImageEditorView from './image-gen/ImageEditorView';

type PromptMagic = "Tự động" | "Bật" | "Tắt";

// --- DATA STRUCTURE FOR STYLES ---

type StyleCategory = 'Chung' | 'Nghệ thuật' | 'Nhiếp ảnh' | 'Đồ họa & 3D' | 'Màu sắc & Mood' | 'Concept Sáng tạo';

const STYLE_CATEGORIES: Record<StyleCategory, string[]> = {
    'Chung': ['Mặc định', 'Ngẫu nhiên'],
    'Nghệ thuật': [
        'Màu nước', 'Sơn dầu', 'Sơn Acrylic', 'Gouache', 'Phác thảo than chì', 'Vẽ bút chì', 'Minh họa mực', 'Line Art', 'Tranh khắc', 'Phấn màu',
        'Ấn tượng', 'Biểu hiện', 'Lập thể', 'Siêu thực', 'Hiện thực', 'Siêu thực (Hyper)', 'Tối giản (Art)', 'Trừu tượng', 'Pop Art', 'Neo-Noir',
        'Baroque', 'Phục hưng', 'Ukiyo-e', 'Sumi-e', 'Manga', 'Anime', 'Chibi', 'Kawaii', 'Pixel Art', 'Voxel Art', 'Low Poly Art', 'Isometric Art',
        'Vector Art', 'Cyberpunk Art', 'Vaporwave', 'Synthwave', 'Steampunk', 'Fantasy Art', 'Dark Fantasy', 'Hoạt hình Disney', '3D Sculpting (Zbrush)'
    ],
    'Nhiếp ảnh': [
        'Chân dung Studio', 'Beauty Shot', 'Điện ảnh', 'Phim 35mm', 'Bokeh', 'Nhiếp ảnh đường phố', 'Nhiếp ảnh du lịch', 'Nhiếp ảnh tối giản',
        'Nhiếp ảnh sản phẩm', 'Macro', 'Tạp chí Thời trang', 'Bìa Tạp chí', 'HDR', 'Neon', 'Phơi sáng lâu', 'Flycam / Drone', 'Kiến trúc',
        'Lifestyle', 'Tài liệu', 'Đen trắng', 'Ánh sáng tự nhiên', 'Tương phản cao', 'Low-key', 'High-key', 'Đồ ăn', 'Thú cưng'
    ],
    'Đồ họa & 3D': [
        'Đất sét (Clay)', 'Nhiếp ảnh đồ chơi', 'Hoạt hình 3D', 'Phong cách Pixar', 'DreamWorks', 'Đồ chơi nhựa', 'Isometric 3D', 'Low Poly 3D',
        'High Poly', '3D Như thật', 'Unreal Engine', 'Octane Render', 'Redshift Render', 'Stylized 3D', 'Lego', 'Origami', 'Papercraft'
    ],
    'Màu sắc & Mood': [
        'Moody', 'Tông Pastel', 'Rực rỡ (Vibrant)', 'Neon Glow', 'Soft Glow', 'Phim cổ điển', 'Retro 80s', 'Nhật Bản 90s', 'Đơn sắc (Monochrome)',
        'Duotone', 'Tông ấm', 'Tông lạnh', 'Giờ vàng (Golden Hour)', 'Giờ xanh (Blue Hour)', 'Cyber Neon'
    ],
    'Concept Sáng tạo': [
        'Fantasy World', 'Sci-fi', 'Mecha / Robot', 'Thần thoại', 'Trung cổ', 'Hậu tận thế', 'Vũ trụ / Galaxy', 'Kinh dị vũ trụ', 'Thực vật học',
        'Dưới nước', 'Dreamcore', 'Kidcore', 'Cổ tích', 'Kinh dị', 'Zombie', 'Sinh vật huyền bí', 'Thiên thần / Ác quỷ', 'Tâm linh', 'Samurai', 'Ninja'
    ]
};

// Flatten type for state management
type ImageStyle = string; 

const stylePrompts: Record<string, string> = {
    // Chung
    "Mặc định": "",
    "Ngẫu nhiên": "",
     // A. Nghệ thuật
    "Màu nước": "watercolor painting style, wet brush, artistic stains, paper texture, dreamy, soft edges",
    "Sơn dầu": "oil painting style, textured brush strokes, canvas texture, impasto, classic art",
    "Sơn Acrylic": "acrylic painting style, vibrant colors, quick strokes, layered paint",
    "Gouache": "gouache painting style, matte finish, opaque colors, flat design aesthetics",
    "Phác thảo than chì": "charcoal sketch, rough textures, smudge effects, monochromatic, expressive lines",
    "Vẽ bút chì": "pencil drawing, graphite, highly detailed shading, cross-hatching, sketchbook style",
    "Minh họa mực": "ink illustration, high contrast, clean lines, ink wash, comic book style",
    "Line Art": "line art style, clean contour lines, minimalist, no shading, vector look",
    "Tranh khắc": "etching style, engraved look, detailed cross-hatching, vintage print",
    "Phấn màu": "pastel art, soft dusty texture, vibrant chalk colors, blended",
    "Ấn tượng": "impressionism style, monet style, visible brush strokes, focus on light and color",
    "Biểu hiện": "expressionism style, distorted forms, emotional, vivid colors, munch style",
    "Lập thể": "cubism style, picasso style, geometric shapes, fragmented perspective",
    "Siêu thực": "surrealism style, dali style, dreamlike, bizarre combinations, melting objects",
    "Hiện thực": "realism art style, true to life, detailed, academic art",
    "Siêu thực (Hyper)": "hyperrealism art, extremely detailed, almost photographic, painstaking detail",
    "Tối giản (Art)": "minimalism art, simple shapes, negative space, clean, modern",
    "Trừu tượng": "abstract art, non-representational, shapes and colors, kandinsky style",
    "Pop Art": "pop art style, warhol style, comic dots, bold colors, commercial aesthetic",
    "Neo-Noir": "neo-noir art, high contrast, shadows, cynical, dark atmosphere, neon accents",
    "Baroque": "baroque art style, dramatic lighting, grandeur, rich details, caravaggio style",
    "Phục hưng": "renaissance art style, da vinci style, anatomical correctness, sfumato, classical",
    "Ukiyo-e": "ukiyo-e style, japanese woodblock print, flat colors, outlines, hokusai style",
    "Sumi-e": "sumi-e style, japanese ink wash painting, zen, brush strokes, minimal color",
    "Manga": "manga style, black and white, screen tones, dynamic lines, japanese comic",
    "Anime": "anime style, vibrant colors, cel shading, studio ghibli or makoto shinkai style",
    "Chibi": "chibi style, super deformed, cute, big head small body, kawaii",
    "Kawaii": "kawaii art, pastel colors, cute characters, sparkles, adorable",
    "Pixel Art": "pixel art, 16-bit, retro game aesthetic, sharp edges, dithering",
    "Voxel Art": "voxel art, 3d pixel, minecraft style, blocky, isometric",
    "Low Poly Art": "low poly art, geometric facets, flat shading, polygon mesh",
    "Isometric Art": "isometric art, 2.5d view, clean lines, technical drawing style",
    "Vector Art": "vector art, flat colors, clean curves, adobe illustrator style, scalable look",
    "Cyberpunk Art": "cyberpunk art style, high tech low life, neon, mechanical details, dystopian",
    "Vaporwave": "vaporwave aesthetic, retro 80s, glitch art, greek statues, neon pink and blue",
    "Synthwave": "synthwave aesthetic, retrowave, sunset, grid lines, neon, 80s futuristic",
    "Steampunk": "steampunk style, brass, gears, steam power, victorian sci-fi, sepia tones",
    "Fantasy Art": "fantasy art style, magic, mythical, dnd style, highly detailed environment",
    "Dark Fantasy": "dark fantasy art, souls-like, grim, gothic, eldritch, moody",
    "Hoạt hình Disney": "disney animation style, 3d character design, expressive, pixar-like",
    "3D Sculpting (Zbrush)": "zbrush style, digital clay, sculpting details, smooth, anatomical study",

    // B. Nhiếp ảnh
    "Chân dung Studio": "studio portrait photography, professional lighting, rembrandt lighting, crisp detail, bokeh background",
    "Beauty Shot": "beauty photography, macro face, flawless skin, makeup detail, high key",
    "Điện ảnh": "cinematic photography, movie scene, anamorphic lens, color graded, dramatic lighting, wide aspect",
    "Phim 35mm": "35mm film photography, grain, kodak portra, vintage feel, light leaks, analog aesthetic",
    "Bokeh": "bokeh photography, shallow depth of field, blurry background, light orbs, focus on subject",
    "Nhiếp ảnh đường phố": "street photography, candid, urban life, documentary style, leica look",
    "Nhiếp ảnh du lịch": "travel photography, national geographic style, scenic, cultural, vibrant",
    "Nhiếp ảnh tối giản": "minimalist photography, clean composition, negative space, simple subject",
    "Nhiếp ảnh sản phẩm": "product photography, clean background, studio lighting, sharp focus, advertising look",
    "Macro": "macro photography, extreme close up, insect or flower detail, unseen textures",
    "Tạp chí Thời trang": "fashion editorial, vogue style, high fashion, dramatic pose, stylish outfit",
    "Bìa Tạp chí": "magazine cover quality, typography ready, bold composition, celebrity style",
    "HDR": "HDR photography, high dynamic range, vivid details, balanced highlights and shadows",
    "Neon": "neon photography, night city, glowing signs, cyber vibes, reflection",
    "Phơi sáng lâu": "long exposure photography, light trails, silky water, motion blur, night sky",
    "Flycam / Drone": "aerial photography, drone shot, bird's eye view, landscape topography",
    "Kiến trúc": "architectural photography, straight lines, perspective correction, building details, interior design",
    "Lifestyle": "lifestyle photography, natural, candid, everyday life, bright and airy",
    "Tài liệu": "documentary photography, raw, storytelling, journalistic, gritty",
    "Đen trắng": "black and white photography, monochrome, high contrast, ansel adams style",
    "Ánh sáng tự nhiên": "natural light photography, sun rays, window light, soft shadows, organic",
    "Tương phản cao": "high contrast photography, chiaroscuro, deep blacks, bright whites, dramatic",
    "Low-key": "low-key photography, dark background, moody, rim lighting, mysterious",
    "High-key": "high-key photography, bright white background, overexposed look, cheerful, clean",
    "Đồ ăn": "food photography, appetizing, macro details, shallow depth of field, vibrant colors",
    "Thú cưng": "pet photography, cute, animal portrait, furry detail, action shot",

    // C. Đồ họa & 3D
    "Đất sét (Clay)": "clay render, claymation style, plasticine texture, fingerprint details, cute",
    "Nhiếp ảnh đồ chơi": "toy photography, tilt-shift effect, miniature world, plastic texture",
    "Hoạt hình 3D": "3d cartoon style, vibrant colors, smooth shapes, exaggerated features",
    "Phong cách Pixar": "pixar style, disney style, 3d render, cute character, expressive eyes, subsurface scattering",
    "DreamWorks": "dreamworks style, dynamic posing, expressive face, stylized realism",
    "Đồ chơi nhựa": "plastic toy style, glossy finish, mold lines, vivid colors, toy story vibe",
    "Isometric 3D": "isometric 3d render, orthographic view, diorama, clean, sim city style",
    "Low Poly 3D": "low poly 3d render, sharp facets, flat shading, minimalist 3d",
    "High Poly": "high poly 3d render, detailed mesh, smooth curves, photorealistic materials",
    "3D Như thật": "photorealistic 3d render, octane render, ray tracing, global illumination, 8k",
    "Unreal Engine": "unreal engine 5 render, real-time graphics, lumen lighting, nanite detail",
    "Octane Render": "octane render, path tracing, cinematic lighting, realistic materials, glossy",
    "Redshift Render": "redshift render, biased rendering, sharp details, professional cg",
    "Stylized 3D": "stylized 3d, hand painted textures, non-photorealistic, artistic 3d",
    "Lego": "lego style, built from lego bricks, plastic texture, toy blocks",
    "Origami": "origami style, folded paper, paper texture, sharp creases, geometric",
    "Papercraft": "papercraft style, layered paper, cut paper look, shadow depth, handmade feel",

    // D. Màu sắc & Mood
    "Moody": "moody atmosphere, dark tones, emotional, atmospheric fog, cinematic",
    "Tông Pastel": "pastel color palette, soft colors, light pinks and blues, dreamy, sweet",
    "Rực rỡ (Vibrant)": "vibrant colors, saturated, colorful, energetic, popping colors",
    "Neon Glow": "neon glow, fluorescent colors, uv light, glowing edges, cyberpunk vibe",
    "Soft Glow": "soft glow, bloom effect, ethereal, angelic, dreamy lighting",
    "Phim cổ điển": "vintage film look, sepia or faded colors, scratches, nostalgic",
    "Retro 80s": "retro 80s style, synthwave colors, neon grid, vhs aesthetic",
    "Retro 90s": "90s aesthetic, muted colors",
    "Nhật Bản 90s": "90s japanese anime aesthetic, retro city pop, muted colors, soft blur",
    "Đơn sắc (Monochrome)": "monochromatic, single color palette, artistic, cohesive",
    "Duotone": "duotone colors, two contrasting colors, spotify playlist style, pop art",
    "Tông ấm": "warm color tone, orange and yellow hues, cozy, sunset vibe",
    "Tông lạnh": "cold color tone, blue and teal hues, winter vibe, clinical",
    "Giờ vàng (Golden Hour)": "golden hour lighting, warm sunlight, long shadows, cinematic",
    "Giờ xanh (Blue Hour)": "blue hour lighting, twilight, deep blue sky, city lights, serene",
    "Cyber Neon": "cyber neon, purple and cyan, futuristic lighting, high contrast",

    // E. Concept / Chủ đề
    "Fantasy World": "fantasy world, magical forest, floating islands, castles, epic scenery",
    "Sci-fi": "sci-fi concept, spaceship, alien planet, futuristic technology, sleek design",
    "Mecha / Robot": "mecha, giant robot, mechanical parts, armor, futuristic warfare",
    "Thần thoại": "mythological concept, greek gods, ancient legends, epic scale",
    "Trung cổ": "medieval style, knights, castles, swords, dirt and grime, historical",
    "Hậu tận thế": "post-apocalyptic, ruins, overgrown nature, survival, gritty",
    "Vũ trụ / Galaxy": "space concept, nebula, stars, planets, cosmic scale, astronaut",
    "Kinh dị vũ trụ": "cosmic horror, lovecraftian, tentacles, madness, dark space, unknown",
    "Thực vật học": "botanical illustration, plants, flowers, nature focus, organic details",
    "Dưới nước": "underwater scene, coral reef, fish, caustic light, deep blue",
    "Dreamcore": "dreamcore aesthetic, liminal space, surreal, nostalgic, weird",
    "Kidcore": "kidcore aesthetic, primary colors, toys, playground, nostalgic childhood",
    "Cổ tích": "fairy tale style, enchanted, magical, storybook illustration, whimsical",
    "Kinh dị": "horror style, scary, dark, blood, monsters, nightmare fuel",
    "Zombie": "zombie apocalypse, undead, rotting flesh, survival horror",
    "Sinh vật huyền bí": "mythical creatures, dragons, unicorns, griffin, fantasy beasts",
    "Thiên thần / Ác quỷ": "angelic vs demonic, wings, halo, horns, heaven and hell",
    "Tâm linh": "spiritual concept, chakras, meditation, glowing energy, mystical",
    "Samurai": "samurai style, feudal japan, katana, cherry blossoms, warrior",
    "Ninja": "ninja style, feudal japan, stealth, katana, dark assassin"
};

const getRandomStyle = (): string => {
    const styles = Object.keys(stylePrompts).filter(s => s !== 'Mặc định' && s !== 'Ngẫu nhiên');
    return styles[Math.floor(Math.random() * styles.length)];
};

interface GenerationParams {
    prompt: string;
    imageQuantity: ImageQuantity;
    generationMode: GenerationMode;
    promptMagic: PromptMagic;
    aspectRatio: AspectRatio;
    customRatio: { width: number; height: number } | null;
    selectedImage: string | null;
    imageStyle: ImageStyle;
    selectedModel?: string;
}

// --- Style Library Modal ---
const StyleLibraryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (style: string) => void;
    currentStyle: string;
}> = ({ isOpen, onClose, onSelect, currentStyle }) => {
    const [activeCategory, setActiveCategory] = useState<StyleCategory>('Nghệ thuật');
    const [searchStyle, setSearchStyle] = useState('');

    if (!isOpen) return null;

    const categories = Object.keys(STYLE_CATEGORIES) as StyleCategory[];

    const filteredStyles = STYLE_CATEGORIES[activeCategory].filter(style => 
        style.toLowerCase().includes(searchStyle.toLowerCase())
    );

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Thư viện Phong cách & Nghệ thuật" 
            size="3xl"
            hideFooter
        >
            <div className="flex flex-col h-[60vh] -mx-6 -mb-6">
                {/* Search Bar */}
                <div className="px-6 pb-4 border-b border-gray-200 dark:border-slate-700">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm phong cách (ví dụ: Cyberpunk, 3D...)" 
                            value={searchStyle}
                            onChange={(e) => setSearchStyle(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-gray-50 dark:bg-slate-800 text-sm focus:ring-indigo-500 focus:border-indigo-500 dark:text-white"
                        />
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Categories */}
                    <div className="w-1/3 border-r border-gray-200 dark:border-slate-700 overflow-y-auto bg-gray-50 dark:bg-slate-900/50">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => { setActiveCategory(cat); setSearchStyle(''); }}
                                className={`w-full text-left px-4 py-3 text-sm font-medium border-l-4 transition-colors ${
                                    activeCategory === cat 
                                        ? 'bg-white dark:bg-slate-800 border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Style Grid */}
                    <div className="w-2/3 p-4 overflow-y-auto bg-white dark:bg-slate-800">
                        <div className="grid grid-cols-2 gap-3">
                            {filteredStyles.map(style => (
                                <button
                                    key={style}
                                    onClick={() => { onSelect(style); onClose(); }}
                                    className={`relative group p-3 rounded-lg border text-left transition-all hover:shadow-md ${
                                        currentStyle === style 
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-500' 
                                            : 'border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                                    }`}
                                >
                                    <span className={`block text-sm font-medium ${currentStyle === style ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-200'}`}>
                                        {style}
                                    </span>
                                    {currentStyle === style && (
                                        <div className="absolute top-2 right-2 text-indigo-600 dark:text-indigo-400">
                                            <CheckCircleIcon className="h-4 w-4" />
                                        </div>
                                    )}
                                </button>
                            ))}
                            {filteredStyles.length === 0 && (
                                <div className="col-span-2 text-center py-8 text-gray-500 dark:text-gray-400">
                                    Không tìm thấy phong cách nào.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const ImageGenerator: React.FC<{ tool: IntegrationTool, onNavigate: (page: string) => void }> = ({ tool, onNavigate }) => {
    const { loggedInUser } = useAuth();
    const { userState } = useUser();
    const { handleUseToolCredit, handleSetGenerationHistory, handleDeleteGenerationResult, handleDeleteSingleImage } = useActions();
    const { addToast } = useToast();
    
    // View state
    const [viewMode, setViewMode] = useState<'gallery' | 'expand' | 'imageEditor'>('gallery');
    const [editingImage, setEditingImage] = useState<{ src: string, prompt: string } | null>(null);
    const [editorInitialMode, setEditorInitialMode] = useState<'erase' | 'repaint'>('erase');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [hdFixTarget, setHdFixTarget] = useState<GenerationResult | null>(null);
    const [hdFixImage, setHdFixImage] = useState<string | null>(null); 
    const [hdScalingRatio, setHdScalingRatio] = useState(2);
    const [hdDpi, setHdDpi] = useState(300);

    // Settings State
    const [generationMode, setGenerationMode] = useState<GenerationMode>('Tiêu chuẩn');
    const [promptMagic, setPromptMagic] = useState<PromptMagic>('Tự động');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('2:3');
    const [imageQuantity, setImageQuantity] = useState<ImageQuantity>(4);
    const [customRatio, setCustomRatio] = useState<{ width: number; height: number } | null>(null);
    const { settingsState } = useSettings();
    const activeModels = useMemo(() => {
        const activeIds = settingsState.systemSettings.activeGeminiModels || [];
        const fallback = ALL_GEMINI_MODELS.filter(m => activeIds.includes(m.id) && isModelInCategory(m, 'image'));
        
        const toolSpecificModels = tool.modelPricing ? Object.keys(tool.modelPricing) : [];
        if (toolSpecificModels.length > 0) {
            const toolFiltered = ALL_GEMINI_MODELS.filter(m => toolSpecificModels.includes(m.id) && activeIds.includes(m.id) && isModelInCategory(m, 'image'));
            if (toolFiltered.length > 0) return toolFiltered;
        }

        return fallback.length > 0 ? fallback : [ALL_GEMINI_MODELS[0]];
    }, [settingsState.systemSettings.activeGeminiModels, tool.modelPricing]);

    const [selectedModel, setSelectedModel] = useState<string>(activeModels[0].id);

    useEffect(() => {
        if (!activeModels.some(m => m.id === selectedModel)) {
            setSelectedModel(activeModels[0].id);
        }
    }, [activeModels]);
    
    // Style State
    const [imageStyle, setImageStyle] = useState<ImageStyle>('Mặc định');
    const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);

    // UI State
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStatus, setGenerationStatus] = useState<string | null>(null);
    const history = useMemo(() => loggedInUser?.generationHistory || [], [loggedInUser]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [activeInfoPopover, setActiveInfoPopover] = useState<string | null>(null);
    const [isMoreSettingsOpen, setIsMoreSettingsOpen] = useState(false);
    const [isCustomRatioEditing, setIsCustomRatioEditing] = useState(false);
    const [promptDetail, setPromptDetail] = useState<{ prompt: string; enhancedPrompt?: string; } | null>(null);
    const [openMoreMenuId, setOpenMoreMenuId] = useState<string | null>(null);
    const [openGroupMoreMenuId, setOpenGroupMoreMenuId] = useState<string | null>(null);
    
    // Preview Modal Zoom State
    const [previewScale, setPreviewScale] = useState(1);
    const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
    const [isPreviewDragging, setIsPreviewDragging] = useState(false);
    const previewDragStart = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (previewImage) {
            setPreviewScale(1);
            setPreviewPosition({ x: 0, y: 0 });
        }
    }, [previewImage]);

    const handlePreviewWheel = (e: React.WheelEvent) => {
        // e.preventDefault(); // Note: Passive event listener issue might occur, better handled via CSS overflow or specific ref if critical
        const delta = e.deltaY * -0.002;
        const newScale = Math.min(Math.max(0.1, previewScale + delta), 10);
        setPreviewScale(newScale);
    };

    const handlePreviewMouseDown = (e: React.MouseEvent) => {
        setIsPreviewDragging(true);
        previewDragStart.current = { x: e.clientX - previewPosition.x, y: e.clientY - previewPosition.y };
    };

    const handlePreviewMouseMove = (e: React.MouseEvent) => {
        if (!isPreviewDragging) return;
        setPreviewPosition({
            x: e.clientX - previewDragStart.current.x,
            y: e.clientY - previewDragStart.current.y
        });
    };

    const handlePreviewMouseUp = () => {
        setIsPreviewDragging(false);
    };

    // Get fresh credit balance
    const freshUser = useMemo(() => loggedInUser ? findUserInTree(userState.allUsers, loggedInUser.id) : null, [userState.allUsers, loggedInUser]);
    const currentCredits = freshUser ? freshUser.creditBalance : 0;

    const currentCost = useMemo(() => {
        if (tool.modelPricing && tool.modelPricing[selectedModel] !== undefined) {
            return tool.modelPricing[selectedModel];
        }
        return tool.creditCost || 10;
    }, [tool.modelPricing, tool.creditCost, selectedModel]);
    
    // Filtering & View States
    const [searchTerm, setSearchTerm] = useState('');
    const [gridCols, setGridCols] = useState<2 | 4 | 6>(4);
    const [filters, setFilters] = useState<{ mode: 'all' | GenerationMode; aspectRatio: 'all' | string }>({ mode: 'all', aspectRatio: 'all' });
    const [activeHeaderPopover, setActiveHeaderPopover] = useState<'search' | 'grid' | 'filter' | null>(null);

    const infoPopoverRef = useRef<HTMLDivElement>(null);
    const headerPopoverRef = useRef<HTMLDivElement>(null);
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const groupMoreMenuRef = useRef<HTMLDivElement>(null);
    const uploadInputRef = useRef<HTMLInputElement>(null); 

    const aspectRatioDimensions: Record<Exclude<AspectRatio, "custom">, string> = {
        "2:3": "688 x 1024px", "1:1": "1024 x 1024px", "9:16": "576 x 1024px", "4:3": "1024 x 768px",
        "1:2": "512 x 1024px", "3:4": "768 x 1024px", "4:5": "819 x 1024px",
        "2:1": "1024 x 512px", "16:9": "1024 x 576px", "3:2": "1024 x 688px", "5:4": "1024 x 819px"
    };

    const handleDownload = (imageUrl: string, taskId?: string, index?: number) => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `gen_${taskId || Date.now()}_${index || 0}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    // Unused handleDownloadAll function removed

    const handleDeleteResult = (taskId: string) => {
        if (!loggedInUser) return;
        handleDeleteGenerationResult(loggedInUser.id, taskId);
        addToast('Đã xóa kết quả.', 'info');
    };

    const handleReusePrompt = (promptText: string, settings: GenerationResult['settings']) => {
        setPrompt(promptText.replace(/^\[.*?\]\s*/, ''));
        setAspectRatio(settings.aspectRatio);
        setCustomRatio(settings.customRatio || null);
        setGenerationMode(settings.generationMode);
        setImageQuantity(settings.quantity as ImageQuantity);
        setImageStyle(settings.imageStyle || 'Mặc định');
        addToast('Đã áp dụng prompt và cài đặt.', 'success');
    };

    const handleCopyPrompt = (promptText: string) => {
        navigator.clipboard.writeText(promptText.replace(/^\[.*?\]\s*/, ''));
        addToast('Đã sao chép prompt!', 'success');
    };

    const handleRegenerate = (result: GenerationResult) => {
        setPrompt(result.prompt.replace(/^\[.*?\]\s*/, '')); 
        setAspectRatio(result.settings.aspectRatio);
        setCustomRatio(result.settings.customRatio || null);
        setGenerationMode(result.settings.generationMode);
        setImageQuantity(result.settings.quantity as ImageQuantity);
        setImageStyle(result.settings.imageStyle || 'Mặc định');
        addToast('Đã tải lại cài đặt. Nhấn Tạo để bắt đầu.', 'info');
    };

    const handleRemoveBackground = async (target: GenerationResult, imageSrc: string) => {
        if (isGenerating || !loggedInUser) return;
        const cost = tool.creditCost;
        const freshUser = findUserInTree(userState.allUsers, loggedInUser.id);
        
        if (!freshUser || freshUser.creditBalance < cost) {
            addToast(`Số dư không đủ. Bạn cần ${cost} Credit nhưng chỉ có ${freshUser?.creditBalance || 0} Credit.`, 'error');
            return;
        }

        setIsGenerating(true);
        const creditResult = await handleUseToolCredit(loggedInUser.id, { ...tool, creditCost: cost });
        if (!creditResult.success) { setIsGenerating(false); return; }

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY as string });
            const mimeType = imageSrc.split(';')[0].split(':')[1] || 'image/png';
            const imagePart = { inlineData: { data: imageSrc.split(',')[1], mimeType } };
            
            // Updated Prompt: Replace Background with Green Screen
            const textPart = { text: "TASK: Background Replacement (Green Screen). OUTPUT: Replace the ENTIRE background with a SOLID PURE COLOR (Hex code: #00FF00). CRITICAL: Remove all shadows cast on the floor. Isolate the main subject strictly." };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [imagePart, textPart] },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const newImagePart = response.candidates?.[0]?.content?.parts[0];
            if (newImagePart && newImagePart.inlineData?.data) {
                const rawGreenImage = `data:${newImagePart.inlineData.mimeType};base64,${newImagePart.inlineData.data}`;
                
                // Process Green Screen to Transparency locally
                const processedImage = await processGreenScreenRemoval(rawGreenImage);

                const newResult: GenerationResult = {
                    taskId: `rmbg_${Date.now()}`,
                    date: new Date().toLocaleDateString('vi-VN'),
                    prompt: `[Xóa nền] ${target.prompt}`,
                    images: [processedImage],
                    settings: target.settings,
                    cost: cost,
                    balanceAfter: freshUser.creditBalance - cost,
                    creationTime: new Date().toLocaleTimeString(),
                };
                handleSetGenerationHistory(loggedInUser.id, newResult);
                addToast('Đã xóa nền thành công!', 'success');
            } else {
                 throw new Error("API did not return an image.");
            }
        } catch (error) {
            console.error(error);
            addToast('Lỗi xóa nền.', 'error');
             const userForRefund = findUserInTree(userState.allUsers, loggedInUser.id);
             if(userForRefund) {
                 handleUseToolCredit(userForRefund.id, { ...tool, creditCost: -cost });
             }
        } finally {
            setIsGenerating(false);
        }
    };

    const executeHdFix = async () => {
        if (!hdFixImage || !loggedInUser || isGenerating) return;
        
        const settingsParams = tool.pricingParams || {};
        const multiplier = settingsParams.upscaleMultiplier !== undefined ? Number(settingsParams.upscaleMultiplier) : 1;
        const baseCost = tool.creditCost;
        const enhanceCost = Math.ceil(baseCost * hdScalingRatio * multiplier);

        const freshUser = findUserInTree(userState.allUsers, loggedInUser.id);
        if (!freshUser || freshUser.creditBalance < enhanceCost) {
             addToast(`Số dư không đủ. Bạn cần ${enhanceCost} Credit nhưng chỉ có ${freshUser?.creditBalance || 0} Credit.`, 'error');
             return;
        }

        setIsGenerating(true);
        const creditResult = await handleUseToolCredit(loggedInUser.id, { ...tool, creditCost: enhanceCost });
        if (!creditResult.success) { setIsGenerating(false); return; }

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY as string });
            const mimeType = hdFixImage.split(';')[0].split(':')[1] || 'image/png';
            const imagePart = { inlineData: { data: hdFixImage.split(',')[1], mimeType } };
            
            const textPart = { text: `Upscale this image by ${hdScalingRatio}x. Enhance details, sharpness, and clarity. Maintain original style.` };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [imagePart, textPart] },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const newImagePart = response.candidates?.[0]?.content?.parts[0];
            if (newImagePart && newImagePart.inlineData?.data) {
                let newImage = `data:${newImagePart.inlineData.mimeType};base64,${newImagePart.inlineData.data}`;
                
                if (hdDpi !== 72) {
                   newImage = await setDpi(newImage, hdDpi);
                }

                const newResult: GenerationResult = {
                    taskId: `hd_${Date.now()}`,
                    date: new Date().toLocaleDateString('vi-VN'),
                    prompt: `[HD ${hdScalingRatio}x] ${hdFixTarget?.prompt || 'Image'}`,
                    images: [newImage],
                    settings: hdFixTarget?.settings || { aspectRatio: 'custom', quantity: 1, generationMode: 'Chất lượng', customRatio: null, imageStyle: 'Mặc định' },
                    cost: enhanceCost,
                    balanceAfter: freshUser.creditBalance - enhanceCost,
                    creationTime: new Date().toLocaleTimeString(),
                };
                handleSetGenerationHistory(loggedInUser.id, newResult);
                addToast('Nâng cấp HD thành công!', 'success');
                setHdFixTarget(null);
                setHdFixImage(null);
            }
        } catch (error) {
            console.error(error);
            addToast('Lỗi nâng cấp HD.', 'error');
            const userForRefund = findUserInTree(userState.allUsers, loggedInUser.id);
             if(userForRefund) {
                 handleUseToolCredit(userForRefund.id, { ...tool, creditCost: -enhanceCost });
             }
        } finally {
            setIsGenerating(false);
        }
    };
    
    // --- HELPER FOR CONVERT TO VIDEO ---
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
                    // Convert to JPEG 0.8 quality to reduce size
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                } else {
                    resolve(src);
                }
            };
            img.onerror = () => resolve(src);
        });
    };

    const handleExpandedImageGenerated = (result: {
        newImage: string;
        originalPrompt: string;
        expandPrompt: string;
        cost: number;
        balanceAfter: number;
        aspectRatio: { name: string, width: number, height: number };
    }) => {
        const newResult: GenerationResult = {
            taskId: `exp_${Date.now()}`,
            date: new Date().toLocaleDateString('vi-VN'),
            prompt: `[Mở rộng] ${result.originalPrompt}`,
            images: [result.newImage],
            settings: { 
                aspectRatio: 'custom', 
                customRatio: { width: result.aspectRatio.width, height: result.aspectRatio.height }, 
                quantity: 1, 
                generationMode: 'Chất lượng',
                imageStyle: 'Mặc định'
            },
            cost: result.cost,
            balanceAfter: result.balanceAfter,
            creationTime: new Date().toLocaleTimeString(),
        };
        if (loggedInUser) {
            handleSetGenerationHistory(loggedInUser.id, newResult);
        }
        setViewMode('gallery');
        setEditingImage(null);
        addToast('Đã lưu ảnh mở rộng vào lịch sử.', 'success');
    };

    const handleEditedImageGenerated = (result: {
        newImage: string;
        originalPrompt: string;
        editPrompt?: string;
        mode: 'erase' | 'repaint';
        cost: number;
        balanceAfter: number;
    }) => {
        const newResult: GenerationResult = {
            taskId: `edit_${Date.now()}`,
            date: new Date().toLocaleDateString('vi-VN'),
            prompt: `[${result.mode === 'erase' ? 'Xóa vật thể' : 'Vẽ lại'}] ${result.editPrompt || result.originalPrompt}`,
            images: [result.newImage],
            settings: { aspectRatio: 'custom', customRatio: null, quantity: 1, generationMode: 'Chất lượng', imageStyle: 'Mặc định' },
            cost: result.cost,
            balanceAfter: result.balanceAfter,
            creationTime: new Date().toLocaleTimeString(),
        };
        if (loggedInUser) {
            handleSetGenerationHistory(loggedInUser.id, newResult);
        }
        setViewMode('gallery');
        setEditingImage(null);
        addToast('Đã lưu ảnh chỉnh sửa vào lịch sử.', 'success');
    };

    const handleQuickAction = (action: 'hd' | 'remove_bg' | 'expand' | 'edit') => {
        if (!selectedImage) return;
        
        const dummyResult: GenerationResult = {
            taskId: 'upload_' + Date.now(),
            date: new Date().toLocaleDateString('vi-VN'),
            prompt: prompt || "Uploaded Image", 
            images: [selectedImage],
            settings: { aspectRatio: 'custom', quantity: 1, generationMode: 'Chất lượng', customRatio: null, imageStyle: 'Mặc định' },
            cost: 0, balanceAfter: 0, creationTime: ''
        };

        if (action === 'hd') {
            setHdFixTarget(dummyResult);
            setHdFixImage(selectedImage);
        } else if (action === 'remove_bg') {
            handleRemoveBackground(dummyResult, selectedImage);
        } else if (action === 'expand') {
            setEditingImage({ src: selectedImage, prompt: prompt || "Uploaded Image" });
            setViewMode('expand');
        } else if (action === 'edit') {
            setEditingImage({ src: selectedImage, prompt: prompt || "Uploaded Image" });
            setEditorInitialMode('erase'); 
            setViewMode('imageEditor');
        }
    };

    const handleFeatureClick = async (featureName: string, result: GenerationResult, imageSrc: string) => {
        setOpenMoreMenuId(null);
        setOpenGroupMoreMenuId(null);

        switch (featureName) {
            case 'Nâng cấp HD':
                setHdFixTarget(result);
                setHdFixImage(imageSrc);
                break;
            case 'Khôi phục':
                 onNavigate('Kho Tiện Ích/tool_photo_restore'); 
                 break;
            case 'Xóa nền':
                handleRemoveBackground(result, imageSrc);
                break;
            case 'Tẩy':
            case 'Vẽ lại':
                setEditingImage({ src: imageSrc, prompt: result.prompt });
                setEditorInitialMode(featureName === 'Tẩy' ? 'erase' : 'repaint');
                setViewMode('imageEditor');
                break;
            case 'Mở rộng':
                setEditingImage({ src: imageSrc, prompt: result.prompt });
                setViewMode('expand');
                break;
            case 'Chuyển thành Video':
                 if (!loggedInUser) return;
                 addToast('Đang nén ảnh và chuyển sang Video Studio...', 'info');
                 try {
                     const compressed = await compressImage(imageSrc);
                     const videoSessionData = {
                         mode: 'image',
                         inputImage: compressed,
                         prompt: result.prompt || "Cinematic animation of this image", 
                     };
                     localStorage.setItem(`tool_ai_video_gen_session_${loggedInUser.id}`, JSON.stringify(videoSessionData));
                     onNavigate('Kho Tiện Ích/tool_ai_video_gen');
                 } catch (e) {
                      console.error("Failed to transfer image", e);
                      addToast('Lỗi khi chuyển ảnh.', 'error');
                 }
                 break;
            default:
                break;
        }
    };

    const getAspectRatioDimensions = (ar: AspectRatio, cr: {width: number, height: number} | null | undefined) => {
        if (ar === 'custom' && cr) {
            return `${cr.width} x ${cr.height}px`;
        }
        return aspectRatioDimensions[ar as Exclude<AspectRatio, "custom">];
    };
    
    const aspectRatioClasses: Record<Exclude<AspectRatio, "custom">, string> = {
        "2:3": "aspect-[2/3]", "1:1": "aspect-square", "9:16": "aspect-[9/16]", "4:3": "aspect-[4/3]",
        "1:2": "aspect-[1/2]", "3:4": "aspect-[3/4]", "4:5": "aspect-[4/5]",
        "2:1": "aspect-[2/1]", "16:9": "aspect-[16/9]", "3:2": "aspect-[3/2]", "5:4": "aspect-[5/4]"
    };
    
    const getAspectRatioClass = (ar: AspectRatio) => {
        if (ar === 'custom') return '';
        return aspectRatioClasses[ar as Exclude<AspectRatio, "custom">];
    }
    const getAspectRatioStyle = (ar: AspectRatio, cr: {width: number, height: number} | null | undefined) => {
         if (ar === 'custom' && cr) {
            return { aspectRatio: `${cr.width} / ${cr.height}` };
        }
        return {};
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (infoPopoverRef.current && !infoPopoverRef.current.contains(event.target as Node)) {
                setActiveInfoPopover(null);
            }
            if (headerPopoverRef.current && !headerPopoverRef.current.contains(event.target as Node)) {
                setActiveHeaderPopover(null);
            }
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setOpenMoreMenuId(null);
            }
            if (groupMoreMenuRef.current && !groupMoreMenuRef.current.contains(event.target as Node)) {
                setOpenGroupMoreMenuId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleResetSettings = () => {
        setGenerationMode('Tiêu chuẩn');
        setPromptMagic('Tự động');
        setAspectRatio('2:3');
        setImageQuantity(4);
        setCustomRatio(null);
        setImageStyle('Mặc định');
        setIsMoreSettingsOpen(false);
        setIsCustomRatioEditing(false);
        addToast('Đã đặt lại cài đặt về mặc định.', 'success');
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setSelectedImage(event.target.result as string);
                    addToast('Đã tải ảnh lên! Nhập prompt để chỉnh sửa.', 'success');
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
        if (e.target) e.target.value = '';
    };

    const enhancePrompt = async (originalPrompt: string, style: ImageStyle = 'Mặc định'): Promise<string> => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            let styleInstruction = "";
            
            if (style !== 'Mặc định' && style !== 'Ngẫu nhiên') {
                 styleInstruction = `The user explicitly requested the image in the style of: "${style}". Ensure the expanded prompt strictly adheres to this style. Do NOT add conflicting style keywords.`;
            }

            const systemInstruction = `You are an expert creative prompt engineer for high-end image generation AI. 
            Your task: Take the user's simple prompt and expand it into a detailed, artistic prompt that results in a high-quality image.
            ${styleInstruction}
            - Focus on subject details, lighting, composition, atmosphere, and texture.
            - Output ONLY the final, enhanced prompt string. No introductions or explanations.`;
            
            // Updated to gemini-2.5-flash for speed and reliability
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `User's prompt: "${originalPrompt}"`,
                config: { systemInstruction }
            });
            
            const enhanced = response.text?.trim().replace(/"/g, '');
            if (enhanced && enhanced.length > originalPrompt.length) {
                return enhanced;
            }
            return originalPrompt;
        } catch (error) {
            console.error("Lỗi tối ưu hoá prompt:", error);
            addToast('Tối ưu hoá prompt thất bại, sử dụng prompt gốc.', 'info');
            return originalPrompt;
        }
    };

    const executeGeneration = async (params: GenerationParams) => {
        if (isGenerating || !loggedInUser) {
            if (!loggedInUser) addToast('Lỗi: Người dùng chưa đăng nhập.', 'error');
            return;
        }

        const modelToUse = params.selectedModel || 'gemini-2.5-flash-image';
        const modelPrice = (tool.modelPricing && tool.modelPricing[modelToUse] !== undefined) 
            ? tool.modelPricing[modelToUse] 
            : (tool.creditCost || 10);

        // 1. Calculate Cost FIRST
        const cost = params.selectedImage ? modelPrice : modelPrice * params.imageQuantity;

        // 2. Get Fresh User
        const freshUser = findUserInTree(userState.allUsers, loggedInUser.id);
        
        // 3. Strict Check
        if (!freshUser || freshUser.creditBalance < cost) {
            addToast(`Số dư không đủ. Bạn cần ${cost} Credit nhưng chỉ có ${freshUser?.creditBalance || 0} Credit.`, 'error');
            return; 
        }
    
        const balanceBefore = freshUser.creditBalance;
    
        setIsGenerating(true);
        setGenerationStatus('Đang khởi tạo...');
    
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            let styleInstruction = '';
            if (params.imageStyle !== 'Ngẫu nhiên' && params.imageStyle !== 'Mặc định') {
                styleInstruction = stylePrompts[params.imageStyle] || '';
            }
    
            let finalPrompt = params.prompt.trim();
            
            if (finalPrompt && styleInstruction) {
                finalPrompt = `${finalPrompt}, ${styleInstruction}`;
            } else if (!finalPrompt && styleInstruction) {
                finalPrompt = styleInstruction;
            } else if (!finalPrompt && !styleInstruction && params.selectedImage) {
                finalPrompt = "High quality, detailed variation of the input image";
            }

            let enhancedPromptUsed = false;
            const needsMagic = params.promptMagic === 'Bật' || (params.promptMagic === 'Tự động' && finalPrompt.length < 50 && finalPrompt.length > 0);
    
            if (needsMagic && !params.selectedImage) {
                setGenerationStatus('Đang tối ưu hoá prompt...');
                const enhancedBase = await enhancePrompt(finalPrompt, params.imageStyle);
                if (enhancedBase !== finalPrompt) {
                     enhancedPromptUsed = true;
                     finalPrompt = enhancedBase;
                }
            }
    
            const creditUsageResult = await handleUseToolCredit(freshUser.id, { ...tool, creditCost: cost });
            if (!creditUsageResult.success) {
                setIsGenerating(false); 
                setGenerationStatus(null);
                return;
            }
    
            const taskId = `d4d${Date.now().toString().slice(-4)}${Math.random().toString(36).substring(2, 12)}`;
            const creationTime = new Date().toLocaleTimeString('en-GB');
            const balanceAfter = balanceBefore - cost;
    
            setGenerationStatus('Đang tạo ảnh...');
    
            if (params.selectedImage) {
                const mimeType = params.selectedImage.split(';')[0].split(':')[1] || 'image/png';
                const imagePart = { inlineData: { data: params.selectedImage.split(',')[1], mimeType } };
                
                let img2imgPrompt = "";
                let styleDescription = "";
                if (params.imageStyle === 'Ngẫu nhiên') {
                    const randomStyle = getRandomStyle();
                    styleDescription = stylePrompts[randomStyle];
                } else if (params.imageStyle !== 'Mặc định') {
                    styleDescription = stylePrompts[params.imageStyle];
                }

                if (params.prompt.trim()) {
                    img2imgPrompt = `Modify the input image to match this description: ${params.prompt.trim()}. ${styleDescription ? `Apply style: ${styleDescription}` : ''}`;
                } else if (styleDescription) {
                    img2imgPrompt = `Restyle the input image. Strictly preserve the original composition, subject, and pose, but apply the following artistic style: ${styleDescription}.`;
                } else {
                    img2imgPrompt = "Generate a high quality, creative variation of the input image, maintaining the main subject and composition.";
                }

                const textPart = { text: img2imgPrompt }; 
                const response = await ai.models.generateContent({
                    model: params.selectedModel || 'gemini-2.5-flash-image',
                    contents: { parts: [imagePart, textPart] },
                    config: { responseModalities: [Modality.IMAGE] },
                });
    
                const imageUrls: string[] = [];
                const parts = response.candidates?.[0]?.content?.parts;
                if (Array.isArray(parts)) {
                    for (const part of parts) {
                        if (part.inlineData?.data) {
                            imageUrls.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                        }
                    }
                }
                if (imageUrls.length === 0) throw new Error("Không có ảnh nào được tạo bởi mô hình.");
    
                const newResult: GenerationResult = {
                    taskId, cost, balanceAfter, creationTime,
                    date: new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                    prompt: `[Ảnh] ${finalPrompt}`, 
                    images: imageUrls,
                    settings: { aspectRatio: params.aspectRatio, customRatio: params.customRatio, quantity: 1, generationMode: params.generationMode, imageStyle: params.imageStyle },
                };
                handleSetGenerationHistory(loggedInUser.id, newResult);
                setSelectedImage(null);
                setPrompt('');
    
            } else { 
                 let imageUrls: string[] = [];
    
                if (params.generationMode === 'Tiêu chuẩn') {
                    for (let i = 0; i < params.imageQuantity; i++) {
                        setGenerationStatus(`Đang tạo ảnh ${i + 1}/${params.imageQuantity}...`);
                        let currentPrompt = finalPrompt;
                        if (params.imageStyle === 'Ngẫu nhiên') {
                            const randomStyle = getRandomStyle();
                            currentPrompt = `${finalPrompt}, ${stylePrompts[randomStyle]}`;
                        }
                        const response = await ai.models.generateContent({
                            model: params.selectedModel || 'gemini-2.5-flash-image',
                            contents: { parts: [{ text: currentPrompt }] },
                            config: { responseModalities: [Modality.IMAGE] },
                        });
                        const parts = response.candidates?.[0]?.content?.parts;
                        if (Array.isArray(parts)) {
                            for (const part of parts) {
                                if (part.inlineData?.data) {
                                    imageUrls.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                                }
                            }
                        }
                    }
                } else { 
                     const findClosestApiRatio = (width: number, height: number): "1:1" | "16:9" | "9:16" | "4:3" | "3:4" => {
                        const targetRatio = width / height;
                        const supportedRatios: Record<"1:1" | "16:9" | "9:16" | "4:3" | "3:4", number> = { "1:1": 1, "16:9": 16 / 9, "9:16": 9 / 16, "4:3": 4 / 3, "3:4": 3 / 4 };
                        let closestRatio: keyof typeof supportedRatios = "1:1";
                        let minDiff = Infinity;
                        for (const key in supportedRatios) {
                            const diff = Math.abs(targetRatio - supportedRatios[key as keyof typeof supportedRatios]);
                            if (diff < minDiff) { minDiff = diff; closestRatio = key as keyof typeof supportedRatios; }
                        }
                        return closestRatio;
                    };
                    const apiAspectRatioMap: Record<Exclude<AspectRatio, "custom">, "1:1" | "16:9" | "9:16" | "4:3" | "3:4"> = {
                        "1:1": "1:1", "16:9": "16:9", "9:16": "9:16", "4:3": "4:3", "3:4": "3:4", "2:3": "3:4",
                        "3:2": "4:3", "2:1": "16:9", "1:2": "9:16", "4:5": "3:4", "5:4": "4:3",
                    };
                    let apiRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
                    if (params.aspectRatio === 'custom' && params.customRatio) {
                        apiRatio = findClosestApiRatio(params.customRatio.width, params.customRatio.height);
                    } else {
                        apiRatio = apiAspectRatioMap[params.aspectRatio as Exclude<AspectRatio, "custom">];
                    }
                    let currentPrompt = finalPrompt;
                    if (params.imageStyle === 'Ngẫu nhiên') {
                        const randomStyle = getRandomStyle();
                        currentPrompt = `${finalPrompt}, ${stylePrompts[randomStyle]}`;
                    }
                    const response = await ai.models.generateImages({
                        model: 'imagen-4.0-generate-001',
                        prompt: currentPrompt,
                        config: { numberOfImages: params.imageQuantity, aspectRatio: apiRatio, outputMimeType: 'image/png' },
                    });
                    if (response && Array.isArray(response.generatedImages)) {
                        for (const img of response.generatedImages as GeneratedImage[]) {
                             if (img?.image?.imageBytes) { imageUrls.push(`data:image/png;base64,${img.image.imageBytes}`); }
                        }
                    }
                }
                if (imageUrls.length === 0) throw new Error("Không có ảnh nào được tạo bởi mô hình.");
                const newResult: GenerationResult = {
                    taskId, cost, balanceAfter, creationTime,
                    date: new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                    prompt: params.prompt || (params.imageStyle !== 'Mặc định' ? `[Style: ${params.imageStyle}]` : '[Auto Generated]'),
                    enhancedPrompt: enhancedPromptUsed ? finalPrompt : undefined,
                    images: imageUrls,
                    settings: { aspectRatio: params.aspectRatio, customRatio: params.customRatio, quantity: params.imageQuantity, generationMode: params.generationMode, imageStyle: params.imageStyle },
                };
                handleSetGenerationHistory(loggedInUser.id, newResult);
                setPrompt('');
            }
        } catch (error) {
            console.error("Lỗi tạo ảnh Gemini:", error);
            const userForRefund = findUserInTree(userState.allUsers, loggedInUser.id);
            if(userForRefund) {
                await handleUseToolCredit(userForRefund.id, { ...tool, creditCost: -cost });
                addToast('Tạo ảnh thất bại, Credit đã được hoàn lại.', 'error');
            } else {
                addToast('Tạo ảnh thất bại. Vui lòng thử lại.', 'error');
            }
        } finally {
            setIsGenerating(false);
            setGenerationStatus(null);
        }
    };
    
    const handleGenerate = async () => {
        if (!prompt.trim() && !selectedImage) {
            if (imageStyle === 'Mặc định' || imageStyle === 'Ngẫu nhiên') {
                 addToast('Vui lòng nhập prompt hoặc chọn một ảnh để chỉnh sửa.', 'info');
                 return;
            }
        }
        await executeGeneration({ prompt, imageQuantity, generationMode, promptMagic, aspectRatio, customRatio, selectedImage, imageStyle, selectedModel });
    };

    // Sidebar Component
    const Sidebar = () => {
        const initialRatios: Exclude<AspectRatio, "custom">[] = ["2:3", "1:1", "9:16", "4:3"];
        const isMoreRatioSelected = !initialRatios.includes(aspectRatio as Exclude<AspectRatio, "custom">);
        const portraitRatios: Exclude<AspectRatio, "custom">[] = ["1:2", "9:16", "2:3", "3:4", "4:5"];
        const landscapeRatios: Exclude<AspectRatio, "custom">[] = ["2:1", "16:9", "3:2", "4:3", "5:4"];
        const [customWidth, setCustomWidth] = useState(1024);
        const [customHeight, setCustomHeight] = useState(1024);
        
        const selectAspectRatio = (ar: AspectRatio) => {
            setAspectRatio(ar);
             if (ar !== 'custom') { setCustomRatio(null); setIsCustomRatioEditing(false); } 
             else { setIsCustomRatioEditing(true); setCustomWidth(customRatio?.width || 1024); setCustomHeight(customRatio?.height || 1024); }
        };
        const handleApplyCustomRatio = () => {
            if (customWidth > 0 && customHeight > 0) {
                setCustomRatio({ width: customWidth, height: customHeight });
                setIsCustomRatioEditing(false); setIsMoreSettingsOpen(false);
                addToast(`Đã áp dụng kích thước tùy chỉnh: ${customWidth}x${customHeight}px`, 'success');
            } else { addToast('Kích thước tùy chỉnh không hợp lệ.', 'error'); }
        }
        const aspectRatioIcons: Record<string, React.ReactNode> = {
            "2:3": <svg viewBox="0 0 10 15" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="0.75" y="0.75" width="8.5" height="13.5" rx="1" /></svg>,
            "1:1": <svg viewBox="0 0 12 12" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="0.75" y="0.75" width="10.5" height="10.5" rx="1" /></svg>,
            "9:16": <svg viewBox="0 0 9 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="0.75" y="0.75" width="7.5" height="14.5" rx="1" /></svg>,
            "4:3": <svg viewBox="0 0 12 9" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="0.75" y="0.75" width="10.5" height="7.5" rx="1" /></svg>,
        };
    
        return (
            <aside className="w-[340px] bg-[#181818] flex flex-col h-full border-r border-gray-700">
                <div className="flex-shrink-0 flex items-center gap-4 p-4 border-b border-gray-700">
                    <div className="p-2 bg-black/50 rounded-lg"><PhotoIcon className="h-6 w-6 text-white"/></div>
                    <button onClick={() => onNavigate('Kho Tiện Ích')} className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white"><ArrowLeftIcon className="h-5 w-5" /> Quay lại</button>
                </div>
                <div className="flex-grow overflow-y-auto overflow-x-hidden p-4 space-y-6">
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

                    {/* QUICK ACTIONS for Selected Image */}
                    {selectedImage && (
                        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 animate-fadeIn">
                            <label className="text-xs font-semibold text-indigo-300 mb-3 block uppercase tracking-wider flex items-center gap-2">
                                <SparklesIcon className="h-3 w-3"/> Chỉnh sửa ảnh đã chọn
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                 <button onClick={() => handleQuickAction('hd')} className="py-2 px-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-gray-600 hover:border-gray-500">
                                     <PhotoIcon className="h-3.5 w-3.5" /> Nâng cấp HD
                                 </button>
                                 <button onClick={() => handleQuickAction('remove_bg')} className="py-2 px-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-gray-600 hover:border-gray-500">
                                     <EraserIcon className="h-3.5 w-3.5" /> Xóa nền
                                 </button>
                                 <button onClick={() => handleQuickAction('expand')} className="py-2 px-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-gray-600 hover:border-gray-500">
                                     <ArrowsPointingOutIcon className="h-3.5 w-3.5" /> Mở rộng
                                 </button>
                                 <button onClick={() => handleQuickAction('edit')} className="py-2 px-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-gray-600 hover:border-gray-500">
                                     <ArtIcon className="h-3.5 w-3.5" /> Tẩy / Vẽ lại
                                 </button>
                            </div>
                        </div>
                    )}

                    <div>
                        <div className="flex items-center gap-2 mb-2"><label className="text-xs font-semibold text-gray-400">Chế độ Tạo ảnh</label></div>
                        <div className="flex bg-gray-900 rounded-lg p-1">
                            <button onClick={() => setGenerationMode('Tiêu chuẩn')} className={`w-1/2 py-1.5 text-sm rounded-md transition-colors ${generationMode === 'Tiêu chuẩn' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Tiêu chuẩn</button>
                            <button onClick={() => setGenerationMode('Chất lượng')} className={`w-1/2 py-1.5 text-sm rounded-md transition-colors ${generationMode === 'Chất lượng' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Chất lượng</button>
                        </div>
                    </div>
                    
                    <div>
                        <div className="flex items-center gap-2 mb-2"><label className="text-xs font-semibold text-gray-400">Prompt Magic</label></div>
                        <div className="flex bg-gray-900 rounded-lg p-1">
                            <button onClick={() => setPromptMagic('Tự động')} className={`w-1/3 py-1.5 text-sm rounded-md transition-colors ${promptMagic === 'Tự động' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Tự động</button>
                            <button onClick={() => setPromptMagic('Bật')} className={`w-1/3 py-1.5 text-sm rounded-md transition-colors ${promptMagic === 'Bật' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Bật</button>
                            <button onClick={() => setPromptMagic('Tắt')} className={`w-1/3 py-1.5 text-sm rounded-md transition-colors ${promptMagic === 'Tắt' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Tắt</button>
                        </div>
                    </div>
                    
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                        <label className="text-xs font-semibold text-gray-400 mb-3 block uppercase tracking-wider">Phong cách Nghệ thuật</label>
                        <div className="space-y-3">
                            <button 
                                onClick={() => setIsStyleModalOpen(true)} 
                                className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg flex items-center justify-between transition-colors shadow-md group"
                            >
                                <div className="flex items-center gap-2">
                                    <TagIcon className="h-4 w-4 text-white/80" />
                                    <span>{imageStyle === 'Mặc định' ? 'Khám phá Thư viện Style' : imageStyle}</span>
                                </div>
                                <ArrowLeftIcon className="h-4 w-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                            </button>
                            
                            <div className="flex flex-wrap gap-2">
                                {imageStyle !== 'Mặc định' && (
                                    <button onClick={() => setImageStyle('Mặc định')} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs flex items-center gap-1">
                                        <XCircleIcon className="h-3 w-3" /> Bỏ chọn
                                    </button>
                                )}
                                <button onClick={() => setImageStyle('Ngẫu nhiên')} className={`px-2 py-1 rounded text-xs border transition-colors ${imageStyle === 'Ngẫu nhiên' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'}`}>
                                    🎲 Ngẫu nhiên
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-400">Cài đặt Ảnh</label>
                        <div className="grid grid-cols-5 gap-2 mt-2">
                            {initialRatios.map(ar => (
                                <button key={ar} onClick={() => selectAspectRatio(ar)} className={`h-16 border-2 rounded-lg transition-colors flex flex-col items-center justify-center gap-1.5 text-xs font-semibold ${aspectRatio === ar ? 'border-indigo-500 bg-indigo-900/50 text-white' : 'border-gray-600 text-gray-400 hover:border-indigo-500 hover:text-white'}`}>
                                    {aspectRatioIcons[ar]}<span>{ar}</span>
                                </button>
                            ))}
                            <button onClick={() => setIsMoreSettingsOpen(prev => !prev)} className={`h-16 border-2 rounded-lg flex flex-col items-center justify-center gap-1.5 text-xs font-semibold ${isMoreRatioSelected ? 'border-indigo-500 bg-indigo-900/50 text-white' : 'border-gray-600 text-gray-400 hover:border-indigo-500 hover:text-white'}`}><AspectRatioMoreIcon className="h-5 w-5"/><span>{isMoreSettingsOpen ? 'Thu gọn' : 'Thêm'}</span></button>
                        </div>
                        {isMoreSettingsOpen && (
                            <div className="mt-4 space-y-4 animate-fadeIn">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-xs text-slate-400 mb-2 text-center">Dọc</p>
                                        <div className="space-y-1">
                                            {portraitRatios.map(r => (
                                                <button key={r} onClick={() => { selectAspectRatio(r); setIsMoreSettingsOpen(false); }} className={`w-full p-1.5 text-xs rounded-md flex flex-col items-center justify-center transition-colors ${aspectRatio === r ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}><span>{r}</span><span className="text-[10px] text-slate-400">{aspectRatioDimensions[r]}</span></button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 mb-2 text-center">Ngang</p>
                                        <div className="space-y-1">
                                            {landscapeRatios.map(r => (
                                                <button key={r} onClick={() => { selectAspectRatio(r); setIsMoreSettingsOpen(false); }} className={`w-full p-1.5 text-xs rounded-md flex flex-col items-center justify-center transition-colors ${aspectRatio === r ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}><span>{r}</span><span className="text-[10px] text-slate-400">{aspectRatioDimensions[r]}</span></button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <button onClick={() => { selectAspectRatio("1:1"); setIsMoreSettingsOpen(false); }} className={`w-full p-1.5 text-xs rounded-md flex flex-col items-center justify-center transition-colors ${aspectRatio === "1:1" ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}><span>1:1</span><span className="text-[10px] text-slate-400">{aspectRatioDimensions["1:1"]}</span></button>
                                    <button onClick={() => selectAspectRatio("custom")} className={`w-full p-1.5 text-xs rounded-md flex flex-col items-center justify-center transition-colors ${aspectRatio === "custom" ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}><span>Tùy chỉnh</span>{customRatio && <span className="text-[10px] text-slate-400">{getAspectRatioDimensions('custom', customRatio)}</span>}</button>
                                    {isCustomRatioEditing && (
                                        <div className="mt-2 space-y-3 p-3 bg-gray-800 rounded-lg border border-gray-700 animate-fadeIn">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div><label className="text-xs text-slate-400">Rộng</label><FormattedNumberInput value={customWidth} onChange={setCustomWidth} className="mt-1 block w-full text-sm rounded-md bg-gray-900 border-gray-700 focus:ring-indigo-500 focus:border-indigo-500"/></div>
                                                <div><label className="text-xs text-slate-400">Cao</label><FormattedNumberInput value={customHeight} onChange={setCustomHeight} className="mt-1 block w-full text-sm rounded-md bg-gray-900 border-gray-700 focus:ring-indigo-500 focus:border-indigo-500"/></div>
                                            </div>
                                            <button onClick={handleApplyCustomRatio} className="w-full text-xs font-semibold py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Áp dụng</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                     <div>
                        <label className="text-xs font-semibold text-gray-400">Số lượng Ảnh</label>
                        <div className="grid grid-cols-4 gap-2 mt-2">
                            {([1, 2, 3, 4] as ImageQuantity[]).map(q => (
                                 <button key={q} onClick={() => setImageQuantity(q)} className={`h-10 border-2 rounded-lg transition-colors flex items-center justify-center text-sm font-semibold ${imageQuantity === q ? 'border-indigo-500 bg-indigo-900/50' : 'border-gray-600 hover:border-indigo-500'}`}>{q}</button>
                            ))}
                        </div>
                    </div>
                    <div className="pt-4 border-t border-gray-700">
                         <label className="text-xs font-semibold text-gray-400 mb-2 block">Tiện ích khác</label>
                         <button onClick={() => onNavigate('Kho Tiện Ích/tool_photo_restore')} className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-colors text-left group">
                            <div className="p-1.5 bg-indigo-900/50 rounded-md group-hover:bg-indigo-600 transition-colors"><SparklesIcon className="h-4 w-4 text-indigo-300 group-hover:text-white" /></div>
                            <div><span className="text-sm font-medium text-gray-200 block">Khôi phục Ảnh cũ</span><span className="text-[10px] text-gray-500 block">Làm nét & phục chế</span></div>
                        </button>
                    </div>
                </div>
                <div className="flex-shrink-0 p-4 border-t border-gray-700 flex items-center justify-between">
                    <button onClick={handleResetSettings} className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">Đặt lại</button>
                </div>
            </aside>
        );
    };

    const creditCost = selectedImage ? currentCost : currentCost * imageQuantity;

    const allAspectRatios = useMemo(() => {
        const ratios = new Set(history.map(h => {
            if (h.settings.aspectRatio === 'custom' && h.settings.customRatio) {
                return `custom (${h.settings.customRatio.width}:${h.settings.customRatio.height})`;
            }
            return h.settings.aspectRatio;
        }));
        return Array.from(ratios);
    }, [history]);
    
    const resetFilters = () => {
        setSearchTerm('');
        setFilters({ mode: 'all', aspectRatio: 'all' });
        setActiveHeaderPopover(null);
    };
    
    const filteredHistory = useMemo(() => {
        return history.filter(result => {
            const searchMatch = !searchTerm || result.prompt.toLowerCase().includes(searchTerm.toLowerCase());
            const modeMatch = filters.mode === 'all' || result.settings.generationMode === filters.mode;
            let aspectRatioMatch = filters.aspectRatio === 'all' || result.settings.aspectRatio === filters.aspectRatio;
            if (filters.aspectRatio.startsWith('custom') && result.settings.aspectRatio === 'custom') {
                const filterRatio = filters.aspectRatio;
                const resultRatio = `custom (${result.settings.customRatio?.width}:${result.settings.customRatio?.height})`;
                aspectRatioMatch = filterRatio === resultRatio;
            }
            return searchMatch && modeMatch && aspectRatioMatch;
        });
    }, [history, searchTerm, filters]);
    
    const groupedHistory = useMemo(() => filteredHistory.reduce((acc, result) => {
        const date = result.date;
        if (!acc[date]) acc[date] = [];
        acc[date].push(result);
        return acc;
    }, {} as Record<string, GenerationResult[]>), [filteredHistory]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast('Đã sao chép ID Tác vụ!', 'success');
    };

    const moreMenuFeatures = [
        { name: 'Nâng cấp HD', icon: PhotoIcon },
        { name: 'Khôi phục', icon: SparklesIcon },
        { name: 'Xóa nền', icon: SparklesIcon },
        { name: 'Tẩy', icon: EraserIcon },
        { name: 'Vẽ lại', icon: ArtIcon },
        { name: 'Mở rộng', icon: ArrowsPointingOutIcon },
        { name: 'Chuyển thành Video', icon: FilmIcon },
    ];

    if (viewMode === 'expand' && editingImage) {
        return <ExpandView image={editingImage} onBack={() => { setViewMode('gallery'); setEditingImage(null); }} onGenerate={handleExpandedImageGenerated} tool={tool} />;
    }
    
    if (viewMode === 'imageEditor' && editingImage) {
        return <ImageEditorView image={editingImage} initialMode={editorInitialMode} onBack={() => { setViewMode('gallery'); setEditingImage(null); }} onGenerate={handleEditedImageGenerated} tool={tool} />;
    }

    return (
        <div className="h-full w-full bg-black text-gray-300 flex">
            <StyleLibraryModal 
                isOpen={isStyleModalOpen} 
                onClose={() => setIsStyleModalOpen(false)} 
                onSelect={(style) => setImageStyle(style as ImageStyle)} 
                currentStyle={imageStyle} 
            />

            <input type="file" ref={uploadInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            {previewImage && (
                <Modal isOpen={!!previewImage} onClose={() => setPreviewImage(null)} hideFooter size="full">
                    <div className="relative h-[90vh] bg-gray-900 rounded-lg overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700 z-50">
                             <div className="flex items-center gap-2">
                                <span className="text-white font-semibold">Xem trước</span>
                             </div>
                             <div className="flex items-center gap-2">
                                 <button onClick={() => setPreviewScale(Math.min(10, previewScale + 0.1))} className="p-2 bg-gray-700 rounded hover:bg-gray-600 text-white" title="Zoom In"><PlusIcon className="h-4 w-4"/></button>
                                 <span className="text-xs text-gray-400 w-12 text-center">{Math.round(previewScale * 100)}%</span>
                                 <button onClick={() => setPreviewScale(Math.max(0.1, previewScale - 0.1))} className="p-2 bg-gray-700 rounded hover:bg-gray-600 text-white" title="Zoom Out"><div className="h-0.5 w-4 bg-white rounded"></div></button>
                                 <button onClick={() => {setPreviewScale(1); setPreviewPosition({x:0, y:0});}} className="p-2 bg-gray-700 rounded hover:bg-gray-600 text-white ml-2" title="Reset View"><ArrowPathIcon className="h-4 w-4"/></button>
                                 <button onClick={() => setPreviewImage(null)} className="p-2 text-gray-400 hover:text-white ml-4"><XCircleIcon className="h-6 w-6" /></button>
                             </div>
                        </div>
                        
                        <div 
                            className="flex-grow overflow-hidden flex items-center justify-center bg-black relative cursor-move"
                            onWheel={handlePreviewWheel}
                            onMouseDown={handlePreviewMouseDown}
                            onMouseMove={handlePreviewMouseMove}
                            onMouseUp={handlePreviewMouseUp}
                            onMouseLeave={handlePreviewMouseUp}
                        >
                            <img 
                                src={previewImage} 
                                alt="Image preview" 
                                className="max-w-none origin-center transition-transform duration-75 ease-linear pointer-events-none" 
                                style={{ 
                                    transform: `translate(${previewPosition.x}px, ${previewPosition.y}px) scale(${previewScale})`,
                                    maxHeight: '100%',
                                    maxWidth: '100%'
                                }}
                            />
                        </div>
                        <div className="p-2 text-center text-xs text-gray-500 bg-gray-800">
                             Dùng lăn chuột để phóng to/thu nhỏ. Kéo thả để di chuyển.
                        </div>
                    </div>
                </Modal>
            )}
            {promptDetail && (
                <Modal isOpen={!!promptDetail} onClose={() => setPromptDetail(null)} title="Chi tiết Prompt" hideFooter size="lg">
                    <div className="space-y-4">
                        <div><h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Prompt Gốc</h4><p className="mt-1 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-md text-gray-800 dark:text-gray-200">{promptDetail.prompt}</p></div>
                        {promptDetail.enhancedPrompt && ( <div><h4 className="text-sm font-semibold text-yellow-500 dark:text-yellow-400 flex items-center gap-2"><SparklesIcon className="h-4 w-4"/>Prompt đã Tối ưu hóa</h4><p className="mt-1 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-gray-800 dark:text-gray-200">{promptDetail.enhancedPrompt}</p></div> )}
                    </div>
                </Modal>
            )}
             {hdFixTarget && (
                <Modal isOpen={!!hdFixTarget} onClose={() => setHdFixTarget(null)} title="Tùy chỉnh Nâng cấp HD" confirmText="Bắt đầu Nâng cấp" onConfirm={executeHdFix} isConfirmDisabled={isGenerating}>
                    <div className="space-y-6 p-2">
                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tỷ lệ phóng đại: <span className="font-bold text-indigo-400">{hdScalingRatio}x</span></label><input type="range" min="1" max="4" step="0.1" value={hdScalingRatio} onChange={e => setHdScalingRatio(parseFloat(e.target.value))} className="w-full mt-2 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"/></div>
                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Độ phân giải (DPI)</label><input type="number" value={hdDpi} onChange={e => setHdDpi(parseInt(e.target.value) || 72)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm"/></div>
                    </div>
                </Modal>
            )}
            <div className="w-16 bg-black flex flex-col items-center py-4 space-y-6 flex-shrink-0">
                <div className="p-2 bg-indigo-600 rounded-lg"><PhotoIcon className="h-6 w-6 text-white"/></div>
                <VideoIcon className="h-6 w-6 text-gray-500"/>
                <SparklesIcon className="h-6 w-6 text-gray-500"/>
                <CpuChipSolidIcon className="h-6 w-6 text-gray-500"/>
                <MusicalNoteIcon className="h-6 w-6 text-gray-500"/>
                <StarIcon className="h-6 w-6 text-gray-500"/>
                <div className="mt-auto pt-6"><AdjustmentsHorizontalIcon className="h-6 w-6 text-gray-500"/></div>
            </div>
            <Sidebar />
            <main className="flex-1 w-0 flex flex-col bg-[#111827] overflow-hidden">
                <header className="flex-shrink-0 h-16 px-8 flex justify-between items-center border-b border-gray-700">
                    <div className="flex items-center">
                        <CreditBalanceDisplay balance={currentCredits} onAdd={() => onNavigate && onNavigate('Ví Của Tôi')} />
                    </div>
                    <div ref={headerPopoverRef} className="relative flex items-center gap-2 p-1 bg-gray-800 rounded-lg">
                        <button onClick={() => setActiveHeaderPopover(p => p === 'search' ? null : 'search')} className={`p-2 rounded-md ${activeHeaderPopover === 'search' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}><MagnifyingGlassIcon className="h-5 w-5"/></button>
                        <button onClick={() => setActiveHeaderPopover(p => p === 'grid' ? null : 'grid')} className={`p-2 rounded-md ${activeHeaderPopover === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}><Squares2X2Icon className="h-5 w-5"/></button>
                        <button onClick={() => setActiveHeaderPopover(p => p === 'filter' ? null : 'filter')} className={`p-2 rounded-md ${activeHeaderPopover === 'filter' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}><AdjustmentsHorizontalIcon className="h-5 w-5"/></button>
                        {activeHeaderPopover === 'search' && (
                            <div className="absolute top-full right-0 mt-2 w-72 bg-[#2d2d2d] rounded-lg shadow-lg border border-gray-700 z-10 p-2">
                                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm kiếm theo prompt..." className="w-full bg-gray-800 text-white rounded-md border-gray-600 px-3 py-1.5 text-sm" />
                            </div>
                        )}
                        {activeHeaderPopover === 'grid' && (
                            <div className="absolute top-full right-0 mt-2 bg-[#2d2d2d] rounded-lg shadow-lg border border-gray-700 z-10 p-2 flex items-center gap-2">
                                {[2, 4, 6].map(c => ( <button key={c} onClick={() => setGridCols(c as 2|4|6)} className={`px-3 py-1 text-sm rounded ${gridCols === c ? 'bg-indigo-600 text-white' : 'hover:bg-gray-700'}`}>{c} cột</button> ))}
                            </div>
                        )}
                        {activeHeaderPopover === 'filter' && (
                             <div className="absolute top-full right-0 mt-2 w-72 bg-[#2d2d2d] rounded-lg shadow-lg border border-gray-700 z-10 p-4 space-y-4">
                                <div><label className="text-xs text-gray-400">Chế độ Tạo ảnh</label><select value={filters.mode} onChange={e => setFilters(f => ({...f, mode: e.target.value as any}))} className="w-full mt-1 bg-gray-800 text-white rounded-md border-gray-600 text-sm"><option value="all">Tất cả</option><option value="Tiêu chuẩn">Tiêu chuẩn</option><option value="Chất lượng">Chất lượng</option></select></div>
                                <div><label className="text-xs text-gray-400">Tỷ lệ Ảnh</label><select value={filters.aspectRatio} onChange={e => setFilters(f => ({...f, aspectRatio: e.target.value as any}))} className="w-full mt-1 bg-gray-800 text-white rounded-md border-gray-600 text-sm"><option value="all">Tất cả</option>{allAspectRatios.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                                <button onClick={resetFilters} className="w-full text-center text-xs text-indigo-400 hover:underline">Đặt lại bộ lọc</button>
                            </div>
                        )}
                    </div>
                </header>
                <div className="flex-grow px-8 pt-8 overflow-y-auto">
                    {isGenerating && (
                        <div className="mb-8 animate-fadeIn">
                            <p className="text-sm text-gray-400 mb-4">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <div className="mb-8">
                                <div className="flex justify-between items-center mb-4 gap-4">
                                    <div className="flex items-start gap-2 min-w-0">
                                        <span className="flex-shrink-0 text-xs font-bold bg-indigo-600 text-white px-2 py-1 rounded-md">Txt2Img</span>
                                        <p className="break-words">{prompt}</p>
                                    </div>
                                    <div className="flex flex-shrink-0 items-center gap-3 text-gray-400">
                                        <span className="text-xs font-semibold">{getAspectRatioDimensions(aspectRatio, customRatio)}</span>
                                        <InformationCircleIcon className="h-5 w-5"/>
                                        <ArrowPathIcon className="h-5 w-5"/>
                                        <EllipsisHorizontalIcon className="h-5 w-5"/>
                                    </div>
                                </div>
                                <div className={`grid grid-cols-${gridCols} gap-4`}>
                                    {Array.from({ length: selectedImage ? 1 : imageQuantity }).map((_, i) => (
                                        <div key={i} className={`${getAspectRatioClass(aspectRatio)} bg-gray-800 rounded-lg flex items-center justify-center animate-pulse`} style={getAspectRatioStyle(aspectRatio, customRatio)}>
                                            <ArrowPathIcon className="h-8 w-8 text-gray-600 animate-spin" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {Object.keys(groupedHistory).length > 0 && Object.entries(groupedHistory).map(([date, results]: [string, GenerationResult[]], groupIndex) => (
                        <div key={date + groupIndex} className="mb-8">
                            <p className="text-sm text-gray-400 mb-4">{date}</p>
                            {results.map((result) => (
                                <div key={result.taskId} className="mb-8">
                                    <div className="flex justify-between items-center mb-4 gap-4">
                                        <div className="flex items-start gap-2 min-w-0">
                                            <span className="flex-shrink-0 text-xs font-bold bg-indigo-600 text-white px-2 py-1 rounded-md">Txt2Img</span>
                                            <p className="break-words">{result.prompt}</p>
                                            {result.enhancedPrompt && (
                                                <div className="relative group flex-shrink-0">
                                                    <SparklesIcon className="h-4 w-4 text-yellow-400" />
                                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-72 p-3 bg-black text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-gray-700">
                                                        <strong className="block text-yellow-300 mb-1">Prompt đã tối ưu:</strong> {result.enhancedPrompt}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="relative flex flex-shrink-0 items-center gap-3 text-gray-400">
                                            <span className="text-xs font-semibold">{getAspectRatioDimensions(result.settings.aspectRatio, result.settings.customRatio || null)}</span>
                                            <Tooltip content="Xem thông tin">
                                                <button onClick={(e) => { e.stopPropagation(); setActiveInfoPopover(activeInfoPopover === result.taskId ? null : result.taskId); }} className="hover:text-white"><InformationCircleIcon className="h-5 w-5"/></button>
                                            </Tooltip>
                                             {activeInfoPopover === result.taskId && (
                                                <div ref={infoPopoverRef} className="absolute top-full right-0 mt-2 w-80 z-20 bg-[#2d2d2d] text-white rounded-lg shadow-lg border border-gray-700 p-4 text-xs animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center"><span className="text-gray-400">ID Tác vụ</span><div className="flex items-center gap-2"><span className="font-mono">{result.taskId}</span><button onClick={() => handleCopy(result.taskId)} className="text-gray-400 hover:text-white"><ClipboardDocumentIcon className="h-4 w-4" /></button></div></div>
                                                        <div className="flex justify-between items-center"><span className="text-gray-400">Trạng thái</span><span className="px-2 py-0.5 bg-red-800/50 text-red-300 rounded-md text-xs font-semibold">Riêng tư</span></div>
                                                        <div className="flex justify-between items-center"><span className="text-gray-400">Chi phí</span><span className="text-gray-200">{result.cost.toLocaleString('vi-VN')} Credit</span></div>
                                                        <div className="flex justify-between items-center"><span className="text-gray-400">Số dư sau đó</span><span className="text-gray-200">{result.balanceAfter.toLocaleString('vi-VN')} Credit</span></div>
                                                        <div className="flex justify-between items-center"><span className="text-gray-400">Thời gian tạo</span><span className="text-gray-200">{result.creationTime}</span></div>
                                                    </div>
                                                </div>
                                            )}
                                            <Tooltip content="Tái tạo">
                                                <button onClick={() => handleRegenerate(result)} disabled={isGenerating} className="hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"><ArrowPathIcon className="h-5 w-5"/></button>
                                            </Tooltip>
                                            <div className="relative">
                                                <Tooltip content="Thêm">
                                                    <button onClick={(e) => { e.stopPropagation(); setOpenGroupMoreMenuId(openGroupMoreMenuId === result.taskId ? null : result.taskId); }} disabled={isGenerating} className="p-1 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"><EllipsisHorizontalIcon className="h-5 w-5" /></button>
                                                </Tooltip>
                                                {openGroupMoreMenuId === result.taskId && (
                                                    <div ref={moreMenuRef} className="absolute bottom-full right-0 mb-2 w-48 bg-[#222] rounded-lg shadow-lg border border-gray-700 z-20 animate-fadeIn p-1">
                                                        <ul className="text-sm text-gray-200">
                                                            {moreMenuFeatures.map(feature => (<li key={feature.name} onClick={() => handleFeatureClick(feature.name, result, result.images[0])} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-700 cursor-pointer"><feature.icon className="h-4 w-4" /><span>{feature.name}</span></li>))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`grid grid-cols-${gridCols} gap-4`}>
                                        {result.images.map((imgSrc: string, imgIndex: number) => (
                                                <div key={imgIndex} className="relative group rounded-lg overflow-hidden">
                                                    <img src={imgSrc} alt={`Ảnh được tạo ${imgIndex + 1} cho prompt: ${result.prompt}`} className={`w-full h-full object-cover ${getAspectRatioClass(result.settings.aspectRatio)}`} style={getAspectRatioStyle(result.settings.aspectRatio, result.settings.customRatio || null)}/>
                                                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col justify-between p-2 text-white">
                                                        <div className="flex justify-end items-start gap-1.5">
                                                            <Tooltip content="Phóng to ảnh"><button onClick={(e) => { e.stopPropagation(); setPreviewImage(imgSrc); }} className="p-1.5 bg-black/40 rounded-full hover:bg-black/70 transition-colors"><ArrowsPointingOutIcon className="h-4 w-4" /></button></Tooltip>
                                                            {result.enhancedPrompt && (<Tooltip content="Xem prompt đã tối ưu"><button onClick={(e) => { e.stopPropagation(); setPromptDetail({prompt: result.prompt, enhancedPrompt: result.enhancedPrompt}); }} className="p-1.5 bg-black/40 rounded-full hover:bg-black/70 transition-colors"><SparklesIcon className="h-4 w-4" /></button></Tooltip>)}
                                                            <Tooltip content="Tải xuống ảnh"><button onClick={(e) => { e.stopPropagation(); handleDownload(imgSrc, result.taskId, imgIndex); }} className="p-1.5 bg-black/40 rounded-full hover:bg-black/70 transition-colors"><DocumentArrowDownIcon className="h-4 w-4" /></button></Tooltip>
                                                        </div>
                                                        <div className="flex justify-center items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full p-1 self-center">
                                                            <Tooltip content="Sử dụng lại prompt & cài đặt"><button onClick={(e) => { e.stopPropagation(); handleReusePrompt(result.prompt, result.settings); }} className="p-1.5 rounded-full hover:bg-white/20 transition-colors"><ArrowPathIcon className="h-4 w-4" /></button></Tooltip>
                                                            <Tooltip content="Sao chép prompt"><button onClick={(e) => { e.stopPropagation(); handleCopyPrompt(result.prompt); }} className="p-1.5 rounded-full hover:bg-white/20 transition-colors"><ClipboardDocumentIcon className="h-4 w-4" /></button></Tooltip>
                                                            <Tooltip content="Chỉnh sửa với ảnh này"><button onClick={(e) => { e.stopPropagation(); setSelectedImage(imgSrc); }} className="p-1.5 bg-indigo-600 rounded-full hover:bg-indigo-500 transition-colors"><PlusIcon className="h-4 w-4" /></button></Tooltip>
                                                            <Tooltip content="Xóa ảnh này"><button onClick={(e) => { e.stopPropagation(); handleDeleteSingleImage(loggedInUser.id, result.taskId, imgIndex); }} className="p-1.5 rounded-full hover:bg-red-500/50 transition-colors"><TrashIcon className="h-4 w-4" /></button></Tooltip>
                                                            <div className="relative">
                                                                <Tooltip content="Thêm"><button onClick={(e) => { e.stopPropagation(); setOpenMoreMenuId(openMoreMenuId === result.taskId + imgIndex ? null : result.taskId + imgIndex); }} className="p-1.5 rounded-full hover:bg-white/20 transition-colors"><EllipsisHorizontalIcon className="h-5 w-5" /></button></Tooltip>
                                                                {openMoreMenuId === result.taskId + imgIndex && (
                                                                    <div ref={moreMenuRef} className="absolute bottom-full right-0 mb-2 w-48 bg-[#222] rounded-lg shadow-lg border border-gray-700 z-20 animate-fadeIn p-1">
                                                                        <ul className="text-sm text-gray-200">
                                                                            {moreMenuFeatures.map(feature => (<li key={feature.name} onClick={() => handleFeatureClick(feature.name, result, imgSrc)} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-700 cursor-pointer"><feature.icon className="h-4 w-4" /><span>{feature.name}</span></li>))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                    
                    {Object.keys(groupedHistory).length === 0 && !isGenerating && (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 -mt-16">
                            {searchTerm || filters.mode !== 'all' || filters.aspectRatio !== 'all' ? (
                                <><MagnifyingGlassIcon className="h-16 w-16 mb-4"/><h2 className="text-2xl font-bold text-gray-300">Không tìm thấy kết quả</h2><p>Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn.</p><button onClick={resetFilters} className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Đặt lại bộ lọc</button></>
                            ) : (
                                <><SparklesIcon className="h-16 w-16 mb-4"/><h2 className="text-2xl font-bold text-gray-300">Bắt đầu Sáng tạo</h2><p>Nhập mô tả của bạn vào ô bên dưới để tạo những hình ảnh độc đáo.</p></>
                            )}
                        </div>
                    )}
                </div>
                <footer className="flex-shrink-0 px-4 pt-4 pb-6 border-t border-gray-700 bg-[#111827]">
                    <div className="w-full max-w-4xl mx-auto">
                        <div className="bg-white rounded-full shadow-2xl p-2 flex items-center gap-2">
                            {selectedImage && (
                                <div className="relative ml-1 flex-shrink-0 animate-fadeIn"><img src={selectedImage} alt="Đã chọn cho prompt" className="h-11 w-11 rounded-full object-cover" /><button onClick={() => setSelectedImage(null)} className="absolute -top-1 -right-1 bg-gray-700 text-white rounded-full p-0.5 hover:bg-gray-900 transition-colors"><XCircleIcon className="h-4 w-4" /></button></div>
                            )}
                            {!selectedImage && ( 
                                <button 
                                    onClick={() => uploadInputRef.current?.click()}
                                    className="flex-shrink-0 h-11 w-11 flex items-center justify-center bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 transition-colors"
                                    title="Tải ảnh lên (Image-to-Image)"
                                >
                                    <ArrowUpTrayIcon className="h-6 w-6" />
                                </button> 
                            )}
                            <input 
                                id="main-prompt-input" 
                                type="text" 
                                value={prompt} 
                                onChange={(e) => setPrompt(e.target.value)} 
                                onKeyPress={(e) => e.key === 'Enter' && handleGenerate()} 
                                placeholder={
                                    selectedImage 
                                        ? (imageStyle !== 'Mặc định' && imageStyle !== 'Ngẫu nhiên' ? `Style "${imageStyle}" đã chọn. Nhập thay đổi hoặc để trống...` : "Nhập thay đổi hoặc để trống để AI tự sáng tạo...") 
                                        : (imageStyle !== 'Mặc định' && imageStyle !== 'Ngẫu nhiên' ? `Style "${imageStyle}" đã chọn. Nhập mô tả hoặc để trống...` : "Nhập yêu cầu của bạn vào đây")
                                }
                                className="flex-grow bg-transparent border-none focus:ring-0 text-gray-900 placeholder-gray-500 text-base"
                            />
                            <button onClick={handleGenerate} disabled={isGenerating} className="flex-shrink-0 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5">Tạo <SparklesIcon className="h-4 w-4" /> {creditCost}</button>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default ImageGenerator;
