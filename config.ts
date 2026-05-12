
import { SystemSettings, FundSettings, IntegrationType, LeaderboardMetric, AchievementMetric } from './features/settings/types';
import { UserSettings, MembershipTier } from './features/users/types';
import { Permission, Role } from './features/roles/types';

// CẢNH BÁO BẢO MẬT: Trong môi trường Production, không bao giờ lưu credentials trong mã nguồn Frontend.
// Đây là file config cho bản Demo.

export const IS_DEMO_MODE = typeof window !== 'undefined' && window.location.hostname.includes('-dev-');

export const ADMIN_CREDENTIALS = {
    email: 'admin@example.com',
    // Mật khẩu đã được loại bỏ khỏi file config công khai.
    // Trong thực tế, việc xác thực phải được thực hiện qua API Backend.
    // Đối với bản Demo này, chúng ta sẽ giả lập check password trong AuthProvider hoặc nhập bất kỳ để test.
    password: process.env.ADMIN_PASSWORD || 'adminpassword', // Sử dụng biến môi trường nếu có
};

export const ALL_PERMISSIONS = [
  { id: Permission.USER_VIEW, name: 'Xem Người dùng', description: 'Xem danh sách người dùng' },
  { id: Permission.USER_CREATE, name: 'Tạo Người dùng', description: 'Tạo người dùng mới' },
  { id: Permission.USER_EDIT, name: 'Sửa Người dùng', description: 'Chỉnh sửa thông tin người dùng' },
  { id: Permission.USER_DELETE, name: 'Xóa Người dùng', description: 'Xóa người dùng' },
  { id: Permission.USER_MANAGE_ROLES, name: 'Quản lý Vai trò', description: 'Cấp quyền và quản lý vai trò' },
  { id: Permission.FINANCE_VIEW_ALL, name: 'Xem Tài chính', description: 'Xem tất cả giao dịch' },
  { id: Permission.FINANCE_MANAGE_WITHDRAWALS, name: 'Quản lý Rút lợi nhuận', description: 'Duyệt/Từ chối yêu cầu rút lợi nhuận' },
  { id: Permission.FINANCE_EXPORT, name: 'Xuất Báo cáo', description: 'Xuất dữ liệu tài chính' },
  { id: Permission.FUNDS_VIEW, name: 'Xem Quỹ', description: 'Xem trạng thái các quỹ' },
  { id: Permission.FUNDS_MANAGE_PAYOUTS, name: 'Chi trả Quỹ', description: 'Thực hiện chi trả từ quỹ' },
  { id: Permission.FUNDS_MANAGE_SETTINGS, name: 'Cài đặt Quỹ', description: 'Cấu hình tham số quỹ' },
  { id: Permission.SETTINGS_FEES_COMMISSIONS_VIEW, name: 'Xem Phí & Chiết khấu', description: 'Xem cấu hình phí và chiết khấu' },
  { id: Permission.SETTINGS_FEES_COMMISSIONS_EDIT, name: 'Sửa Phí & Chiết khấu', description: 'Chỉnh sửa phí và chiết khấu' },
  { id: Permission.SETTINGS_SYSTEM_VIEW, name: 'Xem Cài đặt HT', description: 'Xem cài đặt chung' },
  { id: Permission.SETTINGS_SYSTEM_EDIT, name: 'Sửa Cài đặt HT', description: 'Chỉnh sửa cài đặt chung' },
  { id: Permission.SETTINGS_ACHIEVEMENTS_MANAGE, name: 'Quản lý Thành tích', description: 'Thêm/Sửa/Xóa thành tích' },
  { id: Permission.SUPPORT_VIEW, name: 'Xem Hỗ trợ', description: 'Xem yêu cầu hỗ trợ' },
  { id: Permission.SUPPORT_MANAGE_TICKETS, name: 'Quản lý Hỗ trợ', description: 'Trả lời/Đóng yêu cầu hỗ trợ' },
];

export const MOCK_ROLES: Role[] = IS_DEMO_MODE ? [
    {
        id: 'role_manager',
        name: 'Manager',
        description: 'Quản lý vận hành chung',
        permissions: [
            Permission.USER_VIEW, Permission.USER_EDIT, 
            Permission.FINANCE_VIEW_ALL, 
            Permission.SUPPORT_VIEW, Permission.SUPPORT_MANAGE_TICKETS
        ]
    },
    {
        id: 'role_accountant',
        name: 'Accountant',
        description: 'Kế toán viên',
        permissions: [
            Permission.FINANCE_VIEW_ALL, Permission.FINANCE_MANAGE_WITHDRAWALS, Permission.FINANCE_EXPORT,
            Permission.FUNDS_VIEW, Permission.FUNDS_MANAGE_PAYOUTS
        ]
    }
] : [];

export const MOCK_FUND_SETTINGS: FundSettings = {
    leaderBonusAllocationPercentage: 5,
    supportParticipationAllocationPercentage: 5, // Mặc định khớp với profitSettings.participation.supportFund
    supportFundSettings: {
        [MembershipTier.Starter]: { allocationPercentage: 5, totalPayoutLimit: 50000 },
        [MembershipTier.Pro]: { allocationPercentage: 5, totalPayoutLimit: 500000 },
        [MembershipTier.Master]: { allocationPercentage: 5, totalPayoutLimit: 5000000 },
    },
};

export const MOCK_USER_SETTINGS: UserSettings = {
    autoRenewMaintenance: true,
    notifications: {
        newCommission: true,
        withdrawalStatusChange: true,
        networkActivity: true,
    }
};

export const MOCK_SYSTEM_SETTINGS: SystemSettings = {
    systemName: 'Affiliate SaaS AI',
    isMaintenanceMode: false,
    maintenanceEndTime: null,
    adminEmail: 'admin@example.com',
    participationFee: 100000,
    maintenanceFee: 50000,
    proParticipationFee: 1000000,
    proMaintenanceFee: 500000,
    masterParticipationFee: 10000000,
    masterMaintenanceFee: 5000000,
    penaltyFeeRate: 10,
    commissionSettings: {
        participationCommissions: [
            { level: 'F1', percentage: 40 },
            { level: 'F2', percentage: 20 },
        ],
        maintenanceCommissions: [
            { level: 'F1', percentage: 40 },
            { level: 'F2', percentage: 20 },
        ],
    },
    minWithdrawal: 100000,
    profitSettings: {
        leaderFundAutoPayout: false,
        leaderFundPayoutDay: 1,
        participation: {
            adminWallet: 17,
            vat: 10,
            corporateTax: 3,
            leaderBonusFund: 5,
            supportFund: 5,
        },
        maintenance: {
            adminWallet: 17,
            vat: 10,
            corporateTax: 3,
            leaderBonusFund: 5,
            supportFund: 5,
        },
    },
    levelSettings: [
        { 
            level: 1, 
            name: 'Bronze Partner', 
            subTitle: 'Đối tác Đồng', 
            requiredGroupRevenue: 30000000, 
            rewardPercentage: 0.3, 
            honorAward: 'Bằng khen điện tử',
            f1Requirement: 3 
        },
        { 
            level: 2, 
            name: 'Silver Leader', 
            subTitle: 'Trưởng nhánh Bạc', 
            requiredGroupRevenue: 100000000, 
            rewardPercentage: 0.6, 
            honorAward: 'Thưởng tăng trưởng 2.000.000đ',
            branchRequirements: [{ targetLevel: 1, count: 2 }] 
        },
        { 
            level: 3, 
            name: 'Gold Manager', 
            subTitle: 'Quản lý Vàng', 
            requiredGroupRevenue: 500000000, 
            rewardPercentage: 0.9, 
            honorAward: 'Thưởng tăng trưởng 10.000.000đ',
            branchRequirements: [{ targetLevel: 2, count: 2 }] 
        },
        { 
            level: 4, 
            name: 'Diamond Director', 
            subTitle: 'Giám đốc Kim cương', 
            requiredGroupRevenue: 2000000000, 
            rewardPercentage: 1.2, 
            honorAward: 'Chuyến du lịch công tác cao cấp',
            branchRequirements: [{ targetLevel: 3, count: 2 }] 
        },
        { 
            level: 5, 
            name: 'Crown Ambassador', 
            subTitle: 'Đại sứ Vương miện', 
            requiredGroupRevenue: 10000000000, 
            rewardPercentage: 1.5, 
            honorAward: 'Vật phẩm vinh danh giá trị lớn',
            branchRequirements: [{ targetLevel: 4, count: 2 }] 
        },
    ],
    leaderMilestoneBonuses: [
        { id: 'mb1', networkSize: 100, bonusAmount: 500000 },
        { id: 'mb2', networkSize: 500, bonusAmount: 3000000 },
        { id: 'mb3', networkSize: 1000, bonusAmount: 10000000 },
    ],
    leaderAchievements: [
        { id: 'ach1', name: 'Tuyển dụng Xuất sắc', description: 'Đạt 10 F1 trực tiếp', icon: 'UserGroupIcon', rule: { metric: AchievementMetric.F1Count, target: 10 }, weight: 1 },
        { id: 'ach2', name: 'Mạng lưới Vững mạnh', description: 'Quy mô mạng lưới đạt 100 thành viên', icon: 'UsersIcon', rule: { metric: AchievementMetric.NetworkSize, target: 100 }, weight: 2 },
    ],
    referralTools: [
        { id: 'tool1', title: 'Bài đăng Facebook', content: 'Tham gia giải pháp kinh doanh số dựa trên tài nguyên AI cùng {userName}. Xem thêm tại: {referralLink}', icon: 'FacebookIcon', color: '#1877F2' },
        { id: 'tool2', title: 'Tin nhắn Zalo', content: 'Chào bạn, dự án Affiliate SaaS AI này đang cung cấp các công cụ AI rất mạnh mẽ. Tìm hiểu giải pháp tại đây: {referralLink}', icon: 'ZaloIcon', color: '#0068FF' },
    ],
    tierSettings: {
        [MembershipTier.Starter]: { 
            name: 'Cơ bản', 
            visible: true,
            credits: 1000,
            benefits: [
                'Trải nghiệm các bộ công cụ AI tiêu chuẩn',
                'Mở khóa hệ thống chiết khấu 2 tầng',
                'Báo cáo và quản lý mạng lưới đối tác'
            ]
        },
        [MembershipTier.Pro]: { 
            name: 'Chuyên nghiệp', 
            visible: true,
            credits: 10000,
            benefits: [
                'Truy cập không giới hạn Model AI cao cấp',
                'Trọn bộ tài liệu & kịch bản Marketing',
                'Huy hiệu đối tác Pro & Hỗ trợ ưu tiên'
            ]
        },
        [MembershipTier.Master]: { 
            name: 'Cao cấp', 
            visible: true,
            credits: 100000,
            benefits: [
                'Mở khóa toàn bộ đặc quyền nền tảng',
                'Tham gia cộng đồng Leader chiến lược',
                'Kênh hỗ trợ kỹ thuật trực tiếp 1-kèm-1'
            ]
        },
    },
    leaderboardSettings: {
        title: 'Bảng xếp hạng <span class="inline-block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">Doanh thu</span>',
        description: 'Top thành viên có thu nhập cao nhất tháng này.',
        metric: LeaderboardMetric.TotalEarnings,
        timeframe: 'monthly',
    },
    useLeaderboardMockData: IS_DEMO_MODE,
    leaderboardMockData: {
        title: 'Vinh danh <span class="inline-block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">Leader Tháng 8</span>',
        description: 'Chúc mừng các Leader xuất sắc nhất!',
        metric: LeaderboardMetric.TotalEarnings,
        leaders: [
            { id: 'mock1', name: 'Nguyễn Văn A', avatar: 'https://picsum.photos/id/1011/100', score: 150000000 },
            { id: 'mock2', name: 'Trần Thị B', avatar: 'https://picsum.photos/id/1012/100', score: 120000000 },
            { id: 'mock3', name: 'Lê Văn C', avatar: 'https://picsum.photos/id/1013/100', score: 90000000 },
            { id: 'mock4', name: 'Phạm Thị D', avatar: 'https://picsum.photos/id/1014/100', score: 85000000 },
            { id: 'mock5', name: 'Hoàng Văn E', avatar: 'https://picsum.photos/id/1015/100', score: 70000000 },
        ]
    },
    // DEFAULT PAYMENT CONFIG
    adminPayment: {
        bank: {
            bankName: 'MB Bank',
            bankShortName: 'MB',
            accountNumber: '123456789',
            accountOwner: 'NGUYEN VAN ADMIN',
            enabled: true
        },
        wallets: [
            {
                id: 'momo_main',
                type: 'momo',
                name: 'Momo Chính',
                phoneNumber: '0901234567',
                ownerName: 'NGUYEN VAN ADMIN',
                enabled: true
            },
             {
                id: 'zalo_main',
                type: 'zalopay',
                name: 'ZaloPay',
                phoneNumber: '0901234567',
                ownerName: 'NGUYEN VAN ADMIN',
                enabled: true
            }
        ]
    },
    legalContent: {
        tos: `Chào mừng bạn đến với Affiliate SaaS AI!
 
 Bằng cách sử dụng nền tảng của chúng tôi, bạn đồng ý tuân thủ các điều khoản sau:
 - Bản chất dịch vụ: Đây là nền tảng cung cấp dịch vụ phần mềm AI (SaaS). Người dùng thanh toán để sử dụng các tài nguyên công nghệ AI chuyên nghiệp theo gói thuê bao.
 - Tiếp thị liên kết: Hệ thống áp dụng mô hình Affiliate 2 tầng minh bạch. Đối tác có thể nhận chiết khấu dịch vụ bằng việc giới thiệu khách hàng thực tế sử dụng nền tảng.
 - Đăng ký: Đối tác phải cung cấp thông tin chính xác và tự chịu trách nhiệm bảo mật tài khoản cá nhân.
 - Hoạt động: Nghiêm cấm các hành vi gian lận, trục lợi chính sách hoặc gây ảnh hưởng đến danh tiếng hệ thống.
 - Nghĩa vụ Thuế: Mọi khoản chiết khấu/lợi nhuận thực nhận sẽ được khấu trừ 10% Thuế Thu nhập Cá nhân (TNCN) để nộp vào ngân sách Nhà nước theo quy định hiện hành.
 - Hoàn phí: Các gói dịch vụ đã kích hoạt tương ứng với tài nguyên công nghệ đã được cấp phát (AI Credits) và không hỗ trợ hoàn phí.`,
        privacy: `Chúng tôi cam kết bảo vệ thông tin cá nhân của người dùng:
 
 - Thông tin thu thập: Tên, email, số điện thoại và các dữ liệu cần thiết để xác thực giao dịch tài chính.
 - Mục đích sử dụng: Quản lý tài khoản, tính toán chiết khấu kinh doanh, thực hiện báo cáo thuế và hỗ trợ kỹ thuật.
 - Tính bảo mật: Dữ liệu được bảo vệ bằng các công nghệ mã hóa hiện đại, đảm bảo an toàn thông tin tối đa.
 - Cam kết chia sẻ: Chúng tôi tuyệt đối không cung cấp thông tin người dùng cho bên thứ ba vì mục đích thương mại.`,
        systemPolicy: `<h3>Chính sách vận hành và Gói thuê bao</h3>
 <p>- Gói dịch vụ AI: Cung cấp dưới dạng thuê bao định kỳ. Khi kích hoạt hoặc gia hạn, đối tác sẽ nhận được lượt sử dụng AI (Credits) tương ứng với giá trị gói.</p>
 <p>- Khấu trừ Thuế: Toàn bộ lệnh rút lợi nhuận sẽ được hệ thống tự động khấu trừ 10% Thuế TNCN để thực hiện nghĩa vụ với Nhà nước.</p>
 
 <h4>Bảng giá Gói Thuê bao & Tài nguyên AI</h4>
 <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
   <thead>
     <tr style="background-color: #f1f5f9;">
       <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left;">Giải pháp dịch vụ</th>
       <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: right;">Phí thuê bao</th>
       <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: right;">Tài nguyên công nghệ (Credits)</th>
     </tr>
   </thead>
   <tbody>
     <tr>
       <td style="border: 1px solid #e2e8f0; padding: 10px;">Starter (Cơ bản)</td>
       <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: right;">100,000đ</td>
       <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: right;">1,000 P</td>
     </tr>
     <tr style="background-color: #f8fafc;">
       <td style="border: 1px solid #e2e8f0; padding: 10px;">Pro (Chuyên nghiệp)</td>
       <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: right;">1,000,000đ</td>
       <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: right;">10,000 P</td>
     </tr>
     <tr>
       <td style="border: 1px solid #e2e8f0; padding: 10px;">Master (Cao cấp)</td>
       <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: right;">10,000,000đ</td>
       <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: right;">100,000 P</td>
     </tr>
   </tbody>
 </table>
 
 <p style="margin-top: 15px;">- Duy trì dịch vụ: Tài khoản cần ở trạng thái Active để đảm bảo các quyền lợi về tài nguyên AI và chiết khấu liên kết.</p>
 <p>- Chính sách bảo lưu: Quyền lợi chiết khấu sẽ được bảo lưu trong thời gian ân hạn (7 ngày) kể từ khi gói dịch vụ hết hạn.</p>`
    },
    integrationTools: [
         {
            id: 'tool_menu_designer',
            icon: 'DocumentTextIcon',
            title: "Thiết kế Menu AI",
            description: "Scan danh sách món ăn từ ảnh và tạo thiết kế menu chuyên nghiệp with nhiều phong cách.",
            enabled: true,
            type: IntegrationType.GeminiAi,
            creditCost: 35,
            promptTemplate: 'Menu Design',
            pricingParams: { upscaleMultiplier: 1.5 }
        },
         {
            id: 'tool_interior_design',
            icon: 'HomeModernIcon',
            title: "Kiến trúc sư Nội thất AI",
            description: "Thiết kế lại không gian, dựng mô hình 3D, tạo bản vẽ kỹ thuật và báo giá dự toán chỉ từ một bức ảnh.",
            enabled: true,
            type: IntegrationType.GeminiAi,
            creditCost: 50,
            promptTemplate: 'Interior Design',
            pricingParams: { upscaleMultiplier: 2 }
        },
         {
            id: 'tool_fashion_designer',
            icon: 'ScissorsIcon',
            title: "Thiết Kế Thời Trang AI",
            description: "Bộ công cụ toàn diện: Sáng tạo mẫu, Phối đồ, Tách lớp 3D và Tạo bản vẽ kỹ thuật (Techpack).",
            enabled: true,
            type: IntegrationType.GeminiAi,
            creditCost: 40,
            promptTemplate: 'Fashion Design',
            pricingParams: { upscaleMultiplier: 1.8 }
        },
        {
            id: 'tool_image_mixer',
            icon: 'UserGroupIcon',
            title: "Ghép Ảnh Đa Năng (Mixer)",
            description: "Tự động tách chủ thể (người/vật) từ nhiều ảnh và lồng ghép vào bối cảnh mới một cách tự nhiên.",
            enabled: true,
            type: IntegrationType.GeminiAi,
            creditCost: 35,
            promptTemplate: 'Image Mixing',
        },
        {
            id: 'tool_content_writer',
            icon: 'PencilSquareIcon',
            title: "Trợ lý Content AI",
            description: "Viết bài quảng cáo, kịch bản video, email marketing tự động. Hỗ trợ đa ngôn ngữ và văn phong.",
            enabled: true,
            type: IntegrationType.GeminiAi,
            creditCost: 5,
            promptTemplate: 'Marketing Content',
            pricingParams: { costPer100Chars: 10 }
        },
        {
            id: 'tool_image_gen_gemini',
            icon: 'PhotoIcon',
            title: "Tạo Ảnh AI (Gemini)",
            description: "Biến văn bản thành hình ảnh chất lượng cao. Hỗ trợ nhiều phong cách: Anime, 3D, Realistic.",
            enabled: true,
            type: IntegrationType.ImageApiCall,
            creditCost: 15,
            promptTemplate: 'Image Generation',
            pricingParams: { upscaleMultiplier: 1.2, highQualityMultiplier: 2 }
        },
        {
            id: 'tool_video_editor',
            icon: 'FilmIcon',
            title: "Biên tập Video Pro",
            description: "Cắt ghép, thêm hiệu ứng, phụ đề và nhạc nền cho video. Giao diện timeline chuyên nghiệp.",
            enabled: true,
            type: IntegrationType.Link,
            creditCost: 0, 
            promptTemplate: 'Video Editor',
        },
         {
            id: 'tool_vectorizer',
            icon: 'CubeIcon',
            title: "AI Vectorizer",
            description: "Chuyển đổi ảnh bitmap (JPG/PNG) sang vector (SVG) sắc nét. Lý tưởng cho logo và in ấn.",
            enabled: true,
            type: IntegrationType.GeminiAi,
            creditCost: 10,
            promptTemplate: 'Vector Conversion',
        },
        {
            id: 'tool_hairstyle_pro',
            icon: 'ScissorsIcon',
            title: "Thử Kiểu Tóc AI Pro",
            description: "Ướm thử hàng trăm kiểu tóc nam/nữ thời thượng lên ảnh của bạn. Thay đổi màu tóc và kiểu dáng.",
            enabled: true,
            type: IntegrationType.GeminiAi,
            creditCost: 20,
            promptTemplate: 'Hairstyle Try-on',
        },
        {
            id: 'tool_photo_restore',
            icon: 'SparklesIcon',
            title: "Khôi Phục Ảnh Cũ",
            description: "Làm nét, khử nhiễu, tô màu cho ảnh đen trắng và phục hồi ảnh cũ bị hư hại.",
            enabled: true,
            type: IntegrationType.GeminiAi,
            creditCost: 15,
            promptTemplate: 'Photo Restoration',
            pricingParams: { upscaleMultiplier: 1.5 }
        },
        {
            id: 'tool_bg_remover',
            icon: 'EraserIcon',
            title: "Tách Nền Thông Minh",
            description: "Tách nền ảnh tự động với độ chính xác cao. Hỗ trợ thay nền trắng/đen hoặc trong suốt.",
            enabled: true,
            type: IntegrationType.GeminiAi,
            creditCost: 5,
            promptTemplate: 'Background Removal',
        },
        {
            id: 'tool_ai_video_gen',
            icon: 'VideoIcon',
            title: "Tạo Video từ Ảnh/Chữ (Veo)",
            description: "Sử dụng mô hình Google Veo để tạo video ngắn từ văn bản hoặc hình ảnh tĩnh.",
            enabled: true,
            type: IntegrationType.GeminiAi,
            creditCost: 50,
            promptTemplate: 'Video Generation',
            pricingParams: { videoSecondsMultiplier: 0.5 }
        },
        {
            id: 'tool_face_swap',
            icon: 'FaceSmileIcon',
            title: "Ghép Mặt AI (Face Swap)",
            description: "Ghép khuôn mặt vào ảnh mẫu hoặc video. Hỗ trợ ghép nhiều mặt cùng lúc.",
            enabled: true,
            type: IntegrationType.GeminiAi,
            creditCost: 20,
            promptTemplate: 'Face Swap',
        },
        {
            id: 'tool_ad_creator',
            icon: 'PresentationChartLineIcon',
            title: "Thiết Kế Quảng Cáo AI",
            description: "Tạo banner, poster quảng cáo sản phẩm chuyên nghiệp. Tự động chèn sản phẩm vào bối cảnh.",
            enabled: true,
            type: IntegrationType.GeminiAi,
            creditCost: 25,
            promptTemplate: 'Ad Creative',
            pricingParams: { upscaleMultiplier: 1.5 }
        },
        {
            id: 'tool_fashion_studio',
            icon: 'ShoppingBagIcon',
            title: "Phòng Thử Đồ Ảo (Fashion)",
            description: "Mặc thử quần áo lên người mẫu ảo hoặc ảnh của bạn. Tùy chỉnh form dáng và kích thước.",
            enabled: true,
            type: IntegrationType.GeminiAi,
            creditCost: 30,
            promptTemplate: 'Virtual Try-on',
        },
        {
            id: 'tool_portrait_editor',
            icon: 'CameraIcon',
            title: "Chỉnh Sửa Chân Dung Pro",
            description: "Retouch da, trang điểm, chỉnh ánh sáng và bố cục cho ảnh chân dung chuyên nghiệp.",
            enabled: true,
            type: IntegrationType.GeminiAi,
            creditCost: 15,
            promptTemplate: 'Portrait Editing',
            pricingParams: { upscaleMultiplier: 1.2 }
        },
        {
            id: 'tool_ocr_pro',
            icon: 'DocumentTextIcon',
            title: "OCR Pro - Trích xuất Văn bản",
            description: "Trích xuất văn bản từ ảnh/PDF với độ chính xác cao. Giữ nguyên định dạng, bảng biểu.",
            enabled: true,
            type: IntegrationType.GeminiAi,
            creditCost: 10,
            promptTemplate: 'OCR Extraction',
        },
        {
            id: 'tool_mockup_generator',
            icon: 'CubeIcon',
            title: "Mockup Generator AI",
            description: "Ghép logo/pattern vào sản phẩm thực tế (áo, ly, hộp...). AI tự động bẻ cong, tạo nếp nhăn.",
            enabled: true,
            type: IntegrationType.GeminiAi,
            creditCost: 50,
            promptTemplate: 'Mockup Generation',
        },
    ]
};
