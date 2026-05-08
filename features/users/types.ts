
import { Role } from "../roles/types";

export enum UserStatus {
  Active = 'active',
  PendingFee = 'pending_fee',
  Suspended = 'suspended',
  Dead = 'dead',
}

export enum MembershipTier {
    None = 'none',
    Starter = 'starter',
    Pro = 'pro',
    Master = 'master',
}

export interface User {
  id: string; // Khóa chính (UUID khi qua Supabase)
  name: string;
  avatar: string;
  joinDate: string; // DB: created_at (Timestamptz)
  level: number;
  membershipTier: MembershipTier;
}

// --- CHUẨN HOÁ PHÂN MẢNH DATABASE (Database Normalization cho Supabase) ---

export interface UserBaseInfo {
  // Bảng: users
  // Type: id (UUID), name (TEXT), avatar (TEXT), email (TEXT), phone (TEXT)
  email: string;
  phone: string;
  lastActiveDate?: string; // DB: last_active_at (Timestamptz)
  password?: string; // TODO: Xoá bỏ khi dùng Supabase Auth (Quản lý nội bộ)
  pin?: string;      // TODO: Mã hoá (hash) trên backend, không truyền plain text
}

export interface UserFinancialInfo {
  // Bảng: user_wallets (Tách riêng để dùng Row-level Lock khi giao dịch)
  // Type: NUMERIC hoặc BIGINT thay vì FLOAT để tránh lỗi sai số dấu phẩy động
  balance: number;
  creditBalance: number;
  supportWalletBalance?: number;
  supportDebt?: number;
  totalSupportReceived?: number;
  totalEarnings: number;
}

export interface UserBankInfo {
  // Bảng: user_bank_info
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  momoPhoneNumber?: string;
}

export interface UserNetworkInfo {
  // Bảng: user_network (Quản lý MLM & Phân cấp)
  parentId?: string; // Khóa ngoại tới user.id
  hierarchyPath?: string; // THÊM MỚI (Lưu pattern ltree ví dụ: root_id.f1_id.f2_id) để query tốc độ cao
  f1Count: number;
  networkSize: number;
}

export interface UserSystemInfo {
  // Bảng: user_system_state
  status: UserStatus;
  previousStatus?: UserStatus;
  roleId?: string; // Có thể lưu trong Supabase JWT Custom Claims RLS
  rankLevel: number;
  missedMaintenanceMonths?: number;
  accumulatedPenalty?: number;
  nextMaintenanceDate?: string;
  currentLevelRevenue?: number;
  pendingLevelUpInfo?: { levelName: string } | null;
}

export interface UserSecurityInfo {
  // Bảng: user_security
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string; // Cần mã hóa trên backend
}

// -------------------------------------------------------------------------

export interface HierarchicalUser extends User {
  children?: HierarchicalUser[];
}

export type AspectRatio = "2:3" | "1:1" | "9:16" | "4:3" | "1:2" | "3:4" | "4:5" | "2:1" | "16:9" | "3:2" | "5:4" | "custom";
export type GenerationMode = "Tiêu chuẩn" | "Chất lượng";
export type ImageQuantity = 1 | 2 | 3 | 4;

export interface GenerationResult {
    taskId: string;
    date: string;
    prompt: string;
    enhancedPrompt?: string;
    images: string[];
    settings: {
        aspectRatio: AspectRatio,
        customRatio?: { width: number, height: number } | null,
        quantity: ImageQuantity | 1,
        generationMode: GenerationMode;
        imageStyle?: string;
        videoState?: string;
    };
    cost: number;
    balanceAfter: number;
    creationTime: string;
}


export interface AdminManagedUser extends User, 
  UserBaseInfo, 
  UserFinancialInfo, 
  UserBankInfo, 
  UserNetworkInfo, 
  UserSystemInfo, 
  UserSecurityInfo {
  // Chỉ định riêng cho Frontend rendering, backend sẽ xử lý qua query riêng
  children?: AdminManagedUser[];
  
  // Bảng: ai_generation_history (user_id FK)
  generationHistory?: GenerationResult[];
}

export interface UserProfile {
    fullName: string;
    email: string;
    password?: string;
    phone: string;
    momoPhoneNumber?: string;
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
}

export interface UserSettings {
    autoRenewMaintenance: boolean;
    notifications: {
        newCommission: boolean;
        withdrawalStatusChange: boolean;
        networkActivity: boolean;
    }
}

export interface UpgradeResult {
  success: boolean;
  needed?: number;
}
