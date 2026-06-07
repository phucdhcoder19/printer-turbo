import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';
import { cn } from '../../lib/cn';

type ToastType = 'success' | 'error' | 'info' | 'warning';
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

const ToastContext = createContext<
  ((type: ToastType, message: string) => void) | null
>(null);

let counter = 0;

const CONFIG: Record<ToastType, { icon: ReactNode; color: string }> = {
  success: { icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-green-600' },
  error: { icon: <AlertCircle className="h-4 w-4" />, color: 'text-red-500' },
  info: { icon: <Info className="h-4 w-4" />, color: 'text-blue-500' },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-amber-500',
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback(
    (id: number) => setToasts((list) => list.filter((t) => t.id !== id)),
    [],
  );

  const toast = useCallback(
    (type: ToastType, message: string) => {
      const id = ++counter;
      setToasts((list) => [...list, { id, type, message }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed right-4 top-4 z-toast flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="flex w-80 items-start gap-2.5 animate-slide-in-right rounded-button border border-border bg-card p-3 shadow-modal"
          >
            <span className={cn('mt-0.5 shrink-0', CONFIG[t.type].color)}>
              {CONFIG[t.type].icon}
            </span>
            <p className="flex-1 text-body">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              aria-label="Đóng"
              className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast phải nằm trong <ToastProvider>');
  return ctx;
}
