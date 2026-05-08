
import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";

// Hàm khởi tạo Client. 
// Hiện tại vẫn dùng process.env.API_KEY (Client-side).
// SAU NÀY: Bạn chỉ cần sửa hàm này để gọi fetch() tới Backend của bạn.
const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.error("API Key chưa được cấu hình. Vui lòng kiểm tra file .env");
        throw new Error("API Key missing");
    }
    return new GoogleGenAI({ apiKey });
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
