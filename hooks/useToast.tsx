import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastContainer } from '../components/Toast';
import type { ToastType, ToastProps } from '../components/Toast';

interface ToastContextData {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 5000) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: ToastProps = {
        id,
        type,
        message,
        duration,
        onClose: removeToast,
      };

      setToasts(prev => [...prev, newToast]);
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, duration = 5000) => showToast(message, 'success', duration),
    [showToast]
  );

  const error = useCallback(
    (message: string, duration = 5000) => showToast(message, 'error', duration),
    [showToast]
  );

  const info = useCallback(
    (message: string, duration = 5000) => showToast(message, 'info', duration),
    [showToast]
  );

  const warning = useCallback(
    (message: string, duration = 5000) => showToast(message, 'warning', duration),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextData => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
};
