
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Modality, Type } from '@google/genai';
import { 
    ArrowLeftIcon, SparklesIcon, DocumentArrowDownIcon, 
    PhotoIcon, CheckCircleIcon, TrashIcon, ArrowPathIcon, 
    FaceSmileIcon, ClockIcon, PlusIcon,
    ChevronUpIcon, MagnifyingGlassIcon, UserGroupIcon,
    ArrowUturnLeftIcon, InformationCircleIcon, UserIcon, 
    CheckIcon, ArrowRightIcon, ChatBubbleBottomCenterTextIcon,
    ArrowsPointingOutIcon, LockClosedIcon, CursorArrowRaysIcon, BoltIcon
} from '../Icons';
import { IntegrationTool } from '../../features/settings/types';
import { useAuth } from '../../features/auth/useAuth';
import { useUser } from '../../features/users/useUser';
import { useActions } from '../../features/actions/useActions';
import { useToast } from '../../components/ToastProvider';
import { useSettings } from '../../features/settings/useSettings';
import { ALL_GEMINI_MODELS } from '../../constants';
import { findUserInTree } from '../../services/userService';
import { GenerationResult } from '../../features/users/types';
import CreditBalanceDisplay from './CreditBalanceDisplay';
import Modal from '../../components/Modal';
import { ensureSupportedImageFormat } from '../../utils/imageProcessing';
import ExpandView from './image-gen/ExpandView';
import { aiService, checkApiKey, requestApiKey } from '../../services/aiService';

interface FaceSwapToolProps {
    tool: IntegrationTool;
    onNavigate: (page: string) => void;
}

// Structure for detected face from Gemini
interface DetectedFace {
    box_2d: number[]; // [ymin, xmin, ymax, xmax] 0-1000 scale
    label?: string;
    rotation?: number; // New: Rotation in degrees
}

type DragMode = 'none' | 'move' | 'rotate' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br';

const FaceSwapTool: React.FC<FaceSwapToolProps> = ({ tool, onNavigate }) => {
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

    // Images
    const [baseImage, setBaseImage] = useState<string | null>(null);
    // Changed: Map index to source image
    const [sourceFaces, setSourceFaces] = useState<Record<number, string>>({});
    const [resultImage, setResultImage] = useState<string | null>(null);
    
    // State
    const [isProcessing, setIsProcessing] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [customPrompt, setCustomPrompt] = useState(''); 
    const [viewMode, setViewMode] = useState<'default' | 'expand'>('default');
    const [selectedModel, setSelectedModel] = useState<string>(activeModels[0].id);

    useEffect(() => {
        if (!activeModels.some(m => m.id === selectedModel)) {
            setSelectedModel(activeModels[0].id);
        }
    }, [activeModels, selectedModel]);
    
    // History & Undo State
    const [editHistory, setEditHistory] = useState<(string | null)[]>([]);

    // Face Detection State
    const [isDetecting, setIsDetecting] = useState(false);
    const [aligningIndices, setAligningIndices] = useState<number[]>([]); // Track which faces are aligning
    const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
    const [selectedFaceIndex, setSelectedFaceIndex] = useState<number | null>(null);
    
    // Interaction State
    const [dragState, setDragState] = useState<{
        mode: DragMode;
        startX: number;
        startY: number;
        initialBox: number[]; // snapshot of box_2d when drag starts
        initialRotation: number;
        centerX?: number;
        centerY?: number;
    }>({ mode: 'none', startX: 0, startY: 0, initialBox: [], initialRotation: 0 });

    const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

    useEffect(() => {
        const verifyKey = async () => {
            const hasKey = await checkApiKey();
            setHasApiKey(hasKey);
        };
        verifyKey();
    }, []);

    // Layout State for Canvas Redraw
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [showDownloadOptions, setShowDownloadOptions] = useState(false);

    const baseInputRef = useRef<HTMLInputElement>(null);
    const faceInputRefs = useRef<Record<number, HTMLInputElement | null>>({}); // Multiple refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const sourceSectionRef = useRef<HTMLDivElement>(null); // To scroll to source list
    
    // Keep a reference to the actual Image object to access natural dimensions easily
    const baseImageObjRef = useRef<HTMLImageElement | null>(null);

    const freshUser = useMemo(() => loggedInUser ? findUserInTree(userState.allUsers, loggedInUser.id) : null, [userState.allUsers, loggedInUser]);
    const currentCredits = freshUser ? freshUser.creditBalance : 0;

    const currentCost = useMemo(() => {
        return tool.modelPricing?.[selectedModel] ?? tool.creditCost;
    }, [tool.modelPricing, tool.creditCost, selectedModel]);

    // History
    const historyItems = useMemo(() => {
        if (!loggedInUser?.generationHistory) return [];
        return loggedInUser.generationHistory
            .filter(h => h.taskId.startsWith('swap_') || h.taskId.startsWith('exp_swap_'))
            .sort((a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime());
    }, [loggedInUser]);

    // Resize Observer for Container
    useEffect(() => {
        const node = containerRef.current;
        if (!node) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, [resultImage, viewMode]);

    // Scroll source list when selecting face on canvas
    useEffect(() => {
        if (selectedFaceIndex !== null && sourceSectionRef.current) {
            const element = document.getElementById(`source-face-card-${selectedFaceIndex}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [selectedFaceIndex]);

    const handleResetSession = () => {
        if (window.confirm("Làm mới toàn bộ?")) {
            setBaseImage(null);
            setSourceFaces({});
            setResultImage(null);
            setDetectedFaces([]);
            setSelectedFaceIndex(null);
            setCustomPrompt('');
            setEditHistory([]);
            setViewMode('default');
            baseImageObjRef.current = null;
            addToast('Đã làm mới.', 'success');
        }
    };

    const handleUndo = () => {
        if (editHistory.length === 0) return;
        
        const previousState = editHistory[editHistory.length - 1];
        const newHistory = editHistory.slice(0, -1);
        
        setEditHistory(newHistory);
        setResultImage(previousState);
        addToast('Đã hoàn tác.', 'info');
    };

    // --- FACE DETECTION LOGIC ---
    const detectFacesInImage = async (imageBase64: string) => {
        setIsDetecting(true);
        setDetectedFaces([]);
        setSelectedFaceIndex(null);

        try {
            const mimeType = imageBase64.split(';')[0].split(':')[1] || 'image/png';
            const imagePart = { inlineData: { data: imageBase64.split(',')[1], mimeType } };

            const prompt = "Detect all human faces. Return bounding boxes.";
            
            const response = await aiService.generateContent({
                model: 'gemini-3-flash-preview',
                contents: { parts: [imagePart, { text: prompt }] },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            faces: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        box_2d: {
                                            type: Type.ARRAY,
                                            items: { type: Type.INTEGER },
                                            description: "Bounding box [ymin, xmin, ymax, xmax] in 0-1000 scale"
                                        },
                                        label: { type: Type.STRING, description: "Description" }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            const result = JSON.parse(response.text || "{}");
            if (result.faces && Array.isArray(result.faces)) {
                const facesWithRotation = result.faces.map((f: any) => ({ ...f, rotation: 0 }));
                setDetectedFaces(facesWithRotation);
                
                if (result.faces.length > 0) {
                    setSelectedFaceIndex(0);
                    addToast(`Đã tìm thấy ${result.faces.length} khuôn mặt.`, 'success');
                } else {
                    addToast('Không tìm thấy khuôn mặt. Bạn có thể thêm vùng chọn thủ công.', 'info');
                }
            }
        } catch (error) {
            console.error("Face detection error:", error);
            addToast('Lỗi quét tự động. Bạn hãy thêm vùng chọn thủ công.', 'error');
        } finally {
            setIsDetecting(false);
        }
    };

    // --- AUTO ALIGN SOURCE FACE LOGIC ---
    const handleAutoAlignSource = async (rawImage: string, index: number) => {
        setAligningIndices(prev => [...prev, index]);
        
        // Optimistically set the raw image first so user sees something
        setSourceFaces(prev => ({ ...prev, [index]: rawImage }));

        try {
            const mimeType = rawImage.split(';')[0].split(':')[1] || 'image/png';
            const imagePart = { inlineData: { data: rawImage.split(',')[1], mimeType } };

            const prompt = `
            TASK: Face Normalization & Alignment for Face Swapping Source.
            INPUT: An image containing a face.
            INSTRUCTION:
            1. Detect the main face.
            2. Crop tightly around the head (Headshot).
            3. **CRITICAL**: Re-orient and warp the face to be a perfect **FRONT-FACING VIEW** (0 degree rotation), even if the original is side profile or tilted.
            4. Neutralize expression slightly if extreme.
            5. Ensure eyes are level.
            6. Output ONLY the aligned face image on a neutral background.
            `;

            const response = await aiService.generateContent({
                model: selectedModel,
                contents: { parts: [imagePart, { text: prompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const newImagePart = response.candidates?.[0]?.content?.parts[0];
            if (newImagePart && newImagePart.inlineData?.data) {
                const newImage = `data:${newImagePart.inlineData.mimeType};base64,${newImagePart.inlineData.data}`;
                setSourceFaces(prev => ({ ...prev, [index]: newImage }));
                addToast(`Đã căn chỉnh khuôn mặt #${index + 1}!`, 'success');
            } else {
                addToast(`Không thể căn chỉnh mặt #${index + 1} (API). Dùng ảnh gốc.`, 'info');
            }
        } catch (error) {
            console.error("Align source error:", error);
            addToast(`Lỗi căn chỉnh mặt #${index + 1}. Dùng ảnh gốc.`, 'error');
        } finally {
            setAligningIndices(prev => prev.filter(i => i !== index));
        }
    };
    
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'base' | 'source', index?: number) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (event) => {
                if (event.target?.result) {
                    let res = event.target.result as string;
                    res = await ensureSupportedImageFormat(res);
                    
                    if (type === 'base') {
                        setBaseImage(res);
                        setResultImage(null);
                        setDetectedFaces([]);
                        setSelectedFaceIndex(null);
                        setSourceFaces({}); // Reset source faces
                        setEditHistory([]); 
                        
                        const img = new Image();
                        img.onload = () => {
                             baseImageObjRef.current = img;
                             detectFacesInImage(res);
                        };
                        img.src = res;
                        
                    } else if (type === 'source' && index !== undefined) {
                        handleAutoAlignSource(res, index);
                    }
                }
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleDownloadSource = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        const src = sourceFaces[index];
        if (!src) return;
        const link = document.createElement('a');
        link.href = src;
        link.download = `aligned_face_${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast(`Đã tải xuống mặt #${index + 1}!`, 'success');
    };

    const handleRemoveSource = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        setSourceFaces(prev => {
            const newFaces = { ...prev };
            delete newFaces[index];
            return newFaces;
        });
    }

    const getRenderMetrics = (imgW: number, imgH: number, canvasW: number, canvasH: number) => {
        const scale = Math.min(canvasW / imgW, canvasH / imgH);
        const drawW = imgW * scale;
        const drawH = imgH * scale;
        const offsetX = (canvasW - drawW) / 2;
        const offsetY = (canvasH - drawH) / 2;
        return { scale, drawW, drawH, offsetX, offsetY };
    };

    const toCanvasCoord = (val: number, drawSize: number, offset: number) => {
        return (val / 1000) * drawSize + offset;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !baseImage || containerSize.width === 0) return;

        // Ensure we load the image from state to avoid stale refs
        const img = new Image();
        img.onload = () => {
            baseImageObjRef.current = img;
            drawCanvas(img);
        };
        img.src = baseImage;

        const drawCanvas = (loadedImg: HTMLImageElement) => {
            const { width: containerW, height: containerH } = containerSize;
            canvas.width = containerW;
            canvas.height = containerH;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // 1. Draw Background (Dark)
            ctx.fillStyle = '#111827';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (loadedImg.width === 0) return;

            const { drawW, drawH, offsetX, offsetY } = getRenderMetrics(loadedImg.width, loadedImg.height, containerW, containerH);

            // 2. Draw Main Image
            ctx.drawImage(loadedImg, offsetX, offsetY, drawW, drawH);
            
            // 3. Draw Overlay for non-selected areas (Dimming)
            if (detectedFaces.length > 0) {
                 ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                 ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            detectedFaces.forEach((face, index) => {
                let [ymin, xmin, ymax, xmax] = face.box_2d;
                const rotation = face.rotation || 0;
                
                // Convert to canvas coords
                const x = toCanvasCoord(xmin, drawW, offsetX);
                const y = toCanvasCoord(ymin, drawH, offsetY);
                const w = toCanvasCoord(xmax, drawW, offsetX) - x;
                const h = toCanvasCoord(ymax, drawH, offsetY) - y;
                
                const cx = x + w / 2;
                const cy = y + h / 2;
                
                const isSelected = index === selectedFaceIndex;
                const hasSource = !!sourceFaces[index];

                ctx.save();
                
                // 4. "Cut out" the face from the dim overlay
                ctx.beginPath();
                ctx.translate(cx, cy);
                ctx.rotate((rotation * Math.PI) / 180);
                ctx.translate(-cx, -cy);
                
                ctx.rect(x, y, w, h);
                ctx.clip();
                
                // Reset transform to draw image correctly inside clip
                ctx.translate(cx, cy);
                ctx.rotate(-(rotation * Math.PI) / 180);
                ctx.translate(-cx, -cy);
                
                ctx.drawImage(loadedImg, offsetX, offsetY, drawW, drawH);
                ctx.restore();

                // 5. Draw HUD / Viewfinder Graphics
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate((rotation * Math.PI) / 180);
                ctx.translate(-cx, -cy);
                
                if (isSelected) {
                    // Target Locked Style
                    ctx.shadowColor = 'rgba(0, 255, 0, 0.5)';
                    ctx.shadowBlur = 10;
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = hasSource ? '#22c55e' : '#eab308'; // Green if ready, Yellow if selected but no source
                    
                    const bracketLen = Math.min(w, h) * 0.2;
                    
                    // Corners
                    ctx.beginPath();
                    ctx.moveTo(x, y + bracketLen); ctx.lineTo(x, y); ctx.lineTo(x + bracketLen, y); ctx.stroke(); // TL
                    ctx.beginPath();
                    ctx.moveTo(x + w - bracketLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + bracketLen); ctx.stroke(); // TR
                    ctx.beginPath();
                    ctx.moveTo(x, y + h - bracketLen); ctx.lineTo(x, y + h); ctx.lineTo(x + bracketLen, y + h); ctx.stroke(); // BL
                    ctx.beginPath();
                    ctx.moveTo(x + w - bracketLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - bracketLen); ctx.stroke(); // BR
                    
                    // Label
                    ctx.fillStyle = hasSource ? '#22c55e' : '#eab308';
                    ctx.font = 'bold 12px monospace';
                    ctx.fillText(hasSource ? 'READY TO SWAP' : 'SELECT SOURCE', x, y - 8);

                    // Resize Handles
                    const handleSize = 6;
                    ctx.fillStyle = '#ffffff';
                    [{x,y}, {x:x+w,y}, {x,y:y+h}, {x:x+w,y:y+h}].forEach(hPos => {
                        ctx.beginPath(); ctx.rect(hPos.x - handleSize/2, hPos.y - handleSize/2, handleSize, handleSize); ctx.fill();
                    });

                    // Rotation Handle
                    ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, y - 25); ctx.strokeStyle = hasSource ? '#22c55e' : '#eab308'; ctx.lineWidth = 1; ctx.stroke();
                    ctx.beginPath(); ctx.arc(cx, y - 25, 4, 0, 2 * Math.PI); ctx.fillStyle = hasSource ? '#22c55e' : '#eab308'; ctx.fill();
                    
                } else {
                    // Inactive Face
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = hasSource ? 'rgba(34, 197, 94, 0.5)' : 'rgba(255, 255, 255, 0.5)'; // Green hint if source set
                    ctx.setLineDash([4, 2]);
                    ctx.strokeRect(x, y, w, h);
                    ctx.setLineDash([]);
                    
                    // Label
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.font = '10px monospace';
                    ctx.fillText(`FACE #${index+1}`, x, y - 5);
                }
                
                ctx.restore();
            });
        };

    }, [baseImage, detectedFaces, selectedFaceIndex, containerSize, sourceFaces]);

    const getMousePos = (e: React.MouseEvent) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const checkHandleHit = (mx: number, my: number, faceIdx: number): DragMode => {
        const img = baseImageObjRef.current!;
        const { drawW, drawH, offsetX, offsetY } = getRenderMetrics(img.width, img.height, containerSize.width, containerSize.height);
        const face = detectedFaces[faceIdx];
        const [ymin, xmin, ymax, xmax] = face.box_2d;
        const rotation = face.rotation || 0;
        
        const x = toCanvasCoord(xmin, drawW, offsetX);
        const y = toCanvasCoord(ymin, drawH, offsetY);
        const w = toCanvasCoord(xmax, drawW, offsetX) - x;
        const h = toCanvasCoord(ymax, drawH, offsetY) - y;
        const cx = x + w/2;
        const cy = y + h/2;

        const rad = -(rotation * Math.PI) / 180;
        const rx = (mx - cx) * Math.cos(rad) - (my - cy) * Math.sin(rad) + cx;
        const ry = (mx - cx) * Math.sin(rad) + (my - cy) * Math.cos(rad) + cy;

        const tolerance = 15;

        if (Math.abs(rx - cx) < tolerance && Math.abs(ry - (y - 30)) < tolerance) return 'rotate';
        if (Math.abs(rx - x) < tolerance && Math.abs(ry - y) < tolerance) return 'resize-tl';
        if (Math.abs(rx - (x + w)) < tolerance && Math.abs(ry - y) < tolerance) return 'resize-tr';
        if (Math.abs(rx - x) < tolerance && Math.abs(ry - (y + h)) < tolerance) return 'resize-bl';
        if (Math.abs(rx - (x + w)) < tolerance && Math.abs(ry - (y + h)) < tolerance) return 'resize-br';
        if (rx > x && rx < x + w && ry > y && ry < y + h) return 'move';

        return 'none';
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!baseImage || !canvasRef.current) return;
        const { x, y } = getMousePos(e);
        
        if (selectedFaceIndex !== null) {
            const mode = checkHandleHit(x, y, selectedFaceIndex);
            if (mode !== 'none') {
                const face = detectedFaces[selectedFaceIndex];
                const img = baseImageObjRef.current!;
                const { drawW, drawH, offsetX, offsetY } = getRenderMetrics(img.width, img.height, containerSize.width, containerSize.height);
                const [ymin, xmin, ymax, xmax] = face.box_2d;
                const cx = toCanvasCoord(xmin, drawW, offsetX) + (toCanvasCoord(xmax, drawW, offsetX) - toCanvasCoord(xmin, drawW, offsetX))/2;
                const cy = toCanvasCoord(ymin, drawH, offsetY) + (toCanvasCoord(ymax, drawH, offsetY) - toCanvasCoord(ymin, drawH, offsetY))/2;

                setDragState({
                    mode,
                    startX: x, startY: y,
                    initialBox: [...face.box_2d],
                    initialRotation: face.rotation || 0,
                    centerX: cx, centerY: cy
                });
                return;
            }
        }

        for (let i = 0; i < detectedFaces.length; i++) {
            if (i === selectedFaceIndex) continue;
            if (checkHandleHit(x, y, i) === 'move') {
                setSelectedFaceIndex(i);
                const face = detectedFaces[i];
                setDragState({
                    mode: 'move',
                    startX: x, startY: y,
                    initialBox: [...face.box_2d],
                    initialRotation: face.rotation || 0
                });
                return;
            }
        }
        setSelectedFaceIndex(null);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (dragState.mode === 'none' || selectedFaceIndex === null || !baseImageObjRef.current) return;

        const { x, y } = getMousePos(e);
        const img = baseImageObjRef.current;
        const { drawW, drawH } = getRenderMetrics(img.width, img.height, containerSize.width, containerSize.height);

        const deltaX = ((x - dragState.startX) / drawW) * 1000;
        const deltaY = ((y - dragState.startY) / drawH) * 1000;
        
        const [initYmin, initXmin, initYmax, initXmax] = dragState.initialBox;
        let newBox = [...dragState.initialBox];
        let newRotation = dragState.initialRotation;

        if (dragState.mode === 'move') {
            const h = initYmax - initYmin;
            const w = initXmax - initXmin;
            newBox[0] = Math.max(0, Math.min(1000 - h, initYmin + deltaY));
            newBox[1] = Math.max(0, Math.min(1000 - w, initXmin + deltaX));
            newBox[2] = newBox[0] + h;
            newBox[3] = newBox[1] + w;
        } else if (dragState.mode === 'rotate') {
            const cx = dragState.centerX || 0;
            const cy = dragState.centerY || 0;
            const startAngle = Math.atan2(dragState.startY - cy, dragState.startX - cx);
            const currentAngle = Math.atan2(y - cy, x - cx);
            const angleDiff = (currentAngle - startAngle) * (180 / Math.PI);
            newRotation = (dragState.initialRotation + angleDiff);
        } else {
             // Resize logic (simplified)
            if (dragState.mode.includes('b')) newBox[2] = Math.min(1000, Math.max(initYmin + 50, initYmax + deltaY));
            if (dragState.mode.includes('t')) newBox[0] = Math.max(0, Math.min(initYmax - 50, initYmin + deltaY));
            if (dragState.mode.includes('r')) newBox[3] = Math.min(1000, Math.max(initXmin + 50, initXmax + deltaX));
            if (dragState.mode.includes('l')) newBox[1] = Math.max(0, Math.min(initXmax - 50, initXmin + deltaX));
        }

        const newFaces = [...detectedFaces];
        newFaces[selectedFaceIndex] = { ...newFaces[selectedFaceIndex], box_2d: newBox, rotation: newRotation };
        setDetectedFaces(newFaces);
    };

    const handleMouseUp = () => {
        setDragState({ mode: 'none', startX: 0, startY: 0, initialBox: [], initialRotation: 0 });
    };
    
    const handleUseResultAsBase = () => {
        if (resultImage) {
            setBaseImage(resultImage);
            setResultImage(null);
            setDetectedFaces([]);
            setSelectedFaceIndex(null);
            setEditHistory([]); 
            setSourceFaces({}); // Clear sources as face indices change
            setViewMode('default');
            detectFacesInImage(resultImage);
            addToast('Đã chuyển ảnh kết quả sang làm ảnh gốc. Đang quét lại...', 'success');
        }
    };

    const handleProcess = async () => {
        if (isProcessing || !loggedInUser || !baseImage) return;
        if (selectedFaceIndex === null) {
            addToast('Vui lòng chọn một khuôn mặt trên hình.', 'error');
            return;
        }
        
        const sourceFace = sourceFaces[selectedFaceIndex];
        if (!sourceFace) {
             addToast('Vui lòng tải ảnh thay thế cho khuôn mặt đang chọn.', 'error');
             return;
        }

        const cost = currentCost;
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
            const img = baseImageObjRef.current || new Image();
            if (!baseImageObjRef.current) {
                await new Promise(r => { img.onload = r; img.src = baseImage; });
            }
            
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = img.naturalWidth;
            maskCanvas.height = img.naturalHeight;
            const ctx = maskCanvas.getContext('2d');
            if (!ctx) throw new Error("Canvas error");

            ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
            
            const face = detectedFaces[selectedFaceIndex];
            let [ymin, xmin, ymax, xmax] = face.box_2d;

            const pixelY = (ymin / 1000) * img.naturalHeight;
            const pixelX = (xmin / 1000) * img.naturalWidth;
            const pixelH = ((ymax - ymin) / 1000) * img.naturalHeight;
            const pixelW = ((xmax - xmin) / 1000) * img.naturalWidth;
            
            ctx.fillStyle = '#FF0000'; 
            
            // Draw Mask
            ctx.beginPath();
            const cx = pixelX + pixelW/2;
            const cy = pixelY + pixelH/2;
            const rotationRad = (face.rotation || 0) * Math.PI / 180;
            
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rotationRad);
            ctx.translate(-cx, -cy);
            
            // Ellipse Mask with 1.2x Expansion
             ctx.ellipse(cx, cy, pixelW/2 * 1.2, pixelH/2 * 1.2, 0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();

            // Composite
            const compositeCanvas = document.createElement('canvas');
            compositeCanvas.width = img.naturalWidth;
            compositeCanvas.height = img.naturalHeight;
            const compCtx = compositeCanvas.getContext('2d')!;
            compCtx.drawImage(img, 0, 0);
            compCtx.drawImage(maskCanvas, 0, 0); 

            const compositeBase64 = compositeCanvas.toDataURL('image/png').split(',')[1];
            const sourceFaceBase64 = sourceFace.split(',')[1];

            const compositePart = { inlineData: { data: compositeBase64, mimeType: 'image/png' } };
            const sourcePart = { inlineData: { data: sourceFaceBase64, mimeType: 'image/png' } };
            
            const userInstruction = customPrompt ? `USER_ADDITIONAL_INSTRUCTION: "${customPrompt}"` : "";

            const prompt = `
            SYSTEM_ROLE: Expert Digital Compositor & VFX Artist.
            TASK: HIGH-FIDELITY FACE SWAP & IDENTITY TRANSFER (INPAINTING).
            INPUTS: Base Image with RED MASK, Source Face.
            ${userInstruction}
            CRITICAL:
            1. NO CROPPING. Maintain exact base image dimensions.
            2. BACKGROUND PRESERVATION: Do not modify unmasked areas.
            3. TARGET LOCKING: Use Red Mask as boundary.
            4. BLENDING: Match lighting, skin tone, and head pose.
            OUTPUT: The FULL composite image.
            `;

            const response = await aiService.generateContent({
                model: selectedModel,
                contents: { parts: [compositePart, sourcePart, { text: prompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const newImagePart = response.candidates?.[0]?.content?.parts[0];
            if (newImagePart && newImagePart.inlineData?.data) {
                const resultBase64 = `data:${newImagePart.inlineData.mimeType};base64,${newImagePart.inlineData.data}`;
                setEditHistory(prev => [...prev, resultImage]); // Save previous state
                setResultImage(resultBase64);

                const newResult: GenerationResult = {
                    taskId: `swap_${Date.now()}`,
                    date: new Date().toLocaleDateString('vi-VN'),
                    prompt: `[Face Swap] Face #${selectedFaceIndex + 1}`,
                    images: [resultBase64],
                    settings: { aspectRatio: 'custom', customRatio: null, quantity: 1, generationMode: 'Chất lượng', imageStyle: 'Realism' },
                    cost: cost,
                    balanceAfter: freshUser ? freshUser.creditBalance - cost : 0,
                    creationTime: new Date().toLocaleTimeString(),
                };

                handleSetGenerationHistory(loggedInUser.id, newResult);
                addToast('Ghép mặt thành công!', 'success');
            } else {
                throw new Error("API không trả về ảnh.");
            }

        } catch (error: any) {
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

    const handleDownload = (scale: number = 1) => {
        if (!resultImage) return;
        
        if (scale === 1) {
            const link = document.createElement('a');
            link.href = resultImage;
            link.download = `faceswap_result_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // Updated to support up to 4x scaling using default logic if no specific param
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = resultImage;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth * scale;
                canvas.height = img.naturalHeight * scale;
                const ctx = canvas.getContext('2d');
                if(ctx) {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    const link = document.createElement('a');
                    link.href = canvas.toDataURL('image/png');
                    link.download = `faceswap_result_${scale}x_${Date.now()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    addToast(`Đã tải xuống ảnh kích thước x${scale}`, 'success');
                }
            };
        }
        setShowDownloadOptions(false);
    };
    
    const handleLoadHistoryItem = (item: GenerationResult) => {
        setResultImage(item.images[0]);
        setBaseImage(null);
        setSourceFaces({});
        setDetectedFaces([]);
        setSelectedFaceIndex(null);
        setCustomPrompt('');
        setShowHistoryModal(false);
        addToast('Đã tải kết quả từ lịch sử.', 'success');
    };

    const handleDeleteHistoryItem = (taskId: string) => {
        if (loggedInUser) {
            handleDeleteGenerationResult(loggedInUser.id, taskId);
            addToast('Đã xóa.', 'info');
        }
    };

    // --- EXPAND FUNCTIONALITY ---
    const handleExpandResult = () => {
        if (resultImage) {
             setViewMode('expand');
        }
    };

    const handleExpandedImageGenerated = (result: {
        newImage: string;
        originalPrompt: string;
        expandPrompt: string;
        cost: number;
        balanceAfter: number;
        aspectRatio: { name: string, width: number, height: number };
    }) => {
        const newResult: GenerationResult = {
            taskId: `exp_swap_${Date.now()}`,
            date: new Date().toLocaleDateString('vi-VN'),
            prompt: `[Mở rộng Face Swap] ${result.expandPrompt}`,
            images: [result.newImage],
            settings: { 
                aspectRatio: 'custom', 
                customRatio: { width: result.aspectRatio.width, height: result.aspectRatio.height }, 
                quantity: 1, 
                generationMode: 'Chất lượng',
                imageStyle: 'Mặc định'
            },
            cost: result.cost,
            balanceAfter: result.balanceAfter,
            creationTime: new Date().toLocaleTimeString(),
        };
        if (loggedInUser) {
            handleSetGenerationHistory(loggedInUser.id, newResult);
        }
        setEditHistory(prev => [...prev, resultImage]);
        setResultImage(result.newImage);
        setViewMode('default');
        addToast('Đã mở rộng ảnh thành công!', 'success');
    };

    if (viewMode === 'expand' && resultImage) {
        return (
             <ExpandView 
                image={{ src: resultImage, prompt: "High quality portrait" }}
                onBack={() => setViewMode('default')}
                onGenerate={handleExpandedImageGenerated}
                tool={tool}
            />
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-950 text-gray-300">
            {/* History Modal */}
            <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Lịch sử Ghép Mặt" size="lg" hideFooter>
                <div className="max-h-[60vh] overflow-y-auto p-1 space-y-3">
                    {historyItems.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            <ClockIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>Chưa có lịch sử nào.</p>
                        </div>
                    ) : (
                        historyItems.map((item) => (
                            <div key={item.taskId} className="flex items-center gap-4 p-3 bg-slate-800 border border-slate-700 rounded-xl hover:border-indigo-500 transition-colors">
                                <div className="h-16 w-16 bg-slate-900 rounded-lg overflow-hidden flex-shrink-0 border border-slate-700">
                                    <img src={item.images[0]} alt="Result" className="h-full w-full object-contain" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{item.prompt}</p>
                                    <p className="text-xs text-slate-400 mt-1">{item.date} • {item.creationTime}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleLoadHistoryItem(item)} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500" title="Xem lại"><ArrowPathIcon className="h-4 w-4" /></button>
                                    <button onClick={() => handleDeleteHistoryItem(item.taskId)} className="p-2 bg-slate-700 text-red-400 rounded-lg hover:bg-slate-600" title="Xóa"><TrashIcon className="h-4 w-4" /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Modal>

            {/* Header */}
            <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-30 shadow-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate('Kho Tiện Ích')} className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <ArrowLeftIcon className="h-5 w-5" /> Quay lại
                    </button>
                    <h1 className="text-lg font-bold text-white flex items-center gap-2">
                        <FaceSmileIcon className="h-5 w-5 text-pink-500" />
                        Ghép Mặt AI (Smart Auto)
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <CreditBalanceDisplay balance={currentCredits} onAdd={() => onNavigate('Ví Của Tôi')} />
                    <button onClick={handleUndo} disabled={editHistory.length === 0} className={`p-2 rounded-lg transition-colors border ${editHistory.length > 0 ? 'text-white bg-slate-800 hover:bg-slate-700 border-slate-600' : 'text-slate-600 border-transparent cursor-not-allowed'}`} title="Hoàn tác (Undo)">
                        <ArrowUturnLeftIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => setShowHistoryModal(true)} className="p-2 text-indigo-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-indigo-900/50"><ClockIcon className="h-5 w-5" /></button>
                    <button onClick={handleResetSession} className="p-2 text-gray-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg"><ArrowPathIcon className="h-5 w-5" /></button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden">
                {/* SIDEBAR */}
                <aside className="w-96 bg-slate-900 border-r border-slate-800 flex flex-col overflow-y-auto">
                    <div className="p-6 space-y-8">
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
                                {activeModels.map(m => {
                                    const modelPrice = tool.modelPricing?.[m.id] ?? tool.creditCost;
                                    return (
                                        <option key={m.id} value={m.id}>
                                            {m.name} ({modelPrice} Credit)
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* 1. BASE IMAGE */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-bold text-indigo-400 uppercase flex items-center gap-2">
                                    <PhotoIcon className="h-4 w-4"/> 1. Ảnh Gốc
                                </label>
                                {baseImage && (
                                    <button onClick={() => detectFacesInImage(baseImage)} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-900/20 px-2 py-1 rounded" disabled={isDetecting}>
                                        <MagnifyingGlassIcon className={`h-3 w-3 ${isDetecting ? 'animate-spin' : ''}`}/> Quét lại
                                    </button>
                                )}
                            </div>

                            <div 
                                onClick={() => !baseImage && baseInputRef.current?.click()}
                                className={`h-48 border-2 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${baseImage ? 'border-indigo-500/50 bg-black' : 'border-dashed border-slate-700 hover:border-indigo-500 hover:bg-slate-800'}`}
                            >
                                {baseImage ? (
                                    <img src={baseImage} alt="Base" className="w-full h-full object-contain" />
                                ) : (
                                    <div className="text-center p-4">
                                        <UserGroupIcon className="h-10 w-10 mx-auto mb-2 text-slate-600 group-hover:text-indigo-500" />
                                        <p className="text-sm font-medium text-slate-400 group-hover:text-white">Tải ảnh nhóm/mẫu</p>
                                    </div>
                                )}
                                {baseImage && <button onClick={() => { setBaseImage(null); setDetectedFaces([]); setSelectedFaceIndex(null); setSourceFaces({}); }} className="absolute top-2 right-2 bg-red-600/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="h-4 w-4"/></button>}
                                <input type="file" ref={baseInputRef} onChange={(e) => handleFileUpload(e, 'base')} className="hidden" accept="image/*" />
                            </div>
                        </div>

                        {/* 2. SOURCE FACES (Dynamic List) */}
                        <div className="space-y-4 pt-6 border-t border-slate-800" ref={sourceSectionRef}>
                            <label className="text-sm font-bold text-pink-400 uppercase flex items-center gap-2">
                                <FaceSmileIcon className="h-4 w-4"/> 2. Khuôn Mặt Thay Thế
                            </label>
                            
                            {detectedFaces.length === 0 ? (
                                <div className="text-center py-6 text-slate-500 text-sm border border-slate-700 border-dashed rounded-xl bg-slate-800/30">
                                    {baseImage ? (isDetecting ? 'Đang quét khuôn mặt...' : 'Chưa tìm thấy khuôn mặt nào.') : 'Vui lòng tải ảnh gốc trước.'}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {detectedFaces.map((_, index) => {
                                        const isSelected = index === selectedFaceIndex;
                                        const isAligning = aligningIndices.includes(index);
                                        const hasSource = !!sourceFaces[index];
                                        
                                        return (
                                            <div 
                                                key={index} 
                                                id={`source-face-card-${index}`}
                                                className={`p-3 rounded-xl border transition-all ${isSelected ? 'border-pink-500 bg-pink-900/10 ring-1 ring-pink-500/50' : 'border-slate-700 bg-slate-800 hover:border-slate-600'}`}
                                            >
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className={`text-xs font-bold ${isSelected ? 'text-pink-300' : 'text-slate-400'}`}>Khuôn mặt #{index + 1}</span>
                                                    {isAligning ? (
                                                        <span className="text-[10px] text-pink-400 animate-pulse flex items-center gap-1"><ArrowPathIcon className="h-3 w-3 animate-spin"/> Đang xử lý...</span>
                                                    ) : hasSource ? (
                                                        <div className="flex gap-2">
                                                             <button onClick={(e) => handleDownloadSource(e, index)} className="text-xs text-green-400 hover:text-green-300"><DocumentArrowDownIcon className="h-4 w-4"/></button>
                                                             <button onClick={(e) => handleRemoveSource(e, index)} className="text-xs text-red-400 hover:text-red-300"><TrashIcon className="h-4 w-4"/></button>
                                                        </div>
                                                    ) : null}
                                                </div>
                                                
                                                <div 
                                                    onClick={() => {
                                                        setSelectedFaceIndex(index);
                                                        // Click to upload if empty
                                                        if (!hasSource) faceInputRefs.current[index]?.click();
                                                    }}
                                                    className={`h-24 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer relative overflow-hidden transition-colors ${hasSource ? 'border-transparent bg-black' : 'border-slate-600 hover:border-pink-400 hover:bg-slate-700'}`}
                                                >
                                                    {hasSource ? (
                                                        <img src={sourceFaces[index]} alt={`Source ${index}`} className="w-full h-full object-contain" />
                                                    ) : (
                                                        <div className="text-center">
                                                            <PlusIcon className="h-6 w-6 mx-auto mb-1 text-slate-500" />
                                                            <span className="text-[10px] text-slate-400">Chọn ảnh</span>
                                                        </div>
                                                    )}
                                                    {/* Hidden Input specific for this index */}
                                                    <input 
                                                        type="file" 
                                                        ref={el => { faceInputRefs.current[index] = el; }}
                                                        onChange={(e) => handleFileUpload(e, 'source', index)} 
                                                        className="hidden" 
                                                        accept="image/*" 
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* 3. CUSTOM PROMPT (OPTIONAL) */}
                        <div className="space-y-3 pt-6 border-t border-slate-800">
                             <label className="text-sm font-bold text-green-400 uppercase flex items-center gap-2">
                                <ChatBubbleBottomCenterTextIcon className="h-4 w-4"/> 3. Prompt (Tùy chọn)
                            </label>
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                                <textarea 
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    rows={2}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-green-500 outline-none resize-none"
                                    placeholder="Mô tả thêm (VD: cười tươi, sáng da...)"
                                />
                            </div>
                        </div>

                        {/* PROCESS BUTTON */}
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mt-auto sticky bottom-0">
                            <div className="flex justify-between items-center text-sm mb-3">
                                <span className="text-slate-400">Chi phí:</span>
                                <span className="font-bold text-white flex items-center gap-1">
                                    <SparklesIcon className="h-4 w-4 text-yellow-400" /> {currentCost} Credit
                                </span>
                            </div>
                            <button 
                                onClick={handleProcess}
                                disabled={isProcessing || !baseImage || selectedFaceIndex === null || !sourceFaces[selectedFaceIndex] || aligningIndices.includes(selectedFaceIndex)}
                                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform active:scale-95"
                            >
                                {isProcessing ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <SparklesIcon className="h-5 w-5" />}
                                {isProcessing ? 'Đang xử lý...' : 'Ghép Mặt (Đang chọn)'}
                            </button>
                            <p className="text-[10px] text-center text-slate-500 mt-2">
                                Chọn một khuôn mặt và ảnh nguồn để ghép.
                            </p>
                        </div>
                    </div>
                </aside>

                {/* RIGHT: MAIN CANVAS */}
                <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                    
                    {resultImage ? (
                        <div className="relative w-full h-full p-8 flex flex-col items-center justify-center">
                            <div className="absolute top-6 left-6 z-20">
                                <button onClick={() => setResultImage(null)} className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 text-white rounded-lg hover:bg-slate-700 transition-colors backdrop-blur-md border border-slate-700">
                                    <ArrowUturnLeftIcon className="h-4 w-4" /> Quay lại chọn mặt
                                </button>
                            </div>
                            
                            <div className="relative shadow-2xl rounded-lg overflow-hidden border border-indigo-500/30 max-w-full max-h-full">
                                <img src={resultImage} alt="Result" className="max-w-full max-h-[calc(100vh-150px)] object-contain" />
                            </div>

                            <div className="flex gap-3 mt-6 z-20">
                                 <button onClick={handleExpandResult} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full shadow-lg transition-colors flex items-center gap-2">
                                    <ArrowsPointingOutIcon className="h-4 w-4" /> Mở rộng (Expand)
                                </button>
                                <button onClick={handleUseResultAsBase} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-full shadow-lg transition-colors flex items-center gap-2">
                                    <ArrowPathIcon className="h-4 w-4" /> Dùng làm gốc (Ghép tiếp)
                                </button>
                                <div className="relative">
                                    <button onClick={() => setShowDownloadOptions(!showDownloadOptions)} className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-full shadow-lg transition-colors flex items-center gap-2">
                                        <DocumentArrowDownIcon className="h-4 w-4" /> Tải xuống
                                    </button>
                                    {showDownloadOptions && (
                                        <div className="absolute bottom-full right-0 mb-2 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-fadeIn z-20">
                                            <button onClick={() => handleDownload(1)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50">1x (Gốc)</button>
                                            <button onClick={() => handleDownload(2)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50">2x (Cao)</button>
                                            <button onClick={() => handleDownload(3)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50">3x (Siêu nét)</button>
                                            <button onClick={() => handleDownload(4)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors">4x (Cực đại)</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div 
                            ref={containerRef}
                            className="w-full h-full relative"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            style={{ cursor: dragState.mode !== 'none' ? 'grabbing' : 'default' }}
                        >
                            {!baseImage ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40 pointer-events-none">
                                    <PhotoIcon className="h-20 w-20 text-slate-600 mb-4" />
                                    <h3 className="text-xl font-bold text-slate-500">Chưa có ảnh</h3>
                                    <p className="text-slate-600">Vui lòng tải ảnh gốc ở cột bên trái</p>
                                </div>
                            ) : (
                                <>
                                    <canvas 
                                        ref={canvasRef} 
                                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-full max-h-full object-contain pointer-events-auto"
                                        style={{ cursor: dragState.mode !== 'none' ? 'grabbing' : 'crosshair' }}
                                    />
                                    
                                    {/* Overlay Messages */}
                                    {isDetecting && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 pointer-events-none">
                                             <div className="flex flex-col items-center gap-3">
                                                 <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                                 <span className="text-green-400 font-bold text-lg animate-pulse">AI đang quét khuôn mặt...</span>
                                             </div>
                                        </div>
                                    )}
                                    
                                    {!isDetecting && detectedFaces.length > 0 && selectedFaceIndex === null && (
                                         <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-indigo-600/90 backdrop-blur-md px-6 py-3 rounded-full text-sm text-white shadow-xl animate-bounce pointer-events-none z-20 border border-indigo-400 flex items-center gap-2">
                                            <CursorArrowRaysIcon className="h-5 w-5" /> Click chọn khuôn mặt cần thay
                                         </div>
                                    )}
                                    
                                    {selectedFaceIndex !== null && (
                                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md border border-green-500/50 px-6 py-3 rounded-xl text-sm text-white shadow-xl pointer-events-none z-20 text-center flex flex-col gap-1">
                                            <span className="font-bold text-green-400 flex items-center justify-center gap-2"><CheckIcon className="h-4 w-4"/> Đã chọn Face #{selectedFaceIndex + 1}</span>
                                            <span className="text-xs text-slate-400">Chọn ảnh nguồn bên trái để thay thế.</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default FaceSwapTool;
