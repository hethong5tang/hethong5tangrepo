
import { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { storageService } from '../services/storageService';

/**
 * Hook để tự động lưu và tải state từ LocalStorage/Supabase.
 * @param key Key định danh
 * @param initialState Giá trị khởi tạo mặc định
 * @returns [state, setState, resetState]
 */
export function useToolState<T>(key: string, initialState: T): [T, Dispatch<SetStateAction<T>>, () => void] {
    const [state, setState] = useState<T>(initialState);
    const isLoaded = useRef(false);

    // Load state từ storage khi mount
    useEffect(() => {
        const load = async () => {
            try {
                // Ta sử dụng cơ chế Async (cho Supabase Support)
                const stored = await storageService.getAsync(key, initialState);
                if (stored) {
                    setState((prev) => ({ ...prev, ...stored }));
                }
            } catch (error) {
                console.warn(`[useToolState] Lỗi khi tải state cho key "${key}":`, error);
            } finally {
                isLoaded.current = true;
            }
        };
        load();
    }, [key]);

    // Lưu state vào storage khi state thay đổi (Debounce 1s)
    useEffect(() => {
        if (!isLoaded.current) return;

        const handler = setTimeout(async () => {
            try {
                await storageService.setAsync(key, state);
            } catch (error) {
                console.warn(`[useToolState] Lỗi khi lưu state cho key "${key}":`, error);
            }
        }, 1000);

        return () => clearTimeout(handler);
    }, [key, state]);

    // Hàm reset về trạng thái ban đầu và xóa storage
    const resetState = () => {
        storageService.removeAsync(key);
        setState(initialState);
    };

    return [state, setState, resetState];
}
