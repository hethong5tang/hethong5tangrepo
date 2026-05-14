
import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";

// Hàm khởi tạo Client. 
// Sử dụng GEMINI_API_KEY được hệ thống AI Studio cung cấp tự động.
const getClient = () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    
    if (!apiKey) {
        // Nếu không có key, có thể model yêu cầu người dùng chọn key (Paid/Billing models)
        // Chúng ta sẽ ném lỗi kèm hướng dẫn mở trình chọn key nếu đang ở môi trường AI Studio
        const errorMsg = "API Key missing. Vui lòng thiết lập GEMINI_API_KEY trong Secrets hoặc chọn API Key từ bảng điều khiển.";
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
    
    return new GoogleGenAI({ apiKey });
};

/**
 * Kiểm tra xem người dùng đã chọn API Key chưa (đối với model trả phí/billing)
 */
export const checkApiKey = async (): Promise<boolean> => {
    if (process.env.GEMINI_API_KEY || process.env.API_KEY) return true;
    
    // @ts-ignore
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        // @ts-ignore
        return await window.aistudio.hasSelectedApiKey();
    }
    return false;
};

/**
 * Mở trình chọn API Key
 */
export const requestApiKey = async (): Promise<void> => {
    // @ts-ignore
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        // @ts-ignore
        await window.aistudio.openSelectKey();
    } else {
        alert("Vui lòng thiết lập API Key trong phần Settings > Secrets.");
    }
};

// Interface cho tham số đầu vào để đảm bảo type safety
interface GenerateContentParams {
    model: string;
    contents: any; // Tuân theo cấu trúc của Google GenAI SDK
    config?: any;  // GenerationConfig
}

interface CreateChatParams {
    model: string;
    config?: any;
}

export const aiService = {
    /**
     * Gọi API để tạo nội dung (Text, Image, Code...)
     */
    generateContent: async (params: GenerateContentParams): Promise<GenerateContentResponse> => {
        const ai = getClient();
        return await ai.models.generateContent({
            model: params.model,
            contents: params.contents,
            config: params.config,
        });
    },

    /**
     * Khởi tạo một phiên Chat
     */
    createChat: (params: CreateChatParams): Chat => {
        const ai = getClient();
        return ai.chats.create({
            model: params.model,
            config: params.config,
        });
    },

    /**
     * Helper chuyên biệt cho việc tạo Video (Google Veo)
     */
    generateVideo: async (params: { model: string; prompt?: string; image?: { imageBytes: string, mimeType: string }; video?: any; config: any }) => {
        const ai = getClient();
        // @ts-ignore - SDK types might be strict
        return await ai.models.generateVideos({
            model: params.model,
            prompt: params.prompt,
            image: params.image,
            video: params.video,
            config: params.config
        });
    },

    /**
     * Helper để lấy operation status (cho Video generation)
     */
    getVideoOperation: async (operation: any) => {
        const ai = getClient();
        return await ai.operations.getVideosOperation({ operation });
    }
};
