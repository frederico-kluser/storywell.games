
export type Language = 'en' | 'pt' | 'es' | 'fr' | 'ru' | 'zh';

export enum MessageType {
  NARRATION = 'NARRATION',
  DIALOGUE = 'DIALOGUE',
  SYSTEM = 'SYSTEM',
}

// ============================================================================
// ITEM & CURRENCY SYSTEM
// ============================================================================

/**
 * Category of an item - affects pricing, AI behavior, and mechanics.
 */
export type ItemCategory =
  | 'weapon'      // Weapons - swords, bows, staffs, etc.
  | 'armor'       // Armor and protection gear
  | 'consumable'  // Potions, food, scrolls - removed on use
  | 'material'    // Crafting materials
  | 'quest'       // Quest items - cannot be sold
  | 'valuable'    // Jewelry, gems, treasures - high value
  | 'currency'    // Money items (gold coins, gems used as currency)
  | 'misc';       // Miscellaneous items

/**
 * Effect that an item has when used (for consumables).
 */
export interface ItemEffect {
  /** Stat to affect (e.g., 'hp', 'mana', 'strength') */
  stat: string;
  /** Value change (+50 HP, -10 mana, etc.) */
  value: number;
  /** Optional duration in turns for buffs/debuffs */
  duration?: number;
}

/**
 * Represents an item in inventory with full metadata.
 * Replaces the old string[] inventory system.
 */
export interface Item {
  /** Unique name for identification */
  name: string;

  /** Short description for display (AI-generated) */
  description?: string;

  /** Quantity of this item (default: 1) */
  quantity: number;

  /** Category affects pricing and mechanics */
  category: ItemCategory;

  /** Base value in gold for buy/sell */
  baseValue?: number;

  /** Whether identical items can stack */
  stackable: boolean;

  /** Whether item is consumed on use */
  consumable: boolean;

  /** Effects when used (for consumables) */
  effects?: ItemEffect[];

  /** Whether item can be sold (quest items = false) */
  canSell?: boolean;

  /** Whether item can be dropped */
  canDrop?: boolean;
}

/**
 * Legacy inventory format for backwards compatibility.
 * New code should use Item[], but string[] is still supported for migration.
 */
export type LegacyInventory = string[];

/**
 * Character stats with required gold field.
 * Gold is the primary currency in all universes.
 */
export interface CharacterStats {
  hp: number;
  maxHp: number;
  gold: number;
  [key: string]: number;
}

export interface Character {
  id: string;
  gameId?: string; // Foreign Key for IndexedDB
  name: string;
  description: string;
  isPlayer: boolean;
  locationId: string;
  stats: CharacterStats; // Now typed with required gold, hp, maxHp
  inventory: Item[]; // Structured item list with metadata (legacy string[] auto-migrated)
  relationships: Record<string, number>; // CharacterID -> 0-100 (Affinity)
  state: 'idle' | 'talking' | 'fighting' | 'unconscious' | 'dead';
  avatarColor?: string; // Fallback Hex code
  avatarBase64?: string; // Generated Image Data (stored in IndexedDB)
  avatarUrl?: string; // Generated Image URL from DALL-E (legacy, for backwards compatibility)
}

export interface Location {
  id: string;
  gameId?: string; // Foreign Key for IndexedDB
  name: string;
  description: string;
  connectedLocationIds: string[];
  /** Base64 background image for immersive chat experience */
  backgroundImage?: string;
}

export interface GameEvent {
  id: string;
  gameId?: string; // Foreign Key for IndexedDB
  turn: number;
  description: string;
  importance: 'low' | 'medium' | 'high';
}

export interface ChatMessage {
  id: string;
  gameId?: string; // Foreign Key for IndexedDB
  senderId: string; // 'GM', 'SYSTEM', or CharacterID
  text: string;
  type: MessageType;
  timestamp: number;
  pageNumber: number;
  voiceTone?: string; // Emotional tone for TTS (e.g., 'excited', 'mysterious', 'angry', 'sad', 'neutral')
}

/**
 * Gêneros narrativos suportados com convenções específicas.
 */
export type NarrativeGenre =
  | 'epic_fantasy'      // Tolkien-style: dicção arcaica, estrutura paratática
  | 'dark_fantasy'      // Grimdark: violência gráfica, moralidade cinza
  | 'sword_sorcery'     // Howard-style: prosa dinâmica, ação poética
  | 'cosmic_horror'     // Lovecraft-style: narrador não confiável, pavor crescente
  | 'noir'              // Hardboiled: cinismo, símiles inesperados
  | 'sci_fi_space'      // Space opera: terminologia técnica, escala épica
  | 'cyberpunk'         // Dystopia tecnológica: jargão de rua, alta tecnologia
  | 'steampunk'         // Era vitoriana com tecnologia: formalidade, gadgets
  | 'post_apocalyptic'  // Sobrevivência: escassez, desconfiança
  | 'mystery'           // Detetive: pistas, red herrings, revelação gradual
  | 'romance'           // Foco em relacionamentos: tensão emocional
  | 'comedy'            // Humor: timing, subversão de expectativas
  | 'historical'        // Época específica: precisão cultural
  | 'superhero'         // Ação heróica: dilemas morais, poderes
  | 'slice_of_life';    // Cotidiano: momentos pequenos, realismo

export type NarrativeStyleMode = 'auto' | 'custom';

export interface GameConfig {
  universeType: 'original' | 'existing';
  universeName: string;
  combatStyle: 'descriptive' | 'tactical';
  dialogueHeavy: boolean;
  language: Language; // The language the story is generated in
  /** Gênero narrativo para aplicar convenções de estilo específicas */
  genre?: NarrativeGenre;
  /**
   * Visual style reference for avatar generation.
   * Contains a reference to an existing artwork, movie, game, or artist style
   * that will be used as the visual foundation for all character avatars.
   * Example: "Studio Ghibli", "Dark Souls concept art", "Akira Toriyama style"
   */
  visualStyle?: string;
  /** Strategy used to define the narrative tone (auto vs custom) */
  narrativeStyleMode?: NarrativeStyleMode;
  /** Player-provided narrative style instructions when using custom mode */
  customNarrativeStyle?: string;
}

// The "Hydrated" Game State used by the React App (Runtime View Model)
export interface GameState {
  id: string;
  title: string;
  turnCount: number;
  lastPlayed: number;
  config: GameConfig;

  // Runtime collections (Constructed from Relational DB tables on load)
  characters: Record<string, Character>;
  locations: Record<string, Location>;
  messages: ChatMessage[];
  events: GameEvent[];

  // Current Context Pointers
  playerCharacterId: string;
  currentLocationId: string;

  // Heavy Context - Persistent narrative context updated after each action
  heavyContext?: HeavyContext;

  // Universe Context - Deep narrative context generated at universe creation
  // Contains: communication style, slang, currency, cultural elements, etc.
  universeContext?: string;

  // Theme Colors - AI-generated color palette based on universe context
  // Falls back to DEFAULT_THEME_COLORS when not set
  themeColors?: ThemeColors;

  // Viewed Cards - Track message IDs that have been displayed with typewriter effect
  // Cards in this list will show text instantly without animation on subsequent views
  viewedCards?: string[];

  // Grid Map Snapshots - Historical grid positions associated with message numbers
  // Each snapshot captures character positions at a specific point in the story
  gridSnapshots?: GridSnapshot[];
}

/**
 * Dados de um novo personagem a ser criado durante a resposta.
 * Usado quando um NPC fala pela primeira vez e ainda não existe no jogo.
 * Supports both legacy string[] inventory and new Item[] format.
 */
export interface NewCharacterData {
  id: string;
  name: string;
  description: string;
  locationId: string;
  state: 'idle' | 'talking' | 'fighting' | 'unconscious' | 'dead';
  /** Inventory - accepts Item[] (new) or string[] (legacy, auto-migrated) */
  inventory?: Item[] | string[];
  /** Stats as key-value pairs from AI response */
  stats?: { key: string; value: number }[];
}

/**
 * Mensagem de resposta do Game Master.
 * Pode ser uma narração, diálogo de personagem ou mensagem de sistema.
 *
 * Para diálogos de personagens:
 * - Se o personagem já existe: apenas characterName e dialogue
 * - Se é um personagem NOVO: inclui newCharacterData com os dados para criação
 */
export interface GMResponseMessage {
  /** Tipo de mensagem: narração do GM, diálogo de personagem, ou sistema */
  type: 'narration' | 'dialogue' | 'system';

  /** Tom emocional para TTS (e.g., 'excited', 'mysterious', 'angry') */
  voiceTone?: string;

  // --- Para narrações e mensagens de sistema ---
  /** Texto da narração ou mensagem de sistema (usado quando type !== 'dialogue') */
  text?: string;

  // --- Para diálogos de personagens ---
  /** Nome do personagem que está falando (usado quando type === 'dialogue') */
  characterName?: string;

  /** Texto do diálogo do personagem (usado quando type === 'dialogue') */
  dialogue?: string;

  /** Dados do personagem se for um NPC NOVO que ainda não existe no jogo */
  newCharacterData?: NewCharacterData;
}

export interface GMResponse {
  /** Array de balões/mensagens para exibir na UI */
  messages: GMResponseMessage[];
  stateUpdates: {
    newLocations?: Location[];
    newCharacters?: Character[];
    updatedCharacters?: Partial<Character>[]; // Must include ID
    locationChange?: string; // New Location ID for player
    eventLog?: string; // Short summary of what happened this turn
  };
}

// Probability system for action options
export type FateEventType = 'good' | 'bad' | 'neutral';

export interface ActionOption {
  text: string;           // The action text
  goodChance: number;     // Probability (0-100) of something good happening
  badChance: number;      // Probability (0-100) of something bad happening
  goodHint?: string;      // Brief hint about what good thing could happen
  badHint?: string;       // Brief hint about what bad thing could happen
}

export interface FateResult {
  type: FateEventType;    // What happened: good, bad, or neutral
  hint?: string;          // The hint for the AI to use in story generation
}

/**
 * Heavy Context - Persistent narrative context that tracks:
 * - Current mission/objective
 * - Active problems/conflicts
 * - Current concerns/worries
 * - Important ongoing story elements
 *
 * This context is included in every decision-making prompt and updated after each action.
 */
export interface HeavyContext {
  mainMission?: string;         // Broad, long-term mission that can span arcs
  currentMission?: string;      // The player's current objective/quest
  activeProblems?: string[];    // Current problems, conflicts, or dangers
  currentConcerns?: string[];   // Worries, fears, or things to watch out for
  importantNotes?: string[];    // Other important ongoing story elements
  lastUpdated?: number;         // Timestamp of last update
}

// ============================================================================
// NARRATIVE QUALITY TYPES
// ============================================================================

/**
 * Níveis de intensidade narrativa que controlam o ritmo da história.
 */
export type PacingLevel = 'high_tension' | 'building' | 'moderate' | 'calm' | 'release';

/**
 * Estado de pacing/ritmo da cena atual.
 */
export interface PacingState {
  /** Nível atual de tensão */
  currentLevel: PacingLevel;
  /** Número de turnos neste nível */
  turnsAtLevel: number;
  /** Tendência: rising, falling, stable */
  trend: 'rising' | 'falling' | 'stable';
  /** Último clímax (turno) */
  lastClimax?: number;
  /** Último momento de respiro (turno) */
  lastBreather?: number;
}

/**
 * Sistema de foreshadowing e callbacks.
 */
export interface NarrativeThread {
  /** ID único da thread */
  id: string;
  /** Tipo: foreshadowing (plantado), callback (referência), chekhov (objeto) */
  type: 'foreshadowing' | 'callback' | 'chekhov_gun';
  /** Descrição do elemento plantado */
  description: string;
  /** Turno em que foi plantado */
  plantedTurn: number;
  /** Status: planted, referenced, resolved */
  status: 'planted' | 'referenced' | 'resolved';
  /** Turno em que foi resolvido (se aplicável) */
  resolvedTurn?: number;
  /** Importância: minor, moderate, major */
  importance: 'minor' | 'moderate' | 'major';
}

/**
 * Extended GameConfig with narrative settings.
 */
export interface NarrativeConfig {
  /** Gênero narrativo do universo */
  genre?: NarrativeGenre;
  /** Instruções personalizadas fornecidas pelo jogador */
  customNarrativeStyle?: string;
  /** Estratégia usada para definir o estilo narrativo */
  narrativeStyleMode?: NarrativeStyleMode;
  /** Estado atual do pacing */
  pacingState?: PacingState;
  /** Threads narrativas ativas */
  narrativeThreads?: NarrativeThread[];
}

// ============================================================================
// THEME COLORS SYSTEM
// ============================================================================

/**
 * Theme colors for the application UI.
 * Generated by AI based on the universe context or manually customized.
 * All colors should be valid CSS color values (hex, rgb, etc.)
 */
export interface ThemeColors {
  /** Primary background color (e.g., main page background) */
  background: string;
  /** Secondary background color (e.g., cards, modals) */
  backgroundSecondary: string;
  /** Accent background (e.g., highlighted sections) */
  backgroundAccent: string;

  /** Primary text color */
  text: string;
  /** Secondary/muted text color */
  textSecondary: string;
  /** Accent text color (e.g., links, highlights) */
  textAccent: string;

  /** Primary border color */
  border: string;
  /** Strong/emphasis border color */
  borderStrong: string;

  /** Primary button background */
  buttonPrimary: string;
  /** Primary button text */
  buttonPrimaryText: string;
  /** Secondary button background */
  buttonSecondary: string;
  /** Secondary button text */
  buttonSecondaryText: string;

  /** Success color (e.g., positive actions, luck) */
  success: string;
  /** Warning color (e.g., caution, medium risk) */
  warning: string;
  /** Danger/error color (e.g., errors, high risk) */
  danger: string;

  /** Shadow color for retro effects */
  shadow: string;

  /**
   * Theme font family name (Google Fonts family name).
   * Must match a font from the THEMED_FONTS registry in constants/fonts.ts.
   * Example: "VT323", "Press Start 2P", "Orbitron"
   */
  fontFamily?: string;
}

/**
 * Default theme colors matching the current site design.
 * Stone-based retro monochrome palette.
 */
export const DEFAULT_THEME_COLORS: ThemeColors = {
  background: '#f5f5f4',       // stone-100
  backgroundSecondary: '#ffffff',
  backgroundAccent: '#e7e5e4', // stone-200

  text: '#1c1917',             // stone-900
  textSecondary: '#78716c',    // stone-500
  textAccent: '#44403c',       // stone-700

  border: '#d6d3d1',           // stone-300
  borderStrong: '#1c1917',     // stone-900

  buttonPrimary: '#1c1917',    // stone-900
  buttonPrimaryText: '#ffffff',
  buttonSecondary: '#e7e5e4',  // stone-200
  buttonSecondaryText: '#1c1917',

  success: '#166534',          // green-800
  warning: '#d97706',          // amber-600
  danger: '#dc2626',           // red-600

  shadow: '#1c1917',           // stone-900

  fontFamily: 'VT323',         // Default retro terminal font
};

/**
 * Default font family (VT323 - retro terminal style)
 */
export const DEFAULT_FONT_FAMILY = 'VT323';

// ============================================================================
// GRID MAP SYSTEM
// ============================================================================

/**
 * Represents a position on the 10x10 grid map.
 * Coordinates range from 0-9 for both x and y.
 */
export interface GridPosition {
  /** X coordinate (0-9, left to right) */
  x: number;
  /** Y coordinate (0-9, top to bottom) */
  y: number;
}

/**
 * Represents a character's position on the grid.
 */
export interface GridCharacterPosition {
  /** Character ID */
  characterId: string;
  /** Character name for display */
  characterName: string;
  /** Grid position */
  position: GridPosition;
  /** Whether this is the player character */
  isPlayer: boolean;
  /** Avatar base64 for display on map */
  avatarBase64?: string;
}

/**
 * A snapshot of the grid state at a specific point in the story.
 * Each snapshot is associated with a message/card number.
 */
export interface GridSnapshot {
  /** Unique ID for this snapshot */
  id: string;
  /** Game ID this snapshot belongs to */
  gameId: string;
  /** The message pageNumber when this grid state was captured */
  atMessageNumber: number;
  /** Timestamp when this snapshot was created */
  timestamp: number;
  /** Location ID this grid represents */
  locationId: string;
  /** Location name for display */
  locationName: string;
  /** Array of character positions on the grid */
  characterPositions: GridCharacterPosition[];
}

/**
 * Response from the grid update prompt.
 */
export interface GridUpdateResponse {
  /** Whether the grid should be updated */
  shouldUpdate: boolean;
  /** Array of character positions if update is needed */
  characterPositions?: {
    characterId: string;
    characterName: string;
    x: number;
    y: number;
    isPlayer: boolean;
  }[];
  /** Brief explanation of why positions changed */
  reasoning?: string;
}
