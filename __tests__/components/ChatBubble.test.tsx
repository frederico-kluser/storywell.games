import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ChatBubbleView, ChatBubbleProps } from '../../components/ChatBubble/ChatBubble.view';
import { MessageType, ChatMessage } from '../../types';

// Mock the AI services
jest.mock('../../services/ai/openaiClient', () => ({
  generateSpeech: jest.fn().mockResolvedValue(null),
}));

// Mock the audio utility
jest.mock('../../utils/ai', () => ({
  playMP3Audio: jest.fn().mockResolvedValue(undefined),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Terminal: () => <span data-testid="terminal-icon">Terminal</span>,
  Info: () => <span data-testid="info-icon">Info</span>,
  Play: () => <span data-testid="play-icon">Play</span>,
  Loader2: () => <span data-testid="loader-icon">Loading</span>,
  StopCircle: () => <span data-testid="stop-icon">Stop</span>,
}));

const createMockMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'msg-1',
  senderId: 'npc-1',
  text: 'Greetings, traveler! Welcome to our village.',
  type: MessageType.DIALOGUE,
  timestamp: Date.now(),
  pageNumber: 1,
  ...overrides,
});

const createDefaultProps = (overrides: Partial<ChatBubbleProps> = {}): ChatBubbleProps => ({
  message: createMockMessage(),
  isPlayer: false,
  senderName: 'Village Elder',
  ...overrides,
});

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
      const props = createDefaultProps();
      render(<ChatBubbleView {...props} />);
      expect(document.body).toBeInTheDocument();
    });

    it('should match snapshot for NPC dialogue', () => {
      const props = createDefaultProps({
        skipAnimation: true,
      });
      const { container } = render(<ChatBubbleView {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for player message', () => {
      const props = createDefaultProps({
        isPlayer: true,
        senderName: 'Player',
        message: createMockMessage({
          senderId: 'player-1',
          text: 'I seek adventure and glory!',
        }),
        skipAnimation: true,
      });
      const { container } = render(<ChatBubbleView {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for narrator message', () => {
      const props = createDefaultProps({
        message: createMockMessage({
          senderId: 'GM',
          text: 'The sun sets over the distant mountains...',
          type: MessageType.NARRATION,
        }),
        skipAnimation: true,
      });
      const { container } = render(<ChatBubbleView {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for system message', () => {
      const props = createDefaultProps({
        message: createMockMessage({
          senderId: 'SYSTEM',
          text: 'Game autosaved.',
          type: MessageType.SYSTEM,
        }),
        skipAnimation: true,
      });
      const { container } = render(<ChatBubbleView {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with avatar base64', () => {
      const props = createDefaultProps({
        avatarBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
        skipAnimation: true,
      });
      const { container } = render(<ChatBubbleView {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with avatar URL', () => {
      const props = createDefaultProps({
        avatarUrl: 'https://example.com/avatar.png',
        skipAnimation: true,
      });
      const { container } = render(<ChatBubbleView {...props} />);
      expect(container).toMatchSnapshot();
    });
  });

  describe('typewriter effect', () => {
    it('should show typing cursor during animation', () => {
      const props = createDefaultProps({
        message: createMockMessage({ text: 'Hello' }),
      });
      render(<ChatBubbleView {...props} />);

      // Should show underscore cursor for dialogue
      const cursor = screen.queryByText(/_/);
      expect(document.body.textContent).toContain('_');
    });

    it('should complete animation and call callback', () => {
      const onTypingComplete = jest.fn();
      const props = createDefaultProps({
        message: createMockMessage({ text: 'Hi' }),
        onTypingComplete,
      });
      render(<ChatBubbleView {...props} />);

      // Advance timers to complete animation
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(onTypingComplete).toHaveBeenCalled();
    });

    it('should skip animation when skipAnimation is true', () => {
      const onTypingComplete = jest.fn();
      const props = createDefaultProps({
        message: createMockMessage({ text: 'This is a test message' }),
        skipAnimation: true,
        onTypingComplete,
      });
      render(<ChatBubbleView {...props} />);

      expect(screen.getByText(/This is a test message/)).toBeInTheDocument();
      expect(onTypingComplete).toHaveBeenCalled();
    });
  });

  describe('message types', () => {
    it('should display NARRATOR label for narrator messages', () => {
      const props = createDefaultProps({
        message: createMockMessage({
          senderId: 'GM',
          type: MessageType.NARRATION,
        }),
        skipAnimation: true,
      });
      render(<ChatBubbleView {...props} />);

      expect(screen.getByText('NARRATOR')).toBeInTheDocument();
    });

    it('should display SYSTEM label for system messages', () => {
      const props = createDefaultProps({
        message: createMockMessage({
          senderId: 'SYSTEM',
          type: MessageType.SYSTEM,
        }),
        skipAnimation: true,
      });
      render(<ChatBubbleView {...props} />);

      expect(screen.getByText('SYSTEM')).toBeInTheDocument();
    });

    it('should display PLAYER label for player messages', () => {
      const props = createDefaultProps({
        isPlayer: true,
        skipAnimation: true,
      });
      render(<ChatBubbleView {...props} />);

      expect(screen.getByText('PLAYER')).toBeInTheDocument();
    });

    it('should display sender name for NPC messages', () => {
      const props = createDefaultProps({
        senderName: 'Gandalf the Grey',
        skipAnimation: true,
      });
      render(<ChatBubbleView {...props} />);

      expect(screen.getByText('Gandalf the Grey')).toBeInTheDocument();
    });
  });

  describe('avatar display', () => {
    it('should display avatar image when avatarBase64 is provided', () => {
      const props = createDefaultProps({
        avatarBase64: 'iVBORw0KGgoAAAANSUhEUg==',
        skipAnimation: true,
      });
      const { container } = render(<ChatBubbleView {...props} />);

      const avatarImg = container.querySelector('img');
      expect(avatarImg).toBeInTheDocument();
      expect(avatarImg?.src).toContain('data:image/png;base64');
    });

    it('should display avatar image when avatarUrl is provided', () => {
      const props = createDefaultProps({
        avatarUrl: 'https://example.com/avatar.png',
        skipAnimation: true,
      });
      const { container } = render(<ChatBubbleView {...props} />);

      const avatarImg = container.querySelector('img');
      expect(avatarImg).toBeInTheDocument();
      expect(avatarImg?.src).toBe('https://example.com/avatar.png');
    });

    it('should prefer avatarBase64 over avatarUrl', () => {
      const props = createDefaultProps({
        avatarBase64: 'iVBORw0KGgoAAAANSUhEUg==',
        avatarUrl: 'https://example.com/avatar.png',
        skipAnimation: true,
      });
      const { container } = render(<ChatBubbleView {...props} />);

      const avatarImg = container.querySelector('img');
      expect(avatarImg?.src).toContain('data:image/png;base64');
    });

    it('should show initials when no avatar is provided', () => {
      const props = createDefaultProps({
        senderName: 'Gandalf',
        skipAnimation: true,
      });
      render(<ChatBubbleView {...props} />);

      expect(screen.getByText('G')).toBeInTheDocument();
    });

    it('should show YOU for player without avatar', () => {
      const props = createDefaultProps({
        isPlayer: true,
        skipAnimation: true,
      });
      render(<ChatBubbleView {...props} />);

      expect(screen.getByText('YOU')).toBeInTheDocument();
    });
  });

  describe('avatar click', () => {
    it('should call onAvatarClick when avatar is clicked', () => {
      const onAvatarClick = jest.fn();
      const props = createDefaultProps({
        avatarBase64: 'iVBORw0KGgoAAAANSUhEUg==',
        onAvatarClick,
        skipAnimation: true,
      });
      const { container } = render(<ChatBubbleView {...props} />);

      const avatarContainer = container.querySelector('img')?.parentElement;
      if (avatarContainer) {
        fireEvent.click(avatarContainer);
        expect(onAvatarClick).toHaveBeenCalledWith(
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
          'Village Elder'
        );
      }
    });

    it('should not call onAvatarClick when no avatar', () => {
      const onAvatarClick = jest.fn();
      const props = createDefaultProps({
        onAvatarClick,
        skipAnimation: true,
      });
      const { container } = render(<ChatBubbleView {...props} />);

      // Try to find and click the avatar placeholder
      const avatarPlaceholder = container.querySelector('.flex-shrink-0 > div');
      if (avatarPlaceholder) {
        fireEvent.click(avatarPlaceholder);
      }
      // Should not be called since there's no avatar
      expect(onAvatarClick).not.toHaveBeenCalled();
    });
  });

  describe('play button', () => {
    it('should render play button when apiKey is provided', () => {
      const props = createDefaultProps({
        apiKey: 'test-api-key',
        skipAnimation: true,
      });
      render(<ChatBubbleView {...props} />);

      expect(screen.getByTitle('Read Aloud')).toBeInTheDocument();
    });

    it('should disable play button when no apiKey', () => {
      const props = createDefaultProps({
        skipAnimation: true,
      });
      render(<ChatBubbleView {...props} />);

      const playButton = screen.getByTitle('Read Aloud');
      expect(playButton).toBeDisabled();
    });

    it('should disable play button during typing animation', () => {
      const props = createDefaultProps({
        apiKey: 'test-api-key',
        message: createMockMessage({ text: 'A very long message that takes time to type' }),
      });
      render(<ChatBubbleView {...props} />);

      const playButton = screen.getByTitle('Read Aloud');
      expect(playButton).toBeDisabled();
    });
  });

  describe('narrator styling', () => {
    it('should render narrator message', () => {
      const props = createDefaultProps({
        message: createMockMessage({
          senderId: 'GM',
          text: 'The adventure begins',
          type: MessageType.NARRATION,
        }),
        skipAnimation: true,
      });
      render(<ChatBubbleView {...props} />);

      // Narrator message should be rendered
      expect(screen.getByText(/The adventure begins/)).toBeInTheDocument();
      expect(screen.getByText('NARRATOR')).toBeInTheDocument();
    });
  });
});
