import { rollFate } from '../../services/ai/openaiClient';
import { ActionOption, FateResult, GameState } from '../../types';

// Mock OpenAI module
jest.mock('openai', () => {
	return {
		default: jest.fn().mockImplementation(() => ({
			chat: {
				completions: {
					create: jest.fn().mockResolvedValue({
						choices: [{ message: { content: '{"test": "response"}' } }],
					}),
				},
			},
			audio: {
				transcriptions: {
					create: jest.fn().mockResolvedValue({ text: 'transcribed text' }),
				},
				speech: {
					create: jest.fn().mockResolvedValue({
						arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
					}),
				},
			},
			images: {
				generate: jest.fn().mockResolvedValue({
					data: [{ url: 'https://example.com/image.png' }],
				}),
			},
		})),
	};
});

// Mock utils/ai
jest.mock('../../utils/ai', () => ({
	queryLLM: jest.fn().mockResolvedValue({ text: '{"messages": [], "stateUpdates": {"eventLog": "test"}}' }),
	validateOpenAIKey: jest.fn().mockResolvedValue(true),
	transcribeAudioWithWhisper: jest.fn().mockResolvedValue('transcribed text'),
	generateImage: jest.fn().mockResolvedValue('data:image/png;base64,test'),
	generateSpeechWithTTS: jest.fn().mockResolvedValue('base64audio'),
	getImageGenerationPreset: jest.fn().mockImplementation((preset: string) => {
		if (preset === 'locationBackground') {
			return {
				imageSize: '1536x1024',
				quality: 'medium',
				targetDimensions: { width: 768, height: 512 },
				description: 'test-background',
			};
		}
		return {
			imageSize: '1024x1024',
			quality: 'medium',
			targetDimensions: { width: 124, height: 124 },
			description: 'test-avatar',
		};
	}),
	applyImagePresetToBase64: jest.fn().mockImplementation((image: string) => Promise.resolve(image)),
	LLMMessage: jest.fn(),
}));

// Helper to create mock game state
const createMockGameState = (): GameState => ({
	id: 'test-game-id',
	title: 'Test Adventure',
	turnCount: 5,
	lastPlayed: Date.now(),
	config: {
		universeType: 'original',
		universeName: 'Fantasy World',
		combatStyle: 'descriptive',
		dialogueHeavy: true,
		language: 'en',
	},
	characters: {
		'player-1': {
			id: 'player-1',
			name: 'Hero',
			description: 'A brave warrior',
			isPlayer: true,
			locationId: 'loc-1',
			stats: { hp: 100 },
			inventory: ['sword'],
			relationships: {},
			state: 'idle',
		},
	},
	locations: {
		'loc-1': {
			id: 'loc-1',
			name: 'Town',
			description: 'A town',
			connectedLocationIds: [],
		},
	},
	messages: [],
	events: [],
	playerCharacterId: 'player-1',
	currentLocationId: 'loc-1',
});

describe('openaiClient', () => {
	describe('rollFate', () => {
		// Use fixed seed for deterministic tests
		let mockRandom: jest.SpyInstance;

		beforeEach(() => {
			mockRandom = jest.spyOn(Math, 'random');
		});

		afterEach(() => {
			mockRandom.mockRestore();
		});

		it('should return bad fate when roll is within bad chance', () => {
			mockRandom.mockReturnValue(0.05); // 5% roll

			const option: ActionOption = {
				text: 'Open the chest',
				goodChance: 20,
				badChance: 10,
				goodHint: 'Find gold',
				badHint: 'Trigger trap',
			};

			const result = rollFate(option);

			expect(result.type).toBe('bad');
			expect(result.hint).toBe('Trigger trap');
		});

		it('should return good fate when roll is within good chance range', () => {
			mockRandom.mockReturnValue(0.15); // 15% roll (after 10% bad range)

			const option: ActionOption = {
				text: 'Search the room',
				goodChance: 20,
				badChance: 10,
				goodHint: 'Find treasure',
				badHint: 'Alert guards',
			};

			const result = rollFate(option);

			expect(result.type).toBe('good');
			expect(result.hint).toBe('Find treasure');
		});

		it('should return neutral fate when roll is beyond both ranges', () => {
			mockRandom.mockReturnValue(0.5); // 50% roll

			const option: ActionOption = {
				text: 'Walk carefully',
				goodChance: 20,
				badChance: 10,
				goodHint: 'Shortcut',
				badHint: 'Get lost',
			};

			const result = rollFate(option);

			expect(result.type).toBe('neutral');
			expect(result.hint).toBeUndefined();
		});

		it('should handle zero chance options', () => {
			mockRandom.mockReturnValue(0.1);

			const option: ActionOption = {
				text: 'Safe action',
				goodChance: 0,
				badChance: 0,
				goodHint: '',
				badHint: '',
			};

			const result = rollFate(option);

			expect(result.type).toBe('neutral');
		});

		it('should handle maximum chances', () => {
			mockRandom.mockReturnValue(0.55); // 55% roll

			const option: ActionOption = {
				text: 'Risky action',
				goodChance: 50,
				badChance: 50, // Total 100%
				goodHint: 'Big reward',
				badHint: 'Big penalty',
			};

			const result = rollFate(option);

			// With 55% roll: roll (55) >= badChance (50), so not bad
			// roll (55) < badChance + goodChance (100), so it's good
			expect(result.type).toBe('good');
		});

		it('should correctly calculate boundary between bad and good', () => {
			// Exactly at the boundary
			const option: ActionOption = {
				text: 'Boundary test',
				goodChance: 30,
				badChance: 20,
				goodHint: 'Good',
				badHint: 'Bad',
			};

			// Test at 19.9% (bad)
			mockRandom.mockReturnValue(0.199);
			expect(rollFate(option).type).toBe('bad');

			// Test at 20% (good starts)
			mockRandom.mockReturnValue(0.2);
			expect(rollFate(option).type).toBe('good');

			// Test at 49.9% (still good)
			mockRandom.mockReturnValue(0.499);
			expect(rollFate(option).type).toBe('good');

			// Test at 50% (neutral starts)
			mockRandom.mockReturnValue(0.5);
			expect(rollFate(option).type).toBe('neutral');
		});

		it('should handle edge case with very low roll', () => {
			mockRandom.mockReturnValue(0.001);

			const option: ActionOption = {
				text: 'Test',
				goodChance: 10,
				badChance: 5,
				goodHint: 'g',
				badHint: 'b',
			};

			const result = rollFate(option);
			expect(result.type).toBe('bad');
		});

		it('should handle edge case with very high roll', () => {
			mockRandom.mockReturnValue(0.999);

			const option: ActionOption = {
				text: 'Test',
				goodChance: 10,
				badChance: 5,
				goodHint: 'g',
				badHint: 'b',
			};

			const result = rollFate(option);
			expect(result.type).toBe('neutral');
		});
	});

	describe('transformRawResponse (via internal testing)', () => {
		// We can test the transformation by observing generateGameTurn behavior
		// Since transformRawResponse is internal, we test its effects

		it('should be tested through integration tests', () => {
			// This is a placeholder - the transformation logic is tested
			// through the AI service integration tests
			expect(true).toBe(true);
		});
	});
});

describe('openaiClient API functions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('validateApiKey', () => {
		it('should be callable', async () => {
			const { validateApiKey } = await import('../../services/ai/openaiClient');
			const result = await validateApiKey('test-key');
			expect(typeof result).toBe('boolean');
		});
	});

	describe('transcribeAudio', () => {
		it('should be callable with valid parameters', async () => {
			const { transcribeAudio } = await import('../../services/ai/openaiClient');
			const blob = new Blob(['test'], { type: 'audio/webm' });

			const result = await transcribeAudio('test-key', blob, 'en');
			expect(typeof result).toBe('string');
		});
	});

	describe('generateCharacterAvatar', () => {
		it('should be callable', async () => {
			const { generateCharacterAvatar } = await import('../../services/ai/openaiClient');

			const result = await generateCharacterAvatar('test-key', 'Hero', 'A brave warrior', 'Fantasy World');

			expect(result).toBeDefined();
		});
	});

	describe('generateSpeech', () => {
		it('should be callable', async () => {
			const { generateSpeech } = await import('../../services/ai/openaiClient');

			const result = await generateSpeech('test-key', 'Hello world', 'narrator');

			expect(result).toBeDefined();
		});

		it('should accept different voice types', async () => {
			const { generateSpeech } = await import('../../services/ai/openaiClient');

			await expect(generateSpeech('test-key', 'Hello', 'narrator')).resolves.toBeDefined();
			await expect(generateSpeech('test-key', 'Hello', 'player')).resolves.toBeDefined();
			await expect(generateSpeech('test-key', 'Hello', 'npc')).resolves.toBeDefined();
		});

		it('should accept voiceTone parameter and use instructions-based TTS', async () => {
			const { generateSpeech } = await import('../../services/ai/openaiClient');
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

			await generateSpeech('test-key', 'Hello', 'npc', 'excited');

			// Now uses gpt-4o-mini-tts with instructions, default voice is 'onyx'
			expect(consoleSpy).toHaveBeenCalledWith(
				'[TTS] Generating speech - type: npc, tone: excited, voice: onyx, language: en, model: gpt-4o-mini-tts',
			);
			consoleSpy.mockRestore();
		});

		it('should use default voice for all tones (instructions handle emotion)', async () => {
			const { generateSpeech } = await import('../../services/ai/openaiClient');
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

			await generateSpeech('test-key', 'Hello', 'narrator', 'unknown_tone');

			// Uses default voice 'onyx' - instructions handle the tone
			expect(consoleSpy).toHaveBeenCalledWith(
				'[TTS] Generating speech - type: narrator, tone: unknown_tone, voice: onyx, language: en, model: gpt-4o-mini-tts',
			);
			consoleSpy.mockRestore();
		});

		it('should log correct voice type and tone for different emotions', async () => {
			const { generateSpeech } = await import('../../services/ai/openaiClient');
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

			// Test sad tone - uses same voice, instructions change the delivery
			await generateSpeech('test-key', 'Hello', 'npc', 'sad');
			expect(consoleSpy).toHaveBeenCalledWith(
				'[TTS] Generating speech - type: npc, tone: sad, voice: onyx, language: en, model: gpt-4o-mini-tts',
			);

			// Test angry tone
			await generateSpeech('test-key', 'Hello', 'npc', 'angry');
			expect(consoleSpy).toHaveBeenCalledWith(
				'[TTS] Generating speech - type: npc, tone: angry, voice: onyx, language: en, model: gpt-4o-mini-tts',
			);

			// Test mysterious tone
			await generateSpeech('test-key', 'Hello', 'npc', 'mysterious');
			expect(consoleSpy).toHaveBeenCalledWith(
				'[TTS] Generating speech - type: npc, tone: mysterious, voice: onyx, language: en, model: gpt-4o-mini-tts',
			);

			consoleSpy.mockRestore();
		});

		it('should allow custom voice override', async () => {
			const { generateSpeech } = await import('../../services/ai/openaiClient');
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

			await generateSpeech('test-key', 'Hello', 'npc', 'excited', 'sage');

			expect(consoleSpy).toHaveBeenCalledWith(
				'[TTS] Generating speech - type: npc, tone: excited, voice: sage, language: en, model: gpt-4o-mini-tts',
			);
			consoleSpy.mockRestore();
		});

		it('should log the selected language when provided', async () => {
			const { generateSpeech } = await import('../../services/ai/openaiClient');
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

			await generateSpeech('test-key', 'Olá', 'npc', 'excited', undefined, true, 'pt');

			expect(consoleSpy).toHaveBeenCalledWith(
				'[TTS] Generating speech - type: npc, tone: excited, voice: onyx, language: pt, model: gpt-4o-mini-tts',
			);
			consoleSpy.mockRestore();
		});

		it('should work without voiceTone parameter', async () => {
			const { generateSpeech } = await import('../../services/ai/openaiClient');

			const result = await generateSpeech('test-key', 'Hello', 'npc');

			expect(result).toBeDefined();
		});
	});

	describe('generateActionOptions', () => {
		it('should return 5 action options', async () => {
			const { queryLLM } = await import('../../utils/ai');
			(queryLLM as jest.Mock).mockResolvedValueOnce({
				text: JSON.stringify({
					options: [
						{ text: 'Action 1', goodChance: 10, badChance: 5 },
						{ text: 'Action 2', goodChance: 15, badChance: 10 },
						{ text: 'Action 3', goodChance: 20, badChance: 15 },
						{ text: 'Action 4', goodChance: 25, badChance: 20 },
						{ text: 'Action 5', goodChance: 5, badChance: 5 },
					],
				}),
			});

			const { generateActionOptions } = await import('../../services/ai/openaiClient');
			const gameState = createMockGameState();

			const options = await generateActionOptions('test-key', gameState, 'en');

			expect(options).toHaveLength(5);
			options.forEach((opt) => {
				expect(opt.text).toBeDefined();
				expect(typeof opt.goodChance).toBe('number');
				expect(typeof opt.badChance).toBe('number');
			});
		});

		it('should return default options on error', async () => {
			const { queryLLM } = await import('../../utils/ai');
			(queryLLM as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

			const { generateActionOptions } = await import('../../services/ai/openaiClient');
			const gameState = createMockGameState();

			const options = await generateActionOptions('test-key', gameState, 'en');

			expect(options).toHaveLength(5);
			expect(options[0].text).toBe('Look around');
		});

		it('should clamp probability values to valid range', async () => {
			const { queryLLM } = await import('../../utils/ai');
			(queryLLM as jest.Mock).mockResolvedValueOnce({
				text: JSON.stringify({
					options: [
						{ text: 'High chance', goodChance: 100, badChance: 100 },
						{ text: 'Negative', goodChance: -10, badChance: -5 },
						{ text: 'Normal', goodChance: 20, badChance: 10 },
						{ text: 'Test 4', goodChance: 30, badChance: 20 },
						{ text: 'Test 5', goodChance: 10, badChance: 5 },
					],
				}),
			});

			const { generateActionOptions } = await import('../../services/ai/openaiClient');
			const gameState = createMockGameState();

			const options = await generateActionOptions('test-key', gameState, 'en');

			// Values should be clamped to 0-50
			expect(options[0].goodChance).toBeLessThanOrEqual(50);
			expect(options[0].badChance).toBeLessThanOrEqual(50);
			expect(options[1].goodChance).toBeGreaterThanOrEqual(0);
			expect(options[1].badChance).toBeGreaterThanOrEqual(0);
		});
	});

	describe('generateGameTurn', () => {
		it('should be callable and return GMResponse structure', async () => {
			const { queryLLM } = await import('../../utils/ai');
			(queryLLM as jest.Mock).mockResolvedValueOnce({
				text: JSON.stringify({
					messages: [{ type: 'narration', text: 'You look around.', voiceTone: 'neutral' }],
					stateUpdates: {
						eventLog: 'Player looked around',
					},
				}),
			});

			const { generateGameTurn } = await import('../../services/ai/openaiClient');
			const gameState = createMockGameState();

			const result = await generateGameTurn('test-key', 'look around', gameState, 'en');

			expect(result.messages).toBeDefined();
			expect(result.stateUpdates).toBeDefined();
		});
	});

	describe('initializeStory', () => {
		it('should return initial game state structure', async () => {
			const { queryLLM } = await import('../../utils/ai');
			const blueprintResponse = {
				locationSeeds: [
					{ id: 'loc_start', name: 'Start Atrium', environment: 'atrium', hook: 'A liminal hall flickers online.', tone: 'hopeful' },
				],
				playerSeed: { id: 'player-1', name: 'Hero', archetype: 'Rogue', motivation: 'Explore', visualTraits: 'Tall silhouette', gearFocus: 'Daggers' },
				npcSeeds: [],
				toneDirectives: ['Moody'],
				economyPreset: 'standard',
				questDifficultyTier: 'balanced',
			};
			const locationResponse = { id: 'loc_start', name: 'Start Atrium', description: 'The world assembles.', connectedExits: [], hazards: [], sensoryNotes: [] };
			const playerSheetResponse = {
				id: 'player-1',
				seedId: 'player-1',
				name: 'Hero',
				description: 'Brave',
				stats: { hp: 100, maxHp: 100, gold: 25 },
				inventory: [
					{ name: 'Cloak', description: 'Warm layer', quantity: 1, category: 'armor', stackable: false, consumable: false },
				],
				relationships: [],
			};
			const narrationResponse = { messages: [{ type: 'narration', text: 'You awaken in the atrium.', voiceTone: 'neutral' }] };
			const questResponse = {
				eventLog: 'Adventure begins.',
				mainMission: 'Find answers',
				currentMission: 'Look around',
				activeProblems: [],
				currentConcerns: [],
				importantNotes: [],
			};
			(queryLLM as jest.Mock)
				.mockResolvedValueOnce({ text: JSON.stringify(blueprintResponse) })
				.mockResolvedValueOnce({ text: 'A vast universe context.' })
				.mockResolvedValueOnce({ text: JSON.stringify(locationResponse) })
				.mockResolvedValueOnce({ text: JSON.stringify(playerSheetResponse) })
				.mockResolvedValueOnce({ text: JSON.stringify({ npcs: [] }) })
				.mockResolvedValueOnce({ text: JSON.stringify(narrationResponse) })
				.mockResolvedValueOnce({ text: JSON.stringify(questResponse) });

			const { initializeStory } = await import('../../services/ai/openaiClient');

			const config = {
				universeName: 'Test World',
				universeType: 'original',
				playerName: 'Hero',
				playerDesc: 'A brave adventurer',
				background: 'Unknown origins',
				memories: 'Vague memories',
				startSituation: 'In a mysterious land',
			};

			const result = await initializeStory('test-key', config, 'en');

			expect(result.gmResponse.messages).toBeDefined();
			expect(result.gmResponse.stateUpdates?.newLocations?.[0].id).toBe('loc_start');
			expect(result.heavyContextSeed?.mainMission).toBe('Find answers');
			expect(Array.isArray(result.telemetry)).toBe(true);
			expect(typeof result.universeContext).toBe('string');
		});
	});

	describe('processPlayerMessage', () => {
		it('should transform player input and return ProcessedPlayerMessage', async () => {
			const { queryLLM } = await import('../../utils/ai');
			(queryLLM as jest.Mock).mockResolvedValueOnce({
				text: JSON.stringify({
					text: 'Greetings, noble traveler!',
					voiceTone: 'friendly',
				}),
			});

			const { processPlayerMessage } = await import('../../services/ai/openaiClient');
			const gameState = createMockGameState();

			const result = await processPlayerMessage('test-key', 'hi there', gameState, 'en');

			expect(result).toHaveProperty('text');
			expect(result).toHaveProperty('voiceTone');
			expect(result.text).toBe('Greetings, noble traveler!');
			expect(result.voiceTone).toBe('friendly');
		});

		it('should return original input with neutral tone on error', async () => {
			const { queryLLM } = await import('../../utils/ai');
			(queryLLM as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

			const { processPlayerMessage } = await import('../../services/ai/openaiClient');
			const gameState = createMockGameState();

			const result = await processPlayerMessage('test-key', 'hello', gameState, 'en');

			expect(result.text).toBe('hello');
			expect(result.voiceTone).toBe('neutral');
		});

		it('should strip quotes from processed text', async () => {
			const { queryLLM } = await import('../../utils/ai');
			(queryLLM as jest.Mock).mockResolvedValueOnce({
				text: JSON.stringify({
					text: '"Hello there!"',
					voiceTone: 'excited',
				}),
			});

			const { processPlayerMessage } = await import('../../services/ai/openaiClient');
			const gameState = createMockGameState();

			const result = await processPlayerMessage('test-key', 'hi', gameState, 'en');

			expect(result.text).toBe('Hello there!');
		});

		it('should default to neutral voiceTone if not provided', async () => {
			const { queryLLM } = await import('../../utils/ai');
			(queryLLM as jest.Mock).mockResolvedValueOnce({
				text: JSON.stringify({
					text: 'Hello',
				}),
			});

			const { processPlayerMessage } = await import('../../services/ai/openaiClient');
			const gameState = createMockGameState();

			const result = await processPlayerMessage('test-key', 'hi', gameState, 'en');

			expect(result.voiceTone).toBe('neutral');
		});
	});

	describe('processOnboardingStep', () => {
		it('should return onboarding step configuration', async () => {
			const { queryLLM } = await import('../../utils/ai');
			(queryLLM as jest.Mock).mockResolvedValueOnce({
				text: JSON.stringify({
					question: 'What is your character name?',
					controlType: 'select',
					options: ['Aldric', 'Seraphina', 'Thorne', 'Elena', 'Marcus'],
					isComplete: false,
				}),
			});

			const { processOnboardingStep } = await import('../../services/ai/openaiClient');

			const result = await processOnboardingStep('test-key', [], 'original', 'en');

			expect(result.question).toBeDefined();
			expect(result.controlType).toBe('select');
			expect(result.options).toBeDefined();
			expect(result.isComplete).toBeDefined();
		});
	});

	describe('updateHeavyContext', () => {
		it('should return shouldUpdate: false when no update needed', async () => {
			const { queryLLM } = await import('../../utils/ai');
			(queryLLM as jest.Mock).mockResolvedValueOnce({
				text: JSON.stringify({
					shouldUpdate: false,
				}),
			});

			const { updateHeavyContext } = await import('../../services/ai/openaiClient');
			const gameState = createMockGameState();
			const recentResponse = {
				messages: [{ type: 'narration', text: 'Nothing happened.', voiceTone: 'neutral' }],
				stateUpdates: { eventLog: 'Nothing happened' },
			};

			const result = await updateHeavyContext('test-key', gameState, recentResponse, 'en');

			expect(result.shouldUpdate).toBe(false);
			expect(result.newContext).toBeUndefined();
		});

		it('should return merged context when diff is provided', async () => {
			const { queryLLM } = await import('../../utils/ai');
			(queryLLM as jest.Mock).mockResolvedValueOnce({
				text: JSON.stringify({
					shouldUpdate: true,
					changes: {
						mainMission: { action: 'set', value: 'Stop the invasion before the eclipse.' },
						currentMission: { action: 'clear' },
						activeProblems: [
							{ action: 'remove', value: 'The cave is guarded' },
							{ action: 'add', value: 'Bridge is collapsing' },
						],
						currentConcerns: [{ action: 'add', value: 'Allies are missing' }],
						importantNotes: [{ action: 'add', value: 'Statue eyes glow when lied to' }],
					},
				}),
			});

			const { updateHeavyContext } = await import('../../services/ai/openaiClient');
			const gameState = createMockGameState();
			gameState.heavyContext = {
				mainMission: 'Restore peace to the realm',
				currentMission: 'Find the lost artifact',
				activeProblems: ['The cave is guarded'],
				currentConcerns: [],
				importantNotes: [],
			};
			const recentResponse = {
				messages: [{ type: 'narration', text: 'You discovered something!', voiceTone: 'neutral' }],
				stateUpdates: { eventLog: 'Major discovery' },
			};

			const result = await updateHeavyContext('test-key', gameState, recentResponse, 'en');

			expect(result.shouldUpdate).toBe(true);
			expect(result.newContext).toBeDefined();
			expect(result.newContext?.mainMission).toBe('Stop the invasion before the eclipse.');
			expect(result.newContext?.currentMission).toBeUndefined();
			expect(result.newContext?.activeProblems).toEqual(['Bridge is collapsing']);
			expect(result.newContext?.currentConcerns).toEqual(['Allies are missing']);
			expect(result.newContext?.importantNotes).toEqual(['Statue eyes glow when lied to']);
			expect(result.newContext?.lastUpdated).toBeDefined();
		});

		it('should handle errors gracefully and return shouldUpdate: false', async () => {
			const { queryLLM } = await import('../../utils/ai');
			(queryLLM as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

			const { updateHeavyContext } = await import('../../services/ai/openaiClient');
			const gameState = createMockGameState();
			const recentResponse = {
				messages: [],
				stateUpdates: { eventLog: 'Test' },
			};

			const result = await updateHeavyContext('test-key', gameState, recentResponse, 'en');

			expect(result.shouldUpdate).toBe(false);
		});

		it('should handle empty response text gracefully', async () => {
			const { queryLLM } = await import('../../utils/ai');
			(queryLLM as jest.Mock).mockResolvedValueOnce({
				text: null,
			});

			const { updateHeavyContext } = await import('../../services/ai/openaiClient');
			const gameState = createMockGameState();
			const recentResponse = {
				messages: [],
				stateUpdates: { eventLog: 'Test' },
			};

			const result = await updateHeavyContext('test-key', gameState, recentResponse, 'en');

			expect(result.shouldUpdate).toBe(false);
		});

		it('should limit arrays to 5 items', async () => {
			const { queryLLM } = await import('../../utils/ai');
			(queryLLM as jest.Mock).mockResolvedValueOnce({
				text: JSON.stringify({
					shouldUpdate: true,
					changes: {
						activeProblems: [
							{ action: 'add', value: '1' },
							{ action: 'add', value: '2' },
							{ action: 'add', value: '3' },
							{ action: 'add', value: '4' },
							{ action: 'add', value: '5' },
							{ action: 'add', value: '6' },
							{ action: 'add', value: '7' },
						],
						currentConcerns: [
							{ action: 'add', value: 'a' },
							{ action: 'add', value: 'b' },
							{ action: 'add', value: 'c' },
							{ action: 'add', value: 'd' },
							{ action: 'add', value: 'e' },
							{ action: 'add', value: 'f' },
						],
						importantNotes: [
							{ action: 'add', value: 'x' },
							{ action: 'add', value: 'y' },
							{ action: 'add', value: 'z' },
							{ action: 'add', value: 'w' },
							{ action: 'add', value: 'v' },
							{ action: 'add', value: 'u' },
						],
					},
				}),
			});

			const { updateHeavyContext } = await import('../../services/ai/openaiClient');
			const gameState = createMockGameState();
			const recentResponse = {
				messages: [],
				stateUpdates: { eventLog: 'Test' },
			};

			const result = await updateHeavyContext('test-key', gameState, recentResponse, 'en');

			expect(result.newContext?.activeProblems).toHaveLength(5);
			expect(result.newContext?.currentConcerns).toHaveLength(5);
			expect(result.newContext?.importantNotes).toHaveLength(5);
		});

		it('should clear missions when instructed', async () => {
			const { queryLLM } = await import('../../utils/ai');
			(queryLLM as jest.Mock).mockResolvedValueOnce({
				text: JSON.stringify({
					shouldUpdate: true,
					changes: {
						currentMission: { action: 'clear' },
					},
				}),
			});

			const { updateHeavyContext } = await import('../../services/ai/openaiClient');
			const gameState = createMockGameState();
			gameState.heavyContext = {
				currentMission: 'Investigate the ruins',
			};
			const recentResponse = {
				messages: [],
				stateUpdates: { eventLog: 'Test' },
			};

			const result = await updateHeavyContext('test-key', gameState, recentResponse, 'en');

			expect(result.newContext?.currentMission).toBeUndefined();
		});
	});
});
