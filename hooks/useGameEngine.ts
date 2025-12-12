import React, { useState, useEffect, useRef } from 'react';
import { GameState, ChatMessage, MessageType, Language, Character, FateResult, HeavyContext, GMResponseMessage, ThemeColors, DEFAULT_THEME_COLORS, GridSnapshot } from '../types';
import { TTSVoice } from '../utils/ai';
import { sanitizeMessages } from '../utils/messages';
import { generateGameTurn, initializeStory, validateApiKey, processPlayerMessage, updateHeavyContext, classifyAndProcessPlayerInput, StoryInitializationResult, generateThemeColors, generateLocationBackground, updateGridPositions, createInitialGridSnapshot } from '../services/ai/openaiClient';
import { dbService, ExportedGameData } from '../services/db';
import { getBrowserLanguage, translations, setLanguageCookie } from '../i18n/locales';
import { parseOpenAIError } from '../utils/errorHandler';
import { ErrorType } from '../components/ErrorModal';
import { migrateGameState, needsMigration } from '../utils/migration';
import { DEFAULT_PLAYER_STATS, getStartingGold } from '../constants/economy';
import { useThemeColors } from './useThemeColors';

// Creation phase type for progress tracking
export type CreationPhase =
  | 'initializing'
  | 'colors'
  | 'world'
  | 'characters'
  | 'avatar'
  | 'finalizing'
  | null;

// Processing phase type for message progress tracking
export type ProcessingPhase =
  | 'classifying'
  | 'generating'
  | 'updating'
  | null;

/**
 * Interface for the Game Engine hook return value.
 * Exposes only what the View needs to render or trigger.
 */
interface UseGameEngineReturn {
  apiKey: string;
  setApiKey: (key: string) => void;
  stories: GameState[];
  currentStoryId: string | null;
  setCurrentStoryId: (id: string | null) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  isProcessing: boolean;
  isGenerating: boolean;
  isUpdatingContext: boolean; // True while heavy context is being updated
  showApiKeyModal: boolean;
  setShowApiKeyModal: (show: boolean) => void;
  keyError: string;
  validating: boolean;
  t: Record<string, string>;

  // Error Modal State
  showErrorModal: boolean;
  errorType: ErrorType;
  errorMessage: string;
  closeErrorModal: () => void;

  // Actions
  handleSendMessage: (directMessage?: string, fateResult?: FateResult) => Promise<void>;
  handleCreateStory: (config: any) => Promise<void>;
  handleDeleteStory: (e: React.MouseEvent, id: string) => Promise<void>;
  handleSaveApiKey: (key: string) => Promise<void>;
  handleLogout: () => void;
  handleVoiceTranscription: (text: string) => void;
  handleExportJourney: () => Promise<void>;
  handleImportJourney: (file: File) => Promise<{ success: boolean; error?: string }>;

  // Helpers
  activeStory: GameState | undefined;
  player: Character | null | undefined;

  // Voice Settings
  selectedVoice: TTSVoice;
  setSelectedVoice: (voice: TTSVoice) => void;
  useTone: boolean;
  setUseTone: (useTone: boolean) => void;

  // Theme Colors
  regenerateThemeColors: (userConsiderations?: string) => Promise<void>;
  isGeneratingColors: boolean;

  // Location Background
  isGeneratingBackground: boolean;
  backgroundLocationName: string;

  // Creation Progress
  creationPhase: CreationPhase;

  // Processing Progress
  processingPhase: ProcessingPhase;

  // Viewed Cards - Track which cards have been displayed with typewriter
  markCardAsViewed: (messageId: string) => void;
}

const stripDiacritics = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const normalizeSpeakerName = (value?: string | null) => {
  if (!value) return '';
  return stripDiacritics(value)
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .toLowerCase()
    .trim();
};

/**
 * Finds a character by name using fuzzy matching.
 * Tries exact match first, then partial/fuzzy matches.
 * @param characters - Record of all characters
 * @param charName - Name to search for
 * @returns Found character or undefined
 */
const findCharacterByName = (
  characters: Record<string, Character>,
  charName: string
): Character | undefined => {
  if (!charName) return undefined;

  const normalizedSearch = normalizeSpeakerName(charName);
  const charArray = Object.values(characters);

  // 1. Exact match (case insensitive)
  let found = charArray.find(c =>
    c.name.toLowerCase() === charName.toLowerCase()
  );
  if (found) return found;

  // 2. Normalized match (ignoring accents/special chars)
  found = charArray.find(c =>
    normalizeSpeakerName(c.name) === normalizedSearch
  );
  if (found) return found;

  // 3. Partial match - search name contains character name or vice versa
  found = charArray.find(c => {
    const normalizedCharName = normalizeSpeakerName(c.name);
    return normalizedCharName.includes(normalizedSearch) ||
           normalizedSearch.includes(normalizedCharName);
  });
  if (found) return found;

  // 4. Word-based match - any significant word matches
  const searchWords = normalizedSearch.split(/\s+/).filter(w => w.length > 2);
  if (searchWords.length > 0) {
    found = charArray.find(c => {
      const charWords = normalizeSpeakerName(c.name).split(/\s+/).filter(w => w.length > 2);
      return searchWords.some(sw => charWords.some(cw => cw === sw || cw.includes(sw) || sw.includes(cw)));
    });
  }

  return found;
};

const BASE_PROHIBITED_SPEAKERS = [
  'player',
  'the player',
  'you',
  'yourself',
  'jogador',
  'jogadora',
  'o jogador',
  'a jogadora',
  'tu',
  'tú',
  'voce',
  'você',
  'usted',
  'ustedes',
  'jugador',
  'jugadora',
  'el jugador',
  'la jugadora'
].map(normalizeSpeakerName);

export const useGameEngine = (): UseGameEngineReturn => {
  const [apiKey, setApiKey] = useState<string>('');
  const [stories, setStories] = useState<GameState[]>([]);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUpdatingContext, setIsUpdatingContext] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [validating, setValidating] = useState(false);
  const [keyError, setKeyError] = useState('');

  // Error Modal State
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorType, setErrorType] = useState<ErrorType>('generic');
  const [errorMessage, setErrorMessage] = useState('');

  // Voice Settings
  const [selectedVoice, setSelectedVoiceState] = useState<TTSVoice>('coral');
  const [useTone, setUseToneState] = useState<boolean>(true);

  // Theme Colors
  const { setColors, setIsGenerating: setIsGeneratingColors, isGenerating: isGeneratingColors } = useThemeColors();

  // Location Background
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
  const [backgroundLocationName, setBackgroundLocationName] = useState('');
  const generatingBackgroundRef = useRef<Set<string>>(new Set()); // Track which locations are currently generating

  // Creation Progress
  const [creationPhase, setCreationPhase] = useState<CreationPhase>(null);

  // Processing Progress
  const [processingPhase, setProcessingPhase] = useState<ProcessingPhase>(null);

  const loadingStoryRef = useRef<string | null>(null);
  const loadedStoriesRef = useRef<Set<string>>(new Set());
  const storiesRef = useRef<GameState[]>([]); // Ref to access stories without re-triggering effects
  const t = translations[language];

  // Keep storiesRef in sync with stories state
  storiesRef.current = stories;

  /**
   * Shows the error modal with the appropriate error type.
   */
  const showError = (error: any) => {
    const parsed = parseOpenAIError(error);
    setErrorType(parsed.errorType);
    setErrorMessage(parsed.message || '');
    setShowErrorModal(true);
  };

  const closeErrorModal = () => {
    setShowErrorModal(false);
    setErrorMessage('');
  };

  // Initialization
  useEffect(() => {
    const init = async () => {
      const detected = getBrowserLanguage();
      setLanguage(detected);

      const savedApiKey = localStorage.getItem('infinitum_api_key');
      if (savedApiKey) setApiKey(savedApiKey);
      else setShowApiKeyModal(true);

      // Load voice preference
      const savedVoice = localStorage.getItem('infinitum_tts_voice') as TTSVoice | null;
      if (savedVoice) setSelectedVoiceState(savedVoice);

      // Load tone preference (default true for backwards compatibility)
      const savedUseTone = localStorage.getItem('infinitum_tts_use_tone');
      if (savedUseTone !== null) setUseToneState(savedUseTone === 'true');

      const loadedStories = await dbService.loadGames();
      setStories(loadedStories);
    };
    init();
  }, []);

  // Load full story data when selecting a story
  useEffect(() => {
    const loadFullStory = async () => {
      if (!currentStoryId) return;

      // Skip if this story was already fully loaded
      if (loadedStoriesRef.current.has(currentStoryId)) return;

      // Skip if already loading this story (prevents race condition)
      if (loadingStoryRef.current === currentStoryId) return;

      // Check if story already has messages loaded in current state (use ref to avoid stale closure)
      const currentStory = storiesRef.current.find(s => s.id === currentStoryId);
      if (currentStory && currentStory.messages.length > 0) {
        loadedStoriesRef.current.add(currentStoryId);
        return;
      }

      // Mark as loading to prevent duplicate loads
      loadingStoryRef.current = currentStoryId;

      try {
        // Load full story from DB
        let fullStory = await dbService.loadGame(currentStoryId);

        // Only update if we're still on the same story
        if (fullStory && loadingStoryRef.current === currentStoryId) {
          // Check if migration is needed (legacy string[] inventory to Item[])
          if (needsMigration(fullStory)) {
            console.log(`[Migration] Game "${fullStory.title}" needs migration...`);
            const { migrated, changes, gameState } = migrateGameState(fullStory);
            if (migrated) {
              console.log('[Migration] Changes applied:', changes);
              fullStory = gameState;
              // Save migrated state back to DB
              await dbService.saveGame(fullStory);
            }
          }

          loadedStoriesRef.current.add(currentStoryId);
          // Merge: preserve any messages added to state during loading, then add DB messages
          setStories(prev => prev.map(s => {
            if (s.id !== currentStoryId) return s;

            // Get IDs of messages already in state (may have been added during loading)
            const stateMessageIds = new Set(s.messages.map(m => m.id));

            // Filter DB messages to exclude any that are already in state
            const dbMessagesNotInState = fullStory.messages.filter(m => !stateMessageIds.has(m.id));

            // Combine state + DB messages, then sanitize to remove accidental duplicates
            const mergedMessages = sanitizeMessages([
              ...s.messages,
              ...dbMessagesNotInState
            ]);

            return {
              ...fullStory,
              messages: mergedMessages
            };
          }));
        }
      } finally {
        // Clear loading state
        if (loadingStoryRef.current === currentStoryId) {
          loadingStoryRef.current = null;
        }
      }
    };

    loadFullStory();
  }, [currentStoryId]); // Removed 'stories' dependency to prevent re-triggering on every message


  // Apply theme colors when active story changes
  useEffect(() => {
    const activeStory = stories.find(s => s.id === currentStoryId);
    if (activeStory?.themeColors) {
      setColors(activeStory.themeColors);
    } else if (!currentStoryId) {
      // Reset to default when no story is selected
      setColors(DEFAULT_THEME_COLORS);
    }
  }, [currentStoryId, stories, setColors]);

  // Generate location background when location changes
  useEffect(() => {
    const generateBackgroundIfNeeded = async () => {
      if (!currentStoryId || !apiKey) return;

      const activeStory = stories.find(s => s.id === currentStoryId);
      if (!activeStory) return;

      const currentLocation = activeStory.locations[activeStory.currentLocationId];
      if (!currentLocation) return;

      // Skip if already has background image
      if (currentLocation.backgroundImage) return;

      // Skip if already generating for this location
      if (generatingBackgroundRef.current.has(currentLocation.id)) return;

      // Mark as generating
      generatingBackgroundRef.current.add(currentLocation.id);
      setIsGeneratingBackground(true);
      setBackgroundLocationName(currentLocation.name);

      try {
        const backgroundImage = await generateLocationBackground(
          apiKey,
          currentLocation.name,
          currentLocation.description,
          activeStory.config.universeName,
          activeStory.config.visualStyle
        );

        if (backgroundImage) {
          // Update the location with the generated background
          setStories(prevStories => {
            const storyIndex = prevStories.findIndex(s => s.id === currentStoryId);
            if (storyIndex === -1) return prevStories;

            const story = prevStories[storyIndex];
            const updatedLocation = {
              ...story.locations[currentLocation.id],
              backgroundImage
            };

            const updatedStory = {
              ...story,
              locations: {
                ...story.locations,
                [currentLocation.id]: updatedLocation
              }
            };

            // Save to DB
            dbService.saveGame(updatedStory).catch(e => console.error("Background save failed", e));

            const newStories = [...prevStories];
            newStories[storyIndex] = updatedStory;
            return newStories;
          });
        }
      } catch (error) {
        console.error("Failed to generate location background:", error);
      } finally {
        generatingBackgroundRef.current.delete(currentLocation.id);
        setIsGeneratingBackground(false);
        setBackgroundLocationName('');
      }
    };

    generateBackgroundIfNeeded();
  }, [currentStoryId, stories, apiKey]);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setLanguageCookie(lang);
  };

  /**
   * Updates the selected TTS voice and persists to localStorage.
   */
  const setSelectedVoice = (voice: TTSVoice) => {
    setSelectedVoiceState(voice);
    localStorage.setItem('infinitum_tts_voice', voice);
  };

  /**
   * Updates the useTone setting and persists to localStorage.
   * When false, uses tts-1 model without tone instructions.
   * When true, uses gpt-4o-mini-tts with tone instructions.
   */
  const setUseTone = (value: boolean) => {
    setUseToneState(value);
    localStorage.setItem('infinitum_tts_use_tone', String(value));
  };

  /**
   * Persists state changes to IndexedDB immediately after React state updates.
   * Automatically deduplicates messages to prevent duplicates from entering state.
   */
  const safeUpdateStory = (updater: (s: GameState) => GameState) => {
    setStories(prevStories => {
      const index = prevStories.findIndex(s => s.id === currentStoryId);
      if (index === -1) return prevStories;

      const oldStory = prevStories[index];
      const newStory = updater(oldStory);

      // Ensure the message timeline stays normalized
      const sanitizedStory = {
        ...newStory,
        messages: sanitizeMessages(newStory.messages)
      };

      const newStories = [...prevStories];
      newStories[index] = sanitizedStory;

      dbService.saveGame(sanitizedStory).catch(e => console.error("Auto-save failed", e));
      return newStories;
    });
  };

  const handleCreateStory = async (config: any) => {
    if (!apiKey) return;
    setIsGenerating(true);
    setIsGeneratingColors(true);
    setCreationPhase('initializing');

    try {
      // Phase 1: Colors - Start colors generation
      setCreationPhase('colors');

      // Run story initialization and theme colors generation in parallel
      // But show progress phases sequentially for better UX
      const colorsPromise = generateThemeColors(apiKey, {
        universeName: config.universeName,
        universeType: config.universeType as 'original' | 'existing',
        genre: config.genre,
        visualStyle: config.visualStyle,
        language
      });

      // Phase 2: World - Start story initialization (runs parallel with colors)
      setCreationPhase('world');
      const initPromise = initializeStory(apiKey, config, language);

      // Wait for colors first
      const themeColors = await colorsPromise;
      setIsGeneratingColors(false);
      setColors(themeColors);

      // Phase 3: Characters
      setCreationPhase('characters');

      // Wait for story initialization
      const initResult = await initPromise;

      // Phase 4: Avatar generation happens inside initializeStory
      setCreationPhase('avatar');
      // Small delay to show avatar phase
      await new Promise(resolve => setTimeout(resolve, 500));

      // Phase 5: Finalizing
      setCreationPhase('finalizing');

      // Extract GM response and universe context from result
      const initResponse = initResult.gmResponse;
      const universeContext = initResult.universeContext;

      console.log(`[Universe Context] Generated ${universeContext.length} characters of narrative context`);

      const newStoryId = Date.now().toString();

      // Robust extraction: Handle cases where AI returns slightly different names or empty lists
      const generatedCharacters = initResponse.stateUpdates.newCharacters || [];
      const generatedLocations = initResponse.stateUpdates.newLocations || [];

      // 1. Resolve Initial Location
      let initialLocation = generatedLocations[0];
      if (!initialLocation) {
        // Fallback if AI failed to create a room
        initialLocation = {
           id: 'start_fallback',
           name: 'Starting Point',
           description: 'You stand at the beginning of your journey. The world is forming around you.',
           connectedLocationIds: []
        };
        generatedLocations.push(initialLocation);
      }

      // 2. Resolve Player Character
      // Fuzzy match name OR take the first character if list is small, OR create fallback
      let playerChar = generatedCharacters.find((c: any) => 
         c.name.toLowerCase().includes(config.playerName.toLowerCase())
      );
      
      if (!playerChar && generatedCharacters.length > 0) {
        // Assume the first created character is the player if name doesn't match
        playerChar = generatedCharacters[0];
      }

      if (!playerChar) {
        // Fallback creation with default stats including gold
        const startingGold = getStartingGold(config.universeName);
        playerChar = {
          id: 'player_fallback',
          name: config.playerName,
          description: config.playerDesc,
          isPlayer: true,
          locationId: initialLocation.id,
          stats: {
            hp: DEFAULT_PLAYER_STATS.hp,
            maxHp: DEFAULT_PLAYER_STATS.maxHp,
            gold: startingGold
          },
          inventory: [],
          relationships: {},
          state: 'idle'
        };
        generatedCharacters.push(playerChar);
      }

      // Ensure linkage is correct
      playerChar.isPlayer = true;
      playerChar.locationId = initialLocation.id;
      // Assign random color if missing
      if (!playerChar.avatarColor) playerChar.avatarColor = '#57534e';

      // 3. Construct Runtime State Maps
      const charsMap: Record<string, Character> = {};
      generatedCharacters.forEach((c: any) => charsMap[c.id] = c);

      const locsMap: Record<string, any> = {};
      generatedLocations.forEach((l: any) => locsMap[l.id] = l);

      const newState: GameState = {
        id: newStoryId,
        title: `${config.universeName} - ${config.playerName}`,
        turnCount: 0,
        lastPlayed: Date.now(),
        config: { ...config, language },
        playerCharacterId: playerChar.id,
        currentLocationId: initialLocation.id,
        characters: charsMap,
        locations: locsMap,
        messages: [],
        events: [],
        universeContext, // Store the generated universe narrative context
        themeColors, // Store the generated theme colors
        gridSnapshots: [] // Initialize empty grid snapshots array
      };

      // 4. Populate Initial Messages (support both old and new format)
      const newMessages: ChatMessage[] = (initResponse.messages || []).map((m: any, idx: number) => {
        let messageText = '';
        let senderId = 'GM';
        let messageType = MessageType.NARRATION;

        if (m.type === 'system') {
          messageType = MessageType.SYSTEM;
          senderId = 'SYSTEM';
          messageText = m.text || '';
        } else if (m.type === 'dialogue') {
          messageType = MessageType.DIALOGUE;
          // Support both old format (senderName/text) and new format (characterName/dialogue)
          const charName = m.characterName || m.senderName;
          messageText = m.dialogue || m.text || '';

          // Try to find character in the newly created characters using fuzzy matching
          if (charName && charName !== 'Narrator') {
            // Convert array to record temporarily for findCharacterByName
            const charsRecord: Record<string, Character> = {};
            generatedCharacters.forEach((c: any) => { charsRecord[c.id] = c; });
            const char = findCharacterByName(charsRecord, charName);
            if (char) {
              senderId = char.id;
            } else {
              // Character not found - use charName as senderId so it displays correctly
              console.warn(`[Story Init] Character "${charName}" not found, using name as senderId`);
              senderId = charName;
            }
          }
        } else {
          // Narration
          messageType = MessageType.NARRATION;
          senderId = 'GM';
          messageText = m.text || '';
        }

        return {
          id: `${Date.now()}_${idx}`,
          senderId,
          text: messageText,
          type: messageType,
          timestamp: Date.now(),
          pageNumber: idx + 1,
          voiceTone: m.voiceTone || 'neutral'
        };
      });

      // Add a fallback intro message if AI returned none
      if (newMessages.length === 0) {
        newMessages.push({
          id: `${Date.now()}_intro`,
          senderId: 'GM',
          text: initialLocation.description,
          type: MessageType.NARRATION,
          timestamp: Date.now(),
          pageNumber: newMessages.length + 1,
          voiceTone: 'mysterious'
        });
      }

      newState.messages = sanitizeMessages(newMessages);

      // Create initial grid snapshot for the new story
      const initialGridSnapshot = createInitialGridSnapshot(newState, newMessages.length);
      newState.gridSnapshots = [initialGridSnapshot];
      console.log('[Grid] Created initial grid snapshot for new story');

      await dbService.saveGame(newState);
      loadedStoriesRef.current.add(newStoryId);
      setStories(prev => [...prev, newState]);
      setCurrentStoryId(newStoryId);
      setIsGenerating(false);
      setCreationPhase(null);

    } catch (e: any) {
      console.error("Creation Error:", e);
      showError(e);
      setIsGenerating(false);
      setIsGeneratingColors(false);
      setCreationPhase(null);
    }
  };

  /**
   * Regenerates theme colors for the active story with optional user considerations.
   * Used for the "retry" feature on the options screen.
   */
  const regenerateThemeColors = async (userConsiderations?: string) => {
    if (!apiKey || !currentStoryId) return;

    const activeStory = stories.find(s => s.id === currentStoryId);
    if (!activeStory) return;

    setIsGeneratingColors(true);

    try {
      const newColors = await generateThemeColors(apiKey, {
        universeName: activeStory.config.universeName,
        universeType: activeStory.config.universeType,
        genre: activeStory.config.genre,
        visualStyle: activeStory.config.visualStyle,
        userConsiderations,
        language: activeStory.config.language || language
      });

      // Apply the new colors immediately
      setColors(newColors);

      // Update the story state with new colors
      safeUpdateStory(s => ({
        ...s,
        themeColors: newColors
      }));

      console.log('[Theme Colors] Regenerated successfully with user considerations');
    } catch (e: any) {
      console.error("Color regeneration failed:", e);
      // Don't show error modal for color regeneration - non-critical
    } finally {
      setIsGeneratingColors(false);
    }
  };

  const handleSendMessage = async (directMessage?: string, fateResult?: FateResult) => {
    const rawText = directMessage || inputValue;
    if (!rawText.trim() || !apiKey || !currentStoryId || isProcessing || isUpdatingContext) return;

    setInputValue('');
    setIsProcessing(true);
    setProcessingPhase('classifying');

    try {
      const currentStoryRef = stories.find(s => s.id === currentStoryId);
      if (!currentStoryRef) return;

      const storyLang = currentStoryRef.config.language || language;

      // 1. Classify and process the player's input (action vs speech)
      // Uses GPT-4.1-nano to identify if it's an action (keep as-is) or speech (rewrite)
      const classified = await classifyAndProcessPlayerInput(
        apiKey,
        rawText,
        currentStoryRef,
        storyLang
      );

      console.log(`[Text Classification] Type: ${classified.type}, Processed: ${classified.wasProcessed}`);
      if (classified.wasProcessed) {
        console.log(`[Text Classification] Original: "${rawText}" -> Processed: "${classified.processedText}"`);
      }

      // 2. Use the processed text for the player message
      const finalText = classified.processedText;

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        senderId: currentStoryRef.playerCharacterId,
        text: finalText,
        type: MessageType.DIALOGUE,
        timestamp: Date.now(),
        pageNumber: currentStoryRef.messages.length + 1,
        voiceTone: 'neutral'
      };

      safeUpdateStory(s => ({
        ...s,
        messages: [...s.messages, userMsg]
      }));

      // 3. Build context with the processed player message for game turn
      const contextStory = {
        ...currentStoryRef,
        messages: [...currentStoryRef.messages, userMsg]
      };

      // 4. Generate game turn response based on the processed input
      setProcessingPhase('generating');
      const response = await generateGameTurn(apiKey, finalText, contextStory, storyLang, fateResult, useTone);

      // 5. Logic & State Resolution
      safeUpdateStory(prev => {
        const next = { ...prev };
        next.turnCount += 1;
        next.lastPlayed = Date.now();

        if (response.stateUpdates.newLocations) {
          response.stateUpdates.newLocations.forEach(l => next.locations[l.id] = l);
        }

        if (response.stateUpdates.newCharacters) {
          response.stateUpdates.newCharacters.forEach(c => {
             const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
             // Preserve stats from AI response or use defaults for NPCs
             const defaultNpcStats = { hp: 100, maxHp: 100, gold: 0 };
             next.characters[c.id] = {
               ...c,
               isPlayer: false,
               inventory: c.inventory || [],
               relationships: c.relationships || {},
               stats: (c.stats && Object.keys(c.stats).length > 0) ? c.stats : defaultNpcStats,
               avatarColor: c.avatarColor || colors[Math.floor(Math.random() * colors.length)]
             };
          });
        }

        if (response.stateUpdates.updatedCharacters) {
           response.stateUpdates.updatedCharacters.forEach(u => {
             if (u.id && next.characters[u.id]) {
               const existing = next.characters[u.id];
               next.characters[u.id] = {
                 ...existing,
                 ...u,
                 stats: u.stats ? { ...existing.stats, ...u.stats } : existing.stats,
                 relationships: u.relationships ? { ...existing.relationships, ...u.relationships } : existing.relationships,
                 inventory: u.inventory !== undefined ? u.inventory : existing.inventory
               };
             }
           });
        }

        if (response.stateUpdates.locationChange) {
          next.currentLocationId = response.stateUpdates.locationChange;
        }

        const playerCharacter = next.characters[next.playerCharacterId];
        const normalizedPlayerName = normalizeSpeakerName(playerCharacter?.name);
        const playerNameTokens = normalizedPlayerName ? normalizedPlayerName.split(/\s+/).filter(Boolean) : [];
        const dynamicForbidden = new Set<string>(BASE_PROHIBITED_SPEAKERS);
        if (normalizedPlayerName) {
          dynamicForbidden.add(normalizedPlayerName);
        }
        playerNameTokens.forEach(token => dynamicForbidden.add(token));
        const significantTokens = playerNameTokens.filter(token => token.length > 2);

        const isForbiddenSpeaker = (speaker?: string | null) => {
          const normalizedSpeaker = normalizeSpeakerName(speaker);
          if (!normalizedSpeaker) return false;
          if (dynamicForbidden.has(normalizedSpeaker)) return true;
          if (
            normalizedPlayerName &&
            (normalizedSpeaker.includes(normalizedPlayerName) || normalizedPlayerName.includes(normalizedSpeaker))
          ) {
            return true;
          }
          if (significantTokens.some(token => normalizedSpeaker.includes(token) || token.includes(normalizedSpeaker))) {
            return true;
          }
          return false;
        };

        const filteredMessages = (response.messages || []).filter((m: GMResponseMessage) => {
          if (m.type !== 'dialogue') return true;
          const speakerName = m.characterName || (m as any).senderName;
          if (isForbiddenSpeaker(speakerName)) {
            console.warn('[Player Agency] Blocked AI dialogue from:', speakerName);
            return false;
          }
          return true;
        });

        const startingPage = next.messages.length;

        // Transform GMResponseMessage to ChatMessage
        const botMessages: ChatMessage[] = filteredMessages.map((m: GMResponseMessage, idx: number) => {
          let sId = 'GM';
          let mType = MessageType.NARRATION;
          let messageText = '';

          if (m.type === 'system') {
            // System message - use text field
            mType = MessageType.SYSTEM;
            sId = 'SYSTEM';
            messageText = m.text || '';
          } else if (m.type === 'dialogue') {
            // Dialogue message - use characterName and dialogue fields
            mType = MessageType.DIALOGUE;
            const charName = m.characterName || '';
            messageText = m.dialogue || m.text || '';

            // Find character by name using fuzzy matching
            const char = findCharacterByName(next.characters, charName);
            if (char) {
              sId = char.id;
            } else if (charName) {
              // Character not found but we have a name - log warning but use charName as fallback
              console.warn(`[Character Lookup] Character "${charName}" not found in characters map, using name as senderId`);
              sId = charName; // Use the character name as senderId so it displays correctly
            } else {
              sId = 'GM';
            }
          } else {
            // Narration message - use text field
            mType = MessageType.NARRATION;
            sId = 'GM';
            messageText = m.text || '';
          }

          return {
            id: `${Date.now()}_bot_${idx}`,
            senderId: sId,
            text: messageText,
            type: mType,
            timestamp: Date.now() + (idx * 100),
            pageNumber: startingPage + idx + 1,
            voiceTone: m.voiceTone || 'neutral'
          };
        });

        next.messages = [...next.messages, ...botMessages];
        return next;
      });

      // 6. Update Heavy Context (blocks UI until complete)
      // Use contextStory which has the state before the action + the response which has what happened
      setIsUpdatingContext(true);
      setProcessingPhase('updating');
      try {
        const contextUpdate = await updateHeavyContext(
          apiKey,
          contextStory,
          response,
          storyLang
        );

        // Only update if there are meaningful changes
        if (contextUpdate.shouldUpdate && contextUpdate.newContext) {
          safeUpdateStory(prev => ({
            ...prev,
            heavyContext: contextUpdate.newContext
          }));
        }
      } catch (contextErr) {
        // Log error but don't block the game - heavy context update is non-critical
        console.error("Heavy context update failed:", contextErr);
      } finally {
        setIsUpdatingContext(false);
      }

      // 7. Update Grid Positions (runs in background, non-blocking)
      try {
        // Get the latest message number after the response was added
        const latestStory = storiesRef.current.find(s => s.id === currentStoryId);
        const currentMessageNumber = latestStory ? latestStory.messages.length : contextStory.messages.length + (response.messages?.length || 0);

        // Check if this is the first grid snapshot or if we need to update
        const hasGridSnapshots = latestStory?.gridSnapshots && latestStory.gridSnapshots.length > 0;

        if (!hasGridSnapshots) {
          // Create initial grid snapshot
          const initialSnapshot = createInitialGridSnapshot(
            latestStory || contextStory,
            currentMessageNumber
          );
          safeUpdateStory(prev => ({
            ...prev,
            gridSnapshots: [...(prev.gridSnapshots || []), initialSnapshot]
          }));
          console.log('[Grid] Created initial grid snapshot');
        } else {
          // Try to update grid positions based on recent events
          const gridResult = await updateGridPositions(
            apiKey,
            latestStory || contextStory,
            response,
            storyLang,
            currentMessageNumber
          );

          if (gridResult.updated && gridResult.snapshot) {
            safeUpdateStory(prev => ({
              ...prev,
              gridSnapshots: [...(prev.gridSnapshots || []), gridResult.snapshot!]
            }));
          }
        }
      } catch (gridErr) {
        // Log error but don't block the game - grid update is non-critical
        console.error("Grid update failed:", gridErr);
      }

    } catch (err: any) {
      console.error(err);

      // Check if it's a quota/billing error - show modal
      const parsed = parseOpenAIError(err);
      if (parsed.errorType === 'insufficient_quota' || parsed.errorType === 'invalid_key') {
        showError(err);
      } else {
        // For other errors, show in-game message
        safeUpdateStory(s => ({
          ...s,
          messages: [...s.messages, {
            id: Date.now().toString(),
            senderId: 'GM',
            text: t.gmError,
            type: MessageType.SYSTEM,
            timestamp: Date.now(),
            pageNumber: s.messages.length + 1,
          }]
        }));
      }
    } finally {
      setIsProcessing(false);
      setProcessingPhase(null);
    }
  };

  const handleDeleteStory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("DELETE RECORD?")) {
      await dbService.deleteGame(id);
      loadedStoriesRef.current.delete(id);
      setStories(prev => prev.filter(s => s.id !== id));
      if (currentStoryId === id) setCurrentStoryId(null);
    }
  };

  const handleSaveApiKey = async (key: string) => {
    setValidating(true);
    setKeyError('');

    try {
      const isValid = await validateApiKey(key);
      setValidating(false);

      if (isValid) {
        setApiKey(key);
        localStorage.setItem('infinitum_api_key', key);
        setShowApiKeyModal(false);
      } else {
        setKeyError(t.invalidKey);
      }
    } catch (err: any) {
      setValidating(false);
      // Check for quota error during validation
      const parsed = parseOpenAIError(err);
      if (parsed.errorType === 'insufficient_quota') {
        // Save the key anyway but show quota error
        setApiKey(key);
        localStorage.setItem('infinitum_api_key', key);
        setShowApiKeyModal(false);
        showError(err);
      } else {
        setKeyError(t.invalidKey);
      }
    }
  };

  const handleLogout = () => {
    setApiKey('');
    localStorage.removeItem('infinitum_api_key');
    setShowApiKeyModal(true);
  }

  const handleVoiceTranscription = (text: string) => {
    setInputValue(prev => prev ? `${prev} ${text}` : text);
  }

  /**
   * Exports the current active story as a JSON file download.
   */
  const handleExportJourney = async () => {
    if (!currentStoryId) return;

    const exportData = await dbService.exportGame(currentStoryId);
    if (!exportData) return;

    const activeStoryData = stories.find(s => s.id === currentStoryId);
    const fileName = `infinitum_${activeStoryData?.title.replace(/[^a-zA-Z0-9]/g, '_') || 'journey'}_${Date.now()}.json`;

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Imports a journey from a JSON file.
   */
  const handleImportJourney = async (file: File): Promise<{ success: boolean; error?: string }> => {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportedGameData;

      const validation = dbService.validateImport(data);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error === 'version' ? 'version' : 'format'
        };
      }

      const newId = await dbService.importGame(data);

      // Reload stories list
      const loadedStories = await dbService.loadGames();
      setStories(loadedStories);

      // Select the imported story
      setCurrentStoryId(newId);

      return { success: true };
    } catch (e) {
      console.error('Import error:', e);
      return { success: false, error: 'format' };
    }
  };

  const activeStory = stories.find(s => s.id === currentStoryId);
  const player = activeStory ? activeStory.characters[activeStory.playerCharacterId] : null;

  /**
   * Marks a card as viewed so it won't show the typewriter effect again.
   * @param messageId - The ID of the message that was displayed with typewriter
   */
  const markCardAsViewed = (messageId: string) => {
    if (!currentStoryId) return;

    safeUpdateStory(prev => {
      const viewedCards = prev.viewedCards || [];
      // Only add if not already viewed
      if (viewedCards.includes(messageId)) return prev;

      return {
        ...prev,
        viewedCards: [...viewedCards, messageId]
      };
    });
  };

  return {
    apiKey, setApiKey, stories, currentStoryId, setCurrentStoryId,
    language, setLanguage: handleLanguageChange, inputValue, setInputValue,
    isProcessing, isGenerating, isUpdatingContext, showApiKeyModal, setShowApiKeyModal,
    keyError, validating, t,
    // Error Modal
    showErrorModal, errorType, errorMessage, closeErrorModal,
    // Actions
    handleSendMessage, handleCreateStory, handleDeleteStory, handleSaveApiKey, handleLogout, handleVoiceTranscription,
    handleExportJourney, handleImportJourney,
    activeStory, player,
    // Voice Settings
    selectedVoice, setSelectedVoice, useTone, setUseTone,
    // Theme Colors
    regenerateThemeColors, isGeneratingColors,
    // Location Background
    isGeneratingBackground,
    backgroundLocationName,
    // Creation Progress
    creationPhase,
    // Processing Progress
    processingPhase,
    // Viewed Cards
    markCardAsViewed
  };
};
