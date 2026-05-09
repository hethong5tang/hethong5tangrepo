
import { AdminManagedUser } from '../features/users/types';
import { storageService, STORAGE_KEYS } from '../services/storageService';
import { MOCK_INITIAL_USERS } from '../data/mockData';
import { UserState } from '../features/users/userTypes';
import { IS_DEMO_MODE } from '../config';

// Helper để làm phẳng cây user (giống database quan hệ)
const flattenUsers = (users: AdminManagedUser[]): AdminManagedUser[] => {
    return users.flatMap(u => [u, ...(u.children ? flattenUsers(u.children) : [])]);
};

export const userApi = {
    /**
     * Lấy danh sách toàn bộ user (Giả lập GET /api/users)
     */
    getAllUsers: async (): Promise<AdminManagedUser[]> => {
        await storageService.simulateNetwork(300); // Giả lập mạng nhanh
        const userState = storageService.get<UserState>(STORAGE_KEYS.USERS, { allUsers: IS_DEMO_MODE ? MOCK_INITIAL_USERS : [] });
        return userState.allUsers; // Trả về dạng cây (như state hiện tại)
    },

    /**
     * Tìm user theo ID (Giả lập GET /api/users/:id)
     */
    getUserById: async (userId: string): Promise<AdminManagedUser | null> => {
        await storageService.simulateNetwork(200);
        const userState = storageService.get<UserState>(STORAGE_KEYS.USERS, { allUsers: IS_DEMO_MODE ? MOCK_INITIAL_USERS : [] });
        const allFlat = flattenUsers(userState.allUsers);
        return allFlat.find(u => u.id === userId) || null;
    },

    /**
     * Kiểm tra email/phone đã tồn tại chưa (Giả lập POST /api/users/check-exists)
     */
    checkUserExists: async (email: string, phone: string): Promise<{ exists: boolean; field?: 'email' | 'phone' }> => {
        await storageService.simulateNetwork(500); // Giả lập mạng trung bình
        const userState = storageService.get<UserState>(STORAGE_KEYS.USERS, { allUsers: IS_DEMO_MODE ? MOCK_INITIAL_USERS : [] });
        const allFlat = flattenUsers(userState.allUsers);
        
        const emailExists = allFlat.some(u => u.email.toLowerCase() === email.toLowerCase());
        if (emailExists) return { exists: true, field: 'email' };

        // FIX: Chỉ kiểm tra phone nếu phone có giá trị (không rỗng)
        if (phone && phone.trim() !== '') {
            const phoneExists = allFlat.some(u => u.phone === phone);
            if (phoneExists) return { exists: true, field: 'phone' };
        }

        return { exists: false };
    },

    /**
     * Tạo user mới (Giả lập POST /api/users)
     * Lưu ý: Trong kiến trúc hiện tại, việc update state cây phức tạp vẫn đang nằm ở Reducer.
     * API này chỉ mô phỏng việc "Gửi dữ liệu lên server".
     */
    createUser: async (user: AdminManagedUser): Promise<{ success: boolean; id: string }> => {
        await storageService.simulateNetwork(800); // Giả lập xử lý server lâu hơn chút
        // Trong thực tế, server sẽ lưu vào DB. Ở đây ta chỉ return success để Reducer client tự update.
        // Hoặc ta có thể update localStorage ở đây luôn, nhưng sẽ bị conflict với Reducer hiện tại.
        // -> Chiến lược: API trả về OK, sau đó Client Reducer update UI.
        return { success: true, id: user.id };
    }
};
