/**
 * @fileoverview Prompt de Atualização do Grid - Sistema de Mapa 10x10
 *
 * Este módulo contém o prompt responsável por analisar as ações do jogo
 * e determinar as posições dos personagens e elementos no grid 10x10 do mapa.
 *
 * @module prompts/gridUpdate
 *
 * @description
 * O Grid Update Prompt é usado após cada ação do jogo para:
 *
 * - **Determinar posições** - Calcular onde cada personagem está no grid 10x10
 * - **Identificar elementos** - Detectar objetos/elementos mencionados na cena (portas, baús, etc.)
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

import { GameState, Language, GMResponseMessage, GridCharacterPosition, GridElement } from '../../../types';
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
  /** Current grid elements (if any exist) */
  currentElements?: GridElement[];
  /** Language for the prompt */
  language: Language;
}

/**
 * Builds the prompt for updating character positions and scene elements on the 10x10 grid map.
 *
 * The AI should analyze the recent action and determine if character positions
 * and scene elements should be updated based on:
 * - Physical movement mentioned in narration
 * - Characters approaching or moving away from each other
 * - Environmental context changes
 * - Combat positioning
 * - New elements/objects mentioned in the scene
 *
 * @param params - Parameters for the prompt
 * @returns The formatted prompt string
 */
export function buildGridUpdatePrompt({
  gameState,
  recentMessages,
  eventLog,
  currentGridPositions,
  currentElements,
  language,
}: GridUpdatePromptParams): string {
  const langName = getLanguageName(language);
  const currentLocation = gameState.locations[gameState.currentLocationId];

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

  // Format current elements if they exist
  let currentElementsText = 'No elements recorded yet.';
  if (currentElements && currentElements.length > 0) {
    currentElementsText = currentElements
      .map((e) => `- [${e.symbol}] ${e.name}: (${e.position.x}, ${e.position.y}) - ${e.description}`)
      .join('\n');
  }

  // Format characters at location
  const charactersText = charactersAtLocation
    .map((c) => `- ${c.name} (ID: ${c.id})${c.isPlayer ? ' [PLAYER]' : ''}: ${c.description.substring(0, 100)}...`)
    .join('\n');

  return `
You are a spatial positioning analyzer for an RPG game.
Your task is to determine the positions of characters AND scene elements on a 10x10 grid map.

=== CURRENT CONTEXT ===
Location: ${currentLocation?.name || 'Unknown'}
Description: ${currentLocation?.description || 'No description'}
Language: ${langName}

=== CHARACTERS AT THIS LOCATION ===
${charactersText}

=== CURRENT GRID STATE ===
**Character Positions:**
${currentPositionsText}

**Scene Elements:**
${currentElementsText}

=== WHAT JUST HAPPENED ===
${eventLog ? `Event Summary: ${eventLog}\n` : ''}
Recent messages:
${messagesContext}

=== YOUR TASK ===
Analyze the recent events and determine if anything CHANGED on the grid.

**CRITICAL: DELTA-ONLY RESPONSE**
You must return ONLY the items that CHANGED. DO NOT return the entire grid state.
- If a character moved from (3,3) to (5,5), return ONLY that character with the NEW position.
- If an element was added, return ONLY that new element.
- If an element was removed/destroyed, add its symbol to "removedElements".
- If nothing changed, set shouldUpdate to false.

This approach prevents hallucination and reduces token usage.

**GRID RULES:**
- The grid is 10x10 (coordinates 0-9 for both x and y)
- x=0 is left, x=9 is right
- y=0 is top, y=9 is bottom
- Characters can occupy the same cell (they're in conversation range)
- Elements should NOT overlap with each other (but characters can be on the same cell as elements)
- Movement should be gradual (usually 1-3 cells per action)

**WHEN TO UPDATE CHARACTERS:**
- Character explicitly moves (walks, runs, approaches, retreats, etc.)
- Combat positioning changes
- New character enters the scene (needs initial position)
- Location change (all positions reset)

**WHEN TO UPDATE ELEMENTS:**
- New important object/feature is mentioned in the scene (door, chest, table, tree, lever, etc.)
- An element is destroyed, moved, or removed from the scene
- Location change (elements should reflect the new location)

**WHEN NOT TO UPDATE:**
- Only dialogue happens with no movement or scene changes
- Action doesn't involve physical displacement or environment interaction
- Positions and elements are already correct

**ELEMENT RULES:**
- Each element needs a SINGLE CAPITAL LETTER symbol (A-Z)
- Use intuitive letters when possible: D for Door, C for Chest, T for Table/Tree, W for Well, etc.
- If the letter is taken, use another unique letter
- Elements should have a short name and a description for the popup
- Only include elements that are IMPORTANT to the scene (interactable, mentioned, relevant)
- Do NOT include trivial background items that aren't relevant to gameplay

**CHARACTER OUTPUT RULES (DELTA ONLY):**
- Return ONLY characters whose position CHANGED
- Do NOT include characters that stayed in the same place
- For new characters entering the scene, include them with their initial position
- Always set isPlayer=true for the player character

**ELEMENT OUTPUT RULES (DELTA ONLY):**
- Return ONLY new elements or elements that MOVED
- Use "removedElements" array to list symbols of elements that were destroyed/removed
- Do NOT repeat elements that haven't changed

**POSITIONING GUIDELINES:**
- Player character should generally be near the center (around 4-5, 4-5) initially
- NPCs in conversation should be within 1-2 cells of each other
- Hostile NPCs might be further away (3-5 cells)
- Place elements logically: doors near edges, tables/furniture toward center, etc.

Respond with a JSON object following the schema.
If no update is needed, set shouldUpdate to false and return empty arrays.
If positions OR elements changed, set shouldUpdate to true and include ONLY the changed data.
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
      description: 'Whether the grid should be updated based on recent events',
    },
    characterPositions: {
      type: 'array',
      description: 'DELTA ONLY: Array of characters whose positions CHANGED. Only include characters that moved, not all characters.',
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
            description: 'NEW X coordinate on the grid (0-9, left to right)',
          },
          y: {
            type: 'number',
            minimum: 0,
            maximum: 9,
            description: 'NEW Y coordinate on the grid (0-9, top to bottom)',
          },
          isPlayer: {
            type: 'boolean',
            description: 'Whether this is the player character',
          },
        },
        required: ['characterId', 'characterName', 'x', 'y', 'isPlayer'],
      },
    },
    elements: {
      type: 'array',
      description: 'DELTA ONLY: Array of NEW or MOVED elements. Only include elements that were added or changed position.',
      items: {
        type: 'object',
        properties: {
          symbol: {
            type: 'string',
            pattern: '^[A-Z]$',
            description: 'Single capital letter (A-Z) to display on grid',
          },
          name: {
            type: 'string',
            description: 'Short name of the element (e.g., "Oak Door", "Treasure Chest")',
          },
          description: {
            type: 'string',
            description: 'Description shown in popup when clicked',
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
        },
        required: ['symbol', 'name', 'description', 'x', 'y'],
      },
    },
    removedElements: {
      type: 'array',
      description: 'Array of element symbols (A-Z) that were destroyed or removed from the scene',
      items: {
        type: 'string',
        pattern: '^[A-Z]$',
        description: 'Symbol of the element to remove',
      },
    },
    reasoning: {
      type: 'string',
      description: 'Brief explanation of what changed (e.g., "Player moved north", "Chest D was opened and removed")',
    },
  },
  required: ['shouldUpdate'],
};

/**
 * Response type from the grid update prompt.
 * Note: This is a DELTA response - only contains items that CHANGED.
 */
export interface GridUpdateResponse {
  shouldUpdate: boolean;
  /** Characters whose positions CHANGED (delta only) */
  characterPositions?: {
    characterId: string;
    characterName: string;
    x: number;
    y: number;
    isPlayer: boolean;
  }[];
  /** NEW or MOVED elements (delta only) */
  elements?: {
    symbol: string;
    name: string;
    description: string;
    x: number;
    y: number;
  }[];
  /** Symbols of elements that were REMOVED from the scene */
  removedElements?: string[];
  reasoning?: string;
}
