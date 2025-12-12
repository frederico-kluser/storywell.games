/**
 * @fileoverview Inventory Utilities - Item Management and Validation
 *
 * This module provides comprehensive utilities for managing inventory:
 * - Type guards for Item vs legacy string inventories
 * - Inventory operations (add, remove, stack, find)
 * - Category detection with bilingual keywords
 * - Purchase/sale validation with gold checks
 * - Prompt formatting for AI context
 * - Migration from legacy string[] to Item[]
 *
 * @module utils/inventory
 */

import type { Item, ItemCategory, CharacterStats, Character } from '../types';
import { ECONOMY, calculateSellPrice, calculateBuyPrice, getPriceRange } from '../constants/economy';

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a value is an Item object.
 * @param item - Value to check
 * @returns True if item is a valid Item object
 */
export function isItem(item: unknown): item is Item {
  if (typeof item !== 'object' || item === null) return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.category === 'string'
  );
}

/**
 * Type guard to check if inventory is legacy string[] format.
 * @param inventory - Inventory to check
 * @returns True if inventory is string[]
 */
export function isLegacyInventory(inventory: unknown): inventory is string[] {
  if (!Array.isArray(inventory)) return false;
  if (inventory.length === 0) return false;
  return typeof inventory[0] === 'string';
}

/**
 * Type guard to check if inventory is modern Item[] format.
 * @param inventory - Inventory to check
 * @returns True if inventory is Item[]
 */
export function isItemInventory(inventory: unknown): inventory is Item[] {
  if (!Array.isArray(inventory)) return false;
  if (inventory.length === 0) return true; // Empty array is valid Item[]
  return isItem(inventory[0]);
}

// ============================================================================
// BILINGUAL CATEGORY DETECTION
// ============================================================================

/**
 * Keywords for detecting item categories in multiple languages.
 * Supports: English, Portuguese, Spanish
 */
const CATEGORY_KEYWORDS: Record<ItemCategory, string[]> = {
  consumable: [
    // English
    'potion', 'elixir', 'food', 'drink', 'herb', 'medicine', 'bandage',
    'ration', 'water', 'ale', 'wine', 'bread', 'meat', 'fruit', 'scroll',
    'antidote', 'tonic', 'salve', 'pill', 'injection', 'stim', 'medkit',
    // Portuguese
    'poção', 'pocao', 'elixir', 'comida', 'bebida', 'erva', 'remédio', 'remedio',
    'bandagem', 'ração', 'racao', 'água', 'agua', 'cerveja', 'vinho', 'pão', 'pao',
    'carne', 'fruta', 'pergaminho', 'antídoto', 'antidoto', 'tônico', 'tonico',
    'pomada', 'pílula', 'pilula', 'injeção', 'injecao', 'kit médico',
    // Spanish
    'poción', 'comida', 'bebida', 'hierba', 'medicina', 'vendaje',
    'ración', 'pan', 'pergamino', 'antídoto', 'ungüento', 'pastilla',
  ],
  weapon: [
    // English
    'sword', 'axe', 'bow', 'arrow', 'dagger', 'knife', 'spear', 'staff',
    'wand', 'mace', 'hammer', 'gun', 'pistol', 'rifle', 'laser', 'blade',
    'crossbow', 'bolt', 'club', 'whip', 'flail', 'halberd', 'scythe',
    'grenade', 'bomb', 'explosive', 'blaster', 'lightsaber', 'phaser',
    // Portuguese
    'espada', 'machado', 'arco', 'flecha', 'adaga', 'faca', 'lança', 'lanca',
    'cajado', 'varinha', 'maça', 'maca', 'martelo', 'arma', 'pistola',
    'fuzil', 'sabre', 'besta', 'virote', 'clava', 'chicote', 'foice',
    'granada', 'bomba', 'explosivo', 'sabre de luz',
    // Spanish
    'espada', 'hacha', 'arco', 'flecha', 'daga', 'cuchillo', 'lanza',
    'báculo', 'varita', 'maza', 'martillo', 'arma', 'ballesta', 'látigo',
  ],
  armor: [
    // English
    'armor', 'armour', 'shield', 'helmet', 'helm', 'boots', 'gloves',
    'gauntlets', 'breastplate', 'chainmail', 'leather', 'plate', 'robe',
    'cloak', 'cape', 'vest', 'jacket', 'suit', 'greaves', 'pauldron',
    'bracer', 'visor', 'mask', 'bodysuit',
    // Portuguese
    'armadura', 'escudo', 'elmo', 'capacete', 'botas', 'luvas',
    'manoplas', 'peitoral', 'cota de malha', 'couro', 'placa', 'manto',
    'capa', 'colete', 'jaqueta', 'traje', 'grevas', 'ombreiras',
    'braçadeiras', 'bracadeiras', 'visor', 'máscara', 'mascara',
    // Spanish
    'armadura', 'escudo', 'casco', 'yelmo', 'botas', 'guantes',
    'coraza', 'cota de malla', 'cuero', 'túnica', 'capa', 'chaleco',
  ],
  valuable: [
    // English
    'gold', 'silver', 'gem', 'jewel', 'diamond', 'ruby', 'emerald',
    'sapphire', 'pearl', 'coin', 'treasure', 'ring', 'amulet', 'necklace',
    'bracelet', 'crown', 'scepter', 'goblet', 'statue', 'artifact',
    'relic', 'crystal', 'orb', 'idol', 'tiara',
    // Portuguese
    'ouro', 'prata', 'gema', 'joia', 'jóia', 'diamante', 'rubi',
    'esmeralda', 'safira', 'pérola', 'perola', 'moeda', 'tesouro',
    'anel', 'amuleto', 'colar', 'pulseira', 'coroa', 'cetro',
    'cálice', 'calice', 'estátua', 'estatua', 'artefato', 'relíquia',
    'reliquia', 'cristal', 'orbe', 'ídolo', 'idolo', 'tiara',
    // Spanish
    'oro', 'plata', 'gema', 'joya', 'diamante', 'rubí', 'esmeralda',
    'zafiro', 'perla', 'moneda', 'tesoro', 'anillo', 'amuleto',
    'collar', 'pulsera', 'corona', 'cetro', 'cáliz', 'estatua',
  ],
  material: [
    // English
    'wood', 'stone', 'iron', 'steel', 'ore', 'ingot', 'cloth', 'leather',
    'bone', 'scale', 'feather', 'fur', 'hide', 'thread', 'rope', 'chain',
    'glass', 'oil', 'powder', 'dust', 'essence', 'component', 'reagent',
    // Portuguese
    'madeira', 'pedra', 'ferro', 'aço', 'aco', 'minério', 'minerio',
    'lingote', 'tecido', 'couro', 'osso', 'escama', 'pena', 'pele',
    'pelo', 'fio', 'corda', 'corrente', 'vidro', 'óleo', 'oleo',
    'pó', 'po', 'poeira', 'essência', 'essencia', 'componente', 'reagente',
    // Spanish
    'madera', 'piedra', 'hierro', 'acero', 'mineral', 'lingote',
    'tela', 'cuero', 'hueso', 'escama', 'pluma', 'piel', 'hilo',
    'cuerda', 'cadena', 'vidrio', 'aceite', 'polvo', 'esencia',
  ],
  quest: [
    // English
    'quest', 'key', 'letter', 'note', 'map', 'document', 'evidence',
    'token', 'emblem', 'seal', 'pass', 'ticket', 'invitation', 'contract',
    'deed', 'warrant', 'message', 'journal', 'diary', 'book', 'tome',
    // Portuguese
    'missão', 'missao', 'chave', 'carta', 'nota', 'mapa', 'documento',
    'evidência', 'evidencia', 'ficha', 'emblema', 'selo', 'passe',
    'ingresso', 'convite', 'contrato', 'escritura', 'mandado',
    'mensagem', 'diário', 'diario', 'livro', 'tomo', 'pergaminho antigo',
    // Spanish
    'misión', 'llave', 'carta', 'nota', 'mapa', 'documento',
    'evidencia', 'ficha', 'emblema', 'sello', 'pase', 'boleto',
    'invitación', 'contrato', 'escritura', 'mensaje', 'diario', 'libro',
  ],
  currency: [
    // English
    'coin', 'gold piece', 'silver piece', 'copper piece', 'credit',
    'dollar', 'euro', 'yen', 'peso', 'pound', 'crown', 'ducat',
    'sovereign', 'florin', 'penny', 'cent', 'bitcoin', 'crypto',
    // Portuguese
    'moeda', 'peça de ouro', 'peca de ouro', 'peça de prata', 'crédito',
    'credito', 'dólar', 'dolar', 'real', 'coroa', 'ducado', 'florim',
    // Spanish
    'moneda', 'pieza de oro', 'pieza de plata', 'crédito', 'dólar',
    'corona', 'ducado', 'florín',
  ],
  misc: [
    // English
    'torch', 'lantern', 'candle', 'rope', 'tool', 'kit', 'bag', 'sack',
    'backpack', 'container', 'box', 'chest', 'bottle', 'flask', 'vial',
    'mirror', 'compass', 'spyglass', 'telescope', 'trinket', 'toy',
    // Portuguese
    'tocha', 'lanterna', 'vela', 'corda', 'ferramenta', 'kit', 'bolsa',
    'saco', 'mochila', 'recipiente', 'caixa', 'baú', 'bau', 'garrafa',
    'frasco', 'espelho', 'bússola', 'bussola', 'luneta', 'telescópio',
    'bugiganga', 'brinquedo',
    // Spanish
    'antorcha', 'linterna', 'vela', 'cuerda', 'herramienta', 'bolsa',
    'saco', 'mochila', 'recipiente', 'caja', 'cofre', 'botella',
    'frasco', 'espejo', 'brújula', 'catalejo', 'baratija', 'juguete',
  ],
};

/**
 * Detect item category from name using bilingual keywords.
 * @param name - Item name to analyze
 * @returns Detected category or 'misc' as fallback
 */
export function detectItemCategory(name: string): ItemCategory {
  const lower = name.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return category as ItemCategory;
      }
    }
  }

  return 'misc';
}

// ============================================================================
// INVENTORY OPERATIONS
// ============================================================================

/**
 * Generate a unique ID for a new item.
 * @returns Unique item ID
 */
export function generateItemId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create a new Item from basic parameters.
 * @param name - Item name
 * @param options - Optional item properties
 * @returns New Item object
 */
export function createItem(
  name: string,
  options: Partial<Omit<Item, 'id' | 'name'>> = {}
): Item {
  const category = options.category || detectItemCategory(name);
  const priceRange = getPriceRange(category);
  const baseValue = options.baseValue ?? Math.round((priceRange.min + priceRange.max) / 2);

  return {
    id: generateItemId(),
    name,
    category,
    description: options.description || '',
    baseValue,
    quantity: options.quantity ?? 1,
    isStackable: options.isStackable ?? (category === 'consumable' || category === 'material'),
    effects: options.effects,
    isEquipped: options.isEquipped ?? false,
  };
}

/**
 * Find an item in inventory by ID.
 * @param inventory - Item array to search
 * @param itemId - ID to find
 * @returns Found item or undefined
 */
export function findItemById(inventory: Item[], itemId: string): Item | undefined {
  return inventory.find((item) => item.id === itemId);
}

/**
 * Find an item in inventory by name (case-insensitive).
 * @param inventory - Item array to search
 * @param name - Name to find
 * @returns Found item or undefined
 */
export function findItemByName(inventory: Item[], name: string): Item | undefined {
  const lower = name.toLowerCase();
  return inventory.find((item) => item.name.toLowerCase() === lower);
}

/**
 * Find all items in inventory by category.
 * @param inventory - Item array to search
 * @param category - Category to filter by
 * @returns Array of matching items
 */
export function findItemsByCategory(inventory: Item[], category: ItemCategory): Item[] {
  return inventory.filter((item) => item.category === category);
}

/**
 * Add an item to inventory, stacking if possible.
 * @param inventory - Current inventory
 * @param item - Item to add
 * @returns New inventory array
 */
export function addItemToInventory(inventory: Item[], item: Item): Item[] {
  // Try to stack with existing item
  if (item.isStackable) {
    const existingIndex = inventory.findIndex(
      (inv) => inv.name === item.name && inv.category === item.category && inv.isStackable
    );

    if (existingIndex !== -1) {
      const existing = inventory[existingIndex];
      const newQuantity = Math.min(
        (existing.quantity || 1) + (item.quantity || 1),
        ECONOMY.MAX_STACK_SIZE
      );

      const updated = [...inventory];
      updated[existingIndex] = { ...existing, quantity: newQuantity };
      return updated;
    }
  }

  // Add as new item
  return [...inventory, { ...item, id: item.id || generateItemId() }];
}

/**
 * Remove an item from inventory (or reduce quantity).
 * @param inventory - Current inventory
 * @param itemId - ID of item to remove
 * @param quantity - Amount to remove (default: all)
 * @returns New inventory array
 */
export function removeItemFromInventory(
  inventory: Item[],
  itemId: string,
  quantity: number = Infinity
): Item[] {
  const index = inventory.findIndex((item) => item.id === itemId);
  if (index === -1) return inventory;

  const item = inventory[index];
  const currentQty = item.quantity || 1;

  if (quantity >= currentQty) {
    // Remove entirely
    return inventory.filter((_, i) => i !== index);
  }

  // Reduce quantity
  const updated = [...inventory];
  updated[index] = { ...item, quantity: currentQty - quantity };
  return updated;
}

/**
 * Calculate total inventory value.
 * @param inventory - Item array to value
 * @returns Total base value of all items
 */
export function calculateInventoryValue(inventory: Item[]): number {
  return inventory.reduce((total, item) => {
    const qty = item.quantity || 1;
    const value = item.baseValue || 0;
    return total + qty * value;
  }, 0);
}

/**
 * Calculate total sell value of inventory.
 * @param inventory - Item array to value
 * @returns Total sell value (excluding quest items)
 */
export function calculateInventorySellValue(inventory: Item[]): number {
  return inventory.reduce((total, item) => {
    if (item.category === 'quest') return total;
    const qty = item.quantity || 1;
    const value = item.baseValue || 0;
    return total + qty * calculateSellPrice(value);
  }, 0);
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validation result with reason for failure.
 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validate if player can afford a purchase.
 * @param stats - Player stats with gold
 * @param item - Item to purchase
 * @param quantity - Amount to purchase
 * @returns Validation result
 */
export function validatePurchase(
  stats: CharacterStats,
  item: Item,
  quantity: number = 1
): ValidationResult {
  const totalCost = calculateBuyPrice(item.baseValue || 0) * quantity;

  if (stats.gold < totalCost) {
    return {
      valid: false,
      reason: `Not enough gold. Need ${totalCost}, have ${stats.gold}`,
    };
  }

  return { valid: true };
}

/**
 * Validate if player can sell an item.
 * @param inventory - Player inventory
 * @param itemId - ID of item to sell
 * @param quantity - Amount to sell
 * @returns Validation result
 */
export function validateSale(
  inventory: Item[],
  itemId: string,
  quantity: number = 1
): ValidationResult {
  const item = findItemById(inventory, itemId);

  if (!item) {
    return { valid: false, reason: 'Item not found in inventory' };
  }

  if (item.category === 'quest') {
    return { valid: false, reason: 'Quest items cannot be sold' };
  }

  const currentQty = item.quantity || 1;
  if (quantity > currentQty) {
    return {
      valid: false,
      reason: `Not enough items. Have ${currentQty}, trying to sell ${quantity}`,
    };
  }

  return { valid: true };
}

/**
 * Validate if player can use a consumable item.
 * @param inventory - Player inventory
 * @param itemId - ID of item to use
 * @returns Validation result with item if valid
 */
export function validateItemUse(
  inventory: Item[],
  itemId: string
): ValidationResult & { item?: Item } {
  const item = findItemById(inventory, itemId);

  if (!item) {
    return { valid: false, reason: 'Item not found in inventory' };
  }

  if (item.category !== 'consumable') {
    return { valid: false, reason: 'Only consumable items can be used this way' };
  }

  return { valid: true, item };
}

// ============================================================================
// PROMPT FORMATTING
// ============================================================================

/**
 * Format a single item for display.
 * @param item - Item to format
 * @returns Formatted string (e.g., "Health Potion x3")
 */
export function formatItem(item: Item): string {
  const qty = item.quantity && item.quantity > 1 ? ` x${item.quantity}` : '';
  return `${item.name}${qty}`;
}

/**
 * Format inventory as a simple comma-separated list.
 * @param inventory - Item array to format
 * @returns Formatted string (e.g., "Sword, Health Potion x3, Gold Ring")
 */
export function formatInventorySimple(inventory: Item[]): string {
  if (!inventory || inventory.length === 0) {
    return 'empty';
  }
  return inventory.map(formatItem).join(', ');
}

/**
 * Format inventory for AI prompt context.
 * @param inventory - Item array to format
 * @returns Formatted string for prompt
 */
export function formatInventoryForPrompt(inventory: Item[]): string {
  if (!inventory || inventory.length === 0) {
    return 'Inventory: empty';
  }

  const lines = inventory.map((item) => {
    const qty = item.quantity && item.quantity > 1 ? ` x${item.quantity}` : '';
    const value = item.baseValue ? ` (${item.baseValue}g)` : '';
    const equipped = item.isEquipped ? ' [EQUIPPED]' : '';
    return `  - ${item.name}${qty}${value} [${item.category}]${equipped}`;
  });

  return `Inventory:\n${lines.join('\n')}`;
}

/**
 * Format stats for AI prompt context.
 * @param stats - Character stats
 * @returns Formatted string for prompt
 */
export function formatStatsForPrompt(stats: CharacterStats | Record<string, number>): string {
  const entries = Object.entries(stats);
  if (entries.length === 0) return 'Stats: none';

  const formatted = entries.map(([key, value]) => `${key}: ${value}`).join(', ');
  return `Stats: ${formatted}`;
}

/**
 * Format NPCs with inventories for AI prompt context.
 * @param npcs - Array of NPC characters
 * @returns Formatted string for prompt
 */
export function formatNPCsForPrompt(npcs: Character[]): string {
  if (!npcs || npcs.length === 0) {
    return 'No NPCs present';
  }

  const lines = npcs.map((npc) => {
    let text = `- ${npc.name} (${npc.state}): ${npc.description}`;

    // Add inventory if present and it's Item[]
    if (npc.inventory && Array.isArray(npc.inventory) && npc.inventory.length > 0) {
      if (isItemInventory(npc.inventory)) {
        const items = npc.inventory
          .map((item) => {
            const qty = item.quantity && item.quantity > 1 ? ` x${item.quantity}` : '';
            return `${item.name}${qty}`;
          })
          .join(', ');
        text += `\n    Inventory: ${items}`;
      } else if (isLegacyInventory(npc.inventory)) {
        text += `\n    Inventory: ${npc.inventory.join(', ')}`;
      }
    }

    return text;
  });

  return lines.join('\n');
}

// ============================================================================
// MIGRATION UTILITIES
// ============================================================================

/**
 * Migrate a single legacy string item to Item object.
 * @param itemString - Legacy item string
 * @returns New Item object
 */
export function migrateInventoryItem(itemString: string): Item {
  const category = detectItemCategory(itemString);
  const priceRange = getPriceRange(category);

  return {
    id: generateItemId(),
    name: itemString,
    category,
    description: '',
    baseValue: Math.round((priceRange.min + priceRange.max) / 2),
    quantity: 1,
    isStackable: category === 'consumable' || category === 'material',
    isEquipped: false,
  };
}

/**
 * Migrate legacy string[] inventory to Item[].
 * @param inventory - Legacy or modern inventory
 * @returns Item array
 */
export function migrateInventory(inventory: string[] | Item[] | undefined): Item[] {
  if (!inventory || inventory.length === 0) {
    return [];
  }

  if (isItemInventory(inventory)) {
    return inventory;
  }

  if (isLegacyInventory(inventory)) {
    return inventory.map(migrateInventoryItem);
  }

  return [];
}

/**
 * Normalize inventory - ensures it's always Item[].
 * Handles mixed arrays and edge cases.
 * @param inventory - Any inventory format
 * @returns Normalized Item array
 */
export function normalizeInventory(inventory: unknown): Item[] {
  if (!inventory || !Array.isArray(inventory)) {
    return [];
  }

  return inventory.map((entry) => {
    if (isItem(entry)) {
      return entry;
    }
    if (typeof entry === 'string') {
      return migrateInventoryItem(entry);
    }
    // Unknown format - create placeholder
    return createItem('Unknown Item');
  });
}

/**
 * Check if a character needs inventory migration.
 * @param character - Character to check
 * @returns True if migration needed
 */
export function needsInventoryMigration(character: Character): boolean {
  if (!character.inventory || character.inventory.length === 0) {
    return false;
  }
  return isLegacyInventory(character.inventory);
}

/**
 * Process AI response inventory items.
 * Converts AI-generated item data to proper Item objects.
 * @param items - Raw item data from AI response
 * @returns Properly formatted Item array
 */
export function processAIInventoryResponse(items: unknown[]): Item[] {
  if (!items || !Array.isArray(items)) {
    return [];
  }

  return items.map((raw) => {
    // Already a proper Item
    if (isItem(raw)) {
      return {
        ...raw,
        id: raw.id || generateItemId(),
      };
    }

    // String item
    if (typeof raw === 'string') {
      return migrateInventoryItem(raw);
    }

    // Partial item object from AI
    if (typeof raw === 'object' && raw !== null) {
      const obj = raw as Record<string, unknown>;
      const name = String(obj.name || obj.itemName || 'Unknown Item');
      const category = (obj.category as ItemCategory) || detectItemCategory(name);

      return createItem(name, {
        category,
        description: obj.description as string,
        baseValue: typeof obj.baseValue === 'number' ? obj.baseValue : undefined,
        quantity: typeof obj.quantity === 'number' ? obj.quantity : 1,
        isStackable: typeof obj.isStackable === 'boolean' ? obj.isStackable : undefined,
        effects: obj.effects as Item['effects'],
      });
    }

    return createItem('Unknown Item');
  });
}
