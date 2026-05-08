
import React, { useState, useEffect, useRef } from 'react';
import { FunctionDeclaration, Type, Chat, Part, GenerateContentResponse } from '@google/genai';
import { AdminManagedUser } from '../features/users/types';
import { Transaction, FundStatus, WithdrawalRequest } from '../features/finance/types';
import { SystemSettings } from '../features/settings/types';
import { Message, Action, ActionType } from '../types';
import { SparklesIcon, PaperAirplaneIcon, ArrowPathIcon, XMarkIcon } from './Icons';
import { findUserInTree } from '../services/userService';
import { aiService } from '../services/aiService'; // Import service mới

interface GeminiAiAssistantProps {
    isOpen: boolean;
    onClose: () => void;
    onAction: (action: Action) => void;
    users: AdminManagedUser[];
    transactions: Transaction[];
    fundStatus: Record<string, FundStatus>;
    withdrawalRequests: WithdrawalRequest[];
    systemSettings: SystemSettings;
}

const GeminiAiAssistant: React.FC<GeminiAiAssistantProps> = (props) => {
    const { isOpen, onClose, onAction, users, transactions, fundStatus, withdrawalRequests, systemSettings } = props;
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatRef = useRef<Chat | null>(null);

    const tools: FunctionDeclaration[] = [
        {
            name: 'get_system_summary',
            description: 'Lấy báo cáo tóm tắt về doanh thu, lợi nhuận và người dùng hiện tại.',
            parameters: { 
                type: Type.OBJECT, 
                properties: {
                    period: { type: Type.STRING, enum: ['today', 'this_month', 'all_time'], description: "Khoảng thời gian cần báo cáo" }
                } 
            }
        },
        {
            name: 'analyze_user_network',
            description: 'Phân tích chi tiết mạng lưới của một người dùng dựa trên ID.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    userId: { type: Type.STRING, description: 'ID định danh người dùng' }
                },
                required: ['userId']
            }
        }
    ];
    
    const executeTool = (name: string, args: any) => {
        const flatten = (list: AdminManagedUser[]): AdminManagedUser[] => list.flatMap(u => [u, ...(u.children ? flatten(u.children) : [])]);
        const allFlatUsers = flatten(users);

        switch(name) {
            case 'get_system_summary': {
                const totalProfit = transactions
                    .filter(t => t.type === 'system_profit' || t.type === 'commission_difference')
                    .reduce((sum, t) => sum + t.amount, 0);
                return {
                    totalUsers: allFlatUsers.length,
                    activeUsers: allFlatUsers.filter(u => u.status === 'active').length,
                    pendingWithdrawals: withdrawalRequests.filter(w => w.status === 'pending').length,
                    totalSystemProfit: totalProfit,
                    currency: 'VND'
                };
            }
            case 'analyze_user_network': {
                const user = findUserInTree(users, args.userId);
                if (!user) return { error: 'Không tìm thấy ID người dùng này trong hệ thống.' };
                return {
                    name: user.name,
                    tier: user.membershipTier,
                    f1Count: user.f1Count,
                    totalNetwork: user.networkSize,
                    balance: user.balance,
                    status: user.status
                };
            }
            default: return { error: 'Công cụ không tồn tại.' };
        }
    }

    useEffect(() => {
        if (isOpen && !chatRef.current) {
            try {
                // Sử dụng aiService thay vì new GoogleGenAI
                chatRef.current = aiService.createChat({
                    model: 'gemini-3-flash-preview',
                    config: {
                        systemInstruction: `Bạn là "AI Command Center" - Trợ lý tối cao của Admin hệ thống Monetize. 
                        Năng lực:
                        1. Có khả năng truy cập thời gian thực vào dữ liệu người dùng, giao dịch và các quỹ.
                        2. Phân tích rủi ro (ví dụ: yêu cầu rút tiền quá lớn hoặc dồn dập).
                        3. Tư vấn chiến lược tăng trưởng mạng lưới.
                        Phong cách: Chuyên nghiệp, quyết đoán, sử dụng Tiếng Việt chuẩn mực.
                        Lưu ý: Luôn ưu tiên sử dụng công cụ (tools) để lấy dữ liệu chính xác trước khi đưa ra nhận định.`,
                        tools: [{ functionDeclarations: tools }],
                    },
                });
                if (messages.length === 0) {
                    setMessages([{ sender: 'ai', text: 'Chào Admin, hệ thống điều khiển AI đã sẵn sàng. Tôi đang giám sát dữ liệu thời gian thực cho bạn.' }]);
                }
            } catch (e) {
                console.error("Failed to initialize chat", e);
                setMessages([{ sender: 'ai', text: 'Lỗi: Không thể kết nối với AI Service. Vui lòng kiểm tra API Key.' }]);
            }
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!input.trim() || !chatRef.current || isLoading) return;

        const userMsg = input;
        setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
        setInput('');
        setIsLoading(true);

        try {
            let result = await chatRef.current.sendMessage({ message: userMsg });
            let response = result as GenerateContentResponse;
            
            while (response.functionCalls && response.functionCalls.length > 0) {
                setIsThinking(true);
                const results: Part[] = response.functionCalls.map(call => ({
                    functionResponse: { name: call.name, response: executeTool(call.name, call.args) }
                }));
                const followUp = await chatRef.current.sendMessage({ message: results });
                response = followUp as GenerateContentResponse;
            }
            
            const aiText = response.text || "Tôi đã xử lý yêu cầu nhưng không có phản hồi văn bản.";
            setMessages(prev => [...prev, { sender: 'ai', text: aiText }]);
        } catch (error: any) {
            console.error("AI Assistant Error:", error);
            const errorMsg = error.message?.includes('429') 
                ? 'Hệ thống AI đang quá tải (Hết hạn mức). Vui lòng thử lại sau 1 phút.' 
                : 'Đã xảy ra sự cố khi kết nối với bộ não AI. Vui lòng kiểm tra lại cấu hình hệ thống.';
            setMessages(prev => [...prev, { sender: 'ai', text: errorMsg }]);
        } finally {
            setIsLoading(false);
            setIsThinking(false);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
    };

    return (
        <div className={`fixed bottom-24 right-8 z-50 w-full max-w-md h-[600px] rounded-3xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) transform ${isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95 pointer-events-none'}`}>
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-indigo-600 rounded-t-3xl shadow-inner">
                <div className="flex items-center gap-3 text-white">
                    <div className="p-2 bg-white/20 rounded-lg animate-pulse">
                        <SparklesIcon className="h-5 w-5" />
                    </div>
                    <span className="font-black uppercase tracking-widest text-sm">AI Command Center</span>
                </div>
                <button onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all"><XMarkIcon className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50 dark:bg-slate-900/50 scrollbar-thin">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                        <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${m.sender === 'user' ? 'bg-indigo-600 text-white shadow-xl rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-sm rounded-tl-none'}`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium animate-pulse ml-2">
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                        </div>
                        {isThinking ? 'AI đang thực thi công cụ phân tích...' : 'AI đang soạn thảo phản hồi...'}
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="p-5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-b-3xl">
                <div className="relative">
                    <input 
                        value={input} 
                        onChange={e => setInput(e.target.value)} 
                        placeholder="Hỏi AI về báo cáo, người dùng hoặc rủi ro..." 
                        className="w-full pl-5 pr-14 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all shadow-inner dark:text-white" 
                    />
                    <button 
                        type="submit" 
                        disabled={isLoading || !input.trim()} 
                        className="absolute right-2 top-2 bottom-2 px-4 bg-indigo-600 text-white rounded-xl disabled:bg-slate-400 hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                    >
                        <PaperAirplaneIcon className="h-4 w-4" />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default React.memo(GeminiAiAssistant);
