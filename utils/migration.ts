/**
 * @fileoverview Game State Migration Utilities
 *
 * This module handles migration of legacy game saves to the new format:
 * - Converts string[] inventory to Item[]
 * - Ensures CharacterStats has required 'gold' field
 * - Validates and normalizes game state structure
 *
 * @module utils/migration
 */

import type { GameState, Character, CharacterStats, Item } from '../types';
import { DEFAULT_PLAYER_STATS, getStartingGold } from '../constants/economy';
import {
  migrateInventory,
  needsInventoryMigration,
  isLegacyInventory,
} from './inventory';

/**
 * Migration result with details about what was migrated.
 */
export interface MigrationResult {
  /** Whether any migration was performed */
  migrated: boolean;
  /** Details about what was changed */
  changes: string[];
  /** The migrated game state */
  gameState: GameState;
}

/**
 * Check if a game state needs migration.
 * @param gameState - Game state to check
 * @returns True if migration is needed
 */
export function needsMigration(gameState: GameState): boolean {
  // Check if any character has legacy inventory
  for (const character of Object.values(gameState.characters)) {
    if (needsInventoryMigration(character)) {
      return true;
    }
  }

  // Check if player character is missing gold in stats
  const player = gameState.characters[gameState.playerCharacterId];
  if (player && typeof player.stats.gold !== 'number') {
    return true;
  }

  return false;
}

/**
 * Migrate character stats to ensure required fields.
 * @param stats - Current stats
 * @param isPlayer - Whether this is the player character
 * @param universeName - Universe name for starting gold calculation
 * @returns Migrated stats
 */
export function migrateCharacterStats(
  stats: Record<string, number>,
  isPlayer: boolean,
  universeName?: string
): CharacterStats {
  const migrated: CharacterStats = {
    hp: stats.hp ?? DEFAULT_PLAYER_STATS.hp,
    maxHp: stats.maxHp ?? DEFAULT_PLAYER_STATS.maxHp,
    gold: stats.gold ?? (isPlayer
      ? (universeName ? getStartingGold(universeName) : DEFAULT_PLAYER_STATS.gold)
      : 0),
    ...stats,
  };

  return migrated;
}

/**
 * Migrate a single character to new format.
 * @param character - Character to migrate
 * @param isPlayer - Whether this is the player character
 * @param universeName - Universe name for starting gold
 * @returns Migrated character and list of changes
 */
export function migrateCharacter(
  character: Character,
  isPlayer: boolean,
  universeName?: string
): { character: Character; changes: string[] } {
  const changes: string[] = [];
  let migrated = { ...character };

  // Migrate inventory from string[] to Item[]
  if (needsInventoryMigration(character)) {
    const legacyCount = character.inventory.length;
    migrated.inventory = migrateInventory(character.inventory as unknown as string[]) as unknown as string[];
    changes.push(`${character.name}: Migrated ${legacyCount} inventory items to Item format`);
  }

  // Migrate stats to ensure gold exists
  if (typeof character.stats.gold !== 'number') {
    migrated.stats = migrateCharacterStats(character.stats, isPlayer, universeName);
    changes.push(`${character.name}: Added gold (${migrated.stats.gold}) to stats`);
  }

  return { character: migrated, changes };
}

/**
 * Migrate entire game state to new format.
 * This is the main migration function that should be called when loading games.
 *
 * @param gameState - Game state to migrate
 * @returns Migration result with migrated state
 *
 * @example
 * ```typescript
 * const loaded = await loadGameFromDB(gameId);
 * const { migrated, changes, gameState } = migrateGameState(loaded);
 *
 * if (migrated) {
 *   console.log('Game was migrated:', changes);
 *   await saveGameToDB(gameState); // Save migrated state
 * }
 * ```
 */
export function migrateGameState(gameState: GameState): MigrationResult {
  if (!needsMigration(gameState)) {
    return {
      migrated: false,
      changes: [],
      gameState,
    };
  }

  const changes: string[] = [];
  const migratedCharacters: Record<string, Character> = {};
  const universeName = gameState.config?.universeName;

  // Migrate all characters
  for (const [id, character] of Object.entries(gameState.characters)) {
    const isPlayer = id === gameState.playerCharacterId;
    const result = migrateCharacter(character, isPlayer, universeName);
    migratedCharacters[id] = result.character;
    changes.push(...result.changes);
  }

  return {
    migrated: true,
    changes,
    gameState: {
      ...gameState,
      characters: migratedCharacters,
    },
  };
}

/**
 * Process raw inventory data from AI response.
 * Handles various formats that AI might return.
 *
 * @param rawInventory - Raw inventory from AI
 * @returns Properly formatted inventory
 */
export function processRawInventory(rawInventory: unknown): Item[] | string[] {
  // Null/undefined - return empty
  if (!rawInventory) {
    return [];
  }

  // Already an array
  if (Array.isArray(rawInventory)) {
    // Check if it's already Item[]
    if (rawInventory.length > 0 && typeof rawInventory[0] === 'object' && rawInventory[0] !== null) {
      return rawInventory as Item[];
    }
    // Legacy string[]
    if (rawInventory.length > 0 && typeof rawInventory[0] === 'string') {
      return migrateInventory(rawInventory as string[]);
    }
    return [];
  }

  // Single string (AI might return just one item name)
  if (typeof rawInventory === 'string') {
    return migrateInventory([rawInventory]);
  }

  return [];
}

/**
 * Ensure player has valid starting stats.
 * Used when creating new games.
 *
 * @param universeName - Name of the universe
 * @returns Default player stats for the universe
 */
export function getDefaultPlayerStats(universeName: string): CharacterStats {
  return {
    hp: DEFAULT_PLAYER_STATS.hp,
    maxHp: DEFAULT_PLAYER_STATS.maxHp,
    gold: getStartingGold(universeName),
  };
}

/**
 * Validate game state structure integrity.
 * @param gameState - Game state to validate
 * @returns Validation errors (empty if valid)
 */
export function validateGameState(gameState: unknown): string[] {
  const errors: string[] = [];

  if (!gameState || typeof gameState !== 'object') {
    errors.push('Game state is not an object');
    return errors;
  }

  const state = gameState as Record<string, unknown>;

  if (!state.id) errors.push('Missing game ID');
  if (!state.playerCharacterId) errors.push('Missing player character ID');
  if (!state.currentLocationId) errors.push('Missing current location ID');
  if (!state.characters || typeof state.characters !== 'object') {
    errors.push('Missing or invalid characters');
  }
  if (!state.locations || typeof state.locations !== 'object') {
    errors.push('Missing or invalid locations');
  }
  if (!state.config || typeof state.config !== 'object') {
    errors.push('Missing or invalid config');
  }

  // Validate player character exists
  if (state.characters && state.playerCharacterId) {
    const chars = state.characters as Record<string, unknown>;
    if (!chars[state.playerCharacterId as string]) {
      errors.push('Player character not found in characters');
    }
  }

  // Validate current location exists
  if (state.locations && state.currentLocationId) {
    const locs = state.locations as Record<string, unknown>;
    if (!locs[state.currentLocationId as string]) {
      errors.push('Current location not found in locations');
    }
  }

  return errors;
}

/**
 * Safe game state loader with automatic migration.
 * Use this when loading games from storage.
 *
 * @param rawState - Raw state from storage
 * @returns Validated and migrated game state, or null if invalid
 */
export function loadAndMigrateGameState(rawState: unknown): GameState | null {
  const errors = validateGameState(rawState);

  if (errors.length > 0) {
    console.error('Invalid game state:', errors);
    return null;
  }

  const gameState = rawState as GameState;
  const { gameState: migrated } = migrateGameState(gameState);

  return migrated;
}
