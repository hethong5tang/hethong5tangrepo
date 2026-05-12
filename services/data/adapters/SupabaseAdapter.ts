import { IDataAdapter } from '../interfaces';
import { supabase } from '../../supabaseClient';

// Supabase Adapter (For Production)
// Treats Supabase's system_settings table as a key-value store for app state.
export class SupabaseAdapter implements IDataAdapter {
  private cache: Map<string, { value: any, timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds cache

  async get<T>(key: string, defaultValue: T): Promise<T> {
    try {
      // Check cache first
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.value as T;
      }

      console.log(`[Supabase Adapter] Lấy dữ liệu cho key: ${key}`);
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', key)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          // Record not found
          this.cache.set(key, { value: defaultValue, timestamp: Date.now() });
          return defaultValue;
        }
        console.warn(`[Supabase Adapter] Lỗi khi lấy ${key}:`, error);
        return defaultValue;
      }
      
      const value = data?.value as T || defaultValue;
      this.cache.set(key, { value, timestamp: Date.now() });
      return value;
    } catch (err) {
      console.error(`[Supabase Adapter] Lỗi không xác định khi lấy ${key}:`, err);
      return defaultValue;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      // Optimistically update cache
      this.cache.set(key, { value, timestamp: Date.now() });

      console.log(`[Supabase Adapter] Lưu dữ liệu cho key: ${key}`);
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key, value: value as any, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        
      if (error) {
        console.error(`[Supabase Adapter] Lỗi khi lưu ${key}:`, error);
        // Invalidate cache on error to ensure consistency
        this.cache.delete(key);
      }
    } catch (err) {
      console.error(`[Supabase Adapter] Lỗi không xác định khi lưu ${key}:`, err);
      this.cache.delete(key);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      this.cache.delete(key);

      console.log(`[Supabase Adapter] Xóa dữ liệu cho key: ${key}`);
      const { error } = await supabase
        .from('system_settings')
        .delete()
        .eq('key', key);
        
      if (error) {
        console.error(`[Supabase Adapter] Lỗi khi xóa ${key}:`, error);
      }
    } catch (err) {
      console.error(`[Supabase Adapter] Lỗi không xác định khi xóa ${key}:`, err);
    }
  }
}
