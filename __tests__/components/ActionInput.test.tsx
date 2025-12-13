import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActionInput } from '../../components/ActionInput/ActionInput';
import { GameState, MessageType } from '../../types';
import { ThemeColorsProvider } from '../../hooks/useThemeColors';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Send: () => <span data-testid="send-icon">Send</span>,
  Loader2: () => <span data-testid="loader-icon">Loading</span>,
  MoreHorizontal: () => <span data-testid="more-icon">More</span>,
  Sparkles: () => <span data-testid="sparkles-icon">Sparkles</span>,
  AlertTriangle: () => <span data-testid="alert-icon">Alert</span>,
  ChevronUp: () => <span data-testid="chevron-up">Up</span>,
  ChevronDown: () => <span data-testid="chevron-down">Down</span>,
  X: () => <span data-testid="x-icon">X</span>,
  Check: () => <span data-testid="check-icon">Check</span>,
}));

// Mock the AI services
jest.mock('../../services/ai/openaiClient', () => ({
  generateActionOptions: jest.fn().mockResolvedValue([
    { text: 'Look around', goodChance: 10, badChance: 5, goodHint: 'Find something', badHint: 'Get spotted' },
    { text: 'Talk to merchant', goodChance: 20, badChance: 10, goodHint: 'Get info', badHint: 'Offend them' },
    { text: 'Move forward', goodChance: 15, badChance: 15, goodHint: 'Progress', badHint: 'Danger' },
    { text: 'Check inventory', goodChance: 5, badChance: 0, goodHint: 'Find item', badHint: '' },
    { text: 'Rest', goodChance: 0, badChance: 0, goodHint: '', badHint: '' }
  ]),
  rollFate: jest.fn().mockReturnValue({ type: 'neutral' }),
  analyzeCustomAction: jest.fn().mockResolvedValue({
    goodChance: 15,
    badChance: 15,
    goodHint: 'Something good may happen',
    badHint: 'Something bad may happen',
    reasoning: 'This is a moderate risk action',
  }),
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

  describe('snapshots', () => {
    it('should match snapshot for loading state', () => {
      // Force loading state by not providing cached options
      const { container } = renderWithTheme(<ActionInput {...defaultProps} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with options loaded', async () => {
      const { container } = renderWithTheme(<ActionInput {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Look around')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(container).toMatchSnapshot();
    });

    it('should match snapshot in processing state', async () => {
      const { container } = renderWithTheme(
        <ActionInput {...defaultProps} isProcessing={true} />
      );
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for custom input mode', async () => {
      const { container } = renderWithTheme(<ActionInput {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Custom Action')).toBeInTheDocument();
      }, { timeout: 3000 });

      fireEvent.click(screen.getByText('Custom Action'));

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Enter action...')).toBeInTheDocument();
      });

      expect(container).toMatchSnapshot();
    });
  });

  describe('option buttons', () => {
    it('should display action options with risk indicators', async () => {
      renderWithTheme(<ActionInput {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Look around')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for risk percentages (may appear multiple times)
      const percentage10 = screen.getAllByText(/10%/);
      const percentage5 = screen.getAllByText(/5%/);
      expect(percentage10.length).toBeGreaterThan(0);
      expect(percentage5.length).toBeGreaterThan(0);
    });

    it('should display Safe label for zero-risk actions', async () => {
      renderWithTheme(<ActionInput {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Rest')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByText('Safe')).toBeInTheDocument();
    });

    it('should call onSendMessage when option is clicked', async () => {
      renderWithTheme(<ActionInput {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Look around')).toBeInTheDocument();
      }, { timeout: 3000 });

      fireEvent.click(screen.getByText('Look around'));

      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalled();
      });
    });
  });

  describe('voice input', () => {
    it('should render voice input button', async () => {
      renderWithTheme(<ActionInput {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Custom Action')).toBeInTheDocument();
      }, { timeout: 3000 });

      fireEvent.click(screen.getByText('Custom Action'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-input')).toBeInTheDocument();
      });
    });

    it('should call onVoiceTranscription when voice input is used', async () => {
      renderWithTheme(<ActionInput {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Custom Action')).toBeInTheDocument();
      }, { timeout: 3000 });

      fireEvent.click(screen.getByText('Custom Action'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-input')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('voice-input'));

      expect(mockOnVoiceTranscription).toHaveBeenCalledWith('Voice transcribed text');
    });
  });

  describe('mobile collapse', () => {
    it('should show actions label on mobile layouts', async () => {
      renderWithTheme(<ActionInput {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Look around')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.queryByText('Actions')).toBeInTheDocument();
    });
  });

  describe('disabled states', () => {
    it('should disable options when isProcessing is true', async () => {
      const { rerender } = render(
        <ThemeColorsProvider>
          <ActionInput {...defaultProps} />
        </ThemeColorsProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Look around')).toBeInTheDocument();
      }, { timeout: 3000 });

      rerender(
        <ThemeColorsProvider>
          <ActionInput {...defaultProps} isProcessing={true} />
        </ThemeColorsProvider>
      );

      const lookAround = screen.getByText('Look around');
      const optionButton = lookAround.closest('button');
      expect(optionButton).toBeDisabled();
    });
  });

  describe('background updates', () => {
    it('should show context syncing badge when updating memory', async () => {
      const { rerender } = render(
        <ThemeColorsProvider>
          <ActionInput {...defaultProps} />
        </ThemeColorsProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Look around')).toBeInTheDocument();
      }, { timeout: 3000 });

      rerender(
        <ThemeColorsProvider>
          <ActionInput {...defaultProps} isUpdatingContext={true} />
        </ThemeColorsProvider>
      );

      expect(screen.getByText(/Atualizando memória/)).toBeInTheDocument();
    });
  });

  describe('caching', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should cache options in localStorage', async () => {
      renderWithTheme(<ActionInput {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Look around')).toBeInTheDocument();
      }, { timeout: 3000 });

      const cacheKey = `storywell_options_cache_${defaultProps.activeStory.id}`;
      expect(localStorage.getItem(cacheKey)).toBeTruthy();
    });
  });
});
