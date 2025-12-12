import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGameEngine } from '../../hooks/useGameEngine';
import { GameState, MessageType } from '../../types';
import { ThemeColorsProvider } from '../../hooks/useThemeColors';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock dbService
jest.mock('../../services/db', () => ({
  dbService: {
    loadGames: jest.fn().mockResolvedValue([]),
    loadGame: jest.fn().mockResolvedValue(null),
    saveGame: jest.fn().mockResolvedValue(undefined),
    deleteGame: jest.fn().mockResolvedValue(undefined),
    exportGame: jest.fn().mockResolvedValue({
      version: 1,
      exportedAt: Date.now(),
      game: {}
    }),
    validateImport: jest.fn().mockReturnValue({ valid: true }),
    importGame: jest.fn().mockResolvedValue('new-id')
  },
  ExportedGameData: {}
}));

// Mock AI services
jest.mock('../../services/ai/openaiClient', () => ({
  validateApiKey: jest.fn().mockResolvedValue(true),
  initializeStory: jest.fn().mockResolvedValue({
    gmResponse: {
      messages: [{ type: 'narration', text: 'Welcome!', voiceTone: 'warm' }],
      stateUpdates: {
        newLocations: [{ id: 'loc-1', name: 'Start', description: 'Begin here', connectedLocationIds: [] }],
        newCharacters: [{ id: 'player-1', name: 'Hero', description: 'Brave', state: 'idle', inventory: [], stats: [] }],
        eventLog: 'Story started'
      }
    },
    universeContext: 'A fantasy world full of adventure.'
  }),
  generateGameTurn: jest.fn().mockResolvedValue({
    messages: [{ type: 'narration', text: 'Response', voiceTone: 'calm' }],
    stateUpdates: { eventLog: 'Turn completed' }
  }),
  processPlayerMessage: jest.fn().mockImplementation((_, msg) => Promise.resolve({ text: msg, voiceTone: 'neutral' })),
  classifyAndProcessPlayerInput: jest.fn().mockImplementation((_, rawInput) => Promise.resolve({
    type: 'action',
    processedText: rawInput,
    wasProcessed: false
  })),
  updateHeavyContext: jest.fn().mockResolvedValue({ shouldUpdate: false }),
  generateThemeColors: jest.fn().mockResolvedValue({
    background: '#f5f5f4',
    backgroundSecondary: '#ffffff',
    backgroundAccent: '#e7e5e4',
    text: '#1c1917',
    textSecondary: '#78716c',
    textAccent: '#44403c',
    border: '#d6d3d1',
    borderStrong: '#1c1917',
    buttonPrimary: '#1c1917',
    buttonPrimaryText: '#ffffff',
    buttonSecondary: '#e7e5e4',
    buttonSecondaryText: '#1c1917',
    success: '#166534',
    warning: '#d97706',
    danger: '#dc2626',
    shadow: '#1c1917'
  })
}));

// Mock i18n
jest.mock('../../i18n/locales', () => ({
  getBrowserLanguage: jest.fn().mockReturnValue('en'),
  translations: {
    en: {
      appTitle: 'Test App',
      invalidKey: 'Invalid key',
      gmError: 'Error occurred'
    },
    pt: {
      appTitle: 'Test App PT',
      invalidKey: 'Chave inválida',
      gmError: 'Erro ocorreu'
    },
    es: {
      appTitle: 'Test App ES',
      invalidKey: 'Clave inválida',
      gmError: 'Error ocurrió'
    }
  },
  setLanguageCookie: jest.fn()
}));

// Mock error handler
jest.mock('../../utils/errorHandler', () => ({
  parseOpenAIError: jest.fn().mockReturnValue({
    errorType: 'generic',
    message: 'An error occurred'
  })
}));

// Wrapper component for tests that provides ThemeColorsProvider
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(ThemeColorsProvider, null, children);

// Helper to create mock game state
const createMockGameState = (id: string = 'test-game'): GameState => ({
  id,
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
      description: 'Brave warrior',
      isPlayer: true,
      locationId: 'loc-1',
      stats: { hp: 100 },
      inventory: ['sword'],
      relationships: {},
      state: 'idle'
    }
  },
  locations: {
    'loc-1': {
      id: 'loc-1',
      name: 'Town',
      description: 'A town',
      connectedLocationIds: []
    }
  },
  messages: [
    {
      id: 'msg-1',
      senderId: 'GM',
      text: 'Welcome!',
      type: MessageType.NARRATION,
      timestamp: Date.now()
    }
  ],
  events: [],
  playerCharacterId: 'player-1',
  currentLocationId: 'loc-1'
});

describe('useGameEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    // Reset language mock to default
    const { getBrowserLanguage } = require('../../i18n/locales');
    getBrowserLanguage.mockReturnValue('en');
  });

  describe('initialization', () => {
    it('should initialize with default values', async () => {
      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(result.current.apiKey).toBe('');
        expect(result.current.stories).toEqual([]);
        expect(result.current.currentStoryId).toBeNull();
        expect(result.current.language).toBe('en');
        expect(result.current.isProcessing).toBe(false);
        expect(result.current.isGenerating).toBe(false);
      });
    });

    it('should show API key modal when no key is saved', async () => {
      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(result.current.showApiKeyModal).toBe(true);
      });
    });

    it('should load saved API key from localStorage', async () => {
      localStorageMock.setItem('infinitum_api_key', 'test-api-key');

      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(result.current.apiKey).toBe('test-api-key');
        expect(result.current.showApiKeyModal).toBe(false);
      });
    });

    it('should load games from database on init', async () => {
      const { dbService } = require('../../services/db');
      dbService.loadGames.mockResolvedValueOnce([createMockGameState()]);

      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(dbService.loadGames).toHaveBeenCalled();
        expect(result.current.stories.length).toBe(1);
      });
    });
  });

  describe('language management', () => {
    it('should detect browser language', async () => {
      const { getBrowserLanguage } = require('../../i18n/locales');
      getBrowserLanguage.mockReturnValue('pt');

      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(result.current.language).toBe('pt');
      });
    });

    it('should change language', async () => {
      const { result } = renderHook(() => useGameEngine(), { wrapper });
      const { setLanguageCookie } = require('../../i18n/locales');

      await waitFor(() => {
        expect(result.current.language).toBe('en');
      });

      act(() => {
        result.current.setLanguage('es');
      });

      expect(result.current.language).toBe('es');
      expect(setLanguageCookie).toHaveBeenCalledWith('es');
    });

    it('should return correct translations for language', async () => {
      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(result.current.t.appTitle).toBe('Test App');
      });
    });
  });

  describe('API key management', () => {
    it('should validate and save API key', async () => {
      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await act(async () => {
        await result.current.handleSaveApiKey('valid-api-key');
      });

      expect(result.current.apiKey).toBe('valid-api-key');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('infinitum_api_key', 'valid-api-key');
      expect(result.current.showApiKeyModal).toBe(false);
    });

    it('should show error for invalid API key', async () => {
      const { validateApiKey } = require('../../services/ai/openaiClient');
      validateApiKey.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await act(async () => {
        await result.current.handleSaveApiKey('invalid-key');
      });

      expect(result.current.keyError).toBe('Invalid key');
      expect(result.current.apiKey).toBe('');
    });

    it('should handle logout', async () => {
      localStorageMock.setItem('infinitum_api_key', 'test-key');

      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(result.current.apiKey).toBe('test-key');
      });

      act(() => {
        result.current.handleLogout();
      });

      expect(result.current.apiKey).toBe('');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('infinitum_api_key');
      expect(result.current.showApiKeyModal).toBe(true);
    });
  });

  describe('story management', () => {
    it('should create a new story', async () => {
      localStorageMock.setItem('infinitum_api_key', 'test-key');
      const { dbService } = require('../../services/db');

      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(result.current.apiKey).toBe('test-key');
      });

      await act(async () => {
        await result.current.handleCreateStory({
          universeName: 'Test World',
          universeType: 'original',
          playerName: 'Hero',
          playerDesc: 'Brave',
          startSituation: 'Begin',
          background: 'Unknown',
          memories: 'None'
        });
      });

      expect(dbService.saveGame).toHaveBeenCalled();
      expect(result.current.stories.length).toBe(1);
      expect(result.current.currentStoryId).not.toBeNull();
    });

    it('should select a story', async () => {
      const { dbService } = require('../../services/db');
      dbService.loadGames.mockResolvedValueOnce([createMockGameState('story-1')]);

      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(result.current.stories.length).toBe(1);
      });

      act(() => {
        result.current.setCurrentStoryId('story-1');
      });

      expect(result.current.currentStoryId).toBe('story-1');
    });

    it('should delete a story', async () => {
      const { dbService } = require('../../services/db');
      dbService.loadGames.mockResolvedValueOnce([createMockGameState('story-1')]);

      // Mock window.confirm
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(result.current.stories.length).toBe(1);
      });

      act(() => {
        result.current.setCurrentStoryId('story-1');
      });

      const mockEvent = { stopPropagation: jest.fn() } as any;

      await act(async () => {
        await result.current.handleDeleteStory(mockEvent, 'story-1');
      });

      expect(dbService.deleteGame).toHaveBeenCalledWith('story-1');
      expect(result.current.stories.length).toBe(0);
      expect(result.current.currentStoryId).toBeNull();

      confirmSpy.mockRestore();
    });

    it('should not delete story if not confirmed', async () => {
      const { dbService } = require('../../services/db');
      dbService.loadGames.mockResolvedValueOnce([createMockGameState('story-1')]);

      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(result.current.stories.length).toBe(1);
      });

      const mockEvent = { stopPropagation: jest.fn() } as any;

      await act(async () => {
        await result.current.handleDeleteStory(mockEvent, 'story-1');
      });

      expect(dbService.deleteGame).not.toHaveBeenCalled();
      expect(result.current.stories.length).toBe(1);

      confirmSpy.mockRestore();
    });
  });

  describe('message handling', () => {
    it('should send a message', async () => {
      localStorageMock.setItem('infinitum_api_key', 'test-key');
      const { dbService } = require('../../services/db');
      const mockStory = createMockGameState('story-1');
      dbService.loadGames.mockResolvedValueOnce([mockStory]);
      dbService.loadGame.mockResolvedValue(mockStory);

      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(result.current.stories.length).toBe(1);
      });

      act(() => {
        result.current.setCurrentStoryId('story-1');
        result.current.setInputValue('Hello');
      });

      await act(async () => {
        await result.current.handleSendMessage();
      });

      expect(result.current.inputValue).toBe('');
    });

    it('should not send empty message', async () => {
      localStorageMock.setItem('infinitum_api_key', 'test-key');
      const { generateGameTurn } = require('../../services/ai/openaiClient');

      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(result.current.apiKey).toBe('test-key');
      });

      act(() => {
        result.current.setInputValue('   ');
      });

      await act(async () => {
        await result.current.handleSendMessage();
      });

      expect(generateGameTurn).not.toHaveBeenCalled();
    });

    it('should send direct message', async () => {
      localStorageMock.setItem('infinitum_api_key', 'test-key');
      const { dbService } = require('../../services/db');
      const mockStory = createMockGameState('story-1');
      dbService.loadGames.mockResolvedValueOnce([mockStory]);
      dbService.loadGame.mockResolvedValue(mockStory);

      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(result.current.stories.length).toBe(1);
      });

      act(() => {
        result.current.setCurrentStoryId('story-1');
      });

      await act(async () => {
        await result.current.handleSendMessage('Direct message');
      });

      // Should send the raw text directly to the GM (no rewriting)
      const { processPlayerMessage, generateGameTurn } = require('../../services/ai/openaiClient');
      expect(processPlayerMessage).not.toHaveBeenCalled();
      expect(generateGameTurn).toHaveBeenLastCalledWith(
        expect.any(String),
        'Direct message',
        expect.objectContaining({ id: 'story-1' }),
        expect.any(String),
        undefined,
        expect.any(Boolean) // useTone parameter
      );
    });

    it('should ignore GM messages that impersonate the player', async () => {
      localStorageMock.setItem('infinitum_api_key', 'test-key');
      const { dbService } = require('../../services/db');
      const mockStory = createMockGameState('story-1');
      dbService.loadGames.mockResolvedValueOnce([mockStory]);
      dbService.loadGame.mockResolvedValue(mockStory);

      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(result.current.stories.length).toBe(1);
      });

      act(() => {
        result.current.setCurrentStoryId('story-1');
        result.current.setInputValue('Hello');
      });

      const { generateGameTurn } = require('../../services/ai/openaiClient');
      generateGameTurn.mockResolvedValueOnce({
        messages: [
          { type: 'dialogue', characterName: 'Hero', dialogue: 'AI speaks as the player', voiceTone: 'neutral' },
          { type: 'narration', text: 'GM response', voiceTone: 'calm' }
        ],
        stateUpdates: {}
      });

      await act(async () => {
        await result.current.handleSendMessage();
      });

      await waitFor(() => {
        const updatedStory = result.current.stories.find(s => s.id === 'story-1');
        expect(updatedStory?.messages.some(m => m.text === 'AI speaks as the player')).toBe(false);
        expect(updatedStory?.messages.some(m => m.text === 'GM response')).toBe(true);
      });
    });

    it('should block multilingual attempts to speak as the player', async () => {
      localStorageMock.setItem('infinitum_api_key', 'test-key');
      const { dbService } = require('../../services/db');
      const mockStory = createMockGameState('story-1');
      dbService.loadGames.mockResolvedValueOnce([mockStory]);
      dbService.loadGame.mockResolvedValue(mockStory);

      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(result.current.stories.length).toBe(1);
      });

      act(() => {
        result.current.setCurrentStoryId('story-1');
        result.current.setInputValue('Testing');
      });

      const { generateGameTurn } = require('../../services/ai/openaiClient');
      generateGameTurn.mockResolvedValueOnce({
        messages: [
          { type: 'dialogue', characterName: 'Jogador', dialogue: 'Tentando falar por você', voiceTone: 'neutral' },
          { type: 'dialogue', characterName: 'Sir Hero', dialogue: 'Outra tentativa', voiceTone: 'neutral' },
          { type: 'narration', text: 'O guardião aguarda sua resposta.', voiceTone: 'calm' }
        ],
        stateUpdates: {}
      });

      await act(async () => {
        await result.current.handleSendMessage();
      });

      await waitFor(() => {
        const updatedStory = result.current.stories.find(s => s.id === 'story-1');
        expect(updatedStory?.messages.some(m => m.text === 'Tentando falar por você')).toBe(false);
        expect(updatedStory?.messages.some(m => m.text === 'Outra tentativa')).toBe(false);
        expect(updatedStory?.messages.some(m => m.text === 'O guardião aguarda sua resposta.')).toBe(true);
      });
    });
  });

  describe('voice transcription', () => {
    it('should append transcribed text to input', async () => {
      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(result.current.inputValue).toBe('');
      });

      act(() => {
        result.current.handleVoiceTranscription('Hello');
      });

      expect(result.current.inputValue).toBe('Hello');
    });

    it('should append to existing input', async () => {
      const { result } = renderHook(() => useGameEngine(), { wrapper });

      act(() => {
        result.current.setInputValue('Existing ');
      });

      act(() => {
        result.current.handleVoiceTranscription('new text');
      });

      expect(result.current.inputValue).toBe('Existing  new text');
    });
  });

  describe('export/import', () => {
    let appendChildSpy: jest.SpyInstance;
    let removeChildSpy: jest.SpyInstance;
    let createObjectURLSpy: jest.Mock;
    let revokeObjectURLSpy: jest.Mock;

    beforeEach(() => {
      // Reset dbService mock to default before each test
      const { dbService } = require('../../services/db');
      dbService.validateImport.mockImplementation(() => ({ valid: true }));

      // Mock URL and document methods before each test
      createObjectURLSpy = jest.fn().mockReturnValue('blob:url');
      revokeObjectURLSpy = jest.fn();
      global.URL.createObjectURL = createObjectURLSpy;
      global.URL.revokeObjectURL = revokeObjectURLSpy;

      appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
      removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
    });

    afterEach(() => {
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      // Reset all mocks after each test
      jest.clearAllMocks();
    });

    it('should export journey', async () => {
      localStorageMock.setItem('infinitum_api_key', 'test-key');
      const { dbService } = require('../../services/db');
      const mockStory = createMockGameState('story-1');
      dbService.loadGames.mockResolvedValueOnce([mockStory]);

      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(result.current.stories.length).toBe(1);
      });

      act(() => {
        result.current.setCurrentStoryId('story-1');
      });

      await act(async () => {
        await result.current.handleExportJourney();
      });

      expect(dbService.exportGame).toHaveBeenCalledWith('story-1');
      expect(createObjectURLSpy).toHaveBeenCalled();
    });

    it('should import journey', async () => {
      const { dbService } = require('../../services/db');

      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      const fileContent = JSON.stringify({
        version: 1,
        exportedAt: Date.now(),
        game: createMockGameState('imported')
      });

      // Create a mock file with text() method
      const mockFile = {
        text: jest.fn().mockResolvedValue(fileContent),
        name: 'journey.json',
        type: 'application/json'
      } as unknown as File;

      let importResult: any;
      await act(async () => {
        importResult = await result.current.handleImportJourney(mockFile);
      });

      expect(importResult.success).toBe(true);
      expect(dbService.importGame).toHaveBeenCalled();
    });

    it('should handle invalid import file', async () => {
      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      // Create a mock file with text() method that returns invalid JSON
      // This will make JSON.parse fail, which should return format error
      const mockFile = {
        text: jest.fn().mockResolvedValue('invalid json content'),
        name: 'bad.json',
        type: 'application/json'
      } as unknown as File;

      let importResult: any;
      await act(async () => {
        importResult = await result.current.handleImportJourney(mockFile);
      });

      // JSON.parse fails, so validateImport is never called
      // The error is caught and returned as 'format'
      expect(importResult.success).toBe(false);
      expect(importResult.error).toBe('format');
    });

    it('should handle version mismatch on import', async () => {
      const { dbService } = require('../../services/db');

      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      const fileContent = JSON.stringify({
        version: 999,
        exportedAt: Date.now(),
        game: {
          id: 'test',
          title: 'Test',
          config: {},
          playerCharacterId: 'p1',
          currentLocationId: 'l1',
          characters: {},
          locations: {},
          messages: []
        }
      });

      // Create a mock file with text() method
      const mockFile = {
        text: jest.fn().mockResolvedValue(fileContent),
        name: 'journey.json',
        type: 'application/json'
      } as unknown as File;

      // Set up the mock RIGHT BEFORE calling handleImportJourney
      dbService.validateImport.mockReturnValueOnce({ valid: false, error: 'version' });

      let importResult: any;
      await act(async () => {
        importResult = await result.current.handleImportJourney(mockFile);
      });

      // Verify the mock was called
      expect(dbService.validateImport).toHaveBeenCalled();
      expect(importResult.success).toBe(false);
      expect(importResult.error).toBe('version');
    });
  });

  describe('error handling', () => {
    it('should close error modal', async () => {
      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      act(() => {
        result.current.closeErrorModal();
      });

      expect(result.current.showErrorModal).toBe(false);
      expect(result.current.errorMessage).toBe('');
    });
  });

  describe('active story helpers', () => {
    it('should return active story and player', async () => {
      const { dbService } = require('../../services/db');
      const mockStory = createMockGameState('story-1');
      dbService.loadGames.mockResolvedValueOnce([mockStory]);
      dbService.loadGame.mockResolvedValue(mockStory);

      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(result.current.stories.length).toBe(1);
      });

      act(() => {
        result.current.setCurrentStoryId('story-1');
      });

      await waitFor(() => {
        expect(result.current.activeStory).toBeDefined();
        expect(result.current.activeStory?.id).toBe('story-1');
      });
    });

    it('should return undefined for activeStory when no story selected', async () => {
      const { result } = renderHook(() => useGameEngine(), { wrapper });

      await waitFor(() => {
        expect(result.current.activeStory).toBeUndefined();
        expect(result.current.player).toBeNull();
      });
    });
  });
});
