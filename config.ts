
import { SystemSettings, FundSettings, IntegrationType, LeaderboardMetric, AchievementMetric } from './features/settings/types';
import { UserSettings, MembershipTier } from './features/users/types';
import { Permission, Role } from './features/roles/types';

// CẢNH BÁO BẢO MẬT: Trong môi trường Production, không bao giờ lưu credentials trong mã nguồn Frontend.
// Đây là file config cho bản Demo.
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
  { id: Permission.FINANCE_MANAGE_WITHDRAWALS, name: 'Quản lý Rút tiền', description: 'Duyệt/Từ chối rút tiền' },
  { id: Permission.FINANCE_EXPORT, name: 'Xuất Báo cáo', description: 'Xuất dữ liệu tài chính' },
  { id: Permission.FUNDS_VIEW, name: 'Xem Quỹ', description: 'Xem trạng thái các quỹ' },
  { id: Permission.FUNDS_MANAGE_PAYOUTS, name: 'Chi trả Quỹ', description: 'Thực hiện chi trả từ quỹ' },
  { id: Permission.FUNDS_MANAGE_SETTINGS, name: 'Cài đặt Quỹ', description: 'Cấu hình tham số quỹ' },
  { id: Permission.SETTINGS_FEES_COMMISSIONS_VIEW, name: 'Xem Phí & HH', description: 'Xem cấu hình phí và hoa hồng' },
  { id: Permission.SETTINGS_FEES_COMMISSIONS_EDIT, name: 'Sửa Phí & HH', description: 'Chỉnh sửa phí và hoa hồng' },
  { id: Permission.SETTINGS_SYSTEM_VIEW, name: 'Xem Cài đặt HT', description: 'Xem cài đặt chung' },
  { id: Permission.SETTINGS_SYSTEM_EDIT, name: 'Sửa Cài đặt HT', description: 'Chỉnh sửa cài đặt chung' },
  { id: Permission.SETTINGS_ACHIEVEMENTS_MANAGE, name: 'Quản lý Thành tích', description: 'Thêm/Sửa/Xóa thành tích' },
  { id: Permission.SUPPORT_VIEW, name: 'Xem Hỗ trợ', description: 'Xem yêu cầu hỗ trợ' },
  { id: Permission.SUPPORT_MANAGE_TICKETS, name: 'Quản lý Hỗ trợ', description: 'Trả lời/Đóng yêu cầu hỗ trợ' },
];

export const MOCK_ROLES: Role[] = [
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
];

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
    systemName: 'Monetize System',
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
            { level: 'F2', percentage: 16 },
            { level: 'F3', percentage: 12 },
            { level: 'F4', percentage: 8 },
            { level: 'F5', percentage: 4 },
        ],
        maintenanceCommissions: [
            { level: 'F1', percentage: 40 },
            { level: 'F2', percentage: 16 },
            { level: 'F3', percentage: 12 },
            { level: 'F4', percentage: 8 },
            { level: 'F5', percentage: 4 },
        ],
    },
    minWithdrawal: 100000,
    profitSettings: {
        participation: {
            adminWallet: 10,
            leaderBonusFund: 5,
            supportFund: 5,
        },
        maintenance: {
            adminWallet: 10,
            leaderBonusFund: 5,
            supportFund: 5,
        },
    },
    levelSettings: [
        { level: 1, name: 'Bronze (Đồng)', requiredEarnings: 0, bonusAmount: 0, rewardPercentage: 0, branchRequirements: [] },
        { level: 2, name: 'Silver (Bạc)', requiredEarnings: 10000000, bonusAmount: 100000, rewardPercentage: 1, branchRequirements: [{ targetLevel: 1, count: 3 }] },
        { level: 3, name: 'Gold (Vàng)', requiredEarnings: 50000000, bonusAmount: 750000, rewardPercentage: 1.5, branchRequirements: [{ targetLevel: 2, count: 2 }] },
        { level: 4, name: 'Platinum (Bạch kim)', requiredEarnings: 200000000, bonusAmount: 4000000, rewardPercentage: 2, branchRequirements: [{ targetLevel: 3, count: 2 }] },
        { level: 5, name: 'Diamond (Kim cương)', requiredEarnings: 1000000000, bonusAmount: 25000000, rewardPercentage: 2.5, branchRequirements: [{ targetLevel: 4, count: 3 }] },
        { level: 6, name: 'Master (Bậc thầy)', requiredEarnings: 3000000000, bonusAmount: 90000000, rewardPercentage: 3, branchRequirements: [{ targetLevel: 5, count: 3 }] },
        { level: 7, name: 'Legend (Huyền thoại)', requiredEarnings: 10000000000, bonusAmount: 350000000, rewardPercentage: 3.5, branchRequirements: [{ targetLevel: 6, count: 3 }] },
        { level: 8, name: 'Crown (Đại sứ)', requiredEarnings: 30000000000, bonusAmount: 1200000000, rewardPercentage: 4, branchRequirements: [{ targetLevel: 7, count: 4 }] },
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
        { id: 'tool1', title: 'Bài đăng Facebook', content: 'Tham gia ngay hệ thống kiếm tiền thụ động với {userName}. Link: {referralLink}', icon: 'FacebookIcon', color: '#1877F2' },
        { id: 'tool2', title: 'Tin nhắn Zalo', content: 'Chào bạn, mình đang tham gia dự án này rất hay. Thu nhập ổn định. Xem thử nhé: {referralLink}', icon: 'ZaloIcon', color: '#0068FF' },
    ],
    tierSettings: {
        [MembershipTier.Starter]: { name: 'Cơ bản', visible: true },
        [MembershipTier.Pro]: { name: 'Chuyên nghiệp', visible: true },
        [MembershipTier.Master]: { name: 'Cao cấp', visible: true },
    },
    leaderboardSettings: {
        title: 'Bảng xếp hạng <span class="inline-block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">Doanh thu</span>',
        description: 'Top thành viên có thu nhập cao nhất tháng này.',
        metric: LeaderboardMetric.TotalEarnings,
        timeframe: 'monthly',
    },
    useLeaderboardMockData: true,
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
        tos: `Chào mừng bạn đến với Monetize!

Bằng cách sử dụng nền tảng của chúng tôi, bạn đồng ý tuân thủ các điều khoản sau:
- Đăng ký: Bạn phải cung cấp thông tin chính xác và chịu trách nhiệm bảo mật tài khoản.
- Hoạt động: Nghiêm cấm các hành vi gian lận, tấn công hệ thống hoặc tạo tài khoản ảo để trục lợi.
- Thanh toán: Các gói thành viên đã thanh toán thường không được hoàn lại, trừ trường hợp lỗi hệ thống nghiêm trọng.
- Quyền lợi: Hoa hồng được tính dựa trên thực tế phát sinh và tuân theo sơ đồ 5 tầng của hệ thống.`,
        privacy: `Chúng tôi cam kết bảo vệ thông tin cá nhân của bạn:

- Thông tin thu thập: Tên, email, số điện thoại và dữ liệu giao dịch tài chính liên quan đến hệ thống.
- Mục đích: Để quản lý tài khoản, tính toán hoa hồng, gửi thông báo và hỗ trợ khách hàng.
- Bảo mật: Sử dụng mã hóa SSL và các biện pháp bảo mật hiện đại nhất để ngăn chặn truy cập trái phép.
- Chia sẻ: Chúng tôi không bao giờ bán thông tin của bạn cho bên thứ ba.`,
        systemPolicy: `<h3>Chính sách vận hành và duy trì hệ thống</h3>
<p>- Phí duy trì: Được tính hàng tháng để đảm bảo hệ thống vận hành ổn định và cấp vốn cho các quỹ hỗ trợ.</p>
<p>- Quỹ hỗ trợ: Được trích từ phí duy trì và chia sẻ cho cộng đồng người mới (chưa có F1) theo cơ chế minh bạch.</p>

<h4>Số tiền hỗ trợ (Theo từng gói tham gia)</h4>
<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
  <thead>
    <tr style="background-color: #f1f5f9;">
      <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left;">Gói</th>
      <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: right;">Giá tham gia</th>
      <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: right;">Hạn mức hỗ trợ tối đa (50%)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #e2e8f0; padding: 10px;">Starter (Cơ bản)</td>
      <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: right;">100,000đ</td>
      <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: right;">50,000đ</td>
    </tr>
    <tr style="background-color: #f8fafc;">
      <td style="border: 1px solid #e2e8f0; padding: 10px;">Pro (Chuyên nghiệp)</td>
      <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: right;">1,000,000đ</td>
      <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: right;">500,000đ</td>
    </tr>
    <tr>
      <td style="border: 1px solid #e2e8f0; padding: 10px;">Master (Cao cấp)</td>
      <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: right;">10,000,000đ</td>
      <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: right;">5,000,000đ</td>
    </tr>
  </tbody>
</table>

<p style="margin-top: 15px;">- Điều kiện: Tài khoản đang trạng thái Active và chưa có thành viên F1 trực tiếp.</p>
<p>- Bảo trì: Chúng tôi có quyền tạm dừng hệ thống để nâng cấp, thường sẽ thông báo trước 24 giờ.</p>
<p>- Thay đổi: Các chính sách có thể được cập nhật để phù hợp với quy mô phát triển, mọi thay đổi sẽ được thông báo chính thức.</p>`
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
