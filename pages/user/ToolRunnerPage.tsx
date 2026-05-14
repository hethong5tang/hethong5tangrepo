
import React, { useState, useEffect } from 'react';
import { IntegrationTool, IntegrationType } from '../../features/settings/types';
import TextGenerator from '../../components/tools/TextGenerator';
import PhotoRestoration from '../../components/tools/PhotoRestoration';
import ImageGenerator from '../../components/tools/ImageGenerator';
import VideoEditor from '../../components/tools/VideoEditor';
import VectorizeTool from '../../components/tools/VectorizeTool';
import HairstyleProTool from '../../components/tools/HairstyleProTool';
import AiBackgroundRemoverPage from '../../components/tools/AiBackgroundRemoverPage';
import AiVideoGenerator from '../../components/tools/AiVideoGenerator';
import FaceSwapTool from '../../components/tools/FaceSwapTool';
import AdCreatorTool from '../../components/tools/AdCreatorTool';
import FashionStudioTool from '../../components/tools/FashionStudioTool';
import PortraitEditor from '../../components/tools/PortraitEditor';
import ImageToTextTool from '../../components/tools/ImageToTextTool';
import MockupGeneratorTool from '../../components/tools/MockupGeneratorTool';
import FashionDesignerTool from '../../components/tools/FashionDesignerTool';
import InteriorDesignTool from '../../components/tools/InteriorDesignTool';
import ImageMixerTool from '../../components/tools/ImageMixerTool';
import MenuDesignerTool from '../../components/tools/MenuDesignerTool';
import { checkApiKey, requestApiKey } from '../../services/aiService';
import { InformationCircleIcon, ArrowLeftIcon } from '../../components/Icons';

interface ToolRunnerPageProps {
    tool: IntegrationTool;
    onNavigate: (page: string) => void;
}

const ToolRunnerPage: React.FC<ToolRunnerPageProps> = ({ tool, onNavigate }) => {
    const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

    useEffect(() => {
        const verifyKey = async () => {
            const hasKey = await checkApiKey();
            setHasApiKey(hasKey);
        };
        verifyKey();
    }, [tool.id]);

    const renderBanner = () => {
        if (hasApiKey !== false) return null;
        
        return (
            <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 p-3 flex items-center justify-between z-50 sticky top-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <InformationCircleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                        <span className="font-bold">Cần API Key:</span> Vui lòng chọn API Key từ bảng điều khiển để sử dụng công cụ này.
                    </p>
                </div>
                <button 
                    onClick={async () => {
                        await requestApiKey();
                        const hasKey = await checkApiKey();
                        setHasApiKey(hasKey);
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-all shadow-md"
                >
                    Chọn ngay
                </button>
            </div>
        );
    };

    const wrapTool = (component: React.ReactNode) => (
        <div className="h-full flex flex-col relative overflow-hidden">
            {renderBanner()}
            <div className="flex-1 overflow-hidden">
                {component}
            </div>
        </div>
    );
    
    // Render specific components for advanced tools
    if (tool.id === 'tool_content_writer') {
        return wrapTool(<TextGenerator tool={tool} onNavigate={onNavigate} />);
    }
    if (tool.id === 'tool_photo_restore') {
        return wrapTool(<PhotoRestoration tool={tool} onNavigate={onNavigate} />);
    }
    if (tool.id === 'tool_image_gen_gemini') {
        return wrapTool(<ImageGenerator tool={tool} onNavigate={onNavigate} />);
    }
    if (tool.id === 'tool_video_editor') {
        return wrapTool(<VideoEditor tool={tool} onNavigate={onNavigate} />);
    }
    if (tool.id === 'tool_vectorizer') {
        return wrapTool(<VectorizeTool tool={tool} onNavigate={onNavigate} />);
    }
    if (tool.id === 'tool_hairstyle_pro') {
        return wrapTool(<HairstyleProTool tool={tool} onNavigate={onNavigate} />);
    }
    if (tool.id === 'tool_bg_remover') {
        return wrapTool(<AiBackgroundRemoverPage tool={tool} onNavigate={onNavigate} />);
    }
    if (tool.id === 'tool_ai_video_gen') {
        return wrapTool(<AiVideoGenerator tool={tool} onNavigate={onNavigate} />);
    }
    if (tool.id === 'tool_face_swap') {
        return wrapTool(<FaceSwapTool tool={tool} onNavigate={onNavigate} />);
    }
    if (tool.id === 'tool_ad_creator') {
        return wrapTool(<AdCreatorTool tool={tool} onNavigate={onNavigate} />);
    }
    if (tool.id === 'tool_fashion_studio') {
        return wrapTool(<FashionStudioTool tool={tool} onNavigate={onNavigate} />);
    }
    if (tool.id === 'tool_portrait_editor') {
        return wrapTool(<PortraitEditor tool={tool} onNavigate={onNavigate} />);
    }
    if (tool.id === 'tool_ocr_pro') {
        return wrapTool(<ImageToTextTool tool={tool} onNavigate={onNavigate} />);
    }
    if (tool.id === 'tool_mockup_generator') {
        return wrapTool(<MockupGeneratorTool tool={tool} onNavigate={onNavigate} />);
    }
    if (tool.id === 'tool_fashion_designer') {
        return wrapTool(<FashionDesignerTool tool={tool} onNavigate={onNavigate} />);
    }
    if (tool.id === 'tool_interior_design') {
        return wrapTool(<InteriorDesignTool tool={tool} onNavigate={onNavigate} />);
    }
    if (tool.id === 'tool_image_mixer') {
        return wrapTool(<ImageMixerTool tool={tool} onNavigate={onNavigate} />);
    }
    if (tool.id === 'tool_menu_designer') {
        return wrapTool(<MenuDesignerTool tool={tool} onNavigate={onNavigate} />);
    }

    // Generic Runner for other types (Link, Embed, etc.)
    return (
        <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 text-center">
             <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">{tool.title}</h2>
             <p className="text-slate-600 dark:text-slate-400 mb-6">{tool.description}</p>
             
             {tool.type === IntegrationType.Link && tool.link && (
                 <a 
                    href={tool.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                 >
                     Mở công cụ (Tab mới)
                 </a>
             )}
             
             {tool.type === IntegrationType.Embed && tool.embedCode && (
                 <div className="w-full h-full border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden" dangerouslySetInnerHTML={{ __html: tool.embedCode }} />
             )}
             
             {!tool.link && !tool.embedCode && (
                 <p className="text-yellow-600 dark:text-yellow-400">Công cụ này chưa được cấu hình hoặc đang bảo trì.</p>
             )}
             
             <button onClick={() => onNavigate('Kho Tiện Ích')} className="mt-8 text-sm text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 underline">
                 Quay lại kho tiện ích
             </button>
        </div>
    );
};

export default ToolRunnerPage;
