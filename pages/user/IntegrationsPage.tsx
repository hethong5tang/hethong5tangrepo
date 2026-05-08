import React from 'react';
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

const IntegrationsPage: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
    const { settingsState } = useSettings();
    const { integrationTools } = settingsState.systemSettings;
    
    const enabledTools = integrationTools.filter(tool => tool.enabled);

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
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{tool.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{tool.description}</p>
                </div>
                <div className="p-6 pt-0"><button onClick={() => onUse(tool)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Sử dụng <ArrowRightIcon className="h-4 w-4" /></button></div>
            </div>
        );
    };

    return (
        <div className="space-y-12">
            <div className="text-center"><h2 className="text-3xl font-bold">Kho Tiện Ích & AI</h2><p className="mt-2 max-w-2xl mx-auto text-slate-500">Khám phá các công cụ và tiện ích AI được thiết kế để giúp bạn phát triển.</p></div>
            {enabledTools.length > 0 ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{enabledTools.map((tool) => (<ToolCard key={tool.id} tool={tool} onUse={handleUseTool} />))}</div>)
            : (<div className="text-center py-20 text-slate-500"><PuzzlePieceIcon className="h-12 w-12 mx-auto text-slate-400 mb-4" /><p className="font-semibold text-lg">Chưa có tiện ích nào</p><p className="mt-1">Vui lòng quay lại sau.</p></div>)}
        </div>
    );
};

export default IntegrationsPage;