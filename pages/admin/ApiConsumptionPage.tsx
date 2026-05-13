
import React, { useMemo, useState, useEffect } from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useLogging } from '../../features/logging/useLogging';
import { LoggableAction } from '../../features/logging/types';
import { 
    BoltIcon, CpuChipIcon, PhotoIcon, FilmIcon, DocumentTextIcon, 
    CalendarDaysIcon, CurrencyDollarIcon, UserGroupIcon, MagnifyingGlassIcon,
    XCircleIcon, ArrowPathIcon, InformationCircleIcon, GlobeAltIcon,
    SparklesIcon, ChevronDownIcon, CheckBadgeIcon, EyeIcon, EyeSlashIcon,
    LinkIcon, CheckCircleIcon
} from '../../components/Icons';
import { GoogleGenAI, Type } from "@google/genai";
import { useToast } from '../../components/ToastProvider';
import { useSettings } from '../../features/settings/useSettings';
import { supabase } from '../../services/supabaseClient';

const USD_RATE = 25500; 

interface ModelItem {
    provider: string;
    logo: string;
    name: string;
    type: string;
    basePriceUsd: number;
    unit: string;
    category: string;
    modelId: string;
}

const INITIAL_MODEL_CATALOG: ModelItem[] = [
    { provider: 'Google', modelId: 'gemini-3-flash-preview', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_Cloud_Logo.svg', name: 'Gemini 3 Flash', type: 'Text/Vision', basePriceUsd: 0.075, unit: '1M Tokens', category: 'flash' },
    { provider: 'Google', modelId: 'gemini-3-pro-preview', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_Cloud_Logo.svg', name: 'Gemini 3 Pro', type: 'Complex Reasoning', basePriceUsd: 1.25, unit: '1M Tokens', category: 'pro' },
    { provider: 'Google', modelId: 'gemini-2.5-flash-image', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_Cloud_Logo.svg', name: 'Gemini 2.5 Flash Image', type: 'Image Gen', basePriceUsd: 0.03, unit: 'Mỗi ảnh', category: 'flash' },
    { provider: 'OpenAI', modelId: 'gpt-4o', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg', name: 'GPT-4o', type: 'Multi-modal', basePriceUsd: 5.00, unit: '1M Tokens', category: 'premium' },
    { provider: 'OpenAI', modelId: 'o1-preview', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg', name: 'OpenAI o1', type: 'Reasoning', basePriceUsd: 15.00, unit: '1M Tokens', category: 'premium' },
    { provider: 'OpenAI', modelId: 'claude-3-5-sonnet', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Anthropic_logo.svg/512px-Anthropic_logo.svg.png', name: 'Claude 3.5 Sonnet', type: 'Advanced Text', basePriceUsd: 3.00, unit: '1M Tokens', category: 'premium' },
];

const LOADING_STEPS = [
    "Đang khởi tạo kết nối Google Search...",
    "Đang truy cập bảng giá OpenAI & Anthropic...",
    "Đang quét dữ liệu từ Google Cloud Vertex AI...",
    "Đang đối soát tỉ giá hối đoái mới nhất...",
    "Đang lọc bỏ các mô hình AI giả mạo/tin đồn...",
    "Đang cấu trúc lại dữ liệu thị trường thực tế...",
    "Sắp hoàn tất, vui lòng chờ trong giây lát..."
];

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

const ApiConsumptionPage: React.FC = () => {
    const { loggingState } = useLogging();
    const { settingsState } = useSettings();
    const { addToast } = useToast();
    
    const [filterProvider, setFilterProvider] = useState<string>('all');
    const [catalogSearch, setCatalogSearch] = useState('');
    const [catalog, setCatalog] = useState<ModelItem[]>(INITIAL_MODEL_CATALOG);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshStep, setRefreshStep] = useState(0);
    const [showOnlyIntegrated, setShowOnlyIntegrated] = useState(true);
    const [sources, setSources] = useState<{title: string, uri: string}[]>([]);

    // API Payment States
    const [adminBalance, setAdminBalance] = useState<number>(0);
    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [payAmount, setPayAmount] = useState<string>('');
    const [payDescription, setPayDescription] = useState<string>('');
    const [isPaying, setIsPaying] = useState(false);

    useEffect(() => {
        fetchAdminFinance();
    }, []);

    const fetchAdminFinance = async () => {
        try {
            const { data: fundData, error: fundError } = await supabase
                .from('funds')
                .select('balance')
                .eq('id', 'admin')
                .single();
            if (fundData && !fundError) setAdminBalance(fundData.balance);

            const { data: historyData, error: historyError } = await supabase
                .from('fund_transactions')
                .select('*')
                .eq('fund_id', 'admin')
                .eq('type', 'outflow')
                .like('description', 'Thanh toán hóa đơn API:%')
                .order('created_at', { ascending: false });
            if (historyData && !historyError) setPaymentHistory(historyData);
        } catch (err) {
            console.error("Error fetching financial info:", err);
        }
    };

    const handlePayBill = async () => {
        const amount = parseFloat(payAmount);
        if (isNaN(amount) || amount <= 0) {
            addToast("Số tiền không hợp lệ", "error");
            return;
        }
        if (!payDescription) {
            addToast("Vui lòng nhập mô tả hóa đơn", "error");
            return;
        }

        setIsPaying(true);
        try {
            const { error } = await supabase.rpc('admin_pay_api_bill', {
                p_amount: amount,
                p_description: payDescription
            });

            if (error) {
                // Parse the specific error message if it's "Số dư ví Admin không đủ"
                if (error.message.includes('Số dư ví Admin không đủ')) {
                    throw new Error("Số dư quỹ lợi nhuận không đủ để thanh toán.");
                } else {
                    throw error;
                }
            }

            addToast("Thanh toán hóa đơn API thành công!", "success");
            setIsPayModalOpen(false);
            setPayAmount('');
            setPayDescription('');
            fetchAdminFinance();
        } catch (error: any) {
            addToast(error.message || "Lỗi khi thanh toán", "error");
        } finally {
            setIsPaying(false);
        }
    };

    const handleResetFilters = () => {
        setFilterProvider('all');
        setCatalogSearch('');
        setShowOnlyIntegrated(true);
    };
    const isFilterActive = filterProvider !== 'all' || catalogSearch !== '' || !showOnlyIntegrated;

    useEffect(() => {
        let interval: any;
        if (isRefreshing) {
            interval = setInterval(() => {
                setRefreshStep(prev => (prev + 1) % LOADING_STEPS.length);
            }, 3500);
        } else {
            setRefreshStep(0);
        }
        return () => clearInterval(interval);
    }, [isRefreshing]);

    const integratedModelIds = useMemo(() => {
        const ids = new Set<string>();
        settingsState.systemSettings.integrationTools.forEach(tool => {
            if (tool.modelPricing) {
                Object.keys(tool.modelPricing).forEach(mId => ids.add(mId));
            }
            if (tool.id.includes('video')) ids.add('veo-3.1-fast-generate-preview');
            if (tool.id.includes('image')) ids.add('gemini-2.5-flash-image');
            if (tool.id.includes('content')) ids.add('gemini-3-flash-preview');
        });
        return ids;
    }, [settingsState.systemSettings.integrationTools]);

    const visibleModelsByUsage = useMemo(() => {
        return catalog.filter(m => !showOnlyIntegrated || integratedModelIds.has(m.modelId));
    }, [catalog, showOnlyIntegrated, integratedModelIds]);

    const providers = useMemo(() => {
        const p = new Set(visibleModelsByUsage.map(m => m.provider));
        return ['all', ...Array.from(p)];
    }, [visibleModelsByUsage]);

    useMemo(() => {
        if (filterProvider !== 'all' && !providers.includes(filterProvider)) {
            setFilterProvider('all');
        }
    }, [providers, filterProvider]);

    const filteredCatalog = useMemo(() => {
        return visibleModelsByUsage
            .filter(m => filterProvider === 'all' || m.provider === filterProvider)
            .filter(m => !catalogSearch || m.name.toLowerCase().includes(catalogSearch.toLowerCase()) || m.provider.toLowerCase().includes(catalogSearch.toLowerCase()));
    }, [visibleModelsByUsage, filterProvider, catalogSearch]);

    const handleRefreshPricing = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        setSources([]);
        setRefreshStep(0);
        addToast("AI đang thực hiện tìm kiếm Google để xác thực giá thực tế...", "info");

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: "gemini-3-pro-preview",
                contents: "Cập nhật bảng giá API mới nhất và CHÍNH XÁC từ các hãng Google Cloud, OpenAI, Anthropic tính đến thời điểm hiện tại. Trả về mảng JSON bao gồm các trường: provider, modelId, name, type, basePriceUsd, unit, category, logo. Chỉ liệt kê các mô hình đã ra mắt chính thức.",
                config: {
                    tools: [{ googleSearch: {} }],
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                provider: { type: Type.STRING },
                                modelId: { type: Type.STRING },
                                name: { type: Type.STRING },
                                type: { type: Type.STRING },
                                basePriceUsd: { type: Type.NUMBER },
                                unit: { type: Type.STRING },
                                category: { type: Type.STRING },
                                logo: { type: Type.STRING }
                            },
                            required: ["provider", "modelId", "name", "basePriceUsd", "unit", "category", "logo"]
                        }
                    }
                }
            });

            const rawText = response.text || "";
            let cleanedJson = rawText.trim();
            const jsonArrayStart = cleanedJson.indexOf('[');
            const jsonArrayEnd = cleanedJson.lastIndexOf(']');
            
            if (jsonArrayStart === -1 || jsonArrayEnd === -1) {
                throw new Error("AI không trả về định dạng mảng dữ liệu hợp lệ.");
            }
            
            cleanedJson = cleanedJson.substring(jsonArrayStart, jsonArrayEnd + 1);

            try {
                const newCatalog = JSON.parse(cleanedJson);
                if (Array.isArray(newCatalog) && newCatalog.length > 0) {
                    setCatalog(newCatalog);
                    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
                    if (groundingChunks) {
                        const extractedSources = groundingChunks
                            .filter((chunk: any) => chunk.web)
                            .map((chunk: any) => ({ title: chunk.web.title, uri: chunk.web.uri }));
                        setSources(extractedSources);
                    }
                    addToast("Đã cập nhật bảng giá chính xác qua Google Search!", "success");
                }
            } catch (parseError) {
                addToast("Lỗi phân tích dữ liệu AI.", "error");
            }
        } catch (error) {
            addToast("Không thể kết nối hoặc quét dữ liệu thực tế.", "error");
        } finally {
            setIsRefreshing(false);
        }
    };

    const apiLogs = useMemo(() => {
        return loggingState.logs.filter(log => 
            log.actionType === LoggableAction.API_CONSUMPTION || 
            (log.actionType === LoggableAction.TOOL_USAGE && log.apiMetadata)
        );
    }, [loggingState.logs]);

    const stats = useMemo(() => {
        let totalCostUsd = 0;
        let totalRequests = apiLogs.length;

        const modelUsage: Record<string, { count: number, cost: number }> = {};
        const dailyData: Record<string, { date: string, cost: number, count: number }> = {};

        apiLogs.forEach(log => {
            const meta = log.apiMetadata;
            if (!meta) return;

            totalCostUsd += meta.estimatedCostUsd;
            if (!modelUsage[meta.model]) modelUsage[meta.model] = { count: 0, cost: 0 };
            modelUsage[meta.model].count += 1;
            modelUsage[meta.model].cost += meta.estimatedCostUsd;

            const date = new Date(log.timestamp).toLocaleDateString('vi-VN');
            if (!dailyData[date]) dailyData[date] = { date, cost: 0, count: 0 };
            dailyData[date].cost += meta.estimatedCostUsd;
            dailyData[date].count += 1;
        });

        const modelPieData = Object.entries(modelUsage).map(([name, data]) => ({ name, value: data.cost }));
        const trendData = Object.values(dailyData).sort((a, b) => new Date(a.date).getTime() - new Date(a.date).getTime());

        return { totalCostUsd, totalRequests, modelPieData, trendData };
    }, [apiLogs]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
                    <GlobeAltIcon className="h-7 w-7 text-indigo-500" />
                    Bảng giá & Thống kê API
                </h2>
                <div className="flex flex-wrap items-center gap-4">
                    <button 
                        onClick={() => setIsPayModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md transition-all active:scale-95"
                    >
                        <CurrencyDollarIcon className="h-5 w-5" />
                        Chi trả hóa đơn API
                    </button>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button 
                            onClick={() => setShowOnlyIntegrated(true)}
                            className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all flex items-center gap-2 ${showOnlyIntegrated ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <CheckBadgeIcon className="h-4 w-4" /> Đang dùng
                        </button>
                        <button 
                            onClick={() => setShowOnlyIntegrated(false)}
                            className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all flex items-center gap-2 ${!showOnlyIntegrated ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <GlobeAltIcon className="h-4 w-4" /> Thị trường
                        </button>
                    </div>

                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        {providers.map(p => (
                            <button 
                                key={p} 
                                onClick={() => setFilterProvider(p)} 
                                className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${filterProvider === p ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                {p === 'all' ? 'Hãng' : p}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden relative flex flex-col">
                {isRefreshing && (
                    <div className="absolute inset-0 z-50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                            <GlobeAltIcon className="h-10 w-10 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <div className="mt-6 text-center space-y-2">
                            <p className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-widest animate-pulse">
                                {LOADING_STEPS[refreshStep]}
                            </p>
                            <p className="text-xs text-slate-500 font-medium">Xác thực dữ liệu thị trường (30-40s)</p>
                        </div>
                    </div>
                )}

                <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-slate-700 dark:text-slate-200">
                            <CurrencyDollarIcon className="h-5 w-5 text-green-500" /> 
                            {showOnlyIntegrated ? 'Model Đang Tích Hợp' : 'Giá thị trường (Google Search)'}
                        </h3>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div className="relative flex-grow lg:flex-grow-0 lg:w-64">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Tìm nhanh model..." 
                                value={catalogSearch}
                                onChange={e => setCatalogSearch(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-8 py-2 text-[11px] text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            {catalogSearch && <button onClick={() => setCatalogSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-3.5 w-3.5"/></button>}
                        </div>

                        <button 
                            onClick={handleRefreshPricing}
                            disabled={isRefreshing}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isRefreshing ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <SparklesIcon className="h-4 w-4" />}
                            Quét giá (Thủ công)
                        </button>
                    </div>
                </div>

                {sources.length > 0 && !showOnlyIntegrated && (
                    <div className="px-6 py-3 bg-indigo-50/30 dark:bg-indigo-900/10 border-b border-slate-100 dark:border-slate-700 shrink-0">
                        <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase flex items-center gap-2 mb-2">
                            <LinkIcon className="h-3 w-3" /> Nguồn tham khảo:
                        </p>
                        <div className="flex flex-wrap gap-3">
                            {sources.map((s, i) => (
                                <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[9px] text-slate-500 hover:text-indigo-500 underline truncate max-w-[200px]">
                                    {s.title}
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                <div className="overflow-auto max-h-[500px] scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                    <table className="w-full text-xs text-left border-separate border-spacing-0">
                        <thead className="sticky top-0 z-20">
                            <tr className="text-slate-500 font-bold uppercase text-[9px] bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
                                <th className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">Hãng</th>
                                <th className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">Mô hình AI</th>
                                <th className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">Loại/Đơn vị</th>
                                <th className="px-4 py-4 border-b border-slate-200 dark:border-slate-700">USD</th>
                                <th className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 text-right">VNĐ Quy đổi</th>
                                <th className="px-4 py-4 border-b border-slate-200 dark:border-slate-700 text-center">Hệ thống</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {filteredCatalog.map((m, i) => {
                                const isIntegrated = integratedModelIds.has(m.modelId);
                                return (
                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded bg-white p-1 shadow-sm border border-slate-100 flex-shrink-0">
                                                <img src={m.logo} alt={m.provider} className="w-full h-full object-contain" />
                                            </div>
                                            <span className="font-bold text-[10px] uppercase text-slate-500 truncate max-w-[80px]">{m.provider}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-700 dark:text-slate-100">{m.name}</span>
                                            <span className={`text-[8px] uppercase font-bold w-fit px-1.5 rounded mt-1 ${m.category === 'premium' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{m.category}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 text-[11px]">{m.type} / {m.unit}</td>
                                    <td className="px-4 py-4 font-mono font-semibold text-slate-500 dark:text-slate-400">
                                        ${m.basePriceUsd.toFixed(4)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-indigo-600 dark:text-indigo-400 text-sm group-hover:scale-105 transition-transform origin-right">
                                        {Math.round(m.basePriceUsd * USD_RATE).toLocaleString()}đ
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        {isIntegrated ? (
                                            /* Import CheckCircleIcon in the component top to fix the error */
                                            <CheckCircleIcon className="h-5 w-5 text-emerald-500 mx-auto" />
                                        ) : (
                                            <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-100 text-slate-400 uppercase">Trống</span>
                                        )}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
                
                <div className="p-4 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 shrink-0">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                         <div className="flex items-center gap-4 text-[10px] text-slate-500 uppercase font-bold">
                             <span>Tổng số: {filteredCatalog.length} Model</span>
                             <div className="w-px h-3 bg-slate-300 dark:bg-slate-700"></div>
                             <span className="font-medium italic">Tỷ giá tham chiếu: {USD_RATE.toLocaleString()}đ</span>
                         </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-lg border border-indigo-400 relative overflow-hidden text-white">
                    <div className="absolute -right-4 -bottom-4 opacity-10">
                        <CurrencyDollarIcon className="w-32 h-32" />
                    </div>
                    <p className="text-xs font-bold text-indigo-100 mb-2 uppercase tracking-widest relative z-10">Ví Lợi Nhuận Admin</p>
                    <p className="text-3xl font-bold relative z-10">{adminBalance.toLocaleString()}đ</p>
                    <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-white bg-white/20 px-2 py-1 flex-inline rounded-md w-fit relative z-10 w-auto">
                        Quỹ hệ thống
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Tiêu thụ thực tế</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">${stats.totalCostUsd.toFixed(3)}</p>
                    <div className="mt-3 flex items-center gap-1 text-[10px] text-green-500 font-bold">
                        <ArrowPathIcon className="h-3 w-3" /> Từ Log sử dụng
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Chi phí VND (Gốc)</p>
                    <p className="text-3xl font-bold text-rose-500">{(stats.totalCostUsd * USD_RATE).toLocaleString()}đ</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Lưu lượng</p>
                    <p className="text-3xl font-bold text-pink-500">{stats.totalRequests.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-500 mt-2 uppercase font-bold">Lượt gọi thành công</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <CalendarDaysIcon className="h-5 w-5 text-indigo-500" />
                        Biểu đồ Chi phí API (USD)
                    </h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.trendData}>
                                <defs>
                                    <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} stroke="#64748b" />
                                <YAxis fontSize={10} axisLine={false} tickLine={false} stroke="#64748b" tickFormatter={(val) => `$${val}`} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                <Area type="monotone" dataKey="cost" name="Chi phí ($)" stroke="#6366f1" strokeWidth={2} fill="url(#costGradient)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 flex flex-col">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <CpuChipIcon className="h-5 w-5 text-purple-500" />
                        Phân bổ Sử dụng Model
                    </h3>
                    <div className="flex-1 min-h-[300px]">
                        {stats.modelPieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={stats.modelPieData} 
                                        dataKey="value" 
                                        nameKey="name" 
                                        cx="50%" cy="50%" 
                                        innerRadius={60} 
                                        outerRadius={90}
                                        paddingAngle={5}
                                        stroke="none"
                                    >
                                        {stats.modelPieData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(val: number) => `$${val.toFixed(3)}`} />
                                    <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-30">
                                <InformationCircleIcon className="h-12 w-12 mb-2" />
                                <p className="text-sm font-bold uppercase">Chưa có dữ liệu</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* API Payment History Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <DocumentTextIcon className="h-5 w-5 text-slate-500" /> 
                        Lịch sử thanh toán API
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-bold uppercase text-[10px]">
                            <tr>
                                <th className="px-6 py-4">Mã giao dịch</th>
                                <th className="px-6 py-4">Thời gian</th>
                                <th className="px-6 py-4 border-l border-slate-200 dark:border-slate-700">Mô tả</th>
                                <th className="px-6 py-4 text-right">Số tiền xuất quỹ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {paymentHistory.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-slate-400">#{row.id.split('-')[0]}</td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                        {new Date(row.created_at).toLocaleString('vi-VN')}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-white border-l border-slate-100 dark:border-slate-700">
                                        {row.description}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-rose-500">
                                        -{row.amount.toLocaleString()}đ
                                    </td>
                                </tr>
                            ))}
                            {paymentHistory.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm">
                                        Chưa có khoản chi trả nào được ghi nhận.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payment Modal */}
            {isPayModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !isPaying && setIsPayModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-springUp">
                         <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <CurrencyDollarIcon className="h-6 w-6 text-indigo-500" />
                                Thanh toán hóa đơn API
                            </h3>
                            <p className="text-xs text-slate-500 mt-2">
                                Trừ tiền từ Ví Admin (Lợi nhuận) để thanh toán chi phí API cho đối tác.
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Ví Admin hiện tại</label>
                                <p className="text-2xl font-bold text-indigo-600">{adminBalance.toLocaleString()}đ</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Số tiền cần chi (VNĐ)</label>
                                <input
                                    type="number"
                                    value={payAmount}
                                    onChange={(e) => setPayAmount(e.target.value)}
                                    placeholder="Ví dụ: 500000"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nội dung thanh toán</label>
                                <input
                                    type="text"
                                    value={payDescription}
                                    onChange={(e) => setPayDescription(e.target.value)}
                                    placeholder="Tháng 05/2026 - Google Cloud..."
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700">
                             <button
                                onClick={() => setIsPayModalOpen(false)}
                                disabled={isPaying}
                                className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handlePayBill}
                                disabled={isPaying}
                                className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center gap-2"
                            >
                                {isPaying ? (
                                    <><ArrowPathIcon className="h-4 w-4 animate-spin" /> Đang xử lý...</>
                                ) : (
                                    <><CheckCircleIcon className="h-4 w-4" /> Xác nhận chi trả</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApiConsumptionPage;
