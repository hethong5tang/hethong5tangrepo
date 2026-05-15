
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Modality } from '@google/genai';
import { 
    ArrowLeftIcon, PencilSquareIcon, ArrowPathIcon, ClipboardDocumentIcon, 
    GlobeAltIcon, SparklesIcon, MegaphoneIcon,
    PresentationChartLineIcon, CheckCircleIcon, CpuChipIcon,
    TagIcon, SpeakerWaveIcon, DocumentArrowDownIcon, PlayIcon,
    StopIcon, TrashIcon, ClockIcon, ChevronDownIcon, CheckIcon, BoltIcon
} from '../Icons';
import { IntegrationTool } from '../../features/settings/types';
import { useAuth } from '../../features/auth/useAuth';
import { useUser } from '../../features/users/useUser';
import { useActions } from '../../features/actions/useActions';
import { useToast } from '../../components/ToastProvider';
import { findUserInTree } from '../../services/userService';
import CreditBalanceDisplay from './CreditBalanceDisplay';
import Modal from '../../components/Modal';
import { aiService } from '../../services/aiService'; // Import Service
import { useSettings } from '../../features/settings/useSettings';
import { ALL_GEMINI_MODELS } from '../../constants';

// ... (KEEP CONSTANTS: MARKETING_TOOLKITS, TONES, LANGUAGES, VOICES, parseScriptContent) ...
// Để ngắn gọn, tôi giữ nguyên các hằng số và interface này vì chúng không đổi.
// Bạn chỉ cần đảm bảo giữ lại phần khai báo biến ở trên cùng file TextGenerator.tsx như cũ.

// --- DATA STRUCTURES FOR MARKETING SUITE ---
// (Copy lại toàn bộ constants từ file cũ hoặc giữ nguyên nếu bạn merge thông minh)
// ... [MARKETING_TOOLKITS, TONES, etc.] ...
// DO NOT REMOVE THE CONSTANTS DEFINED IN THE ORIGINAL FILE. I WILL RE-INCLUDE THEM FOR SAFETY.

interface Feature {
    id: string;
    name: string;
    description: string;
    promptTemplate: string;
    requiresTone?: boolean;
    requiresAudience?: boolean;
    requiresProduct?: boolean;
}

interface Toolkit {
    id: string;
    name: string;
    shortName: string;
    description: string;
    icon: React.FC<{className?: string}>;
    color: string;
    bgColor: string;
    features: Feature[];
}

const MARKETING_TOOLKITS: Toolkit[] = [
    {
        id: 'automation',
        name: 'Tự Động Hóa',
        shortName: 'Tự Động',
        description: 'Tạo hàng loạt, Lịch đăng bài',
        icon: CpuChipIcon,
        color: 'text-teal-400',
        bgColor: 'bg-teal-400/10',
        features: [
            { 
                id: 'bulk_captions', 
                name: 'Tạo 30 Caption (1 Tháng)', 
                description: 'Kế hoạch content cho cả tháng.', 
                promptTemplate: `Đóng vai một Chuyên gia Content Marketing. Hãy viết lịch đăng bài 30 ngày (30 captions) cho sản phẩm/thương hiệu: "[PRODUCT]".
                
                Mô tả chi tiết sản phẩm: "[TOPIC]".
                Khách hàng mục tiêu: "[AUDIENCE]".
                Giọng văn: [TONE].

                Yêu cầu bắt buộc:
                1. Nội dung PHẢI xoay quanh "[PRODUCT]" và các đặc điểm trong mô tả. Không viết chung chung.
                2. Chia làm 3 nhóm nội dung (Content Pillars) xen kẽ:
                   - Chia sẻ giá trị (Kiến thức, Mẹo vặt liên quan đến sản phẩm).
                   - Tương tác vui vẻ (Câu hỏi, Minigame, Hài hước).
                   - Bán hàng / Ưu đãi (Giới thiệu sản phẩm, Feedback, Kêu gọi mua hàng).
                3. Mỗi caption cần có: Tiêu đề thu hút (Hook) và Nội dung chính (Body).
                4. Thêm 3-5 hashtag phù hợp.
                
                Trình bày dưới dạng danh sách rõ ràng từng ngày.`,
                requiresProduct: true,
                requiresAudience: true,
                requiresTone: true
            },
            { id: 'bulk_titles', name: '30 Tiêu đề bài viết', description: 'Kho tiêu đề blog/video hấp dẫn.', promptTemplate: 'Viết 30 tiêu đề bài viết/video cực kỳ thu hút (Clickbait nhưng giá trị) về chủ đề: "[TOPIC]". Liên quan đến sản phẩm: "[PRODUCT]". Tập trung vào các từ khóa: Bí mật, Hướng dẫn, Sai lầm, Top list. Giọng văn: [TONE].', requiresTone: true, requiresProduct: true },
            { id: 'bulk_ideas', name: '100 Ý tưởng ngắn', description: 'Kho ý tưởng dồi dào.', promptTemplate: 'Liệt kê 100 ý tưởng nội dung ngắn (Short form content ideas) cho kênh TikTok/Reels về chủ đề: "[TOPIC]". của thương hiệu "[PRODUCT]". Chia thành các mục: Giáo dục, Hài hước, Behind the scenes, Trend.', requiresTone: false, requiresProduct: true },
            { id: 'template_maker', name: 'Tạo Template nội dung', description: 'Mẫu dùng lại được.', promptTemplate: 'Tạo một Template nội dung mẫu (điền vào chỗ trống) để tôi có thể tái sử dụng nhiều lần cho sản phẩm "[PRODUCT]". Cấu trúc gồm: Headline, Problem, Agitation, Solution, Call to Action.', requiresProduct: true },
        ]
    },
    {
        id: 'planner',
        name: 'Lập Kế Hoạch',
        shortName: 'Kế Hoạch',
        description: 'Chiến lược, Persona',
        icon: PresentationChartLineIcon,
        color: 'text-blue-400',
        bgColor: 'bg-blue-400/10',
        features: [
            { id: 'persona', name: 'Chân dung khách hàng', description: 'Vẽ chân dung khách hàng mục tiêu.', promptTemplate: 'Phân tích và tạo hồ sơ chân dung khách hàng mục tiêu (Customer Persona) chi tiết cho sản phẩm: "[PRODUCT]". Mô tả: "[TOPIC]". Bao gồm: Nhân khẩu học, Nỗi đau (Pain points), Mục tiêu, Hành vi mua hàng và Kênh tiếp cận ưa thích.', requiresProduct: true },
            { id: 'strategy_6m', name: 'Chiến lược 6 tháng', description: 'Lộ trình phát triển dài hạn.', promptTemplate: 'Lập chiến lược Marketing 6 tháng chi tiết cho thương hiệu: "[PRODUCT]". Mô tả: "[TOPIC]". Phân bổ theo từng tháng với: Mục tiêu chính, Kênh trọng tâm, Hoạt động key hook, và KPI dự kiến.', requiresProduct: true },
            { id: 'content_calendar', name: 'Lịch Content Tuần', description: 'Kế hoạch đăng bài 7 ngày.', promptTemplate: 'Tạo lịch đăng bài chi tiết trong 7 ngày cho kênh Facebook/TikTok của sản phẩm: "[PRODUCT]". Mô tả: "[TOPIC]". Mỗi ngày bao gồm: Giờ đăng, Chủ đề, Định dạng (Video/Ảnh), và Góc nhìn (Angle).', requiresProduct: true },
            { id: 'usp_analysis', name: 'Phân tích USP/UVP', description: 'Tìm điểm bán hàng độc nhất.', promptTemplate: 'Phân tích sản phẩm "[PRODUCT]" dựa trên mô tả: "[TOPIC]". Hãy xác định 5 USP (Unique Selling Point) và UVP (Unique Value Proposition) mạnh nhất để cạnh tranh trên thị trường.', requiresProduct: true },
        ]
    },
    {
        id: 'content',
        name: 'Viết Content Bán Hàng',
        shortName: 'Copywriting',
        description: 'Bài SEO, PR, Sales',
        icon: PencilSquareIcon,
        color: 'text-green-400',
        bgColor: 'bg-green-400/10',
        features: [
            { id: 'sales_copy_aida', name: 'Bài bán hàng (AIDA)', description: 'Công thức AIDA kinh điển.', promptTemplate: 'Viết một bài bán hàng (Sales Page) cho sản phẩm "[PRODUCT]" áp dụng mô hình AIDA (Attention - Interest - Desire - Action). Đặc điểm nổi bật (USP): "[TOPIC]". Giọng văn: [TONE].', requiresProduct: true, requiresAudience: true, requiresTone: true },
            { id: 'sales_copy_pas', name: 'Bài bán hàng (PAS)', description: 'Công thức PAS (Nỗi đau).', promptTemplate: 'Viết bài quảng cáo cho "[PRODUCT]" theo công thức PAS (Problem - Agitation - Solution). Tập trung xoáy sâu vào nỗi đau của khách hàng: "[AUDIENCE]" và đưa ra giải pháp là sản phẩm. Mô tả: "[TOPIC]".', requiresProduct: true, requiresAudience: true },
            { id: 'seo_article', name: 'Bài viết chuẩn SEO', description: 'Tối ưu từ khóa Website.', promptTemplate: 'Viết một bài blog chuẩn SEO dài khoảng 1000 từ về chủ đề: "[TOPIC]". Liên quan sản phẩm: "[PRODUCT]". Tối ưu hóa cho từ khóa chính. Cấu trúc bài viết gồm H1, H2, H3 rõ ràng. Giọng văn: [TONE].', requiresTone: true, requiresProduct: true },
            { id: 'email_sequence', name: 'Chuỗi Email Marketing', description: 'Chuỗi 3 email chăm sóc.', promptTemplate: 'Viết chuỗi 3 email marketing (Cold email, Follow-up, Closing) để giới thiệu sản phẩm "[PRODUCT]". tới khách hàng "[AUDIENCE]".', requiresProduct: true, requiresAudience: true },
        ]
    },
    {
        id: 'social',
        name: 'Social Media',
        shortName: 'Social',
        description: 'FB, TikTok, YouTube',
        icon: GlobeAltIcon,
        color: 'text-pink-400',
        bgColor: 'bg-pink-400/10',
        features: [
            { id: 'fb_caption', name: 'Caption Facebook', description: 'Status thu hút tương tác.', promptTemplate: 'Viết 5 caption Facebook hấp dẫn để bán/giới thiệu "[PRODUCT]". Mô tả: "[TOPIC]". Mỗi caption một phong cách khác nhau (Hài hước, Nghiêm túc, Kể chuyện). Kèm emoji và Call to Action. Bắt buộc phải nhắc đến tên sản phẩm và các lợi ích chính.', requiresProduct: true, requiresTone: true },
            { id: 'tiktok_script', name: 'Kịch bản TikTok/Reels', description: 'Kịch bản video ngắn.', promptTemplate: 'Viết kịch bản chi tiết cho video TikTok/Reels (30-60s) về chủ đề: "[TOPIC]". Liên quan sản phẩm: "[PRODUCT]". Cấu trúc: Hook (3s đầu) -> Nội dung chính -> CTA. Bao gồm cả lời thoại và mô tả hình ảnh.', requiresTone: true, requiresProduct: true },
            { id: 'livestream_script', name: 'Kịch bản Livestream', description: 'Kịch bản bán hàng trực tiếp.', promptTemplate: 'Viết kịch bản Livestream bán hàng trong 60 phút cho sản phẩm: "[PRODUCT]". USP: "[TOPIC]". Bao gồm: Mở đầu, Minigame giữ chân, Giới thiệu sản phẩm, Xử lý từ chối, Chốt đơn.', requiresProduct: true },
            { id: 'youtube_outline', name: 'Dàn ý YouTube Video', description: 'Video dài.', promptTemplate: 'Lên dàn ý chi tiết (Outline) cho video YouTube dài 10 phút về chủ đề: "[TOPIC]". Sản phẩm: "[PRODUCT]". Gồm các phần: Intro, Body (3 luận điểm chính), Outro.', requiresProduct: true },
        ]
    },
    {
        id: 'ads',
        name: 'Quảng Cáo (Ads)',
        shortName: 'Quảng Cáo',
        description: 'Facebook, Google Ads',
        icon: MegaphoneIcon,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        features: [
            { id: 'fb_ads', name: 'Nội dung Facebook Ads', description: 'Quảng cáo chuyển đổi.', promptTemplate: 'Viết 3 mẫu quảng cáo Facebook Ads (Primary Text, Headline, Description) để bán "[PRODUCT]". Khách hàng: "[AUDIENCE]". Điểm mạnh: "[TOPIC]". Tập trung vào lợi ích và khan hiếm.', requiresProduct: true, requiresAudience: true },
            { id: 'google_ads', name: 'Nội dung Google Ads', description: 'Quảng cáo tìm kiếm.', promptTemplate: 'Viết 5 mẫu quảng cáo Google Search (Tiêu đề < 30 ký tự, Mô tả < 90 ký tự) cho từ khóa/sản phẩm: "[PRODUCT]". Mô tả: "[TOPIC]". Tối ưu CTR.', requiresProduct: true },
            { id: 'tiktok_ads', name: 'Kịch bản TikTok Ads', description: 'UGC Video Ads.', promptTemplate: 'Viết kịch bản video quảng cáo TikTok (UGC style) cho sản phẩm "[PRODUCT]". Tập trung vào trải nghiệm thực tế và kết quả nhanh chóng. Hook cực mạnh.', requiresProduct: true },
        ]
    },
    {
        id: 'creative',
        name: 'Sáng Tạo & Ý Tưởng',
        shortName: 'Sáng Tạo',
        description: 'Brainstorm, Viral',
        icon: SparklesIcon,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-400/10',
        features: [
            { id: 'viral_hooks', name: 'Câu mở đầu Viral (Hooks)', description: '3s đầu tiên quyết định.', promptTemplate: 'Viết 20 câu mở đầu video (Hooks) cực cuốn hút về chủ đề "[TOPIC]" liên quan đến "[PRODUCT]" để giữ chân người xem TikTok/Reels ngay lập tức.', requiresTone: false, requiresProduct: true },
            { id: 'storytelling', name: 'Kể chuyện thương hiệu', description: 'Storytelling cảm xúc.', promptTemplate: 'Viết một câu chuyện truyền cảm hứng về hành trình của thương hiệu/sản phẩm "[PRODUCT]". Thông điệp: "[TOPIC]". Giọng văn cảm xúc, chân thành.', requiresProduct: true, requiresTone: true },
            { id: 'angle_finder', name: 'Tìm Angle Sáng Tạo', description: 'Góc nhìn mới lạ.', promptTemplate: 'Đề xuất 5 góc nhìn (Marketing Angles) độc đáo và khác biệt để quảng bá sản phẩm "[PRODUCT]" mà đối thủ ít nghĩ đến. Mô tả: "[TOPIC]".', requiresProduct: true },
        ]
    },
     {
        id: 'branding',
        name: 'Xây Dựng Thương Hiệu',
        shortName: 'Branding',
        description: 'Slogan, Tone & Voice',
        icon: TagIcon,
        color: 'text-purple-400',
        bgColor: 'bg-purple-400/10',
        features: [
            { id: 'slogan_gen', name: 'Sáng tạo Slogan', description: 'Câu khẩu hiệu ấn tượng.', promptTemplate: 'Sáng tạo 10 slogan ngắn gọn, dễ nhớ và ấn tượng cho thương hiệu "[PRODUCT]". Lĩnh vực/Mô tả: "[TOPIC]".', requiresProduct: true },
            { id: 'brand_voice', name: 'Định hình Tone & Voice', description: 'Giọng văn thương hiệu.', promptTemplate: 'Xây dựng bộ quy chuẩn Tone & Voice (Giọng văn thương hiệu) cho "[PRODUCT]". Xác định tính cách thương hiệu, từ ngữ nên dùng và không nên dùng.', requiresProduct: true },
        ]
    },
    {
        id: 'audio',
        name: 'Âm Thanh & Giọng Nói',
        shortName: 'Audio AI',
        description: 'Text-to-Speech, Voiceover',
        icon: SpeakerWaveIcon,
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-400/10',
        features: [
            { 
                id: 'voiceover_script', 
                name: 'Viết Kịch bản Thu âm', 
                description: 'Tối ưu văn bản để AI đọc tự nhiên nhất.', 
                promptTemplate: `Viết một kịch bản thu âm (Voiceover Script) chuyên nghiệp cho chủ đề/sản phẩm: "[PRODUCT]".
                Chi tiết: "[TOPIC]".
                Khách hàng mục tiêu: "[AUDIENCE]".
                Giọng điệu: [TONE].

                Yêu cầu quan trọng để tối ưu cho AI đọc (Text-to-Speech):
                1. Sử dụng văn phong nói (Spoken word), tự nhiên, gần gũi, tránh văn viết khô khan.
                2. Ngắt câu rõ ràng bằng dấu phẩy (,), dấu chấm (.), dấu ba chấm (...) để tạo nhịp điệu.
                3. Không dùng từ viết tắt (viết rõ "Việt Nam" thay vì "VN").
                4. Đánh dấu cảm xúc nếu cần thiết (Vui vẻ, Trầm lắng...).
                5. Chia thành 3 phần: Mở đầu (Hook) - Nội dung chính - Kêu gọi hành động (CTA).
                6. Đánh dấu rõ phần nào là "Giọng đọc:" để phân biệt với mô tả hình ảnh (Visual).
                7. Nếu có mô tả hình ảnh, hãy để trong ngoặc [VISUAL: ...].
                8. Định dạng rõ ràng: Mỗi đoạn hội thoại/lời bình phải nằm trên một dòng riêng.`,
                requiresProduct: true,
                requiresAudience: true,
                requiresTone: true
            },
            { 
                id: 'text_to_speech', 
                name: 'Chuyển văn bản thành giọng nói', 
                description: 'Tạo giọng đọc AI tự nhiên từ văn bản.', 
                promptTemplate: 'TTS_MODE',
                requiresTone: false 
            }
        ]
    }
];

const TONES = ['Chuyên nghiệp', 'Thân thiện', 'Hài hước', 'Sang trọng', 'Quyết đoán', 'Đồng cảm', 'Gen Z (Trẻ trung)', 'Kể chuyện (Storytelling)'];
const LANGUAGES = ['Tiếng Việt', 'English', 'Korean', 'Japanese', 'Chinese'];

const VOICES = [
    { id: 'puck', name: 'Puck (Nam - Năng động)', gender: 'Male' },
    { id: 'charon', name: 'Charon (Nam - Trầm ấm)', gender: 'Male' },
    { id: 'kore', name: 'Kore (Nữ - Dịu dàng)', gender: 'Female' },
    { id: 'fenrir', name: 'Fenrir (Nam - Nhanh)', gender: 'Male' },
    { id: 'zephyr', name: 'Zephyr (Nữ - Nhẹ nhàng)', gender: 'Female' },
];

interface GeneratedContent {
    id: string;
    featureName: string;
    content: string;
    timestamp: string;
    audioSegments?: AudioSegment[];
    audioUrl?: string;
}

interface AudioSegment {
    id: string;
    text: string;
    url: string;
    duration?: number;
}

interface ScriptBlock {
    type: 'header' | 'voice' | 'visual' | 'meta' | 'text';
    content: string;
}

const parseScriptContent = (text: string): ScriptBlock[] => {
    const lines = text.split('\n');
    const blocks: ScriptBlock[] = [];

    const skipRegex = /^(VISUAL|CẢNH QUAY|HÌNHẢNH|VIDEO|SCENE|Sản phẩm:|Khách hàng:|Giọng văn:|Hashtags|Tiêu đề:|Ngày \d+|Phân cảnh|Thời lượng|LỊCH ĐĂNG BÀI|PHẦN|CHƯƠNG|MỞ ĐẦU|THÂN BÀI|KẾT BÀI|Lưu ý|Note)(\s*[\:\-\/]?)/i;
    const visualRegex = /^(VISUAL|CẢNH QUAY|HÌNH ẢNH|VIDEO|SCENE|VISUAL\:)/i;
    const rolePrefixRegex = /^(?:Giọng đọc|MC|Host|Speaker|Lời bình|Voice|Nam|Nữ|Nhân vật|Người dẫn|Narrator|LỜI THOẠI \/ VOICE)\s*[\:\-\/]?\s*/i;
    const contentPrefixRegex = /^(?:Nội dung|Nội dung chính|Content)\s*[\:\-\/]?\s*/i;
    const aiFillerRegex = /^(Tuyệt vời|Dưới đây là|Sau đây là|Chắc chắn rồi|Vâng|Dạ|Đây là|Okay|Alright|Here is|Chào bạn|Cảm ơn bạn).*/i;

    lines.forEach((line, index) => {
        let cleanLine = line.trim();
        if (!cleanLine) return;

        const hasRealContent = blocks.some(b => b.type === 'voice' || b.type === 'text' || b.type === 'visual');
        if (!hasRealContent && aiFillerRegex.test(cleanLine)) {
             blocks.push({ type: 'meta', content: cleanLine });
             return;
        }

        if (visualRegex.test(cleanLine)) {
            blocks.push({ type: 'visual', content: cleanLine.replace(visualRegex, '').trim() });
            return;
        }
        const visualBracketMatch = cleanLine.match(/^[\[\(](VISUAL|CẢNH).*?[\]\)]$/i);
        if (visualBracketMatch) {
            blocks.push({ type: 'visual', content: cleanLine.replace(/[\[\]\(\)]/g, '').trim() });
            return;
        }

        if (contentPrefixRegex.test(cleanLine)) {
            let content = cleanLine.replace(contentPrefixRegex, '').trim();
            content = content.replace(/#[\w\u00C0-\u1EF9]+/g, '').trim();
            if (content) blocks.push({ type: 'text', content });
            return;
        }

        if (rolePrefixRegex.test(cleanLine)) {
            let content = cleanLine.replace(rolePrefixRegex, '').trim();
            content = content.replace(/#[\w\u00C0-\u1EF9]+/g, '').trim();
            if (content) blocks.push({ type: 'voice', content });
            return;
        }

        if (skipRegex.test(cleanLine)) {
            blocks.push({ type: 'meta', content: cleanLine }); 
            return;
        }

        if (cleanLine.startsWith('#')) {
             blocks.push({ type: 'header', content: cleanLine.replace(/^#+\s*/, '') }); 
             return;
        }

        const contentWithoutHashtags = cleanLine.replace(/#[\w\u00C0-\u1EF9]+/g, '').trim();

        if (contentWithoutHashtags.length > 0) {
             blocks.push({ type: 'text', content: contentWithoutHashtags });
        }
    });

    const mergedBlocks: ScriptBlock[] = [];
    blocks.forEach(block => {
        const lastBlock = mergedBlocks.length > 0 ? mergedBlocks[mergedBlocks.length - 1] : null;
        if (lastBlock && (lastBlock.type === 'voice' || lastBlock.type === 'text') && (block.type === 'voice' || block.type === 'text')) {
            lastBlock.content += '. ' + block.content;
        } else {
            mergedBlocks.push(block);
        }
    });

    return mergedBlocks;
};

const TextGenerator: React.FC<{ tool: IntegrationTool, onNavigate: (page: string) => void }> = ({ tool, onNavigate }) => {
    const { loggedInUser } = useAuth();
    const { userState } = useUser();
    const { handleUseToolCredit } = useActions();
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
        return filtered.length > 0 ? filtered : [ALL_GEMINI_MODELS[3], ALL_GEMINI_MODELS[4]];
    }, [settingsState.systemSettings.activeGeminiModels, tool.modelPricing]);

    // Main State
    const [activeToolkitId, setActiveToolkitId] = useState<string>(MARKETING_TOOLKITS[0].id);
    const [activeFeatureId, setActiveFeatureId] = useState<string>(MARKETING_TOOLKITS[0].features[0].id);
    const [selectedModel, setSelectedModel] = useState<string>(activeModels[0].id);

    useEffect(() => {
        if (!activeModels.some(m => m.id === selectedModel)) {
            setSelectedModel(activeModels[0].id);
        }
    }, [activeModels, selectedModel]);
    
    // Form State
    const [productName, setProductName] = useState('');
    const [topic, setTopic] = useState('');
    const [audience, setAudience] = useState('');
    const [tone, setTone] = useState('Chuyên nghiệp');
    const [language, setLanguage] = useState('Tiếng Việt');
    const [includeVisuals, setIncludeVisuals] = useState(true);
    
    // TTS State
    const [voice, setVoice] = useState('puck'); 
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [isGeneratingFullAudio, setIsGeneratingFullAudio] = useState(false);
    const [blockAudioUrls, setBlockAudioUrls] = useState<Record<number, string>>({});
    const [fullAudioUrl, setFullAudioUrl] = useState<string | null>(null);
    
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<string>('');
    const [history, setHistory] = useState<GeneratedContent[]>([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // Dropdown States
    const [isToolkitDropdownOpen, setIsToolkitDropdownOpen] = useState(false);
    const [isFeatureDropdownOpen, setIsFeatureDropdownOpen] = useState(false);
    const toolkitDropdownRef = useRef<HTMLDivElement>(null);
    const featureDropdownRef = useRef<HTMLDivElement>(null);

    const activeToolkit = useMemo(() => MARKETING_TOOLKITS.find(t => t.id === activeToolkitId) || MARKETING_TOOLKITS[0], [activeToolkitId]);
    const activeFeature = useMemo(() => activeToolkit.features.find(f => f.id === activeFeatureId) || activeToolkit.features[0], [activeToolkit, activeFeatureId]);
    
    // Dynamic cost calculation based on selected model
    const currentCost = useMemo(() => {
        if (tool.modelPricing && tool.modelPricing[selectedModel] !== undefined) {
            return tool.modelPricing[selectedModel];
        }
        return tool.creditCost || 10;
    }, [tool.modelPricing, tool.creditCost, selectedModel]);

    const isTTS = activeFeature.id === 'text_to_speech';
    const showVoiceSettings = activeToolkit.id === 'audio';

    const freshUser = useMemo(() => loggedInUser ? findUserInTree(userState.allUsers, loggedInUser.id) : null, [userState.allUsers, loggedInUser]);
    const currentCredits = freshUser ? freshUser.creditBalance : 0;
    const resultRef = useRef<HTMLDivElement>(null);

    // Click outside handler for dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (toolkitDropdownRef.current && !toolkitDropdownRef.current.contains(event.target as Node)) {
                setIsToolkitDropdownOpen(false);
            }
            if (featureDropdownRef.current && !featureDropdownRef.current.contains(event.target as Node)) {
                setIsFeatureDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        return () => {
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (loggedInUser) {
            const savedHistory = localStorage.getItem(`marketing_history_${loggedInUser.id}`);
            if (savedHistory) {
                try { setHistory(JSON.parse(savedHistory)); } catch (e) { console.error(e); }
            }
        }
    }, [loggedInUser]);

    useEffect(() => {
        if (loggedInUser) localStorage.setItem(`marketing_history_${loggedInUser.id}`, JSON.stringify(history));
    }, [history, loggedInUser]);

    const stopAudio = () => {
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.currentTime = 0;
            currentAudioRef.current = null;
        }
        setIsPlaying(false);
    };

    const playAudio = (url: string) => {
        stopAudio(); 
        const audio = new Audio(url);
        currentAudioRef.current = audio;
        setIsPlaying(true);
        audio.play().catch(e => {
            console.error("Audio play error:", e);
            setIsPlaying(false);
        });
        audio.onended = () => {
            setIsPlaying(false);
            currentAudioRef.current = null;
        };
        audio.onerror = () => {
            setIsPlaying(false);
            currentAudioRef.current = null;
        };
    };

    const handleToolkitChange = (toolkitId: string) => {
        stopAudio();
        setActiveToolkitId(toolkitId);
        const toolkit = MARKETING_TOOLKITS.find(t => t.id === toolkitId);
        if (toolkit && toolkit.features.length > 0) setActiveFeatureId(toolkit.features[0].id);
        setResult('');
    };

    const handleTransferToTTS = () => {
        stopAudio();
        const audioToolkit = MARKETING_TOOLKITS.find(t => t.id === 'audio');
        const ttsFeature = audioToolkit?.features.find(f => f.id === 'text_to_speech');

        if (audioToolkit && ttsFeature && result) {
            setActiveToolkitId(audioToolkit.id);
            setActiveFeatureId(ttsFeature.id);
            
            const parsedBlocks = parseScriptContent(result);
            const voiceBlocks = parsedBlocks.filter(b => b.type === 'voice' || b.type === 'text');
            
            let textToTransfer = "";
            if (voiceBlocks.length > 0) {
                 textToTransfer = voiceBlocks.map(b => b.content).join('\n\n');
            } else {
                 textToTransfer = result;
            }

            setTopic(textToTransfer); 
            addToast('Đã trích xuất nội dung và chuyển sang công cụ Đọc.', 'success');
        }
    };

    const generateWithRetry = async (model: string, content: any, maxRetries = 3) => {
      // SỬ DỤNG aiService
      let retries = 0;
      while (retries < maxRetries) {
        try {
          return await aiService.generateContent({ model, contents: content });
        } catch (error: any) {
          retries++;
          if (retries >= maxRetries) throw error;
          await new Promise(r => setTimeout(r, 1000 * retries));
        }
      }
    };

    const handleGenerate = async () => {
        stopAudio();
        if (!loggedInUser) return;
        if (!isTTS && activeFeature.requiresProduct && !productName.trim()) { addToast('Nhập tên sản phẩm/thương hiệu.', 'error'); return; }
        if (!topic.trim()) { addToast('Nhập nội dung chi tiết.', 'error'); return; }
        if (currentCredits < currentCost) { addToast('Không đủ Credit.', 'error'); return; }

        setIsGenerating(true);
        setResult('');
        setShowHistoryModal(false);

        try {
            const creditResult = await handleUseToolCredit(loggedInUser.id, { ...tool, creditCost: currentCost });
            if (!creditResult.success) { setIsGenerating(false); return; }

            if (isTTS) {
                 setResult(topic); 
                 addToast('Nội dung đã sẵn sàng để tạo audio.', 'success');
            } else {
                let prompt = activeFeature.promptTemplate
                    .replace('[PRODUCT]', productName || 'Sản phẩm này')
                    .replace('[TOPIC]', topic || 'Chi tiết về sản phẩm')
                    .replace('[AUDIENCE]', audience || 'Khách hàng tiềm năng')
                    .replace('[TONE]', tone);
                
                let finalPrompt = `Ngôn ngữ đầu ra: ${language}. \n\n${prompt}`;
                if (includeVisuals) {
                    finalPrompt += "\n\nIMPORTANT: For each section, suggest a visual idea in brackets: [VISUAL: Mô tả hình ảnh/video].";
                }

                // GỌI QUA Service wrapper
                const response = await generateWithRetry(selectedModel, { parts: [{ text: finalPrompt }] });
                const text = response?.text;
                
                if (text) {
                    setResult(text);
                    setHistory(prev => [{ id: Date.now().toString(), featureName: activeFeature.name, content: text, timestamp: new Date().toISOString() }, ...prev]);
                    if(resultRef.current) resultRef.current.scrollIntoView({ behavior: 'smooth' });
                }
            }
        } catch (error: any) {
            let msg = 'Lỗi tạo nội dung. Vui lòng thử lại.';
            if (error.message?.includes('429') || error.message?.includes('quota')) {
                 msg = 'HẾT HẠN MỨC API: Vui lòng đợi vài phút hoặc đổi Key khác.';
            }
            addToast(msg, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const processTTS = async (text: string, onSuccess: (url: string) => void, onCostCalc: (cost: number) => void) => {
        const settingsParams = tool.pricingParams || {};
        const costPer100Chars = settingsParams.costPer100Chars !== undefined ? Number(settingsParams.costPer100Chars) : 10;
        const cost = Math.ceil((text.length / 100) * costPer100Chars);

        const user = findUserInTree(userState.allUsers, loggedInUser!.id);
        
        if (!user || user.creditBalance < cost) {
             addToast(`Cần ${cost} credit để tạo giọng đọc.`, 'error');
             return;
        }
        
        const apiVoiceName = voice.toLowerCase();
        const maxRetries = 2;
        let retries = 0;

        while (retries <= maxRetries) {
            try {
                // SỬ DỤNG aiService
                const response = await aiService.generateContent({
                    model: "gemini-2.5-flash-preview-tts",
                    contents: [{ parts: [{ text: text }] }],
                    config: {
                        responseModalities: [Modality.AUDIO],
                        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: apiVoiceName } } },
                    },
                });

                const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                if (audioData) {
                    await handleUseToolCredit(loggedInUser!.id, { ...tool, creditCost: cost });
                    onCostCalc(cost);

                    const binaryString = atob(audioData);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
                    
                    const wavHeader = new Uint8Array(44);
                    const view = new DataView(wavHeader.buffer);
                    const sampleRate = 24000;
                    const numChannels = 1;
                    const bitsPerSample = 16;
                    const writeString = (v: DataView, o: number, s: string) => { for (let i=0; i<s.length; i++) v.setUint8(o+i, s.charCodeAt(i)); };

                    writeString(view, 0, 'RIFF');
                    view.setUint32(4, 36 + bytes.length, true);
                    writeString(view, 8, 'WAVE');
                    writeString(view, 12, 'fmt ');
                    view.setUint32(16, 16, true);
                    view.setUint16(20, 1, true);
                    view.setUint16(22, numChannels, true);
                    view.setUint32(24, sampleRate, true);
                    view.setUint32(28, sampleRate * numChannels * 2, true);
                    view.setUint16(32, numChannels * 2, true);
                    view.setUint16(34, bitsPerSample, true);
                    writeString(view, 36, 'data');
                    view.setUint32(40, bytes.length, true);

                    const wavBlob = new Blob([wavHeader, bytes], { type: 'audio/wav' });
                    const reader = new FileReader();
                    reader.readAsDataURL(wavBlob);
                    reader.onloadend = () => {
                        const base64data = reader.result as string;
                        onSuccess(base64data);
                    };
                    return;
                } else {
                     throw new Error("No audio data returned");
                }
            } catch (e) {
                console.error(`TTS Attempt ${retries + 1} failed:`, e);
                retries++;
                if (retries > maxRetries) {
                    addToast('Lỗi tạo giọng nói. Vui lòng thử lại sau.', 'error');
                    throw e;
                }
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    };


    const handleSegmentTTS = async (segmentText: string, index: number) => {
        if (isPlaying && blockAudioUrls[index]) {
            playAudio(blockAudioUrls[index]);
            return;
        }

        if (!segmentText.trim()) return;
        
        if (blockAudioUrls[index]) {
            playAudio(blockAudioUrls[index]);
            return;
        }
        
        const cleanText = segmentText.replace(/[\*\_]/g, '').trim();
        
        setIsGeneratingAudio(true);
        try {
            await processTTS(cleanText, (url) => {
                setBlockAudioUrls(prev => ({ ...prev, [index]: url }));
                playAudio(url);
                addToast('Đang phát giọng đọc...', 'success');
            }, () => {});
        } catch (e) {
            
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const handleGenerateFullAudio = async () => {
        const rawBlocks = parseScriptContent(result);
        const fullText = rawBlocks
            .filter(b => b.type === 'voice' || b.type === 'text')
            .map(b => b.content.replace(/[\*\_]/g, '').trim())
            .join('. ');

        if (!fullText.trim()) {
            addToast('Không tìm thấy nội dung thoại phù hợp để tạo audio.', 'error');
            return;
        }
        
        if (fullAudioUrl) {
            playAudio(fullAudioUrl);
            addToast('Đang phát lại audio tổng...', 'success');
            return;
        }

        setIsGeneratingFullAudio(true);
        try {
             await processTTS(fullText, (url) => {
                setFullAudioUrl(url);
                playAudio(url);
                
                const newItem: GeneratedContent = {
                    id: Date.now().toString(),
                    featureName: 'Chuyển văn bản thành giọng nói',
                    content: fullText,
                    timestamp: new Date().toISOString(),
                    audioUrl: url
                };
                setHistory(prev => [newItem, ...prev]);
                
                addToast('Đã chuyển toàn bộ văn bản thành giọng nói và lưu lịch sử!', 'success');
            }, () => {});
        } catch (e) {
             console.error(e);
             addToast('Lỗi tạo audio tổng.', 'error');
        } finally {
             setIsGeneratingFullAudio(false);
        }
    };


    const handleDownloadAudio = (url: string, text: string) => {
        const link = document.createElement('a');
        link.href = url;
        const safeName = text.substring(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `tts_${safeName}_${Date.now()}.wav`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast('Đã tải xuống file audio.', 'success');
    }

    const handleLoadHistoryItem = (item: GeneratedContent) => {
        setResult(item.content);
        if (item.audioUrl) {
            setFullAudioUrl(item.audioUrl);
            setTopic(item.content);
            const audioToolkit = MARKETING_TOOLKITS.find(t => t.id === 'audio');
            if (audioToolkit) {
                setActiveToolkitId('audio');
                setActiveFeatureId('text_to_speech');
            }
        }
        addToast('Đã tải nội dung từ lịch sử.', 'success');
        setShowHistoryModal(false);
    };

    const handleClearHistory = () => {
        if (window.confirm("Bạn có chắc muốn xóa toàn bộ lịch sử tạo nội dung không?")) {
             setHistory([]);
             addToast('Đã xóa lịch sử.', 'success');
             setShowHistoryModal(false);
        }
    };

    // ... (Keep render helper functions: parseInlineStyles, renderFormattedText, renderScriptView) ...
    const parseInlineStyles = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} className="font-bold text-indigo-400">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('*') && part.endsWith('*')) {
                return <em key={index} className="italic text-slate-400">{part.slice(1, -1)}</em>;
            }
            return part;
        });
    };

    const renderFormattedText = (text: string) => {
        if (!text) return null;
        const paragraphs = text.split(/\n\n+/);
        return (
            <div className="space-y-4 text-slate-100">
                {paragraphs.map((paragraph, idx) => {
                    if (paragraph.startsWith('### ')) return <h3 key={idx} className="text-lg font-bold text-slate-100 mb-2 mt-4">{paragraph.replace('### ', '')}</h3>;
                    if (paragraph.startsWith('## ')) return <h2 key={idx} className="text-xl font-bold text-white mb-3 mt-5 border-b border-slate-700 pb-1">{paragraph.replace('## ', '')}</h2>;
                    if (paragraph.startsWith('- ')) {
                        return (
                            <ul key={idx} className="list-disc ml-5 space-y-1 text-slate-300">
                                {paragraph.split('\n').map((li, i) => <li key={i}>{parseInlineStyles(li.replace('- ', ''))}</li>)}
                            </ul>
                        );
                    }
                    return <p key={idx} className="text-slate-300 leading-relaxed">{parseInlineStyles(paragraph)}</p>;
                })}
            </div>
        );
    };

    const renderScriptView = (text: string) => {
        const blocks = parseScriptContent(text);
        if (blocks.length === 0) return renderFormattedText(text);

        return (
            <div className="space-y-4 font-sans">
                {blocks.map((block, idx) => {
                    const audioUrl = blockAudioUrls[idx];
                    
                    if (block.type === 'meta') return <div key={idx} className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">{block.content}</div>;
                    
                    if (block.type === 'visual') return (
                        <div key={idx} className="p-3 bg-blue-900/20 border-l-4 border-blue-500 rounded-r-md mb-3">
                            <span className="text-xs font-bold text-blue-400 block mb-1 uppercase">Visual / Cảnh quay</span>
                            <p className="text-sm text-slate-300 italic">{parseInlineStyles(block.content)}</p>
                        </div>
                    );
                    
                    if (block.type === 'voice' || block.type === 'text') return (
                        <div key={idx} className="flex gap-3 group relative mb-4">
                            <div className="flex-shrink-0 pt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -left-10 top-0">
                                 {audioUrl ? (
                                     <div className="flex flex-col gap-1">
                                         <button onClick={() => playAudio(audioUrl)} className="p-1.5 bg-green-600 text-white rounded-full hover:bg-green-500 shadow-sm"><PlayIcon className="h-3 w-3"/></button>
                                         <button onClick={() => handleDownloadAudio(audioUrl, block.content)} className="p-1.5 bg-slate-600 text-white rounded-full hover:bg-slate-500 shadow-sm"><DocumentArrowDownIcon className="h-3 w-3"/></button>
                                     </div>
                                 ) : (
                                    <button onClick={() => handleSegmentTTS(block.content, idx)} disabled={isGeneratingAudio} className="p-1.5 bg-indigo-900/50 text-indigo-400 rounded-full hover:bg-indigo-800 shadow-sm">
                                        {isGeneratingAudio ? <ArrowPathIcon className="h-3 w-3 animate-spin"/> : <SpeakerWaveIcon className="h-3 w-3"/>}
                                    </button>
                                 )}
                            </div>

                            <div className={`flex-grow p-4 rounded-xl border ${block.type === 'voice' ? 'bg-slate-800 border-slate-700' : 'bg-slate-900/50 border-transparent'}`}>
                                {block.type === 'voice' && <span className="text-xs font-bold text-indigo-400 block mb-1 uppercase">Lời thoại / Voice</span>}
                                <p className="text-slate-200 leading-relaxed text-base">{parseInlineStyles(block.content)}</p>
                            </div>
                        </div>
                    );
                    
                    return <h3 key={idx} className="text-lg font-bold text-white mt-6 mb-2">{block.content}</h3>;
                })}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-[#111827] text-slate-100">
            {/* Header */}
            <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-10 shadow-md">
                <div className="flex items-center gap-4">
                     <button onClick={() => onNavigate('Kho Tiện Ích')} className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors">
                        <ArrowLeftIcon className="h-5 w-5" /> Quay lại
                    </button>
                    <h1 className="text-lg font-bold flex items-center gap-2 text-white">
                        <PencilSquareIcon className="h-6 w-6 text-indigo-500" />
                        {tool.title}
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    {isPlaying && (
                        <button 
                            onClick={stopAudio} 
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg text-xs font-medium border border-red-500/30 transition-all animate-pulse"
                        >
                            <StopIcon className="h-4 w-4" /> Dừng phát
                        </button>
                    )}
                    
                    <button onClick={() => setShowHistoryModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium text-slate-300 border border-slate-700 transition-colors">
                        <ClockIcon className="h-4 w-4" /> Lịch sử
                    </button>

                    {result && (
                        <button onClick={handleTransferToTTS} className="text-xs font-medium text-indigo-400 hover:underline mr-2 flex items-center gap-1">
                            <SpeakerWaveIcon className="h-3 w-3" /> Chuyển sang Audio
                        </button>
                    )}
                    <CreditBalanceDisplay balance={currentCredits} onAdd={() => onNavigate('Ví Của Tôi')} />
                </div>
            </header>
            
            {/* History Modal */}
            <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Lịch sử Tạo Nội dung" hideFooter size="lg">
                <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
                    {history.length === 0 ? (
                        <p className="text-center text-slate-400 py-8">Chưa có lịch sử nào.</p>
                    ) : (
                        history.map(item => (
                            <div key={item.id} className="p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-indigo-500 transition-colors group cursor-pointer" onClick={() => handleLoadHistoryItem(item)}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                        <span className="font-bold text-indigo-400 text-sm">{item.featureName}</span>
                                        <p className="text-xs text-slate-400 mt-0.5">{new Date(item.timestamp).toLocaleString('vi-VN')}</p>
                                    </div>
                                    {item.audioUrl && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); playAudio(item.audioUrl!); }}
                                            className="ml-2 p-1.5 bg-green-600 hover:bg-green-500 text-white rounded-full transition-colors"
                                            title="Nghe lại"
                                        >
                                            <PlayIcon className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm text-slate-300 line-clamp-3 font-sans">{item.content}</p>
                            </div>
                        ))
                    )}
                </div>
                {history.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-700 flex justify-end">
                        <button onClick={handleClearHistory} className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-lg transition-colors">
                            <TrashIcon className="h-4 w-4" /> Xóa toàn bộ lịch sử
                        </button>
                    </div>
                )}
            </Modal>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
                     <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
                        
                         {/* MODEL SELECTOR */}
                        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 mb-6">
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

                        {/* BƯỚC 1: CHỌN BỘ CÔNG CỤ */}
                        <div className="relative" ref={toolkitDropdownRef}>
                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block tracking-wider">BƯỚC 1: CHỌN BỘ CÔNG CỤ</label>
                            <button 
                                onClick={() => setIsToolkitDropdownOpen(!isToolkitDropdownOpen)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${activeToolkit.bgColor} ${activeToolkit.color} border-current`}
                            >
                                <div className="flex items-center gap-3">
                                     <activeToolkit.icon className="h-5 w-5" />
                                     <div>
                                         <span className="text-sm font-bold block">{activeToolkit.name}</span>
                                         <span className="text-[10px] opacity-80 block">{activeToolkit.description}</span>
                                     </div>
                                </div>
                                <ChevronDownIcon className={`h-4 w-4 transition-transform ${isToolkitDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {isToolkitDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto p-1 animate-fadeIn">
                                     {MARKETING_TOOLKITS.map(tk => (
                                        <button
                                            key={tk.id}
                                            onClick={() => { handleToolkitChange(tk.id); setIsToolkitDropdownOpen(false); }}
                                            className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all mb-1 last:mb-0 ${activeToolkitId === tk.id ? 'bg-slate-800' : 'hover:bg-slate-800'}`}
                                        >
                                            <div className={`p-2 rounded-lg ${tk.bgColor} ${tk.color}`}>
                                                <tk.icon className="h-4 w-4" />
                                            </div>
                                            <div className="text-left flex-1">
                                                 <span className={`text-sm font-medium block ${activeToolkitId === tk.id ? 'text-white' : 'text-slate-400'}`}>{tk.name}</span>
                                            </div>
                                            {activeToolkitId === tk.id && <CheckIcon className="h-4 w-4 text-indigo-500 ml-auto" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* BƯỚC 2: CHỌN TÍNH NĂNG */}
                        <div className="relative mt-4" ref={featureDropdownRef}>
                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block tracking-wider">BƯỚC 2: CHỌN TÍNH NĂNG</label>
                             <button 
                                onClick={() => setIsFeatureDropdownOpen(!isFeatureDropdownOpen)}
                                className="w-full flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-xl hover:border-indigo-500 transition-all text-left"
                            >
                                <div>
                                     <span className="text-sm font-bold text-indigo-300 block">{activeFeature.name}</span>
                                     <span className="text-[10px] text-slate-400 block truncate">{activeFeature.description}</span>
                                </div>
                                <ChevronDownIcon className={`h-4 w-4 text-slate-500 transition-transform ${isFeatureDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {isFeatureDropdownOpen && (
                                 <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-40 max-h-64 overflow-y-auto p-1 animate-fadeIn">
                                    {activeToolkit.features.map(feature => (
                                         <button 
                                            key={feature.id} 
                                            onClick={() => { setActiveFeatureId(feature.id); setResult(''); stopAudio(); setIsFeatureDropdownOpen(false); }}
                                            className={`w-full text-left p-2.5 rounded-lg transition-all mb-1 last:mb-0 ${activeFeatureId === feature.id ? 'bg-indigo-900/30 border border-indigo-500/50' : 'hover:bg-slate-800 border border-transparent'}`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className={`text-sm font-medium ${activeFeatureId === feature.id ? 'text-indigo-300' : 'text-slate-300'}`}>{feature.name}</span>
                                                {activeFeatureId === feature.id && <CheckIcon className="h-3.5 w-3.5 text-indigo-500" />}
                                            </div>
                                             <p className="text-[10px] text-slate-500 mt-0.5 truncate">{feature.description}</p>
                                        </button>
                                    ))}
                                 </div>
                            )}
                        </div>

                        {/* BƯỚC 3: NHẬP NỘI DUNG */}
                        <div className="space-y-4 pt-4 border-t border-slate-700">
                             <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">BƯỚC 3: NHẬP NỘI DUNG</h3>
                             
                            {activeFeature.requiresProduct && (
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-slate-300">Sản phẩm / Thương hiệu</label>
                                    <input type="text" value={productName} onChange={e => setProductName(e.target.value)} placeholder="Ví dụ: Kem dưỡng da ABC..." className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm text-white placeholder-slate-500" />
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-300">{isTTS ? 'Nội dung văn bản' : 'Nội dung chi tiết / Chủ đề'}</label>
                                <textarea 
                                    value={topic} 
                                    onChange={e => setTopic(e.target.value)} 
                                    rows={isTTS ? 10 : 4} 
                                    placeholder={isTTS ? "Nhập văn bản cần đọc..." : "Mô tả chi tiết về sản phẩm, ưu đãi, tính năng..."} 
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm resize-none text-white placeholder-slate-500" 
                                />
                            </div>

                            {activeFeature.requiresAudience && (
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-slate-300">Khách hàng mục tiêu</label>
                                    <input type="text" value={audience} onChange={e => setAudience(e.target.value)} placeholder="Ví dụ: Nữ văn phòng, 25-35 tuổi..." className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm text-white placeholder-slate-500" />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                {activeFeature.requiresTone && (
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Giọng văn</label>
                                        <select value={tone} onChange={e => setTone(e.target.value)} className="w-full px-2 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:ring-indigo-500 outline-none text-white">
                                            {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                )}
                                {!isTTS && (
                                     <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Ngôn ngữ</label>
                                        <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full px-2 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:ring-indigo-500 outline-none text-white">
                                            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            
                            {(showVoiceSettings || isTTS) && (
                                <div className="p-3 bg-cyan-900/20 rounded-lg border border-cyan-800 space-y-3">
                                    <h5 className="text-xs font-bold text-cyan-400 uppercase">Cấu hình Giọng nói</h5>
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-cyan-100">Giọng đọc AI</label>
                                        <select value={voice} onChange={e => setVoice(e.target.value)} className="w-full px-2 py-1.5 bg-slate-800 border border-cyan-700 rounded-md text-sm text-white">
                                            {VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                            
                            {!isTTS && activeFeature.id !== 'viral_hooks' && (
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="includeVisuals" checked={includeVisuals} onChange={e => setIncludeVisuals(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-700 border-slate-600" />
                                    <label htmlFor="includeVisuals" className="text-sm text-slate-300 cursor-pointer">Gợi ý hình ảnh/video minh họa</label>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Generate Button */}
                    <div className="p-4 border-t border-slate-800 bg-slate-900 z-10">
                         <button 
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform active:scale-95"
                        >
                            {isGenerating ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : (isTTS ? <SpeakerWaveIcon className="h-5 w-5" /> : <SparklesIcon className="h-5 w-5" />)}
                            {isGenerating ? 'Đang xử lý...' : (isTTS ? `Chuyển giọng nói (${currentCost} Credit)` : `Tạo nội dung (${currentCost} Credit)`)}
                        </button>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-6 md:p-10 relative bg-[#111827]">
                    {result ? (
                        <div className="max-w-3xl mx-auto space-y-6 pb-20 animate-fadeIn" ref={resultRef}>
                             <div className="flex justify-between items-center">
                                 <div>
                                     <h2 className="text-2xl font-bold text-white">{activeFeature.name}</h2>
                                     <p className="text-sm text-slate-400">{new Date().toLocaleDateString('vi-VN')}</p>
                                 </div>
                                 <div className="flex gap-2">
                                      {fullAudioUrl && (
                                         <button onClick={() => playAudio(fullAudioUrl)} className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-sm">
                                             <PlayIcon className="h-4 w-4" /> Nghe toàn bộ
                                         </button>
                                      )}
                                      {(isTTS || showVoiceSettings) && !fullAudioUrl && (
                                          <button onClick={handleGenerateFullAudio} disabled={isGeneratingFullAudio} className="px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 flex items-center gap-2 disabled:opacity-50 shadow-sm">
                                             {isGeneratingFullAudio ? <ArrowPathIcon className="h-4 w-4 animate-spin"/> : <SpeakerWaveIcon className="h-4 w-4" />}
                                             Tạo Audio Tổng
                                          </button>
                                      )}
                                     <button onClick={() => { navigator.clipboard.writeText(result); addToast('Đã sao chép!', 'success'); }} className="px-4 py-2 bg-slate-700 text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-600 flex items-center gap-2 shadow-sm">
                                         <ClipboardDocumentIcon className="h-4 w-4" /> Sao chép
                                     </button>
                                 </div>
                             </div>

                             {/* Result Content */}
                             <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden">
                                 <div className="p-8">
                                     {renderScriptView(result)}
                                 </div>
                             </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-50">
                             <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center shadow-inner border border-slate-700">
                                 <activeToolkit.icon className="h-12 w-12 text-slate-500" />
                             </div>
                             <div>
                                 <h3 className="text-2xl font-bold text-slate-300">Trợ lý Content AI</h3>
                                 <p className="text-slate-400 mt-2 max-w-md mx-auto">Chọn một công cụ từ menu bên trái, điền thông tin và để AI sáng tạo nội dung chất lượng cao cho bạn trong giây lát.</p>
                             </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default TextGenerator;
