
// Đây là file duy nhất được phép truy cập trực tiếp vào localStorage.
// Sau này, file này có thể bị loại bỏ hoặc dùng để cache data.

export const STORAGE_KEYS = {
    USERS: 'app_users_v1',
    FINANCE: 'app_finance_v1',
    SETTINGS: 'app_settings_v1',
    NOTIFICATIONS: 'app_notifications_v1',
    SUPPORT: 'app_support_v1',
    LOGS: 'app_logs_v1',
    AUTH: 'app_auth_token', // Giả lập token
};

export const storageService = {
    get: <T>(key: string, defaultValue: T): T => {
        if (typeof window === 'undefined') return defaultValue;
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error reading key ${key} from storage`, error);
            return defaultValue;
        }
    },

    set: <T>(key: string, value: T): void => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`Error saving key ${key} to storage`, error);
        }
    },

    remove: (key: string): void => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(key);
    },
    
    // Helper giả lập độ trễ mạng (Network Latency)
    simulateNetwork: async (ms: number = 500): Promise<void> => {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
