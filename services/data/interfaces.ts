// Giao diện (Interface) chung xác định các mệnh lệnh bắt buộc các Adapter phải có.
export interface IDataAdapter {
  get<T>(key: string, defaultValue: T): Promise<T>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}
