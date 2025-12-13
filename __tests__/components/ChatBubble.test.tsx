import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { ChatBubbleView, ChatBubbleProps } from '../../components/ChatBubble/ChatBubble.view';
import { MessageType, ChatMessage } from '../../types';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Terminal: ({ className }: any) => <span data-testid="terminal-icon" className={className}>Terminal</span>,
  Info: ({ className }: any) => <span data-testid="info-icon" className={className}>Info</span>,
  Play: ({ className }: any) => <span data-testid="play-icon" className={className}>Play</span>,
  Loader2: ({ className }: any) => <span data-testid="loader-icon" className={className}>Loader</span>,
  StopCircle: ({ className }: any) => <span data-testid="stop-icon" className={className}>Stop</span>,
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

const createMockMessage = (overrides?: Partial<ChatMessage>): ChatMessage => ({
  id: 'msg-1',
  senderId: 'player-1',
  text: 'Hello, this is a test message.',
  type: MessageType.DIALOGUE,
  timestamp: Date.now(),
  pageNumber: 1,
  ...overrides,
});

const defaultProps: ChatBubbleProps = {
  message: createMockMessage(),
  isPlayer: true,
  senderName: 'Hero',
};

describe('ChatBubble', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<ChatBubbleView {...defaultProps} />);
      expect(container).toBeInTheDocument();
    });

    it('should render player message correctly', () => {
      render(<ChatBubbleView {...defaultProps} />);

      // Complete typing animation
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(screen.getByText('PLAYER')).toBeInTheDocument();
    });

    it('should render narrator message correctly', () => {
      const narratorMessage = createMockMessage({
        senderId: 'GM',
        type: MessageType.NARRATION,
        text: 'The adventure begins...',
      });

      render(
        <ChatBubbleView
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
        <ChatBubbleView
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
        <ChatBubbleView
          {...defaultProps}
          message={npcMessage}
          isPlayer={false}
          senderName="Merchant"
        />
      );

      // Complete typing
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // NPC name should be displayed (component shows senderName as-is)
      expect(screen.getByText('Merchant')).toBeInTheDocument();
    });

    it('should display avatar when provided', () => {
      const avatarBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      render(
        <ChatBubbleView
          {...defaultProps}
          avatarBase64={avatarBase64}
        />
      );

      const avatar = screen.getByAltText('Hero');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', avatarBase64);
    });

    it('should show YOU for player without avatar', () => {
      render(
        <ChatBubbleView
          {...defaultProps}
          avatarBase64={undefined}
          avatarUrl={undefined}
        />
      );

      expect(screen.getByText('YOU')).toBeInTheDocument();
    });

    it('should show first letter for NPC without avatar', () => {
      render(
        <ChatBubbleView
          {...defaultProps}
          isPlayer={false}
          senderName="Merchant"
          avatarBase64={undefined}
          avatarUrl={undefined}
        />
      );

      expect(screen.getByText('M')).toBeInTheDocument();
    });
  });

  describe('typewriter effect', () => {
    it('should animate text character by character', () => {
      const message = createMockMessage({ text: 'Hello' });

      render(
        <ChatBubbleView
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
        <ChatBubbleView
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
        <ChatBubbleView
          {...defaultProps}
          message={message}
          onTypingComplete={onTypingComplete}
        />
      );

      // Wait for typing to complete
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(onTypingComplete).toHaveBeenCalledTimes(1);
    });

    it('should show typing cursor during animation', () => {
      const message = createMockMessage({ text: 'Long message here...' });

      const { container } = render(
        <ChatBubbleView
          {...defaultProps}
          message={message}
          skipAnimation={false}
        />
      );

      // The cursor is a _ character (for dialogue) with animate-pulse class
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('audio playback', () => {
    it('should show play button when apiKey is provided', () => {
      render(
        <ChatBubbleView
          {...defaultProps}
          apiKey="test-api-key"
          skipAnimation={true}
        />
      );

      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    });

    it('should disable play button while typing', () => {
      render(
        <ChatBubbleView
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

    it('should disable play button when no apiKey', () => {
      render(
        <ChatBubbleView
          {...defaultProps}
          apiKey={undefined}
          skipAnimation={true}
        />
      );

      const playButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('[data-testid="play-icon"]')
      );

      expect(playButton).toBeDisabled();
    });
  });

  describe('avatar click', () => {
    it('should call onAvatarClick when avatar is clicked', () => {
      const onAvatarClick = jest.fn();
      const avatarBase64 = 'data:image/png;base64,test';

      render(
        <ChatBubbleView
          {...defaultProps}
          avatarBase64={avatarBase64}
          onAvatarClick={onAvatarClick}
        />
      );

      const avatarContainer = screen.getByAltText('Hero').parentElement;
      if (avatarContainer) {
        fireEvent.click(avatarContainer);
        expect(onAvatarClick).toHaveBeenCalledWith(avatarBase64, 'Hero');
      }
    });

    it('should not call onAvatarClick when no avatar', () => {
      const onAvatarClick = jest.fn();

      render(
        <ChatBubbleView
          {...defaultProps}
          avatarBase64={undefined}
          avatarUrl={undefined}
          onAvatarClick={onAvatarClick}
        />
      );

      // Find the container with 'YOU' text and click it
      const youElement = screen.getByText('YOU');
      const container = youElement.parentElement?.parentElement;
      if (container) {
        fireEvent.click(container);
        // Should not be called since there's no avatar
        expect(onAvatarClick).not.toHaveBeenCalled();
      }
    });
  });

  describe('styling', () => {
    it('should apply dark styling for player messages', () => {
      const { container } = render(
        <ChatBubbleView
          {...defaultProps}
          isPlayer={true}
          skipAnimation={true}
        />
      );

      // Player messages have bg-stone-800 class
      expect(container.querySelector('.bg-stone-800')).toBeInTheDocument();
    });

    it('should apply light styling for NPC messages', () => {
      const { container } = render(
        <ChatBubbleView
          {...defaultProps}
          isPlayer={false}
          senderName="Merchant"
          skipAnimation={true}
        />
      );

      // NPC messages have bg-white class
      expect(container.querySelector('.bg-white')).toBeInTheDocument();
    });
  });

  describe('snapshots', () => {
    it('should match snapshot for player message', () => {
      const { container } = render(
        <ChatBubbleView
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
        <ChatBubbleView
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
        <ChatBubbleView
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
        <ChatBubbleView
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

    it('should match snapshot for player with avatar', () => {
      const { container } = render(
        <ChatBubbleView
          {...defaultProps}
          avatarBase64="data:image/png;base64,playerAvatar"
          skipAnimation={true}
        />
      );

      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with API key (play button visible)', () => {
      const { container } = render(
        <ChatBubbleView
          {...defaultProps}
          apiKey="test-api-key"
          skipAnimation={true}
        />
      );

      expect(container).toMatchSnapshot();
    });
  });
});
