/**
 * @fileoverview Economy Constants - Game Currency and Trading Rules
 *
 * This module defines the economic rules for the storywell.games RPG system.
 * It provides constants for:
 * - Price ranges by item category
 * - Buy/sell multipliers
 * - Starting gold by universe type
 * - Loot gold ranges by encounter difficulty
 *
 * @module constants/economy
 */

import type { ItemCategory } from '../types';

/**
 * Price range for an item category.
 */
export interface PriceRange {
  /** Minimum price in gold */
  min: number;
  /** Maximum price in gold */
  max: number;
}

/**
 * Economy rules and constants for the game.
 * Used by prompts to guide AI behavior and by code for validation.
 */
export const ECONOMY = {
  /**
   * Sell multiplier - players receive this percentage of base value when selling.
   * 0.5 = 50% of base value
   */
  SELL_MULTIPLIER: 0.5,

  /**
   * Buy multiplier - players pay this percentage of base value when buying.
   * 1.0 = 100% of base value (no markup from AI's assigned price)
   */
  BUY_MULTIPLIER: 1.0,

  /**
   * Price ranges by item category (in gold).
   * AI should assign baseValue within these ranges.
   */
  PRICE_RANGES: {
    consumable: { min: 5, max: 50 },
    weapon: { min: 20, max: 500 },
    armor: { min: 30, max: 600 },
    valuable: { min: 50, max: 1000 },
    material: { min: 1, max: 20 },
    quest: { min: 0, max: 0 }, // Quest items are not sellable
    currency: { min: 1, max: 1000 },
    misc: { min: 1, max: 50 },
  } as Record<ItemCategory, PriceRange>,

  /**
   * Starting gold by universe type.
   * AI uses these defaults when initializing player characters.
   */
  STARTING_GOLD: {
    fantasy: 50,
    medieval: 50,
    scifi: 100,
    modern: 200,
    horror: 30,
    postapocalyptic: 20,
    cyberpunk: 150,
    steampunk: 75,
    western: 40,
    default: 50,
  } as Record<string, number>,

  /**
   * Maximum items per stack for stackable items.
   */
  MAX_STACK_SIZE: 99,

  /**
   * Default inventory slot limit (soft limit).
   */
  DEFAULT_INVENTORY_LIMIT: 30,

  /**
   * Minimum gold value - gold should never go below this.
   */
  MIN_GOLD: 0,

  /**
   * Loot gold ranges by encounter difficulty.
   * Used when enemies drop gold.
   */
  LOOT_GOLD_RANGES: {
    trivial: { min: 1, max: 10 },
    easy: { min: 5, max: 25 },
    medium: { min: 15, max: 50 },
    hard: { min: 40, max: 100 },
    boss: { min: 100, max: 500 },
  } as const,
} as const;

/**
 * Default stats for new player characters.
 */
export const DEFAULT_PLAYER_STATS = {
  hp: 100,
  maxHp: 100,
  gold: 50,
};

/**
 * Get the price range for an item category.
 * @param category - The item category
 * @returns The price range for that category
 */
export function getPriceRange(category: ItemCategory): PriceRange {
  return ECONOMY.PRICE_RANGES[category] || ECONOMY.PRICE_RANGES.misc;
}

/**
 * Calculate sell price for an item.
 * @param baseValue - The item's base value
 * @returns The sell price (what player receives)
 */
export function calculateSellPrice(baseValue: number): number {
  return Math.floor(baseValue * ECONOMY.SELL_MULTIPLIER);
}

/**
 * Calculate buy price for an item.
 * @param baseValue - The item's base value
 * @returns The buy price (what player pays)
 */
export function calculateBuyPrice(baseValue: number): number {
  return Math.ceil(baseValue * ECONOMY.BUY_MULTIPLIER);
}

/**
 * Validate a price against category ranges.
 * @param price - The price to validate
 * @param category - The item category
 * @returns Object with isValid flag and suggested range
 */
export function validatePrice(
  price: number,
  category: ItemCategory
): { isValid: boolean; suggestedRange: PriceRange } {
  const range = ECONOMY.PRICE_RANGES[category];
  return {
    isValid: price >= range.min && price <= range.max,
    suggestedRange: range,
  };
}

/**
 * Get a random price within category range.
 * @param category - The item category
 * @param quality - Quality modifier (0-1, where 0.5 is average)
 * @returns A price within the valid range
 */
export function getRandomPriceInRange(category: ItemCategory, quality: number = 0.5): number {
  const range = ECONOMY.PRICE_RANGES[category];
  const spread = range.max - range.min;
  return Math.round(range.min + spread * Math.max(0, Math.min(1, quality)));
}

/**
 * Determine starting gold based on universe name/type.
 * Uses keyword matching to determine universe type.
 * @param universeName - The name of the universe
 * @returns Starting gold amount
 */
export function getStartingGold(universeName: string): number {
  const lower = universeName.toLowerCase();

  if (
    lower.includes('star wars') || lower.includes('star trek') ||
    lower.includes('sci-fi') || lower.includes('scifi') ||
    lower.includes('space') || lower.includes('future') ||
    lower.includes('alien')
  ) {
    return ECONOMY.STARTING_GOLD.scifi;
  }

  if (
    lower.includes('cyberpunk') || lower.includes('blade runner') ||
    lower.includes('neo') || lower.includes('neon')
  ) {
    return ECONOMY.STARTING_GOLD.cyberpunk;
  }

  if (
    lower.includes('steampunk') || lower.includes('victorian') ||
    lower.includes('clockwork')
  ) {
    return ECONOMY.STARTING_GOLD.steampunk;
  }

  if (
    lower.includes('horror') || lower.includes('lovecraft') ||
    lower.includes('cthulhu') || lower.includes('zombie') ||
    lower.includes('resident evil') || lower.includes('silent hill')
  ) {
    return ECONOMY.STARTING_GOLD.horror;
  }

  if (
    lower.includes('western') || lower.includes('cowboy') ||
    lower.includes('red dead')
  ) {
    return ECONOMY.STARTING_GOLD.western;
  }

  if (
    lower.includes('post-apocal') || lower.includes('postapocalyp') ||
    lower.includes('fallout') || lower.includes('wasteland')
  ) {
    return ECONOMY.STARTING_GOLD.postapocalyptic;
  }

  if (
    lower.includes('modern') || lower.includes('contemporary') ||
    lower.includes('real world') || lower.includes('gta') ||
    lower.includes('present day')
  ) {
    return ECONOMY.STARTING_GOLD.modern;
  }

  // Default to fantasy for most universes (D&D, LOTR, etc.)
  return ECONOMY.STARTING_GOLD.fantasy;
}

/**
 * Prevent gold from going negative.
 * @param gold - Current gold value
 * @returns Gold clamped to minimum
 */
export function clampGold(gold: number): number {
  return Math.max(ECONOMY.MIN_GOLD, Math.floor(gold));
}

/**
 * Check if a category is sellable.
 * @param category - The item category
 * @returns True if items of this category can be sold
 */
export function isCategorySellable(category: ItemCategory): boolean {
  return category !== 'quest';
}

/**
 * Format price ranges for inclusion in AI prompts.
 * @returns Formatted string with all price ranges
 */
export function formatPriceRangesForPrompt(): string {
  const ranges = ECONOMY.PRICE_RANGES;
  const lines = Object.entries(ranges)
    .filter(([category]) => category !== 'quest')
    .map(([category, range]) => `  - ${category}: ${range.min}-${range.max} gold`);

  return `PRICE RANGES BY CATEGORY:\n${lines.join('\n')}`;
}

/**
 * Format economy rules for inclusion in AI prompts.
 * @returns Formatted string with economy rules
 */
export function formatEconomyRulesForPrompt(): string {
  return `ECONOMY RULES:
- Sell price = ${ECONOMY.SELL_MULTIPLIER * 100}% of base value
- Buy price = ${ECONOMY.BUY_MULTIPLIER * 100}% of base value
- Quest items cannot be sold
- Gold minimum: ${ECONOMY.MIN_GOLD}
- Max stack size: ${ECONOMY.MAX_STACK_SIZE}

${formatPriceRangesForPrompt()}`;
}

/**
 * Get economy rules text for Game Master prompt.
 * More detailed version for the main game loop.
 */
export function getEconomyRulesForGMPrompt(): string {
  return `
=== ECONOMY & TRADING RULES (MANDATORY) ===

**CURRENCY:**
- The primary currency is GOLD (stored in stats.gold)
- All prices are in gold units

**PRICE RANGES BY CATEGORY:**
- Consumables (potions, food): ${ECONOMY.PRICE_RANGES.consumable.min}-${ECONOMY.PRICE_RANGES.consumable.max} gold
- Basic weapons: ${ECONOMY.PRICE_RANGES.weapon.min}-100 gold
- Rare weapons: 100-${ECONOMY.PRICE_RANGES.weapon.max} gold
- Basic armor: ${ECONOMY.PRICE_RANGES.armor.min}-150 gold
- Rare armor: 150-${ECONOMY.PRICE_RANGES.armor.max} gold
- Valuables (jewels, treasures): ${ECONOMY.PRICE_RANGES.valuable.min}-${ECONOMY.PRICE_RANGES.valuable.max} gold
- Materials: ${ECONOMY.PRICE_RANGES.material.min}-${ECONOMY.PRICE_RANGES.material.max} gold
- Quest items: CANNOT be bought or sold

**BUYING FROM NPCs:**
1. Verify the NPC has the item in their inventory
2. Determine price based on item category (use ranges above)
3. Check player's stats.gold >= price
4. If SUFFICIENT:
   - Deduct gold from player stats: { "key": "gold", "value": NEW_AMOUNT }
   - Add item to player inventory
   - Remove item from NPC inventory (or reduce quantity)
5. If INSUFFICIENT:
   - NPC refuses the sale
   - May suggest where to get gold or offer alternatives

**SELLING TO NPCs:**
1. Verify player has the item
2. NPCs buy at ${ECONOMY.SELL_MULTIPLIER * 100}% of base price
3. Quest items CANNOT be sold (warn player)
4. Add gold to player stats
5. Remove item from player inventory

**LOOTING & FINDING ITEMS:**
1. When player finds treasure, add items to inventory
2. Include baseValue for found items
3. For gold finds, add directly to stats.gold
4. Describe the find narratively

**USING CONSUMABLES:**
1. Verify item exists in inventory with category "consumable"
2. Apply effects to stats (e.g., +50 HP from healing potion)
3. Remove item from inventory (or reduce quantity if stacked)
4. Narrate the use and effects
`;
}

/**
 * Get item awareness rules for action options prompt.
 */
export function getItemAwarenessRulesForPrompt(): string {
  return `
**ITEM-AWARE ACTIONS (CRITICAL):**
- If player has CONSUMABLES (potions, food, scrolls) and is damaged/in danger,
  suggest using them (e.g., "Drink healing potion", "Use scroll of protection")
- If player has WEAPONS, suggest combat options when appropriate
- If player has VALUABLE items and there's a merchant, suggest selling
- If NPCs have items the player might want, suggest trading/buying
- Consider item quantities when suggesting

**ECONOMY-AWARE ACTIONS:**
- If merchant NPC is present, suggest "Browse merchant's wares" or similar
- If player has gold and NPC sells things, suggest purchasing options
- Consider player's gold amount when suggesting expensive actions
- If player is low on gold and has valuables, suggest selling

**ITEM HINTS FOR FATE:**
- goodHint for items: "find treasure", "discover gold coins", "gain useful item", "merchant offers discount"
- badHint for items: "lose item to trap", "item stolen", "equipment breaks", "pickpocketed"
`;
}
