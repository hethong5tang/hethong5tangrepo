
import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, XMarkIcon } from './Icons';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onDismiss: (id: string) => void;
}

const icons: Record<ToastType, React.FC<{className?: string}>> = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  info: InformationCircleIcon,
};

const styles: Record<ToastType, { bg: string, text: string, icon: string, border: string }> = {
  success: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-800 dark:text-green-200', icon: 'text-green-500 dark:text-green-400', border: 'border-green-300 dark:border-green-700' },
  error: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-200', icon: 'text-red-500 dark:text-red-400', border: 'border-red-300 dark:border-red-700' },
  info: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-800 dark:text-blue-200', icon: 'text-blue-500 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700' },
};

const Toast: React.FC<ToastProps> = ({ id, message, type, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(id), 300);
  };
  
  const Icon = icons[type] || InformationCircleIcon;
  const style = styles[type] || styles.info;

  return (
    <div
      className={`relative w-full max-w-sm rounded-lg shadow-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 overflow-hidden transition-all duration-300 ease-in-out transform ${
        isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      } ${style.bg} border ${style.border}`}
    >
      <div className="flex-1 w-0 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <Icon className={`h-6 w-6 ${style.icon}`} />
          </div>
          <div className="ml-3 flex-1">
            <p className={`text-sm font-medium ${style.text}`}>
              {message}
            </p>
          </div>
        </div>
      </div>
      <div className="flex">
        <button
          onClick={handleDismiss}
          className="w-full border-l border-black/10 rounded-none p-4 flex items-center justify-center text-sm font-medium text-gray-500 hover:bg-black/5 focus:outline-none"
        >
          <XMarkIcon className="h-5 w-5"/>
        </button>
      </div>
    </div>
  );
};

export default Toast;