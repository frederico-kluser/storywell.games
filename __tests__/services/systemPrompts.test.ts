import {
  buildSystemPrompt,
  buildInitializationPrompt,
  buildOnboardingPrompt,
  gmResponseSchema,
  onboardingSchema,
  StoryConfig
} from '../../services/ai/systemPrompts';
import { GameState, GameConfig, Language, FateResult } from '../../types';

// Helper to create a minimal valid GameState
const createMockGameState = (overrides: Partial<GameState> = {}): GameState => ({
  id: 'test-game-id',
  title: 'Test Adventure',
  turnCount: 5,
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
      inventory: ['sword', 'potion'],
      relationships: { 'npc-1': 75 },
      state: 'idle'
    },
    'npc-1': {
      id: 'npc-1',
      name: 'Merchant',
      description: 'A friendly merchant',
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
    }
  },
  messages: [
    {
      id: 'msg-1',
      senderId: 'Narrator',
      text: 'You enter the town square.',
      type: 'NARRATION' as any,
      timestamp: Date.now() - 1000
    }
  ],
  events: [],
  playerCharacterId: 'player-1',
  currentLocationId: 'loc-1',
  ...overrides
});

describe('systemPrompts', () => {
  describe('gmResponseSchema', () => {
    it('should have required messages and stateUpdates properties', () => {
      expect(gmResponseSchema.type).toBe('object');
      expect(gmResponseSchema.required).toContain('messages');
      expect(gmResponseSchema.required).toContain('stateUpdates');
    });

    it('should define messages as an array', () => {
      expect(gmResponseSchema.properties.messages.type).toBe('array');
    });

    it('should define message items with required fields', () => {
      const messageSchema = gmResponseSchema.properties.messages.items;
      expect(messageSchema.required).toContain('type');
    });

    it('should define valid message types', () => {
      const typeEnum = gmResponseSchema.properties.messages.items.properties.type.enum;
      expect(typeEnum).toContain('dialogue');
      expect(typeEnum).toContain('narration');
      expect(typeEnum).toContain('system');
    });

    it('should define stateUpdates with eventLog as required', () => {
      expect(gmResponseSchema.properties.stateUpdates.required).toContain('eventLog');
    });

    it('should define newLocations schema', () => {
      const locSchema = gmResponseSchema.properties.stateUpdates.properties.newLocations;
      expect(locSchema.type).toBe('array');
    });

    it('should define newCharacters schema', () => {
      const charSchema = gmResponseSchema.properties.stateUpdates.properties.newCharacters;
      expect(charSchema.type).toBe('array');
    });

    it('should define updatedCharacters schema', () => {
      const charSchema = gmResponseSchema.properties.stateUpdates.properties.updatedCharacters;
      expect(charSchema.type).toBe('array');
    });
  });

  describe('onboardingSchema', () => {
    it('should have required properties', () => {
      expect(onboardingSchema.required).toContain('question');
      expect(onboardingSchema.required).toContain('controlType');
      expect(onboardingSchema.required).toContain('isComplete');
    });

    it('should define controlType enum values', () => {
      const controlTypeEnum = onboardingSchema.properties.controlType.enum;
      expect(controlTypeEnum).toContain('text');
      expect(controlTypeEnum).toContain('select');
      expect(controlTypeEnum).toContain('finish');
    });

    it('should define options as array', () => {
      expect(onboardingSchema.properties.options.type).toBe('array');
    });

    it('should define finalConfig structure', () => {
      const finalConfig = onboardingSchema.properties.finalConfig;
      expect(finalConfig.type).toBe('object');
      expect(finalConfig.properties.universeName).toBeDefined();
      expect(finalConfig.properties.playerName).toBeDefined();
    });
  });

  describe('buildSystemPrompt', () => {
    it('should include universe name and type', () => {
      const gameState = createMockGameState();
      const prompt = buildSystemPrompt({ gameState, playerInput: 'attack', language: 'en' });

      expect(prompt).toContain('Fantasy World');
      expect(prompt).toContain('original');
    });

    it('should include current location', () => {
      const gameState = createMockGameState();
      const prompt = buildSystemPrompt({ gameState, playerInput: 'look around', language: 'en' });

      expect(prompt).toContain('Town Square');
      expect(prompt).toContain('bustling marketplace');
    });

    it('should include player information', () => {
      const gameState = createMockGameState();
      const prompt = buildSystemPrompt({ gameState, playerInput: 'check inventory', language: 'en' });

      expect(prompt).toContain('Hero');
      expect(prompt).toContain('player-1');
      expect(prompt).toContain('sword');
      expect(prompt).toContain('potion');
    });

    it('should include characters at location', () => {
      const gameState = createMockGameState();
      const prompt = buildSystemPrompt({ gameState, playerInput: 'talk to merchant', language: 'en' });

      expect(prompt).toContain('Merchant');
      expect(prompt).toContain('npc-1');
    });

    it('should include language instruction', () => {
      const gameState = createMockGameState();

      const promptEn = buildSystemPrompt({ gameState, playerInput: 'action', language: 'en' });
      expect(promptEn).toContain('English');

      const promptPt = buildSystemPrompt({ gameState, playerInput: 'action', language: 'pt' });
      expect(promptPt).toContain('Portuguese');

      const promptEs = buildSystemPrompt({ gameState, playerInput: 'action', language: 'es' });
      expect(promptEs).toContain('Spanish');
    });

    it('should include player action in prompt', () => {
      const gameState = createMockGameState();
      const prompt = buildSystemPrompt({ gameState, playerInput: 'cast fireball', language: 'en' });

      expect(prompt).toContain('cast fireball');
    });

    it('should include action resolution logic', () => {
      const gameState = createMockGameState();
      const prompt = buildSystemPrompt({ gameState, playerInput: 'action', language: 'en' });

      expect(prompt).toContain('FEASIBILITY & COSTS');
      expect(prompt).toContain('MAGIC');
      expect(prompt).toContain('COMBAT');
      expect(prompt).toContain('INVENTORY');
    });

    describe('fate events', () => {
      it('should include good fate instruction when fate is good', () => {
        const gameState = createMockGameState();
        const fateResult: FateResult = {
          type: 'good',
          hint: 'Find hidden treasure'
        };
        const prompt = buildSystemPrompt({ gameState, playerInput: 'search', language: 'en', fateResult });

        expect(prompt).toContain('FATE EVENT: FORTUNATE OCCURRENCE');
        expect(prompt).toContain('Find hidden treasure');
        expect(prompt).toContain('GOOD must happen');
      });

      it('should include bad fate instruction when fate is bad', () => {
        const gameState = createMockGameState();
        const fateResult: FateResult = {
          type: 'bad',
          hint: 'Trigger a trap'
        };
        const prompt = buildSystemPrompt({ gameState, playerInput: 'open chest', language: 'en', fateResult });

        expect(prompt).toContain('FATE EVENT: MISFORTUNE STRIKES');
        expect(prompt).toContain('Trigger a trap');
        expect(prompt).toContain('BAD must happen');
      });

      it('should not include fate instruction when fate is neutral', () => {
        const gameState = createMockGameState();
        const fateResult: FateResult = { type: 'neutral' };
        const prompt = buildSystemPrompt({ gameState, playerInput: 'walk', language: 'en', fateResult });

        expect(prompt).not.toContain('FATE EVENT');
      });

      it('should not include fate instruction when fateResult is undefined', () => {
        const gameState = createMockGameState();
        const prompt = buildSystemPrompt({ gameState, playerInput: 'walk', language: 'en' });

        expect(prompt).not.toContain('FATE EVENT');
      });

      it('should provide default hint for good fate without hint', () => {
        const gameState = createMockGameState();
        const fateResult: FateResult = { type: 'good' };
        const prompt = buildSystemPrompt({ gameState, playerInput: 'action', language: 'en', fateResult });

        expect(prompt).toContain('unexpected benefit');
      });

      it('should provide default hint for bad fate without hint', () => {
        const gameState = createMockGameState();
        const fateResult: FateResult = { type: 'bad' };
        const prompt = buildSystemPrompt({ gameState, playerInput: 'action', language: 'en', fateResult });

        expect(prompt).toContain('unexpected complication');
      });
    });
  });

  describe('buildInitializationPrompt', () => {
    const mockConfig: StoryConfig = {
      universeName: 'Star Wars',
      universeType: 'existing',
      playerName: 'Luke',
      playerDesc: 'A young farm boy with a destiny',
      background: 'Raised on Tatooine by his uncle',
      memories: 'Dreams of becoming a pilot',
      startSituation: 'At the Lars homestead'
    };

    it('should include universe information', () => {
      const prompt = buildInitializationPrompt({ config: mockConfig, language: 'en' });

      expect(prompt).toContain('Star Wars');
      expect(prompt).toContain('existing');
    });

    it('should include player information', () => {
      const prompt = buildInitializationPrompt({ config: mockConfig, language: 'en' });

      expect(prompt).toContain('Luke');
      expect(prompt).toContain('young farm boy');
    });

    it('should include background', () => {
      const prompt = buildInitializationPrompt({ config: mockConfig, language: 'en' });

      expect(prompt).toContain('Tatooine');
    });

    it('should include memories', () => {
      const prompt = buildInitializationPrompt({ config: mockConfig, language: 'en' });

      expect(prompt).toContain('pilot');
    });

    it('should include start situation', () => {
      const prompt = buildInitializationPrompt({ config: mockConfig, language: 'en' });

      expect(prompt).toContain('Lars homestead');
    });

    it('should include language instruction', () => {
      const prompt = buildInitializationPrompt({ config: mockConfig, language: 'pt' });

      expect(prompt).toContain('Portuguese');
    });

    it('should request narrator introduction', () => {
      const prompt = buildInitializationPrompt({ config: mockConfig, language: 'en' });

      expect(prompt).toContain('Narrator');
      expect(prompt).toContain('introduction');
    });
  });

  describe('buildOnboardingPrompt', () => {
    it('should include universe type', () => {
      const prompt = buildOnboardingPrompt({ history: [], universeType: 'original', language: 'en' });

      expect(prompt).toContain('original');
    });

    it('should include existing universe type', () => {
      const prompt = buildOnboardingPrompt({ history: [], universeType: 'existing', language: 'en' });

      expect(prompt).toContain('existing');
    });

    it('should include conversation history', () => {
      const history = [
        { question: 'What universe?', answer: 'Star Wars' },
        { question: 'What era?', answer: 'Original Trilogy' }
      ];
      const prompt = buildOnboardingPrompt({ history, universeType: 'existing', language: 'en' });

      expect(prompt).toContain('Star Wars');
      expect(prompt).toContain('Original Trilogy');
    });

    it('should include language instruction', () => {
      const promptEn = buildOnboardingPrompt({ history: [], universeType: 'original', language: 'en' });
      expect(promptEn).toContain('English');

      const promptPt = buildOnboardingPrompt({ history: [], universeType: 'original', language: 'pt' });
      expect(promptPt).toContain('Portuguese');
    });

    it('should list required data points', () => {
      const prompt = buildOnboardingPrompt({ history: [], universeType: 'original', language: 'en' });

      expect(prompt).toContain('Universe Name');
      expect(prompt).toContain('Time Period');
      expect(prompt).toContain('Character Name');
      expect(prompt).toContain('Character Appearance');
      expect(prompt).toContain('Character Background');
      expect(prompt).toContain('Starting Location');
      expect(prompt).toContain('Character Memories');
    });

    it('should include instructions for completion', () => {
      const prompt = buildOnboardingPrompt({ history: [], universeType: 'original', language: 'en' });

      expect(prompt).toContain('isComplete');
      expect(prompt).toContain('finalConfig');
    });
  });
});
