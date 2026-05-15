
import { MembershipTier } from "../users/types";

export enum IntegrationType {
    Link = 'link',
    Embed = 'embed',
    GeminiAi = 'gemini_ai',
    ApiCall = 'api_call',
    ServerApiCall = 'server_api_call',
    ImageApiCall = 'image_api_call',
}

export interface ApiConfig {
    endpoint: string;
    method: 'GET' | 'POST';
    authType: 'none' | 'apiKey' | 'bearer';
    apiKey?: string;
    headers?: string;
}

export interface IntegrationSubTool {
    id: string;
    name: string;
    creditCost: number;
}

export interface IntegrationTool {
    id: string;
    icon: string;
    customIconUrl?: string;
    title: string;
    description: string;
    enabled: boolean;
    type: IntegrationType;
    creditCost: number;
    subTools?: IntegrationSubTool[];
    modelPricing?: Record<string, number>; 
    link?: string;
    apiConfig?: ApiConfig;
    promptTemplate?: string;
    uiSchema?: string;
    embedCode?: string;
    bodyTemplate?: string;
    responsePath?: string;
    pricingParams?: Record<string, number>;
}

export interface CommissionSetting {
    level: string;
    percentage: number;
}

export interface CommissionTierSettings {
    participationCommissions: CommissionSetting[];
    maintenanceCommissions: CommissionSetting[];
}

export interface BranchRequirement {
    targetLevel: number;
    count: number;
}

export interface LevelSetting {
    level: number;
    name: string;
    subTitle: string;
    requiredGroupRevenue: number;
    requiredEarnings?: number; // Alias or compatibility field
    rewardPercentage: number; // % thưởng Đồng chia (trích từ Quỹ Leader)
    honorAward: string; // Thưởng vinh danh (Hiện vật/Bằng khen)
    branchRequirements?: BranchRequirement[]; // Điều kiện số nhánh phải đạt cấp độ nhất định
    f1Requirement?: number; // Điều kiện số F1 tham gia gói
}

export interface MilestoneBonus {
    id: string;
    networkSize: number;
    bonusAmount: number;
}

export enum AchievementMetric {
    F1Count = 'f1Count',
    NetworkSize = 'networkSize',
    TotalEarnings = 'totalEarnings',
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    customIconUrl?: string;
    weight: number; // Trọng số thưởng (vẫn giữ nếu muốn chia quỹ theo tỷ lệ)
    bonusAmount?: number; // Số tiền thưởng cố định cho sự kiện
    winnerLimit?: number; // Giới hạn số lượng người nhận thưởng (VD: 50 người đầu tiên)
    startDate?: string; // Thời gian bắt đầu sự kiện
    endDate?: string; // Thời gian kết thúc sự kiện
    rule: {
        metric: AchievementMetric;
        target: number;
    };
    isActive?: boolean;
    claimedUserIds?: string[]; // Danh sách IDs user đã được chi trả thưởng
}

export interface ReferralToolItem {
    id: string;
    title: string;
    content: string;
    icon: string;
    customIconUrl?: string;
    color?: string;
}

export interface LeaderboardMockLeader {
    id: string;
    name: string;
    avatar: string;
    score: number;
}

export enum LeaderboardMetric {
    F1Count = 'f1_count',
    Network_size = 'network_size',
    TotalEarnings = 'total_earnings',
}

export type LeaderboardTimeframe = 'monthly' | 'quarterly' | 'yearly' | 'all_time';

export interface LeaderboardSettings {
    title: string;
    description: string;
    metric: LeaderboardMetric;
    timeframe: LeaderboardTimeframe;
}

export interface LeaderboardMockSettings {
    title: string;
    description: string;
    metric: LeaderboardMetric;
    leaders: LeaderboardMockLeader[];
}

export interface SupportFundTierSetting {
    allocationPercentage: number;
    totalPayoutLimit: number;
}

export interface FundSettings {
    leaderBonusAllocationPercentage: number;
    supportParticipationAllocationPercentage: number;
    supportFundSettings: Record<MembershipTier.Starter | MembershipTier.Pro | MembershipTier.Master, SupportFundTierSetting>;
}

export interface UiSchemaItem {
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'file';
    options?: string[];
}

// --- NEW PAYMENT INTERFACES ---
export interface AdminBankInfo {
    bankName: string; // Vd: Vietcombank, MBBank (Dùng shortName cho VietQR nếu có thể)
    bankShortName?: string; // Shortname cho VietQR api (vd: VCB, MB, TPB)
    accountNumber: string;
    accountOwner: string;
    branch?: string;
    enabled: boolean;
    useCustomQr?: boolean; // Toggle: Dùng QR tự upload hay Auto
    qrImageUrl?: string; // Ảnh QR tự upload
}

export interface AdminWalletInfo {
    id: string;
    type: 'momo' | 'zalopay' | 'viettelpay' | 'other';
    name: string; // Tên hiển thị (Ví dụ: Momo cá nhân)
    phoneNumber: string; // Số điện thoại / Số tài khoản ví
    ownerName: string;
    enabled: boolean;
    useCustomQr?: boolean; // Toggle: Dùng QR tự upload hay Auto
    qrImageUrl?: string; // Ảnh QR tự upload
}

export interface AdminPaymentSettings {
    bank: AdminBankInfo;
    wallets: AdminWalletInfo[];
}

export interface LegalContent {
    tos: string;
    privacy: string;
    systemPolicy: string;
}

export interface SystemSettings {
    systemName: string;
    isMaintenanceMode: boolean;
    maintenanceEndTime: string | null;
    adminEmail: string;
    participationFee: number;
    maintenanceFee: number;
    proParticipationFee: number;
    proMaintenanceFee: number;
    masterParticipationFee: number;
    masterMaintenanceFee: number;
    penaltyFeeRate: number;
    commissionSettings: CommissionTierSettings;
    minWithdrawal: number;
    profitSettings: {
        leaderFundAutoPayout?: boolean;
        leaderFundPayoutDay?: number;
        participation: {
            adminWallet: number; // 17%
            vat: number;         // 10%
            corporateTax: number;// 3%
            leaderBonusFund: number; // 5%
            supportFund: number;     // 5%
        };
        maintenance: {
            adminWallet: number;
            vat: number;
            corporateTax: number;
            leaderBonusFund: number;
            supportFund: number;
        };
    };
    levelSettings: LevelSetting[];
    leaderMilestoneBonuses: MilestoneBonus[];
    leaderAchievements: Achievement[];
    referralTools: ReferralToolItem[];
    tierSettings: Record<MembershipTier.Starter | MembershipTier.Pro | MembershipTier.Master, {
        name: string;
        visible: boolean;
        credits: number;
        benefits: string[];
    }>;
    leaderboardSettings: LeaderboardSettings;
    useLeaderboardMockData: boolean;
    leaderboardMockData: LeaderboardMockSettings;
    integrationTools: IntegrationTool[];
    
    // Payment Config
    adminPayment: AdminPaymentSettings;

    // Legal Content
    legalContent: LegalContent;

    // Active Gemini Models
    activeGeminiModels?: string[];

    // Dynamic API Catalog & Pricing
    apiCatalog?: any[];
    apiUsdRate?: number;
}
