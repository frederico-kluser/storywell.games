import React from 'react';
import { Check, Loader2, Circle, Sparkles, Palette, Users, MapPin, BookOpen, Brain, Image } from 'lucide-react';
import { useThemeColors } from '../../hooks/useThemeColors';

export type LoadingStep = {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'completed';
  icon?: 'story' | 'colors' | 'characters' | 'location' | 'thinking' | 'image' | 'sparkles';
};

interface ProgressLoaderProps {
  steps: LoadingStep[];
  title?: string;
  subtitle?: string;
  variant?: 'modal' | 'inline' | 'compact';
  className?: string;
}

const iconMap = {
  story: BookOpen,
  colors: Palette,
  characters: Users,
  location: MapPin,
  thinking: Brain,
  image: Image,
  sparkles: Sparkles,
};

export const ProgressLoader: React.FC<ProgressLoaderProps> = ({
  steps,
  title,
  subtitle,
  variant = 'modal',
  className = '',
}) => {
  const { colors } = useThemeColors();

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const progress = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;
  const currentStep = steps.find(s => s.status === 'loading');

  const getStatusIcon = (step: LoadingStep) => {
    const IconComponent = step.icon ? iconMap[step.icon] : Circle;

    if (step.status === 'completed') {
      return (
        <div
          className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-300"
          style={{ backgroundColor: colors.success }}
        >
          <Check className="w-4 h-4 md:w-5 md:h-5 text-white" />
        </div>
      );
    }

    if (step.status === 'loading') {
      return (
        <div
          className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center relative"
          style={{ backgroundColor: colors.buttonPrimary }}
        >
          <IconComponent className="w-4 h-4 md:w-5 md:h-5 text-white animate-pulse" />
          <div
            className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: `${colors.buttonPrimaryText}40`, borderTopColor: 'transparent' }}
          />
        </div>
      );
    }

    return (
      <div
        className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300"
        style={{ borderColor: colors.border, backgroundColor: colors.backgroundSecondary }}
      >
        <IconComponent className="w-4 h-4 md:w-5 md:h-5" style={{ color: colors.textSecondary }} />
      </div>
    );
  };

  // Compact variant for inline use
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: colors.textSecondary }} />
        <span className="text-sm font-medium" style={{ color: colors.text }}>
          {currentStep?.label || title || 'Loading...'}
        </span>
      </div>
    );
  }

  // Inline variant for embedded use
  if (variant === 'inline') {
    return (
      <div
        className={`p-4 rounded-lg ${className}`}
        style={{ backgroundColor: colors.backgroundSecondary, border: `1px solid ${colors.border}` }}
      >
        {/* Progress bar */}
        <div className="mb-4">
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: colors.border }}
          >
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progress}%`,
                backgroundColor: colors.success
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs" style={{ color: colors.textSecondary }}>
              {completedSteps}/{steps.length}
            </span>
            <span className="text-xs font-medium" style={{ color: colors.text }}>
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Current step indicator */}
        {currentStep && (
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: colors.buttonPrimary }} />
            <span className="text-sm font-medium" style={{ color: colors.text }}>
              {currentStep.label}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Modal/full variant (default)
  return (
    <div className={`flex flex-col items-center justify-center p-6 md:p-8 ${className}`}>
      {/* Title */}
      {title && (
        <h3
          className="text-lg md:text-xl font-bold uppercase tracking-wide mb-2 text-center"
          style={{ color: colors.text }}
        >
          {title}
        </h3>
      )}

      {subtitle && (
        <p
          className="text-xs md:text-sm mb-6 text-center max-w-md"
          style={{ color: colors.textSecondary }}
        >
          {subtitle}
        </p>
      )}

      {/* Progress bar */}
      <div className="w-full max-w-md mb-6">
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: colors.border }}
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
            style={{
              width: `${progress}%`,
              backgroundColor: colors.success
            }}
          >
            {/* Animated shimmer effect */}
            <div
              className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
              style={{
                background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)`
              }}
            />
          </div>
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs font-medium" style={{ color: colors.textSecondary }}>
            {completedSteps} of {steps.length} completed
          </span>
          <span className="text-sm font-bold" style={{ color: colors.text }}>
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Steps list */}
      <div className="w-full max-w-md space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center gap-4 p-3 rounded-lg transition-all duration-300 ${
              step.status === 'loading' ? 'scale-[1.02]' : ''
            }`}
            style={{
              backgroundColor: step.status === 'loading'
                ? colors.backgroundAccent
                : 'transparent',
              border: step.status === 'loading'
                ? `2px solid ${colors.buttonPrimary}`
                : '2px solid transparent'
            }}
          >
            {/* Step number / icon */}
            {getStatusIcon(step)}

            {/* Step content */}
            <div className="flex-1 min-w-0">
              <div
                className={`text-sm md:text-base font-medium transition-all duration-300 ${
                  step.status === 'completed' ? 'line-through opacity-60' : ''
                }`}
                style={{
                  color: step.status === 'loading'
                    ? colors.text
                    : step.status === 'completed'
                      ? colors.textSecondary
                      : colors.textSecondary
                }}
              >
                {step.label}
              </div>

              {/* Loading indicator text */}
              {step.status === 'loading' && (
                <div
                  className="text-xs mt-1 animate-pulse"
                  style={{ color: colors.textAccent }}
                >
                  Processing...
                </div>
              )}
            </div>

            {/* Connection line */}
            {index < steps.length - 1 && (
              <div
                className="absolute left-[1.4rem] md:left-[1.65rem] top-full w-0.5 h-3"
                style={{
                  backgroundColor: step.status === 'completed' ? colors.success : colors.border
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Current step message */}
      {currentStep && (
        <div
          className="mt-6 text-center animate-pulse"
          style={{ color: colors.textSecondary }}
        >
          <Sparkles className="w-4 h-4 inline-block mr-2" />
          <span className="text-xs uppercase tracking-wider font-medium">
            {currentStep.label}
          </span>
        </div>
      )}
    </div>
  );
};

// Helper function to create step objects
export const createLoadingStep = (
  id: string,
  label: string,
  icon?: LoadingStep['icon']
): LoadingStep => ({
  id,
  label,
  status: 'pending',
  icon,
});

// Preset steps for common operations
export const STORY_CREATION_STEPS = {
  en: [
    createLoadingStep('init', 'Initializing story engine', 'sparkles'),
    createLoadingStep('colors', 'Generating theme colors', 'colors'),
    createLoadingStep('world', 'Creating world and lore', 'location'),
    createLoadingStep('characters', 'Designing characters', 'characters'),
    createLoadingStep('avatar', 'Generating character avatar', 'image'),
    createLoadingStep('story', 'Writing opening scene', 'story'),
  ],
  pt: [
    createLoadingStep('init', 'Inicializando motor da história', 'sparkles'),
    createLoadingStep('colors', 'Gerando cores do tema', 'colors'),
    createLoadingStep('world', 'Criando mundo e lore', 'location'),
    createLoadingStep('characters', 'Desenhando personagens', 'characters'),
    createLoadingStep('avatar', 'Gerando avatar do personagem', 'image'),
    createLoadingStep('story', 'Escrevendo cena de abertura', 'story'),
  ],
  es: [
    createLoadingStep('init', 'Inicializando motor de historia', 'sparkles'),
    createLoadingStep('colors', 'Generando colores del tema', 'colors'),
    createLoadingStep('world', 'Creando mundo y lore', 'location'),
    createLoadingStep('characters', 'Diseñando personajes', 'characters'),
    createLoadingStep('avatar', 'Generando avatar del personaje', 'image'),
    createLoadingStep('story', 'Escribiendo escena de apertura', 'story'),
  ],
};

export const MESSAGE_PROCESSING_STEPS = {
  en: [
    createLoadingStep('input', 'Processing your action', 'thinking'),
    createLoadingStep('response', 'Generating response', 'story'),
    createLoadingStep('context', 'Updating world state', 'sparkles'),
  ],
  pt: [
    createLoadingStep('input', 'Processando sua ação', 'thinking'),
    createLoadingStep('response', 'Gerando resposta', 'story'),
    createLoadingStep('context', 'Atualizando estado do mundo', 'sparkles'),
  ],
  es: [
    createLoadingStep('input', 'Procesando tu acción', 'thinking'),
    createLoadingStep('response', 'Generando respuesta', 'story'),
    createLoadingStep('context', 'Actualizando estado del mundo', 'sparkles'),
  ],
};
