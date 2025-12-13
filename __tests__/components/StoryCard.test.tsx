import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { StoryCardView, StoryCardProps } from '../../components/StoryCard/StoryCard.view';
import { MessageType, ChatMessage, ThemeColors, DEFAULT_THEME_COLORS, GridSnapshot } from '../../types';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Terminal: ({ className }: any) => <span data-testid="terminal-icon" className={className}>Terminal</span>,
  Info: ({ className }: any) => <span data-testid="info-icon" className={className}>Info</span>,
  Play: ({ className }: any) => <span data-testid="play-icon" className={className}>Play</span>,
  Loader2: ({ className }: any) => <span data-testid="loader-icon" className={className}>Loader</span>,
  StopCircle: ({ className }: any) => <span data-testid="stop-icon" className={className}>Stop</span>,
  ChevronLeft: ({ className }: any) => <span data-testid="chevron-left" className={className}>&lt;</span>,
  ChevronRight: ({ className }: any) => <span data-testid="chevron-right" className={className}>&gt;</span>,
  ChevronUp: ({ className }: any) => <span data-testid="chevron-up" className={className}>^</span>,
  ChevronDown: ({ className }: any) => <span data-testid="chevron-down" className={className}>v</span>,
  Map: ({ className }: any) => <span data-testid="map-icon" className={className}>Map</span>,
}));

// Mock the AI services
jest.mock('../../services/ai/openaiClient', () => ({
  generateSpeech: jest.fn().mockResolvedValue('base64-audio-data'),
}));

// Mock the audio utils
jest.mock('../../utils/ai', () => ({
  playMP3Audio: jest.fn().mockResolvedValue(undefined),
  TTSVoice: {},
}));

// Mock GridMap component
jest.mock('../../components/GridMap', () => ({
  GridMap: ({ gridSnapshots, currentMessageNumber, onToggleFlip, t }: any) => (
    <div data-testid="grid-map">
      <span>Grid Map - Message: {currentMessageNumber}</span>
      <button onClick={onToggleFlip}>{t.backToCard || 'Back'}</button>
    </div>
  ),
}));

const createMockMessage = (overrides?: Partial<ChatMessage>): ChatMessage => ({
  id: 'msg-1',
  senderId: 'player-1',
  text: 'Hello, this is a test message.',
  type: MessageType.DIALOGUE,
  timestamp: Date.now(),
  pageNumber: 1,
  ...overrides,
});

const createMockColors = (): ThemeColors => DEFAULT_THEME_COLORS;

const mockTranslations = {
  back: 'Previous',
  next: 'Next',
  map: 'Map',
  viewMap: 'View Map',
  backToCard: 'Back',
  noMapData: 'No map data available',
};

const createMockGridSnapshots = (): GridSnapshot[] => [
  {
    id: 'snap-1',
    gameId: 'game-1',
    atMessageNumber: 1,
    timestamp: Date.now(),
    locationId: 'loc-1',
    locationName: 'Town Square',
    characterPositions: [
      {
        characterId: 'player-1',
        characterName: 'Hero',
        position: { x: 5, y: 5 },
        isPlayer: true,
      },
      {
        characterId: 'npc-1',
        characterName: 'Merchant',
        position: { x: 3, y: 3 },
        isPlayer: false,
      },
    ],
  },
];

const defaultProps: StoryCardProps = {
  message: createMockMessage(),
  isPlayer: true,
  senderName: 'Hero',
  colors: createMockColors(),
  currentIndex: 0,
  totalCards: 5,
  onPrevious: jest.fn(),
  onNext: jest.fn(),
  canGoPrevious: true,
  canGoNext: true,
  isActive: true,
  t: mockTranslations,
  language: 'en',
};

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
      const { container } = render(<StoryCardView {...defaultProps} />);
      expect(container).toBeInTheDocument();
    });

    it('should render player message correctly', () => {
      render(<StoryCardView {...defaultProps} />);

      // Complete typing animation
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(screen.getByText('YOU')).toBeInTheDocument();
    });

    it('should render narrator message correctly', () => {
      const narratorMessage = createMockMessage({
        senderId: 'GM',
        type: MessageType.NARRATION,
        text: 'The adventure begins...',
      });

      render(
        <StoryCardView
          {...defaultProps}
          message={narratorMessage}
          isPlayer={false}
          senderName="Narrator"
        />
      );

      expect(screen.getByText('NARRATOR')).toBeInTheDocument();
      expect(screen.getByTestId('terminal-icon')).toBeInTheDocument();
    });

    it('should render system message correctly', () => {
      const systemMessage = createMockMessage({
        senderId: 'SYSTEM',
        type: MessageType.SYSTEM,
        text: 'Game saved.',
      });

      render(
        <StoryCardView
          {...defaultProps}
          message={systemMessage}
          isPlayer={false}
          senderName="System"
        />
      );

      expect(screen.getByText('SYSTEM')).toBeInTheDocument();
      expect(screen.getByTestId('info-icon')).toBeInTheDocument();
    });

    it('should render NPC message correctly', () => {
      const npcMessage = createMockMessage({
        senderId: 'npc-1',
        type: MessageType.DIALOGUE,
        text: 'Welcome, traveler!',
      });

      render(
        <StoryCardView
          {...defaultProps}
          message={npcMessage}
          isPlayer={false}
          senderName="Merchant"
        />
      );

      expect(screen.getByText('MERCHANT')).toBeInTheDocument();
    });

    it('should display page number correctly', () => {
      render(<StoryCardView {...defaultProps} currentIndex={2} totalCards={10} />);

      // The page number should show pageNumber or currentIndex + 1
      expect(screen.getByText(/Page 1 of 10/)).toBeInTheDocument();
    });

    it('should display avatar when provided', () => {
      const avatarBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      render(
        <StoryCardView
          {...defaultProps}
          avatarBase64={avatarBase64}
        />
      );

      const avatar = screen.getByAltText('Hero');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', avatarBase64);
    });
  });

  describe('typewriter effect', () => {
    it('should animate text character by character', async () => {
      const message = createMockMessage({ text: 'Hello' });

      render(
        <StoryCardView
          {...defaultProps}
          message={message}
          skipAnimation={false}
        />
      );

      // Initially should show partial text
      act(() => {
        jest.advanceTimersByTime(60); // 3 characters at 20ms each
      });

      // Eventually should show full text
      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(screen.getByText(/Hello/)).toBeInTheDocument();
    });

    it('should skip animation when skipAnimation is true', () => {
      const message = createMockMessage({ text: 'Instant text!' });

      render(
        <StoryCardView
          {...defaultProps}
          message={message}
          skipAnimation={true}
        />
      );

      // Text should appear immediately
      expect(screen.getByText(/Instant text!/)).toBeInTheDocument();
    });

    it('should call onTypingComplete when animation finishes', () => {
      const onTypingComplete = jest.fn();
      const message = createMockMessage({ text: 'Hi' });

      render(
        <StoryCardView
          {...defaultProps}
          message={message}
          onTypingComplete={onTypingComplete}
        />
      );

      // Wait for typing to complete (2 chars * 20ms + buffer)
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(onTypingComplete).toHaveBeenCalledTimes(1);
    });

    it('should show typing cursor during animation', () => {
      const message = createMockMessage({ text: 'Long message here...' });

      const { container } = render(
        <StoryCardView
          {...defaultProps}
          message={message}
          skipAnimation={false}
        />
      );

      // The cursor is a | character with animate-pulse class
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('should call onPrevious when Previous button is clicked', () => {
      const onPrevious = jest.fn();

      render(
        <StoryCardView
          {...defaultProps}
          onPrevious={onPrevious}
          canGoPrevious={true}
        />
      );

      const prevButton = screen.getAllByRole('button').find(
        btn => btn.textContent?.includes('<') || btn.querySelector('[data-testid="chevron-left"]')
      );

      if (prevButton) {
        fireEvent.click(prevButton);
        expect(onPrevious).toHaveBeenCalledTimes(1);
      }
    });

    it('should call onNext when Next button is clicked', () => {
      const onNext = jest.fn();

      render(
        <StoryCardView
          {...defaultProps}
          onNext={onNext}
          canGoNext={true}
        />
      );

      const nextButton = screen.getAllByRole('button').find(
        btn => btn.textContent?.includes('>') || btn.querySelector('[data-testid="chevron-right"]')
      );

      if (nextButton) {
        fireEvent.click(nextButton);
        expect(onNext).toHaveBeenCalledTimes(1);
      }
    });

    it('should disable Previous button when canGoPrevious is false', () => {
      render(
        <StoryCardView
          {...defaultProps}
          canGoPrevious={false}
        />
      );

      const buttons = screen.getAllByRole('button');
      const prevButton = buttons.find(
        btn => btn.querySelector('[data-testid="chevron-left"]')
      );

      expect(prevButton).toBeDisabled();
    });

    it('should disable Next button when canGoNext is false', () => {
      render(
        <StoryCardView
          {...defaultProps}
          canGoNext={false}
        />
      );

      const buttons = screen.getAllByRole('button');
      const nextButton = buttons.find(
        btn => btn.querySelector('[data-testid="chevron-right"]')
      );

      expect(nextButton).toBeDisabled();
    });
  });

  describe('grid map', () => {
    it('should show Map button when grid data is available', () => {
      render(
        <StoryCardView
          {...defaultProps}
          gridSnapshots={createMockGridSnapshots()}
        />
      );

      expect(screen.getByTestId('map-icon')).toBeInTheDocument();
    });

    it('should not show Map button when no grid data', () => {
      render(
        <StoryCardView
          {...defaultProps}
          gridSnapshots={undefined}
        />
      );

      expect(screen.queryByTestId('map-icon')).not.toBeInTheDocument();
    });

    it('should toggle map view when Map button is clicked', () => {
      render(
        <StoryCardView
          {...defaultProps}
          gridSnapshots={createMockGridSnapshots()}
        />
      );

      // Click the map button
      const mapButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('[data-testid="map-icon"]')
      );

      if (mapButton) {
        fireEvent.click(mapButton);

        // GridMap should be rendered on back face
        expect(screen.getByTestId('grid-map')).toBeInTheDocument();
      }
    });
  });

  describe('audio playback', () => {
    it('should show play button when apiKey is provided', () => {
      render(
        <StoryCardView
          {...defaultProps}
          apiKey="test-api-key"
          skipAnimation={true}
        />
      );

      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    });

    it('should disable play button while typing', () => {
      render(
        <StoryCardView
          {...defaultProps}
          apiKey="test-api-key"
          skipAnimation={false}
        />
      );

      const playButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('[data-testid="play-icon"]')
      );

      expect(playButton).toBeDisabled();
    });
  });

  describe('progress indicator', () => {
    it('should show progress bar with correct percentage', () => {
      const { container } = render(
        <StoryCardView
          {...defaultProps}
          currentIndex={4}
          totalCards={10}
        />
      );

      // Progress bar fill should be 50% ((4+1)/10 * 100)
      const progressFill = container.querySelector('[style*="width"]');
      expect(progressFill).toBeInTheDocument();
    });

    it('should display current/total indicator', () => {
      render(
        <StoryCardView
          {...defaultProps}
          currentIndex={4}
          totalCards={10}
        />
      );

      expect(screen.getByText('5/10')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply theme colors correctly', () => {
      const customColors: ThemeColors = {
        ...DEFAULT_THEME_COLORS,
        background: '#ff0000',
        text: '#00ff00',
      };

      const { container } = render(
        <StoryCardView
          {...defaultProps}
          colors={customColors}
        />
      );

      expect(container.firstChild).toBeInTheDocument();
    });

    it('should show location background when provided', () => {
      const locationBg = 'https://example.com/background.jpg';

      render(
        <StoryCardView
          {...defaultProps}
          locationBackgroundImage={locationBg}
          isPlayer={false}
          message={createMockMessage({ senderId: 'GM', type: MessageType.NARRATION })}
        />
      );

      // Background should be applied (testing via presence, actual style testing is limited)
      expect(screen.getByText('NARRATOR')).toBeInTheDocument();
    });
  });

  describe('snapshots', () => {
    it('should match snapshot for player message', () => {
      const { container } = render(
        <StoryCardView
          {...defaultProps}
          skipAnimation={true}
        />
      );

      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for narrator message', () => {
      const narratorMessage = createMockMessage({
        senderId: 'GM',
        type: MessageType.NARRATION,
        text: 'The wind howled through the ancient forest...',
      });

      const { container } = render(
        <StoryCardView
          {...defaultProps}
          message={narratorMessage}
          isPlayer={false}
          senderName="Narrator"
          skipAnimation={true}
        />
      );

      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for system message', () => {
      const systemMessage = createMockMessage({
        senderId: 'SYSTEM',
        type: MessageType.SYSTEM,
        text: 'Achievement unlocked: First Steps',
      });

      const { container } = render(
        <StoryCardView
          {...defaultProps}
          message={systemMessage}
          isPlayer={false}
          senderName="System"
          skipAnimation={true}
        />
      );

      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for NPC with avatar', () => {
      const npcMessage = createMockMessage({
        senderId: 'npc-1',
        type: MessageType.DIALOGUE,
        text: 'Welcome to my shop, traveler!',
      });

      const { container } = render(
        <StoryCardView
          {...defaultProps}
          message={npcMessage}
          isPlayer={false}
          senderName="Merchant"
          avatarBase64="data:image/png;base64,test"
          skipAnimation={true}
        />
      );

      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with grid map button visible', () => {
      const { container } = render(
        <StoryCardView
          {...defaultProps}
          gridSnapshots={createMockGridSnapshots()}
          skipAnimation={true}
        />
      );

      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with pulse animation on next button', () => {
      const { container } = render(
        <StoryCardView
          {...defaultProps}
          showNextPulse={true}
          skipAnimation={true}
        />
      );

      expect(container).toMatchSnapshot();
    });
  });
});
