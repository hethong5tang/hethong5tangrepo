import React, { useState, useMemo } from 'react';
import { SparklesIcon, UserCircleIcon, ChartBarIcon, CurrencyDollarIcon, PuzzlePieceIcon, CpuChipIcon, ArrowRightIcon, CheckBadgeIcon, ComputerDesktopIcon } from '../../components/Icons';
import { useSettings } from '../../features/settings/useSettings';
import { IntegrationTool } from '../../features/settings/types';

const iconMap: Record<string, React.FC<{className?: string}>> = {
    SparklesIcon,
    UserCircleIcon,
    ChartBarIcon,
    CurrencyDollarIcon,
    PuzzlePieceIcon,
    CpuChipIcon,
    ComputerDesktopIcon,
};

const toolCategories: Record<string, string> = {
    tool_menu_designer: 'Ảnh',
    tool_interior_design: 'Ảnh',
    tool_fashion_designer: 'Ảnh',
    tool_image_mixer: 'Ảnh',
    tool_content_writer: 'Văn bản',
    tool_image_gen_gemini: 'Ảnh',
    tool_video_editor: 'Video',
    tool_vectorizer: 'Ảnh',
    tool_hairstyle_pro: 'Ảnh',
    tool_photo_restore: 'Ảnh',
    tool_bg_remover: 'Ảnh',
    tool_ai_video_gen: 'Video',
    tool_face_swap: 'Ảnh',
    tool_ad_creator: 'Ảnh',
    tool_fashion_studio: 'Ảnh',
    tool_portrait_editor: 'Ảnh',
    tool_ocr_pro: 'Văn bản',
    tool_mockup_generator: 'Ảnh'
};

const getToolCategory = (tool: IntegrationTool): string => {
    const rawCat = tool.category || toolCategories[tool.id] || 'Tiện ích';
    if (rawCat === 'image' || rawCat === 'Ảnh') return 'Ảnh';
    if (rawCat === 'text' || rawCat === 'Văn bản') return 'Văn bản';
    if (rawCat === 'video' || rawCat === 'Video') return 'Video';
    if (rawCat === 'audio' || rawCat === 'Âm thanh') return 'Âm thanh';
    return rawCat;
};

const CATEGORIES = ['Tất cả', 'Ảnh', 'Văn bản', 'Video', 'Âm thanh', 'Tiện ích'];

const IntegrationsPage: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
    const { settingsState } = useSettings();
    const { integrationTools } = settingsState.systemSettings;
    const [activeTab, setActiveTab] = useState('Tất cả');
    
    const enabledTools = integrationTools.filter(tool => tool.enabled);
    
    const displayedTools = useMemo(() => {
        if (activeTab === 'Tất cả') return enabledTools;
        return enabledTools.filter(tool => getToolCategory(tool) === activeTab);
    }, [enabledTools, activeTab]);

    const handleUseTool = (tool: IntegrationTool) => {
        onNavigate(`Kho Tiện Ích/${tool.id}`);
    };
    
    const ToolCard: React.FC<{ tool: IntegrationTool; onUse: (tool: IntegrationTool) => void; }> = ({ tool, onUse }) => {
        const Icon = iconMap[tool.icon] || PuzzlePieceIcon;
        return (
            <div className="group relative flex flex-col rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl shadow-lg ring-1 ring-black/[.05] dark:ring-white/[.1] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10">
                <div className="p-6 flex-grow">
                    <div className="flex justify-between items-start">
                        <div className="mb-4 inline-block p-4 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-400 text-white shadow-lg">
                             {tool.customIconUrl ? <img src={tool.customIconUrl} alt={tool.title} className="h-7 w-7 object-contain" /> : <Icon className="h-7 w-7" />}
                        </div>
                        {tool.creditCost > 0 ? (<div className="px-2.5 py-1 text-xs font-bold text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center gap-1"><SparklesIcon className="h-3 w-3" /> {tool.creditCost} Credit</div>)
                        : (<div className="px-2.5 py-1 text-xs font-bold text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center gap-1.5"><CheckBadgeIcon className="h-4 w-4" /> Miễn phí</div>)}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full">{getToolCategory(tool)}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{tool.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{tool.description}</p>
                </div>
                <div className="p-6 pt-0"><button onClick={() => onUse(tool)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Sử dụng <ArrowRightIcon className="h-4 w-4" /></button></div>
            </div>
        );
    };

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold">Kho Tiện Ích & AI</h2>
                <p className="mt-2 max-w-2xl mx-auto text-slate-500">Khám phá các công cụ và tiện ích AI được thiết kế để giúp bạn phát triển.</p>
            </div>
            
            <div className="flex justify-center mt-6">
                <div className="bg-white/60 dark:bg-slate-800/60 p-1 rounded-xl backdrop-blur-md shadow-sm border border-slate-200/50 dark:border-slate-700/50 inline-flex flex-wrap gap-1 max-w-full justify-center">
                    {CATEGORIES.map(category => {
                        const count = category === 'Tất cả' ? enabledTools.length : enabledTools.filter(t => getToolCategory(t) === category).length;
                        if (count === 0 && category !== 'Tất cả') return null; // Ẩn tab nếu không có công cụ
                        return (
                            <button
                                key={category}
                                onClick={() => setActiveTab(category)}
                                className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === category ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'}`}
                            >
                                {category} <span className={`ml-1 text-xs opacity-70 ${activeTab === category ? 'text-indigo-100' : ''}`}>({count})</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {displayedTools.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedTools.map((tool) => (<ToolCard key={tool.id} tool={tool} onUse={handleUseTool} />))}
                </div>
            ) : (
                <div className="text-center py-20 text-slate-500">
                    <PuzzlePieceIcon className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                    <p className="font-semibold text-lg">Không tìm thấy công cụ nào</p>
                    <p className="mt-1">Vui lòng chọn danh mục khác hoặc quay lại sau.</p>
                </div>
            )}
        </div>
    );
};

export default IntegrationsPage;