
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { ArrowLeftIcon, EraserIcon, PaintBrushIcon, ArrowPathIcon } from '../../Icons';
import { IntegrationTool } from '../../../features/settings/types';
import { useAuth } from '../../../features/auth/useAuth';
import { useUser } from '../../../features/users/useUser';
import { useActions } from '../../../features/actions/useActions';
import { useToast } from '../../../components/ToastProvider';
import { findUserInTree } from '../../../services/userService';

interface ImageEditorViewProps {
    image: { src: string; prompt: string };
    initialMode: 'erase' | 'repaint';
    onBack: () => void;
    onGenerate: (result: {
        newImage: string;
        originalPrompt: string;
        editPrompt?: string; // Prompt for repaint
        mode: 'erase' | 'repaint';
        cost: number;
        balanceAfter: number;
    }) => void;
    tool: IntegrationTool;
}

const ImageEditorView: React.FC<ImageEditorViewProps> = ({ image, initialMode, onBack, onGenerate, tool }) => {
    const { loggedInUser } = useAuth();
    const { userState } = useUser();
    const { handleUseToolCredit } = useActions();
    const { addToast } = useToast();

    // Use correct key from environment
    const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    
    const [mode, setMode] = useState<'erase' | 'repaint'>(initialMode);
    const [isGenerating, setIsGenerating] = useState(false);
    const [brushSize, setBrushSize] = useState(40);
    const [repaintPrompt, setRepaintPrompt] = useState('');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    
    // Keep track of original image dimensions
    const imgRef = useRef<HTMLImageElement>(new Image());

    useEffect(() => {
        const img = imgRef.current;
        img.crossOrigin = "anonymous";
        img.src = image.src;
        img.onload = () => {
            initCanvas();
        };
    }, [image.src]);

    const initCanvas = () => {
        const canvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        const img = imgRef.current;

        if (canvas && maskCanvas && img.complete) {
            // Set internal resolution to match original image
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            maskCanvas.width = img.naturalWidth;
            maskCanvas.height = img.naturalHeight;

            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            
            // Clear mask
            const maskCtx = maskCanvas.getContext('2d');
            if (maskCtx) {
                maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
            }
        }
    };
    
    const resetMask = () => {
        const canvas = maskCanvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    const getMousePos = (canvas: HTMLCanvasElement, evt: React.MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (evt.clientX - rect.left) * scaleX,
            y: (evt.clientY - rect.top) * scaleY
        };
    };

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing.current) return;
        const canvas = maskCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const pos = getMousePos(canvas, e);

        if (ctx) {
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        }
    };
    
    const startDrawing = (e: React.MouseEvent) => {
        const canvas = maskCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const pos = getMousePos(canvas, e);
        if (ctx) {
            isDrawing.current = true;
            ctx.beginPath();
            ctx.lineWidth = brushSize; // This is now relative to actual image size due to canvas scaling
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            // Use pure Red for the mask so AI can identify it easily
            ctx.strokeStyle = '#FF0000'; 
            ctx.moveTo(pos.x, pos.y);
        }
    };

    const stopDrawing = () => {
        isDrawing.current = false;
        const ctx = maskCanvasRef.current?.getContext('2d');
        ctx?.closePath();
    };

    const handleGenerate = async () => {
        if (isGenerating || !loggedInUser) return;
        if (mode === 'repaint' && !repaintPrompt.trim()) {
            addToast('Vui lòng nhập mô tả để vẽ lại.', 'info');
            return;
        }
        
        const cost = tool.creditCost; 
        const freshUser = findUserInTree(userState.allUsers, loggedInUser.id);
        if (!freshUser || freshUser.creditBalance < cost) {
            addToast(`Số dư không đủ. Bạn cần ${cost} Credit nhưng chỉ có ${freshUser?.creditBalance || 0} Credit.`, 'error');
            return;
        }
    
        setIsGenerating(true);
        const baseCanvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;

        if (!baseCanvas || !maskCanvas) { setIsGenerating(false); return; }

        // 1. Prepare the Composite Image for AI (Original + Red Mask)
        const aiInputCanvas = document.createElement('canvas');
        aiInputCanvas.width = baseCanvas.width;
        aiInputCanvas.height = baseCanvas.height;
        const aiCtx = aiInputCanvas.getContext('2d');
        if (!aiCtx) { setIsGenerating(false); return; }
        
        aiCtx.drawImage(baseCanvas, 0, 0);
        aiCtx.drawImage(maskCanvas, 0, 0); // Draw red strokes on top
    
        const creditResult = await handleUseToolCredit(loggedInUser.id, { ...tool, creditCost: cost });
        if (!creditResult.success) {
            setIsGenerating(false);
            return;
        }
    
        try {
            const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
    
            const compositeImagePart = { inlineData: { data: aiInputCanvas.toDataURL('image/png').split(',')[1], mimeType: 'image/png' } };
            
            // CẢI TIẾN PROMPT: Yêu cầu AI không sáng tạo bừa bãi
            const systemInstruction = mode === 'erase' 
                ? `TASK: High-Fidelity Object Removal (Clean Inpainting).
INPUT: Image with RED MASK areas.
OBJECTIVE: Completely remove all objects covered by the red mask.
INSTRUCTION: 
1. ANALYZE SURROUNDINGS: Identify the texture, color, and lighting of the background IMMEDIATELY ADJACENT to the red mask.
2. TEXTURE SYNTHESIS: Fill the red areas by extending the existing background patterns (e.g., grass, floor, wall, sky). 
3. SEAMLESS BLENDING: The transitions must be perfect. Match the film grain or digital noise of the original photo.
4. STRICT NEGATIVE CONSTRAINT: DO NOT add new objects, people, animals, or details. Keep it empty.
5. PRESERVE UNMASKED AREAS: Do not modify any pixels outside the red mask.
Output the full cleaned image.`
                : `TASK: Generative Image Editing (Inpainting).
INPUT: Image with RED MASK areas.
USER REQUEST: "${repaintPrompt}"
OBJECTIVE: Replace the red-masked area with the item described in the USER REQUEST.
INSTRUCTION:
1. FOCUS: Only generate content within the red area.
2. INTEGRATION: Blend the new content with the lighting and perspective of the original photo.
3. COHESION: The result must look like a single, untouched photograph.
Output the full edited image.`;

            const textPart = { text: systemInstruction };
    
            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: { parts: [compositeImagePart, textPart] },
                config: { responseModalities: [Modality.IMAGE] },
            });
            
            const newImagePart = response.candidates?.[0]?.content?.parts[0];
            if (newImagePart && newImagePart.inlineData?.data) {
                const aiGeneratedBase64 = `data:${newImagePart.inlineData.mimeType};base64,${newImagePart.inlineData.data}`;
                
                onGenerate({
                    newImage: aiGeneratedBase64,
                    originalPrompt: image.prompt,
                    editPrompt: mode === 'repaint' ? repaintPrompt : undefined,
                    mode,
                    cost,
                    balanceAfter: freshUser.creditBalance - cost,
                });
            } else {
                throw new Error("API did not return a valid image.");
            }
        } catch (error) {
            console.error(`Lỗi AI ${mode}:`, error);
            addToast('Thao tác ảnh thất bại, Credit đã được hoàn lại.', 'error');
            const userForRefund = findUserInTree(userState.allUsers, loggedInUser.id);
            if(userForRefund) {
                handleUseToolCredit(userForRefund.id, { ...tool, creditCost: -cost });
            }
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="h-full w-full bg-[#1e1e1e] text-gray-300 flex flex-col">
            <header className="h-16 flex-shrink-0 bg-[#2d2d2d] flex items-center justify-between px-4 border-b border-gray-700">
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <h2 className="font-bold text-lg">Chỉnh sửa Ảnh AI</h2>
                <div className="w-8"></div>
            </header>
            <div className="flex flex-1 overflow-hidden">
                <aside className="w-64 bg-[#2d2d2d] p-4 space-y-6 flex flex-col">
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-400">Chế độ</p>
                        <button onClick={() => setMode('erase')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${mode === 'erase' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-700'}`}>
                            <EraserIcon className="h-5 w-5"/>
                            <span>Xóa vật thể</span>
                        </button>
                        <button onClick={() => setMode('repaint')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${mode === 'repaint' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-700'}`}>
                            <PaintBrushIcon className="h-5 w-5"/>
                            <span>Vẽ lại</span>
                        </button>
                    </div>
                    <div className="p-3 bg-gray-900/50 rounded-lg">
                        <label className="text-sm font-medium">Kích thước Bút</label>
                        <div className="flex items-center gap-2">
                            <input type="range" min="10" max="200" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                            <span className="text-sm w-8 text-center">{brushSize}</span>
                        </div>
                    </div>
                     <div className="mt-auto flex flex-col gap-2">
                        <button onClick={resetMask} className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg">Xóa vùng chọn</button>
                    </div>
                </aside>
                <main className="flex-1 flex flex-col items-center justify-center p-4 bg-black relative overflow-auto">
                    <div className="relative shadow-2xl" style={{ cursor: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${brushSize}" height="${brushSize}" viewBox="0 0 ${brushSize} ${brushSize}"><circle cx="${brushSize/2}" cy="${brushSize/2}" r="${brushSize/2 - 2}" fill="none" stroke="white" stroke-width="2" stroke-dasharray="4,4" /></svg>') ${brushSize/2} ${brushSize/2}, auto`}}>
                        <canvas ref={canvasRef} className="max-w-full max-h-[calc(100vh-200px)] object-contain rounded-lg pointer-events-none" />
                        <canvas 
                            ref={maskCanvasRef} 
                            className="absolute top-0 left-0 w-full h-full object-contain rounded-lg opacity-60" 
                            onMouseDown={startDrawing} 
                            onMouseMove={draw} 
                            onMouseUp={stopDrawing} 
                            onMouseLeave={stopDrawing}
                        />
                    </div>
                    <div className="absolute bottom-6 flex flex-col items-center gap-4 w-full px-8 pointer-events-none">
                         <div className="flex items-center gap-4 w-full max-w-3xl pointer-events-auto">
                            {mode === 'repaint' && (
                                <input type="text" value={repaintPrompt} onChange={e => setRepaintPrompt(e.target.value)} placeholder="Mô tả nội dung bạn muốn vẽ lại vào vùng đã chọn..." className="flex-grow px-4 py-3 bg-gray-800/90 border border-gray-600 rounded-full focus:ring-indigo-500 focus:border-indigo-500 text-white placeholder-gray-400 backdrop-blur-sm shadow-xl"/>
                            )}
                            <button onClick={handleGenerate} disabled={isGenerating || (mode === 'repaint' && !repaintPrompt.trim())} className="px-6 py-3 bg-cyan-500 text-black font-semibold rounded-full disabled:bg-cyan-300/50 flex items-center justify-center gap-2 shadow-lg flex-grow md:flex-grow-0 hover:bg-cyan-400 transition-colors">
                                {isGenerating ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : (mode === 'erase' ? <EraserIcon className="h-5 w-5"/> : <PaintBrushIcon className="h-5 w-5" />)}
                                {isGenerating ? 'Đang tạo...' : `Tạo (${tool.creditCost} Credit)`}
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ImageEditorView;
