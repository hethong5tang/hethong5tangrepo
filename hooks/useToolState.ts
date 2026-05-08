
import { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';

/**
 * Hook để tự động lưu và tải state từ LocalStorage.
 * @param key Key định danh trong LocalStorage (thường kèm userId)
 * @param initialState Giá trị khởi tạo mặc định
 * @returns [state, setState, resetState]
 */
export function useToolState<T>(key: string, initialState: T): [T, Dispatch<SetStateAction<T>>, () => void] {
    const [state, setState] = useState<T>(initialState);
    const isLoaded = useRef(false);

    // Load state từ LocalStorage khi mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge với initialState để đảm bảo các field mới thêm vào không bị thiếu
                setState((prev) => ({ ...prev, ...parsed }));
            }
        } catch (error) {
            console.warn(`[useToolState] Lỗi khi tải state cho key "${key}":`, error);
        } finally {
            isLoaded.current = true;
        }
    }, [key]);

    // Lưu state vào LocalStorage khi state thay đổi (Debounce 1s)
    useEffect(() => {
        if (!isLoaded.current) return;

        const handler = setTimeout(() => {
            try {
                localStorage.setItem(key, JSON.stringify(state));
            } catch (error) {
                console.warn(`[useToolState] Lỗi khi lưu state cho key "${key}". Có thể do Quota Exceeded.`, error);
            }
        }, 1000);

        return () => clearTimeout(handler);
    }, [key, state]);

    // Hàm reset về trạng thái ban đầu và xóa storage
    const resetState = () => {
        localStorage.removeItem(key);
        setState(initialState);
    };

    return [state, setState, resetState];
}
