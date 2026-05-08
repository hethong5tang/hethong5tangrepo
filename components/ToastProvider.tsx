import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Toast, { ToastProps, ToastType } from './Toast';

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastMessage extends Omit<ToastProps, 'onDismiss'> {}

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString() + Math.random();
    setToasts((prevToasts) => [...prevToasts, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-5 right-5 z-[100] w-full max-w-sm space-y-3">
        {toasts.map(({ id, message, type }) => (
          <Toast key={id} id={id} message={message} type={type} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
