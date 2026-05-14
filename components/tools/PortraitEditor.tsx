
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { 
    ArrowLeftIcon, SparklesIcon, DocumentArrowDownIcon, 
    PhotoIcon, CheckCircleIcon, TrashIcon, ArrowPathIcon, 
    ClockIcon, PlusIcon, ChevronRightIcon,
    ArrowUpTrayIcon, CameraIcon, UserCircleIcon, 
    PaintBrushIcon, AdjustmentsHorizontalIcon, CubeIcon,
    SwatchIcon, FaceSmileIcon, ChatBubbleBottomCenterTextIcon,
    Square2StackIcon, GlobeAltIcon, ArrowRightIcon,
    AspectRatio11Icon, AspectRatio34Icon, AspectRatio169Icon, FrameIcon,
    DocumentMagnifyingGlassIcon, ClipboardDocumentIcon, CheckIcon, BoltIcon
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

// --- DATA CONSTANTS ---

const THEMES = [
    { id: 'personal_portrait', name: 'Chân dung Cá nhân', icon: '👤' },
    { id: 'cafe', name: 'Quán cafe', icon: '☕' },
    { id: 'profile', name: 'Hồ sơ Cá nhân (Profile)', icon: '🆔' },
    { id: 'fashion', name: 'Thời trang (Fashion)', icon: '👗' },
    { id: 'beauty', name: 'Beauty & Makeup', icon: '💄' },
    { id: 'wedding', name: 'Wedding (Prewedding)', icon: '💍' },
    { id: 'couple', name: 'Cặp đôi (Couple)', icon: '👫' },
    { id: 'family', name: 'Gia đình & Em bé', icon: '👨‍👩‍👧' },
    { id: 'events', name: 'Sự kiện & Lễ hội', icon: '🎉' },
    { id: 'school', name: 'Học đường - Kỷ yếu', icon: '🎓' },
    { id: 'corporate', name: 'Doanh nghiệp', icon: '🏢' },
    { id: 'creative', name: 'Nghệ thuật (Creative)', icon: '🎨' },
    { id: 'traditional', name: 'Cổ trang - Truyền thống', icon: '🎎' },
    { id: 'sports', name: 'Thể thao & Cơ thể', icon: '🏋️' },
    { id: 'outdoor', name: 'Bên ngoài (Outdoor)', icon: '🏞️' },
    { id: 'international', name: 'Phong cách Quốc tế', icon: '🌍' },
    { id: 'lifestyle', name: 'IDM - Lifestyle', icon: '🛋️' },
    { id: 'age', name: 'Tuổi tác Đặc thù', icon: '👶' },
    { id: 'profession', name: 'Ngành nghề', icon: '🧑‍⚕️' },
    { id: 'mood', name: 'Tâm trạng & Cảm xúc', icon: '🎭' },
    { id: 'storytelling', name: 'Storytelling', icon: '📖' },
];

const CONCEPTS: Record<string, string[]> = {
    'personal_portrait': [
        'Chân dung nghệ thuật (Fine Art)', 'Chân dung Beauty (Cận cảnh)', 'Chân dung Studio phông trắng', 'Chân dung đen trắng (B&W)', 
        'Ánh sáng Rembrandt (Cổ điển)', 'Ánh sáng cửa sổ (Window Light)', 'Chân dung với hoa', 'Chân dung dưới mưa', 
        'Chân dung ngược sáng (Rim Light)', 'Chân dung phản chiếu (Gương)', 'Chân dung High Key (Sáng)', 'Chân dung Low Key (Tối)', 
        'Chân dung Cinematic (Điện ảnh)', 'Chân dung Vintage (Phim hạt)', 'Chân dung Cyberpunk (Neon)', 'Chân dung Fantasy (Thần thoại)', 
        'Chân dung đôi mắt (Macro Eye)', 'Chân dung tóc bay (Windy Hair)', 'Chân dung ướt (Wet Look)', 'Chân dung Silhouette (Bóng)', 
        'Chân dung Double Exposure', 'Chân dung khói màu (Smoke)', 'Chân dung dưới nước (Underwater)', 'Chân dung ánh nắng đốm (Dappled Light)', 
        'Chân dung Bokeh đêm', 'Chân dung Glitch Art', 'Chân dung Phấn màu (Pastel)', 'Chân dung tối giản (Minimalist)', 'Chân dung cảm xúc mạnh'
    ],
    'cafe': [
        'Phong cách đời sống (Lifestyle Café)', 'Làm việc với laptop', 'Học bài – đọc sách', 'Thời trang trong quán cà phê', 
        'Chân dung cạnh cửa sổ', 'Ly cà phê và bánh ngọt', 'Quán cà phê tối giản', 'Quán cà phê vintage', 
        'Quán cà phê gỗ mộc', 'Quán cà phê hiện đại', 'Góc ngồi ấm cúng', 'Quán cà phê nhiều cây xanh', 
        'Sân thượng ngoài trời', 'Chụp bàn cà phê từ trên cao', 'Cặp đôi trong quán cà phê', 'Một mình chill với cà phê', 
        'Chụp tại quầy pha chế', 'Pha cà phê – brewing', 'Chụp latte art', 'Cà phê cùng bạn bè', 
        'Cửa kính mưa – cảm xúc', 'Hoàng hôn trong quán cà phê', 'Buổi sáng với cà phê', 'Phản chiếu qua gương – kính', 
        'Cà phê và báo giấy', 'Set bánh + đồ uống đẹp', 'Góc đọc sách', 'Quán cà phê đèn neon', 
        'Bóng đổ nghệ thuật', 'Chân dung trong quán cà phê'
    ],
    'profile': [
        'Ảnh CV chuyên nghiệp', 'Ảnh LinkedIn Profile', 'Ảnh thẻ Studio (Phông xanh/trắng)', 'Doanh nhân khoanh tay', 
        'Doanh nhân cầm Tablet/Laptop', 'Doanh nhân nghe điện thoại', 'Profile nền văn phòng mờ', 'Profile nền thành phố (Cityscape)', 
        'Profile phong cách TED Talk', 'Profile cầm sách/tài liệu', 'Profile ngồi bàn làm việc', 'Profile đứng diễn thuyết', 
        'Profile phong cách Forbes', 'Profile Minimalist (Xám)', 'Profile không gian mở (Co-working)', 'Profile quán Cafe (Casual)', 
        'Profile phông đen sang trọng', 'Profile ngoài trời (Natural)', 'Profile bắt tay đối tác', 'Profile ký hợp đồng', 
        'Profile bảng trắng (Strategy)', 'Profile cầm kính mắt', 'Profile chỉnh trang phục (Vest)', 'Profile nhìn xa xăm (Visionary)', 
        'Influencer/KOL Profile', 'Profile Brand Ambassador', 'Profile Studio ghế da'
    ],
    'fashion': [
        'Lookbook Studio (Phông trơn)', 'Street Style (Đường phố)', 'Fashion Editorial (Tạp chí)', 'High Fashion (Couture)', 
        'Runway (Sàn diễn)', 'Vintage Retro Fashion', 'Bohemian (Du mục)', 'Cyberpunk Fashion', 'Sporty Chic', 
        'Minimalist Fashion', 'Office Chic (Công sở)', 'Luxury Brand (Đồ hiệu)', 'Denim on Denim', 'Leather Jacket (Da)', 
        'Summer Dress (Váy hè)', 'Winter Coat (Áo khoác đông)', 'Swimwear (Bãi biển)', 'Lingerie (Nội y nghệ thuật)', 
        'Suit & Tie (Vest nam)', 'Sneakerhead (Giày)', 'Accessories Focus (Phụ kiện)', 'Neon Fashion Night', 
        'Urban Grunge', 'Preppy School', 'Y2K Style', 'Avant-Garde (Phá cách)', 'Monochrome Outfit', 'Pastel Fashion', 
        'Model Casting (Polaroids)'
    ],
    'beauty': [
        'Makeup trong veo (Hàn Quốc)', 'Makeup mắt khói (Smokey Eye)', 'Son đỏ cổ điển (Red Lips)', 'Makeup đính đá (Rhinestones)', 
        'Makeup nghệ thuật (Face Paint)', 'Glossy Skin (Da căng bóng)', 'Matte Finish (Lì)', 'Makeup tàn nhang (Freckles)', 
        'Wet Hair Look', 'Slick Back Hair', 'Messy Bun (Búi rối)', 'Tóc xoăn sóng nước', 'Tóc thẳng (Straight)', 
        'Makeup tông cam (Peach)', 'Makeup tông nâu (Earth)', 'Makeup Neon Eyeliner', 'Makeup Glitter (Kim tuyến)', 
        'Skincare Ad (Mặt mộc)', 'Lipstick Swatch', 'Eyelash Focus (Mi)', 'Eyebrow Focus (Lông mày)', 
        'Beauty with Flower', 'Beauty with Jewelry', 'Beauty with Water Drops', 'Beauty High Fashion', 'Editorial Makeup'
    ],
    'wedding': [
        'Chụp cưới Studio (Hàn Quốc)', 'Chụp cưới sân vườn (Garden)', 'Chụp cưới bãi biển (Beach)', 'Chụp cưới hoàng hôn (Sunset)', 
        'Chụp cưới đường phố (City)', 'Chụp cưới trong rừng (Forest)', 'Chụp cưới cổ điển (Vintage)', 'Chụp cưới du thuyền', 
        'Chụp cưới dưới mưa (Romantic Rain)', 'Cô dâu đơn thân (Bridal Solo)', 'Chú rể đơn thân (Groom Solo)', 'Trao nhẫn cưới', 
        'Nụ hôn dưới voan (Veil Kiss)', 'Chụp cưới Flycam', 'Chụp cưới pháo sáng (Sparklers)', 'Chụp cưới Picnic', 
        'Chụp cưới phong cách Retro', 'Chụp cưới áo dài truyền thống', 'Chụp cưới trang phục tự do', 'First Look (Lần đầu nhìn thấy)', 
        'Cắt bánh cưới', 'Khiêu vũ đầu tiên (First Dance)', 'Cô dâu cầm hoa', 'Giày cưới & Nhẫn', 'Chụp cưới xe cổ'
    ],
    'couple': [
        'Cặp đôi Studio (Minimalist)', 'Cặp đôi dạo phố', 'Cặp đôi quán Cafe', 'Cặp đôi picnic', 'Cặp đôi đồ đôi (Matching)', 
        'Cặp đôi hoàng hôn biển', 'Cặp đôi dưới mưa', 'Cặp đôi thư viện/nhà sách', 'Cặp đôi nấu ăn (Kitchen)', 
        'Cặp đôi xem phim (Home Cinema)', 'Cặp đôi du lịch (Travel)', 'Cặp đôi trên xe máy/oto', 'Cặp đôi cõng nhau', 
        'Cặp đôi nắm tay (Follow me)', 'Cặp đôi nhìn nhau đắm đuối', 'Cặp đôi gối đầu (Bed)', 'Cặp đôi sân thượng (Rooftop)', 
        'Cặp đôi công viên giải trí', 'Cặp đôi mùa đông (Tuyết)', 'Cặp đôi mùa thu (Lá vàng)', 'Cặp đôi Vintage', 
        'Cặp đôi cầu hôn (Proposal)', 'Cặp đôi kỷ niệm (Anniversary)', 'Cặp đôi hài hước (Funny)', 'Cặp đôi giấu mặt'
    ],
    'family': [
        'Gia đình Studio phông trắng', 'Gia đình Studio phông xám', 'Gia đình dã ngoại (Picnic)', 'Gia đình bãi biển', 
        'Gia đình trong rừng', 'Gia đình phòng khách (Cozy)', 'Gia đình nhà bếp (Baking)', 'Gia đình trên giường (Bed)', 
        'Gia đình đồ ngủ (Pajamas)', 'Gia đình đón Tết', 'Gia đình Giáng Sinh', 'Gia đình sinh nhật', 
        'Mẹ và Bé (Mom & Baby)', 'Ba và Bé (Dad & Baby)', 'Newborn (Sơ sinh)', 'Baby 1 tuổi (Smash Cake)', 
        'Ông bà và cháu', 'Đại gia đình (nhiều thế hệ)', 'Gia đình với thú cưng', 'Gia đình nắm tay đi dạo', 
        'Gia đình xếp hàng', 'Gia đình nhìn nhau cười', 'Gia đình hôn má', 'Gia đình tông trắng (White tone)', 'Gia đình Denim'
    ],
    'events': [
        'Tiệc sinh nhật (Birthday Party)', 'Kỷ niệm ngày cưới', 'Valentine lãng mạn', 'Halloween hóa trang', 'Giáng Sinh ấm áp', 
        'Tết Nguyên Đán (Áo dài)', 'Du xuân vườn đào', 'Phố lồng đèn Trung Thu', 'Lễ tốt nghiệp (Cử nhân)', 
        'Lễ hội âm nhạc (Music Fest)', 'Lễ hội màu sắc (Color Run)', 'Tiệc tối sang trọng (Gala Dinner)', 'Dạ hội (Prom)', 
        'Tiệc nướng BBQ', 'Tiệc bể bơi (Pool Party)', 'Year End Party', 'Khai trương cửa hàng', 'Hội nghị khách hàng', 
        'Triển lãm nghệ thuật', 'Hội chợ xuân', 'Lễ hội pháo hoa', 'Lễ hội bia', 'Lễ hội té nước'
    ],
    'school': [
        'Kỷ yếu áo dài trắng', 'Kỷ yếu Vest/Suit', 'Kỷ yếu cử nhân', 'Kỷ yếu ném bột màu', 'Kỷ yếu dạ hội (Prom)', 
        'Concept Lớp học Vintage', 'Concept Bao cấp', 'Concept Harry Potter', 'Concept The Heirs (Hàn Quốc)', 
        'Concept Reply 1988', 'Chụp tại sân trường', 'Chụp tại thư viện', 'Chụp tại phòng thí nghiệm', 'Chụp tại sân bóng rổ', 
        'Chụp tại nhà để xe', 'Nhóm bạn thân (Best Friends)', 'Xếp hình tên lớp', 'Phóng máy bay giấy', 'Đồng phục thể dục', 
        'Cô gái bàn bên', 'Chàng trai năm ấy', 'Giờ ra chơi', 'Học nhóm'
    ],
    'corporate': [
        'Chân dung CEO tại văn phòng', 'Chân dung nhân viên xuất sắc', 'Ảnh tập thể công ty (Group)', 'Team Building bãi biển', 
        'Team Building vận động', 'Họp nhóm (Meeting)', 'Brainstorming', 'Thuyết trình dự án', 'Bắt tay hợp tác', 
        'Ký kết hợp đồng', 'Văn hóa công ty', 'Tiệc công ty', 'Không gian làm việc (Office Tour)', 'Nhân viên lễ tân', 
        'Nhân viên kỹ thuật', 'Nhân viên phục vụ', 'Đồng phục công ty', 'Sự kiện ra mắt sản phẩm', 'Hội thảo (Seminar)', 
        'Workshop đào tạo', 'Góc làm việc cá nhân'
    ],
    'creative': [
        'Fine Art Portrait', 'Surrealism (Siêu thực)', 'Double Exposure', 'Levitation (Bay lơ lửng)', 'Underwater (Dưới nước)', 
        'Smoke Art (Khói)', 'Light Painting (Vẽ ánh sáng)', 'Neon Cyberpunk', 'Gothic Dark', 'Fantasy Fairy', 
        'Cosplay Anime', 'Steampunk', 'Body Painting', 'Glitch Art', 'Mirror Reflection (Gương)', 'Broken Glass', 
        'Projector Photography (Máy chiếu)', 'Shadow Art (Bóng)', 'Paper Art (Giấy)', 'Flower Face', 'Milk Bath', 
        'Prism Photography (Lăng kính)', 'UV Light (Đèn cực tím)', 'Minimalist Color Block', 'Abstract Makeup'
    ],
    'traditional': [
        'Áo dài trắng nữ sinh', 'Áo dài Cô Ba Sài Gòn', 'Áo dài cung đình Huế', 'Áo dài cách tân', 'Áo yếm hoa sen', 
        'Nhật Bình (Cổ phục)', 'Việt Phục (Nguyễn Dynasty)', 'Cổ trang Trung Hoa (Hán Phục)', 'Kiếm hiệp', 'Tiên nữ', 
        'Kimono Nhật Bản', 'Hanbok Hàn Quốc', 'Saree Ấn Độ', 'Trang phục dân tộc vùng cao', 'Nông dân (Áo bà ba)', 
        'Làng quê Việt Nam', 'Chùa chiền/Đền đài', 'Phố cổ Hội An', 'Cố đô Huế', 'Hoàng thành Thăng Long', 
        'Tranh Đông Hồ', 'Múa dân gian', 'Nhạc cụ dân tộc'
    ],
    'sports': [
        'Gym/Fitness Studio', 'Yoga lúc bình minh', 'Pilates', 'Boxing/Kickboxing', 'Bóng đá sân cỏ', 'Bóng rổ đường phố', 
        'Bơi lội (Underwater)', 'Tennis/Cầu lông', 'Golf sân cỏ', 'Chạy bộ (Marathon)', 'Đạp xe (Cycling)', 
        'Leo núi (Trekking)', 'Trượt ván (Skateboarding)', 'Lướt sóng (Surfing)', 'Múa Ballet', 'Nhảy Hip-hop', 
        'Aerobic', 'Thể hình (Bodybuilding)', 'Bắn cung', 'Đua xe F1/Moto', 'Võ thuật (Karate/Taekwondo)', 
        'Chân dung vận động viên (Mồ hôi)', 'Khoe cơ bắp (Muscle)', 'Sporty Fashion'
    ],
    'outdoor': [
        'Rừng thông (Forest)', 'Bãi biển hoang sơ', 'Đồi cát (Desert)', 'Thác nước hùng vĩ', 'Cánh đồng hoa', 
        'Cánh đồng lúa chín', 'Đồi chè xanh', 'Hồ nước yên bình', 'Núi tuyết', 'Hoàng hôn trên biển', 'Bình minh trên núi', 
        'Cắm trại (Camping)', 'Dã ngoại bên hồ', 'Thành phố về đêm (City Night)', 'Đường phố tấp nập (Street)', 
        'Cầu thang/Kiến trúc', 'Sân thượng (Rooftop)', 'Bến cảng/Du thuyền', 'Công viên xanh', 'Làng chài', 
        'Ga tàu hỏa/Đường ray', 'Sân bay', 'Cánh đồng cỏ lau'
    ],
    'international': [
        'Phong cách Hàn Quốc (Minimalist)', 'Phong cách Nhật Bản (Film)', 'Phong cách Hồng Kông (Retro)', 
        'Phong cách Paris (Romantic)', 'Phong cách London (Street)', 'Phong cách New York (Modern)', 
        'Phong cách Santorini (White & Blue)', 'Phong cách Bali (Tropical)', 'Phong cách Dubai (Luxury)', 
        'Phong cách Vintage Mỹ (Country)', 'Phong cách Bắc Âu (Nordic)', 'Phong cách Địa Trung Hải', 
        'Phong cách Bohemian (Boho)', 'Phong cách Indochine (Đông Dương)'
    ],
    'lifestyle': [
        'Morning Coffee (Cà phê sáng)', 'Reading Book (Đọc sách)', 'Breakfast in Bed', 'Cooking (Nấu ăn)', 
        'Gardening (Làm vườn)', 'Playing Guitar/Piano', 'Listening to Music', 'Working from Home', 'Journaling (Viết nhật ký)', 
        'Meditation (Thiền)', 'Pet Cuddling (Ôm thú cưng)', 'Rainy Day Window', 'Cozy Fireplace', 'Bath Time (Bồn tắm)', 
        'Skincare Routine', 'Outfit of the Day (OOTD)', 'Unboxing', 'Shopping', 'Driving Car', 'Walking Dog', 
        'Sunday Brunch', 'Tea Time', 'Minimalist Home'
    ],
    'age': [
        'Newborn (Sơ sinh ngủ)', 'Toddler (Em bé chơi đùa)', 'School Kid (Đi học)', 'Teenager (Nổi loạn/Mơ mộng)', 
        'Young Adult (Sinh viên)', 'Adult (Trưởng thành/Thành đạt)', 'Middle Age (Trung niên)', 'Senior (Người cao tuổi)', 
        'Generations (Ông bà cháu)', 'Age Progression (Trưởng thành)', 'Wrinkles & Wisdom (Nếp nhăn)', 'Silver Hair (Tóc bạc)'
    ],
    'profession': [
        'Bác sĩ/Y tá (Bệnh viện)', 'Kỹ sư (Công trường)', 'Giáo viên (Lớp học)', 'Luật sư (Tòa án)', 'Công an/Bộ đội', 
        'Phi công/Tiếp viên', 'Đầu bếp (Nhà hàng)', 'Barista (Quán Cafe)', 'Họa sĩ (Xưởng vẽ)', 'Ca sĩ (Sân khấu)', 
        'Diễn viên (Phim trường)', 'Người mẫu (Studio)', 'Nhiếp ảnh gia', 'Lập trình viên (IT)', 'Streamer/Gamer', 
        'Nông dân (Trang trại)', 'Thợ máy (Gara)', 'Thợ cắt tóc (Barber)', 'Vũ công', 'Nhà văn/Nhà báo'
    ],
    'mood': [
        'Hạnh phúc (Cười lớn)', 'Buồn (Khóc/Mưa)', 'Suy tư (Trầm ngâm)', 'Giận dữ (La hét)', 'Sợ hãi (Kinh dị)', 
        'Ngạc nhiên (Wow)', 'Bí ẩn (Che mặt)', 'Quyến rũ (Sexy)', 'Ngây thơ (Innocent)', 'Mạnh mẽ (Confident)', 
        'Cô đơn (Lonely)', 'Nhớ nhung (Nostalgic)', 'Hy vọng (Hopeful)', 'Bình yên (Peaceful)', 'Mệt mỏi (Exhausted)', 
        'Tự do (Freedom)', 'Yêu đời (Optimistic)', 'Lạnh lùng (Cool)'
    ],
    'storytelling': [
        'Cô gái đợi tàu', 'Chàng trai dưới mưa', 'Bức thư tình', 'Cuộc gặp gỡ định mệnh', 'Lời chia tay', 
        'Chuyến đi xa', 'Về nhà (Homecoming)', 'Tìm lại ký ức', 'Bí mật bị chôn vùi', 'Giấc mơ trưa', 
        'Lạc lối ở Tokyo', 'Cô đơn giữa đám đông', 'Người lạ từng quen', 'Khoảnh khắc chiến thắng', 'Nỗi đau ngọt ngào', 
        'Chờ người nơi ấy', 'Ngày hôm qua', 'Tương lai rực rỡ'
    ]
};

const STYLES = [
    { name: 'Realistic Studio', type: 'suggested' },
    { name: 'Soft Dreamy', type: 'suggested' },
    { name: 'Cinematic', type: 'suggested' },
    { name: 'Film Vintage', type: 'suggested' },
    { name: 'High-End Retouch', type: 'suggested' },
    { name: 'Korean Glow', type: 'suggested' },

    // 1) Tông màu tổng thể
    { name: 'Tông ấm', type: 'all' },
    { name: 'Tông lạnh', type: 'all' },
    { name: 'Tông trung tính', type: 'all' },
    { name: 'Tông vàng nắng', type: 'all' },
    { name: 'Tông xanh lá nhẹ', type: 'all' },
    { name: 'Tông hồng nhẹ', type: 'all' },
    { name: 'Đỏ rực', type: 'all' },
    { name: 'Cam ấm', type: 'all' },
    { name: 'Tím mộng mơ', type: 'all' },
    { name: 'Xanh dương đậm', type: 'all' },

    // 2) Phong cách Điện ảnh (Cinematic)
    { name: 'Điện ảnh xanh – cam', type: 'all' },
    { name: 'Điện ảnh tương phản tối', type: 'all' },
    { name: 'Điện ảnh da tự nhiên', type: 'all' },
    { name: 'Điện ảnh giảm bão hoà', type: 'all' },
    { name: 'Điện ảnh phim cũ (vintage)', type: 'all' },
    { name: 'Điện ảnh pastel', type: 'all' },
    { name: 'Điện ảnh u tối (moody)', type: 'all' },
    { name: 'Điện ảnh xanh lạnh', type: 'all' },
    { name: 'Điện ảnh xanh rừng', type: 'all' },
    { name: 'Điện ảnh ánh vàng hoàng hôn', type: 'all' },

    // 3) Giảm màu / Màu nhạt (Desaturate)
    { name: 'Pastel nhạt', type: 'all' },
    { name: 'Giảm bão hoà nhẹ', type: 'all' },
    { name: 'Xám – lạnh', type: 'all' },
    { name: 'Xám – ấm', type: 'all' },
    { name: 'Vintage phai nhẹ', type: 'all' },
    { name: 'Wash film cũ', type: 'all' },
    { name: 'Màu hơi bạc', type: 'all' },
    { name: 'Màu lì (matte)', type: 'all' },
    { name: 'Tông đất dịu', type: 'all' },
    { name: 'Tông khói', type: 'all' },

    // 4) Phong cách Phim (Film Look)
    { name: 'Phim Kodak', type: 'all' },
    { name: 'Phim Fuji', type: 'all' },
    { name: 'Phim Portra 400', type: 'all' },
    { name: 'Phim Cinestill 800', type: 'all' },
    { name: 'Phim Lomo', type: 'all' },
    { name: 'Hạt film (grain)', type: 'all' },
    { name: 'Grain mềm', type: 'all' },
    { name: 'Film phai', type: 'all' },
    { name: 'Film retro ấm', type: 'all' },
    { name: 'Phong cách máy film cổ', type: 'all' },

    // 5) Đen trắng (Black & White)
    { name: 'Đen trắng cổ điển', type: 'all' },
    { name: 'Đen trắng tương phản mạnh', type: 'all' },
    { name: 'Đen trắng mềm mịn', type: 'all' },
    { name: 'Đen trắng hạt film', type: 'all' },
    { name: 'Noir (điện ảnh đen)', type: 'all' },
    { name: 'Đen trắng high-key (sáng)', type: 'all' },
    { name: 'Đen trắng low-key (tối)', type: 'all' },
    { name: 'Đơn sắc ánh bạc', type: 'all' },
    { name: 'Đơn sắc vintage nâu', type: 'all' },
    { name: 'Đơn sắc ấm', type: 'all' },

    // 6) Nghệ thuật / Fantasy
    { name: 'Hai màu (duo-tone)', type: 'all' },
    { name: 'Hai màu đối lập', type: 'all' },
    { name: 'Ba màu (tricolor)', type: 'all' },
    { name: 'Neon', type: 'all' },
    { name: 'Cyberpunk', type: 'all' },
    { name: 'Cầu vồng gel (rainbow gel)', type: 'all' },
    { name: 'Mờ ảo (dreamy)', type: 'all' },
    { name: 'Tiên – huyền ảo (fairy)', type: 'all' },
    { name: 'U tối – bí ẩn', type: 'all' },
    { name: 'Màu rực rỡ nổi bật', type: 'all' },

    // 7) Tông da (Skin Tone)
    { name: 'Da trắng hồng', type: 'all' },
    { name: 'Da trắng lạnh', type: 'all' },
    { name: 'Da vàng ấm', type: 'all' },
    { name: 'Da nâu sô-cô-la', type: 'all' },
    { name: 'Da sáng tự nhiên', type: 'all' },
    { name: 'Da lì, không bóng (matte)', type: 'all' },
    { name: 'Da bóng sáng (glossy)', type: 'all' },
    { name: 'Da có hạt film', type: 'all' },
    { name: 'Da mịn – retouch', type: 'all' },
    { name: 'Da tự nhiên, giữ texture', type: 'all' },

    // 8) Hậu kỳ – Hiệu ứng màu
    { name: 'Màu lì (matte tone)', type: 'all' },
    { name: 'Hiệu ứng sáng mềm (glow)', type: 'all' },
    { name: 'Độ nét – chi tiết cao (clarity)', type: 'all' },
    { name: 'HDR chân dung', type: 'all' },
    { name: 'Tương phản mạnh', type: 'all' },
    { name: 'Tương phản mềm', type: 'all' },
    { name: 'Fade bóng (shadow fade)', type: 'all' },
    { name: 'Fade sáng (highlight fade)', type: 'all' },
    { name: 'Chia tông màu (split tone)', type: 'all' },
    { name: 'Màu chéo (cross-process)', type: 'all' },
];

const LIGHTING_OPTIONS = ['Sáng Tự Nhiên', 'Studio (Softbox)', 'Rực Rỡ (High Contrast)', 'Tối Nghệ Thuật (Low Key)', 'Neon (Color Gel)', 'Ấm Áp (Warm)'];
const TONE_OPTIONS = ['Trung Tính', 'Ấm (Warm)', 'Lạnh (Cool)', 'Pastel', 'Đen Trắng'];
const MAKEUP_OPTIONS = ['Không', 'Nhẹ Nhàng', 'Chuyên Nghiệp', 'Hàn Quốc', 'Tây (Sharp)'];
const BACKGROUND_OPTIONS = ['Giữ Nguyên (Gốc)', 'Mờ (Blur)', 'Trắng Sạch', 'Xám Studio', 'Theo Concept'];

// New options for Camera & Ratio
const ASPECT_RATIOS = [
    { id: '1:1', label: 'Vuông (1:1)', icon: AspectRatio11Icon },
    { id: '3:4', label: 'Dọc (3:4)', icon: AspectRatio34Icon },
    { id: '4:3', label: 'Ngang (4:3)', icon: AspectRatio169Icon }, // Reuse generic horizontal icon
    { id: '16:9', label: 'Điện ảnh (16:9)', icon: AspectRatio169Icon },
    { id: '9:16', label: 'Story (9:16)', icon: FrameIcon }, // Use generic frame for vertical tall
];

const FRAMING_OPTIONS = [
    { id: 'close_up', label: 'Cận Cảnh (Close Up)', desc: 'Tập trung khuôn mặt' },
    { id: 'half_body', label: 'Trung Cảnh (Half Body)', desc: 'Lấy nửa người' },
    { id: 'full_body', label: 'Toàn Thân (Full Body)', desc: 'Lấy cả dáng' },
    { id: 'wide_shot', label: 'Góc Rộng (Wide Shot)', desc: 'Mở rộng bối cảnh tối đa' },
];

const TRANSLATION_LANGUAGES = [
    { code: 'vi', name: 'Tiếng Việt 🇻🇳' },
    { code: 'en', name: 'English 🇺🇸' },
    { code: 'ko', name: 'Korean 🇰🇷' },
    { code: 'ja', name: 'Japanese 🇯🇵' },
    { code: 'zh', name: 'Chinese 🇨🇳' },
];


// --- TYPES ---
interface RetouchSettings {
    lighting: string;
    tone: string;
    makeup: string;
    skinSmooth: number; // 0-100
    faceSlim: boolean;
    acneRemoval: boolean;
    background: string;
    ratio: string; // New
    framing: string; // New
}

const DEFAULT_RETOUCH: RetouchSettings = {
    lighting: 'Studio (Softbox)',
    tone: 'Trung Tính',
    makeup: 'Nhẹ Nhàng',
    skinSmooth: 50,
    faceSlim: false,
    acneRemoval: true,
    background: 'Theo Concept',
    ratio: '3:4',
    framing: 'full_body' // Default to Full Body
};

const PortraitEditor: React.FC<{ tool: IntegrationTool, onNavigate: (page: string) => void }> = ({ tool, onNavigate }) => {
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

    const fileInputRef = useRef<HTMLInputElement>(null);
    const refImageInputRef = useRef<HTMLInputElement>(null); // For Mimic Mode

    // --- STATE ---
    const [editorMode, setEditorMode] = useState<'manual' | 'mimic'>('manual');
    const [step, setStep] = useState<1 | 2 | 3>(1);
    
    // Data State
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
    const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
    const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
    const [retouch, setRetouch] = useState<RetouchSettings>(DEFAULT_RETOUCH);
    const [imageQuantity, setImageQuantity] = useState<ImageQuantity>(1);
    const [selectedModel, setSelectedModel] = useState<string>(activeModels[0].id);

    useEffect(() => {
        if (!activeModels.some(m => m.id === selectedModel)) {
            setSelectedModel(activeModels[0].id);
        }
    }, [activeModels, selectedModel]);
    
    // Mimic Mode State
    const [referenceImage, setReferenceImage] = useState<string | null>(null);
    const [isExtractingPrompt, setIsExtractingPrompt] = useState(false);

    // Result State (Multi-image)
    const [resultImages, setResultImages] = useState<string[]>([]);
    const [selectedResultIndex, setSelectedResultIndex] = useState(0);
    
    // New: Prompt State
    const [customPrompt, setCustomPrompt] = useState('');
    const [isSuggestingPrompt, setIsSuggestingPrompt] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [translateLang, setTranslateLang] = useState('vi');
    const [isTranslating, setIsTranslating] = useState(false);
    
    // UI State
    const [isProcessing, setIsProcessing] = useState(false);
    const [showAllStyles, setShowAllStyles] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    const freshUser = useMemo(() => loggedInUser ? findUserInTree(userState.allUsers, loggedInUser.id) : null, [userState.allUsers, loggedInUser]);
    const currentCredits = freshUser ? freshUser.creditBalance : 0;
    
    const totalCost = tool.creditCost * imageQuantity;

    // History
    const historyItems = useMemo(() => {
        if (!loggedInUser?.generationHistory) return [];
        return loggedInUser.generationHistory
            .filter(h => h.taskId.startsWith('studio_'))
            .sort((a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime());
    }, [loggedInUser]);

    // --- ACTIONS ---

    const handleRefImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
         if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (event) => {
                if (event.target?.result) {
                    const resultStr = event.target.result as string;
                    setReferenceImage(resultStr);
                    // Automatically trigger analysis
                    await autoAnalyzeRefImage(resultStr);
                }
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    }

    // New automatic analysis function (replaces manual handleExtractPrompt)
    const autoAnalyzeRefImage = async (base64Image: string) => {
        setIsExtractingPrompt(true);
        try {
             const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
             const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/png';
             const imagePart = { inlineData: { data: base64Image.split(',')[1], mimeType } };

             const prompt = `
             Analyze the uploaded image and generate a structured prompt for a photorealistic recreation.
             MANDATORY STRUCTURE:
             1. Start EXACTLY with: "Create a close-up, ultra-realistic photograph (not a cartoon or fantasy image) based on the original attached face."
             2. Describe the subject (Gender, Age) and the general scene.
             3. Outfit: [Detailed description of materials, colors, style]
             4. Pose: [Detailed description of stance, gesture, expression]
             5. Background / Setting: [Detailed description including lighting, environment, atmosphere]
             
             Constraint: Keep it realistic, focus on lighting and materials.
             `;
             
             const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: { parts: [imagePart, { text: prompt }] },
                config: { responseModalities: [Modality.TEXT] },
            });
            
            if (response.text) {
                const extracted = response.text.trim();
                setCustomPrompt(extracted); // Directly populate main prompt
                addToast('Đã tự động phân tích và tạo Prompt chuẩn!', 'success');
            } else {
                 addToast('Không thể phân tích ảnh.', 'error');
            }

        } catch (error) {
            console.error("Extraction error:", error);
            addToast('Lỗi khi phân tích ảnh mẫu.', 'error');
        } finally {
            setIsExtractingPrompt(false);
        }
    };


    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setUploadedImage(event.target.result as string);
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
        e.target.value = '';
    };

    const handleThemeSelect = (themeId: string) => {
        setSelectedTheme(themeId);
        setSelectedConcept(null); // Reset concept when theme changes
        setCustomPrompt(''); // Reset prompt
    };

    const handleConceptSelect = (concept: string) => {
        setSelectedConcept(concept);
        // Do not auto-advance step 2. Let user fill prompt or choose style.
    };

    const handleStyleSelect = (style: string) => {
        setSelectedStyle(style);
        // Do not auto advance, let user adjust retouch or click generate
    };

    const handleTranslatePrompt = async () => {
        if (!customPrompt.trim()) return;
        setIsTranslating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
            const targetLangName = TRANSLATION_LANGUAGES.find(l => l.code === translateLang)?.name || 'Vietnamese';
            
            const prompt = `Translate the following text to ${targetLangName}. Keep technical photography terms (bokeh, ISO, lighting names) in English if they are standard. Only return the translated text. Text: "${customPrompt}"`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: { parts: [{ text: prompt }] }
            });

            if (response.text) {
                setCustomPrompt(response.text.trim());
                addToast('Đã dịch xong!', 'success');
            }
        } catch (error) {
            console.error("Translation error:", error);
            addToast('Lỗi dịch thuật.', 'error');
        } finally {
            setIsTranslating(false);
        }
    };

    const handleSuggestPrompt = async () => {
        if (!selectedTheme || !selectedConcept) return;
        setIsSuggestingPrompt(true);

        const themeName = THEMES.find(t => t.id === selectedTheme)?.name || selectedTheme;
        const framingInfo = FRAMING_OPTIONS.find(f => f.id === retouch.framing);
        const ratioInfo = ASPECT_RATIOS.find(r => r.id === retouch.ratio);
        
        try {
            const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
            let parts: any[] = [];

            // Add Image if available
            if (uploadedImage) {
                const mimeType = uploadedImage.split(';')[0].split(':')[1] || 'image/png';
                const base64Data = uploadedImage.split(',')[1];
                parts.push({ inlineData: { data: base64Data, mimeType } });
            }

            const promptText = `
            ROLE: Elite Portrait Photographer & Cinematic Prompt Engineer.
            TASK: Analyze the input image (if provided) to determine Gender, Age, and Features. Then craft a prompt for a high-end photograph.

            **MANDATORY OUTPUT STRUCTURE (Reference)**:
            1. **Opening**: "Create a close-up, ultra-realistic photograph (not a cartoon or fantasy image) based on the original attached face."
            2. **Subject**: Describe the person (Gender, Age) matching the input image (or user note if no image).
            3. **Outfit**: Detailed materials (knitted, silk), colors, fit.
            4. **Hair & Makeup**: Style and color.
            5. **Pose & Expression**: Action and emotion.
            6. **Background & Lighting**: Setting and atmosphere.

            **INPUT CONTEXT**:
            - Theme: ${themeName}
            - Concept: ${selectedConcept}
            - Framing: ${framingInfo?.label}
            - Aspect Ratio: ${ratioInfo?.label}
            - User Note: "${customPrompt}"

            **CRITICAL**: If an image is provided, DETECT the subject's gender (Male/Female) and ensure the prompt matches. If no image, use the User Note or default to a generic/neutral subject unless specified.

            **OUTPUT**: A single, dense, highly descriptive paragraph (or structured list like the reference) ready for generation.
            `;
            
            parts.push({ text: promptText });

            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: { parts: parts }
            });
            
            if (response.text) {
                setCustomPrompt(response.text.trim());
                addToast('Đã tạo Prompt Siêu chi tiết (Pro)!', 'success');
            }
        } catch (error) {
            console.error("Prompt suggestion error:", error);
            addToast('Không thể tạo gợi ý lúc này.', 'error');
        } finally {
            setIsSuggestingPrompt(false);
        }
    };

    const handleLoadHistory = (item: GenerationResult) => {
        if (item.images && item.images.length > 0) {
            setResultImages(item.images);
            setSelectedResultIndex(0);
            setShowHistoryModal(false);
            addToast('Đã tải ảnh từ lịch sử.', 'success');
        }
    };

    const handleGenerate = async () => {
        if (!uploadedImage || !loggedInUser) return;
        
        // Validation based on mode
        if (editorMode === 'manual') {
            if (!selectedTheme || !selectedConcept || !selectedStyle) {
                 addToast('Vui lòng chọn Chủ đề, Concept và Style.', 'error');
                 return;
            }
        } else {
             // Mimic mode
             if (!customPrompt) {
                  addToast('Vui lòng nhập Prompt hoặc tải ảnh mẫu.', 'error');
                  return;
             }
        }
        
        if (currentCredits < totalCost) {
            addToast(`Không đủ Credit. Cần ${totalCost} Credit.`, 'error');
            return;
        }

        setIsProcessing(true);
        setResultImages([]);
        
        const creditResult = await handleUseToolCredit(loggedInUser.id, { ...tool, creditCost: totalCost });
        if (!creditResult.success) {
            setIsProcessing(false);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
            const mimeType = uploadedImage.split(';')[0].split(':')[1] || 'image/png';
            const imagePart = { inlineData: { data: uploadedImage.split(',')[1], mimeType } };

            const themeName = selectedTheme ? (THEMES.find(t => t.id === selectedTheme)?.name || selectedTheme) : "Custom";
            const framingLabel = FRAMING_OPTIONS.find(f => f.id === retouch.framing)?.label || '';
            const ratioLabel = ASPECT_RATIOS.find(r => r.id === retouch.ratio)?.label || '';

            const generatedImages: string[] = [];
            
            // Build Prompt Logic
            let mainContext = "";
            if (editorMode === 'manual') {
                 mainContext = `
                CONTEXT:
                - Theme: ${themeName}
                - Concept: ${selectedConcept}
                - Style: ${selectedStyle}
                ${customPrompt ? `- VISION: "${customPrompt}"` : ''}
                 `;
            } else {
                 mainContext = `
                CONTEXT:
                - STYLE REPLICATION: Match the visual style described here: "${customPrompt}"
                 `;
            }

            for (let i = 0; i < imageQuantity; i++) {
                setProgressMessage(`Đang tạo ảnh ${i + 1}/${imageQuantity}...`);

                // Add variation instruction to ensure different results
                const variationSeed = Math.random();
                const variationInstruction = i > 0 
                    ? `VARIATION SEED ${variationSeed}: Change camera angle slightly, alter head tilt, or change lighting direction to make this unique.` 
                    : "";
                
                // Framing Instruction
                let framingInstruction = "";
                if (retouch.framing === 'wide_shot') {
                    framingInstruction = "CAMERA: Wide Angle Lens (24mm or 35mm). Zoom out to show the full environment and context. The subject should occupy smaller portion of the frame to reveal the background.";
                } else if (retouch.framing === 'full_body') {
                    framingInstruction = "CAMERA: Full Body Shot. Ensure the subject is visible from head to toe. Do not crop feet.";
                } else if (retouch.framing === 'close_up') {
                     framingInstruction = "CAMERA: Close-up Portrait (85mm). Focus tightly on the face and expressions. Blur background (Bokeh).";
                } else {
                     framingInstruction = "CAMERA: Medium Shot (Waist Up). Standard portrait framing.";
                }

                const prompt = `
                SYSTEM_ROLE: Professional Studio Photographer & High-End Retoucher.
                TASK: Transform the input photo into a hyper-realistic professional studio shot.

                ${mainContext}

                CAMERA & COMPOSITION:
                - Framing: ${framingLabel} (${framingInstruction})
                - Aspect Ratio: ${ratioLabel}
                
                RETOUCH SETTINGS (HYPER-REALISM):
                - Lighting: ${retouch.lighting} (Use raytracing logic for accurate shadows)
                - Color Tone: ${retouch.tone}
                - Makeup: ${retouch.makeup} (Apply naturally)
                - Skin: Smoothness Level ${retouch.skinSmooth}% (Keep skin pores and texture visible, Subsurface scattering enabled)
                - Background: ${retouch.background === 'Theo Concept' ? `Match the concept or style` : retouch.background}

                CRITICAL INSTRUCTIONS:
                1. **IDENTITY PRESERVATION**: Keep the subject's face features 100% consistent.
                2. **PHYSICS & LIGHTING**: Shadows must fall correctly based on the lighting direction. Use Global Illumination.
                3. **TEXTURES**: Clothes must look tangible (fabric weave). Skin must look organic (not plastic).
                4. **QUALITY**: 8k resolution, Uncompressed, RAW photo quality.
                5. **NEGATIVE CONSTRAINTS**: Not a cartoon, no anime style, no 3D render look, no plastic skin, no distorted hands.
                ${variationInstruction}
                `;

                const response = await ai.models.generateContent({
                    model: selectedModel,
                    contents: { parts: [imagePart, { text: prompt }] },
                    config: { responseModalities: [Modality.IMAGE] },
                });

                const newImagePart = response.candidates?.[0]?.content?.parts[0];
                if (newImagePart && newImagePart.inlineData?.data) {
                    const resultUrl = `data:${newImagePart.inlineData.mimeType};base64,${newImagePart.inlineData.data}`;
                    generatedImages.push(resultUrl);
                } else {
                    throw new Error("API không trả về ảnh.");
                }
            }
            
            setResultImages(generatedImages);
            setSelectedResultIndex(0);

            // Save History
            const newResult: GenerationResult = {
                taskId: `studio_${Date.now()}`,
                date: new Date().toLocaleDateString('vi-VN'),
                prompt: `[Studio] ${editorMode === 'manual' ? selectedConcept : 'Copy Style'} - ${editorMode === 'manual' ? selectedStyle : 'Custom'} (${imageQuantity} ảnh)`,
                images: generatedImages,
                settings: { aspectRatio: 'custom', customRatio: null, quantity: imageQuantity, generationMode: 'Chất lượng', imageStyle: editorMode === 'manual' ? selectedStyle : 'Copy Style' },
                cost: totalCost,
                balanceAfter: freshUser ? freshUser.creditBalance - totalCost : 0,
                creationTime: new Date().toLocaleTimeString(),
            };
            handleSetGenerationHistory(loggedInUser.id, newResult);
            addToast(`Tạo thành công ${generatedImages.length} ảnh!`, 'success');

        } catch (error) {
            console.error(error);
            addToast('Lỗi tạo ảnh. Đã hoàn lại Credit.', 'error');
            const userForRefund = findUserInTree(userState.allUsers, loggedInUser.id);
            if(userForRefund) {
                await handleUseToolCredit(userForRefund.id, { ...tool, creditCost: -totalCost });
            }
        } finally {
            setIsProcessing(false);
            setProgressMessage('');
        }
    };
    
    const handleDeleteHistoryItem = (taskId: string) => {
        if (loggedInUser) {
            handleDeleteGenerationResult(loggedInUser.id, taskId);
            addToast('Đã xóa.', 'info');
        }
    };

    const handleDownload = (imageUrl: string) => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `studio_pro_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUseAsInput = () => {
        if (resultImages.length > 0) {
            const selectedImg = resultImages[selectedResultIndex];
            setUploadedImage(selectedImg);
            setResultImages([]);
            setStep(1); // Reset to Step 1 to allow full reconfiguration with the new image
            addToast('Đã chuyển ảnh kết quả sang làm ảnh gốc. Bạn có thể tiếp tục chỉnh sửa!', 'success');
        }
    };

    // --- RENDERERS ---

    const renderProgressBar = () => (
        <div className="flex items-center justify-center gap-2 mb-8 bg-slate-900 p-2 rounded-full border border-slate-800 w-fit mx-auto">
            <button 
                onClick={() => setStep(1)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${step === 1 ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px]">1</div>
                {editorMode === 'manual' ? 'Chủ đề' : 'Ảnh Mẫu & Prompt'}
            </button>
            <div className="w-8 h-px bg-slate-700"></div>
            
            {editorMode === 'manual' && (
                <>
                    <button 
                        onClick={() => { 
                            if (uploadedImage && selectedConcept) setStep(2); 
                        }}
                        disabled={!uploadedImage || !selectedConcept}
                        className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${step === 2 ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 disabled:opacity-50'}`}
                    >
                        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px]">2</div>
                        Style
                    </button>
                    <div className="w-8 h-px bg-slate-700"></div>
                </>
            )}

            <button 
                onClick={() => { 
                    if (editorMode === 'manual') {
                         if (uploadedImage && selectedStyle) setStep(3); // In manual, studio is step 3
                    } else {
                         // In mimic, studio is step 2, check if we have image and prompt
                         if (uploadedImage && customPrompt) setStep(2);
                    }
                }}
                disabled={editorMode === 'manual' ? (!selectedStyle) : (!uploadedImage || !customPrompt)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${(step === 3 && editorMode === 'manual') || (step === 2 && editorMode === 'mimic') ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 disabled:opacity-50'}`}
            >
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px]">{editorMode === 'manual' ? '3' : '2'}</div>
                Studio
            </button>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-[#0f172a] text-gray-300 font-sans">
             {/* HISTORY MODAL */}
             <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Lịch sử Studio" size="lg" hideFooter>
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
                                    <button onClick={() => handleLoadHistory(item)} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500" title="Xem lại"><ArrowPathIcon className="h-4 w-4" /></button>
                                    <button onClick={() => handleDeleteHistoryItem(item.taskId)} className="p-2 bg-slate-700 text-red-400 rounded-lg hover:bg-slate-600" title="Xóa"><TrashIcon className="h-4 w-4" /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Modal>

            {/* Header */}
            <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-30 shadow-md">
                <div className="flex items-center gap-10 w-full">
                     <div className="flex items-center gap-4">
                        <button onClick={() => onNavigate('Kho Tiện Ích')} className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">
                            <ArrowLeftIcon className="h-5 w-5" /> Quay lại
                        </button>
                        <h1 className="text-lg font-bold text-white flex items-center gap-2">
                            <CameraIcon className="h-5 w-5 text-indigo-500" />
                            Studio AI Pro
                        </h1>
                    </div>
                     {/* TAB SWITCHER FOR MODE (MOVED TO HEADER FOR CLEANER LAYOUT) */}
                    <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 mx-auto">
                        <button 
                            onClick={() => { setEditorMode('manual'); setStep(1); }} 
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${editorMode === 'manual' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Bộ sưu tập
                        </button>
                        <button 
                            onClick={() => { setEditorMode('mimic'); setStep(1); }} 
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${editorMode === 'mimic' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Copy Style (Ảnh)
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <CreditBalanceDisplay balance={currentCredits} onAdd={() => onNavigate('Ví Của Tôi')} />
                    <button onClick={() => setShowHistoryModal(true)} className="p-2 text-indigo-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-indigo-900/50"><ClockIcon className="h-5 w-5" /></button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-6 md:p-8 relative">
                {/* Background Decor */}
                <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                
                <div className="max-w-7xl mx-auto relative z-10">
                    
                    {renderProgressBar()}

                    {/* Result View */}
                    {resultImages.length > 0 ? (
                        <div className="flex flex-col items-center animate-fadeIn">
                             <div className="relative bg-slate-900 border border-slate-700 p-2 rounded-2xl shadow-2xl max-w-4xl w-full">
                                <div className="aspect-[3/4] bg-black rounded-lg overflow-hidden flex items-center justify-center">
                                    <img src={resultImages[selectedResultIndex]} alt="Result" className="w-full h-full object-contain" />
                                </div>
                                <div className="absolute top-6 right-6 flex flex-col gap-2">
                                     <button onClick={() => handleDownload(resultImages[selectedResultIndex])} className="p-3 bg-white text-black rounded-full shadow-lg hover:scale-110 transition-transform"><DocumentArrowDownIcon className="h-6 w-6" /></button>
                                </div>
                             </div>

                             {/* Thumbnails if > 1 */}
                             {resultImages.length > 1 && (
                                 <div className="flex gap-4 mt-6 overflow-x-auto p-2 w-full justify-center">
                                     {resultImages.map((img, idx) => (
                                         <button 
                                            key={idx}
                                            onClick={() => setSelectedResultIndex(idx)}
                                            className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${selectedResultIndex === idx ? 'border-indigo-500 scale-110 shadow-lg' : 'border-slate-700 hover:border-slate-500'}`}
                                        >
                                            <img src={img} className="w-full h-full object-cover" alt={`Res ${idx}`} />
                                        </button>
                                     ))}
                                 </div>
                             )}

                             <div className="mt-8 flex gap-4">
                                 <button onClick={handleUseAsInput} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center gap-2">
                                     <ArrowPathIcon className="h-5 w-5" />
                                     Dùng làm ảnh gốc (Tiếp tục)
                                 </button>
                                 <button onClick={() => { setResultImages([]); setStep(1); }} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors border border-slate-700">
                                     Làm bộ ảnh mới
                                 </button>
                             </div>
                        </div>
                    ) : (
                        <>
                        {/* LEFT COLUMN: UPLOAD & CAMERA */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
                            <div className="lg:col-span-4 space-y-4">
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

                                {/* Main Upload Box - SUBJECT (Always Here) */}
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`aspect-[3/4] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden bg-slate-900/50 group ${uploadedImage ? 'border-green-500 ring-1 ring-green-500/50' : 'border-slate-600 hover:border-indigo-400 hover:bg-slate-800'}`}
                                >
                                    {uploadedImage ? (
                                        <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center p-6">
                                            <UserCircleIcon className="h-16 w-16 mx-auto mb-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                                            <h3 className="text-lg font-bold text-white mb-1">Ảnh Gốc (Chủ thể)</h3>
                                            <p className="text-sm text-slate-500">Người cần chuyển style</p>
                                        </div>
                                    )}
                                    {uploadedImage && <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><span className="text-white font-bold border border-white px-3 py-1 rounded-full">Đổi ảnh</span></div>}
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                                </div>
                                <p className="text-center text-xs text-slate-500">*Khuyên dùng ảnh rõ mặt, ánh sáng tốt.</p>

                                {/* CAMERA & RATIO SETTINGS */}
                                <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-4 animate-fadeIn">
                                    <h4 className="text-sm font-bold text-indigo-400 uppercase flex items-center gap-2">
                                        <CameraIcon className="h-4 w-4"/> Cấu hình Camera & Khung hình
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 gap-4">
                                        {/* Aspect Ratio */}
                                        <div>
                                            <label className="text-xs font-semibold text-gray-400 block mb-2">Tỉ lệ khung hình (Aspect Ratio)</label>
                                            <div className="grid grid-cols-5 gap-2">
                                                {ASPECT_RATIOS.map(r => {
                                                    const Icon = r.icon;
                                                    return (
                                                        <button 
                                                            key={r.id}
                                                            onClick={() => setRetouch(p => ({...p, ratio: r.id}))}
                                                            className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${retouch.ratio === r.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-gray-400 hover:bg-slate-700'}`}
                                                            title={r.label}
                                                        >
                                                            <Icon className="h-5 w-5" />
                                                            <span className="text-[9px] font-bold">{r.id}</span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        {/* Framing */}
                                        <div>
                                            <label className="text-xs font-semibold text-gray-400 block mb-2">Góc máy (Framing)</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {FRAMING_OPTIONS.map(f => (
                                                    <button
                                                        key={f.id}
                                                        onClick={() => setRetouch(p => ({...p, framing: f.id}))}
                                                        className={`p-2 rounded-lg text-left transition-all ${retouch.framing === f.id ? 'bg-indigo-600 text-white border-transparent' : 'bg-slate-800 text-gray-400 border border-slate-700 hover:border-indigo-400'}`}
                                                    >
                                                        <span className="block text-[10px] font-bold">{f.label.split('(')[0]}</span>
                                                        <span className="block text-[8px] opacity-70">{f.desc}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: THEMES / STYLES / RETOUCH */}
                            <div className="lg:col-span-8 space-y-6">
                                {step === 1 && editorMode === 'manual' && (
                                    <>
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><SparklesIcon className="h-5 w-5 text-yellow-400"/> Chọn Chủ Đề</h3>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                {THEMES.map(theme => (
                                                    <button
                                                        key={theme.id}
                                                        onClick={() => handleThemeSelect(theme.id)}
                                                        className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${selectedTheme === theme.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg scale-105' : 'bg-slate-800 border-slate-700 text-gray-400 hover:border-indigo-500 hover:text-white'}`}
                                                    >
                                                        <span className="text-2xl">{theme.icon}</span>
                                                        <span className="text-sm font-bold">{theme.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {selectedTheme && (
                                            <div className="animate-fadeIn">
                                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><CubeIcon className="h-5 w-5 text-pink-400"/> Chọn Concept ({THEMES.find(t => t.id === selectedTheme)?.name})</h3>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                    {CONCEPTS[selectedTheme].map(concept => (
                                                        <button
                                                            key={concept}
                                                            onClick={() => handleConceptSelect(concept)}
                                                            className={`py-3 px-2 rounded-lg border text-sm font-medium transition-all ${selectedConcept === concept ? 'bg-pink-600 border-pink-500 text-white shadow-lg' : 'bg-slate-800/50 border-slate-700 text-gray-300 hover:bg-slate-800 hover:border-pink-400'}`}
                                                        >
                                                            {concept}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Navigation Button for Step 1 Manual */}
                                        <div className="flex justify-end mt-8">
                                            <button 
                                                onClick={() => setStep(2)}
                                                disabled={!uploadedImage || !selectedTheme || !selectedConcept}
                                                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                Tiếp tục <ArrowRightIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </>
                                )}
                                
                                {/* MIMIC MODE Layout for Step 1 */}
                                {step === 1 && editorMode === 'mimic' && (
                                    <div className="flex flex-col gap-6 animate-fadeIn">
                                        <div className="grid grid-cols-1 gap-6">
                                            {/* Reference Upload Column */}
                                             <div className="space-y-4">
                                                 <label className="text-sm font-bold text-purple-400 uppercase flex items-center gap-2">
                                                    <DocumentMagnifyingGlassIcon className="h-4 w-4"/> Ảnh Mẫu (Style Reference)
                                                </label>
                                                <div 
                                                    onClick={() => !referenceImage && document.getElementById('ref-upload')?.click()}
                                                    className={`aspect-video border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${referenceImage ? 'border-purple-500 bg-slate-900' : 'border-slate-600 hover:border-purple-500 hover:bg-slate-800'}`}
                                                >
                                                    {referenceImage ? (
                                                        <>
                                                            <img src={referenceImage} alt="Ref" className="w-full h-full object-cover p-1" />
                                                            {isExtractingPrompt && (
                                                                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10">
                                                                    <ArrowPathIcon className="h-8 w-8 text-purple-400 animate-spin mb-2" />
                                                                    <p className="text-xs text-purple-200 font-medium">Đang tự động phân tích...</p>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="text-center p-6">
                                                            <DocumentMagnifyingGlassIcon className="h-10 w-10 mx-auto mb-2 text-slate-600 group-hover:text-purple-400" />
                                                            <p className="text-sm font-medium text-slate-400 group-hover:text-white">Tải ảnh mẫu</p>
                                                            <p className="text-xs text-slate-500 mt-1">AI sẽ học ánh sáng & màu sắc</p>
                                                        </div>
                                                    )}
                                                    {referenceImage && <button onClick={() => { setReferenceImage(null); }} className="absolute top-2 right-2 bg-red-600/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="h-4 w-4"/></button>}
                                                    <input id="ref-upload" type="file" onChange={handleRefImageUpload} className="hidden" accept="image/*" />
                                                </div>
                                            </div>

                                            {/* Prompt Area */}
                                            <div className="space-y-4">
                                                <div className="p-5 bg-slate-900/80 rounded-xl border border-indigo-500/30 h-full flex flex-col">
                                                    <label className="text-sm font-bold text-indigo-300 flex items-center gap-2 mb-2">
                                                        <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
                                                        Mô tả chi tiết (Prompt)
                                                    </label>
                                                    <textarea 
                                                        value={customPrompt}
                                                        onChange={(e) => setCustomPrompt(e.target.value)}
                                                        placeholder={isExtractingPrompt ? "Đang phân tích ảnh mẫu..." : "Kết quả phân tích từ ảnh mẫu sẽ hiện ở đây hoặc bạn có thể nhập mô tả style..."}
                                                        className="flex-grow w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none min-h-[120px]"
                                                        disabled={isExtractingPrompt}
                                                    />
                                                    <div className="flex items-center justify-end gap-2 mt-2">
                                                        <select 
                                                            value={translateLang} 
                                                            onChange={(e) => setTranslateLang(e.target.value)}
                                                            className="bg-slate-800 border border-slate-700 text-xs text-gray-300 rounded px-2 py-1 outline-none focus:border-indigo-500"
                                                        >
                                                            {TRANSLATION_LANGUAGES.map(lang => (
                                                                <option key={lang.code} value={lang.code}>{lang.name}</option>
                                                            ))}
                                                        </select>
                                                        <button 
                                                            onClick={handleTranslatePrompt}
                                                            disabled={isTranslating || !customPrompt}
                                                            className="flex items-center gap-1 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-xs font-medium text-white rounded transition-colors disabled:opacity-50"
                                                        >
                                                            <GlobeAltIcon className={`h-3 w-3 ${isTranslating ? 'animate-spin' : ''}`} />
                                                            {isTranslating ? 'Đang dịch...' : 'Dịch'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Navigation Button for Step 1 Mimic */}
                                            <div className="flex justify-end mt-4">
                                                <button 
                                                    onClick={() => setStep(2)}
                                                    disabled={!uploadedImage || !customPrompt}
                                                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    Tiếp tục <ArrowRightIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}


                                {selectedConcept && editorMode === 'manual' && (
                                    <div className="p-5 bg-slate-900/80 rounded-xl border border-indigo-500/30 animate-fadeIn relative overflow-hidden group mt-4">
                                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                                            <SparklesIcon className="h-20 w-20 text-indigo-500" />
                                        </div>
                                        <div className="flex justify-between items-end mb-2 relative z-10">
                                            <label className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                                                <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
                                                Mô tả chi tiết (Prompt)
                                            </label>
                                            {editorMode === 'manual' && (
                                                <button 
                                                    onClick={handleSuggestPrompt}
                                                    disabled={isSuggestingPrompt || !selectedTheme || !selectedConcept}
                                                    className="text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity flex items-center gap-1 disabled:opacity-50 shadow-md transform hover:scale-105"
                                                >
                                                    <SparklesIcon className={`h-3 w-3 ${isSuggestingPrompt ? 'animate-spin' : ''}`} />
                                                    {isSuggestingPrompt ? 'Đang viết...' : '✨ Gợi ý Prompt (AI)'}
                                                </button>
                                            )}
                                        </div>
                                        <div className="relative z-10">
                                            <textarea 
                                                value={customPrompt}
                                                onChange={(e) => setCustomPrompt(e.target.value)}
                                                placeholder="VD: Tạo dáng ngồi ghế sofa, cầm ly rượu vang, ánh sáng ấm áp, thần thái sang trọng..."
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                                                rows={4}
                                            />
                                            <div className="flex items-center justify-end gap-2 mt-2">
                                                <select 
                                                    value={translateLang} 
                                                    onChange={(e) => setTranslateLang(e.target.value)}
                                                    className="bg-slate-800 border border-slate-700 text-xs text-gray-300 rounded px-2 py-1 outline-none focus:border-indigo-500"
                                                >
                                                    {TRANSLATION_LANGUAGES.map(lang => (
                                                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                                                    ))}
                                                </select>
                                                <button 
                                                    onClick={handleTranslatePrompt}
                                                    disabled={isTranslating || !customPrompt}
                                                    className="flex items-center gap-1 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-xs font-medium text-white rounded transition-colors disabled:opacity-50"
                                                >
                                                    <GlobeAltIcon className={`h-3 w-3 ${isTranslating ? 'animate-spin' : ''}`} />
                                                    {isTranslating ? 'Đang dịch...' : 'Dịch'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 2 && editorMode === 'manual' && (
                                    <div className="animate-fadeIn space-y-6">
                                        <div className="text-center">
                                            <h3 className="text-2xl font-bold text-white">AI Style Suggestion</h3>
                                            <p className="text-slate-400">Phong cách được đề xuất cho concept <strong className="text-indigo-400">{selectedConcept}</strong></p>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                            {STYLES.filter(s => s.type === 'suggested').map((style, idx) => {
                                                const isSelected = selectedStyle === style.name;
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleStyleSelect(style.name)}
                                                        className={`group relative aspect-video rounded-xl overflow-hidden border-2 transition-all duration-300
                                                            ${isSelected
                                                                ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-2xl scale-[1.02] bg-slate-800'
                                                                : 'border-slate-700 bg-slate-800 hover:border-indigo-400 hover:shadow-lg opacity-80 hover:opacity-100'
                                                            }
                                                        `}
                                                    >
                                                         {/* Checkmark Icon */}
                                                         {isSelected && (
                                                            <div className="absolute top-3 right-3 z-20 bg-indigo-600 text-white rounded-full p-1 shadow-lg transform transition-transform scale-100">
                                                                <CheckIcon className="h-4 w-4" />
                                                            </div>
                                                        )}
                                                        
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                                                            <div className="text-left relative z-10">
                                                                <p className={`font-bold text-lg transition-colors ${isSelected ? 'text-indigo-300' : 'text-white group-hover:text-indigo-300'}`}>{style.name}</p>
                                                                <p className="text-xs text-slate-400">{isSelected ? 'Đang chọn' : 'Nhấn để chọn'}</p>
                                                            </div>
                                                        </div>
                                                        <div className={`absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 z-0`}></div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Show All Styles */}
                                        <div className="space-y-4">
                                            <button 
                                                onClick={() => setShowAllStyles(!showAllStyles)}
                                                className="text-slate-400 hover:text-white text-sm font-medium flex items-center justify-center gap-2 mx-auto"
                                            >
                                                {showAllStyles ? 'Thu gọn' : 'Xem thêm Style khác'} <ChevronRightIcon className={`h-4 w-4 transition-transform ${showAllStyles ? 'rotate-90' : ''}`} />
                                            </button>

                                            {showAllStyles && (
                                                <div className="space-y-6 animate-fadeIn bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                                    {/* Group styles by category if desired, or flat list */}
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                                        {STYLES.filter(s => s.type === 'all').map((style, idx) => {
                                                            const isSelected = selectedStyle === style.name;
                                                            return (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => handleStyleSelect(style.name)}
                                                                    className={`py-2 px-3 rounded-lg text-xs transition-colors text-left border flex items-center justify-between
                                                                        ${isSelected
                                                                            ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow-md'
                                                                            : 'bg-slate-800 text-gray-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                                                                        }
                                                                    `}
                                                                >
                                                                    <span>{style.name}</span>
                                                                    {isSelected && <CheckIcon className="h-3 w-3" />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Navigation Buttons for Step 2 Manual */}
                                        <div className="flex justify-between mt-8 border-t border-slate-800 pt-6">
                                            <button 
                                                onClick={() => setStep(1)}
                                                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors border border-slate-700 flex items-center gap-2"
                                            >
                                                <ArrowLeftIcon className="h-5 w-5" /> Quay lại
                                            </button>
                                            <button 
                                                onClick={() => setStep(3)}
                                                disabled={!selectedStyle}
                                                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                Tiếp tục <ArrowRightIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {((step === 3 && editorMode === 'manual') || (step === 2 && editorMode === 'mimic')) && (
                                    <div className="space-y-6 animate-fadeIn h-full flex flex-col">
                                         
                                         {/* Back Button for Studio View */}
                                         <div className="flex justify-start">
                                            <button 
                                                onClick={() => setStep(editorMode === 'manual' ? 2 : 1)}
                                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 font-semibold rounded-lg transition-colors border border-slate-700 flex items-center gap-2 text-xs"
                                            >
                                                <ArrowLeftIcon className="h-4 w-4" /> Quay lại bước trước
                                            </button>
                                         </div>

                                         {/* Retouch Controls */}
                                         <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-6">
                                            <div className="flex items-center gap-2 mb-2 border-b border-slate-800 pb-2">
                                                <AdjustmentsHorizontalIcon className="h-5 w-5 text-indigo-500" />
                                                <h3 className="text-lg font-bold text-white">Tinh chỉnh (Retouch)</h3>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Left Column */}
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-slate-400 uppercase">1. Ánh sáng</label>
                                                        <select 
                                                            value={retouch.lighting} 
                                                            onChange={e => setRetouch(p => ({...p, lighting: e.target.value}))}
                                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-indigo-500"
                                                        >
                                                            {LIGHTING_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-slate-400 uppercase">2. Tông màu</label>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {TONE_OPTIONS.slice(0,3).map(o => (
                                                                <button 
                                                                    key={o} 
                                                                    onClick={() => setRetouch(p => ({...p, tone: o}))}
                                                                    className={`py-1.5 px-1 rounded text-[10px] font-medium border transition-all ${retouch.tone === o ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-gray-400 hover:text-white'}`}
                                                                >
                                                                    {o.split('(')[0]}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-slate-400 uppercase">3. Makeup Auto</label>
                                                        <select 
                                                            value={retouch.makeup} 
                                                            onChange={e => setRetouch(p => ({...p, makeup: e.target.value}))}
                                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-indigo-500"
                                                        >
                                                            {MAKEUP_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Right Column */}
                                                <div className="space-y-4">
                                                     <div className="space-y-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                                        <label className="text-xs font-bold text-slate-400 uppercase">4. Retouch Mặt & Da</label>
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between text-[10px] text-slate-400"><span>Mịn da</span><span>{retouch.skinSmooth}%</span></div>
                                                            <input type="range" min="0" max="100" value={retouch.skinSmooth} onChange={e => setRetouch(p => ({...p, skinSmooth: Number(e.target.value)}))} className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-pink-500" />
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-slate-300">Xóa mụn/thâm</span>
                                                            <button onClick={() => setRetouch(p => ({...p, acneRemoval: !p.acneRemoval}))} className={`w-8 h-4 rounded-full transition-colors relative ${retouch.acneRemoval ? 'bg-green-500' : 'bg-slate-600'}`}>
                                                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${retouch.acneRemoval ? 'translate-x-4' : ''}`}></div>
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-slate-300">Thon gọn mặt</span>
                                                            <button onClick={() => setRetouch(p => ({...p, faceSlim: !p.faceSlim}))} className={`w-8 h-4 rounded-full transition-colors relative ${retouch.faceSlim ? 'bg-green-500' : 'bg-slate-600'}`}>
                                                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${retouch.faceSlim ? 'translate-x-4' : ''}`}></div>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-slate-400 uppercase">5. Background AI</label>
                                                        <select 
                                                            value={retouch.background} 
                                                            onChange={e => setRetouch(p => ({...p, background: e.target.value}))}
                                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-indigo-500"
                                                        >
                                                            {BACKGROUND_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Quantity & Generate */}
                                            <div className="mt-6 pt-4 border-t border-slate-800 space-y-4">
                                                 <div className="flex items-center justify-between">
                                                     <div className="space-y-1">
                                                        <label className="text-xs font-bold text-slate-400 uppercase block">Số lượng ảnh</label>
                                                        <div className="flex bg-slate-800 rounded-lg p-1 w-fit">
                                                            {[1, 2, 3, 4].map(num => (
                                                                <button 
                                                                    key={num}
                                                                    onClick={() => setImageQuantity(num as ImageQuantity)}
                                                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${imageQuantity === num ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                                                >
                                                                    {num}
                                                                </button>
                                                            ))}
                                                        </div>
                                                     </div>
                                                     <div className="text-right">
                                                        <span className="text-slate-400 text-sm">Chi phí:</span>
                                                        <span className="font-bold text-white text-lg flex items-center gap-1 justify-end"><SparklesIcon className="h-4 w-4 text-yellow-400"/> {totalCost} Credit</span>
                                                     </div>
                                                 </div>
                                                
                                                <button 
                                                    onClick={handleGenerate}
                                                    disabled={isProcessing}
                                                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] disabled:opacity-50"
                                                >
                                                    {isProcessing ? (
                                                        <>
                                                            <ArrowPathIcon className="h-5 w-5 animate-spin" /> {progressMessage || 'Đang xử lý...'}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CameraIcon className="h-5 w-5" /> Tạo {imageQuantity} Ảnh Studio
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                         </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        </>
                    )}
                </div>
            </main>

            {/* Control Bar (Footer) */}
            {resultImages.length === 0 && editorMode === 'manual' && (
                <div className="h-16 bg-slate-900 border-t border-slate-800 flex justify-center items-center gap-8 shrink-0 relative z-20">
                    <button 
                        onClick={() => setStep(1)}
                        className={`flex flex-col items-center gap-1 transition-colors ${step === 1 ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <SparklesIcon className="h-5 w-5" />
                        <span className="text-[10px] font-bold uppercase">Chủ đề & Concept</span>
                    </button>
                    <div className="w-8 h-px bg-slate-700"></div>
                    <button 
                        onClick={() => { if (uploadedImage && selectedConcept) setStep(2); }}
                        disabled={!uploadedImage || !selectedConcept}
                        className={`flex flex-col items-center gap-1 transition-colors ${step === 2 ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300 disabled:opacity-30'}`}
                    >
                        <PaintBrushIcon className="h-5 w-5" />
                        <span className="text-[10px] font-bold uppercase">Style</span>
                    </button>
                    <div className="w-8 h-px bg-slate-700"></div>
                    <button 
                        onClick={() => { if (uploadedImage && selectedStyle) setStep(3); }}
                        disabled={!selectedStyle}
                        className={`flex flex-col items-center gap-1 transition-colors ${step === 3 ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300 disabled:opacity-30'}`}
                    >
                        <FaceSmileIcon className="h-5 w-5" />
                        <span className="text-[10px] font-bold uppercase">Makeup & Retouch</span>
                    </button>
                </div>
            )}
            {resultImages.length === 0 && editorMode === 'mimic' && (
                <div className="h-16 bg-slate-900 border-t border-slate-800 flex justify-center items-center gap-8 shrink-0 relative z-20">
                    <button 
                        onClick={() => setStep(1)}
                        className={`flex flex-col items-center gap-1 transition-colors ${step === 1 ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <DocumentMagnifyingGlassIcon className="h-5 w-5" />
                        <span className="text-[10px] font-bold uppercase">Ảnh Mẫu & Prompt</span>
                    </button>
                    <div className="w-8 h-px bg-slate-700"></div>
                     <button 
                        onClick={() => { if (uploadedImage && customPrompt) setStep(2); }}
                        disabled={!uploadedImage || !customPrompt}
                        className={`flex flex-col items-center gap-1 transition-colors ${step === 2 ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300 disabled:opacity-30'}`}
                    >
                        <CameraIcon className="h-5 w-5" />
                        <span className="text-[10px] font-bold uppercase">Studio</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default PortraitEditor;
