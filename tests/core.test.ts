
import { buildSystemPrompt, gmResponseSchema } from '../services/ai/systemPrompts';
import { dbService } from '../services/db';
import { GameState } from '../types';

/**
 * Mock data for testing
 */
const mockGameState: GameState = {
  id: 'test-id',
  title: 'Test Game',
  turnCount: 1,
  lastPlayed: Date.now(),
  config: { universeName: 'TestVerse', universeType: 'original', combatStyle: 'descriptive', dialogueHeavy: true, language: 'en' },
  characters: {
    'player': { id: 'player', name: 'Hero', isPlayer: true, locationId: 'start', stats: { hp: 100 }, inventory: ['sword'], relationships: {}, state: 'idle', description: 'A hero' },
    'npc1': { id: 'npc1', name: 'Goblin', isPlayer: false, locationId: 'start', stats: { hp: 20 }, inventory: [], relationships: {}, state: 'idle', description: 'A goblin' }
  },
  locations: {
    'start': { id: 'start', name: 'Start Room', description: 'A testing room', connectedLocationIds: [] }
  },
  messages: [],
  events: [],
  playerCharacterId: 'player',
  currentLocationId: 'start'
};

const runTests = async () => {
  console.log("Running storywell.games Core Tests...");
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, desc: string) => {
    if (condition) {
      console.log(`✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${desc}`);
      failed++;
    }
  };

  // --- 1. Testing Logic/Prompts ---
  try {
    console.log("\n[TEST GROUP] Prompt Engineering");
    
    const prompt = buildSystemPrompt({ gameState: mockGameState, playerInput: "Attack Goblin", language: 'en' });
    assert(prompt.includes('You are the Game Master'), 'Prompt contains system instruction');
    assert(prompt.includes('Name: Hero'), 'Prompt includes player context');
    assert(prompt.includes('Goblin'), 'Prompt includes NPC context');
    assert(prompt.includes('ACTION RESOLUTION LOGIC'), 'Prompt includes Logic Rules');
    
    // Schema Validation (Basic checks)
    assert(gmResponseSchema.type === 'object', 'Schema root is object');
    assert(!!gmResponseSchema.properties?.stateUpdates, 'Schema includes stateUpdates');
  } catch (e) {
    console.error(e);
    failed++;
  }

  // --- 2. Testing Database (Mocking IndexedDB isn't fully possible here without setup, but we test the wrapper logic) ---
  try {
    console.log("\n[TEST GROUP] Database Service");
    
    // We check if the service object exposes the correct methods
    assert(typeof dbService.saveGame === 'function', 'dbService has saveGame');
    assert(typeof dbService.loadGame === 'function', 'dbService has loadGame');
    
    // Since we are in a browser environment usually, we can try to check if IndexedDB is present
    if (typeof indexedDB !== 'undefined') {
       assert(true, 'IndexedDB environment detected');
    } else {
       console.warn('⚠️ Skipping DB execution tests (Node env?)');
    }
  } catch (e) {
    console.error(e);
    failed++;
  }

  // --- 3. Testing Type Integrity ---
  try {
     console.log("\n[TEST GROUP] Type Integrity");
     const char = mockGameState.characters['player'];
     assert(char.isPlayer === true, 'Character interface valid');
     assert(mockGameState.currentLocationId === 'start', 'GameState linking valid');
  } catch (e) {
      failed++;
  }

  console.log(`\nTests Completed. Passed: ${passed}, Failed: ${failed}`);
};

(window as any).runCoreTests = runTests;
export default runTests;
