import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertCircle, CheckCircle, X, AlertTriangle, Info } from 'lucide-react';
import './Toast.css';

type ToastType = 'error' | 'success' | 'warning' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
    showError: (message: string) => void;
    showSuccess: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = ++toastId;
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    const showError = useCallback((message: string) => {
        showToast(message, 'error');
    }, [showToast]);

    const showSuccess = useCallback((message: string) => {
        showToast(message, 'success');
    }, [showToast]);

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const getIcon = (type: ToastType) => {
        switch (type) {
            case 'error': return <AlertCircle size={20} />;
            case 'success': return <CheckCircle size={20} />;
            case 'warning': return <AlertTriangle size={20} />;
            case 'info': return <Info size={20} />;
        }
    };

    return (
        <ToastContext.Provider value={{ showToast, showError, showSuccess }}>
            {children}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast toast-${toast.type}`}>
                        <div className="toast-icon">
                            {getIcon(toast.type)}
                        </div>
                        <div className="toast-message">{toast.message}</div>
                        {toast.type === 'error' && (
                            <span className="toast-fix-hint">請修正</span>
                        )}
                        <button
                            className="toast-close"
                            onClick={() => removeToast(toast.id)}
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
