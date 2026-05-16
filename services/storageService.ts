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
const isSupabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
const isLocalhost = typeof window !== 'undefined' && 
                   (window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname.includes('ais-dev')); // AI Studio Dev env

// Ưu tiên Supabase nếu đã cấu hình và không phải môi trường local (trừ khi ép buộc qua VITE_DATA_SOURCE)
const dataSource = (isSupabaseConfigured && !isLocalhost) 
    ? 'supabase' 
    : (import.meta.env.VITE_DATA_SOURCE || 'local');

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
       console.error(`[Storage] Async write failed for key ${key}`, err);
    });
    
    // Double save to LocalStorage cho LocalAdapter nếu an toàn
    if (dataSource === 'local' && typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Error saving key ${key} to storage`, error);
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
