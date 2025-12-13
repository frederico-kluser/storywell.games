/**
 * @fileoverview GridMap Component - 10x10 Map Grid with 3D Flip Animation
 *
 * This component displays a 10x10 grid map showing character positions
 * and scene elements in the current location. It integrates with the card
 * navigation system and shows historical grid states based on the current
 * message number.
 *
 * Features:
 * - 3D flip animation to reveal the map
 * - Blinking player character indicator
 * - Character avatars displayed on grid cells
 * - Scene elements displayed as letters with popup on click
 * - Historical grid view based on current card/message
 * - Responsive grid sizing matching card dimensions
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GridSnapshot, GridCharacterPosition, GridElement, ThemeColors } from '../../types';

const getAvatarSrc = (avatarBase64?: string) => {
  if (!avatarBase64) return undefined;
  return avatarBase64.startsWith('data:') ? avatarBase64 : `data:image/png;base64,${avatarBase64}`;
};

interface GridMapProps {
  /** Array of all grid snapshots for the story */
  gridSnapshots: GridSnapshot[];
  /** Current message/card number being viewed */
  currentMessageNumber: number;
  /** Theme colors for styling */
  colors: ThemeColors;
  /** Whether the map is flipped/visible */
  isFlipped: boolean;
  /** Callback to toggle flip state */
  onToggleFlip: () => void;
  /** Current location name for display */
  locationName?: string;
  /** Location background image for the map */
  locationBackgroundImage?: string;
  /** Map of characterId to avatarBase64 for current avatars (fallback for snapshot data) */
  characterAvatars?: Record<string, string | undefined>;
  /** Translation strings */
  t: Record<string, string>;
}

/**
 * Gets the appropriate grid snapshot for a given message number.
 * Returns the most recent snapshot that was created at or before the message.
 */
function getGridForMessage(
  snapshots: GridSnapshot[],
  messageNumber: number
): GridSnapshot | null {
  if (!snapshots || snapshots.length === 0) return null;

  // Find the most recent snapshot at or before this message number
  let relevantSnapshot: GridSnapshot | null = null;

  for (const snapshot of snapshots) {
    if (snapshot.atMessageNumber <= messageNumber) {
      if (!relevantSnapshot || snapshot.atMessageNumber > relevantSnapshot.atMessageNumber) {
        relevantSnapshot = snapshot;
      }
    }
  }

  return relevantSnapshot;
}

/**
 * GridCell component renders a single cell of the 10x10 grid.
 */
const GridCell: React.FC<{
  x: number;
  y: number;
  characters: GridCharacterPosition[];
  elements: GridElement[];
  colors: ThemeColors;
  onElementClick: (element: GridElement) => void;
}> = ({ x, y, characters, elements, colors, onElementClick }) => {
  const [blinkState, setBlinkState] = useState(true);

  // Find characters at this position
  const charsAtPosition = characters.filter(
    (c) => c.position.x === x && c.position.y === y
  );

  // Find elements at this position
  const elementsAtPosition = elements.filter(
    (e) => e.position.x === x && e.position.y === y
  );

  const hasPlayer = charsAtPosition.some((c) => c.isPlayer);
  const playerChar = charsAtPosition.find((c) => c.isPlayer);
  const npcChars = charsAtPosition.filter((c) => !c.isPlayer);
  const playerAvatarSrc = playerChar ? getAvatarSrc(playerChar.avatarBase64) : undefined;
  const firstNpcAvatarSrc = npcChars.length > 0 ? getAvatarSrc(npcChars[0].avatarBase64) : undefined;
  const hasElement = elementsAtPosition.length > 0;
  const firstElement = elementsAtPosition[0];

  // Blinking effect for player
  useEffect(() => {
    if (!hasPlayer) return;

    const interval = setInterval(() => {
      setBlinkState((prev) => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, [hasPlayer]);

  // Determine cell styling based on content
  const isOccupied = charsAtPosition.length > 0;
  const borderColor = isOccupied ? colors.borderStrong : hasElement ? colors.warning : colors.border;
  const bgColor = hasPlayer
    ? blinkState
      ? colors.buttonPrimary
      : colors.backgroundAccent
    : isOccupied
    ? colors.backgroundSecondary
    : hasElement
    ? `${colors.warning}22`  // Semi-transparent warning color for elements
    : 'transparent';

  const handleClick = () => {
    if (hasElement && firstElement) {
      onElementClick(firstElement);
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        width: '100%',
        aspectRatio: '1',
        border: `1px solid ${borderColor}`,
        backgroundColor: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        transition: 'background-color 0.2s ease',
        cursor: hasElement ? 'pointer' : 'default',
      }}
      title={
        charsAtPosition.length > 0
          ? charsAtPosition.map((c) => c.characterName).join(', ')
          : hasElement
          ? `${firstElement?.name}: ${firstElement?.description}`
          : `(${x}, ${y})`
      }
    >
      {/* Element symbol (shown behind characters if both present) */}
      {hasElement && !hasPlayer && charsAtPosition.length === 0 && (
        <span
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: colors.warning,
            textShadow: `0 0 2px ${colors.background}`,
          }}
        >
          {firstElement?.symbol}
        </span>
      )}
      {/* Element indicator when character is also present */}
      {hasElement && (hasPlayer || charsAtPosition.length > 0) && (
        <span
          style={{
            position: 'absolute',
            top: '1px',
            left: '1px',
            fontSize: '8px',
            fontWeight: 'bold',
            color: colors.warning,
            backgroundColor: colors.background,
            padding: '0 2px',
            borderRadius: '2px',
            lineHeight: '1',
          }}
        >
          {firstElement?.symbol}
        </span>
      )}
      {/* Player avatar */}
      {playerAvatarSrc && (
        <img
          src={playerAvatarSrc}
          alt={playerChar?.characterName}
          style={{
            width: '90%',
            height: '90%',
            objectFit: 'cover',
            borderRadius: '50%',
            opacity: blinkState ? 1 : 0.5,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}
      {/* Player initials fallback */}
      {playerChar && !playerChar.avatarBase64 && (
        <span
          style={{
            fontSize: '10px',
            fontWeight: 'bold',
            color: blinkState ? colors.buttonPrimaryText : colors.text,
            transition: 'color 0.2s ease',
          }}
        >
          {playerChar.characterName.charAt(0).toUpperCase()}
        </span>
      )}
      {/* NPC avatars (show first NPC if no player) */}
      {!hasPlayer && npcChars.length > 0 && (
        <>
          {firstNpcAvatarSrc ? (
            <img
              src={firstNpcAvatarSrc}
              alt={npcChars[0].characterName}
              style={{
                width: '90%',
                height: '90%',
                objectFit: 'cover',
                borderRadius: '50%',
              }}
            />
          ) : (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 'bold',
                color: colors.textAccent,
              }}
            >
              {npcChars[0].characterName.charAt(0).toUpperCase()}
            </span>
          )}
          {/* Badge for multiple NPCs */}
          {npcChars.length > 1 && (
            <span
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                fontSize: '8px',
                backgroundColor: colors.warning,
                color: '#fff',
                borderRadius: '50%',
                width: '14px',
                height: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              +{npcChars.length - 1}
            </span>
          )}
        </>
      )}
      {/* Badge for multiple elements */}
      {elementsAtPosition.length > 1 && (
        <span
          style={{
            position: 'absolute',
            bottom: '2px',
            left: '2px',
            fontSize: '8px',
            backgroundColor: colors.warning,
            color: '#fff',
            borderRadius: '50%',
            width: '14px',
            height: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          +{elementsAtPosition.length - 1}
        </span>
      )}
    </div>
  );
};

/**
 * GridMap component displays a 10x10 map with character positions.
 * Uses a 3D flip animation to reveal the map when activated.
 */
export const GridMap: React.FC<GridMapProps> = ({
  gridSnapshots,
  currentMessageNumber,
  colors,
  isFlipped,
  onToggleFlip,
  locationName,
  locationBackgroundImage,
  characterAvatars,
  t,
}) => {
  // State for element popup
  const [selectedElement, setSelectedElement] = useState<GridElement | null>(null);

  // Get the appropriate grid snapshot for the current message
  const currentGrid = useMemo(
    () => getGridForMessage(gridSnapshots, currentMessageNumber),
    [gridSnapshots, currentMessageNumber]
  );

  // Generate 10x10 grid cells
  const gridCells = useMemo(() => {
    const cells: { x: number; y: number }[] = [];
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        cells.push({ x, y });
      }
    }
    return cells;
  }, []);

  // Characters from current grid snapshot with avatar fallback
  const characters = useMemo(() => {
    const positions = currentGrid?.characterPositions || [];
    // Use current avatars as fallback if snapshot doesn't have them
    if (characterAvatars) {
      return positions.map((char) => ({
        ...char,
        avatarBase64: char.avatarBase64 || characterAvatars[char.characterId],
      }));
    }
    return positions;
  }, [currentGrid, characterAvatars]);

  // Elements from current grid snapshot
  const elements = useMemo(() => {
    return currentGrid?.elements || [];
  }, [currentGrid]);

  // Handle element click - show popup
  const handleElementClick = (element: GridElement) => {
    setSelectedElement(element);
  };

  // Close popup
  const closePopup = () => {
    setSelectedElement(null);
  };

  const gridWrapperRef = useRef<HTMLDivElement | null>(null);
  const [gridSize, setGridSize] = useState<number>(0);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const node = gridWrapperRef.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setGridSize(Math.min(width, height));
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const computedGridSize = gridSize > 0 ? `${gridSize}px` : '100%';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        perspective: '1000px',
        position: 'relative',
      }}
    >
      {/* Flip container */}
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Back face - The Map Grid */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            backgroundColor: colors.background,
            borderRadius: '8px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Map Header */}
          <div
            style={{
              padding: '12px',
              borderBottom: `1px solid ${colors.border}`,
              backgroundColor: colors.backgroundSecondary,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: colors.text,
                  }}
                >
                  {t.mapTitle || 'Map'}
                </h3>
                {(locationName || currentGrid?.locationName) && (
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: '12px',
                      color: colors.textSecondary,
                    }}
                  >
                    {locationName || currentGrid?.locationName}
                  </p>
                )}
              </div>
              <button
                onClick={onToggleFlip}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  backgroundColor: colors.buttonSecondary,
                  color: colors.buttonSecondaryText,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {t.backToCard || 'Back'}
              </button>
            </div>
          </div>

          {/* Grid Container */}
          <div
            ref={gridWrapperRef}
            style={{
              flex: 1,
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              backgroundImage: locationBackgroundImage ? `url(${locationBackgroundImage})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {currentGrid ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(10, 1fr)',
                  gridTemplateRows: 'repeat(10, 1fr)',
                  gap: '1px',
                  width: computedGridSize,
                  height: computedGridSize,
                  maxWidth: '100%',
                  maxHeight: '100%',
                  aspectRatio: gridSize > 0 ? undefined : '1',
                  backgroundColor: 'transparent',
                  border: `2px solid ${colors.borderStrong}`,
                  borderRadius: '4px',
                  overflow: 'hidden',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {gridCells.map(({ x, y }) => (
                  <GridCell
                    key={`${x}-${y}`}
                    x={x}
                    y={y}
                    characters={characters}
                    elements={elements}
                    colors={colors}
                    onElementClick={handleElementClick}
                  />
                ))}
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  color: colors.textSecondary,
                  padding: '20px',
                }}
              >
                <p style={{ margin: 0 }}>{t.noMapData || 'No map data available'}</p>
              </div>
            )}
          </div>

          {/* Legend */}
          {currentGrid && (characters.length > 0 || elements.length > 0) && (
            <div
              style={{
                padding: '8px 12px',
                borderTop: `1px solid ${colors.border}`,
                backgroundColor: colors.backgroundSecondary,
                maxHeight: '120px',
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  fontSize: '11px',
                }}
              >
                {/* Characters */}
                {characters.map((char) => {
                  const avatarSrc = getAvatarSrc(char.avatarBase64);
                  return (
                    <div
                      key={char.characterId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 6px',
                        backgroundColor: char.isPlayer
                          ? colors.buttonPrimary
                          : colors.backgroundAccent,
                        color: char.isPlayer
                          ? colors.buttonPrimaryText
                          : colors.text,
                        borderRadius: '4px',
                      }}
                    >
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt=""
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            backgroundColor: char.isPlayer
                              ? colors.buttonPrimaryText
                              : colors.textSecondary,
                            color: char.isPlayer
                              ? colors.buttonPrimary
                              : colors.backgroundSecondary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 'bold',
                          }}
                        >
                          {char.characterName.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span>{char.characterName}</span>
                      <span style={{ opacity: 0.6 }}>
                        ({char.position.x}, {char.position.y})
                      </span>
                    </div>
                  );
                })}
                {/* Elements */}
                {elements.map((elem) => (
                  <div
                    key={elem.id}
                    onClick={() => handleElementClick(elem)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 6px',
                      backgroundColor: `${colors.warning}33`,
                      color: colors.text,
                      borderRadius: '4px',
                      border: `1px solid ${colors.warning}`,
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: colors.warning,
                      }}
                    >
                      {elem.symbol}
                    </span>
                    <span>{elem.name}</span>
                    <span style={{ opacity: 0.6 }}>
                      ({elem.position.x}, {elem.position.y})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Element Popup */}
          {selectedElement && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
              }}
              onClick={closePopup}
            >
              <div
                style={{
                  backgroundColor: colors.background,
                  border: `2px solid ${colors.warning}`,
                  borderRadius: '8px',
                  padding: '16px',
                  maxWidth: '280px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                  }}
                >
                  <span
                    style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      fontWeight: 'bold',
                      color: colors.warning,
                      backgroundColor: `${colors.warning}22`,
                      borderRadius: '4px',
                    }}
                  >
                    {selectedElement.symbol}
                  </span>
                  <div>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: colors.text,
                      }}
                    >
                      {selectedElement.name}
                    </h4>
                    <span
                      style={{
                        fontSize: '11px',
                        color: colors.textSecondary,
                      }}
                    >
                      ({selectedElement.position.x}, {selectedElement.position.y})
                    </span>
                  </div>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: colors.textSecondary,
                    lineHeight: '1.4',
                  }}
                >
                  {selectedElement.description}
                </p>
                <button
                  onClick={closePopup}
                  style={{
                    marginTop: '12px',
                    width: '100%',
                    padding: '8px',
                    backgroundColor: colors.buttonSecondary,
                    color: colors.buttonSecondaryText,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  {t.close || 'Close'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GridMap;
