import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, X } from 'lucide-react';

const STYLES = {
  success: 'border-green/30 bg-green/10 text-green',
  error: 'border-red/30 bg-red/10 text-red',
};

const ICONS = {
  success: CheckCircle,
  error: XCircle,
};

export default function Toast({ message, type = 'success', onClose, duration = 4000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const Icon = ICONS[type] || CheckCircle;
  const style = STYLES[type] || STYLES.success;

  return createPortal(
    <div
      className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm animate-slide-in-up ${style}`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-sans">{message}</span>
      <button
        onClick={onClose}
        className="ml-1 flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 opacity-60 hover:opacity-100 transition-opacity" />
      </button>
    </div>,
    document.body
  );
}
