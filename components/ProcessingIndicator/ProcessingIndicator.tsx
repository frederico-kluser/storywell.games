import React, { useEffect, useState } from 'react';
import { Brain, BookOpen, Sparkles, Loader2 } from 'lucide-react';
import { Language } from '../../types';
import { ProcessingPhase } from '../../hooks/useGameEngine';
import { useThemeColors } from '../../hooks/useThemeColors';

interface ProcessingIndicatorProps {
  phase: ProcessingPhase;
  language: Language;
  className?: string;
}

interface PhaseConfig {
  icon: React.ElementType;
  label: string;
}

const getPhaseConfigs = (language: Language): Record<NonNullable<ProcessingPhase>, PhaseConfig> => {
  const configs = {
    en: {
      classifying: {
        icon: Brain,
        label: 'Processing action...',
      },
      generating: {
        icon: BookOpen,
        label: 'Generating response...',
      },
      updating: {
        icon: Sparkles,
        label: 'Updating world...',
      },
    },
    pt: {
      classifying: {
        icon: Brain,
        label: 'Processando ação...',
      },
      generating: {
        icon: BookOpen,
        label: 'Gerando resposta...',
      },
      updating: {
        icon: Sparkles,
        label: 'Atualizando mundo...',
      },
    },
    es: {
      classifying: {
        icon: Brain,
        label: 'Procesando acción...',
      },
      generating: {
        icon: BookOpen,
        label: 'Generando respuesta...',
      },
      updating: {
        icon: Sparkles,
        label: 'Actualizando mundo...',
      },
    },
  };
  return configs[language] || configs.en;
};

export const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({
  phase,
  language,
  className = '',
}) => {
  const { colors } = useThemeColors();
  const phaseConfigs = getPhaseConfigs(language);

  // Animated dots
  const [dots, setDots] = useState('');
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);

  if (!phase) return null;

  const config = phaseConfigs[phase];
  const Icon = config.icon;

  // Get progress percentage based on phase
  const getProgress = () => {
    switch (phase) {
      case 'classifying':
        return 20;
      case 'generating':
        return 60;
      case 'updating':
        return 90;
      default:
        return 0;
    }
  };

  return (
    <div
      className={`px-4 py-3 border-2 flex flex-col gap-2 shadow-lg animate-fade-in ${className}`}
      style={{
        backgroundColor: colors.backgroundSecondary,
        borderColor: colors.border,
        boxShadow: `4px 4px 0px ${colors.shadow}`,
        minWidth: '220px',
      }}
    >
      {/* Main indicator */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center relative"
          style={{ backgroundColor: colors.buttonPrimary }}
        >
          <Icon className="w-5 h-5 text-white animate-pulse" />
          {/* Spinning border */}
          <div
            className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin"
            style={{
              borderColor: `${colors.buttonPrimaryText}30`,
              borderTopColor: 'transparent',
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-bold uppercase tracking-wide"
            style={{ color: colors.text }}
          >
            {config.label.replace('...', '')}{dots}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full">
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: colors.border }}
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
            style={{
              width: `${getProgress()}%`,
              backgroundColor: colors.success,
            }}
          >
            {/* Shimmer effect */}
            <div
              className="absolute inset-0 animate-shimmer"
              style={{
                background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Phase indicators */}
      <div className="flex justify-between px-1">
        {(['classifying', 'generating', 'updating'] as const).map((p) => {
          const isActive = p === phase;
          const isPast =
            (p === 'classifying' && (phase === 'generating' || phase === 'updating')) ||
            (p === 'generating' && phase === 'updating');

          return (
            <div
              key={p}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                isActive ? 'scale-125' : ''
              }`}
              style={{
                backgroundColor: isPast
                  ? colors.success
                  : isActive
                    ? colors.buttonPrimary
                    : colors.border,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
