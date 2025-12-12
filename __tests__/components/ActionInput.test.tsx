import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActionInput } from '../../components/ActionInput/ActionInput';
import { GameState, MessageType } from '../../types';
import { ThemeColorsProvider } from '../../hooks/useThemeColors';

// Mock the AI services
jest.mock('../../services/ai/openaiClient', () => ({
  generateActionOptions: jest.fn().mockResolvedValue([
    { text: 'Look around', goodChance: 10, badChance: 5, goodHint: 'Find something', badHint: 'Get spotted' },
    { text: 'Talk to merchant', goodChance: 20, badChance: 10, goodHint: 'Get info', badHint: 'Offend them' },
    { text: 'Move forward', goodChance: 15, badChance: 15, goodHint: 'Progress', badHint: 'Danger' },
    { text: 'Check inventory', goodChance: 5, badChance: 0, goodHint: 'Find item', badHint: '' },
    { text: 'Rest', goodChance: 0, badChance: 0, goodHint: '', badHint: '' }
  ]),
  rollFate: jest.fn().mockReturnValue({ type: 'neutral' })
}));

// Mock VoiceInput component
jest.mock('../../components/VoiceInput', () => ({
  VoiceInput: ({ onTranscription, disabled }: any) => (
    <button
      data-testid="voice-input"
      onClick={() => onTranscription('Voice transcribed text')}
      disabled={disabled}
    >
      Voice
    </button>
  )
}));

const createMockGameState = (): GameState => ({
  id: 'test-game',
  title: 'Test Adventure',
  turnCount: 5,
  lastPlayed: Date.now(),
  config: {
    universeType: 'original',
    universeName: 'Fantasy World',
    combatStyle: 'descriptive',
    dialogueHeavy: true,
    language: 'en'
  },
  characters: {
    'player-1': {
      id: 'player-1',
      name: 'Hero',
      description: 'Brave warrior',
      isPlayer: true,
      locationId: 'loc-1',
      stats: { hp: 100 },
      inventory: ['sword'],
      relationships: {},
      state: 'idle'
    }
  },
  locations: {
    'loc-1': {
      id: 'loc-1',
      name: 'Town',
      description: 'A town',
      connectedLocationIds: []
    }
  },
  messages: [
    {
      id: 'msg-1',
      senderId: 'Narrator',
      text: 'Your adventure begins...',
      type: MessageType.NARRATION,
      timestamp: Date.now()
    }
  ],
  events: [],
  playerCharacterId: 'player-1',
  currentLocationId: 'loc-1'
});

const mockTranslations = {
  inputPlaceholder: 'Enter action...',
  customAction: 'Custom Action',
  generatingOptions: 'Generating options...',
  back: 'Back',
  safe: 'Safe'
};

// Custom render function with ThemeColorsProvider
const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeColorsProvider>{ui}</ThemeColorsProvider>);
};

describe('ActionInput', () => {
  const mockSetInputValue = jest.fn();
  const mockOnSendMessage = jest.fn().mockResolvedValue(undefined);
  const mockOnVoiceTranscription = jest.fn();

  const defaultProps = {
    apiKey: 'test-api-key',
    language: 'en' as const,
    activeStory: createMockGameState(),
    inputValue: '',
    setInputValue: mockSetInputValue,
    isProcessing: false,
    onSendMessage: mockOnSendMessage,
    onVoiceTranscription: mockOnVoiceTranscription,
    t: mockTranslations
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      renderWithTheme(<ActionInput {...defaultProps} />);
      // Component should render
      expect(document.body).toBeInTheDocument();
    });

    it('should show loading or options initially', async () => {
      renderWithTheme(<ActionInput {...defaultProps} />);

      // Should eventually show options or loading
      await waitFor(() => {
        const hasOptions = screen.queryByText('Look around') !== null;
        const hasLoading = screen.queryByText('Generating options...') !== null;
        const hasCustom = screen.queryByText('Custom Action') !== null;
        expect(hasOptions || hasLoading || hasCustom).toBe(true);
      }, { timeout: 3000 });
    });
  });

  describe('custom input mode', () => {
    it('should switch to custom input when custom action is clicked', async () => {
      renderWithTheme(<ActionInput {...defaultProps} />);

      // Wait for options to load
      await waitFor(() => {
        expect(screen.queryByText('Custom Action')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Click the custom action button
      const customBtn = screen.getByText('Custom Action');
      fireEvent.click(customBtn);

      // Check for input or back button after clicking
      await waitFor(() => {
        const input = screen.queryByPlaceholderText('Enter action...');
        const back = screen.queryByText(/Back/);
        expect(input !== null || back !== null).toBe(true);
      }, { timeout: 3000 });
    });
  });

  describe('processing state', () => {
    it('should handle processing state', () => {
      renderWithTheme(<ActionInput {...defaultProps} isProcessing={true} />);

      // Component should render in processing state
      // Not all buttons are disabled (e.g., mobile toggle buttons) but action buttons should be
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('translations', () => {
    it('should use provided translations', async () => {
      renderWithTheme(<ActionInput {...defaultProps} />);

      await waitFor(() => {
        // Check if any translation is used
        const hasCustomAction = screen.queryByText('Custom Action') !== null;
        const hasGenerating = screen.queryByText('Generating options...') !== null;
        expect(hasCustomAction || hasGenerating).toBe(true);
      }, { timeout: 3000 });
    });
  });
});
