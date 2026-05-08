
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '../../Icons';

// --- INTERFACES ---

export interface TextStyle {
    fontFamily: string;
    fontSize: number; 
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    textDecoration: 'none' | 'underline';
    textAlign: 'left' | 'center' | 'right';
    color: string;
    letterSpacing: number; 
    lineHeight: number; 

    strokeEnabled: boolean;
    strokeColor: string;
    strokeWidth: number;

    backgroundEnabled: boolean;
    backgroundColor: string;
    backgroundOpacity: number; 
    padding: number;
    borderRadius: number;

    shadowEnabled: boolean;
    shadowColor: string;
    shadowBlur: number;
    shadowOffsetX: number;
    shadowOffsetY: number;
    
    opacity: number; 
    mixBlendMode: string;

    skewX: number;
    curve: number; 
}

// --- UI COMPONENTS ---

export const ColorPickerCircle: React.FC<{ color: string; onChange: (c: string) => void; size?: string }> = ({ color, onChange, size = "h-6 w-6" }) => (
    <div className={`relative ${size} rounded-full overflow-hidden border border-gray-600 cursor-pointer ring-1 ring-offset-1 ring-offset-[#1e1e1e] ring-transparent hover:ring-gray-500`}>
        <input 
            type="color" 
            value={color} 
            onChange={(e) => onChange(e.target.value)} 
            className="absolute inset-0 w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 p-0 border-none cursor-pointer"
        />
    </div>
);

export const KeyframeButton: React.FC<{ active?: boolean; onClick?: () => void }> = ({ active, onClick }) => {
    const [isActive, setIsActive] = useState(active || false);
    
    const handleClick = () => {
        setIsActive(!isActive);
        if(onClick) onClick();
    }

    return (
        <button 
            onClick={handleClick}
            className={`p-1.5 rounded-full transition-colors ${isActive ? 'text-indigo-400 bg-indigo-900/30' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}
            title="Thêm Keyframe"
        >
            <div className={`w-2.5 h-2.5 transform rotate-45 border-2 ${isActive ? 'border-indigo-400 bg-indigo-400' : 'border-current'}`}></div>
        </button>
    );
};

export const InspectorSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    isEnabled?: boolean;
    onToggleEnable?: () => void;
    children?: React.ReactNode;
}> = ({ title, icon, isOpen, onToggle, isEnabled, onToggleEnable, children }) => {
    
    const isToggleSection = isEnabled !== undefined && onToggleEnable !== undefined;

    const handleHeaderClick = () => {
        if (isToggleSection) {
            onToggleEnable();
        } else {
            onToggle();
        }
    };
    
    const showContent = isToggleSection ? isEnabled : isOpen;

    return (
        <div className="border-b border-gray-800">
            <div 
                className="flex items-center justify-between p-4 bg-[#1e1e1e] select-none hover:bg-[#252526] transition-colors cursor-pointer group" 
                onClick={handleHeaderClick}
            >
                <div className="flex items-center gap-3 text-gray-300 flex-1">
                    <div className={`transition-colors ${showContent ? 'text-indigo-400' : 'text-gray-500'}`}>{icon}</div>
                    <span className={`text-sm font-semibold ${showContent ? 'text-white' : 'text-gray-400'}`}>{title}</span>
                </div>
                
                <div className="flex items-center">
                    {isToggleSection ? (
                         <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${isEnabled ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                            <span className={`${isEnabled ? 'translate-x-[18px]' : 'translate-x-[2px]'} inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                        </div>
                    ) : (
                        <div className="p-1">
                             <ChevronDownIcon className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
                        </div>
                    )}
                </div>
            </div>
            {showContent && children && (
                <div className="px-4 pb-5 pt-3 bg-[#1e1e1e] space-y-4 animate-fadeIn border-t border-gray-800/50">
                    {children}
                </div>
            )}
        </div>
    );
}

export const PropertySlider: React.FC<{
    label?: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    onChange: (val: number) => void;
    onMouseUp?: () => void;
}> = ({ label, value, min, max, step = 1, unit = '', onChange, onMouseUp }) => (
    <div className="w-full mb-4 last:mb-0">
        {label && (
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-400">{label}</span>
                <div className="flex items-center bg-[#111] rounded border border-gray-800 w-12 h-5 overflow-hidden">
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => onChange(Number(e.target.value))}
                        className="w-full bg-transparent text-[10px] text-right text-gray-300 px-1 focus:outline-none no-spinner appearance-none"
                    />
                </div>
            </div>
        )}
        <input 
            type="range" 
            min={min} max={max} step={step} 
            value={value} 
            onChange={(e) => onChange(Number(e.target.value))}
            onMouseUp={onMouseUp}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gray-400 hover:accent-white"
        />
        {!label && unit && (
             <div className="flex justify-between text-[9px] text-gray-600 mt-1 font-mono">
                <span>{min}{unit}</span>
                <span>{value}{unit}</span>
                <span>{max}{unit}</span>
            </div>
        )}
    </div>
);

export const CompactInput: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({ label, value, onChange }) => (
    <div className="flex items-center bg-[#111] border border-gray-700 rounded px-3 py-1.5">
        <span className="text-[10px] text-gray-500 mr-2 font-bold">{label}</span>
        <input 
            type="number" 
            value={Math.round(value)} 
            onChange={e => onChange(Number(e.target.value))} 
            className="w-full bg-transparent text-xs text-white focus:outline-none text-right font-mono"
        />
    </div>
);

export const TimeInput: React.FC<{ value: number, onChange: (v: number) => void }> = ({ value, onChange }) => {
    const format = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        const ms = Math.floor((sec % 1) * 100);
        return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }
    return (
        <div className="flex items-center bg-[#111] border border-gray-700 rounded px-2 py-1.5 w-full">
             <input 
                type="text" 
                value={format(value)} 
                readOnly 
                className="bg-transparent text-xs text-gray-300 w-full text-center focus:outline-none font-mono"
            />
            <div className="flex flex-col ml-1 -space-y-1">
                <button onClick={() => onChange(value + 0.1)} className="text-gray-500 hover:text-white transform rotate-180"><ChevronDownIcon className="h-2 w-2"/></button>
                <button onClick={() => onChange(Math.max(0, value - 0.1))} className="text-gray-500 hover:text-white"><ChevronDownIcon className="h-2 w-2"/></button>
            </div>
        </div>
    )
}

export const TimeRuler: React.FC<{ duration: number, zoom: number, currentTime: number }> = React.memo(({ duration, zoom, currentTime }) => {
    let step = 1;
    if (zoom < 1) step = 60; // Every minute
    else if (zoom < 5) step = 10; // Every 10 seconds
    else if (zoom < 20) step = 5; // Every 5 seconds
    else step = 1; // Every second

    const totalMarks = Math.ceil(duration / step) + 2; 
    
    return (
        <div className="h-6 bg-[#1f1f1f] border-b border-gray-800 sticky top-0 z-20 flex items-end select-none overflow-hidden pointer-events-none">
            {Array.from({ length: totalMarks }).map((_, i) => {
                const time = i * step;
                const left = time * zoom;
                
                const isMajorMark = i % 5 === 0 || step >= 60;
                
                const formatRulerTime = (t: number) => {
                    const h = Math.floor(t / 3600);
                    const m = Math.floor((t % 3600) / 60);
                    const s = Math.floor(t % 60);
                    
                    if (h > 0) {
                         return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                    }
                    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                }
                
                return (
                    <div key={i} className="absolute bottom-0 flex flex-col items-start" style={{ left: `${left}px` }}>
                        <div className={`w-px bg-gray-600 ${isMajorMark ? 'h-2.5' : 'h-1.5'}`}></div>
                        {isMajorMark && (
                            <span className="text-[9px] text-gray-500 ml-1 -mt-4 font-mono whitespace-nowrap">
                                {formatRulerTime(time)}
                            </span>
                        )}
                    </div>
                );
            })}
            
            <div 
                className="absolute top-0 bottom-0 w-0 z-30 pointer-events-none" 
                style={{ left: currentTime * zoom }}
            >
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-indigo-500 -ml-[6px]"></div>
            </div>
        </div>
    );
});

export const WaveformCanvas: React.FC<{ color?: string }> = React.memo(({ color = '#ffffff' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const resizeObserver = new ResizeObserver(() => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
                drawWaveform(canvas.getContext('2d'), width, height, color);
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, [color]);

    const drawWaveform = (ctx: CanvasRenderingContext2D | null, width: number, height: number, color: string) => {
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = color;

        const barWidth = 2;
        const gap = 1;
        const bars = Math.ceil(width / (barWidth + gap));
        const centerY = height / 2;

        for (let i = 0; i < bars; i++) {
            const noise = Math.sin(i * 0.1) * Math.cos(i * 0.03);
            const random = Math.random() * 0.5;
            const amplitude = Math.max(4, (Math.abs(noise) * 0.6 + random * 0.4) * (height * 0.8));

            const x = i * (barWidth + gap);
            const y = centerY - (amplitude / 2);
            
            if (ctx.roundRect) {
                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, amplitude, 2);
                ctx.fill();
            } else {
                ctx.fillRect(x, y, barWidth, amplitude);
            }
        }
    };

    return (
        <div ref={containerRef} className="w-full h-full">
            <canvas ref={canvasRef} className="w-full h-full" />
        </div>
    );
});
