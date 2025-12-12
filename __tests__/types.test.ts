import {
  Language,
  MessageType,
  Character,
  Location,
  GameEvent,
  ChatMessage,
  GameConfig,
  GameState,
  GMResponse,
  ActionOption,
  FateResult,
  FateEventType,
  HeavyContext
} from '../types';

describe('types', () => {
  describe('Language type', () => {
    it('should accept valid language codes', () => {
      const en: Language = 'en';
      const pt: Language = 'pt';
      const es: Language = 'es';

      expect(en).toBe('en');
      expect(pt).toBe('pt');
      expect(es).toBe('es');
    });
  });

  describe('MessageType enum', () => {
    it('should have NARRATION value', () => {
      expect(MessageType.NARRATION).toBe('NARRATION');
    });

    it('should have DIALOGUE value', () => {
      expect(MessageType.DIALOGUE).toBe('DIALOGUE');
    });

    it('should have SYSTEM value', () => {
      expect(MessageType.SYSTEM).toBe('SYSTEM');
    });

    it('should have exactly 3 values', () => {
      const values = Object.values(MessageType);
      expect(values.length).toBe(3);
    });
  });

  describe('Character interface', () => {
    it('should accept valid character object', () => {
      const character: Character = {
        id: 'char-1',
        name: 'Hero',
        description: 'A brave warrior',
        isPlayer: true,
        locationId: 'loc-1',
        stats: { hp: 100, mana: 50 },
        inventory: ['sword', 'shield'],
        relationships: { 'npc-1': 75 },
        state: 'idle'
      };

      expect(character.id).toBe('char-1');
      expect(character.isPlayer).toBe(true);
      expect(character.stats.hp).toBe(100);
      expect(character.inventory).toContain('sword');
    });

    it('should accept all valid character states', () => {
      const states: Character['state'][] = ['idle', 'talking', 'fighting', 'unconscious', 'dead'];

      states.forEach(state => {
        const char: Character = {
          id: 'test',
          name: 'Test',
          description: 'Test',
          isPlayer: false,
          locationId: 'loc-1',
          stats: {},
          inventory: [],
          relationships: {},
          state
        };
        expect(char.state).toBe(state);
      });
    });

    it('should accept optional fields', () => {
      const character: Character = {
        id: 'char-1',
        name: 'Hero',
        description: 'A warrior',
        isPlayer: true,
        locationId: 'loc-1',
        stats: {},
        inventory: [],
        relationships: {},
        state: 'idle',
        gameId: 'game-1',
        avatarColor: '#FF0000',
        avatarBase64: 'base64data',
        avatarUrl: 'https://example.com/avatar.png'
      };

      expect(character.gameId).toBe('game-1');
      expect(character.avatarColor).toBe('#FF0000');
      expect(character.avatarUrl).toBeDefined();
    });
  });

  describe('Location interface', () => {
    it('should accept valid location object', () => {
      const location: Location = {
        id: 'loc-1',
        name: 'Town Square',
        description: 'A bustling marketplace',
        connectedLocationIds: ['loc-2', 'loc-3']
      };

      expect(location.id).toBe('loc-1');
      expect(location.connectedLocationIds.length).toBe(2);
    });

    it('should accept optional gameId', () => {
      const location: Location = {
        id: 'loc-1',
        name: 'Forest',
        description: 'Dark woods',
        connectedLocationIds: [],
        gameId: 'game-1'
      };

      expect(location.gameId).toBe('game-1');
    });

    it('should accept empty connected locations', () => {
      const location: Location = {
        id: 'loc-1',
        name: 'Isolated Cave',
        description: 'No way out',
        connectedLocationIds: []
      };

      expect(location.connectedLocationIds).toEqual([]);
    });
  });

  describe('GameEvent interface', () => {
    it('should accept valid event object', () => {
      const event: GameEvent = {
        id: 'evt-1',
        turn: 5,
        description: 'A dragon appeared!',
        importance: 'high'
      };

      expect(event.turn).toBe(5);
      expect(event.importance).toBe('high');
    });

    it('should accept all importance levels', () => {
      const levels: GameEvent['importance'][] = ['low', 'medium', 'high'];

      levels.forEach(importance => {
        const event: GameEvent = {
          id: 'test',
          turn: 1,
          description: 'Test',
          importance
        };
        expect(event.importance).toBe(importance);
      });
    });
  });

  describe('ChatMessage interface', () => {
    it('should accept valid message object', () => {
      const message: ChatMessage = {
        id: 'msg-1',
        senderId: 'player-1',
        text: 'Hello, world!',
        type: MessageType.DIALOGUE,
        timestamp: Date.now(),
        pageNumber: 1,
      };

      expect(message.text).toBe('Hello, world!');
      expect(message.type).toBe(MessageType.DIALOGUE);
    });

    it('should accept all message types', () => {
      const types = [MessageType.NARRATION, MessageType.DIALOGUE, MessageType.SYSTEM];

      types.forEach(type => {
        const message: ChatMessage = {
          id: 'test',
          senderId: 'test',
          text: 'Test',
          type,
          timestamp: 0,
          pageNumber: 1,
        };
        expect(message.type).toBe(type);
      });
    });

    it('should accept optional voiceTone property', () => {
      const message: ChatMessage = {
        id: 'msg-1',
        senderId: 'narrator',
        text: 'A mysterious voice echoes...',
        type: MessageType.NARRATION,
        timestamp: Date.now(),
        pageNumber: 1,
        voiceTone: 'mysterious'
      };

      expect(message.voiceTone).toBe('mysterious');
    });

    it('should accept various voiceTone values', () => {
      const tones = ['excited', 'sad', 'angry', 'neutral', 'mysterious', 'sarcastic'];

      tones.forEach(tone => {
        const message: ChatMessage = {
          id: 'test',
          senderId: 'test',
          text: 'Test',
          type: MessageType.DIALOGUE,
          timestamp: 0,
          pageNumber: 1,
          voiceTone: tone
        };
        expect(message.voiceTone).toBe(tone);
      });
    });
  });

  describe('GameConfig interface', () => {
    it('should accept valid config object', () => {
      const config: GameConfig = {
        universeType: 'original',
        universeName: 'Fantasy World',
        combatStyle: 'descriptive',
        dialogueHeavy: true,
        language: 'en'
      };

      expect(config.universeType).toBe('original');
      expect(config.dialogueHeavy).toBe(true);
    });

    it('should accept both universe types', () => {
      const original: GameConfig = {
        universeType: 'original',
        universeName: 'New World',
        combatStyle: 'descriptive',
        dialogueHeavy: false,
        language: 'pt'
      };

      const existing: GameConfig = {
        universeType: 'existing',
        universeName: 'Star Wars',
        combatStyle: 'tactical',
        dialogueHeavy: true,
        language: 'es'
      };

      expect(original.universeType).toBe('original');
      expect(existing.universeType).toBe('existing');
    });

    it('should accept both combat styles', () => {
      const descriptive: GameConfig['combatStyle'] = 'descriptive';
      const tactical: GameConfig['combatStyle'] = 'tactical';

      expect(descriptive).toBe('descriptive');
      expect(tactical).toBe('tactical');
    });
  });

  describe('GameState interface', () => {
    it('should accept valid game state object', () => {
      const gameState: GameState = {
        id: 'game-1',
        title: 'Epic Adventure',
        turnCount: 10,
        lastPlayed: Date.now(),
        config: {
          universeType: 'original',
          universeName: 'Fantasy',
          combatStyle: 'descriptive',
          dialogueHeavy: true,
          language: 'en'
        },
        characters: {
          'player-1': {
            id: 'player-1',
            name: 'Hero',
            description: 'Brave',
            isPlayer: true,
            locationId: 'loc-1',
            stats: {},
            inventory: [],
            relationships: {},
            state: 'idle'
          }
        },
        locations: {
          'loc-1': {
            id: 'loc-1',
            name: 'Start',
            description: 'Beginning',
            connectedLocationIds: []
          }
        },
        messages: [],
        events: [],
        playerCharacterId: 'player-1',
        currentLocationId: 'loc-1'
      };

      expect(gameState.id).toBe('game-1');
      expect(Object.keys(gameState.characters).length).toBe(1);
    });
  });

  describe('GMResponse interface', () => {
    it('should accept valid GM response', () => {
      const response: GMResponse = {
        messages: [
          {
            type: 'narration',
            text: 'You enter the room.',
            voiceTone: 'neutral'
          },
          {
            type: 'dialogue',
            characterName: 'Guard',
            dialogue: 'Halt! Who goes there?',
            voiceTone: 'stern'
          }
        ],
        stateUpdates: {
          eventLog: 'Player entered the room'
        }
      };

      expect(response.messages.length).toBe(2);
      expect(response.stateUpdates.eventLog).toBeDefined();
    });

    it('should accept state updates with new locations', () => {
      const response: GMResponse = {
        messages: [],
        stateUpdates: {
          newLocations: [
            {
              id: 'loc-new',
              name: 'New Place',
              description: 'Discovered',
              connectedLocationIds: []
            }
          ],
          eventLog: 'Discovered new location'
        }
      };

      expect(response.stateUpdates.newLocations?.length).toBe(1);
    });

    it('should accept state updates with new characters', () => {
      const response: GMResponse = {
        messages: [],
        stateUpdates: {
          newCharacters: [
            {
              id: 'npc-new',
              name: 'Stranger',
              description: 'Mysterious',
              isPlayer: false,
              locationId: 'loc-1',
              stats: {},
              inventory: [],
              relationships: {},
              state: 'idle'
            }
          ],
          eventLog: 'Met a stranger'
        }
      };

      expect(response.stateUpdates.newCharacters?.length).toBe(1);
    });

    it('should accept location change', () => {
      const response: GMResponse = {
        messages: [],
        stateUpdates: {
          locationChange: 'loc-2',
          eventLog: 'Moved to new location'
        }
      };

      expect(response.stateUpdates.locationChange).toBe('loc-2');
    });
  });

  describe('ActionOption interface', () => {
    it('should accept valid action option', () => {
      const option: ActionOption = {
        text: 'Search the room',
        goodChance: 20,
        badChance: 10,
        goodHint: 'Find treasure',
        badHint: 'Trigger trap'
      };

      expect(option.text).toBe('Search the room');
      expect(option.goodChance).toBe(20);
      expect(option.badChance).toBe(10);
    });

    it('should accept optional hints', () => {
      const option: ActionOption = {
        text: 'Walk forward',
        goodChance: 5,
        badChance: 5
      };

      expect(option.goodHint).toBeUndefined();
      expect(option.badHint).toBeUndefined();
    });
  });

  describe('FateResult interface', () => {
    it('should accept good fate result', () => {
      const result: FateResult = {
        type: 'good',
        hint: 'Found gold!'
      };

      expect(result.type).toBe('good');
      expect(result.hint).toBe('Found gold!');
    });

    it('should accept bad fate result', () => {
      const result: FateResult = {
        type: 'bad',
        hint: 'Stepped on trap'
      };

      expect(result.type).toBe('bad');
    });

    it('should accept neutral fate result', () => {
      const result: FateResult = {
        type: 'neutral'
      };

      expect(result.type).toBe('neutral');
      expect(result.hint).toBeUndefined();
    });
  });

  describe('FateEventType', () => {
    it('should include all fate types', () => {
      const good: FateEventType = 'good';
      const bad: FateEventType = 'bad';
      const neutral: FateEventType = 'neutral';

      expect(good).toBe('good');
      expect(bad).toBe('bad');
      expect(neutral).toBe('neutral');
    });
  });

  describe('HeavyContext interface', () => {
    it('should accept valid heavy context object', () => {
      const context: HeavyContext = {
        currentMission: 'Find the lost artifact',
        activeProblems: ['The cave is dark', 'Enemies nearby'],
        currentConcerns: ['Low on health', 'Running out of time'],
        importantNotes: ['Found a key', 'Met a helpful NPC'],
        lastUpdated: Date.now()
      };

      expect(context.currentMission).toBe('Find the lost artifact');
      expect(context.activeProblems).toHaveLength(2);
      expect(context.currentConcerns).toHaveLength(2);
      expect(context.importantNotes).toHaveLength(2);
      expect(context.lastUpdated).toBeDefined();
    });

    it('should accept all optional fields', () => {
      const context: HeavyContext = {};

      expect(context.currentMission).toBeUndefined();
      expect(context.activeProblems).toBeUndefined();
      expect(context.currentConcerns).toBeUndefined();
      expect(context.importantNotes).toBeUndefined();
      expect(context.lastUpdated).toBeUndefined();
    });

    it('should accept partial context', () => {
      const context: HeavyContext = {
        currentMission: 'Save the princess',
        activeProblems: ['Dragon blocking the path']
      };

      expect(context.currentMission).toBe('Save the princess');
      expect(context.activeProblems).toHaveLength(1);
      expect(context.currentConcerns).toBeUndefined();
      expect(context.importantNotes).toBeUndefined();
    });

    it('should accept empty arrays', () => {
      const context: HeavyContext = {
        currentMission: undefined,
        activeProblems: [],
        currentConcerns: [],
        importantNotes: []
      };

      expect(context.activeProblems).toEqual([]);
      expect(context.currentConcerns).toEqual([]);
      expect(context.importantNotes).toEqual([]);
    });
  });

  describe('GameState with HeavyContext', () => {
    it('should accept game state with heavy context', () => {
      const gameState: GameState = {
        id: 'game-1',
        title: 'Epic Quest',
        turnCount: 10,
        lastPlayed: Date.now(),
        config: {
          universeType: 'original',
          universeName: 'Fantasy',
          combatStyle: 'descriptive',
          dialogueHeavy: true,
          language: 'en'
        },
        characters: {},
        locations: {},
        messages: [],
        events: [],
        playerCharacterId: 'player-1',
        currentLocationId: 'loc-1',
        heavyContext: {
          mainMission: 'Protect the realm',
          currentMission: 'Defeat the dark lord',
          activeProblems: ['Army approaching'],
          currentConcerns: ['Allies are weak'],
          importantNotes: ['Secret passage found'],
          lastUpdated: Date.now()
        }
      };

      expect(gameState.heavyContext).toBeDefined();
      expect(gameState.heavyContext?.mainMission).toBe('Protect the realm');
      expect(gameState.heavyContext?.currentMission).toBe('Defeat the dark lord');
    });

    it('should accept game state without heavy context', () => {
      const gameState: GameState = {
        id: 'game-1',
        title: 'New Adventure',
        turnCount: 0,
        lastPlayed: Date.now(),
        config: {
          universeType: 'original',
          universeName: 'Test World',
          combatStyle: 'descriptive',
          dialogueHeavy: false,
          language: 'en'
        },
        characters: {},
        locations: {},
        messages: [],
        events: [],
        playerCharacterId: 'player-1',
        currentLocationId: 'loc-1'
      };

      expect(gameState.heavyContext).toBeUndefined();
    });
  });

  describe('GMResponse with voiceTone', () => {
    it('should accept message with voiceTone', () => {
      const response: GMResponse = {
        messages: [
          {
            type: 'narration',
            text: 'The adventure begins!',
            voiceTone: 'excited'
          }
        ],
        stateUpdates: {
          eventLog: 'Game started'
        }
      };

      expect(response.messages[0].voiceTone).toBe('excited');
    });

    it('should accept message without voiceTone', () => {
      const response: GMResponse = {
        messages: [
          {
            type: 'dialogue',
            characterName: 'Guard',
            dialogue: 'Halt!'
          }
        ],
        stateUpdates: {
          eventLog: 'Guard spoke'
        }
      };

      expect(response.messages[0].voiceTone).toBeUndefined();
    });
  });
});
