
import React, { useEffect, useState } from 'react';
import { Sparkles, AlertTriangle, X } from 'lucide-react';
import { FateEventType } from '../../types';

interface FateToastProps {
  type: FateEventType;
  hint?: string;
  onClose: () => void;
  labels: {
    fateGood: string;
    fateBad: string;
  };
}

export const FateToast: React.FC<FateToastProps> = ({ type, hint, onClose, labels }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));

    // Auto-close after 4 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // Don't render neutral toasts
  if (type === 'neutral') return null;

  const isGood = type === 'good';

  return (
    <div
      className={`
        fixed top-6 left-1/2 -translate-x-1/2 z-50
        transition-all duration-300 ease-out
        ${isVisible && !isExiting ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
      `}
    >
      <div
        className={`
          flex items-center gap-3 px-5 py-3 border-2 shadow-lg
          ${isGood
            ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
            : 'bg-red-50 border-red-600 text-red-800'
          }
        `}
      >
        {isGood ? (
          <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
        )}
        <div className="flex flex-col">
          <span className="font-bold uppercase text-sm tracking-wider">
            {isGood ? labels.fateGood : labels.fateBad}
          </span>
          {hint && (
            <span className="text-xs opacity-80 max-w-xs truncate">
              {hint}
            </span>
          )}
        </div>
        <button
          onClick={handleClose}
          className={`
            ml-2 p-1 hover:bg-opacity-20 transition-colors rounded
            ${isGood ? 'hover:bg-emerald-600' : 'hover:bg-red-600'}
          `}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
