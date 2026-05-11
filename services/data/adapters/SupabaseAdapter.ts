import { IDataAdapter } from '../interfaces';
import { supabase } from '../../supabaseClient';

// Supabase Adapter (For Production)
// Treats Supabase's system_settings table as a key-value store for app state.
export class SupabaseAdapter implements IDataAdapter {
  async get<T>(key: string, defaultValue: T): Promise<T> {
    try {
      console.log(`[Supabase Adapter] Lấy dữ liệu cho key: ${key}`);
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', key)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          // Record not found
          return defaultValue;
        }
        console.warn(`[Supabase Adapter] Lỗi khi lấy ${key}:`, error);
        return defaultValue;
      }
      
      return data?.value as T || defaultValue;
    } catch (err) {
      console.error(`[Supabase Adapter] Lỗi không xác định khi lấy ${key}:`, err);
      return defaultValue;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      console.log(`[Supabase Adapter] Lưu dữ liệu cho key: ${key}`);
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key, value: value as any, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        
      if (error) {
        console.error(`[Supabase Adapter] Lỗi khi lưu ${key}:`, error);
      }
    } catch (err) {
      console.error(`[Supabase Adapter] Lỗi không xác định khi lưu ${key}:`, err);
    }
  }

  async remove(key: string): Promise<void> {
    try {
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
