
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { ArrowLeftIcon, FrameIcon, AspectRatio169Icon, AspectRatio43Icon, AspectRatio11Icon, AspectRatio34Icon, AspectRatio916Icon, ArrowPathIcon, SparklesIcon } from '../../Icons';
import { IntegrationTool, IntegrationType } from '../../../features/settings/types';
import { useAuth } from '../../../features/auth/useAuth';
import { useUser } from '../../../features/users/useUser';
import { useActions } from '../../../features/actions/useActions';
import { useToast } from '../../../components/ToastProvider';
import { findUserInTree } from '../../../services/userService';

const aspectRatios = [
    { name: '16:9', w: 16, h: 9, icon: AspectRatio169Icon },
    { name: '4:3', w: 4, h: 3, icon: AspectRatio43Icon },
    { name: '1:1', w: 1, h: 1, icon: AspectRatio11Icon },
    { name: '3:4', w: 3, h: 4, icon: AspectRatio34Icon },
    { name: '9:16', w: 9, h: 16, icon: AspectRatio916Icon },
];

interface ExpandViewProps {
    image: { src: string, prompt: string };
    onBack: () => void;
    onGenerate: (result: {
        newImage: string;
        originalPrompt: string;
        expandPrompt: string;
        cost: number;
        balanceAfter: number;
        aspectRatio: { name: string, width: number, height: number };
    }) => void;
    tool: IntegrationTool;
}

const ExpandView: React.FC<ExpandViewProps> = ({ image, onBack, onGenerate, tool }) => {
    const [expandPrompt, setExpandPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const { loggedInUser } = useAuth();
    const { userState } = useUser();
    const { handleUseToolCredit } = useActions();
    const { addToast } = useToast();

    // Use correct key from environment
    const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || '';

    const [selectedAspectRatio, setSelectedAspectRatio] = useState(aspectRatios[0]);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(new Image());
    const imgPos = useRef({ x: 0, y: 0, scale: 1, initScale: 1 });
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);

    const redraw = () => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img.complete) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw transparency grid/background
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw checkered pattern for transparency indication
        const patternSize = 20;
        for(let x=0; x<canvas.width; x+=patternSize) {
            for(let y=0; y<canvas.height; y+=patternSize) {
                ctx.fillStyle = (Math.floor(x/patternSize) + Math.floor(y/patternSize)) % 2 === 0 ? '#1f2937' : '#111827';
                ctx.fillRect(x, y, patternSize, patternSize);
            }
        }
        
        const scaledWidth = img.width * imgPos.current.scale;
        const scaledHeight = img.height * imgPos.current.scale;

        ctx.drawImage(img, imgPos.current.x, imgPos.current.y, scaledWidth, scaledHeight);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 2;
        ctx.strokeRect(imgPos.current.x, imgPos.current.y, scaledWidth, scaledHeight);
        ctx.setLineDash([]);
        
        // Dim the outside area
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.rect(0, 0, canvas.width, canvas.height);
        ctx.rect(imgPos.current.x, imgPos.current.y, scaledWidth, scaledHeight);
        ctx.fill('evenodd');
    };

    const resetImagePos = () => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img.complete) return;
        
        const canvasRatio = canvas.width / canvas.height;
        const imgRatio = img.width / img.height;
        let scale;
        if(imgRatio > canvasRatio) {
            scale = canvas.width / img.width * 0.75;
        } else {
            scale = canvas.height / img.height * 0.75;
        }
        
        imgPos.current = {
            scale: scale,
            initScale: scale,
            x: (canvas.width - img.width * scale) / 2,
            y: (canvas.height - img.height * scale) / 2,
        };
        setZoom(1);
        redraw();
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const img = imgRef.current;
        img.crossOrigin = "anonymous";
        img.src = image.src;

        const handleResize = () => {
            const containerW = container.clientWidth;
            const containerH = container.clientHeight;
            const targetRatio = selectedAspectRatio.w / selectedAspectRatio.h;

            let canvasW, canvasH;
            if ((containerW / containerH) > targetRatio) {
                canvasH = containerH * 0.9;
                canvasW = canvasH * targetRatio;
            } else {
                canvasW = containerW * 0.9;
                canvasH = canvasW / targetRatio;
            }
            canvas.width = canvasW;
            canvas.height = canvasH;
            
            if (img.complete) {
                resetImagePos();
            }
        };

        img.onload = handleResize;
        if (img.complete) handleResize();

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);

        return () => resizeObserver.disconnect();
    }, [image.src, selectedAspectRatio]);

    const startPan = (e: React.MouseEvent) => {
        isDragging.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY };
    };

    const pan = (e: React.MouseEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        imgPos.current.x += dx;
        imgPos.current.y += dy;
        dragStart.current = { x: e.clientX, y: e.clientY };
        redraw();
    };

    const endPan = () => {
        isDragging.current = false;
    };
    
    const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newZoom = parseFloat(e.target.value);
        setZoom(newZoom);

        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img.complete) return;

        const oldScale = imgPos.current.scale;
        const newScale = imgPos.current.initScale * newZoom;

        const centerX = imgPos.current.x + (img.width * oldScale) / 2;
        const centerY = imgPos.current.y + (img.height * oldScale) / 2;

        imgPos.current.scale = newScale;
        imgPos.current.x = centerX - (img.width * newScale) / 2;
        imgPos.current.y = centerY - (img.height * newScale) / 2;

        redraw();
    };


    const handleGenerate = async () => {
        if (isGenerating || !loggedInUser) return;

        const cost = tool.creditCost; 
        const freshUser = findUserInTree(userState.allUsers, loggedInUser.id);
        if (!freshUser || freshUser.creditBalance < cost) {
            addToast(`Số dư không đủ. Bạn cần ${cost} Credit nhưng chỉ có ${freshUser?.creditBalance || 0} Credit.`, 'error');
            return;
        }

        setIsGenerating(true);

        const creditResult = await handleUseToolCredit(loggedInUser.id, { ...tool, creditCost: cost });
        if (!creditResult.success) {
            setIsGenerating(false);
            return;
        }

        const displayCanvas = canvasRef.current;
        if (!displayCanvas) { setIsGenerating(false); return; }

        // Increase resolution for high quality expand
        const finalWidth = 2048; // Increased from 1024 to 2048 for sharper results
        const finalHeight = Math.round(finalWidth * (selectedAspectRatio.h / selectedAspectRatio.w));

        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = finalWidth;
        finalCanvas.height = finalHeight;
        const finalCtx = finalCanvas.getContext('2d');
        if (!finalCtx) { setIsGenerating(false); return; }
        
        // Important: We must NOT draw a background color here. We want transparency.
        finalCtx.clearRect(0, 0, finalWidth, finalHeight);

        const scaleFactor = finalWidth / displayCanvas.width;
        
        // Draw the original image onto the high-res canvas at correct position
        finalCtx.drawImage(
            imgRef.current,
            imgPos.current.x * scaleFactor,
            imgPos.current.y * scaleFactor,
            imgRef.current.width * imgPos.current.scale * scaleFactor,
            imgRef.current.height * imgPos.current.scale * scaleFactor
        );
        
        const imageDataUrl = finalCanvas.toDataURL('image/png');

        try {
            const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
            const imagePart = { inlineData: { data: imageDataUrl.split(',')[1], mimeType: 'image/png' } };

            const finalExpandPrompt = expandPrompt.trim();
            
            // Clean up original prompt to remove prefixes like [Ảnh] or [Style: ...]
            const cleanOriginalPrompt = image.prompt.replace(/^\[.*?\]\s*/, '');

            const textPart = { text: `TASK: Outpainting / Image Extension (High Fidelity).
INPUT: An image placed on a transparent canvas (alpha channel).
INSTRUCTIONS:
1. Analyze the visible central image.
2. Generate content to fill the TRANSPARENT areas of the canvas.
3. The new content must blend seamlessly with the original image edges.
4. Maintain the exact style, lighting, texture, and perspective of the original.
5. ENSURE HIGH RESOLUTION DETAILS in the extended areas. Match the grain and sharpness of the original.
6. ORIGINAL SCENE DESCRIPTION: "${cleanOriginalPrompt}".
7. USER ADDITIONAL REQUEST (for the extended area): "${finalExpandPrompt}".
OUTPUT: A complete, fully filled image.` };

            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: { parts: [imagePart, textPart] },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const newImagePart = response.candidates?.[0]?.content?.parts[0];
            if (newImagePart && newImagePart.inlineData?.data) {
                const newImage = `data:${newImagePart.inlineData.mimeType};base64,${newImagePart.inlineData.data}`;
                onGenerate({
                    newImage,
                    originalPrompt: image.prompt,
                    expandPrompt: finalExpandPrompt,
                    cost,
                    balanceAfter: freshUser.creditBalance - cost,
                    aspectRatio: { name: selectedAspectRatio.name, width: finalWidth, height: finalHeight },
                });
            } else {
                throw new Error("API did not return a valid image.");
            }
        } catch (error) {
            console.error("Lỗi AI Expand:", error);
            addToast('Mở rộng ảnh thất bại, Credit đã được hoàn lại.', 'error');
            const userForRefund = findUserInTree(userState.allUsers, loggedInUser.id);
            if(userForRefund) {
                handleUseToolCredit(userForRefund.id, { ...tool, creditCost: -cost });
            }
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="h-full w-full bg-[#111827] text-gray-300 flex flex-col">
            <header className="flex-shrink-0 h-16 flex items-center justify-between px-4">
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white p-2 rounded-lg bg-black/20 hover:bg-black/40 transition-colors">
                    <ArrowLeftIcon className="h-5 w-5" />
                    <span>Quay lại</span>
                </button>
                <h2 className="font-bold text-lg">Mở rộng Ảnh (High Quality)</h2>
                <div className="w-8"></div>
            </header>
            <div className="flex-1 flex overflow-hidden">
                <aside className="w-24 bg-[#1e1e1e] p-2 space-y-2 flex flex-col items-center border-r border-gray-700">
                    <button onClick={resetImagePos} className="p-3 rounded-md bg-indigo-600 w-full" title="Căn giữa"><FrameIcon className="h-6 w-6 mx-auto" /></button>
                    {aspectRatios.map(ar => {
                        const Icon = ar.icon;
                        return (
                            <button key={ar.name} onClick={() => setSelectedAspectRatio(ar)} className={`p-3 rounded-md w-full transition-colors ${selectedAspectRatio.name === ar.name ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>
                                <Icon className="h-6 w-6 mx-auto"/>
                            </button>
                        )
                    })}
                </aside>
                <main ref={containerRef} className="flex-1 flex items-center justify-center p-4 bg-black relative overflow-hidden" style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}>
                    <canvas ref={canvasRef} onMouseDown={startPan} onMouseMove={pan} onMouseUp={endPan} onMouseLeave={endPan} />
                </main>
            </div>
            <footer className="flex-shrink-0 h-28 bg-[#1e1e1e] px-4 flex flex-col items-center justify-center gap-3 border-t border-gray-700">
                <div className="flex items-center gap-4 w-full max-w-lg">
                    <span className="text-xs">Thu phóng</span>
                    <input type="range" min="0.5" max="2" step="0.01" value={zoom} onChange={handleZoomChange} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div className="flex items-center gap-4 w-full max-w-3xl">
                    <input type="text" value={expandPrompt} onChange={e => setExpandPrompt(e.target.value)} placeholder="Mô tả nội dung bạn muốn mở rộng (tùy chọn)..." className="flex-grow px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-full focus:ring-indigo-500 focus:border-indigo-500 text-white"/>
                    <button onClick={handleGenerate} disabled={isGenerating} className="px-6 py-2 bg-cyan-500 text-black font-semibold rounded-full disabled:bg-cyan-300/50 flex items-center justify-center gap-2 shadow-lg">
                        {isGenerating ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <SparklesIcon className="h-5 w-5" />}
                        {isGenerating ? 'Đang tạo...' : `Tạo (${tool.creditCost} Credit)`}
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default ExpandView;
