
export enum LoggableAction {
    // Auth
    LOGIN_SUCCESS = 'Đăng nhập thành công',
    LOGIN_FAILURE = 'Đăng nhập thất bại',
    REGISTER_SUCCESS = 'Đăng ký thành công',
    REGISTER_FAILURE = 'Đăng ký thất bại',
    FORGOT_PASSWORD = 'Yêu cầu đặt lại mật khẩu',

    // User Management
    USER_UPDATE = 'Cập nhật người dùng',
    USER_CREATE = 'Tạo người dùng mới',
    USER_DELETE = 'Xóa người dùng',
    USER_BULK_DELETE = 'Xóa hàng loạt người dùng',
    USER_BULK_SUSPEND = 'Khóa hàng loạt người dùng',
    ADMIN_FUNDS_ADJUSTMENT = 'Điều chỉnh quỹ bởi Admin', // New action

    // Finance
    WITHDRAWAL_REQUEST = 'Tạo yêu cầu rút tiền',
    WITHDRAWAL_PROCESSED = 'Xử lý yêu cầu rút tiền',
    WITHDRAWAL_BATCH_PROCESSED = 'Xử lý hàng loạt yêu cầu rút tiền',
    DEPOSIT_SUCCESS = 'Nạp tiền thành công',
    FUND_PAYOUT_SUPPORT = 'Chi trả Quỹ Hỗ trợ',
    FUND_PAYOUT_LEADER = 'Chi trả Quỹ Leader',
    MILESTONE_PROCESSED = 'Xử lý thưởng mốc',
    
    // API & Tools
    TOOL_USAGE = 'Sử dụng tiện ích',
    API_CONSUMPTION = 'Tiêu thụ API Google',

    // Settings
    SYSTEM_SETTINGS_UPDATE = 'Cập nhật Cài đặt Hệ thống',
    FUND_SETTINGS_UPDATE = 'Cập nhật Cài đặt Quỹ',
    FEES_SETTINGS_UPDATE = 'Cập nhật Phí & Hoa hồng',

    // Security
    PASSWORD_CHANGE = 'Thay đổi mật khẩu',
    PIN_CHANGE = 'Thay đổi mã PIN',
    TWO_FACTOR_CHANGE = 'Thay đổi 2FA',
}

export interface ApiMetadata {
    model: string;
    type: 'image' | 'text' | 'video' | 'audio';
    resolution?: string;
    unitCount: number; // tokens or images count
    estimatedCostUsd: number;
    toolId: string;
    tokens?: number;
    creditCost?: number;
}

export interface LogEntry {
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    actionType: LoggableAction;
    details: string;
    status: 'success' | 'failure' | 'info';
    ipAddress: string;
    apiMetadata?: ApiMetadata;
}
