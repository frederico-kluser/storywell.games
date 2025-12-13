import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { StoryCardView, StoryCardProps } from '../../components/StoryCard/StoryCard.view';
import { MessageType, ChatMessage, DEFAULT_THEME_COLORS } from '../../types';

// Mock the AI services
jest.mock('../../services/ai/openaiClient', () => ({
  generateSpeech: jest.fn().mockResolvedValue(null),
}));

// Mock the audio utility
jest.mock('../../utils/ai', () => ({
  playMP3Audio: jest.fn().mockResolvedValue(undefined),
}));

// Mock GridMap component
jest.mock('../../components/GridMap', () => ({
  GridMap: ({ onToggleFlip }: { onToggleFlip: () => void }) => (
    <div data-testid="grid-map">
      <button onClick={onToggleFlip}>Toggle Map</button>
    </div>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Terminal: () => <span data-testid="terminal-icon">Terminal</span>,
  Info: () => <span data-testid="info-icon">Info</span>,
  Play: () => <span data-testid="play-icon">Play</span>,
  Loader2: () => <span data-testid="loader-icon">Loading</span>,
  StopCircle: () => <span data-testid="stop-icon">Stop</span>,
  ChevronLeft: () => <span data-testid="chevron-left">←</span>,
  ChevronRight: () => <span data-testid="chevron-right">→</span>,
  ChevronUp: () => <span data-testid="chevron-up">↑</span>,
  ChevronDown: () => <span data-testid="chevron-down">↓</span>,
  Map: () => <span data-testid="map-icon">Map</span>,
}));

const createMockMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'msg-1',
  senderId: 'npc-1',
  text: 'Welcome to the adventure, brave hero!',
  type: MessageType.DIALOGUE,
  timestamp: Date.now(),
  pageNumber: 1,
  ...overrides,
});

const mockTranslations = {
  back: 'Previous',
  next: 'Next',
  map: 'Map',
  viewMap: 'View Map',
  noMapData: 'No map data available',
};

const createDefaultProps = (overrides: Partial<StoryCardProps> = {}): StoryCardProps => ({
  message: createMockMessage(),
  isPlayer: false,
  senderName: 'Gandalf',
  colors: DEFAULT_THEME_COLORS,
  currentIndex: 0,
  totalCards: 5,
  onPrevious: jest.fn(),
  onNext: jest.fn(),
  canGoPrevious: true,
  canGoNext: true,
  isActive: true,
  t: mockTranslations,
  language: 'en',
  ...overrides,
});

describe('StoryCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const props = createDefaultProps();
      render(<StoryCardView {...props} />);
      expect(document.body).toBeInTheDocument();
    });

    it('should match snapshot for NPC dialogue', () => {
      const props = createDefaultProps({
        skipAnimation: true,
      });
      const { container } = render(<StoryCardView {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for player message', () => {
      const props = createDefaultProps({
        isPlayer: true,
        senderName: 'Player',
        message: createMockMessage({
          senderId: 'player-1',
          text: 'I draw my sword and prepare for battle!',
        }),
        skipAnimation: true,
      });
      const { container } = render(<StoryCardView {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for narrator message', () => {
      const props = createDefaultProps({
        message: createMockMessage({
          senderId: 'GM',
          text: 'The wind howls through the ancient forest...',
          type: MessageType.NARRATION,
        }),
        skipAnimation: true,
      });
      const { container } = render(<StoryCardView {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for system message', () => {
      const props = createDefaultProps({
        message: createMockMessage({
          senderId: 'SYSTEM',
          text: 'Your progress has been saved.',
          type: MessageType.SYSTEM,
        }),
        skipAnimation: true,
      });
      const { container } = render(<StoryCardView {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with avatar', () => {
      const props = createDefaultProps({
        avatarBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
        skipAnimation: true,
      });
      const { container } = render(<StoryCardView {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with location background', () => {
      const props = createDefaultProps({
        locationBackgroundImage: 'https://example.com/forest.jpg',
        skipAnimation: true,
      });
      const { container } = render(<StoryCardView {...props} />);
      expect(container).toMatchSnapshot();
    });
  });

  describe('typewriter effect', () => {
    it('should show typing cursor during animation', () => {
      const props = createDefaultProps({
        message: createMockMessage({ text: 'Hello' }),
      });
      render(<StoryCardView {...props} />);

      // Initial state should show cursor
      expect(screen.queryByText('|')).toBeInTheDocument();
    });

    it('should complete animation and call callback', () => {
      const onTypingComplete = jest.fn();
      const props = createDefaultProps({
        message: createMockMessage({ text: 'Hi' }),
        onTypingComplete,
      });
      render(<StoryCardView {...props} />);

      // Advance timers to complete animation (20ms per char + buffer)
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(onTypingComplete).toHaveBeenCalled();
    });

    it('should skip animation when skipAnimation is true', () => {
      const onTypingComplete = jest.fn();
      const props = createDefaultProps({
        message: createMockMessage({ text: 'This is a long message' }),
        skipAnimation: true,
        onTypingComplete,
      });
      render(<StoryCardView {...props} />);

      expect(screen.getByText(/This is a long message/)).toBeInTheDocument();
      expect(onTypingComplete).toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('should call onPrevious when previous button is clicked', () => {
      const onPrevious = jest.fn();
      const props = createDefaultProps({
        onPrevious,
        canGoPrevious: true,
        skipAnimation: true,
      });
      render(<StoryCardView {...props} />);

      const prevButton = screen.getByRole('button', { name: /previous/i });
      fireEvent.click(prevButton);

      expect(onPrevious).toHaveBeenCalled();
    });

    it('should call onNext when next button is clicked', () => {
      const onNext = jest.fn();
      const props = createDefaultProps({
        onNext,
        canGoNext: true,
        skipAnimation: true,
      });
      render(<StoryCardView {...props} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      expect(onNext).toHaveBeenCalled();
    });

    it('should disable previous button when canGoPrevious is false', () => {
      const props = createDefaultProps({
        canGoPrevious: false,
        skipAnimation: true,
      });
      render(<StoryCardView {...props} />);

      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toBeDisabled();
    });

    it('should disable next button when canGoNext is false', () => {
      const props = createDefaultProps({
        canGoNext: false,
        skipAnimation: true,
      });
      render(<StoryCardView {...props} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });
  });

  describe('page counter', () => {
    it('should display correct page number', () => {
      const props = createDefaultProps({
        currentIndex: 2,
        totalCards: 10,
        skipAnimation: true,
      });
      render(<StoryCardView {...props} />);

      expect(screen.getByText('3/10')).toBeInTheDocument();
    });
  });

  describe('speaker labels', () => {
    it('should show YOU label for player messages', () => {
      const props = createDefaultProps({
        isPlayer: true,
        skipAnimation: true,
      });
      render(<StoryCardView {...props} />);

      expect(screen.getByText('YOU')).toBeInTheDocument();
    });

    it('should show NARRATOR label for narrator messages', () => {
      const props = createDefaultProps({
        message: createMockMessage({
          senderId: 'GM',
          type: MessageType.NARRATION,
        }),
        skipAnimation: true,
      });
      render(<StoryCardView {...props} />);

      expect(screen.getByText('NARRATOR')).toBeInTheDocument();
    });

    it('should show SYSTEM label for system messages', () => {
      const props = createDefaultProps({
        message: createMockMessage({
          senderId: 'SYSTEM',
          type: MessageType.SYSTEM,
        }),
        skipAnimation: true,
      });
      render(<StoryCardView {...props} />);

      expect(screen.getByText('SYSTEM')).toBeInTheDocument();
    });

    it('should show character name for NPC messages', () => {
      const props = createDefaultProps({
        senderName: 'Aragorn',
        skipAnimation: true,
      });
      render(<StoryCardView {...props} />);

      expect(screen.getByText('ARAGORN')).toBeInTheDocument();
    });
  });

  describe('grid map', () => {
    it('should show map button when grid data is available', () => {
      const props = createDefaultProps({
        gridSnapshots: [
          {
            id: 'grid-1',
            gameId: 'game-1',
            atMessageNumber: 1,
            timestamp: Date.now(),
            locationId: 'loc-1',
            locationName: 'Forest',
            characterPositions: [],
          },
        ],
        skipAnimation: true,
      });
      render(<StoryCardView {...props} />);

      expect(screen.getByTitle('View Map')).toBeInTheDocument();
    });

    it('should not show map button when no grid data', () => {
      const props = createDefaultProps({
        skipAnimation: true,
      });
      render(<StoryCardView {...props} />);

      expect(screen.queryByTitle('View Map')).not.toBeInTheDocument();
    });
  });

  describe('play button', () => {
    it('should render play button', () => {
      const props = createDefaultProps({
        apiKey: 'test-key',
        skipAnimation: true,
      });
      render(<StoryCardView {...props} />);

      expect(screen.getByTitle('Read Aloud')).toBeInTheDocument();
    });

    it('should disable play button when no API key', () => {
      const props = createDefaultProps({
        skipAnimation: true,
      });
      render(<StoryCardView {...props} />);

      const playButton = screen.getByTitle('Read Aloud');
      expect(playButton).toBeDisabled();
    });
  });
});
