
import React from 'react';
import { AlertTriangle, X, ExternalLink, CreditCard } from 'lucide-react';

export type ErrorType = 'insufficient_quota' | 'invalid_key' | 'rate_limit' | 'network' | 'generic';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorType: ErrorType;
  errorMessage?: string;
}

const errorContent: Record<ErrorType, { title: string; description: string; action: string; link?: string }> = {
  insufficient_quota: {
    title: 'INSUFFICIENT CREDITS',
    description: 'Your OpenAI account has run out of credits. You need to add funds to continue using the application.',
    action: 'ADD CREDITS',
    link: 'https://platform.openai.com/settings/organization/billing/overview'
  },
  invalid_key: {
    title: 'INVALID API KEY',
    description: 'The API key provided is invalid or has been revoked. Please check your key and try again.',
    action: 'MANAGE KEYS',
    link: 'https://platform.openai.com/api-keys'
  },
  rate_limit: {
    title: 'RATE LIMIT EXCEEDED',
    description: 'Too many requests. Please wait a moment before trying again.',
    action: 'UNDERSTOOD'
  },
  network: {
    title: 'CONNECTION ERROR',
    description: 'Unable to connect to OpenAI servers. Please check your internet connection.',
    action: 'RETRY'
  },
  generic: {
    title: 'SYSTEM ERROR',
    description: 'An unexpected error occurred. Please try again.',
    action: 'DISMISS'
  }
};

export const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, onClose, errorType, errorMessage }) => {
  if (!isOpen) return null;

  const content = errorContent[errorType];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#f5f5f4] border-2 border-stone-900 w-full max-w-md shadow-[12px_12px_0px_rgba(0,0,0,1)] relative">
        {/* Header */}
        <div className="p-5 border-b-2 border-stone-900 bg-red-600 flex justify-between items-center">
          <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
            <AlertTriangle className="w-6 h-6" />
            {content.title}
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 border-2 border-red-300 flex items-center justify-center flex-shrink-0">
              {errorType === 'insufficient_quota' ? (
                <CreditCard className="w-6 h-6 text-red-600" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-600" />
              )}
            </div>
            <div>
              <p className="text-stone-700 font-mono text-sm leading-relaxed">
                {content.description}
              </p>
              {errorMessage && (
                <p className="text-stone-500 font-mono text-xs mt-2 bg-stone-100 p-2 border border-stone-200">
                  {errorMessage}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {content.link ? (
              <a
                href={content.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 bg-stone-900 text-white font-bold uppercase tracking-widest text-center hover:bg-stone-700 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                {content.action}
              </a>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-stone-900 text-white font-bold uppercase tracking-widest hover:bg-stone-700 transition-colors text-sm"
              >
                {content.action}
              </button>
            )}
            <button
              onClick={onClose}
              className="py-3 px-6 border-2 border-stone-300 text-stone-600 font-bold uppercase tracking-widest hover:border-stone-900 hover:text-stone-900 transition-colors text-sm"
            >
              CLOSE
            </button>
          </div>
        </div>

        {/* Footer hint */}
        {errorType === 'insufficient_quota' && (
          <div className="px-6 pb-4">
            <p className="text-xs text-stone-400 font-mono text-center">
              TIP: OpenAI requires a minimum of $5 USD to start
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
