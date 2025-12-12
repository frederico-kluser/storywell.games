import React, { useEffect, useState } from 'react';
import { Sparkles, BookOpen, Palette, Users, MapPin, Image, Wand2 } from 'lucide-react';
import { Language } from '../../types';
import { useThemeColors } from '../../hooks/useThemeColors';

export type CreationPhase =
  | 'initializing'
  | 'colors'
  | 'world'
  | 'characters'
  | 'avatar'
  | 'finalizing';

interface StoryCreationLoaderProps {
  phase: CreationPhase;
  language: Language;
}

interface StepConfig {
  icon: React.ElementType;
  label: string;
  description: string;
}

const getStepConfigs = (language: Language): Record<CreationPhase, StepConfig> => {
  const configs = {
    en: {
      initializing: {
        icon: Sparkles,
        label: 'Initializing',
        description: 'Starting up the story engine...'
      },
      colors: {
        icon: Palette,
        label: 'Theme Colors',
        description: 'Creating your unique visual palette...'
      },
      world: {
        icon: MapPin,
        label: 'World Building',
        description: 'Crafting locations and lore...'
      },
      characters: {
        icon: Users,
        label: 'Characters',
        description: 'Bringing characters to life...'
      },
      avatar: {
        icon: Image,
        label: 'Avatar',
        description: 'Generating character portrait...'
      },
      finalizing: {
        icon: BookOpen,
        label: 'Opening Scene',
        description: 'Writing your first chapter...'
      }
    },
    pt: {
      initializing: {
        icon: Sparkles,
        label: 'Inicializando',
        description: 'Iniciando o motor da história...'
      },
      colors: {
        icon: Palette,
        label: 'Cores do Tema',
        description: 'Criando sua paleta visual única...'
      },
      world: {
        icon: MapPin,
        label: 'Criação do Mundo',
        description: 'Construindo locais e lore...'
      },
      characters: {
        icon: Users,
        label: 'Personagens',
        description: 'Dando vida aos personagens...'
      },
      avatar: {
        icon: Image,
        label: 'Avatar',
        description: 'Gerando retrato do personagem...'
      },
      finalizing: {
        icon: BookOpen,
        label: 'Cena de Abertura',
        description: 'Escrevendo seu primeiro capítulo...'
      }
    },
    es: {
      initializing: {
        icon: Sparkles,
        label: 'Inicializando',
        description: 'Iniciando el motor de la historia...'
      },
      colors: {
        icon: Palette,
        label: 'Colores del Tema',
        description: 'Creando tu paleta visual única...'
      },
      world: {
        icon: MapPin,
        label: 'Creación del Mundo',
        description: 'Construyendo lugares y lore...'
      },
      characters: {
        icon: Users,
        label: 'Personajes',
        description: 'Dando vida a los personajes...'
      },
      avatar: {
        icon: Image,
        label: 'Avatar',
        description: 'Generando retrato del personaje...'
      },
      finalizing: {
        icon: BookOpen,
        label: 'Escena de Apertura',
        description: 'Escribiendo tu primer capítulo...'
      }
    }
  };
  return configs[language] || configs.en;
};

const phaseOrder: CreationPhase[] = ['initializing', 'colors', 'world', 'characters', 'avatar', 'finalizing'];

export const StoryCreationLoader: React.FC<StoryCreationLoaderProps> = ({
  phase,
  language
}) => {
  const { colors } = useThemeColors();
  const stepConfigs = getStepConfigs(language);
  const currentIndex = phaseOrder.indexOf(phase);
  const progress = ((currentIndex + 1) / phaseOrder.length) * 100;

  // Animated dots
  const [dots, setDots] = useState('');
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Random tips based on language
  const tips = {
    en: [
      'Tip: Every choice shapes your destiny',
      'Tip: NPCs remember your actions',
      'Tip: Explore to discover hidden secrets',
      'Tip: Your story is unique to you',
    ],
    pt: [
      'Dica: Cada escolha molda seu destino',
      'Dica: NPCs lembram de suas ações',
      'Dica: Explore para descobrir segredos',
      'Dica: Sua história é única',
    ],
    es: [
      'Consejo: Cada elección moldea tu destino',
      'Consejo: Los NPCs recuerdan tus acciones',
      'Consejo: Explora para descubrir secretos',
      'Consejo: Tu historia es única',
    ],
  };

  const [tipIndex, setTipIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % (tips[language]?.length || 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [language]);

  const currentTip = tips[language]?.[tipIndex] || tips.en[tipIndex];
  const currentConfig = stepConfigs[phase];
  const CurrentIcon = currentConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md" style={{ backgroundColor: `${colors.background}F0` }}>
      <div className="w-full max-w-lg mx-4 p-6 md:p-8 border-2" style={{
        backgroundColor: colors.backgroundSecondary,
        borderColor: colors.border,
        boxShadow: `8px 8px 0px ${colors.shadow}`
      }}>
        {/* Header with animated icon */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            {/* Outer rotating ring */}
            <div
              className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin"
              style={{
                borderColor: `${colors.buttonPrimary}30`,
                borderTopColor: 'transparent',
                width: '80px',
                height: '80px',
                animationDuration: '3s'
              }}
            />
            {/* Inner pulsing background */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse"
              style={{ backgroundColor: colors.buttonPrimary }}
            >
              <CurrentIcon className="w-10 h-10 text-white" />
            </div>
          </div>

          <h2 className="text-xl md:text-2xl font-black uppercase tracking-wide text-center" style={{ color: colors.text }}>
            {currentConfig.label}
          </h2>
          <p className="text-sm md:text-base mt-2 text-center" style={{ color: colors.textSecondary }}>
            {currentConfig.description}{dots}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
            <div
              className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
              style={{
                width: `${progress}%`,
                backgroundColor: colors.success
              }}
            >
              {/* Shimmer effect */}
              <div
                className="absolute inset-0 animate-shimmer"
                style={{
                  background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)`,
                  animation: 'shimmer 1.5s infinite'
                }}
              />
            </div>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              {currentIndex + 1} / {phaseOrder.length}
            </span>
            <span className="text-sm font-bold" style={{ color: colors.text }}>
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Step indicators */}
        <div className="grid grid-cols-6 gap-2 mb-6">
          {phaseOrder.map((p, idx) => {
            const config = stepConfigs[p];
            const StepIcon = config.icon;
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;

            return (
              <div
                key={p}
                className={`flex flex-col items-center transition-all duration-300 ${isCurrent ? 'scale-110' : ''}`}
              >
                <div
                  className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCurrent ? 'ring-2 ring-offset-2' : ''
                  }`}
                  style={{
                    backgroundColor: isCompleted
                      ? colors.success
                      : isCurrent
                        ? colors.buttonPrimary
                        : colors.border,
                    color: isCompleted || isCurrent ? 'white' : colors.textSecondary,
                    ringColor: colors.buttonPrimary,
                    ringOffsetColor: colors.backgroundSecondary
                  }}
                >
                  <StepIcon className={`w-4 h-4 md:w-5 md:h-5 ${isCurrent ? 'animate-pulse' : ''}`} />
                </div>
                <span
                  className={`text-[8px] md:text-[10px] mt-1 uppercase font-bold text-center leading-tight ${
                    isCurrent ? '' : 'opacity-60'
                  }`}
                  style={{ color: isCurrent ? colors.text : colors.textSecondary }}
                >
                  {config.label.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Rotating tip */}
        <div
          className="text-center p-3 rounded-lg animate-fade-in"
          style={{ backgroundColor: colors.backgroundAccent }}
        >
          <div className="flex items-center justify-center gap-2">
            <Wand2 className="w-4 h-4" style={{ color: colors.textAccent }} />
            <span className="text-xs md:text-sm italic" style={{ color: colors.textSecondary }}>
              {currentTip}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
