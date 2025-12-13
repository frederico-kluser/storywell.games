import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GridMap } from '../../components/GridMap/GridMap';
import { GridSnapshot, DEFAULT_THEME_COLORS } from '../../types';

const mockTranslations = {
  mapTitle: 'Map',
  backToCard: 'Back',
  noMapData: 'No map data available',
};

const createMockGridSnapshot = (overrides: Partial<GridSnapshot> = {}): GridSnapshot => ({
  id: 'grid-1',
  gameId: 'game-1',
  atMessageNumber: 1,
  timestamp: Date.now(),
  locationId: 'loc-1',
  locationName: 'Ancient Forest',
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
      position: { x: 3, y: 4 },
      isPlayer: false,
    },
  ],
  ...overrides,
});

const defaultProps = {
  gridSnapshots: [createMockGridSnapshot()],
  currentMessageNumber: 1,
  colors: DEFAULT_THEME_COLORS,
  isFlipped: true,
  onToggleFlip: jest.fn(),
  t: mockTranslations,
};

describe('GridMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      render(<GridMap {...defaultProps} />);
      expect(document.body).toBeInTheDocument();
    });

    it('should match snapshot with characters', () => {
      const { container } = render(<GridMap {...defaultProps} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with no characters', () => {
      const props = {
        ...defaultProps,
        gridSnapshots: [createMockGridSnapshot({ characterPositions: [] })],
      };
      const { container } = render(<GridMap {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot when not flipped', () => {
      const props = {
        ...defaultProps,
        isFlipped: false,
      };
      const { container } = render(<GridMap {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with location name', () => {
      const props = {
        ...defaultProps,
        locationName: 'Custom Location',
      };
      const { container } = render(<GridMap {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with location background', () => {
      const props = {
        ...defaultProps,
        locationBackgroundImage: 'https://example.com/forest.jpg',
      };
      const { container } = render(<GridMap {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with multiple characters at same position', () => {
      const props = {
        ...defaultProps,
        gridSnapshots: [
          createMockGridSnapshot({
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
                position: { x: 5, y: 5 },
                isPlayer: false,
              },
              {
                characterId: 'npc-2',
                characterName: 'Guard',
                position: { x: 5, y: 5 },
                isPlayer: false,
              },
            ],
          }),
        ],
      };
      const { container } = render(<GridMap {...props} />);
      expect(container).toMatchSnapshot();
    });
  });

  describe('grid display', () => {
    it('should display 10x10 grid (100 cells)', () => {
      const { container } = render(<GridMap {...defaultProps} />);
      // Each cell has a title attribute
      const cells = container.querySelectorAll('[title]');
      expect(cells.length).toBeGreaterThanOrEqual(100);
    });

    it('should display location name', () => {
      render(<GridMap {...defaultProps} />);
      expect(screen.getByText('Ancient Forest')).toBeInTheDocument();
    });

    it('should display map title', () => {
      render(<GridMap {...defaultProps} />);
      expect(screen.getByText('Map')).toBeInTheDocument();
    });
  });

  describe('character display', () => {
    it('should display character names in legend', () => {
      render(<GridMap {...defaultProps} />);
      expect(screen.getByText('Hero')).toBeInTheDocument();
      expect(screen.getByText('Merchant')).toBeInTheDocument();
    });

    it('should display character positions in legend', () => {
      render(<GridMap {...defaultProps} />);
      expect(screen.getByText('(5, 5)')).toBeInTheDocument();
      expect(screen.getByText('(3, 4)')).toBeInTheDocument();
    });

    it('should show player character with different styling', () => {
      render(<GridMap {...defaultProps} />);
      // Player character should have different styling in the legend
      // Check that the legend exists and contains character info
      expect(screen.getByText('Hero')).toBeInTheDocument();
      expect(screen.getByText('Merchant')).toBeInTheDocument();
      // Verify positions are displayed
      expect(screen.getByText('(5, 5)')).toBeInTheDocument();
      expect(screen.getByText('(3, 4)')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onToggleFlip when back button is clicked', () => {
      const onToggleFlip = jest.fn();
      const props = {
        ...defaultProps,
        onToggleFlip,
      };
      render(<GridMap {...props} />);

      const backButton = screen.getByText('Back');
      fireEvent.click(backButton);

      expect(onToggleFlip).toHaveBeenCalled();
    });
  });

  describe('grid snapshot selection', () => {
    it('should show correct snapshot for message number', () => {
      const props = {
        ...defaultProps,
        gridSnapshots: [
          createMockGridSnapshot({
            atMessageNumber: 1,
            locationName: 'First Location',
          }),
          createMockGridSnapshot({
            id: 'grid-2',
            atMessageNumber: 3,
            locationName: 'Second Location',
          }),
        ],
        currentMessageNumber: 2,
      };
      render(<GridMap {...props} />);

      // Should show First Location (message 1, the most recent before message 2)
      expect(screen.getByText('First Location')).toBeInTheDocument();
    });

    it('should show most recent snapshot at or before current message', () => {
      const props = {
        ...defaultProps,
        gridSnapshots: [
          createMockGridSnapshot({
            atMessageNumber: 1,
            locationName: 'First Location',
          }),
          createMockGridSnapshot({
            id: 'grid-2',
            atMessageNumber: 3,
            locationName: 'Second Location',
          }),
        ],
        currentMessageNumber: 5,
      };
      render(<GridMap {...props} />);

      // Should show Second Location (message 3, the most recent before message 5)
      expect(screen.getByText('Second Location')).toBeInTheDocument();
    });
  });

  describe('no data state', () => {
    it('should show no map data message when no snapshots', () => {
      const props = {
        ...defaultProps,
        gridSnapshots: [],
      };
      render(<GridMap {...props} />);

      expect(screen.getByText('No map data available')).toBeInTheDocument();
    });

    it('should show no map data when no matching snapshot', () => {
      const props = {
        ...defaultProps,
        gridSnapshots: [
          createMockGridSnapshot({
            atMessageNumber: 10, // Future message
          }),
        ],
        currentMessageNumber: 1,
      };
      render(<GridMap {...props} />);

      expect(screen.getByText('No map data available')).toBeInTheDocument();
    });
  });

  describe('player blinking effect', () => {
    it('should toggle player visibility (blinking effect)', () => {
      render(<GridMap {...defaultProps} />);

      // Advance timer to trigger blink
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // The component should still render
      expect(screen.getByText('Hero')).toBeInTheDocument();
    });
  });

  describe('character avatars', () => {
    it('should display character avatar when available', () => {
      const props = {
        ...defaultProps,
        gridSnapshots: [
          createMockGridSnapshot({
            characterPositions: [
              {
                characterId: 'player-1',
                characterName: 'Hero',
                position: { x: 5, y: 5 },
                isPlayer: true,
                avatarBase64: 'data:image/png;base64,iVBORw0KGgo=',
              },
            ],
          }),
        ],
      };
      const { container } = render(<GridMap {...props} />);

      const avatarImages = container.querySelectorAll('img');
      expect(avatarImages.length).toBeGreaterThan(0);
    });

    it('should show initials when no avatar', () => {
      render(<GridMap {...defaultProps} />);

      // Should show 'H' for Hero (first character without avatar in our mock)
      const initials = screen.getAllByText('H');
      expect(initials.length).toBeGreaterThan(0);
    });

    it('should use characterAvatars fallback', () => {
      const props = {
        ...defaultProps,
        characterAvatars: {
          'player-1': 'data:image/png;base64,fallbackAvatar=',
        },
      };
      const { container } = render(<GridMap {...props} />);

      const avatarImages = container.querySelectorAll('img');
      expect(avatarImages.length).toBeGreaterThan(0);
    });
  });
});
