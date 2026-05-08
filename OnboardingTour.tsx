
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, ChevronRightIcon } from './Icons';

export interface TourStep {
    targetId: string;
    title: string;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingTourProps {
    steps: TourStep[];
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ steps, isOpen, onClose, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => setIsReady(true), 800);
            return () => clearTimeout(timer);
        } else {
            setIsReady(false);
            setCurrentStep(0);
        }
    }, [isOpen]);

    const updatePosition = () => {
        if (!isOpen || !isReady) return;
        
        const step = steps[currentStep];
        const elements = document.querySelectorAll(`[id="${step.targetId}"]`);
        
        let element: HTMLElement | null = null;
        elements.forEach(el => {
            const htmlEl = el as HTMLElement;
            if (htmlEl.offsetWidth > 0 || htmlEl.offsetHeight > 0) {
                element = htmlEl;
            }
        });
        
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                if (element) setTargetRect(element.getBoundingClientRect());
            }, 150);
        } else {
            setTargetRect(null);
        }
    };

    useEffect(() => {
        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition);
        };
    }, [currentStep, isOpen, isReady, steps]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            onComplete();
        }
    };

    const handleSkip = () => {
        onClose();
    };

    if (!isOpen || !isReady) return null;

    const step = steps[currentStep];
    const isLastStep = currentStep === steps.length - 1;

    let tooltipStyle: React.CSSProperties = {};
    if (targetRect) {
        const tooltipWidth = 320; 
        const padding = 20;
        
        let top = targetRect.bottom + padding;
        let left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);

        if (left < 15) left = 15;
        if (left + tooltipWidth > window.innerWidth) left = window.innerWidth - tooltipWidth - 15;

        // Nếu phần tử ở dưới cùng màn hình, đẩy tooltip lên trên
        if (top + 200 > window.innerHeight) {
            top = targetRect.top - 200;
        }

        tooltipStyle = {
            top: `${top}px`,
            left: `${left}px`,
            position: 'fixed',
        };
    } else {
        tooltipStyle = {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            position: 'fixed',
        };
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden pointer-events-none">
            {/* Lớp nền tối có lỗ thủng sắc nét (không dùng blur ở đây) */}
            {targetRect ? (
                <div 
                    className="absolute shadow-[0_0_0_9999px_rgba(15,23,42,0.75)] transition-all duration-300 ease-in-out pointer-events-auto"
                    style={{
                        top: targetRect.top - 4,
                        left: targetRect.left - 8,
                        width: targetRect.width + 16,
                        height: targetRect.height + 8,
                        borderRadius: '8px',
                    }}
                    onClick={handleSkip} // Click vào vùng tối để bỏ qua
                >
                    {/* Viền highlight rực rỡ quanh lỗ thủng */}
                    <div className="absolute inset-0 border-2 border-indigo-500 rounded-lg shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
                </div>
            ) : (
                <div className="absolute inset-0 bg-slate-900/75 pointer-events-auto" onClick={handleSkip}></div>
            )}

            {/* Thẻ hướng dẫn (Tooltip Card) */}
            <div 
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-80 max-w-[90vw] flex flex-col gap-4 border border-slate-200 dark:border-slate-700 transition-all duration-300 ease-in-out pointer-events-auto"
                style={tooltipStyle}
            >
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-6 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                            {currentStep + 1}
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">{step.title}</h3>
                    </div>
                    <button onClick={handleSkip} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {step.content}
                </p>
                <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button onClick={handleSkip} className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider">Bỏ qua</button>
                    <button 
                        onClick={handleNext}
                        className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                    >
                        {isLastStep ? 'Khám phá ngay' : 'Tiếp theo'}
                        {!isLastStep && <ChevronRightIcon className="h-4 w-4" />}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default OnboardingTour;
