import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { LoadingStep } from '../components/ProgressLoader/ProgressLoader';
import { Language } from '../types';

interface LoadingContextType {
  // Story creation loading
  isCreatingStory: boolean;
  storyCreationSteps: LoadingStep[];
  startStoryCreation: (language: Language) => void;
  updateStoryCreationStep: (stepId: string, status: LoadingStep['status']) => void;
  finishStoryCreation: () => void;

  // Message processing loading
  isProcessingMessage: boolean;
  messageProcessingSteps: LoadingStep[];
  startMessageProcessing: (language: Language) => void;
  updateMessageProcessingStep: (stepId: string, status: LoadingStep['status']) => void;
  finishMessageProcessing: () => void;

  // Background generation
  isGeneratingBackground: boolean;
  backgroundGenerationLabel: string;
  startBackgroundGeneration: (locationName: string, language: Language) => void;
  finishBackgroundGeneration: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

// Preset steps for story creation
const getStoryCreationSteps = (language: Language): LoadingStep[] => {
  const steps = {
    en: [
      { id: 'init', label: 'Initializing story engine', status: 'pending' as const, icon: 'sparkles' as const },
      { id: 'colors', label: 'Generating theme colors', status: 'pending' as const, icon: 'colors' as const },
      { id: 'world', label: 'Creating world and lore', status: 'pending' as const, icon: 'location' as const },
      { id: 'characters', label: 'Designing characters', status: 'pending' as const, icon: 'characters' as const },
      { id: 'avatar', label: 'Generating character avatar', status: 'pending' as const, icon: 'image' as const },
      { id: 'story', label: 'Writing opening scene', status: 'pending' as const, icon: 'story' as const },
    ],
    pt: [
      { id: 'init', label: 'Inicializando motor da história', status: 'pending' as const, icon: 'sparkles' as const },
      { id: 'colors', label: 'Gerando cores do tema', status: 'pending' as const, icon: 'colors' as const },
      { id: 'world', label: 'Criando mundo e lore', status: 'pending' as const, icon: 'location' as const },
      { id: 'characters', label: 'Desenhando personagens', status: 'pending' as const, icon: 'characters' as const },
      { id: 'avatar', label: 'Gerando avatar do personagem', status: 'pending' as const, icon: 'image' as const },
      { id: 'story', label: 'Escrevendo cena de abertura', status: 'pending' as const, icon: 'story' as const },
    ],
    es: [
      { id: 'init', label: 'Inicializando motor de historia', status: 'pending' as const, icon: 'sparkles' as const },
      { id: 'colors', label: 'Generando colores del tema', status: 'pending' as const, icon: 'colors' as const },
      { id: 'world', label: 'Creando mundo y lore', status: 'pending' as const, icon: 'location' as const },
      { id: 'characters', label: 'Diseñando personajes', status: 'pending' as const, icon: 'characters' as const },
      { id: 'avatar', label: 'Generando avatar del personaje', status: 'pending' as const, icon: 'image' as const },
      { id: 'story', label: 'Escribiendo escena de apertura', status: 'pending' as const, icon: 'story' as const },
    ],
  };
  return steps[language] || steps.en;
};

// Preset steps for message processing
const getMessageProcessingSteps = (language: Language): LoadingStep[] => {
  const steps = {
    en: [
      { id: 'input', label: 'Processing your action', status: 'pending' as const, icon: 'thinking' as const },
      { id: 'response', label: 'Generating story response', status: 'pending' as const, icon: 'story' as const },
      { id: 'context', label: 'Updating world state', status: 'pending' as const, icon: 'sparkles' as const },
    ],
    pt: [
      { id: 'input', label: 'Processando sua ação', status: 'pending' as const, icon: 'thinking' as const },
      { id: 'response', label: 'Gerando resposta da história', status: 'pending' as const, icon: 'story' as const },
      { id: 'context', label: 'Atualizando estado do mundo', status: 'pending' as const, icon: 'sparkles' as const },
    ],
    es: [
      { id: 'input', label: 'Procesando tu acción', status: 'pending' as const, icon: 'thinking' as const },
      { id: 'response', label: 'Generando respuesta de la historia', status: 'pending' as const, icon: 'story' as const },
      { id: 'context', label: 'Actualizando estado del mundo', status: 'pending' as const, icon: 'sparkles' as const },
    ],
  };
  return steps[language] || steps.en;
};

// Background generation labels
const getBackgroundLabel = (locationName: string, language: Language): string => {
  const templates = {
    en: `Generating image: ${locationName}`,
    pt: `Gerando imagem: ${locationName}`,
    es: `Generando imagen: ${locationName}`,
  };
  return templates[language] || templates.en;
};

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  // Story creation state
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [storyCreationSteps, setStoryCreationSteps] = useState<LoadingStep[]>([]);

  // Message processing state
  const [isProcessingMessage, setIsProcessingMessage] = useState(false);
  const [messageProcessingSteps, setMessageProcessingSteps] = useState<LoadingStep[]>([]);

  // Background generation state
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
  const [backgroundGenerationLabel, setBackgroundGenerationLabel] = useState('');

  // Story creation methods
  const startStoryCreation = useCallback((language: Language) => {
    setStoryCreationSteps(getStoryCreationSteps(language));
    setIsCreatingStory(true);
  }, []);

  const updateStoryCreationStep = useCallback((stepId: string, status: LoadingStep['status']) => {
    setStoryCreationSteps(prev =>
      prev.map(step =>
        step.id === stepId ? { ...step, status } : step
      )
    );
  }, []);

  const finishStoryCreation = useCallback(() => {
    setIsCreatingStory(false);
    setStoryCreationSteps([]);
  }, []);

  // Message processing methods
  const startMessageProcessing = useCallback((language: Language) => {
    setMessageProcessingSteps(getMessageProcessingSteps(language));
    setIsProcessingMessage(true);
  }, []);

  const updateMessageProcessingStep = useCallback((stepId: string, status: LoadingStep['status']) => {
    setMessageProcessingSteps(prev =>
      prev.map(step =>
        step.id === stepId ? { ...step, status } : step
      )
    );
  }, []);

  const finishMessageProcessing = useCallback(() => {
    setIsProcessingMessage(false);
    setMessageProcessingSteps([]);
  }, []);

  // Background generation methods
  const startBackgroundGeneration = useCallback((locationName: string, language: Language) => {
    setBackgroundGenerationLabel(getBackgroundLabel(locationName, language));
    setIsGeneratingBackground(true);
  }, []);

  const finishBackgroundGeneration = useCallback(() => {
    setIsGeneratingBackground(false);
    setBackgroundGenerationLabel('');
  }, []);

  const value: LoadingContextType = {
    isCreatingStory,
    storyCreationSteps,
    startStoryCreation,
    updateStoryCreationStep,
    finishStoryCreation,
    isProcessingMessage,
    messageProcessingSteps,
    startMessageProcessing,
    updateMessageProcessingStep,
    finishMessageProcessing,
    isGeneratingBackground,
    backgroundGenerationLabel,
    startBackgroundGeneration,
    finishBackgroundGeneration,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};
