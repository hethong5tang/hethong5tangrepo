import { IDataAdapter } from '../interfaces';

// Supabase Adapter (For Production)
// Chuyển đổi thành các câu lệnh SQL/API bắn lên hệ thống Supabase
export class SupabaseAdapter implements IDataAdapter {
  async get<T>(key: string, defaultValue: T): Promise<T> {
    console.log(`[Supabase Adapter] Lấy dữ liệu cho key: ${key}`);
    // Sau này sẽ implement logic gọi Supabase API ở đây
    return defaultValue;
  }

  async set<T>(key: string, value: T): Promise<void> {
    console.log(`[Supabase Adapter] Lưu dữ liệu cho key: ${key}`);
    // Sau này sẽ implement logic gọi Supabase API ở đây
  }

  async remove(key: string): Promise<void> {
    console.log(`[Supabase Adapter] Xóa dữ liệu cho key: ${key}`);
    // Sau này sẽ implement logic gọi Supabase API ở đây
  }
}
