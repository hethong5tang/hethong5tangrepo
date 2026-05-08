
import React, { useEffect, useState } from 'react';
import { XMarkIcon } from './Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  isConfirmDisabled?: boolean;
  hideFooter?: boolean;
  confirmButtonVariant?: 'default' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
}

const ModalComponent: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  onConfirm,
  onCancel,
  isConfirmDisabled = false,
  hideFooter = false,
  confirmButtonVariant = 'default',
  size = 'lg',
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isMounted, setIsMounted] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setIsClosing(false);
    } else {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsMounted(false);
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isMounted) {
    return null;
  }
  
  const backdropAnimation = isClosing 
    ? 'animate-[modal-fade-out_0.3s_ease-in_forwards]' 
    : 'animate-[modal-fade-in_0.3s_ease-out_forwards]';
    
  const contentAnimation = isClosing 
    ? 'animate-[modal-content-hide_0.3s_ease-in_forwards]' 
    : 'animate-[modal-content-show_0.3s_ease-out_forwards]';

  const confirmButtonClasses = {
    default: 'bg-indigo-600 hover:bg-indigo-700',
    danger: 'bg-red-600 hover:bg-red-700',
  };

  const sizeClasses: Record<string, string> = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
    '4xl': 'sm:max-w-4xl',
    '5xl': 'sm:max-w-5xl',
    '6xl': 'sm:max-w-6xl',
    '7xl': 'sm:max-w-7xl',
    'full': 'sm:max-w-full sm:m-4',
  };

  return (
    <div className="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${backdropAnimation}`}
        onClick={onClose}
      ></div>

      <div className="fixed inset-0 z-10 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`relative transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 text-left shadow-xl transition-all sm:my-8 w-full ${sizeClasses[size]} ${contentAnimation}`}>
            {title && (
              <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-slate-200" id="modal-title">
                  {title}
                </h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-400">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            )}
             {!title && (
                <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-colors">
                    <span className="sr-only">Đóng</span>
                    <XMarkIcon className="h-6 w-6" />
                </button>
            )}
            <div className={title ? "p-6" : ""}>{children}</div>
            
            {!hideFooter && (
              <div className="bg-gray-50 dark:bg-slate-800/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-gray-200 dark:border-slate-700">
                {onConfirm && (
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={isConfirmDisabled}
                    className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto disabled:opacity-50 ${confirmButtonClasses[confirmButtonVariant]}`}
                  >
                    {confirmText}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onCancel || onClose}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-slate-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-slate-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 sm:mt-0 sm:w-auto"
                >
                  {cancelText}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ModalComponent);
