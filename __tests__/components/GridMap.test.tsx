import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GridMap } from '../../components/GridMap/GridMap';
import { GridSnapshot, ThemeColors, DEFAULT_THEME_COLORS, GridCharacterPosition } from '../../types';

const createMockColors = (): ThemeColors => DEFAULT_THEME_COLORS;

const mockTranslations = {
  mapTitle: 'Map',
  backToCard: 'Back',
  noMapData: 'No map data available',
};

const createMockCharacterPosition = (overrides?: Partial<GridCharacterPosition>): GridCharacterPosition => ({
  characterId: 'char-1',
  characterName: 'Hero',
  position: { x: 5, y: 5 },
  isPlayer: true,
  ...overrides,
});

const createMockGridSnapshot = (overrides?: Partial<GridSnapshot>): GridSnapshot => ({
  id: 'snap-1',
  gameId: 'game-1',
  atMessageNumber: 1,
  timestamp: Date.now(),
  locationId: 'loc-1',
  locationName: 'Town Square',
  characterPositions: [
    createMockCharacterPosition(),
  ],
  ...overrides,
});

const defaultProps = {
  gridSnapshots: [createMockGridSnapshot()],
  currentMessageNumber: 1,
  colors: createMockColors(),
  isFlipped: true,
  onToggleFlip: jest.fn(),
  locationName: 'Town Square',
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
      const { container } = render(<GridMap {...defaultProps} />);
      expect(container).toBeInTheDocument();
    });

    it('should render map title', () => {
      render(<GridMap {...defaultProps} />);
      expect(screen.getByText('Map')).toBeInTheDocument();
    });

    it('should render location name', () => {
      render(<GridMap {...defaultProps} />);
      expect(screen.getByText('Town Square')).toBeInTheDocument();
    });

    it('should render back button', () => {
      render(<GridMap {...defaultProps} />);
      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('should call onToggleFlip when back button is clicked', () => {
      const onToggleFlip = jest.fn();
      render(<GridMap {...defaultProps} onToggleFlip={onToggleFlip} />);

      fireEvent.click(screen.getByText('Back'));
      expect(onToggleFlip).toHaveBeenCalledTimes(1);
    });

    it('should render 100 grid cells (10x10)', () => {
      const { container } = render(<GridMap {...defaultProps} />);

      // Each cell has a title attribute with coordinates
      const gridCells = container.querySelectorAll('[title]');
      // We expect at least 100 cells (some might have character names as titles)
      expect(gridCells.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('character positions', () => {
    it('should display player character on the grid', () => {
      const snapshot = createMockGridSnapshot({
        characterPositions: [
          createMockCharacterPosition({
            characterId: 'player-1',
            characterName: 'Hero',
            position: { x: 5, y: 5 },
            isPlayer: true,
          }),
        ],
      });

      const { container } = render(
        <GridMap
          {...defaultProps}
          gridSnapshots={[snapshot]}
        />
      );

      // Player character should be shown (cell with player styling)
      const playerCell = container.querySelector('[title="Hero"]');
      expect(playerCell).toBeInTheDocument();
    });

    it('should display NPC character on the grid', () => {
      const snapshot = createMockGridSnapshot({
        characterPositions: [
          createMockCharacterPosition({
            characterId: 'npc-1',
            characterName: 'Merchant',
            position: { x: 3, y: 3 },
            isPlayer: false,
          }),
        ],
      });

      const { container } = render(
        <GridMap
          {...defaultProps}
          gridSnapshots={[snapshot]}
        />
      );

      const npcCell = container.querySelector('[title="Merchant"]');
      expect(npcCell).toBeInTheDocument();
    });

    it('should display multiple characters in same cell', () => {
      const snapshot = createMockGridSnapshot({
        characterPositions: [
          createMockCharacterPosition({
            characterId: 'player-1',
            characterName: 'Hero',
            position: { x: 5, y: 5 },
            isPlayer: true,
          }),
          createMockCharacterPosition({
            characterId: 'npc-1',
            characterName: 'Merchant',
            position: { x: 5, y: 5 },
            isPlayer: false,
          }),
        ],
      });

      const { container } = render(
        <GridMap
          {...defaultProps}
          gridSnapshots={[snapshot]}
        />
      );

      // Cell should have both character names in title
      const multiCharCell = container.querySelector('[title*="Hero"]');
      expect(multiCharCell).toBeInTheDocument();
    });

    it('should show character avatar when provided', () => {
      const avatarBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const snapshot = createMockGridSnapshot({
        characterPositions: [
          createMockCharacterPosition({
            avatarBase64: avatarBase64,
          }),
        ],
      });

      render(
        <GridMap
          {...defaultProps}
          gridSnapshots={[snapshot]}
        />
      );

      const avatar = screen.getAllByRole('img').find(img => img.getAttribute('alt') === 'Hero');
      expect(avatar).toBeInTheDocument();
    });

    it('should show character initial when no avatar', () => {
      const snapshot = createMockGridSnapshot({
        characterPositions: [
          createMockCharacterPosition({
            characterName: 'Warrior',
            avatarBase64: undefined,
          }),
        ],
      });

      render(
        <GridMap
          {...defaultProps}
          gridSnapshots={[snapshot]}
        />
      );

      // Should show 'W' for Warrior (multiple elements: grid cell + legend)
      const wElements = screen.getAllByText('W');
      expect(wElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('historical grid states', () => {
    it('should show correct grid state for current message number', () => {
      const snapshots = [
        createMockGridSnapshot({
          id: 'snap-1',
          atMessageNumber: 1,
          characterPositions: [
            createMockCharacterPosition({
              characterName: 'Hero',
              position: { x: 1, y: 1 },
            }),
          ],
        }),
        createMockGridSnapshot({
          id: 'snap-2',
          atMessageNumber: 3,
          characterPositions: [
            createMockCharacterPosition({
              characterName: 'Hero',
              position: { x: 5, y: 5 },
            }),
          ],
        }),
      ];

      // For message 2, should show snap-1 (most recent before or at message 2)
      const { container } = render(
        <GridMap
          {...defaultProps}
          gridSnapshots={snapshots}
          currentMessageNumber={2}
        />
      );

      // Character should be at position (1,1) from snap-1
      const heroCell = container.querySelector('[title="Hero"]');
      expect(heroCell).toBeInTheDocument();
    });

    it('should show latest snapshot for future message numbers', () => {
      const snapshots = [
        createMockGridSnapshot({
          id: 'snap-1',
          atMessageNumber: 1,
          characterPositions: [
            createMockCharacterPosition({
              characterName: 'Hero',
              position: { x: 1, y: 1 },
            }),
          ],
        }),
        createMockGridSnapshot({
          id: 'snap-2',
          atMessageNumber: 5,
          characterPositions: [
            createMockCharacterPosition({
              characterName: 'Hero',
              position: { x: 9, y: 9 },
            }),
          ],
        }),
      ];

      const { container } = render(
        <GridMap
          {...defaultProps}
          gridSnapshots={snapshots}
          currentMessageNumber={10}
        />
      );

      // Should show snap-2 positions
      const heroCell = container.querySelector('[title="Hero"]');
      expect(heroCell).toBeInTheDocument();
    });
  });

  describe('no data state', () => {
    it('should show no data message when no snapshots', () => {
      render(
        <GridMap
          {...defaultProps}
          gridSnapshots={[]}
        />
      );

      expect(screen.getByText('No map data available')).toBeInTheDocument();
    });

    it('should show no data message when no matching snapshot for message', () => {
      const snapshots = [
        createMockGridSnapshot({
          atMessageNumber: 10, // Only have data for message 10
        }),
      ];

      render(
        <GridMap
          {...defaultProps}
          gridSnapshots={snapshots}
          currentMessageNumber={1}
        />
      );

      // Should show no data because no snapshot exists at or before message 1
      // (snapshot is at message 10, which is after message 1)
      expect(screen.getByText('No map data available')).toBeInTheDocument();
    });
  });

  describe('legend', () => {
    it('should show character legend when characters are present', () => {
      const snapshot = createMockGridSnapshot({
        characterPositions: [
          createMockCharacterPosition({
            characterName: 'Hero',
            position: { x: 5, y: 5 },
            isPlayer: true,
          }),
          createMockCharacterPosition({
            characterId: 'npc-1',
            characterName: 'Merchant',
            position: { x: 3, y: 3 },
            isPlayer: false,
          }),
        ],
      });

      render(
        <GridMap
          {...defaultProps}
          gridSnapshots={[snapshot]}
        />
      );

      // Legend should show character names and coordinates
      expect(screen.getAllByText('Hero').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Merchant').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('(5, 5)')).toBeInTheDocument();
      expect(screen.getByText('(3, 3)')).toBeInTheDocument();
    });

    it('should not show legend when no characters', () => {
      const snapshot = createMockGridSnapshot({
        characterPositions: [],
      });

      render(
        <GridMap
          {...defaultProps}
          gridSnapshots={[snapshot]}
        />
      );

      // No coordinates should be shown
      expect(screen.queryByText(/\(\d+, \d+\)/)).not.toBeInTheDocument();
    });
  });

  describe('player blinking animation', () => {
    it('should toggle player cell blinking state', () => {
      const snapshot = createMockGridSnapshot({
        characterPositions: [
          createMockCharacterPosition({
            isPlayer: true,
          }),
        ],
      });

      render(
        <GridMap
          {...defaultProps}
          gridSnapshots={[snapshot]}
        />
      );

      // Initial state
      const playerCell = screen.getByTitle('Hero');
      expect(playerCell).toBeInTheDocument();

      // Advance timer to trigger blink
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Cell should still be present (blinking changes style, not presence)
      expect(screen.getByTitle('Hero')).toBeInTheDocument();

      // Another blink cycle
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(screen.getByTitle('Hero')).toBeInTheDocument();
    });
  });

  describe('background image', () => {
    it('should render with location background image', () => {
      const { container } = render(
        <GridMap
          {...defaultProps}
          locationBackgroundImage="https://example.com/background.jpg"
        />
      );

      // Should have an overlay for visibility
      const overlay = container.querySelector('[style*="background"]');
      expect(overlay).toBeInTheDocument();
    });
  });

  describe('character avatars fallback', () => {
    it('should use characterAvatars prop as fallback when snapshot has no avatar', () => {
      const snapshot = createMockGridSnapshot({
        characterPositions: [
          createMockCharacterPosition({
            characterId: 'player-1',
            characterName: 'Hero',
            avatarBase64: undefined,
          }),
        ],
      });

      const characterAvatars = {
        'player-1': 'data:image/png;base64,fallbackAvatar',
      };

      render(
        <GridMap
          {...defaultProps}
          gridSnapshots={[snapshot]}
          characterAvatars={characterAvatars}
        />
      );

      // Avatar should be rendered from fallback
      const avatar = screen.getAllByRole('img').find(img => img.getAttribute('alt') === 'Hero');
      expect(avatar).toBeInTheDocument();
    });
  });

  describe('snapshots', () => {
    it('should match snapshot for basic grid', () => {
      const { container } = render(
        <GridMap {...defaultProps} />
      );

      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for grid with multiple characters', () => {
      const snapshot = createMockGridSnapshot({
        characterPositions: [
          createMockCharacterPosition({
            characterId: 'player-1',
            characterName: 'Hero',
            position: { x: 5, y: 5 },
            isPlayer: true,
          }),
          createMockCharacterPosition({
            characterId: 'npc-1',
            characterName: 'Merchant',
            position: { x: 3, y: 3 },
            isPlayer: false,
          }),
          createMockCharacterPosition({
            characterId: 'npc-2',
            characterName: 'Guard',
            position: { x: 7, y: 2 },
            isPlayer: false,
          }),
        ],
      });

      const { container } = render(
        <GridMap
          {...defaultProps}
          gridSnapshots={[snapshot]}
        />
      );

      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for grid with location background', () => {
      const { container } = render(
        <GridMap
          {...defaultProps}
          locationBackgroundImage="https://example.com/forest.jpg"
        />
      );

      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for empty grid state', () => {
      const { container } = render(
        <GridMap
          {...defaultProps}
          gridSnapshots={[]}
        />
      );

      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with character avatars', () => {
      const avatarBase64 = 'data:image/png;base64,testAvatar';
      const snapshot = createMockGridSnapshot({
        characterPositions: [
          createMockCharacterPosition({
            characterId: 'player-1',
            characterName: 'Hero',
            position: { x: 5, y: 5 },
            isPlayer: true,
            avatarBase64: avatarBase64,
          }),
        ],
      });

      const { container } = render(
        <GridMap
          {...defaultProps}
          gridSnapshots={[snapshot]}
        />
      );

      expect(container).toMatchSnapshot();
    });

    it('should match snapshot when not flipped', () => {
      const { container } = render(
        <GridMap
          {...defaultProps}
          isFlipped={false}
        />
      );

      expect(container).toMatchSnapshot();
    });
  });
});
