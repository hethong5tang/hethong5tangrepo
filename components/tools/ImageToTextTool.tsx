
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { 
    ArrowLeftIcon, DocumentTextIcon, ScannerIcon, LanguageIcon, 
    ClipboardIcon, ArrowUpTrayIcon, TrashIcon, CheckCircleIcon,
    ArrowPathIcon, DocumentArrowDownIcon, XCircleIcon, 
    TableCellsIcon, ClockIcon, PencilSquareIcon, ChatBubbleBottomCenterTextIcon,
    MagnifyingGlassIcon, SparklesIcon, CheckIcon, CpuChipSolidIcon, BoltIcon,
    ChevronUpIcon, ChevronDownIcon
} from '../Icons';
import { IntegrationTool } from '../../features/settings/types';
import { useAuth } from '../../features/auth/useAuth';
import { useUser } from '../../features/users/useUser';
import { useActions } from '../../features/actions/useActions';
import { useToast } from '../../components/ToastProvider';
import { useSettings } from '../../features/settings/useSettings';
import { ALL_GEMINI_MODELS, isModelInCategory } from '../../constants';
import { findUserInTree } from '../../services/userService';
import { GenerationResult } from '../../features/users/types';
import CreditBalanceDisplay from './CreditBalanceDisplay';
import Modal from '../../components/Modal';

interface ImageToTextToolProps {
    tool: IntegrationTool;
    onNavigate: (page: string) => void;
}

type OcrMode = 'raw' | 'layout' | 'invoice' | 'handwriting';
type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

interface OcrFile {
    id: string;
    file: File;
    preview: string;
    status: ProcessingStatus;
    resultText?: string;
    resultJson?: any;
    confidence?: number;
    language?: string;
}


// --- Helper: Convert Markdown to HTML for Word ---
const convertMarkdownToHtml = (markdown: string): string => {
    if (!markdown) return '';

    let html = markdown
        // Sanitize basic XML chars to avoid breaking the Doc structure
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // 1. Tables: Convert Markdown tables to HTML tables (Basic support)
    // Regex logic: Look for lines starting with |
    const lines = html.split('\n');
    let inTable = false;
    let processedLines = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        if (line.startsWith('|') && line.endsWith('|')) {
            if (!inTable) {
                processedLines.push('<table style="border-collapse: collapse; width: 100%; margin-bottom: 1rem;">');
                inTable = true;
            }
            
            // Check if it's a separator line (e.g. |---|---|)
            if (line.match(/^\|[\s-]+\|/)) {
                continue; // Skip separator line
            }

            const cells = line.split('|').filter(c => c.length > 0); // Split and remove empty first/last
            const rowHtml = cells.map(cell => `<td style="border: 1px solid #000; padding: 8px;">${cell.trim()}</td>`).join('');
            processedLines.push(`<tr>${rowHtml}</tr>`);
        } else {
            if (inTable) {
                processedLines.push('</table>');
                inTable = false;
            }
            // Headers
            if (line.startsWith('### ')) line = `<h3>${line.replace('### ', '')}</h3>`;
            else if (line.startsWith('## ')) line = `<h2>${line.replace('## ', '')}</h2>`;
            else if (line.startsWith('# ')) line = `<h1>${line.replace('# ', '')}</h1>`;
            // Lists
            else if (line.startsWith('- ')) line = `<li>${line.replace('- ', '')}</li>`; // Simple list handling (Word handles <li> ok without <ul> sometimes, or we treat as p)
            // Bold
            line = line.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            // Italic
            line = line.replace(/\*(.*?)\*/g, '<i>$1</i>');
            
            // Paragraphs (Important: Replace newlines with <p> or <br> to keep structure)
            if (line.length > 0 && !line.startsWith('<')) {
                 line = `<p style="margin-bottom: 10px;">${line}</p>`;
            }

            processedLines.push(line);
        }
    }
    if (inTable) processedLines.push('</table>');

    return processedLines.join('');
};

const ImageToTextTool: React.FC<ImageToTextToolProps> = ({ tool, onNavigate }) => {
    const { loggedInUser } = useAuth();
    const { userState } = useUser();
    const { handleUseToolCredit, handleSetGenerationHistory, handleDeleteGenerationResult } = useActions();
    const { addToast } = useToast();
    const { settingsState } = useSettings();

    // UseMemo for models
    const activeModels = useMemo(() => {
        const activeIds = settingsState.systemSettings.activeGeminiModels || [];
        const fallback = ALL_GEMINI_MODELS.filter(m => activeIds.includes(m.id) && isModelInCategory(m, 'image'));
        
        const toolSpecificModels = tool.modelPricing ? Object.keys(tool.modelPricing) : [];
        if (toolSpecificModels.length > 0) {
            const toolFiltered = ALL_GEMINI_MODELS.filter(m => toolSpecificModels.includes(m.id) && activeIds.includes(m.id) && isModelInCategory(m, 'image'));
            if (toolFiltered.length > 0) return toolFiltered;
        }

        return fallback.length > 0 ? fallback : [ALL_GEMINI_MODELS[0]];
    }, [settingsState.systemSettings.activeGeminiModels, tool.modelPricing]);

    // Use correct key from environment
    const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    
    // State
    const [files, setFiles] = useState<OcrFile[]>([]);
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
    const [ocrMode, setOcrMode] = useState<OcrMode>('layout');
    const [targetLanguage, setTargetLanguage] = useState<string>('auto');
    const [autoCorrect, setAutoCorrect] = useState(true);
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    const [selectedModel, setSelectedModel] = useState<string>(activeModels[0].id);

    useEffect(() => {
        if (!activeModels.some(m => m.id === selectedModel)) {
            setSelectedModel(activeModels[0].id);
        }
    }, [activeModels, selectedModel]);
    
    // UI State
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    const freshUser = useMemo(() => loggedInUser ? findUserInTree(userState.allUsers, loggedInUser.id) : null, [userState.allUsers, loggedInUser]);
    const currentCredits = freshUser ? freshUser.creditBalance : 0;
    const selectedFile = useMemo(() => files.find(f => f.id === selectedFileId), [files, selectedFileId]);

    // History Items
    const historyItems = useMemo(() => {
        if (!loggedInUser?.generationHistory) return [];
        return loggedInUser.generationHistory
            .filter(h => h.taskId.startsWith('ocr_'))
            .sort((a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime());
    }, [loggedInUser]);

    // Handle File Upload
    const handleFilesAdded = useCallback((newFiles: FileList | File[] | null) => {
        if (!newFiles) return;
        const newOcrFiles: OcrFile[] = Array.from(newFiles).map(file => ({
            id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            file,
            preview: URL.createObjectURL(file),
            status: 'idle',
        }));
        
        setFiles(prev => [...prev, ...newOcrFiles]);
        
        setSelectedFileId(prevId => {
             if (!prevId && newOcrFiles.length > 0) {
                 return newOcrFiles[0].id;
             }
             return prevId;
        });
    }, []);

    // Handle Paste Event
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (e.clipboardData && e.clipboardData.items) {
                const pastedFiles: File[] = [];
                for (let i = 0; i < e.clipboardData.items.length; i++) {
                    const item = e.clipboardData.items[i];
                    if (item.type.indexOf('image') !== -1) {
                        const file = item.getAsFile();
                        if (file) {
                            pastedFiles.push(file);
                        }
                    }
                }
                if (pastedFiles.length > 0) {
                    handleFilesAdded(pastedFiles);
                    addToast('Đã dán ảnh từ Clipboard!', 'success');
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [handleFilesAdded, addToast]);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropZoneRef.current) dropZoneRef.current.classList.remove('border-indigo-500', 'bg-indigo-500/10');
        handleFilesAdded(e.dataTransfer.files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropZoneRef.current) dropZoneRef.current.classList.add('border-indigo-500', 'bg-indigo-500/10');
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropZoneRef.current) dropZoneRef.current.classList.remove('border-indigo-500', 'bg-indigo-500/10');
    };

    const removeFile = (id: string) => {
        setFiles(prev => {
            const newFiles = prev.filter(f => f.id !== id);
            if (selectedFileId === id) {
                setSelectedFileId(newFiles.length > 0 ? newFiles[0].id : null);
            }
            // Revoke URL to avoid memory leak
            const fileToRemove = prev.find(f => f.id === id);
            if(fileToRemove) URL.revokeObjectURL(fileToRemove.preview);
            return newFiles;
        });
    };

    const clearAllFiles = () => {
        files.forEach(f => URL.revokeObjectURL(f.preview));
        setFiles([]);
        setSelectedFileId(null);
    };

    // --- OCR LOGIC ---
    const processSingleFile = async (fileId: string) => {
        const fileObj = files.find(f => f.id === fileId);
        if (!fileObj || fileObj.status === 'completed' || fileObj.status === 'processing') return;

        if (!loggedInUser) return;
        
        // Credit Check
        const cost = tool.creditCost;
        if (currentCredits < cost) {
             addToast('Không đủ Credit.', 'error');
             return;
        }

        // Update Status
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'processing' } : f));
        
        try {
            // Deduct Credit
            const creditResult = await handleUseToolCredit(loggedInUser.id, { ...tool, creditCost: cost });
            if (!creditResult.success) throw new Error("Credit deduction failed");

            // Prepare AI Request
            const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
            
            // Convert file to base64
            const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(fileObj.file);
            });
            
            const mimeType = fileObj.file.type;
            const imagePart = { inlineData: { data: base64Data.split(',')[1], mimeType } };

            let prompt = "";

            if (ocrMode === 'invoice') {
                prompt = `
                Extract data from this document/invoice. 
                Identify key fields: Invoice Number, Date, Vendor Name, Total Amount, Tax, Line Items.
                Return ONLY valid JSON.
                ${autoCorrect ? "Correct any scanning errors or typos." : ""}
                `;
            } else if (ocrMode === 'layout') {
                prompt = `
                Transcribe the text from this image exactly as it appears. 
                Preserve the layout using Markdown (headers, tables, lists, bold/italic).
                Make sure tables are formatted as markdown tables.
                ${targetLanguage !== 'auto' ? `Translate the content to ${targetLanguage}.` : ""}
                ${autoCorrect ? "Fix spelling mistakes and standardize punctuation." : ""}
                `;
            } else if (ocrMode === 'handwriting') {
                prompt = `
                Transcribe this handwritten text. 
                Be careful with cursive and connected letters.
                Output plain text.
                ${autoCorrect ? "Infer missing words or fix grammar intelligently." : ""}
                `;
            } else {
                // Raw
                prompt = "Extract all text from this image. Output raw string.";
            }

            const response = await ai.models.generateContent({
                model: selectedModel,
                contents: { parts: [imagePart, { text: prompt }] },
            });

            const resultText = response.text || "";
            
            // Update State with Result
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'completed', resultText: resultText } : f));
            
            // Save History
            const newResult: GenerationResult = {
                taskId: `ocr_${Date.now()}`,
                date: new Date().toLocaleDateString('vi-VN'),
                prompt: `[OCR ${ocrMode}] ${fileObj.file.name}`,
                images: [], // No image generation
                settings: { 
                    aspectRatio: 'custom', quantity: 1, generationMode: 'Tiêu chuẩn', customRatio: null, 
                    // Storing text result in a special way or just as metadata? 
                    // Reusing imageStyle field for text storage to fit schema without migration
                    imageStyle: JSON.stringify({ text: resultText.substring(0, 100) + "..." }) 
                },
                cost: cost,
                balanceAfter: freshUser ? freshUser.creditBalance - cost : 0,
                creationTime: new Date().toLocaleTimeString(),
            };
            handleSetGenerationHistory(loggedInUser.id, newResult);

        } catch (error) {
            console.error("OCR Error:", error);
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'failed' } : f));
            addToast(`Lỗi xử lý file ${fileObj.file.name}`, 'error');
        }
    };

    const handleProcessAll = async () => {
        setIsBatchProcessing(true);
        const pendingFiles = files.filter(f => f.status === 'idle');
        
        for (const file of pendingFiles) {
            await processSingleFile(file.id);
        }
        setIsBatchProcessing(false);
        addToast('Hoàn tất xử lý hàng loạt!', 'success');
    };

    const handleCopyText = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast('Đã sao chép văn bản!', 'success');
    };

    const handleDownloadResult = (format: 'txt' | 'doc' | 'pdf' | 'json' | 'md') => {
        if (!selectedFile || !selectedFile.resultText) return;
        
        const textContent = selectedFile.resultText;
        const fileName = selectedFile.file.name.split('.')[0];
        
        if (format === 'pdf') {
            // Simple PDF generation using print method (works natively)
            const printWindow = window.open('', '', 'width=800,height=600');
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                    <head>
                        <title>${fileName}</title>
                        <style>
                            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
                            body { font-family: 'Inter', sans-serif; padding: 20px; line-height: 1.6; white-space: pre-wrap; }
                            h1 { border-bottom: 1px solid #ccc; padding-bottom: 10px; }
                            table { border-collapse: collapse; width: 100%; margin: 15px 0; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            th { background-color: #f2f2f2; }
                        </style>
                    </head>
                    <body>
                        <h1>${fileName} - OCR Result</h1>
                        <div>${convertMarkdownToHtml(textContent)}</div>
                    </body>
                    </html>
                `);
                printWindow.document.close();
                printWindow.focus();
                // Need a small delay for content to load
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);
            }
            setShowDownloadMenu(false);
            return;
        }

        let content = textContent;
        let mimeType = 'text/plain';
        let extension = 'txt';

        if (format === 'doc') {
            // HTML mimicry for Word with improved structure from Markdown
            mimeType = 'application/msword';
            extension = 'doc';
            const htmlContent = convertMarkdownToHtml(textContent);
            
            content = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                <head>
                    <meta charset='utf-8'>
                    <title>${fileName}</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; line-height: 1.5; }
                        table { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
                        td, th { border: 1px solid #000; padding: 5px 10px; }
                    </style>
                </head>
                <body>
                    ${htmlContent}
                </body>
                </html>
            `;
        } else if (format === 'json') {
            mimeType = 'application/json';
            extension = 'json';
            try {
                content = JSON.stringify(JSON.parse(textContent), null, 2);
            } catch {
                content = JSON.stringify({ filename: fileName, content: textContent }, null, 2);
            }
        } else if (format === 'md') {
            extension = 'md';
            // Markdown content is already in textContent
        }

        const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}_ocr.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setShowDownloadMenu(false);
        addToast(`Đã tải xuống file .${extension}`, 'success');
    };

    // Helper to render file icon status
    const renderStatusIcon = (status: ProcessingStatus) => {
        switch(status) {
            case 'completed': return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
            case 'failed': return <XCircleIcon className="h-5 w-5 text-red-500" />;
            case 'processing': return <ArrowPathIcon className="h-5 w-5 text-indigo-500 animate-spin" />;
            default: return <div className="w-5 h-5 rounded-full border-2 border-slate-600" />;
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#0f172a] text-slate-200 font-sans">
             {/* HISTORY MODAL */}
             <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Lịch sử OCR" size="lg" hideFooter>
                <div className="max-h-[60vh] overflow-y-auto p-1 space-y-3">
                    {historyItems.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            <ClockIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>Chưa có lịch sử nào.</p>
                        </div>
                    ) : (
                        historyItems.map((item) => (
                            <div key={item.taskId} className="flex items-center gap-4 p-3 bg-slate-800 border border-slate-700 rounded-xl hover:border-indigo-500 transition-colors">
                                <div className="p-3 bg-slate-700 rounded-lg">
                                    <DocumentTextIcon className="h-6 w-6 text-slate-300" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{item.prompt}</p>
                                    <p className="text-xs text-slate-400 mt-1">{item.date} • {item.creationTime}</p>
                                </div>
                                <button onClick={() => handleDeleteGenerationResult(loggedInUser!.id, item.taskId)} className="p-2 bg-slate-700 text-red-400 rounded-lg hover:bg-slate-600" title="Xóa"><TrashIcon className="h-4 w-4" /></button>
                            </div>
                        ))
                    )}
                </div>
            </Modal>

            <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-30 shadow-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate('Kho Tiện Ích')} className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors">
                        <ArrowLeftIcon className="h-5 w-5" /> Quay lại
                    </button>
                    <h1 className="text-lg font-bold text-white flex items-center gap-2">
                        <ScannerIcon className="h-6 w-6 text-indigo-500" />
                        OCR Pro - Trích xuất Văn bản
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <CreditBalanceDisplay balance={currentCredits} onAdd={() => onNavigate('Ví Của Tôi')} />
                    <button onClick={() => setShowHistoryModal(true)} className="p-2 text-indigo-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-indigo-900/50"><ClockIcon className="h-5 w-5" /></button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* LEFT: FILE MANAGER */}
                <aside className="w-80 bg-[#161b22] border-r border-slate-800 flex flex-col">
                    <div className="p-4 border-b border-slate-800">
                        <div 
                            ref={dropZoneRef}
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            className="border-2 border-dashed border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/10 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all"
                        >
                            <ArrowUpTrayIcon className="h-8 w-8 text-slate-500 mb-2" />
                            <p className="text-sm font-medium text-slate-300">Kéo thả, Click hoặc Dán ảnh (Ctrl+V)</p>
                            <p className="text-xs text-slate-500 mt-1">Hỗ trợ JPG, PNG, PDF</p>
                            <input type="file" ref={fileInputRef} onChange={(e) => handleFilesAdded(e.target.files)} className="hidden" multiple accept="image/*,application/pdf" />
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {files.map(file => (
                            <div 
                                key={file.id} 
                                onClick={() => setSelectedFileId(file.id)}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all ${selectedFileId === file.id ? 'bg-indigo-900/20 border-indigo-500' : 'bg-slate-800/50 border-transparent hover:bg-slate-800 hover:border-slate-700'}`}
                            >
                                <div className="h-10 w-10 bg-black rounded overflow-hidden flex-shrink-0">
                                    <img src={file.preview} className="w-full h-full object-cover" alt="thumb" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${selectedFileId === file.id ? 'text-indigo-300' : 'text-slate-300'}`}>{file.file.name}</p>
                                    <p className="text-xs text-slate-500">{(file.file.size / 1024).toFixed(1)} KB</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {renderStatusIcon(file.status)}
                                    <button onClick={(e) => { e.stopPropagation(); removeFile(file.id); }} className="text-slate-600 hover:text-red-400 p-1"><TrashIcon className="h-4 w-4"/></button>
                                </div>
                            </div>
                        ))}
                        {files.length === 0 && (
                            <div className="text-center py-10 text-slate-600 italic text-sm">Chưa có file nào</div>
                        )}
                    </div>
                    
                    {files.length > 0 && (
                         <div className="p-4 border-t border-slate-800 flex gap-2">
                             <button onClick={clearAllFiles} className="flex-1 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors">Xóa tất cả</button>
                             <button onClick={handleProcessAll} disabled={isBatchProcessing} className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                                {isBatchProcessing ? <ArrowPathIcon className="h-3 w-3 animate-spin"/> : <BoltIcon className="h-3 w-3"/>} Xử lý ({files.length})
                             </button>
                         </div>
                    )}
                </aside>

                {/* MIDDLE: PREVIEW & SETTINGS */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#0f172a] relative">
                    {/* Settings Toolbar */}
                    <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-4 overflow-x-auto scrollbar-none shrink-0">
                        <div className="flex items-center gap-2 border-r border-slate-700 pr-4">
                            <span className="text-xs text-slate-500 font-bold uppercase">Chế độ</span>
                            <select 
                                value={ocrMode} 
                                onChange={(e) => setOcrMode(e.target.value as OcrMode)} 
                                className="bg-slate-800 text-slate-200 text-xs rounded border border-slate-700 px-2 py-1 outline-none focus:border-indigo-500"
                            >
                                <option value="raw">Văn bản thô (Raw)</option>
                                <option value="layout">Giữ bố cục (Layout)</option>
                                <option value="invoice">Hóa đơn/Form (Invoice)</option>
                                <option value="handwriting">Chữ viết tay</option>
                            </select>
                        </div>
                        
                        <div className="flex items-center gap-2 border-r border-slate-700 pr-4">
                             <span className="text-xs text-slate-500 font-bold uppercase">Ngôn ngữ đích</span>
                             <select 
                                value={targetLanguage} 
                                onChange={(e) => setTargetLanguage(e.target.value)} 
                                className="bg-slate-800 text-slate-200 text-xs rounded border border-slate-700 px-2 py-1 outline-none focus:border-indigo-500"
                            >
                                <option value="auto">Gốc (Auto)</option>
                                <option value="vietnamese">Tiếng Việt</option>
                                <option value="english">English</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                             <button 
                                onClick={() => setAutoCorrect(!autoCorrect)}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors ${autoCorrect ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-slate-800 text-slate-500 border-slate-700'}`}
                             >
                                 <SparklesIcon className="h-3 w-3" /> Auto Correct
                             </button>
                        </div>
                    </div>

                    {/* Preview Area */}
                    <div className="flex-1 p-8 flex items-center justify-center overflow-auto relative">
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                        
                        {selectedFile ? (
                            <div className="relative max-w-full max-h-full shadow-2xl rounded-lg overflow-hidden border border-slate-700 bg-black">
                                <img src={selectedFile.preview} alt="Preview" className="max-w-full max-h-[calc(100vh-200px)] object-contain" />
                                {selectedFile.status === 'processing' && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                        <span className="text-indigo-400 font-bold animate-pulse">Đang trích xuất AI...</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center opacity-30">
                                <DocumentTextIcon className="h-24 w-24 mx-auto mb-4 text-slate-500" />
                                <p className="text-xl font-bold text-slate-400">Chọn file để xem trước</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: RESULT PANEL */}
                <aside className="w-96 bg-[#161b22] border-l border-slate-800 flex flex-col">
                    <div className="p-4 border-b border-slate-800 bg-slate-900 flex flex-col gap-4">
                        {/* MODEL SELECTOR */}
                        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
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

                        <div className="flex flex-col gap-3">
                             <div className="flex justify-between items-center">
                                <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2"><ChatBubbleBottomCenterTextIcon className="h-4 w-4 text-green-500"/> Kết quả trích xuất</h3>
                                
                                {selectedFile?.status === 'completed' && (
                                     <div className="flex gap-2">
                                        <button onClick={() => handleCopyText(selectedFile.resultText || '')} className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors" title="Copy">
                                            <ClipboardIcon className="h-4 w-4" />
                                        </button>
                                        <div className="relative">
                                            <button 
                                                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                                                className="p-1.5 bg-green-600 hover:bg-green-500 text-white border border-green-500 rounded-lg transition-colors"
                                                title="Tải xuống"
                                            >
                                                <DocumentArrowDownIcon className="h-4 w-4" />
                                            </button>
                                            {showDownloadMenu && (
                                                <div className="absolute top-full right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-fadeIn z-20">
                                                    <button onClick={() => handleDownloadResult('txt')} className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50 flex items-center gap-2">
                                                        <DocumentTextIcon className="h-3.5 w-3.5" /> TXT (Văn bản thô)
                                                    </button>
                                                    <button onClick={() => handleDownloadResult('doc')} className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50 flex items-center gap-2">
                                                        <DocumentTextIcon className="h-3.5 w-3.5 text-blue-400" /> DOC (Microsoft Word)
                                                    </button>
                                                    <button onClick={() => handleDownloadResult('pdf')} className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50 flex items-center gap-2">
                                                        <DocumentTextIcon className="h-3.5 w-3.5 text-red-400" /> PDF (Tài liệu)
                                                    </button>
                                                    <button onClick={() => handleDownloadResult('md')} className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50 flex items-center gap-2">
                                                        <TableCellsIcon className="h-3.5 w-3.5" /> MD (Markdown)
                                                    </button>
                                                    <button onClick={() => handleDownloadResult('json')} className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2">
                                                        <CpuChipSolidIcon className="h-3.5 w-3.5" /> JSON (Dữ liệu)
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                     </div>
                                )}
                            </div>
                            
                            {selectedFile?.status === 'idle' ? (
                                <button onClick={() => processSingleFile(selectedFile.id)} className="w-full text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-md font-bold transition-colors shadow-lg flex items-center justify-center gap-2">
                                    <BoltIcon className="h-4 w-4" /> Bắt đầu quét
                                </button>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto p-4 font-sans text-sm text-slate-300 bg-[#0d1117] selection:bg-indigo-500/30">
                        {selectedFile ? (
                            selectedFile.status === 'completed' ? (
                                <div className="whitespace-pre-wrap leading-relaxed font-sans font-sans">{selectedFile.resultText}</div>
                            ) : selectedFile.status === 'processing' ? (
                                <div className="h-full flex items-center justify-center text-slate-500 italic">Đang xử lý...</div>
                            ) : selectedFile.status === 'failed' ? (
                                <div className="h-full flex items-center justify-center text-red-400">Xử lý thất bại.</div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-600">Nhấn "Bắt đầu quét" để xem kết quả.</div>
                            )
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-600">Chưa chọn file.</div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default ImageToTextTool;
