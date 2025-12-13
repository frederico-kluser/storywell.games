/**
 * @fileoverview Prompt de Atualização do Grid - Sistema de Mapa 10x10
 *
 * Este módulo contém o prompt responsável por analisar as ações do jogo
 * e determinar as posições dos personagens no grid 10x10 do mapa.
 *
 * @module prompts/gridUpdate
 *
 * @description
 * O Grid Update Prompt é usado após cada ação do jogo para:
 *
 * - **Determinar posições** - Calcular onde cada personagem está no grid 10x10
 * - **Considerar movimento** - Analisar se a ação causou movimentação
 * - **Manter consistência** - Garantir que posições façam sentido na narrativa
 * - **Atualizar apenas quando necessário** - Só retornar update se houve mudança
 *
 * @example
 * ```typescript
 * import { buildGridUpdatePrompt } from './prompts/gridUpdate.prompt';
 *
 * const prompt = buildGridUpdatePrompt({
 *   gameState,
 *   recentMessages,
 *   language: 'pt'
 * });
 * ```
 */

import { GameState, Language, GMResponseMessage, GridCharacterPosition } from '../../../types';
import { getLanguageName } from '../../../i18n/locales';

/**
 * Parameters for building the grid update prompt.
 */
export interface GridUpdatePromptParams {
  /** Current game state */
  gameState: GameState;
  /** Recent messages from the last action (what just happened) */
  recentMessages: GMResponseMessage[];
  /** Event log summary from the GM response */
  eventLog?: string;
  /** Current grid positions (if any exist) */
  currentGridPositions?: GridCharacterPosition[];
  /** Language for the prompt */
  language: Language;
}

/**
 * Builds the prompt for updating character positions on the 10x10 grid map.
 *
 * The AI should analyze the recent action and determine if character positions
 * should be updated based on:
 * - Physical movement mentioned in narration
 * - Characters approaching or moving away from each other
 * - Environmental context changes
 * - Combat positioning
 *
 * @param params - Parameters for the prompt
 * @returns The formatted prompt string
 */
export function buildGridUpdatePrompt({
  gameState,
  recentMessages,
  eventLog,
  currentGridPositions,
  language,
}: GridUpdatePromptParams): string {
  const langName = getLanguageName(language);
  const currentLocation = gameState.locations[gameState.currentLocationId];
  const player = gameState.characters[gameState.playerCharacterId];

  // Get all characters at current location
  const charactersAtLocation = Object.values(gameState.characters).filter(
    (c) => c.locationId === gameState.currentLocationId
  );

  // Format recent messages for context
  const messagesContext = recentMessages
    .map((m) => {
      if (m.type === 'narration') {
        return `[Narration]: ${m.text}`;
      } else if (m.type === 'dialogue') {
        return `[${m.characterName}]: ${m.dialogue}`;
      } else {
        return `[System]: ${m.text}`;
      }
    })
    .join('\n');

  // Format current positions if they exist
  let currentPositionsText = 'No previous positions recorded (this is the initial placement).';
  if (currentGridPositions && currentGridPositions.length > 0) {
    currentPositionsText = currentGridPositions
      .map((p) => `- ${p.characterName}: (${p.position.x}, ${p.position.y})${p.isPlayer ? ' [PLAYER]' : ''}`)
      .join('\n');
  }

  // Format characters at location
  const charactersText = charactersAtLocation
    .map((c) => `- ${c.name} (ID: ${c.id})${c.isPlayer ? ' [PLAYER]' : ''}: ${c.description.substring(0, 100)}...`)
    .join('\n');

  return `
You are a spatial positioning analyzer for an RPG game.
Your task is to determine the positions of characters on a 10x10 grid map.

=== CURRENT CONTEXT ===
Location: ${currentLocation?.name || 'Unknown'}
Description: ${currentLocation?.description || 'No description'}
Language: ${langName}

=== CHARACTERS AT THIS LOCATION ===
${charactersText}

=== CURRENT GRID POSITIONS ===
${currentPositionsText}

=== WHAT JUST HAPPENED ===
${eventLog ? `Event Summary: ${eventLog}\n` : ''}
Recent messages:
${messagesContext}

=== YOUR TASK ===
Analyze the recent events and determine if character positions on the grid should be updated.

**GRID RULES:**
- The grid is 10x10 (coordinates 0-9 for both x and y)
- x=0 is left, x=9 is right
- y=0 is top, y=9 is bottom
- Characters can occupy the same cell (they're in conversation range)
- Movement should be gradual (usually 1-3 cells per action)
- Consider the narrative - if someone "approaches", they should move closer
- If someone "retreats" or "backs away", they should move away
- If there's no movement mentioned, positions should stay the same

**WHEN TO UPDATE:**
- Character explicitly moves (walks, runs, approaches, retreats, etc.)
- Combat positioning changes
- New character enters the scene (needs initial position)
- Location change (all positions reset)

**WHEN NOT TO UPDATE:**
- Only dialogue happens with no movement
- Action doesn't involve physical displacement
- Positions are already correct

**OUTPUT RULES (MANDATORY):**
- If shouldUpdate is true, return positions for every character at this location (player + all NPCs).
- Reuse previous coordinates for characters that did not move; never drop them from the grid.
- Always include the player entry and set isPlayer to true.
- Use the reasoning field to mention how notable NPCs are positioned relative to the player (e.g., "Maris stays two cells east of the player").

**POSITIONING GUIDELINES:**
- Player character should generally be near the center (around 4-5, 4-5) initially
- NPCs in conversation should be within 1-2 cells of each other
- Hostile NPCs might be further away (3-5 cells)
- Environmental features (doors, tables, etc.) can inform positioning

Respond with a JSON object following the schema.
If no update is needed, set shouldUpdate to false.
If positions should change, set shouldUpdate to true and include all character positions.
`;
}

/**
 * JSON Schema for the grid update response.
 */
export const gridUpdateSchema = {
  type: 'object',
  properties: {
    shouldUpdate: {
      type: 'boolean',
      description: 'Whether the grid positions should be updated based on recent events',
    },
    characterPositions: {
      type: 'array',
      description: 'Array of character positions. Required if shouldUpdate is true.',
      items: {
        type: 'object',
        properties: {
          characterId: {
            type: 'string',
            description: 'The unique ID of the character',
          },
          characterName: {
            type: 'string',
            description: 'The display name of the character',
          },
          x: {
            type: 'number',
            minimum: 0,
            maximum: 9,
            description: 'X coordinate on the grid (0-9, left to right)',
          },
          y: {
            type: 'number',
            minimum: 0,
            maximum: 9,
            description: 'Y coordinate on the grid (0-9, top to bottom)',
          },
          isPlayer: {
            type: 'boolean',
            description: 'Whether this is the player character',
          },
        },
        required: ['characterId', 'characterName', 'x', 'y', 'isPlayer'],
      },
    },
    reasoning: {
      type: 'string',
      description: 'Brief explanation of why positions changed or stayed the same',
    },
  },
  required: ['shouldUpdate'],
};

/**
 * Response type from the grid update prompt.
 */
export interface GridUpdateResponse {
  shouldUpdate: boolean;
  characterPositions?: {
    characterId: string;
    characterName: string;
    x: number;
    y: number;
    isPlayer: boolean;
  }[];
  reasoning?: string;
}
