
import React from 'react';
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

interface ToolRunnerPageProps {
    tool: IntegrationTool;
    onNavigate: (page: string) => void;
}

const ToolRunnerPage: React.FC<ToolRunnerPageProps> = ({ tool, onNavigate }) => {
    
    // Render specific components for advanced tools
    if (tool.id === 'tool_content_writer') {
        return <TextGenerator tool={tool} onNavigate={onNavigate} />;
    }
    if (tool.id === 'tool_photo_restore') {
        return <PhotoRestoration tool={tool} onNavigate={onNavigate} />;
    }
    if (tool.id === 'tool_image_gen_gemini') {
        return <ImageGenerator tool={tool} onNavigate={onNavigate} />;
    }
    if (tool.id === 'tool_video_editor') {
        return <VideoEditor tool={tool} onNavigate={onNavigate} />;
    }
    if (tool.id === 'tool_vectorizer') {
        return <VectorizeTool tool={tool} onNavigate={onNavigate} />;
    }
    if (tool.id === 'tool_hairstyle_pro') {
        return <HairstyleProTool tool={tool} onNavigate={onNavigate} />;
    }
    if (tool.id === 'tool_bg_remover') {
        return <AiBackgroundRemoverPage tool={tool} onNavigate={onNavigate} />;
    }
    if (tool.id === 'tool_ai_video_gen') {
        return <AiVideoGenerator tool={tool} onNavigate={onNavigate} />;
    }
    if (tool.id === 'tool_face_swap') {
        return <FaceSwapTool tool={tool} onNavigate={onNavigate} />;
    }
    if (tool.id === 'tool_ad_creator') {
        return <AdCreatorTool tool={tool} onNavigate={onNavigate} />;
    }
    if (tool.id === 'tool_fashion_studio') {
        return <FashionStudioTool tool={tool} onNavigate={onNavigate} />;
    }
    if (tool.id === 'tool_portrait_editor') {
        return <PortraitEditor tool={tool} onNavigate={onNavigate} />;
    }
    if (tool.id === 'tool_ocr_pro') {
        return <ImageToTextTool tool={tool} onNavigate={onNavigate} />;
    }
    if (tool.id === 'tool_mockup_generator') {
        return <MockupGeneratorTool tool={tool} onNavigate={onNavigate} />;
    }
    if (tool.id === 'tool_fashion_designer') {
        return <FashionDesignerTool tool={tool} onNavigate={onNavigate} />;
    }
    if (tool.id === 'tool_interior_design') {
        return <InteriorDesignTool tool={tool} onNavigate={onNavigate} />;
    }
    if (tool.id === 'tool_image_mixer') {
        return <ImageMixerTool tool={tool} onNavigate={onNavigate} />;
    }
    if (tool.id === 'tool_menu_designer') {
        return <MenuDesignerTool tool={tool} onNavigate={onNavigate} />;
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
