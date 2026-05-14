
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { 
    ArrowLeftIcon, SparklesIcon, DocumentArrowDownIcon, 
    PhotoIcon, CheckCircleIcon, TrashIcon, ArrowPathIcon, 
    CubeIcon, ClockIcon,
    ShoppingBagIcon, UserIcon, ArrowUpTrayIcon,
    ChevronUpIcon, AdjustmentsHorizontalIcon,
    TagIcon, ArrowsRightLeftIcon,
    PlusIcon, CameraIcon, EyeIcon, ScissorsIcon,
    ArrowsPointingOutIcon, ArrowUturnLeftIcon, Square2StackIcon,
    PencilSquareIcon, CheckIcon, XCircleIcon, PaintBrushIcon, EraserIcon,
    MagnifyingGlassIcon, BoltIcon
} from '../Icons';
import { IntegrationTool } from '../../features/settings/types';
import { useAuth } from '../../features/auth/useAuth';
import { useUser } from '../../features/users/useUser';
import { useActions } from '../../features/actions/useActions';
import { useToast } from '../../components/ToastProvider';
import { useSettings } from '../../features/settings/useSettings';
import { ALL_GEMINI_MODELS } from '../../constants';
import { findUserInTree } from '../../services/userService';
import { GenerationResult, ImageQuantity } from '../../features/users/types';
import CreditBalanceDisplay from './CreditBalanceDisplay';
import Modal from '../../components/Modal';
import FormattedNumberInput from '../../components/FormattedNumberInput';
import { ColorPickerCircle } from './video-editor/VideoEditorUI';

interface MockupGeneratorToolProps {
    tool: IntegrationTool;
    onNavigate: (page: string) => void;
}

interface PathPoint {
    x: number;
    y: number;
    cpx?: number; // Control Point X (Quadratic Bezier)
    cpy?: number; // Control Point Y
}

interface TransformState {
    x: number; // 0-1 percentage
    y: number; // 0-1 percentage
    scale: number;
    rotation: number;
}

type ToolMode = 'brush' | 'path' | 'move';

const MockupGeneratorTool: React.FC<MockupGeneratorToolProps> = ({ tool, onNavigate }) => {
    const { loggedInUser } = useAuth();
    const { userState } = useUser();
    const { handleUseToolCredit, handleSetGenerationHistory, handleDeleteGenerationResult } = useActions();
    const { addToast } = useToast();
    const { settingsState } = useSettings();

    // UseMemo for models
    const activeModels = useMemo(() => {
        // Ưu tiên các model được bật riêng cho công cụ này trong Admin (modelPricing)
        const toolSpecificModels = tool.modelPricing ? Object.keys(tool.modelPricing) : [];
        if (toolSpecificModels.length > 0) {
            const toolFiltered = ALL_GEMINI_MODELS.filter(m => toolSpecificModels.includes(m.id) && m.category === 'image');
            if (toolFiltered.length > 0) return toolFiltered;
        }

        const activeIds = settingsState.systemSettings.activeGeminiModels || [];
        const filtered = ALL_GEMINI_MODELS.filter(m => activeIds.includes(m.id) && m.category === 'image');
        const fallback = ALL_GEMINI_MODELS.filter(m => m.category === 'image');
        return filtered.length > 0 ? filtered : (fallback.length > 0 ? [fallback[0]] : [ALL_GEMINI_MODELS[0]]);
    }, [settingsState.systemSettings.activeGeminiModels, tool.modelPricing]);

    // --- STATE ---
    const [baseImage, setBaseImage] = useState<string | null>(null);
    const [designImage, setDesignImage] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    
    // Auto-Analysis State
    const [isAnalyzingBase, setIsAnalyzingBase] = useState(false);
    const [detectedSurface, setDetectedSurface] = useState<string>('');
    
    // Masking State
    const [toolMode, setToolMode] = useState<ToolMode>('brush');
    const [brushSize, setBrushSize] = useState(30);
    const [isEraser, setIsEraser] = useState(false);
    
    const [pathPoints, setPathPoints] = useState<PathPoint[]>([]);
    const [isPathClosed, setIsPathClosed] = useState(false);
    const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
    const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

    // Design Transform State
    const [designTransform, setDesignTransform] = useState<TransformState>({ x: 0.5, y: 0.5, scale: 0.5, rotation: 0 });
    const [isDraggingDesign, setIsDraggingDesign] = useState(false);
    const [dragMode, setDragMode] = useState<'move' | 'scale' | 'rotate' | 'none' | 'move-point' | 'move-control'>('none');
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [initialTransform, setInitialTransform] = useState<TransformState>({ x: 0, y: 0, scale: 1, rotation: 0 });

    // Settings
    const [blendMode, setBlendMode] = useState<'print' | 'sticker'>('print');
    const [designPrompt, setDesignPrompt] = useState('');
    const [selectedModel, setSelectedModel] = useState<string>(activeModels[0].id);

    useEffect(() => {
        if (!activeModels.some(m => m.id === selectedModel)) {
            setSelectedModel(activeModels[0].id);
        }
    }, [activeModels, selectedModel]);

    // Processing
    const [isProcessing, setIsProcessing] = useState(false);
    const [historyStack, setHistoryStack] = useState<any[]>([]); // For Undo (Simple implementation)
    
    // UI
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    
    const baseImageInputRef = useRef<HTMLInputElement>(null);
    const designImageInputRef = useRef<HTMLInputElement>(null);
    
    const baseImageObjRef = useRef<HTMLImageElement | null>(null);
    const designImageObjRef = useRef<HTMLImageElement | null>(null);
    
    const isDrawing = useRef(false);

    const freshUser = useMemo(() => loggedInUser ? findUserInTree(userState.allUsers, loggedInUser.id) : null, [userState.allUsers, loggedInUser]);
    const currentCredits = freshUser ? freshUser.creditBalance : 0;

    // History Items
    const historyItems = useMemo(() => {
        if (!loggedInUser?.generationHistory) return [];
        return loggedInUser.generationHistory
            .filter(h => h.taskId.startsWith('mockup_'))
            .sort((a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime());
    }, [loggedInUser]);

    // Analyze Base Image Function
    const analyzeBaseImage = async (base64Image: string) => {
        setIsAnalyzingBase(true);
        setDetectedSurface('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/png';
            const base64Data = base64Image.split(',')[1];
            
            const imagePart = { inlineData: { data: base64Data, mimeType } };
            const prompt = `
            Analyze this image for a product mockup task.
            Identify the primary object and its material properties where a design would be placed.
            
            OUTPUT FORMAT: A single concise sentence describing the surface physics.
            Examples:
            - "Wrinkled cotton t-shirt fabric with soft folds"
            - "Rough asphalt road surface with perspective receding to horizon"
            - "Glossy cylindrical ceramic mug surface"
            - "Matte cardboard packaging box"
            
            Your response:
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', // Flash is fast and good for analysis
                contents: { parts: [imagePart, { text: prompt }] }
            });
            
            if (response.text) {
                setDetectedSurface(response.text.trim());
                addToast('Đã nhận diện vật liệu sản phẩm!', 'success');
            }
        } catch (error) {
            console.error("Analysis failed:", error);
            setDetectedSurface("General Surface"); // Fallback
        } finally {
            setIsAnalyzingBase(false);
        }
    };

    // Initialize Base Image
    useEffect(() => {
        if (baseImage) {
            const img = new Image();
            img.onload = () => {
                baseImageObjRef.current = img;
                if (canvasRef.current && maskCanvasRef.current) {
                    canvasRef.current.width = img.naturalWidth;
                    canvasRef.current.height = img.naturalHeight;
                    maskCanvasRef.current.width = img.naturalWidth;
                    maskCanvasRef.current.height = img.naturalHeight;
                    renderComposite();
                }
            };
            img.src = baseImage;
            
            // Trigger AI Analysis
            analyzeBaseImage(baseImage);
        }
    }, [baseImage]);

    // Initialize Design Image
    useEffect(() => {
        if (designImage) {
            const img = new Image();
            img.onload = () => {
                designImageObjRef.current = img;
                
                // Smart Scale: Fit design to ~40-50% of canvas width by default for better UX
                let initScale = 0.5;
                if (canvasRef.current) {
                     const canvasW = canvasRef.current.width;
                     if (img.naturalWidth > 0) {
                         const targetW = canvasW * 0.45;
                         initScale = targetW / img.naturalWidth;
                     }
                }

                // Auto switch to move mode and center
                setToolMode('move');
                setDesignTransform({ x: 0.5, y: 0.5, scale: initScale, rotation: 0 });
                addToast('Đã thêm hình in. Bạn có thể kéo thả, phóng to, xoay ngay lập tức.', 'success');
                // Note: renderComposite will be triggered by the state updates (designTransform) via the other useEffect
            };
            img.src = designImage;
        }
    }, [designImage]);

    // Re-render when transforms change
    useEffect(() => {
        renderComposite();
    }, [designTransform, pathPoints, isPathClosed, toolMode, blendMode]);

    const saveToHistory = () => {
        // Simple undo stack (mask state + transform state)
        if (maskCanvasRef.current) {
             const maskData = maskCanvasRef.current.toDataURL();
             setHistoryStack(prev => [...prev, { maskData, pathPoints, isPathClosed, designTransform }]);
        }
    };

    const handleUndo = () => {
        if (historyStack.length === 0) return;
        const lastState = historyStack[historyStack.length - 1];
        const newStack = historyStack.slice(0, -1);
        setHistoryStack(newStack);

        if (lastState.maskData) {
            const img = new Image();
            img.onload = () => {
                const ctx = maskCanvasRef.current?.getContext('2d');
                ctx?.clearRect(0, 0, maskCanvasRef.current!.width, maskCanvasRef.current!.height);
                ctx?.drawImage(img, 0, 0);
                renderComposite();
            };
            img.src = lastState.maskData;
        }
        setPathPoints(lastState.pathPoints);
        setIsPathClosed(lastState.isPathClosed);
        setDesignTransform(lastState.designTransform);
    };

    const handleFullReset = () => {
        if (window.confirm("Bạn có chắc chắn muốn làm mới toàn bộ? Mọi dữ liệu hiện tại sẽ bị mất.")) {
            // 1. Reset all state
            setBaseImage(null);
            setDesignImage(null);
            setResultImage(null);
            setPathPoints([]);
            setIsPathClosed(false);
            setHistoryStack([]);
            setDesignTransform({ x: 0.5, y: 0.5, scale: 0.5, rotation: 0 });
            setToolMode('brush');
            setDetectedSurface('');

            // 2. Clear canvas context manually to be safe
            if (maskCanvasRef.current) {
                const maskCtx = maskCanvasRef.current.getContext('2d');
                maskCtx?.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
            }
            
            // Clear image refs
            baseImageObjRef.current = null;
            designImageObjRef.current = null;
            
            // 3. Clear file inputs so user can select same file again
            if (baseImageInputRef.current) baseImageInputRef.current.value = '';
            if (designImageInputRef.current) designImageInputRef.current.value = '';

            addToast('Đã làm mới phiên làm việc.', 'success');
        }
    };
    
    const handleContinueEditing = () => {
        // Reset về bước 1 (Logic giống handleFullReset nhưng không cần confirm)
        setBaseImage(null);
        setDesignImage(null);
        setResultImage(null);
        setPathPoints([]);
        setIsPathClosed(false);
        setHistoryStack([]);
        setDesignTransform({ x: 0.5, y: 0.5, scale: 0.5, rotation: 0 });
        setToolMode('brush');
        setDetectedSurface('');

        if (maskCanvasRef.current) {
            const maskCtx = maskCanvasRef.current.getContext('2d');
            maskCtx?.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
        }
        
        baseImageObjRef.current = null;
        designImageObjRef.current = null;
        
        if (baseImageInputRef.current) baseImageInputRef.current.value = '';
        if (designImageInputRef.current) designImageInputRef.current.value = '';
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'base' | 'design') => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    if (type === 'base') {
                        setBaseImage(event.target.result as string);
                        setResultImage(null);
                        setPathPoints([]);
                        setHistoryStack([]);
                        // Reset mask
                        const maskCtx = maskCanvasRef.current?.getContext('2d');
                        maskCtx?.clearRect(0, 0, maskCanvasRef.current!.width, maskCanvasRef.current!.height);
                    } else {
                        setDesignImage(event.target.result as string);
                        // Mode change handled in useEffect
                    }
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
        e.target.value = '';
    };

    // --- RENDERING PIPELINE ---
    const renderComposite = () => {
        const canvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        const baseImg = baseImageObjRef.current;
        const designImg = designImageObjRef.current;
        
        if (!canvas || !maskCanvas || !baseImg) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        // 1. Draw Base Image
        ctx.drawImage(baseImg, 0, 0, width, height);

        // 2. Draw Red Mask Overlay (Visual Feedback for user)
        // We want to see the mask so we know where the design will be clipped
        ctx.save();
        ctx.globalAlpha = toolMode === 'move' ? 0.1 : 0.4; // Dim mask when moving design so we can see
        ctx.drawImage(maskCanvas, 0, 0);
        
        // Also draw filled path to mask if available (Visual only)
        if (pathPoints.length > 2 && isPathClosed) {
             ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
             ctx.beginPath();
             ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
             for(let i=1; i<pathPoints.length; i++) {
                const p = pathPoints[i];
                if (p.cpx !== undefined && p.cpy !== undefined) {
                     ctx.quadraticCurveTo(p.cpx, p.cpy, p.x, p.y);
                } else {
                     ctx.lineTo(p.x, p.y);
                }
            }
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
        
        // 3. Render Path Visuals (Points & Lines)
        if (pathPoints.length > 0 && toolMode === 'path') {
             renderPathVisuals(ctx); // Draw visual lines/points on main canvas
        }

        // 4. Draw Design (Clipped by Mask)
        if (designImg) {
            ctx.save();
            
            // Create a temp canvas to hold the design
            const tempC = document.createElement('canvas');
            tempC.width = width;
            tempC.height = height;
            const tCtx = tempC.getContext('2d')!;

            // Transform Design
            const cx = designTransform.x * width;
            const cy = designTransform.y * height;
            const dw = designImg.naturalWidth * designTransform.scale;
            const dh = designImg.naturalHeight * designTransform.scale;

            tCtx.translate(cx, cy);
            tCtx.rotate((designTransform.rotation * Math.PI) / 180);
            tCtx.drawImage(designImg, -dw/2, -dh/2, dw, dh);
            
            // Apply Mask Clipping
            const clipC = document.createElement('canvas');
            clipC.width = width;
            clipC.height = height;
            const cCtx = clipC.getContext('2d')!;
            
            // A. From Brush Mask
            cCtx.drawImage(maskCanvas, 0, 0); 
            
            // B. From Path Mask
            if (pathPoints.length > 2 && isPathClosed) {
                 cCtx.fillStyle = '#FF0000'; // Full opacity for clipping
                 cCtx.beginPath();
                 cCtx.moveTo(pathPoints[0].x, pathPoints[0].y);
                 for(let i=1; i<pathPoints.length; i++) {
                    const p = pathPoints[i];
                    if (p.cpx !== undefined && p.cpy !== undefined) {
                         cCtx.quadraticCurveTo(p.cpx, p.cpy, p.x, p.y);
                    } else {
                         cCtx.lineTo(p.x, p.y);
                    }
                }
                cCtx.closePath();
                cCtx.fill();
            }

            cCtx.globalCompositeOperation = 'source-in'; // Keep only intersection
            cCtx.drawImage(tempC, 0, 0); // Draw Transformed Design

            // Draw final clipped design onto main canvas
            ctx.save();
            
            // Kỹ thuật "Ghosting Input": Vẽ với Multiply và Opacity thấp để AI thấy nếp nhăn xuyên qua logo
            // Điều này cực kỳ quan trọng để AI nhận diện texture bên dưới
            if (blendMode === 'print') {
                 ctx.globalCompositeOperation = 'multiply';
                 ctx.globalAlpha = 0.9; 
            } else {
                 // Sticker mode: normal blend but slight transparency
                 ctx.globalAlpha = 0.95;
            }
            
            ctx.drawImage(clipC, 0, 0);
            ctx.restore();
            
            // Draw Control Handles if in Move Mode
            if (toolMode === 'move') {
                drawGizmo(ctx, cx, cy, dw, dh, designTransform.rotation);
            }

            ctx.restore();
        }
    };
    
    const renderPathVisuals = (ctx: CanvasRenderingContext2D) => {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = '#00FFFF'; // Cyan
        ctx.lineWidth = 2;
        
        if(pathPoints.length > 0) ctx.moveTo(pathPoints[0].x, pathPoints[0].y);

        for (let i = 1; i < pathPoints.length; i++) {
            const p = pathPoints[i];
            
            if (p.cpx !== undefined && p.cpy !== undefined) {
                ctx.quadraticCurveTo(p.cpx, p.cpy, p.x, p.y);
            } else {
                ctx.lineTo(p.x, p.y);
            }
        }
        
        if (isPathClosed) {
             const first = pathPoints[0];
             ctx.lineTo(first.x, first.y);
        }
        
        ctx.stroke();
        
        // Draw Points & Control Handles
        pathPoints.forEach((p, idx) => {
            const isHovered = idx === hoveredPointIndex;
            const isActive = idx === activePointIndex;

            ctx.beginPath();
            ctx.arc(p.x, p.y, isHovered || isActive ? 6 : 4, 0, Math.PI * 2);
            ctx.fillStyle = isActive ? '#FF00FF' : (isHovered ? '#FFFFFF' : '#00FFFF');
            ctx.fill();
            ctx.stroke();
            
            // Draw visual line to control point if curve exists for this segment
            if (p.cpx !== undefined && p.cpy !== undefined) {
                 const prev = pathPoints[idx - 1];
                 if (prev) {
                     // Draw Control Handle Line
                     ctx.beginPath();
                     ctx.moveTo(prev.x, prev.y); // Draw from prev anchor for visualization
                     ctx.lineTo(p.cpx, p.cpy);
                     ctx.lineTo(p.x, p.y);
                     ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)'; // Yellow lines
                     ctx.lineWidth = 1;
                     ctx.stroke();

                     // Draw Control Point
                     ctx.beginPath();
                     ctx.arc(p.cpx, p.cpy, 4, 0, Math.PI * 2);
                     ctx.fillStyle = '#FFFF00'; // Yellow for control point
                     ctx.fill();
                 }
            }
        });
        ctx.restore();
    };

    const drawGizmo = (ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, rotation: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((rotation * Math.PI) / 180);
        
        // Bounding box
        ctx.strokeStyle = '#3b82f6'; // Blue-500
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(-w/2, -h/2, w, h);
        ctx.setLineDash([]);
        
        // Corner Handles (Scale)
        const corners = [
            { x: -w/2, y: -h/2 }, { x: w/2, y: -h/2 },
            { x: -w/2, y: h/2 }, { x: w/2, y: h/2 }
        ];
        
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#3b82f6';
        
        corners.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        });
        
        // Rotation Handle
        ctx.beginPath();
        ctx.moveTo(0, -h/2);
        ctx.lineTo(0, -h/2 - 25);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, -h/2 - 25, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();

        ctx.restore();
    };

    const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };
    
    // --- GIZMO HIT TESTING ---
    const checkGizmoHit = (mx: number, my: number): 'move' | 'rotate' | 'scale' | 'none' => {
        if (!designImageObjRef.current || !canvasRef.current) return 'none';
        
        const canvas = canvasRef.current;
        const cx = designTransform.x * canvas.width;
        const cy = designTransform.y * canvas.height;
        const w = designImageObjRef.current.naturalWidth * designTransform.scale;
        const h = designImageObjRef.current.naturalHeight * designTransform.scale;
        const rotation = designTransform.rotation;
        
        // Transform mouse point into local unrotated space of the design
        const rad = -rotation * Math.PI / 180;
        const dx = mx - cx;
        const dy = my - cy;
        const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
        const localY = dx * Math.sin(rad) + dy * Math.cos(rad);
        
        const tolerance = 20; // Hit area size

        // Check Rotation Handle (Top Center, extended up)
        // Local coord of rotation handle is roughly (0, -h/2 - 25)
        if (Math.abs(localX - 0) < tolerance && Math.abs(localY - (-h/2 - 25)) < tolerance) {
            return 'rotate';
        }
        
        // Check Corners (Scale)
        if (
            (Math.abs(localX - (-w/2)) < tolerance && Math.abs(localY - (-h/2)) < tolerance) || // TL
            (Math.abs(localX - (w/2)) < tolerance && Math.abs(localY - (-h/2)) < tolerance) ||  // TR
            (Math.abs(localX - (-w/2)) < tolerance && Math.abs(localY - (h/2)) < tolerance) ||  // BL
            (Math.abs(localX - (w/2)) < tolerance && Math.abs(localY - (h/2)) < tolerance)      // BR
        ) {
            return 'scale';
        }
        
        // Check Inside (Move)
        if (localX > -w/2 && localX < w/2 && localY > -h/2 && localY < h/2) {
            return 'move';
        }
        
        return 'none';
    };

    // --- PATH POINT HIT TESTING ---
    const checkPathPointHit = (mx: number, my: number): { index: number, type: 'anchor' | 'control' } | null => {
        const tolerance = 20; // Increased tolerance for better hit detection
        
        // Check Points in reverse order (top to bottom visual stack)
        for (let i = pathPoints.length - 1; i >= 0; i--) {
            const p = pathPoints[i];
            
            // Check Control Point (if exists)
            if (p.cpx !== undefined && p.cpy !== undefined) {
                 if (Math.hypot(p.cpx - mx, p.cpy - my) < tolerance) {
                    return { index: i, type: 'control' };
                }
            }
            
            // Check Anchor
            if (Math.hypot(p.x - mx, p.y - my) < tolerance) {
                return { index: i, type: 'anchor' };
            }
        }
        return null;
    };

    // --- INTERACTION HANDLERS ---
    
    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        const pos = getMousePos(e);
        const isCtrl = 'ctrlKey' in e && (e as React.MouseEvent).ctrlKey;
        
        if (toolMode === 'brush') {
            isDrawing.current = true;
            drawBrush(pos.x, pos.y);
        } else if (toolMode === 'path') {
            const hit = checkPathPointHit(pos.x, pos.y);
            
            if (hit) {
                // SPECIAL LOGIC: CLOSE PATH
                // If we clicked the FIRST point (index 0), and we have enough points, and path is OPEN -> Close it.
                if (hit.index === 0 && pathPoints.length > 2 && !isPathClosed && !isCtrl) {
                     setIsPathClosed(true);
                     addToast('Đã khép kín vùng chọn!', 'success');
                     saveToHistory();
                     return;
                }

                // If user clicks an ANCHOR with CTRL, initiate "BEND" mode
                if (isCtrl && hit.type === 'anchor') {
                     setActivePointIndex(hit.index);
                     setDragMode('move-control'); 
                     
                     // If no control point exists yet, create one at the current anchor position
                     // We modify the state immediately so dragging works smoothly
                     setPathPoints(prev => {
                         const newPoints = [...prev];
                         const point = newPoints[hit.index];
                         if (point.cpx === undefined) {
                             point.cpx = point.x;
                             point.cpy = point.y;
                         }
                         return newPoints;
                     });
                } else {
                    // Normal drag (Move anchor or existing control point)
                    setActivePointIndex(hit.index);
                    setDragMode(hit.type === 'control' ? 'move-control' : 'move-point' as any);
                }
            } else {
                 // Add new point
                 if (!isPathClosed) {
                     handleAddPathPoint(pos, isCtrl);
                 } else {
                     // If closed, maybe start new path? For now just ignore clicks outside points
                     // Or deselect active point
                     setActivePointIndex(null);
                 }
            }
        } else if (toolMode === 'move' && designImageObjRef.current) {
            const hitMode = checkGizmoHit(pos.x, pos.y);
            if (hitMode !== 'none') {
                setIsDraggingDesign(true);
                setDragMode(hitMode);
                setDragStart({ x: pos.x, y: pos.y });
                setInitialTransform({ ...designTransform });
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        const pos = getMousePos(e);
        const isCtrl = 'ctrlKey' in e && (e as React.MouseEvent).ctrlKey;

        if (toolMode === 'brush' && isDrawing.current) {
            drawBrush(pos.x, pos.y);
        } else if (toolMode === 'move' && isDraggingDesign && designImageObjRef.current) {
            // ... Gizmo Logic (Same as before)
            const canvas = canvasRef.current!;
            
            if (dragMode === 'move') {
                const dx = (pos.x - dragStart.x) / canvas.width;
                const dy = (pos.y - dragStart.y) / canvas.height;
                setDesignTransform(prev => ({ 
                    ...prev, 
                    x: initialTransform.x + dx, 
                    y: initialTransform.y + dy 
                }));
            } else if (dragMode === 'scale') {
                const cx = initialTransform.x * canvas.width;
                const cy = initialTransform.y * canvas.height;
                const startDist = Math.hypot(dragStart.x - cx, dragStart.y - cy);
                const curDist = Math.hypot(pos.x - cx, pos.y - cy);
                const scaleFactor = curDist / startDist;
                
                setDesignTransform(prev => ({ ...prev, scale: Math.max(0.01, initialTransform.scale * scaleFactor) }));
            } else if (dragMode === 'rotate') {
                const cx = initialTransform.x * canvas.width;
                const cy = initialTransform.y * canvas.height;
                const startAngle = Math.atan2(dragStart.y - cy, dragStart.x - cx);
                const curAngle = Math.atan2(pos.y - cy, pos.x - cx);
                const angleDiff = (curAngle - startAngle) * (180 / Math.PI);
                
                setDesignTransform(prev => ({ ...prev, rotation: initialTransform.rotation + angleDiff }));
            }
        } else if (toolMode === 'path') {
            // Path Tool interactions
            if (activePointIndex !== null && (dragMode === 'move-point' || dragMode === 'move-control')) {
                // Dragging Logic
                const newPoints = [...pathPoints];
                const point = newPoints[activePointIndex];

                if (dragMode === 'move-point') {
                    // Move the anchor point
                    // If there was a control point relative to it, move it too to keep shape consistent?
                    // For simplicity, just move the anchor.
                    const dx = pos.x - point.x;
                    const dy = pos.y - point.y;
                    
                    point.x = pos.x;
                    point.y = pos.y;
                    
                    // Also move control point if it exists to maintain relative position
                    if (point.cpx !== undefined && point.cpy !== undefined) {
                        point.cpx += dx;
                        point.cpy += dy;
                    }
                    
                } else if (dragMode === 'move-control') {
                    // Update Control Point
                    point.cpx = pos.x;
                    point.cpy = pos.y;
                }
                
                setPathPoints(newPoints);
            } else {
                // Hover detection
                const hit = checkPathPointHit(pos.x, pos.y);
                setHoveredPointIndex(hit ? hit.index : null);
                
                // Change cursor
                if (canvasRef.current) {
                    if (hit) {
                        // Special cursor for First Point to indicate Closing
                        if (hit.index === 0 && pathPoints.length > 2 && !isPathClosed) {
                             canvasRef.current.style.cursor = 'alias'; // Link cursor
                        } else if (isCtrl && hit.type === 'anchor') {
                            canvasRef.current.style.cursor = 'cell'; // Visual cue for bending
                        } else {
                            canvasRef.current.style.cursor = 'grab';
                        }
                    } else {
                        canvasRef.current.style.cursor = 'crosshair';
                    }
                }
            }
        }
    };

    const handleMouseUp = () => {
        if (isDrawing.current || isDraggingDesign || activePointIndex !== null) {
            isDrawing.current = false;
            setIsDraggingDesign(false);
            setDragMode('none');
            setActivePointIndex(null);
            
            const ctx = maskCanvasRef.current?.getContext('2d');
            ctx?.beginPath(); // Reset brush path
            saveToHistory(); // Save state after action
        }
    };

    const drawBrush = (x: number, y: number) => {
        const ctx = maskCanvasRef.current?.getContext('2d');
        if (!ctx) return;
        
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (isEraser) {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = '#FF0000'; // Pure Red for Mask
            ctx.fillStyle = '#FF0000';
        }

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
        renderComposite();
    };
    
    // Add Point
    const handleAddPathPoint = (pos: {x: number, y: number}, isCtrl: boolean) => {
        let newPoint: PathPoint = { x: pos.x, y: pos.y };

        // Auto-curve if Ctrl held during creation (Power user feature)
        if (isCtrl && pathPoints.length > 0) {
            const lastPoint = pathPoints[pathPoints.length - 1];
            const midX = (lastPoint.x + pos.x) / 2;
            const midY = (lastPoint.y + pos.y) / 2;
            const dx = pos.x - lastPoint.x;
            const dy = pos.y - lastPoint.y;
            
            // Perpendicular offset for curve
            newPoint.cpx = midX - dy * 0.3; 
            newPoint.cpy = midY + dx * 0.3;
        }

        setPathPoints(prev => [...prev, newPoint]);
        saveToHistory();
    };
    
    const handleClearMask = () => {
        const maskCanvas = maskCanvasRef.current;
        const ctx = maskCanvas?.getContext('2d');
        ctx?.clearRect(0, 0, maskCanvas!.width, maskCanvas!.height);
        setPathPoints([]);
        setIsPathClosed(false);
        saveToHistory();
        renderComposite();
    };

    const handleGenerate = async () => {
        if (isProcessing || !loggedInUser || !baseImage) return;
        
        const cost = tool.creditCost;
        if (currentCredits < cost) {
            addToast('Không đủ Credit.', 'error');
            return;
        }

        setIsProcessing(true);
        const creditResult = await handleUseToolCredit(loggedInUser.id, { ...tool, creditCost: cost });
        if (!creditResult.success) {
            setIsProcessing(false);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            // 1. Generate Composite Image from Canvas (Base + Mask + Design positioned)
            // This gives us a single image where the design is exactly where the user put it.
            const compositeCanvas = document.createElement('canvas');
            compositeCanvas.width = canvasRef.current!.width;
            compositeCanvas.height = canvasRef.current!.height;
            const ctx = compositeCanvas.getContext('2d')!;
            
            // Draw exactly what we see (minus gizmos/red tint)
            const baseImg = baseImageObjRef.current!;
            const designImg = designImageObjRef.current;
            const maskCanvas = maskCanvasRef.current!;
            
            ctx.drawImage(baseImg, 0, 0, compositeCanvas.width, compositeCanvas.height);
            
            if (designImg) {
                const tempC = document.createElement('canvas');
                tempC.width = compositeCanvas.width;
                tempC.height = compositeCanvas.height;
                const tCtx = tempC.getContext('2d')!;
                const cx = designTransform.x * compositeCanvas.width;
                const cy = designTransform.y * compositeCanvas.height;
                const dw = designImg.naturalWidth * designTransform.scale;
                const dh = designImg.naturalHeight * designTransform.scale;
                tCtx.translate(cx, cy);
                tCtx.rotate((designTransform.rotation * Math.PI) / 180);
                tCtx.drawImage(designImg, -dw/2, -dh/2, dw, dh);
                
                // Clip by mask
                const clipC = document.createElement('canvas');
                clipC.width = compositeCanvas.width;
                clipC.height = compositeCanvas.height;
                const cCtx = clipC.getContext('2d')!;
                
                // Draw Raster Mask
                cCtx.drawImage(maskCanvas, 0, 0); 
                
                // Draw Vector Path Mask (if any)
                if (pathPoints.length > 2 && isPathClosed) {
                     cCtx.fillStyle = '#FF0000';
                     cCtx.beginPath();
                     cCtx.moveTo(pathPoints[0].x, pathPoints[0].y);
                     for(let i=1; i<pathPoints.length; i++) {
                        const p = pathPoints[i];
                        if (p.cpx !== undefined && p.cpy !== undefined) {
                             cCtx.quadraticCurveTo(p.cpx, p.cpy, p.x, p.y);
                        } else {
                             cCtx.lineTo(p.x, p.y);
                        }
                    }
                    cCtx.closePath();
                    cCtx.fill();
                }

                cCtx.globalCompositeOperation = 'source-in';
                cCtx.drawImage(tempC, 0, 0);
                
                // --- CRITICAL CHANGE: BLEND MODE & OPACITY FOR INPUT IMAGE ---
                // Instead of drawing opacity 100% source-over, we blend it so Gemini can see wrinkles.
                // NOTE: 'multiply' blending here simulates the ink effect BEFORE AI processing,
                // giving the AI a strong hint about the underlying texture.
                if (blendMode === 'print') {
                     ctx.globalCompositeOperation = 'multiply';
                     ctx.globalAlpha = 0.9; 
                } else {
                     // Sticker mode: normal blend but slight transparency
                     ctx.globalAlpha = 0.95;
                }
                
                ctx.drawImage(clipC, 0, 0);
                ctx.restore();
            }

            const compositeBase64 = compositeCanvas.toDataURL('image/png').split(',')[1];
            
            const parts = [{ inlineData: { data: compositeBase64, mimeType: 'image/png' } }];
            
            const blendInstruction = blendMode === 'print' 
                ? "CRITICAL: Surface Mapping & Displacement Task. The placed logo/design MUST DEFORM and WARP to match the 3D geometry of the underlying object. If the shirt wrinkles, the straight lines of the logo MUST BEND. It must look like ink absorbed into the material (Dye Sublimation), NOT a flat layer. Preserve the texture of the base object visible THROUGH the design."
                : "The design is a high-quality sticker decal. It should have a subtle thickness, slight gloss, and follow the surface curvature, but cover the texture underneath. APPLY PERSPECTIVE WARPING if the surface is angled (like a road receding).";
                
            // Use detected surface description from state
            const surfaceContext = detectedSurface 
                ? `**DETECTED SURFACE:** ${detectedSurface}.` 
                : "**SURFACE CONTEXT:** General 3D object. Analyze geometry and apply appropriate warping.";

            const promptText = `
            SYSTEM_ROLE: Expert 3D Texture Artist & Virtual Photographer.
            TASK: Photorealistic Texture Mapping & Physical Relighting.
            
            INPUT ANALYSIS:
            The input image shows a design overlay using a 'Multiply' blend mode (Ghosting). This allows you to see the underlying surface texture (fabric weave, road grain, wrinkles, buttons) THROUGH the design.
            
            GOAL:
            Generate a final image where the design appears physically integrated into the material (e.g., Screen Printed ink, Dye Sublimation, Painted Road), obeying all laws of physics and lighting.
            
            RENDERING ENGINE INSTRUCTIONS:
            
            1. **GEOMETRY & DISPLACEMENT (The "Wrap" Effect)**:
               - Analyze the **Surface Normals** of the base object based on the visible texture/wrinkles under the design.
               - Apply **Displacement Mapping**: If the fabric folds or wrinkles, the straight lines of the design MUST bend and distort to follow that geometry perfectly.
               - **Depth Cues**: As the surface curves away from the camera, compress the design (foreshortening).
               - **PERSPECTIVE**: If the surface is a road or floor, apply strong linear perspective (Trapezoidal Distortion) to match the vanishing point.

            2. **LIGHTING & SHADOWS (Ambient Occlusion)**:
               - Identify the scene's light source.
               - **Shadow Transfer**: If a wrinkle casts a shadow on the shirt, that EXACT shadow must also darken the design ink at that specific spot.
               - **Highlights**: If light hits a ridge of a fold, the design ink on that ridge should reflect that light.

            3. **MATERIALITY (Subsurface Scattering)**:
               - **Fabric/Clothing**: Simulate **Screen Printing** or **DTG**. Ink is absorbed. Texture is visible.
               - **Road/Ground**: Simulate **Painted Asphalt**. Paint fills the cracks.
               - **Packaging**: Simulate **UV Print**. Smooth curvature.

            ${surfaceContext}
            ${blendInstruction}
            ${designPrompt ? `USER NOTE: ${designPrompt}` : ''}
            
            OUTPUT: A High-Fidelity Photograph. No artifacts. No "floating sticker" look.
            `;

            const response = await ai.models.generateContent({
                model: selectedModel,
                contents: { parts: [...parts, { text: promptText }] },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const newImagePart = response.candidates?.[0]?.content?.parts[0];
            if (newImagePart && newImagePart.inlineData?.data) {
                const resultBase64 = `data:${newImagePart.inlineData.mimeType};base64,${newImagePart.inlineData.data}`;
                setResultImage(resultBase64);
                
                const newResult: GenerationResult = {
                    taskId: `mockup_${Date.now()}`,
                    date: new Date().toLocaleDateString('vi-VN'),
                    prompt: `[Mockup] ${detectedSurface || 'Auto'} - ${blendMode} - ${designPrompt || 'Auto'}`,
                    images: [resultBase64],
                    settings: { aspectRatio: 'custom', customRatio: null, quantity: 1, generationMode: 'Chất lượng', imageStyle: 'Realism' },
                    cost: cost,
                    balanceAfter: freshUser ? freshUser.creditBalance - cost : 0,
                    creationTime: new Date().toLocaleTimeString(),
                };
                handleSetGenerationHistory(loggedInUser.id, newResult);
                addToast('Tạo Mockup thành công!', 'success');
            } else {
                throw new Error("API không trả về ảnh.");
            }

        } catch (error) {
            console.error("Error:", error);
            addToast('Lỗi xử lý, đã hoàn lại Credit.', 'error');
            const userForRefund = findUserInTree(userState.allUsers, loggedInUser.id);
            if(userForRefund) {
                await handleUseToolCredit(userForRefund.id, { ...tool, creditCost: -cost });
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!resultImage) return;
        const link = document.createElement('a');
        link.href = resultImage;
        link.download = `mockup_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleLoadHistoryItem = (item: GenerationResult) => {
        setResultImage(item.images[0]);
        setShowHistoryModal(false);
        addToast('Đã tải kết quả từ lịch sử.', 'success');
    };

    const handleDeleteHistoryItem = (taskId: string) => {
        if (loggedInUser) {
            handleDeleteGenerationResult(loggedInUser.id, taskId);
            addToast('Đã xóa.', 'info');
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-950 text-gray-300">
            {/* Hidden Canvases for processing */}
            <canvas ref={maskCanvasRef} className="hidden" />

            <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Lịch sử Mockup" size="lg" hideFooter>
                <div className="max-h-[60vh] overflow-y-auto p-1 space-y-3">
                    {historyItems.length === 0 ? ( <div className="text-center py-10 text-slate-500"><ClockIcon className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>Chưa có lịch sử.</p></div> ) : (
                        historyItems.map((item) => (
                            <div key={item.taskId} className="flex items-center gap-4 p-3 bg-slate-800 border border-slate-700 rounded-xl hover:border-indigo-500 transition-colors">
                                <div className="h-16 w-16 bg-slate-900 rounded-lg overflow-hidden flex-shrink-0 border border-slate-700">
                                    <img src={item.images[0]} alt="Result" className="h-full w-full object-contain" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{item.prompt}</p>
                                    <p className="text-xs text-slate-400 mt-1">{item.date}</p>
                                </div>
                                <button onClick={() => handleLoadHistoryItem(item)} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"><ArrowPathIcon className="h-4 w-4" /></button>
                                <button onClick={() => handleDeleteHistoryItem(item.taskId)} className="p-2 bg-slate-700 text-red-400 rounded-lg hover:bg-slate-600"><TrashIcon className="h-4 w-4" /></button>
                            </div>
                        ))
                    )}
                </div>
            </Modal>

            <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-30 shadow-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate('Kho Tiện Ích')} className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <ArrowLeftIcon className="h-5 w-5" /> Quay lại
                    </button>
                    <h1 className="text-lg font-bold text-white flex items-center gap-2">
                        <CubeIcon className="h-5 w-5 text-indigo-500" />
                        AI Mockup Generator Pro
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                     <button 
                        onClick={handleUndo} 
                        disabled={historyStack.length <= 0}
                        className={`p-2 rounded-lg transition-colors border ${historyStack.length > 0 ? 'text-white bg-slate-800 hover:bg-slate-700 border-slate-600' : 'text-slate-600 border-transparent cursor-not-allowed'}`}
                        title="Hoàn tác (Undo)"
                     >
                         <ArrowUturnLeftIcon className="h-5 w-5" />
                     </button>
                    <CreditBalanceDisplay balance={currentCredits} onAdd={() => onNavigate('Ví Của Tôi')} />
                    <button onClick={() => setShowHistoryModal(true)} className="p-2 text-indigo-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-indigo-900/50"><ClockIcon className="h-5 w-5" /></button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* LEFT SIDEBAR: CONTROLS */}
                <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col overflow-y-auto p-6 space-y-6">
                    {/* MODEL SELECTOR */}
                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 mb-2">
                        <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                            <BoltIcon className="h-3 w-3" /> AI Model Engine
                        </label>
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            {activeModels.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 1. Base Image */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase block mb-2">1. Sản phẩm gốc (Base)</label>
                        <div 
                            onClick={() => baseImageInputRef.current?.click()}
                            className={`h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${baseImage ? 'border-indigo-500 bg-slate-800' : 'border-slate-700 hover:border-indigo-500 hover:bg-slate-800'}`}
                        >
                            {baseImage ? (
                                <>
                                    <img src={baseImage} alt="Base" className="w-full h-full object-contain p-1" />
                                    {isAnalyzingBase && (
                                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10">
                                            <ArrowPathIcon className="h-6 w-6 text-indigo-400 animate-spin mb-1" />
                                            <span className="text-[10px] text-white">Đang quét vật liệu...</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center">
                                    <ArrowUpTrayIcon className="h-6 w-6 mx-auto mb-1 text-slate-500" />
                                    <span className="text-xs text-slate-400">Tải ảnh áo, cốc...</span>
                                </div>
                            )}
                            <input type="file" ref={baseImageInputRef} onChange={(e) => handleFileUpload(e, 'base')} className="hidden" accept="image/*" />
                        </div>
                        {detectedSurface && (
                            <div className="mt-2 flex items-center gap-2 px-2 py-1.5 bg-green-900/20 border border-green-600/30 rounded text-[10px] text-green-300">
                                <MagnifyingGlassIcon className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{detectedSurface}</span>
                            </div>
                        )}
                    </div>

                    {/* 2. Mask Tools */}
                    <div className="space-y-3 pt-4 border-t border-slate-800">
                        <label className="text-xs font-bold text-slate-400 uppercase block">2. Chọn vùng in (Mask)</label>
                        
                        <div className="flex bg-slate-800 p-1 rounded-lg">
                            <button 
                                onClick={() => setToolMode('brush')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${toolMode === 'brush' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                            >
                                Cọ vẽ
                            </button>
                            <button 
                                onClick={() => setToolMode('path')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${toolMode === 'path' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                            >
                                Đường Path
                            </button>
                        </div>
                        
                        {toolMode === 'brush' && (
                             <div className="space-y-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                 <div className="flex items-center justify-between">
                                     <span className="text-xs text-slate-400">Kích thước</span>
                                     <span className="text-xs font-mono text-white">{brushSize}px</span>
                                 </div>
                                 <input type="range" min="5" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                 <div className="flex gap-2">
                                     <button onClick={() => setIsEraser(false)} className={`flex-1 py-1.5 text-xs rounded border ${!isEraser ? 'bg-green-600 border-green-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'}`}>Tô vùng</button>
                                     <button onClick={() => setIsEraser(true)} className={`flex-1 py-1.5 text-xs rounded border ${isEraser ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'}`}>Tẩy</button>
                                 </div>
                             </div>
                        )}
                        
                        {toolMode === 'path' && (
                             <div className="p-2 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                                 <p className="text-[10px] text-purple-200">
                                     <strong className="block text-purple-400 mb-1">Mẹo Bẻ Cong:</strong>
                                     Vẽ xong đường thẳng, đưa chuột vào điểm cần bẻ, giữ <code className="bg-purple-800 px-1 rounded">Ctrl</code> và kéo.
                                     <br/> <span className="text-green-400">Vùng chọn sẽ tự động khép kín khi nối điểm cuối về đầu.</span>
                                 </p>
                             </div>
                        )}

                        <button onClick={handleClearMask} className="w-full py-2 bg-slate-800 border border-slate-700 hover:bg-red-900/30 hover:border-red-700 text-slate-400 hover:text-red-300 text-xs rounded transition-colors flex items-center justify-center gap-1">
                            <TrashIcon className="h-3 w-3" /> Xóa vùng chọn
                        </button>
                    </div>

                    {/* 3. Design Image */}
                    <div className="pt-4 border-t border-slate-800">
                        <label className="text-xs font-bold text-slate-400 uppercase block mb-2">3. Hình in / Logo (Design)</label>
                        <div 
                            onClick={() => designImageInputRef.current?.click()}
                            className={`h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${designImage ? 'border-pink-500 bg-slate-800' : 'border-slate-700 hover:border-pink-500 hover:bg-slate-800'}`}
                        >
                            {designImage ? (
                                <img src={designImage} alt="Design" className="w-full h-full object-contain p-1" />
                            ) : (
                                <div className="text-center">
                                    <PhotoIcon className="h-6 w-6 mx-auto mb-1 text-slate-500" />
                                    <span className="text-xs text-slate-400">Tải file thiết kế</span>
                                </div>
                            )}
                            <input type="file" ref={designImageInputRef} onChange={(e) => handleFileUpload(e, 'design')} className="hidden" accept="image/*" />
                        </div>
                        
                        {designImage && (
                            <div className="mt-3 space-y-3">
                                <div className="flex gap-2">
                                     <button 
                                        onClick={() => setToolMode('move')}
                                        className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${toolMode === 'move' ? 'bg-pink-600 text-white shadow-lg ring-1 ring-pink-400' : 'bg-slate-800 text-gray-400 hover:bg-slate-700 border border-slate-600'}`}
                                     >
                                         <ArrowsPointingOutIcon className="h-4 w-4"/> Di chuyển / Resize
                                     </button>
                                </div>
                                <button 
                                    onClick={() => setDesignTransform(prev => ({...prev, rotation: (prev.rotation + 90) % 360}))}
                                    className="w-full py-1.5 bg-slate-800 text-xs text-white rounded border border-slate-600 hover:bg-slate-700"
                                >
                                    Xoay 90 độ
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 4. Configuration */}
                    <div className="space-y-3 pt-4 border-t border-slate-800">
                         <label className="text-xs font-bold text-slate-400 uppercase block">4. Cấu hình</label>
                         
                         <div>
                             <label className="text-[10px] text-slate-500 block mb-1">Chế độ hòa trộn</label>
                             <div className="flex gap-2">
                                 <button onClick={() => setBlendMode('print')} className={`flex-1 py-2 text-xs rounded border transition-all ${blendMode === 'print' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>In (Thấm vải)</button>
                                 <button onClick={() => setBlendMode('sticker')} className={`flex-1 py-2 text-xs rounded border transition-all ${blendMode === 'sticker' ? 'bg-pink-600 border-pink-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>Decal / Sticker</button>
                             </div>
                         </div>
                    </div>

                    {/* Generate Button */}
                    <div className="mt-auto pt-6">
                        <div className="flex justify-between items-center mb-2 text-xs">
                             <span className="text-slate-400">Chi phí:</span>
                             <span className="font-bold text-white flex items-center gap-1"><SparklesIcon className="h-3 w-3 text-yellow-400"/> {tool.creditCost} Credit</span>
                        </div>
                        <button 
                            onClick={handleGenerate}
                            disabled={isProcessing || !baseImage || !designImage}
                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform active:scale-95"
                        >
                            {isProcessing ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <CubeIcon className="h-5 w-5" />}
                            {isProcessing ? 'Đang tạo Mockup...' : 'Tạo Mockup Ngay'}
                        </button>
                    </div>
                </aside>

                {/* RIGHT: CANVAS AREA */}
                <main className="flex-1 bg-black flex flex-col items-center justify-center relative overflow-hidden p-6 bg-[#1a1a1a]">
                     <div className="absolute top-4 right-4 z-50 flex gap-2">
                          <button onClick={handleUndo} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-gray-300" title="Undo"><ArrowUturnLeftIcon className="h-5 w-5" /></button>
                     </div>
                     
                     {resultImage ? (
                         <div className="relative w-full h-full flex flex-col items-center justify-center animate-fadeIn z-10">
                             {/* Image Container */}
                             <div className="bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl relative max-w-full max-h-[70vh] flex flex-col">
                                 <img src={resultImage} alt="Result" className="max-w-full max-h-full object-contain rounded-lg" />
                                 <div className="absolute top-4 right-4 flex flex-col gap-2">
                                     <button onClick={handleDownload} className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform shadow-lg"><DocumentArrowDownIcon className="h-6 w-6" /></button>
                                 </div>
                             </div>

                             {/* Two Buttons: Continue & Reset -> Changed to One Button */}
                             <div className="flex gap-4 mt-6">
                                 {/* Button 1: Continue Editing (Now behaves as Start Over) */}
                                 <button
                                     onClick={handleContinueEditing}
                                     className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center gap-2"
                                 >
                                     <PencilSquareIcon className="h-5 w-5" />
                                     Tiếp tục chỉnh sửa (Làm mới)
                                 </button>
                             </div>
                         </div>
                     ) : (
                         <div 
                            className="relative shadow-2xl rounded-lg overflow-hidden border border-slate-800"
                            style={{ 
                                maxWidth: '100%', 
                                maxHeight: '100%',
                                cursor: toolMode === 'move' ? 'default' : (toolMode === 'path' ? 'crosshair' : 'default')
                            }}
                         >
                             {baseImage ? (
                                 <div 
                                    className="relative line-height-0"
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onTouchStart={handleMouseDown}
                                    onTouchMove={handleMouseMove}
                                    onTouchEnd={handleMouseUp}
                                 >
                                     {/* This canvas is the visual output layer */}
                                     <canvas ref={canvasRef} className="block max-w-full max-h-[calc(100vh-100px)] object-contain pointer-events-none" />
                                     
                                     {/* Overlay Message when in Move Mode */}
                                     {designImage && toolMode === 'move' && !resultImage && (
                                         <div className="absolute top-4 right-4 bg-black/60 p-2 rounded text-white text-xs z-50 pointer-events-auto border border-white/10 backdrop-blur-md animate-fadeIn">
                                             <div className="flex flex-col gap-1 font-medium">
                                                 <span className="flex items-center gap-1"><ArrowsPointingOutIcon className="h-3 w-3"/> Kéo hình để di chuyển (Gizmo)</span>
                                                 <span className="flex items-center gap-1"><div className="w-3 h-3 border border-white rounded-full"></div> Kéo góc để Zoom</span>
                                                 <span className="flex items-center gap-1"><ArrowPathIcon className="h-3 w-3"/> Kéo nút trên để Xoay</span>
                                             </div>
                                         </div>
                                     )}
                                 </div>
                             ) : (
                                 <div className="w-[500px] h-[500px] flex flex-col items-center justify-center text-slate-600 bg-[#151515]">
                                     <CubeIcon className="h-20 w-20 mb-4 opacity-20" />
                                     <p className="text-lg font-bold">Khu vực làm việc</p>
                                     <p className="text-sm">Vui lòng tải ảnh sản phẩm gốc.</p>
                                 </div>
                             )}
                         </div>
                     )}
                     
                     {!resultImage && baseImage && (
                         <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-6 py-2 rounded-full border border-slate-700 text-xs text-slate-300 shadow-lg pointer-events-none z-20">
                             {toolMode === 'brush' ? 'Tô vùng cần in.' : (toolMode === 'path' ? 'Click tạo điểm. Giữ Ctrl kéo điểm để uốn cong. Click điểm đầu để đóng.' : 'Kéo thả để di chuyển/xoay/zoom hình in.')}
                         </div>
                     )}
                </main>
            </div>
        </div>
    );
};

export default MockupGeneratorTool;
