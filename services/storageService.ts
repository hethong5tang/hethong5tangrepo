import { IDataAdapter } from './data/interfaces';
import { LocalAdapter } from './data/adapters/LocalAdapter';
import { SupabaseAdapter } from './data/adapters/SupabaseAdapter';

export const STORAGE_KEYS = {
    USERS: 'app_users_v5',
    FINANCE: 'app_finance_v2',
    SETTINGS: 'app_settings_v2',
    NOTIFICATIONS: 'app_notifications_v2',
    SUPPORT: 'app_support_v2',
    LOGS: 'app_logs_v2',
    AUTH: 'app_auth_token_v2',
    LANDING_PAGE: 'app_landing_page_v3',
};

// Khởi tạo Adapter dựa trên môi trường
// @ts-ignore
const env = import.meta.env;
const isSupabaseConfigured = !!(
    (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_URL.length > 10) && 
    (env.VITE_SUPABASE_ANON_KEY && env.VITE_SUPABASE_ANON_KEY.length > 10)
);

const isLocalhost = typeof window !== 'undefined' && 
                   (window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname.includes('-dev-'));

// CHẾ ĐỘ HOẠT ĐỘNG:
// 1. Luôn ưu tiên dùng Supabase nếu có Config và KHÔNG phải ở máy cá nhân (localhost)
// 2. Chấp nhận sử dụng Supabase trên cả domain .vercel.app và .asia-southeast1.run.app (Shared App)
let dataSource: 'supabase' | 'local' = 'local';

if (isSupabaseConfigured) {
    if (!isLocalhost) {
        dataSource = 'supabase';
    } else {
        // Ở máy local, chỉ dùng Supabase nếu được yêu cầu qua Env
        dataSource = env.VITE_DATA_SOURCE === 'supabase' ? 'supabase' : 'local';
    }
}

// Global debug flag để kiểm tra trạng thái trong Console (F12)
if (typeof window !== 'undefined') {
    (window as any).__DATA_SOURCE__ = dataSource;
    
    // Cảnh báo nếu đang ở Prod mà chưa có Supabase
    if (!isLocalhost && !isSupabaseConfigured) {
        console.error("%c[Hệ thống] CẢNH BÁO: Đang chạy trên môi trường thực nhưng chưa nhận được VITE_SUPABASE_URL từ Vercel. Hệ thống đang tạm dùng LocalStorage.", 
            "color: white; background: red; font-size: 16px; padding: 10px; font-weight: bold;");
    }

    console.log(`%c[Database System] Active Mode: ${dataSource.toUpperCase()}`, 
        `color: white; background: ${dataSource === 'supabase' ? '#3ecf8e' : '#3498db'}; padding: 4px 8px; border-radius: 4px; font-weight: bold;`);
    
    if (dataSource === 'supabase') {
        console.log(`[Database] Connecting to: ${env.VITE_SUPABASE_URL}`);
    }
}

export const dataAdapter: IDataAdapter = 
  dataSource === 'supabase' 
    ? new SupabaseAdapter() 
    : new LocalAdapter();

// In-memory cache to support synchronous get operations
const inMemoryCache: Record<string, any> = {};
let isStorageInitialized = false;

// storageService
export const storageService = {
  // Hàm khởi tạo để tải dữ liệu bất đồng bộ trước khi render
  initializeStorage: async (): Promise<void> => {
    if (isStorageInitialized) return;
    
    console.log(`[Storage] Initializing storage from data source: ${dataSource}`);
    const promises = Object.values(STORAGE_KEYS).map(async (key) => {
      try {
        const val = await dataAdapter.get(key, null);
        if (val !== null) {
          inMemoryCache[key] = val;
        }
      } catch (err) {
        console.error(`[Storage] Failed to preload key ${key}:`, err);
      }
    });
    
    await Promise.all(promises);
    isStorageInitialized = true;
    console.log('[Storage] Initialization complete.', Object.keys(inMemoryCache));
  },

  // === ASYNC API ===
  getAsync: async <T>(key: string, defaultValue: T): Promise<T> => {
    if (isStorageInitialized && inMemoryCache[key] !== undefined) {
      return inMemoryCache[key];
    }
    const val = await dataAdapter.get<T>(key, defaultValue);
    inMemoryCache[key] = val;
    return val;
  },

  setAsync: async <T>(key: string, value: T): Promise<void> => {
    inMemoryCache[key] = value;
    await dataAdapter.set<T>(key, value);
  },

  removeAsync: async (key: string): Promise<void> => {
    delete inMemoryCache[key];
    await dataAdapter.remove(key);
  },

  simulateNetwork: async (ms: number = 500): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // === SYNC API (Bây giờ đã hỗ trợ cả Supabase thông qua In-Memory Cache) ===
  get: <T>(key: string, defaultValue: T): T => {
    // 1. Ưu tiên đọc từ cache nếu đã có dữ liệu (kể cả Supabase đã load xong)
    if (inMemoryCache[key] !== undefined) {
      return inMemoryCache[key] as T;
    }
    
    // 2. Nếu chưa có trong cache, cố gắng đọc từ LocalStorage bất kể dataSource là gì
    // Vì ngay cả khi dùng Supabase, ta vẫn thường lưu một bản copy ở LocalStorage để load nhanh
    if (typeof window !== 'undefined') {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          // Cập nhật lại cache để lần sau không phải parse tiếp
          inMemoryCache[key] = parsed;
          return parsed;
        }
      } catch (error) {
        console.error(`[Storage] Error reading key ${key} from LocalStorage fallback`, error);
      }
    }
    
    return defaultValue;
  },

  set: <T>(key: string, value: T): void => {
    inMemoryCache[key] = value;
    
    // Ghi bất đồng bộ xuống data adapter (fire and forget)
    dataAdapter.set(key, value).catch(err => {
       console.error(`[Storage Error] Không thể lưu key "${key}" vào ${dataSource}:`, err);
       alert(`Lỗi đồng bộ Database: Dữ liệu của bạn có thể chỉ đang được lưu tạm trên máy này. Hãy kiểm tra kết nối Supabase.`);
    });
    
    // Luôn lưu bản backup vào LocalStorage để đảm bảo trải nghiệm không bị gián đoạn
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Error saving key ${key} to local backup`, error);
      }
    }
  },

  remove: (key: string): void => {
    delete inMemoryCache[key];
    
    dataAdapter.remove(key).catch(err => {
        console.error(`[Storage] Async remove failed for key ${key}`, err);
    });
    
    if (dataSource === 'local' && typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
};
