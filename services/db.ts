
import { GameState, Character, Location, ChatMessage, GameEvent } from '../types';
import { sanitizeMessages } from '../utils/messages';

const DB_NAME = 'InfinitumRPG_Core';
const DB_VERSION = 2;
const EXPORT_VERSION = 1;

/**
 * Interface for exported game data with version info.
 */
export interface ExportedGameData {
  version: number;
  exportedAt: number;
  game: GameState;
} 

const STORES = {
  GAMES: 'games',
  CHARACTERS: 'characters',
  LOCATIONS: 'locations',
  MESSAGES: 'messages',
  EVENTS: 'events'
};

/**
 * Service for handling IndexedDB operations using the Data Mapper pattern.
 * Deconstructs the GameState tree into relational tables on save, 
 * and reconstructs the tree on load.
 */
export const dbService = {
  /**
   * Opens the IndexedDB connection and handles schema migrations.
   * @returns A promise resolving to the IDBDatabase instance.
   */
  open: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORES.GAMES)) {
          db.createObjectStore(STORES.GAMES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.CHARACTERS)) {
          const charStore = db.createObjectStore(STORES.CHARACTERS, { keyPath: 'id' });
          charStore.createIndex('by_game_id', 'gameId', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.LOCATIONS)) {
          const locStore = db.createObjectStore(STORES.LOCATIONS, { keyPath: 'id' });
          locStore.createIndex('by_game_id', 'gameId', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
          const msgStore = db.createObjectStore(STORES.MESSAGES, { keyPath: 'id' });
          msgStore.createIndex('by_game_id', 'gameId', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.EVENTS)) {
          const evtStore = db.createObjectStore(STORES.EVENTS, { keyPath: 'id' });
          evtStore.createIndex('by_game_id', 'gameId', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  },

  /**
   * Persists the GameState to IndexedDB.
   * Splits the object into normalized rows across multiple object stores in a single transaction.
   * @param gameState - The complete game state to save.
   */
  saveGame: async (gameState: GameState): Promise<void> => {
    const db = await dbService.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        [STORES.GAMES, STORES.CHARACTERS, STORES.LOCATIONS, STORES.MESSAGES, STORES.EVENTS], 
        'readwrite'
      );

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);

      const gameId = gameState.id;
      const sanitizedMessages = sanitizeMessages(gameState.messages || []);
      const { characters, locations, events, ...metaData } = gameState;
      tx.objectStore(STORES.GAMES).put(metaData);

      const charStore = tx.objectStore(STORES.CHARACTERS);
      Object.values(characters).forEach(char => {
        charStore.put({ ...char, gameId });
      });

      const locStore = tx.objectStore(STORES.LOCATIONS);
      Object.values(locations).forEach(loc => {
        locStore.put({ ...loc, gameId });
      });

      const msgStore = tx.objectStore(STORES.MESSAGES);
      sanitizedMessages.forEach(msg => {
        msgStore.put({ ...msg, gameId });
      });

      const evtStore = tx.objectStore(STORES.EVENTS);
      (events || []).forEach(evt => {
        evtStore.put({ ...evt, gameId });
      });
    });
  },

  /**
   * Loads a game by ID.
   * Reconstructs (hydrates) the GameState object by querying all related tables.
   * @param id - The ID of the game to load.
   * @returns The fully hydrated GameState or undefined if not found.
   */
  loadGame: async (id: string): Promise<GameState | undefined> => {
    const db = await dbService.open();
    return new Promise(async (resolve, reject) => {
      try {
        const tx = db.transaction(
            [STORES.GAMES, STORES.CHARACTERS, STORES.LOCATIONS, STORES.MESSAGES, STORES.EVENTS], 
            'readonly'
        );

        const getOne = (store: string, key: string) => new Promise<any>((res, rej) => {
            const req = tx.objectStore(store).get(key);
            req.onsuccess = () => res(req.result);
            req.onerror = () => rej(req.error);
        });

        const getAllByIndex = (store: string, indexName: string, value: string) => new Promise<any[]>((res, rej) => {
            const req = tx.objectStore(store).index(indexName).getAll(value);
            req.onsuccess = () => res(req.result);
            req.onerror = () => rej(req.error);
        });

        const metaData = await getOne(STORES.GAMES, id);
        
        if (!metaData) {
            resolve(undefined);
            return;
        }

        const [charsArr, locsArr, msgsArr, evtsArr] = await Promise.all([
            getAllByIndex(STORES.CHARACTERS, 'by_game_id', id),
            getAllByIndex(STORES.LOCATIONS, 'by_game_id', id),
            getAllByIndex(STORES.MESSAGES, 'by_game_id', id),
            getAllByIndex(STORES.EVENTS, 'by_game_id', id),
        ]);

        const characters: Record<string, Character> = {};
        charsArr.forEach((c: Character) => characters[c.id] = c);

        const locations: Record<string, Location> = {};
        locsArr.forEach((l: Location) => locations[l.id] = l);

        const sortedMessages = msgsArr.sort((a: ChatMessage, b: ChatMessage) => a.timestamp - b.timestamp);
        const sanitizedMessages = sanitizeMessages(sortedMessages);
        const hadDuplicates = sanitizedMessages.length !== sortedMessages.length;

        const fullState: GameState = {
            ...metaData,
            characters,
            locations,
            messages: sanitizedMessages,
            events: evtsArr
        };

        resolve(fullState);

        if (hadDuplicates) {
          // Clean the persisted snapshot asynchronously so the DB stays normalized
          dbService.saveGame(fullState).catch(err => console.warn('[DB] Failed to resave sanitized messages', err));
        }

      } catch (e) {
        reject(e);
      }
    });
  },

  /**
   * Retrieves metadata for all saved games.
   * Optimized to not load heavy character/message data.
   * @returns Array of GameState (with empty collections).
   */
  loadGames: async (): Promise<GameState[]> => {
    const db = await dbService.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.GAMES], 'readonly');
      const store = tx.objectStore(STORES.GAMES);
      const request = store.getAll();

      request.onsuccess = () => {
         const games = request.result.map(g => ({
             ...g,
             characters: {}, 
             locations: {}, 
             messages: [], 
             events: []
         }));
         resolve(games);
      };
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Deletes a game and all its related records in other tables.
   * @param id - The Game ID.
   */
  deleteGame: async (id: string): Promise<void> => {
    const db = await dbService.open();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(
            [STORES.GAMES, STORES.CHARACTERS, STORES.LOCATIONS, STORES.MESSAGES, STORES.EVENTS], 
            'readwrite'
        );

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);

        tx.objectStore(STORES.GAMES).delete(id);

        const deleteByIndex = (storeName: string) => {
            const store = tx.objectStore(storeName);
            const index = store.index('by_game_id');
            const request = index.openKeyCursor(IDBKeyRange.only(id));
            
            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    store.delete(cursor.primaryKey);
                    cursor.continue();
                }
            };
        };

        deleteByIndex(STORES.CHARACTERS);
        deleteByIndex(STORES.LOCATIONS);
        deleteByIndex(STORES.MESSAGES);
        deleteByIndex(STORES.EVENTS);
    });
  },
  
  /**
   * @deprecated Migration logic not required for fresh installs v2.
   */
  migrateFromLocalStorage: async (): Promise<void> => {
    return Promise.resolve();
  },

  /**
   * Exports a game to a JSON object for download.
   * @param id - The Game ID to export.
   * @returns The exported game data with version info.
   */
  exportGame: async (id: string): Promise<ExportedGameData | undefined> => {
    const gameState = await dbService.loadGame(id);
    if (!gameState) return undefined;

    return {
      version: EXPORT_VERSION,
      exportedAt: Date.now(),
      game: gameState
    };
  },

  /**
   * Validates imported data structure.
   * @param data - The parsed JSON data to validate.
   * @returns Validation result with error message if invalid.
   */
  validateImport: (data: unknown): { valid: boolean; error?: string } => {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Invalid data format' };
    }

    const exported = data as ExportedGameData;

    // Check version
    if (!exported.version || exported.version > EXPORT_VERSION) {
      return { valid: false, error: 'version' };
    }

    // Check required game fields
    const game = exported.game;
    if (!game) {
      return { valid: false, error: 'Missing game data' };
    }

    const requiredFields = ['id', 'title', 'config', 'playerCharacterId', 'currentLocationId'];
    for (const field of requiredFields) {
      if (!(field in game)) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }

    // Check required collections
    if (!game.characters || typeof game.characters !== 'object') {
      return { valid: false, error: 'Invalid characters data' };
    }
    if (!game.locations || typeof game.locations !== 'object') {
      return { valid: false, error: 'Invalid locations data' };
    }
    if (!Array.isArray(game.messages)) {
      return { valid: false, error: 'Invalid messages data' };
    }

    return { valid: true };
  },

  /**
   * Imports a game from exported JSON data.
   * Creates a new game with a new ID to avoid conflicts.
   * @param data - The validated exported game data.
   * @returns The ID of the newly imported game.
   */
  importGame: async (data: ExportedGameData): Promise<string> => {
    const game = data.game;

    // Generate new ID to avoid conflicts with existing games
    const newId = crypto.randomUUID();
    const oldId = game.id;

    // Create updated game state
    const newPlayerCharacterId = `player_${newId}`;

    // Update all gameId references
    const updatedCharacters: Record<string, Character> = {};
    Object.entries(game.characters).forEach(([key, char]) => {
      // Only the player character gets a new ID format
      const newCharId = key === game.playerCharacterId ? newPlayerCharacterId : key;
      updatedCharacters[newCharId] = { ...char, id: newCharId, gameId: newId };
    });

    const updatedLocations: Record<string, Location> = {};
    Object.entries(game.locations).forEach(([key, loc]) => {
      updatedLocations[key] = { ...loc, gameId: newId };
    });

    const updatedMessages = game.messages.map((msg, idx) => ({
      ...msg,
      id: `msg_${newId}_${idx}`,
      gameId: newId
    }));

    const updatedEvents = (game.events || []).map((evt, idx) => ({
      ...evt,
      id: `evt_${newId}_${idx}`,
      gameId: newId
    }));

    // Update message senderIds if they reference old player ID
    const finalMessages = updatedMessages.map(msg => ({
      ...msg,
      senderId: msg.senderId === game.playerCharacterId ? newPlayerCharacterId : msg.senderId
    }));

    const importedGame: GameState = {
      ...game,
      id: newId,
      playerCharacterId: newPlayerCharacterId,
      characters: updatedCharacters,
      locations: updatedLocations,
      messages: finalMessages,
      events: updatedEvents,
      lastPlayed: Date.now()
    };

    await dbService.saveGame(importedGame);
    return newId;
  }
};
