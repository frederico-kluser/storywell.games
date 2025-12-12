import {
	GameState,
	GMResponse,
	GMResponseMessage,
	NewCharacterData,
	Language,
	ActionOption,
	FateResult,
	HeavyContext,
	Character,
	Item,
	ThemeColors,
	DEFAULT_THEME_COLORS,
	DEFAULT_FONT_FAMILY,
	NarrativeGenre,
	GridSnapshot,
	GridCharacterPosition,
	GridUpdateResponse,
} from '../../types';
import { THEMED_FONTS, getFontByFamily } from '../../constants/fonts';
import { languageInfo } from '../../i18n/locales';
import {
	gmResponseSchema,
	buildGameMasterPrompt,
	buildStoryInitializationPrompt,
	buildOnboardingPrompt,
	buildPlayerMessageProcessingPrompt,
	buildActionOptionsPrompt,
	buildCharacterAvatarPrompt,
	buildHeavyContextPrompt,
	buildTextClassificationPrompt,
	buildUniverseContextPrompt,
	buildCustomActionAnalysisPrompt,
	buildThemeColorsPrompt,
	buildLocationBackgroundPrompt,
	buildGridUpdatePrompt,
	themeColorsSchema,
	customActionAnalysisSchema,
	onboardingSchema,
	heavyContextSchema,
	gridUpdateSchema,
} from './prompts';
import type { TextClassificationResponse, CustomActionAnalysisResponse } from './prompts';
import type { HeavyContextResponse, HeavyContextFieldChange, HeavyContextListChange } from './prompts';
import {
	queryLLM,
	validateOpenAIKey,
	transcribeAudioWithWhisper,
	generateImage,
	generateSpeechWithTTS,
	getImageGenerationPreset,
	applyImagePresetToBase64,
	LLMMessage,
	TTSVoice,
} from '../../utils/ai';
import { cleanJsonString } from '../../utils/helpers';
import { processAIInventoryResponse, normalizeInventory } from '../../utils/inventory';

/**
 * Configuração de modelos por tipo de tarefa.
 * Otimizado para balancear custo vs qualidade:
 *
 * - gpt-4.1: Tarefas complexas que exigem raciocínio avançado
 * - gpt-4.1-mini: Tarefas médias com bom custo-benefício
 * - gpt-4.1-nano: Tarefas simples de alta frequência
 *
 * Preços (por 1M tokens):
 * - gpt-4.1:      $2.00 input / $8.00 output
 * - gpt-4.1-mini: $0.40 input / $1.60 output (80% mais barato)
 * - gpt-4.1-nano: $0.10 input / $0.40 output (95% mais barato)
 */
const MODEL_CONFIG = {
	// Tarefas complexas - mantém gpt-4.1
	gameMaster: 'gpt-4.1', // Loop principal: narrativa, NPCs, mecânicas
	storyInitialization: 'gpt-4.1', // Criação inicial do mundo
	universeContext: 'gpt-4.1', // Geração de contexto narrativo do universo

	// Tarefas médias - usa gpt-4.1-mini (80% economia)
	onboarding: 'gpt-4.1-mini', // Entrevista de criação de mundo
	heavyContext: 'gpt-4.1-mini', // Análise de contexto narrativo
	playerMessageProcessing: 'gpt-4.1-mini', // Adaptação de mensagem + tom de voz
	customActionAnalysis: 'gpt-4.1-mini', // Análise de ação customizada (taxa de sucesso/falha)

	// Tarefas médias - usa gpt-4.1-mini (80% economia)
	actionOptions: 'gpt-4.1-mini', // Gerar 5 sugestões de ação (requer contexto narrativo)
	textClassification: 'gpt-4.1-nano', // Classificar texto como ação ou fala
	themeColors: 'gpt-4.1-mini', // Gerar paleta de cores baseada no universo

	// Grid update - usa gpt-4.1-nano (95% economia) para análise espacial simples
	gridUpdate: 'gpt-4.1-nano', // Atualizar posições no grid do mapa
} as const;

// Modelo padrão para fallback
const DEFAULT_MODEL = 'gpt-4.1';

/**
 * Helper to transform stats array to object.
 */
const transformStats = (statsArr: any): Record<string, number> => {
	if (Array.isArray(statsArr)) {
		const statsMap: Record<string, number> = {};
		statsArr.forEach((s: any) => {
			if (s.key && s.value !== undefined) {
				statsMap[s.key] = s.value;
			}
		});
		return statsMap;
	}
	// If it's already an object, pass it through
	if (typeof statsArr === 'object' && statsArr !== null) return statsArr;
	return {};
};

/**
 * Helper to transform relationships array to object.
 */
const transformRelationships = (relArr: any): Record<string, number> => {
	if (Array.isArray(relArr)) {
		const relMap: Record<string, number> = {};
		relArr.forEach((r: any) => {
			if (r.targetId && r.score !== undefined) {
				relMap[r.targetId] = r.score;
			}
		});
		return relMap;
	}
	return relArr || {};
};

/**
 * Transforms NewCharacterData from a message into a proper Character object.
 * Handles inventory transformation from AI response format to Item[].
 */
const transformNewCharacterData = (data: NewCharacterData): Partial<Character> => {
	// Transform inventory: AI might return string[], Item[], or mixed format
	const inventory = data.inventory ? normalizeInventory(data.inventory) : [];

	return {
		id: data.id,
		name: data.name,
		description: data.description,
		locationId: data.locationId,
		state: data.state,
		inventory,
		stats: transformStats(data.stats),
		isPlayer: false,
		relationships: {},
	};
};

/**
 * Transforms the raw JSON from OpenAI into the typed GMResponse structure.
 * Handles:
 * - Normalization of Relationship arrays into Maps and Stats arrays into Objects
 * - Extraction of new characters from dialogue messages (newCharacterData)
 * - Support for both old format (senderName/text) and new format (characterName/dialogue)
 * @param raw - The parsed JSON object from the model.
 * @returns Normalized GMResponse with extracted new characters.
 */
const transformRawResponse = (raw: any): GMResponse => {
	// Initialize stateUpdates if not present
	if (!raw.stateUpdates) {
		raw.stateUpdates = {};
	}
	if (!raw.stateUpdates.newCharacters) {
		raw.stateUpdates.newCharacters = [];
	}

	// Track character IDs to avoid duplicates
	const existingNewCharacterIds = new Set(raw.stateUpdates.newCharacters.map((c: any) => c.id));

	// Process messages and extract new characters from dialogue messages
	if (raw.messages && Array.isArray(raw.messages)) {
		raw.messages = raw.messages.map((msg: any): GMResponseMessage => {
			// Handle old format (senderName/text) - convert to new format
			if (msg.senderName !== undefined && msg.text !== undefined && msg.characterName === undefined) {
				// Old format detected, convert to new format
				if (msg.type === 'dialogue' && msg.senderName !== 'Narrator' && msg.senderName !== 'SYSTEM') {
					return {
						type: 'dialogue',
						characterName: msg.senderName,
						dialogue: msg.text,
						voiceTone: msg.voiceTone || 'neutral',
					};
				} else if (msg.type === 'system' || msg.senderName === 'SYSTEM') {
					return {
						type: 'system',
						text: msg.text,
						voiceTone: msg.voiceTone || 'neutral',
					};
				} else {
					return {
						type: 'narration',
						text: msg.text,
						voiceTone: msg.voiceTone || 'neutral',
					};
				}
			}

			// New format - check for newCharacterData in dialogue messages
			if (msg.type === 'dialogue' && msg.newCharacterData) {
				const charData = msg.newCharacterData;
				// Only add if not already in newCharacters
				if (charData.id && !existingNewCharacterIds.has(charData.id)) {
					const newChar = transformNewCharacterData(charData);
					raw.stateUpdates.newCharacters.push(newChar);
					existingNewCharacterIds.add(charData.id);
				}
			}

			return msg as GMResponseMessage;
		});
	}

	// Transform existing newCharacters from stateUpdates
	if (raw.stateUpdates.newCharacters) {
		raw.stateUpdates.newCharacters = raw.stateUpdates.newCharacters.map((char: any) => {
			char.stats = transformStats(char.stats);
			char.relationships = transformRelationships(char.relationships);
			// Normalize inventory to Item[] format
			if (char.inventory) {
				char.inventory = normalizeInventory(char.inventory);
			}
			return char;
		});
	}

	// Transform updatedCharacters
	if (raw.stateUpdates?.updatedCharacters) {
		raw.stateUpdates.updatedCharacters = raw.stateUpdates.updatedCharacters.map((char: any) => {
			if (char.relationships) char.relationships = transformRelationships(char.relationships);
			if (char.stats) char.stats = transformStats(char.stats);
			// Normalize inventory to Item[] format
			if (char.inventory) {
				char.inventory = normalizeInventory(char.inventory);
			}
			return char;
		});
	}

	return raw as GMResponse;
};

/**
 * Validates the provided API key by making a minimal request.
 * @param apiKey - The OpenAI API Key.
 * @returns True if valid, false otherwise.
 */
export const validateApiKey = async (apiKey: string): Promise<boolean> => {
	return validateOpenAIKey(apiKey);
};

/**
 * Transcribes audio blob to text using Whisper.
 * @param apiKey - OpenAI API Key.
 * @param audioBlob - Raw audio blob.
 * @param language - Expected language hint.
 * @returns Transcribed text string.
 */
export const transcribeAudio = async (apiKey: string, audioBlob: Blob, language: Language): Promise<string> => {
	try {
		const text = await transcribeAudioWithWhisper(apiKey, audioBlob, language);
		return text;
	} catch (error) {
		console.error('Audio Transcription Failed:', error);
		throw error;
	}
};

/**
 * Generates a character avatar using gpt-image-1-mini with dynamic visual style.
 * @param apiKey - OpenAI API Key.
 * @param charName - Name of the character.
 * @param charDesc - Visual description.
 * @param universeContext - Name of the universe for style consistency.
 * @param visualStyle - Optional artistic reference for visual style (e.g., "Studio Ghibli style").
 * @returns Base64 data URI of the generated image or undefined if failed.
 */
export const generateCharacterAvatar = async (
	apiKey: string,
	charName: string,
	charDesc: string,
	universeContext: string,
	visualStyle?: string,
): Promise<string | undefined> => {
	const prompt = buildCharacterAvatarPrompt({
		characterName: charName,
		characterDescription: charDesc,
		universeContext,
		visualStyle,
	});

	const avatarPreset = getImageGenerationPreset('characterAvatar');

	try {
		console.info(`🧑‍🎨 [Avatar] Generating "${charName}" with preset ${avatarPreset.imageSize}...`);
		const rawAvatarBase64 = await generateImage(apiKey, prompt, avatarPreset.imageSize, avatarPreset.quality);

		if (!rawAvatarBase64) {
			console.warn(`🧑‍🎨 [Avatar] No data returned for "${charName}".`);
			return undefined;
		}

		const optimizedAvatar = await applyImagePresetToBase64(rawAvatarBase64, 'characterAvatar');
		const dimensions = avatarPreset.targetDimensions
			? `${avatarPreset.targetDimensions.width}x${avatarPreset.targetDimensions.height}`
			: avatarPreset.imageSize;
		console.info(`🧑‍🎨 [Avatar] Generated avatar for "${charName}" (${dimensions}).`);
		return optimizedAvatar;
	} catch (e) {
		console.error('🧑‍🎨 [Avatar] Generation failed:', e);
		return undefined;
	}
};

/**
 * Generates a location background image using gpt-image-1-mini.
 * Creates an immersive, atmospheric scene for the current location.
 *
 * @param apiKey - OpenAI API Key.
 * @param locationName - Name of the location.
 * @param locationDescription - Description of the location.
 * @param universeContext - Name of the universe for style consistency.
 * @param visualStyle - Optional artistic reference for visual style.
 * @returns Base64 data URI of the generated image or undefined if failed.
 */
export const generateLocationBackground = async (
	apiKey: string,
	locationName: string,
	locationDescription: string,
	universeContext: string,
	visualStyle?: string,
): Promise<string | undefined> => {
	const prompt = buildLocationBackgroundPrompt({
		locationName,
		locationDescription,
		universeContext,
		visualStyle,
	});

	const backgroundPreset = getImageGenerationPreset('locationBackground');

	try {
		console.info(`🌆 [Location Background] Generating "${locationName}" with preset ${backgroundPreset.imageSize}...`);
		const backgroundBase64 = await generateImage(apiKey, prompt, backgroundPreset.imageSize, backgroundPreset.quality);

		if (!backgroundBase64) {
			console.warn(`🌆 [Location Background] No data returned for "${locationName}".`);
			return undefined;
		}

		console.info(`🌆 [Location Background] Generated successfully for "${locationName}".`);
		return applyImagePresetToBase64(backgroundBase64, 'locationBackground');
	} catch (e) {
		console.error('🌆 [Location Background] Generation failed:', e);
		return undefined;
	}
};

/**
 * Default voice for TTS generation.
 * Users can configure their preferred voice in settings.
 * Available voices: alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer, verse
 */
const DEFAULT_TTS_VOICE: TTSVoice = 'onyx';

/**
 * Builds TTS instructions based on voice tone and speaker context.
 * These instructions tell the gpt-4o-mini-tts model how to deliver the speech.
 *
 * @param voiceTone - The emotional tone (e.g., 'excited', 'sad', 'angry').
 * @param voiceType - Type of speaker for context (narrator, player, npc).
 * @returns Instructions string for the TTS model.
 */
/**
 * Language-specific pronunciation instructions for TTS.
 * These detailed instructions help the TTS model produce more authentic accents.
 */
const languageSpecificInstructions: Partial<Record<Language, string>> = {
	pt: `[Brazilian Portuguese]
You MUST speak in Brazilian Portuguese (Português Brasileiro) with an authentic Brazilian accent.
IMPORTANT accent characteristics:
- Use Brazilian pronunciation, NOT European Portuguese
- Open vowels typical of Brazilian speech (e.g., "porta" with open 'o')
- Soft 's' sounds (not the 'sh' sound of European Portuguese)
- Natural Brazilian rhythm and intonation
- Pronounce final 'e' as 'i' (e.g., "leite" sounds like "leiti")
- Pronounce 'd' and 't' before 'i' as 'dj' and 'tch' (e.g., "dia" as "djia", "time" as "tchimi")
- Use the characteristic Brazilian 'r' sounds
Speak as a native Brazilian from São Paulo or Rio de Janeiro would speak.`,
};

const getLanguageDirective = (language: Language): string => {
	// Check for language-specific detailed instructions first
	if (languageSpecificInstructions[language]) {
		return languageSpecificInstructions[language]!;
	}

	const info = languageInfo[language];
	if (!info) {
		return 'Always speak in English with clear pronunciation.';
	}
	const nativeSuffix = info.nativeName && info.nativeName !== info.name ? ` (${info.nativeName})` : '';
	return `Always speak in ${info.name}${nativeSuffix} with authentic pronunciation.`;
};

const buildTTSInstructions = (
	language: Language,
	voiceTone: string | undefined,
	voiceType: 'narrator' | 'player' | 'npc',
): string => {
	// Base context for each speaker type
	const speakerContexts: Record<string, string> = {
		narrator: 'You are a game narrator telling an interactive story.',
		player: 'You are voicing a player character in an RPG game.',
		npc: 'You are voicing a non-player character in an RPG game.',
	};

	const speakerContext = speakerContexts[voiceType] || speakerContexts.npc;
	const languageDirective = getLanguageDirective(language);
	const baseInstruction = `${speakerContext}\n${languageDirective}`;

	// If no tone specified, return just the speaker context
	if (!voiceTone || voiceTone === 'neutral') {
		return `${baseInstruction}\nSpeak naturally and clearly.`;
	}

	// Detailed tone instructions for gpt-4o-mini-tts
	const toneInstructions: Record<string, string> = {
		// Positive/Energetic tones
		excited: 'Speak with high energy and enthusiasm. Your voice should convey excitement and anticipation.',
		playful: 'Speak in a light, fun, and playful manner. Add a sense of mischief to your delivery.',
		cheerful: 'Speak with a bright, happy tone. Let joy come through in your voice.',
		enthusiastic: 'Speak with passionate enthusiasm. Show genuine excitement about what you are saying.',
		joyful: 'Speak with pure happiness and delight. Let the joy shine through every word.',

		// Warm/Friendly tones
		warm: 'Speak with warmth and kindness. Your voice should feel comforting and welcoming.',
		friendly: 'Speak in a casual, approachable manner. Be conversational and easygoing.',
		gentle: 'Speak softly and gently. Be tender and careful with your words.',
		kind: 'Speak with genuine kindness and compassion. Show care in your delivery.',
		comforting: 'Speak in a soothing, reassuring way. Your voice should bring comfort.',

		// Calm/Peaceful tones
		calm: 'Speak slowly and calmly. Maintain a peaceful, measured pace.',
		peaceful: 'Speak with tranquility. Your voice should evoke serenity.',
		serene: 'Speak with absolute calm and peace. Be meditative in your delivery.',
		relaxed: 'Speak in a laid-back, unhurried manner. Be completely at ease.',

		// Sad/Melancholic tones
		sad: 'Speak with sadness in your voice. Let sorrow color your words.',
		melancholic: 'Speak with deep melancholy. Your voice should carry a weight of sadness.',
		mournful: 'Speak as if in grief. Let profound sorrow be heard.',
		sorrowful: 'Speak with deep sorrow and regret. Be heavy with emotion.',
		wistful: 'Speak with longing and gentle sadness. Be nostalgic and slightly melancholy.',

		// Dramatic/Mysterious tones
		mysterious: 'Speak with mystery and intrigue. Leave things unspoken, hint at secrets.',
		dramatic: 'Speak with theatrical drama. Emphasize for maximum impact.',
		ominous: 'Speak with dark foreboding. Your voice should carry a warning of danger.',
		foreboding: 'Speak as if something terrible is coming. Create tension and dread.',
		suspenseful: 'Speak to build tension. Keep the listener on edge.',
		cryptic: 'Speak in riddles and hints. Be enigmatic and mysterious.',

		// Authoritative/Serious tones
		serious: 'Speak with gravity and seriousness. This is no laughing matter.',
		solemn: 'Speak with deep solemnity. Be grave and respectful.',
		grave: 'Speak with utmost seriousness. The situation is dire.',
		formal: 'Speak formally and professionally. Maintain proper decorum.',
		commanding: 'Speak with authority and command. Your word is law.',
		confident: 'Speak with unwavering confidence. Show certainty in every word.',

		// Angry/Aggressive tones
		angry: 'Speak with anger in your voice. Let frustration and rage come through.',
		furious: 'Speak with intense fury. You are absolutely livid.',
		hostile: 'Speak with hostility and aggression. Be confrontational.',
		aggressive: 'Speak aggressively. Be forceful and intimidating.',
		bitter: 'Speak with bitterness and resentment. Let old wounds show.',

		// Fear/Anxiety tones
		fearful: 'Speak with fear in your voice. You are scared and it shows.',
		anxious: 'Speak with anxiety and worry. You are nervous and unsettled.',
		nervous: 'Speak nervously. Your voice should tremble slightly with unease.',
		worried: 'Speak with concern and worry. Something troubles you deeply.',
		terrified: 'Speak with absolute terror. You are paralyzed with fear.',
		panicked: 'Speak in a panic. You are losing control to fear.',

		// Urgent/Intense tones
		urgent: 'Speak with urgency. Time is running out, this is critical.',
		intense: 'Speak with fierce intensity. Every word matters.',
		desperate: 'Speak with desperation. You are at the end of your rope.',

		// Sarcastic/Mocking tones
		sarcastic: 'Speak with obvious sarcasm. Your words say one thing, your tone another.',
		mocking: 'Speak in a mocking, derisive way. You are making fun of something.',
		sardonic: 'Speak with dark, cynical humor. Be bitterly sarcastic.',
		ironic: 'Speak with irony. There is a disconnect between words and meaning.',

		// Special speaking styles
		whispering: 'Speak in a quiet whisper. As if sharing a secret.',
		shouting: 'Speak loudly and forcefully. You need to be heard!',
		muttering: 'Speak in a low mutter. Almost to yourself, barely audible.',
		booming: 'Speak with a deep, booming voice. Fill the room with your presence.',

		// Threatening/Menacing tones
		threatening: 'Speak with menace and threat. Make them fear what comes next.',
		menacing: 'Speak in a menacing way. You are dangerous and they should know it.',
		sinister: 'Speak with sinister intent. There is evil in your words.',
		intimidating: 'Speak to intimidate. Make them feel small and afraid.',

		// Cold/Detached tones
		cold: 'Speak coldly, without warmth. Be emotionally distant.',
		detached: 'Speak with complete detachment. You feel nothing.',
		aloof: 'Speak in an aloof, distant manner. You are above this.',
		indifferent: 'Speak with indifference. You simply do not care.',

		// Confused/Uncertain tones
		confused: 'Speak with confusion. You do not understand what is happening.',
		uncertain: 'Speak with uncertainty. You are not sure about anything.',
		hesitant: 'Speak hesitantly. You are unsure if you should say this.',
		doubtful: 'Speak with doubt. You question what you are saying.',

		// Curious/Inquisitive tones
		curious: 'Speak with curiosity. You want to know more.',
		inquisitive: 'Speak inquisitively. You are asking questions with your tone.',
		wondering: 'Speak with wonder and amazement. This is fascinating.',
	};

	const normalizedTone = voiceTone.toLowerCase().trim();
	const toneInstruction = toneInstructions[normalizedTone];

	if (toneInstruction) {
		return `${baseInstruction}\n${toneInstruction}`;
	}

	// For unknown tones, create a generic instruction
	return `${baseInstruction}\nTone: Speak in a ${normalizedTone} manner. Convey the emotion of "${normalizedTone}" in your delivery.`;
};

/**
 * Generates speech (TTS) from text using OpenAI TTS models.
 * - When useTone is true: Uses gpt-4o-mini-tts with tone instructions.
 * - When useTone is false: Uses tts-1 standard model without tone.
 *
 * @param apiKey - OpenAI API Key.
 * @param text - Text to speak.
 * @param voiceType - Type of character speaking (narrator, player, npc).
 * @param voiceTone - Emotional tone for speech (e.g., 'excited', 'sad', 'angry').
 * @param voice - Optional voice override. If not provided, uses DEFAULT_TTS_VOICE.
 * @param useTone - Whether to use tone instructions (default true). When false, uses tts-1 model.
 * @param language - Target language for the spoken audio (defaults to 'en').
 * @returns Base64 encoded MP3 audio string or undefined if failed.
 */
export const generateSpeech = async (
	apiKey: string,
	text: string,
	voiceType: 'narrator' | 'player' | 'npc' = 'npc',
	voiceTone?: string,
	voice?: TTSVoice,
	useTone: boolean = true,
	language: Language = 'en',
): Promise<string | undefined> => {
	const selectedVoice = voice || DEFAULT_TTS_VOICE;

	// Only build tone instructions if useTone is enabled (language directive is embedded inside)
	const instructions = useTone ? buildTTSInstructions(language, voiceTone, voiceType) : undefined;

	console.log(
		`[TTS] Generating speech - type: ${voiceType}, tone: ${
			useTone ? voiceTone || 'neutral' : 'disabled'
		}, voice: ${selectedVoice}, language: ${language}, model: ${useTone ? 'gpt-4o-mini-tts' : 'tts-1'}`,
	);

	try {
		const base64Audio = await generateSpeechWithTTS(apiKey, text, selectedVoice, instructions, useTone);
		return base64Audio;
	} catch (e) {
		console.error('TTS Generation Failed:', e);
		return undefined;
	}
};

/**
 * Result of processing a player message
 */
export interface ProcessedPlayerMessage {
	text: string;
	voiceTone: string;
}

/**
 * Processes the player's raw input and rewrites it to match the character's voice and universe style.
 * This transforms casual user input into contextually appropriate character dialogue.
 * Also determines the emotional tone for text-to-speech.
 * @param apiKey - API Key.
 * @param rawInput - The original text typed by the user.
 * @param gameState - Current game state for context.
 * @param language - Target language.
 * @returns Object with processed text and voice tone for TTS.
 */
export const processPlayerMessage = async (
	apiKey: string,
	rawInput: string,
	gameState: GameState,
	language: Language,
): Promise<ProcessedPlayerMessage> => {
	const systemPrompt = buildPlayerMessageProcessingPrompt({
		gameState,
		rawInput,
		language,
	});

	const messages: LLMMessage[] = [
		{
			role: 'system',
			content: systemPrompt,
		},
	];

	try {
		const response = await queryLLM(apiKey, messages, {
			model: MODEL_CONFIG.playerMessageProcessing, // gpt-4.1-mini - adaptação de mensagem
			responseFormat: 'json',
		});

		if (!response.text) {
			// Fallback to original if LLM fails
			return { text: rawInput, voiceTone: 'neutral' };
		}

		const parsed = JSON.parse(cleanJsonString(response.text));

		// Clean up the text (remove quotes if LLM wrapped it)
		let processedText = (parsed.text || rawInput).trim();
		if (processedText.startsWith('"') && processedText.endsWith('"')) {
			processedText = processedText.slice(1, -1);
		}
		if (processedText.startsWith("'") && processedText.endsWith("'")) {
			processedText = processedText.slice(1, -1);
		}

		return {
			text: processedText,
			voiceTone: parsed.voiceTone || 'neutral',
		};
	} catch (error) {
		console.error('Player message processing failed:', error);
		// Return original on error to not block the game
		return { text: rawInput, voiceTone: 'neutral' };
	}
};

/**
 * Result of classifying and processing player input
 */
export interface ClassifiedPlayerInput {
	/** The type of input: 'action' or 'speech' */
	type: 'action' | 'speech';
	/** The processed text - original for action, rewritten for speech */
	processedText: string;
	/** Whether the text was modified */
	wasProcessed: boolean;
}

/**
 * Classifies the player's input as an ACTION or SPEECH and processes accordingly.
 * Uses GPT-4.1-nano for fast, cheap classification.
 *
 * - ACTIONS: Commands, physical actions, verbs (attack, go, look) - kept as-is
 * - SPEECH: Dialogue, what the character SAYS - rewritten to match character/universe
 *
 * @param apiKey - OpenAI API Key.
 * @param rawInput - The original text from the player.
 * @param gameState - Current game state for context.
 * @param language - Target language.
 * @returns Classified and potentially processed input.
 */
export const classifyAndProcessPlayerInput = async (
	apiKey: string,
	rawInput: string,
	gameState: GameState,
	language: Language,
): Promise<ClassifiedPlayerInput> => {
	const systemPrompt = buildTextClassificationPrompt({
		gameState,
		rawInput,
		language,
	});

	const messages: LLMMessage[] = [
		{
			role: 'system',
			content: systemPrompt,
		},
	];

	try {
		const response = await queryLLM(apiKey, messages, {
			model: MODEL_CONFIG.textClassification, // gpt-4.1-nano - classificação rápida
			responseFormat: 'json',
		});

		if (!response.text) {
			// Fallback: treat as action and keep original
			return {
				type: 'action',
				processedText: rawInput,
				wasProcessed: false,
			};
		}

		const parsed: TextClassificationResponse = JSON.parse(cleanJsonString(response.text));

		// Clean up the processed text (remove quotes if wrapped)
		let processedText = (parsed.processedText || rawInput).trim();
		if (processedText.startsWith('"') && processedText.endsWith('"')) {
			processedText = processedText.slice(1, -1);
		}
		if (processedText.startsWith("'") && processedText.endsWith("'")) {
			processedText = processedText.slice(1, -1);
		}

		return {
			type: parsed.type || 'action',
			processedText: processedText,
			wasProcessed: parsed.shouldProcess || false,
		};
	} catch (error) {
		console.error('Text classification failed:', error);
		// Return original on error to not block the game
		return {
			type: 'action',
			processedText: rawInput,
			wasProcessed: false,
		};
	}
};

/**
 * Main game loop function. Sends state + input to LLM and returns updates.
 * @param apiKey - API Key.
 * @param input - Player text input.
 * @param gameState - Current game state object.
 * @param language - Target language.
 * @param fateResult - Optional fate result from probability roll (good/bad/neutral event).
 * @param useTone - Whether to request voice tone in the response (default true).
 * @returns Parsed and transformed GMResponse.
 */
export const generateGameTurn = async (
	apiKey: string,
	input: string,
	gameState: GameState,
	language: Language,
	fateResult?: FateResult,
	useTone: boolean = true,
): Promise<GMResponse> => {
	const systemInstruction = buildGameMasterPrompt({
		gameState,
		playerInput: input,
		language,
		fateResult,
		useTone,
	});
	const schemaInstruction = `\n\nYou MUST respond with a valid JSON object following this exact schema:\n${JSON.stringify(
		gmResponseSchema,
		null,
		2,
	)}`;

	const messages: LLMMessage[] = [
		{
			role: 'system',
			content: systemInstruction + schemaInstruction,
		},
		{
			role: 'user',
			content: `History (Context): ${JSON.stringify(gameState.messages.slice(-100))}`,
		},
		{
			role: 'user',
			content: `Player Action: "${input}"`,
		},
	];

	try {
		const response = await queryLLM(apiKey, messages, {
			model: MODEL_CONFIG.gameMaster, // gpt-4.1 - loop principal do jogo
			responseFormat: 'json',
		});

		if (!response.text) throw new Error('No response from AI');

		const raw = JSON.parse(cleanJsonString(response.text));
		const result = transformRawResponse(raw);

		// Generate avatars for new characters (in parallel)
		if (result.stateUpdates.newCharacters && result.stateUpdates.newCharacters.length > 0) {
			const charPromises = result.stateUpdates.newCharacters.map(async (char) => {
				try {
					const avatarBase64 = await generateCharacterAvatar(
						apiKey,
						char.name,
						char.description,
						gameState.config.universeName,
						gameState.config.visualStyle,
					);
					return { ...char, avatarBase64 };
				} catch (e) {
					console.warn('Could not generate avatar for', char.name);
					return char;
				}
			});
			result.stateUpdates.newCharacters = await Promise.all(charPromises);
		}

		return result;
	} catch (error) {
		console.error('OpenAI Error:', error);
		throw error;
	}
};

/**
 * Generates a comprehensive narrative context for a new universe.
 * This context includes communication styles, slang, currency, culture, and more.
 * Called once during universe creation to establish the narrative foundation.
 *
 * @param apiKey - OpenAI API Key.
 * @param universeName - Name of the universe (e.g., "Star Wars", "Middle Earth").
 * @param universeType - Type of universe ('original' or 'existing').
 * @param language - Target language for the context.
 * @returns The generated universe context as a string.
 */
export const generateUniverseContext = async (
	apiKey: string,
	universeName: string,
	universeType: 'original' | 'existing',
	language: Language,
): Promise<string> => {
	const prompt = buildUniverseContextPrompt({
		universeName,
		universeType,
		language,
	});

	const messages: LLMMessage[] = [
		{
			role: 'system',
			content:
				'You are a master world-builder and narrative designer. Your task is to create comprehensive, detailed universe context documents that will serve as the foundation for all storytelling in this world. Be thorough, creative, and authentic to the universe.',
		},
		{
			role: 'user',
			content: prompt,
		},
	];

	try {
		console.log(`[Universe Context] Generating comprehensive context for "${universeName}" (${universeType})...`);

		const response = await queryLLM(apiKey, messages, {
			model: MODEL_CONFIG.universeContext, // gpt-4.1 - geração de contexto complexo
			responseFormat: 'text', // Plain text response, not JSON
			maxTokens: 8000, // Allow for extensive context generation
		});

		if (!response.text) {
			throw new Error('No universe context generated');
		}

		console.log(`[Universe Context] Generated ${response.text.length} characters of context`);

		return response.text;
	} catch (error) {
		console.error('Universe Context Generation Failed:', error);
		// Return a minimal fallback context
		return `Universe: ${universeName}\nType: ${universeType}\n\nContext generation failed. Using minimal context.`;
	}
};

/**
 * Parameters for generating theme colors.
 */
export interface GenerateThemeColorsParams {
	/** Name of the universe */
	universeName: string;
	/** Type of universe */
	universeType: 'original' | 'existing';
	/** Narrative genre (optional) */
	genre?: NarrativeGenre;
	/** Visual style reference (optional) */
	visualStyle?: string;
	/** User's custom considerations for color generation (optional) */
	userConsiderations?: string;
	/** Language for the response */
	language: Language;
}

/**
 * Generates a theme color palette and font based on the universe context.
 * Uses AI to create an atmospheric palette and select a matching font.
 *
 * @param apiKey - API Key.
 * @param params - Parameters for color/font generation.
 * @returns ThemeColors object with the generated palette and font, or defaults on error.
 */
export const generateThemeColors = async (apiKey: string, params: GenerateThemeColorsParams): Promise<ThemeColors> => {
	const prompt = buildThemeColorsPrompt({
		universeName: params.universeName,
		universeType: params.universeType,
		genre: params.genre,
		visualStyle: params.visualStyle,
		userConsiderations: params.userConsiderations,
		language: params.language,
	});

	const schemaInstruction = `\n\nYou MUST respond with a valid JSON object following this exact schema:\n${JSON.stringify(
		themeColorsSchema,
		null,
		2,
	)}`;

	const messages: LLMMessage[] = [
		{
			role: 'system',
			content:
				"You are a UI/UX designer specializing in atmospheric color palettes and typography for games. Generate colors and select a font that evoke the universe's mood while maintaining readability. Always respond with valid JSON.",
		},
		{
			role: 'user',
			content: prompt + schemaInstruction,
		},
	];

	try {
		console.log(`[Theme] Generating palette and font for "${params.universeName}"...`);

		const response = await queryLLM(apiKey, messages, {
			model: MODEL_CONFIG.themeColors,
			responseFormat: 'json',
		});

		if (!response.text) {
			console.warn('[Theme] No response, using defaults');
			return DEFAULT_THEME_COLORS;
		}

		const parsed = JSON.parse(cleanJsonString(response.text));

		// Validate that all required color fields are present and are valid hex colors
		const hexPattern = /^#[0-9A-Fa-f]{6}$/;
		const requiredColorFields = [
			'background',
			'backgroundSecondary',
			'backgroundAccent',
			'text',
			'textSecondary',
			'textAccent',
			'border',
			'borderStrong',
			'buttonPrimary',
			'buttonPrimaryText',
			'buttonSecondary',
			'buttonSecondaryText',
			'success',
			'warning',
			'danger',
			'shadow',
		];

		const validatedTheme: any = { ...DEFAULT_THEME_COLORS };

		for (const field of requiredColorFields) {
			if (parsed[field] && hexPattern.test(parsed[field])) {
				validatedTheme[field] = parsed[field];
			} else {
				console.warn(`[Theme] Invalid or missing color field "${field}", using default`);
			}
		}

		// Validate fontFamily - must be one of the available fonts
		if (parsed.fontFamily) {
			const fontExists = getFontByFamily(parsed.fontFamily);
			if (fontExists) {
				validatedTheme.fontFamily = parsed.fontFamily;
				console.log(`[Theme] Selected font: ${parsed.fontFamily}`);
			} else {
				console.warn(`[Theme] Invalid font "${parsed.fontFamily}", using default (${DEFAULT_FONT_FAMILY})`);
				validatedTheme.fontFamily = DEFAULT_FONT_FAMILY;
			}
		} else {
			console.warn(`[Theme] No font specified, using default (${DEFAULT_FONT_FAMILY})`);
			validatedTheme.fontFamily = DEFAULT_FONT_FAMILY;
		}

		console.log('[Theme] Generated palette and font successfully');
		return validatedTheme as ThemeColors;
	} catch (error) {
		console.error('[Theme] Generation failed:', error);
		return DEFAULT_THEME_COLORS;
	}
};

/**
 * Result of story initialization including universe context.
 */
export interface StoryInitializationResult {
	/** The GM response with initial state */
	gmResponse: GMResponse;
	/** The generated universe narrative context */
	universeContext: string;
}

/**
 * Initializes a new game story based on wizard config.
 * Generates both the initial world state and a comprehensive universe context in parallel.
 *
 * @param apiKey - API Key.
 * @param config - Configuration object.
 * @param language - Language.
 * @returns Initial GMResponse with starting location/player AND the universe context.
 */
export const initializeStory = async (
	apiKey: string,
	config: any,
	language: Language,
): Promise<StoryInitializationResult> => {
	const prompt = buildStoryInitializationPrompt({ config, language });
	const schemaInstruction = `\n\nYou MUST respond with a valid JSON object following this exact schema:\n${JSON.stringify(
		gmResponseSchema,
		null,
		2,
	)}`;

	const messages: LLMMessage[] = [
		{
			role: 'system',
			content:
				'You are a game master creating the initial state for a new RPG adventure. Always respond with valid JSON.' +
				schemaInstruction,
		},
		{
			role: 'user',
			content: prompt,
		},
	];

	// Run story initialization and universe context generation in parallel
	const [storyResponse, universeContext] = await Promise.all([
		queryLLM(apiKey, messages, {
			model: MODEL_CONFIG.storyInitialization, // gpt-4.1 - criação inicial do mundo
			responseFormat: 'json',
		}),
		generateUniverseContext(apiKey, config.universeName, config.universeType as 'original' | 'existing', language),
	]);

	try {
		const cleanedText = cleanJsonString(storyResponse.text!);
		const raw = JSON.parse(cleanedText);
		const result = transformRawResponse(raw);

		// Generate Player Avatar
		if (result.stateUpdates.newCharacters && result.stateUpdates.newCharacters.length > 0) {
			// Try to match player by name, otherwise assume it's the first character generated
			const playerChar =
				result.stateUpdates.newCharacters.find(
					(c) =>
						c.name.toLowerCase().includes(config.playerName.toLowerCase()) ||
						config.playerName.toLowerCase().includes(c.name.toLowerCase()),
				) || result.stateUpdates.newCharacters[0];

			if (playerChar) {
				try {
					const avatarBase64 = await generateCharacterAvatar(
						apiKey,
						playerChar.name,
						playerChar.description,
						config.universeName,
						config.visualStyle,
					);
					playerChar.avatarBase64 = avatarBase64;
				} catch (e) {
					console.warn('Could not generate initial avatar, continuing story...', e);
				}
			}
		}

		return {
			gmResponse: result,
			universeContext,
		};
	} catch (e) {
		console.error('Error parsing initialization response:', e);
		throw new Error('Failed to parse world generation data. Please try again.');
	}
};

/**
 * Generates 5 contextual action options with probability data based on the current game state.
 * Each option has a chance of triggering a good or bad event.
 * @param apiKey - API Key.
 * @param gameState - Current game state with messages and characters.
 * @param language - Target language.
 * @returns Array of 5 ActionOption objects with probabilities.
 */
export const generateActionOptions = async (
	apiKey: string,
	gameState: GameState,
	language: Language,
): Promise<ActionOption[]> => {
	const contextPrompt = buildActionOptionsPrompt({ gameState, language });

	const messages: LLMMessage[] = [
		{
			role: 'system',
			content:
				'You generate RPG action options with risk/reward probabilities. Always respond with valid JSON containing exactly 5 options with probability data.',
		},
		{
			role: 'user',
			content: contextPrompt,
		},
	];

	try {
		const response = await queryLLM(apiKey, messages, {
			model: MODEL_CONFIG.actionOptions, // gpt-4.1-nano - tarefa simples
			responseFormat: 'json',
		});

		const parsed = JSON.parse(cleanJsonString(response.text!));

		if (Array.isArray(parsed.options) && parsed.options.length >= 5) {
			return parsed.options.slice(0, 5).map((opt: any) => ({
				text: opt.text || opt,
				goodChance: Math.min(50, Math.max(0, opt.goodChance || 0)),
				badChance: Math.min(50, Math.max(0, opt.badChance || 0)),
				goodHint: opt.goodHint || '',
				badHint: opt.badHint || '',
			}));
		}

		// Fallback generic options
		return getDefaultOptions(language);
	} catch (error) {
		console.error('Action Options Generation Failed:', error);
		return getDefaultOptions(language);
	}
};

/**
 * Rolls the fate dice based on the action's probabilities.
 * @param option - The selected action option with probabilities.
 * @returns FateResult indicating what kind of event occurred.
 */
export const rollFate = (option: ActionOption): FateResult => {
	const roll = Math.random() * 100;

	// Check for bad event first (within bad chance range)
	if (roll < option.badChance) {
		return {
			type: 'bad',
			hint: option.badHint,
		};
	}

	// Check for good event (within good chance range, after bad range)
	if (roll < option.badChance + option.goodChance) {
		return {
			type: 'good',
			hint: option.goodHint,
		};
	}

	// Neutral outcome
	return {
		type: 'neutral',
	};
};

/**
 * Result of analyzing a custom action's success/failure chances.
 */
export interface CustomActionAnalysisResult {
	/** Probabilidade de evento positivo (0-50%) */
	goodChance: number;
	/** Probabilidade de evento negativo (0-50%) */
	badChance: number;
	/** Descrição breve do potencial benefício */
	goodHint: string;
	/** Descrição breve do potencial prejuízo */
	badHint: string;
	/** Breve explicação do porquê das taxas atribuídas */
	reasoning: string;
}

/**
 * Analyzes a custom action typed by the player and calculates success/failure probabilities.
 * Uses GPT-4.1-mini with temperature 0 for deterministic, consistent results.
 * This prevents players from gaming the system by retrying until they get favorable odds.
 *
 * The analysis considers:
 * - Action complexity and difficulty
 * - Current game context (location, character state, inventory)
 * - Heavy context (missions, problems, concerns)
 * - Recent events and narrative flow
 *
 * @param apiKey - OpenAI API Key.
 * @param customAction - The custom action text typed by the player.
 * @param gameState - Current game state for context.
 * @param language - Target language for hints.
 * @returns Analysis result with probabilities and hints.
 */
export const analyzeCustomAction = async (
	apiKey: string,
	customAction: string,
	gameState: GameState,
	language: Language,
): Promise<CustomActionAnalysisResult> => {
	const prompt = buildCustomActionAnalysisPrompt({
		gameState,
		customAction,
		language,
	});

	const schemaInstruction = `\n\nYou MUST respond with a valid JSON object following this exact schema:\n${JSON.stringify(
		customActionAnalysisSchema,
		null,
		2,
	)}`;

	const messages: LLMMessage[] = [
		{
			role: 'system',
			content:
				'You are a game master analyzing custom player actions. Your analysis must be DETERMINISTIC - the same action in the same context should ALWAYS yield identical probabilities. Be fair but consider action complexity, feasibility, and context. Always respond with valid JSON.',
		},
		{
			role: 'user',
			content: prompt + schemaInstruction,
		},
	];

	try {
		// Using gpt-4.1-mini with temperature 0 (enforced in queryLLM) for deterministic results
		const response = await queryLLM(apiKey, messages, {
			model: MODEL_CONFIG.customActionAnalysis,
			responseFormat: 'json',
		});

		if (!response.text) {
			// Fallback to moderate default values
			return {
				goodChance: 15,
				badChance: 15,
				goodHint: '',
				badHint: '',
				reasoning: 'Unable to analyze action',
			};
		}

		const parsed: CustomActionAnalysisResponse = JSON.parse(cleanJsonString(response.text));

		return {
			goodChance: Math.min(50, Math.max(0, parsed.goodChance || 15)),
			badChance: Math.min(50, Math.max(0, parsed.badChance || 15)),
			goodHint: parsed.goodHint || '',
			badHint: parsed.badHint || '',
			reasoning: parsed.reasoning || '',
		};
	} catch (error) {
		console.error('Custom Action Analysis Failed:', error);
		// Return moderate default values on error
		return {
			goodChance: 15,
			badChance: 15,
			goodHint: '',
			badHint: '',
			reasoning: 'Analysis failed, using default values',
		};
	}
};

/**
 * Returns default action options as fallback with neutral probabilities.
 */
const getDefaultOptions = (language: Language): ActionOption[] => {
	const defaults: Record<Language, string[]> = {
		en: ['Look around', 'Talk to someone', 'Move forward', 'Check inventory', 'Wait and observe'],
		pt: ['Olhar ao redor', 'Falar com alguém', 'Seguir em frente', 'Verificar inventário', 'Esperar e observar'],
		es: ['Mirar alrededor', 'Hablar con alguien', 'Avanzar', 'Revisar inventario', 'Esperar y observar'],
	};
	const texts = defaults[language] || defaults.en;
	return texts.map((text) => ({
		text,
		goodChance: 10,
		badChance: 5,
		goodHint: '',
		badHint: '',
	}));
};

/**
 * Response type for heavy context update.
 */
export interface HeavyContextUpdateResult {
	shouldUpdate: boolean;
	newContext?: HeavyContext;
}

/**
 * Analyzes recent game events and determines if the heavy context needs updating.
 * This function should be called after each game turn to maintain narrative continuity.
 *
 * @param apiKey - API Key.
 * @param gameState - Current game state (including current heavy context).
 * @param recentResponse - The GM's response from the action that just happened.
 * @param language - Target language.
 * @returns Object indicating whether to update and the new context if applicable.
 */
export const updateHeavyContext = async (
	apiKey: string,
	gameState: GameState,
	recentResponse: GMResponse,
	language: Language,
): Promise<HeavyContextUpdateResult> => {
	const messagesForContext = (recentResponse.messages || []).map((msg: GMResponseMessage) => {
		if (msg.type === 'dialogue') {
			return {
				senderName: msg.characterName || 'Unknown NPC',
				text: msg.dialogue || msg.text || '',
				type: 'dialogue',
			};
		}

		if (msg.type === 'system') {
			return {
				senderName: 'SYSTEM',
				text: msg.text || '',
				type: 'system',
			};
		}

		return {
			senderName: 'Narrator',
			text: msg.text || '',
			type: 'narration',
		};
	});

	const prompt = buildHeavyContextPrompt({
		gameState,
		recentResponse: {
			messages: messagesForContext,
			eventLog: recentResponse.stateUpdates.eventLog,
		},
		language,
	});

	const schemaInstruction = `\n\nYou MUST respond with a valid JSON object following this exact schema:\n${JSON.stringify(
		heavyContextSchema,
		null,
		2,
	)}`;

	const messages: LLMMessage[] = [
		{
			role: 'system',
			content:
				'You are a narrative context analyzer. Analyze recent story events and determine if the persistent context needs updating. Be conservative - only update when meaningful changes occur. Always respond with valid JSON.',
		},
		{
			role: 'user',
			content: prompt + schemaInstruction,
		},
	];

	try {
		const response = await queryLLM(apiKey, messages, {
			model: MODEL_CONFIG.heavyContext, // gpt-4.1-mini - análise de contexto
			responseFormat: 'json',
		});

		if (!response.text) {
			return { shouldUpdate: false };
		}

		const parsed: HeavyContextResponse = JSON.parse(cleanJsonString(response.text));

		if (!parsed.shouldUpdate || !parsed.changes) {
			return { shouldUpdate: false };
		}

		const sanitizeList = (list?: string[]): string[] => {
			if (!Array.isArray(list)) return [];
			const seen = new Set<string>();
			const result: string[] = [];
			for (const entry of list) {
				const value = (entry || '').trim();
				if (!value) continue;
				const key = value.toLowerCase();
				if (seen.has(key)) continue;
				seen.add(key);
				result.push(value);
				if (result.length === 5) break;
			}
			return result;
		};

		const currentContext = gameState.heavyContext || {};
		const nextContext: HeavyContext = {
			mainMission: currentContext.mainMission?.trim() || undefined,
			currentMission: currentContext.currentMission?.trim() || undefined,
			activeProblems: sanitizeList(currentContext.activeProblems),
			currentConcerns: sanitizeList(currentContext.currentConcerns),
			importantNotes: sanitizeList(currentContext.importantNotes),
		};

		const applyFieldChange = (field: 'mainMission' | 'currentMission', change?: HeavyContextFieldChange): boolean => {
			if (!change) return false;
			if (change.action === 'set') {
				const value = (change.value || '').trim();
				if (!value) return false;
				if (nextContext[field] !== value) {
					nextContext[field] = value;
					return true;
				}
				return false;
			}
			if (change.action === 'clear') {
				if (nextContext[field] !== undefined) {
					nextContext[field] = undefined;
					return true;
				}
			}
			return false;
		};

		const applyListChanges = (
			field: 'activeProblems' | 'currentConcerns' | 'importantNotes',
			changes?: HeavyContextListChange[],
		): boolean => {
			if (!Array.isArray(changes) || changes.length === 0) return false;
			let updated = [...(nextContext[field] || [])];
			let mutated = false;

			changes.forEach((change) => {
				const value = (change.value || '').trim();
				if (!value) return;
				const normalized = value.toLowerCase();

				if (change.action === 'add') {
					if (!updated.some((entry) => entry.toLowerCase() === normalized)) {
						updated.push(value);
						mutated = true;
					}
				} else if (change.action === 'remove') {
					const lengthBefore = updated.length;
					updated = updated.filter((entry) => entry.toLowerCase() !== normalized);
					if (updated.length !== lengthBefore) {
						mutated = true;
					}
				}
			});

			if (mutated) {
				updated = sanitizeList(updated);
				nextContext[field] = updated;
			}

			return mutated;
		};

		let mutated = false;
		mutated = applyFieldChange('mainMission', parsed.changes.mainMission) || mutated;
		mutated = applyFieldChange('currentMission', parsed.changes.currentMission) || mutated;
		mutated = applyListChanges('activeProblems', parsed.changes.activeProblems) || mutated;
		mutated = applyListChanges('currentConcerns', parsed.changes.currentConcerns) || mutated;
		mutated = applyListChanges('importantNotes', parsed.changes.importantNotes) || mutated;

		if (!mutated) {
			return { shouldUpdate: false };
		}

		nextContext.lastUpdated = Date.now();

		return {
			shouldUpdate: true,
			newContext: nextContext,
		};
	} catch (error) {
		console.error('Heavy Context Update Failed:', error);
		// On error, don't update - maintain current context
		return { shouldUpdate: false };
	}
};

/**
 * Handles the collaborative onboarding process.
 * @param apiKey - API Key.
 * @param history - Array of previous Q&A.
 * @param universeType - 'original' or 'existing'.
 * @param language - Language.
 * @returns Next question step configuration.
 */
export const processOnboardingStep = async (
	apiKey: string,
	history: { question: string; answer: string }[],
	universeType: 'original' | 'existing',
	language: Language,
): Promise<any> => {
	const prompt = buildOnboardingPrompt({ history, universeType, language });

	const onboardingSchemaStr = JSON.stringify(onboardingSchema, null, 2);

	const messages: LLMMessage[] = [
		{
			role: 'system',
			content: `You are an RPG world builder assistant. Always respond with valid JSON following this schema:\n${onboardingSchemaStr}`,
		},
		{
			role: 'user',
			content: prompt,
		},
	];

	try {
		const response = await queryLLM(apiKey, messages, {
			model: MODEL_CONFIG.onboarding, // gpt-4.1-mini - entrevista de criação
			responseFormat: 'json',
		});

		return JSON.parse(cleanJsonString(response.text!));
	} catch (error) {
		console.error('Onboarding Error:', error);
		throw error;
	}
};

/**
 * Result of updating the grid map positions.
 */
export interface GridUpdateResult {
	/** Whether the grid was updated */
	updated: boolean;
	/** The new grid snapshot if updated */
	snapshot?: GridSnapshot;
}

/**
 * Updates character positions on the 10x10 grid map based on recent game events.
 * This should be called after each action to track character movement.
 *
 * @param apiKey - OpenAI API Key.
 * @param gameState - Current game state.
 * @param recentResponse - The GM response from the action that just happened.
 * @param language - Target language.
 * @param currentMessageNumber - The current message/page number for the snapshot.
 * @returns Result indicating if update occurred and the new snapshot.
 */
export const updateGridPositions = async (
	apiKey: string,
	gameState: GameState,
	recentResponse: GMResponse,
	language: Language,
	currentMessageNumber: number,
): Promise<GridUpdateResult> => {
	// Get current grid positions from most recent snapshot
	const currentGridPositions = gameState.gridSnapshots && gameState.gridSnapshots.length > 0
		? gameState.gridSnapshots[gameState.gridSnapshots.length - 1].characterPositions
		: undefined;

	// Format messages for the prompt
	const messagesForContext = (recentResponse.messages || []).map((msg: GMResponseMessage) => {
		if (msg.type === 'dialogue') {
			return {
				type: 'dialogue' as const,
				characterName: msg.characterName || 'Unknown NPC',
				dialogue: msg.dialogue || msg.text || '',
			};
		}
		if (msg.type === 'system') {
			return {
				type: 'system' as const,
				text: msg.text || '',
			};
		}
		return {
			type: 'narration' as const,
			text: msg.text || '',
		};
	});

	const prompt = buildGridUpdatePrompt({
		gameState,
		recentMessages: messagesForContext as GMResponseMessage[],
		eventLog: recentResponse.stateUpdates.eventLog,
		currentGridPositions,
		language,
	});

	const schemaInstruction = `\n\nYou MUST respond with a valid JSON object following this exact schema:\n${JSON.stringify(
		gridUpdateSchema,
		null,
		2,
	)}`;

	const messages: LLMMessage[] = [
		{
			role: 'system',
			content:
				'You are a spatial positioning analyzer for an RPG game. Analyze character movements and determine grid positions. Always respond with valid JSON.',
		},
		{
			role: 'user',
			content: prompt + schemaInstruction,
		},
	];

	try {
		const response = await queryLLM(apiKey, messages, {
			model: MODEL_CONFIG.gridUpdate, // gpt-4.1-nano - análise espacial simples
			responseFormat: 'json',
		});

		if (!response.text) {
			return { updated: false };
		}

		const parsed: GridUpdateResponse = JSON.parse(cleanJsonString(response.text));

		if (!parsed.shouldUpdate || !parsed.characterPositions) {
			return { updated: false };
		}

		// Get current location info
		const currentLocation = gameState.locations[gameState.currentLocationId];

		// Get character avatars for display
		const characterPositions: GridCharacterPosition[] = parsed.characterPositions.map((pos) => {
			const character = gameState.characters[pos.characterId];
			return {
				characterId: pos.characterId,
				characterName: pos.characterName,
				position: { x: pos.x, y: pos.y },
				isPlayer: pos.isPlayer,
				avatarBase64: character?.avatarBase64,
			};
		});

		// Create the new snapshot
		const snapshot: GridSnapshot = {
			id: `grid_${gameState.id}_${Date.now()}`,
			gameId: gameState.id,
			atMessageNumber: currentMessageNumber,
			timestamp: Date.now(),
			locationId: gameState.currentLocationId,
			locationName: currentLocation?.name || 'Unknown',
			characterPositions,
		};

		console.log(`[Grid Update] Updated positions at message #${currentMessageNumber}: ${parsed.reasoning || 'No reason provided'}`);

		return {
			updated: true,
			snapshot,
		};
	} catch (error) {
		console.error('Grid Update Failed:', error);
		return { updated: false };
	}
};

/**
 * Creates an initial grid snapshot for a new game or location change.
 * Places characters in default positions.
 *
 * @param gameState - Current game state.
 * @param messageNumber - The message number for the snapshot.
 * @returns Initial grid snapshot.
 */
export const createInitialGridSnapshot = (
	gameState: GameState,
	messageNumber: number,
): GridSnapshot => {
	const currentLocation = gameState.locations[gameState.currentLocationId];
	const charactersAtLocation = Object.values(gameState.characters).filter(
		(c) => c.locationId === gameState.currentLocationId
	);

	// Place player in center, other characters around
	const characterPositions: GridCharacterPosition[] = charactersAtLocation.map((char, index) => {
		let x: number, y: number;

		if (char.isPlayer) {
			// Player starts at center
			x = 5;
			y = 5;
		} else {
			// NPCs are placed around the player
			// Simple circle placement around center
			const angle = (index * 2 * Math.PI) / Math.max(charactersAtLocation.length - 1, 1);
			const radius = 2;
			x = Math.round(5 + radius * Math.cos(angle));
			y = Math.round(5 + radius * Math.sin(angle));
			// Clamp to grid bounds
			x = Math.max(0, Math.min(9, x));
			y = Math.max(0, Math.min(9, y));
		}

		return {
			characterId: char.id,
			characterName: char.name,
			position: { x, y },
			isPlayer: char.isPlayer,
			avatarBase64: char.avatarBase64,
		};
	});

	return {
		id: `grid_${gameState.id}_${Date.now()}`,
		gameId: gameState.id,
		atMessageNumber: messageNumber,
		timestamp: Date.now(),
		locationId: gameState.currentLocationId,
		locationName: currentLocation?.name || 'Unknown',
		characterPositions,
	};
};
