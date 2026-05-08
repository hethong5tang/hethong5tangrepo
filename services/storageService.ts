import { IDataAdapter } from './data/interfaces';
import { LocalAdapter } from './data/adapters/LocalAdapter';
import { SupabaseAdapter } from './data/adapters/SupabaseAdapter';

export const STORAGE_KEYS = {
    USERS: 'app_users_v4',
    FINANCE: 'app_finance_v1',
    SETTINGS: 'app_settings_v1',
    NOTIFICATIONS: 'app_notifications_v1',
    SUPPORT: 'app_support_v1',
    LOGS: 'app_logs_v1',
    AUTH: 'app_auth_token',
    LANDING_PAGE: 'app_landing_page_v2',
};

// Khởi tạo Adapter dựa trên môi trường
const dataSource = typeof import.meta !== 'undefined' ? import.meta.env.VITE_DATA_SOURCE || 'local' : 'local';

export const dataAdapter: IDataAdapter = 
  dataSource === 'supabase' 
    ? new SupabaseAdapter() 
    : new LocalAdapter();

// storageService cũ - Giữ lại một số hàm đồng bộ (Synchronous) cho LocalStorage để tương thích ngược. 
// LƯU Ý: Các hàm này sẽ LỖI nếu chạy trên Supabase (vì Supabase là Asynchronous).
export const storageService = {
  // === ASYNC API (CHUẨN MỚI CHO CẢ LOCAL LẪN SUPABASE) ===
  getAsync: async <T>(key: string, defaultValue: T): Promise<T> => {
    return await dataAdapter.get<T>(key, defaultValue);
  },

  setAsync: async <T>(key: string, value: T): Promise<void> => {
    await dataAdapter.set<T>(key, value);
  },

  removeAsync: async (key: string): Promise<void> => {
    await dataAdapter.remove(key);
  },

  simulateNetwork: async (ms: number = 500): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // === SYNC API (CHỈ CHẠY ĐƯỢC CHO LOCALSTORAGE) ===
  // VẪN GIỮ ĐỂ CODE HIỆN TẠI KHÔNG BỊ BREAK.
  get: <T>(key: string, defaultValue: T): T => {
    if (dataSource === 'supabase') {
      console.warn(`[CẢNH BÁO] Hàm đồng bộ get() không hỗ trợ trên Supabase. Đang trả về dữ liệu mặc định! Sử dụng getAsync().`);
      return defaultValue;
    }
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
    if (dataSource === 'supabase') {
      console.warn(`[CẢNH BÁO] Hàm đồng bộ set() không hỗ trợ trên Supabase. Vui lòng sử dụng setAsync().`);
      return;
    }
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving key ${key} to storage`, error);
    }
  },

  remove: (key: string): void => {
    if (dataSource === 'supabase') {
      return;
    }
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }
};
