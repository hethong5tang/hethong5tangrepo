import { IDataAdapter } from '../interfaces';

// Local Adapter (Dành cho Demo)
// Nhận mệnh lệnh và thao tác trực tiếp với Local Storage.
export class LocalAdapter implements IDataAdapter {
  async get<T>(key: string, defaultValue: T): Promise<T> {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`[Local Adapter] Error reading key ${key} from storage`, error);
      return defaultValue;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`[Local Adapter] Error saving key ${key} to storage`, error);
    }
  }

  async remove(key: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }
}
