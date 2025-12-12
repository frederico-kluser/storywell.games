import { dbService, ExportedGameData } from '../../services/db';
import { GameState, Character, Location, ChatMessage, GameEvent, MessageType } from '../../types';

// Helper to create a complete valid GameState
const createMockGameState = (id: string = 'test-game-1'): GameState => ({
  id,
  title: 'Test Adventure',
  turnCount: 10,
  lastPlayed: Date.now(),
  config: {
    universeType: 'original',
    universeName: 'Fantasy World',
    combatStyle: 'descriptive',
    dialogueHeavy: true,
    language: 'en'
  },
  characters: {
    'player-1': {
      id: 'player-1',
      name: 'Hero',
      description: 'A brave warrior',
      isPlayer: true,
      locationId: 'loc-1',
      stats: { hp: 100, mana: 50 },
      inventory: ['sword', 'shield', 'potion'],
      relationships: { 'npc-1': 75 },
      state: 'idle'
    },
    'npc-1': {
      id: 'npc-1',
      name: 'Merchant',
      description: 'A friendly trader',
      isPlayer: false,
      locationId: 'loc-1',
      stats: { hp: 50 },
      inventory: ['gold', 'goods'],
      relationships: { 'player-1': 50 },
      state: 'idle'
    }
  },
  locations: {
    'loc-1': {
      id: 'loc-1',
      name: 'Town Square',
      description: 'A bustling marketplace',
      connectedLocationIds: ['loc-2']
    },
    'loc-2': {
      id: 'loc-2',
      name: 'Forest',
      description: 'A dark and mysterious forest',
      connectedLocationIds: ['loc-1']
    }
  },
  messages: [
    {
      id: 'msg-1',
      senderId: 'Narrator',
      text: 'Your adventure begins...',
      type: MessageType.NARRATION,
      timestamp: Date.now() - 5000,
      pageNumber: 1,
    },
    {
      id: 'msg-2',
      senderId: 'player-1',
      text: 'Hello!',
      type: MessageType.DIALOGUE,
      timestamp: Date.now() - 4000,
      pageNumber: 2,
    },
    {
      id: 'msg-3',
      senderId: 'npc-1',
      text: 'Welcome, traveler!',
      type: MessageType.DIALOGUE,
      timestamp: Date.now() - 3000,
      pageNumber: 3,
    }
  ],
  events: [
    {
      id: 'evt-1',
      turn: 1,
      description: 'Adventure started',
      importance: 'high'
    },
    {
      id: 'evt-2',
      turn: 5,
      description: 'Met the merchant',
      importance: 'medium'
    }
  ],
  playerCharacterId: 'player-1',
  currentLocationId: 'loc-1'
});

describe('dbService', () => {
  beforeEach(async () => {
    // Clear all data from all stores by opening the db and clearing each store
    try {
      const db = await dbService.open();
      const tx = db.transaction(
        ['games', 'characters', 'locations', 'messages', 'events'],
        'readwrite'
      );

      await Promise.all([
        new Promise<void>((resolve) => {
          const req = tx.objectStore('games').clear();
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        }),
        new Promise<void>((resolve) => {
          const req = tx.objectStore('characters').clear();
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        }),
        new Promise<void>((resolve) => {
          const req = tx.objectStore('locations').clear();
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        }),
        new Promise<void>((resolve) => {
          const req = tx.objectStore('messages').clear();
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        }),
        new Promise<void>((resolve) => {
          const req = tx.objectStore('events').clear();
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        }),
      ]);
    } catch {
      // First run - db doesn't exist yet, that's ok
    }
  });

  describe('open', () => {
    it('should open the database successfully', async () => {
      const db = await dbService.open();

      expect(db).toBeDefined();
      expect(db.name).toBe('InfinitumRPG_Core');
    });

    it('should create all required object stores', async () => {
      const db = await dbService.open();

      expect(db.objectStoreNames.contains('games')).toBe(true);
      expect(db.objectStoreNames.contains('characters')).toBe(true);
      expect(db.objectStoreNames.contains('locations')).toBe(true);
      expect(db.objectStoreNames.contains('messages')).toBe(true);
      expect(db.objectStoreNames.contains('events')).toBe(true);
    });

    it('should return same database instance on multiple opens', async () => {
      const db1 = await dbService.open();
      const db2 = await dbService.open();

      expect(db1.name).toBe(db2.name);
    });
  });

  describe('saveGame and loadGame', () => {
    it('should save and load a game correctly', async () => {
      const gameState = createMockGameState();

      await dbService.saveGame(gameState);
      const loaded = await dbService.loadGame(gameState.id);

      expect(loaded).toBeDefined();
      expect(loaded?.id).toBe(gameState.id);
      expect(loaded?.title).toBe(gameState.title);
      expect(loaded?.turnCount).toBe(gameState.turnCount);
    });

    it('should preserve game configuration', async () => {
      const gameState = createMockGameState();

      await dbService.saveGame(gameState);
      const loaded = await dbService.loadGame(gameState.id);

      expect(loaded?.config.universeType).toBe('original');
      expect(loaded?.config.universeName).toBe('Fantasy World');
      expect(loaded?.config.combatStyle).toBe('descriptive');
      expect(loaded?.config.dialogueHeavy).toBe(true);
      expect(loaded?.config.language).toBe('en');
    });

    it('should preserve all characters', async () => {
      const gameState = createMockGameState();

      await dbService.saveGame(gameState);
      const loaded = await dbService.loadGame(gameState.id);

      expect(Object.keys(loaded?.characters || {}).length).toBe(2);
      expect(loaded?.characters['player-1'].name).toBe('Hero');
      expect(loaded?.characters['npc-1'].name).toBe('Merchant');
    });

    it('should preserve character stats and inventory', async () => {
      const gameState = createMockGameState();

      await dbService.saveGame(gameState);
      const loaded = await dbService.loadGame(gameState.id);

      const player = loaded?.characters['player-1'];
      expect(player?.stats.hp).toBe(100);
      expect(player?.stats.mana).toBe(50);
      expect(player?.inventory).toContain('sword');
      expect(player?.inventory).toContain('shield');
    });

    it('should preserve all locations', async () => {
      const gameState = createMockGameState();

      await dbService.saveGame(gameState);
      const loaded = await dbService.loadGame(gameState.id);

      expect(Object.keys(loaded?.locations || {}).length).toBe(2);
      expect(loaded?.locations['loc-1'].name).toBe('Town Square');
      expect(loaded?.locations['loc-2'].name).toBe('Forest');
    });

    it('should preserve location connections', async () => {
      const gameState = createMockGameState();

      await dbService.saveGame(gameState);
      const loaded = await dbService.loadGame(gameState.id);

      expect(loaded?.locations['loc-1'].connectedLocationIds).toContain('loc-2');
    });

    it('should preserve all messages in order', async () => {
      const gameState = createMockGameState();

      await dbService.saveGame(gameState);
      const loaded = await dbService.loadGame(gameState.id);

      expect(loaded?.messages.length).toBe(3);
      // Messages should be sorted by timestamp
      expect(loaded?.messages[0].text).toBe('Your adventure begins...');
      expect(loaded?.messages[1].text).toBe('Hello!');
      expect(loaded?.messages[2].text).toBe('Welcome, traveler!');
    });

    it('should preserve all events', async () => {
      const gameState = createMockGameState();

      await dbService.saveGame(gameState);
      const loaded = await dbService.loadGame(gameState.id);

      expect(loaded?.events.length).toBe(2);
    });

    it('should return undefined for non-existent game', async () => {
      const loaded = await dbService.loadGame('non-existent-id');

      expect(loaded).toBeUndefined();
    });

    it('should update existing game on re-save', async () => {
      const gameState = createMockGameState();

      await dbService.saveGame(gameState);

      // Modify and re-save
      gameState.turnCount = 20;
      gameState.title = 'Updated Adventure';

      await dbService.saveGame(gameState);
      const loaded = await dbService.loadGame(gameState.id);

      expect(loaded?.turnCount).toBe(20);
      expect(loaded?.title).toBe('Updated Adventure');
    });
  });

  describe('loadGames', () => {
    it('should return empty array when no games exist', async () => {
      const games = await dbService.loadGames();

      expect(games).toEqual([]);
    });

    it('should return all saved games metadata', async () => {
      const game1 = createMockGameState('game-1');
      const game2 = createMockGameState('game-2');
      game2.title = 'Second Adventure';

      await dbService.saveGame(game1);
      await dbService.saveGame(game2);

      const games = await dbService.loadGames();

      expect(games.length).toBe(2);
    });

    it('should return games with empty collections for efficiency', async () => {
      const gameState = createMockGameState();
      await dbService.saveGame(gameState);

      const games = await dbService.loadGames();

      // loadGames returns metadata only, with empty collections
      expect(games[0].characters).toEqual({});
      expect(games[0].locations).toEqual({});
      expect(games[0].messages).toEqual([]);
      expect(games[0].events).toEqual([]);
    });

    it('should preserve game metadata in loadGames', async () => {
      const gameState = createMockGameState();
      await dbService.saveGame(gameState);

      const games = await dbService.loadGames();

      expect(games[0].id).toBe(gameState.id);
      expect(games[0].title).toBe(gameState.title);
      expect(games[0].turnCount).toBe(gameState.turnCount);
    });
  });

  describe('deleteGame', () => {
    it('should delete a game and all related data', async () => {
      const gameState = createMockGameState();
      await dbService.saveGame(gameState);

      await dbService.deleteGame(gameState.id);

      const loaded = await dbService.loadGame(gameState.id);
      expect(loaded).toBeUndefined();
    });

    it('should not affect other games', async () => {
      const game1 = createMockGameState('game-1');
      const game2 = createMockGameState('game-2');

      await dbService.saveGame(game1);
      await dbService.saveGame(game2);

      await dbService.deleteGame('game-1');

      const loaded1 = await dbService.loadGame('game-1');
      const loaded2 = await dbService.loadGame('game-2');

      expect(loaded1).toBeUndefined();
      expect(loaded2).toBeDefined();
      expect(loaded2?.id).toBe('game-2');
    });

    it('should handle deleting non-existent game gracefully', async () => {
      await expect(dbService.deleteGame('non-existent')).resolves.not.toThrow();
    });
  });

  describe('validateImport', () => {
    it('should validate correct export data', () => {
      const exportData: ExportedGameData = {
        version: 1,
        exportedAt: Date.now(),
        game: createMockGameState()
      };

      const result = dbService.validateImport(exportData);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject null data', () => {
      const result = dbService.validateImport(null);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid data format');
    });

    it('should reject non-object data', () => {
      const result = dbService.validateImport('string');

      expect(result.valid).toBe(false);
    });

    it('should reject missing version', () => {
      const exportData = {
        exportedAt: Date.now(),
        game: createMockGameState()
      };

      const result = dbService.validateImport(exportData);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('version');
    });

    it('should reject incompatible version', () => {
      const exportData = {
        version: 999,
        exportedAt: Date.now(),
        game: createMockGameState()
      };

      const result = dbService.validateImport(exportData);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('version');
    });

    it('should reject missing game data', () => {
      const exportData = {
        version: 1,
        exportedAt: Date.now()
      };

      const result = dbService.validateImport(exportData);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing game data');
    });

    it('should reject missing required fields', () => {
      const exportData = {
        version: 1,
        exportedAt: Date.now(),
        game: {
          id: 'test',
          title: 'Test'
          // Missing: config, playerCharacterId, currentLocationId
        }
      };

      const result = dbService.validateImport(exportData);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing required field');
    });

    it('should reject invalid characters data', () => {
      const gameState = createMockGameState();
      (gameState as any).characters = 'invalid';

      const exportData = {
        version: 1,
        exportedAt: Date.now(),
        game: gameState
      };

      const result = dbService.validateImport(exportData);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid characters data');
    });

    it('should reject invalid locations data', () => {
      const gameState = createMockGameState();
      (gameState as any).locations = 'invalid';

      const exportData = {
        version: 1,
        exportedAt: Date.now(),
        game: gameState
      };

      const result = dbService.validateImport(exportData);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid locations data');
    });

    it('should reject invalid messages data', () => {
      const gameState = createMockGameState();
      (gameState as any).messages = 'invalid';

      const exportData = {
        version: 1,
        exportedAt: Date.now(),
        game: gameState
      };

      const result = dbService.validateImport(exportData);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid messages data');
    });
  });

  describe('exportGame', () => {
    it('should export a game with correct structure', async () => {
      const gameState = createMockGameState();
      await dbService.saveGame(gameState);

      const exported = await dbService.exportGame(gameState.id);

      expect(exported).toBeDefined();
      expect(exported?.version).toBe(1);
      expect(exported?.exportedAt).toBeDefined();
      expect(exported?.game.id).toBe(gameState.id);
    });

    it('should return undefined for non-existent game', async () => {
      const exported = await dbService.exportGame('non-existent');

      expect(exported).toBeUndefined();
    });

    it('should export complete game data', async () => {
      const gameState = createMockGameState();
      await dbService.saveGame(gameState);

      const exported = await dbService.exportGame(gameState.id);

      expect(Object.keys(exported?.game.characters || {}).length).toBe(2);
      expect(Object.keys(exported?.game.locations || {}).length).toBe(2);
      expect(exported?.game.messages.length).toBe(3);
      expect(exported?.game.events.length).toBe(2);
    });
  });

  describe('importGame', () => {
    it('should import a game with new ID', async () => {
      const gameState = createMockGameState('original-id');
      const exportData: ExportedGameData = {
        version: 1,
        exportedAt: Date.now(),
        game: gameState
      };

      const newId = await dbService.importGame(exportData);

      expect(newId).not.toBe('original-id');
      expect(newId).toBeDefined();
    });

    it('should make imported game loadable', async () => {
      const gameState = createMockGameState();
      const exportData: ExportedGameData = {
        version: 1,
        exportedAt: Date.now(),
        game: gameState
      };

      const newId = await dbService.importGame(exportData);
      const loaded = await dbService.loadGame(newId);

      expect(loaded).toBeDefined();
      expect(loaded?.title).toBe(gameState.title);
    });

    it('should update playerCharacterId to new format', async () => {
      const gameState = createMockGameState();
      const exportData: ExportedGameData = {
        version: 1,
        exportedAt: Date.now(),
        game: gameState
      };

      const newId = await dbService.importGame(exportData);
      const loaded = await dbService.loadGame(newId);

      expect(loaded?.playerCharacterId).toContain('player_');
    });

    it('should preserve game content after import', async () => {
      const gameState = createMockGameState();
      const exportData: ExportedGameData = {
        version: 1,
        exportedAt: Date.now(),
        game: gameState
      };

      const newId = await dbService.importGame(exportData);
      const loaded = await dbService.loadGame(newId);

      expect(loaded?.config.universeName).toBe('Fantasy World');
      expect(loaded?.locations['loc-1'].name).toBe('Town Square');
    });

    it('should update lastPlayed timestamp', async () => {
      const gameState = createMockGameState();
      gameState.lastPlayed = 1000; // Old timestamp

      const exportData: ExportedGameData = {
        version: 1,
        exportedAt: Date.now(),
        game: gameState
      };

      const before = Date.now();
      const newId = await dbService.importGame(exportData);
      const loaded = await dbService.loadGame(newId);

      expect(loaded?.lastPlayed).toBeGreaterThanOrEqual(before);
    });
  });

  describe('migrateFromLocalStorage', () => {
    it('should resolve without error (deprecated function)', async () => {
      await expect(dbService.migrateFromLocalStorage()).resolves.not.toThrow();
    });
  });
});
