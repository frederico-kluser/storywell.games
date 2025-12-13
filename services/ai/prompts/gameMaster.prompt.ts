/**
 * @fileoverview Prompt do Game Master - Motor de Lógica do RPG
 *
 * Este módulo contém o prompt principal do jogo, responsável por atuar como
 * Game Master (GM), motor de física e núcleo de lógica para o RPG baseado em texto.
 * É o "cérebro" do jogo que processa todas as ações do jogador.
 *
 * @module prompts/gameMaster
 *
 * @description
 * O Game Master Prompt é usado durante o loop principal do jogo para:
 *
 * - **Validar ações** - Verificar se a ação do jogador é possível dado o estado atual
 * - **Resolver mecânicas** - Aplicar custos de magia, dano de combate, uso de itens
 * - **Gerar narrativa** - Criar descrições imersivas e diálogos contextualmente apropriados
 * - **Atualizar estado** - Modificar inventários, stats, localizações e relacionamentos
 * - **Processar eventos de destino** - Incorporar eventos bons ou ruins baseados em probabilidade
 * - **Incluir contexto pesado** - Usar Heavy Context para continuidade narrativa
 * - **Definir tom de voz** - Especificar tom emocional para TTS em cada mensagem
 *
 * O prompt recebe o estado completo do jogo e a ação do jogador, e retorna
 * tanto a narrativa quanto as atualizações de estado necessárias.
 *
 * @example
 * ```typescript
 * import { buildGameMasterPrompt } from './prompts/gameMaster.prompt';
 *
 * const prompt = buildGameMasterPrompt({
 *   gameState,
 *   playerInput: 'Lanço uma bola de fogo no goblin',
 *   language: 'pt',
 *   fateResult: { type: 'good', hint: 'Crítico! Dano dobrado' }
 * });
 * ```
 *
 * @see {@link GameMasterPromptParams} - Parâmetros aceitos pela função
 * @see {@link gmResponseSchema} - Schema JSON da resposta esperada
 */

import {
	GameState,
	Language,
	FateResult,
	Character,
	Location,
	HeavyContext,
	Item,
	GridSnapshot,
	GridCharacterPosition,
	NarrativeStyleMode,
} from '../../../types';
import { getLanguageName } from '../../../i18n/locales';
import { getEconomyRulesForGMPrompt } from '../../../constants/economy';
import { formatInventoryForPrompt, formatStatsForPrompt, isItemInventory } from '../../../utils/inventory';
import {
	NarrativeGenre,
	PacingState,
	NarrativeThread,
	NPCVoiceProfile,
	generateNarrativeInstructions,
	VOICE_TEMPLATES,
} from './narrativeStyles';

/**
 * Parâmetros necessários para construir o prompt do Game Master.
 *
 * @interface GameMasterPromptParams
 * @property {GameState} gameState - Estado completo do jogo incluindo personagens, localizações, inventários, etc.
 * @property {string} playerInput - A ação ou fala que o jogador deseja realizar
 * @property {Language} language - Idioma para geração de texto ('en', 'pt', 'es')
 * @property {FateResult} [fateResult] - Resultado opcional do sistema de probabilidade (bom/ruim/neutro)
 * @property {NarrativeGenre} [genre] - Gênero narrativo para estilo específico
 * @property {'auto' | 'custom'} [narrativeStyleMode] - Permite forçar modo automático ou estilo personalizado
 * @property {string} [customNarrativeStyle] - Instruções personalizadas fornecidas pelo jogador
 * @property {PacingState} [pacingState] - Estado atual do ritmo narrativo
 * @property {NarrativeThread[]} [narrativeThreads] - Threads de foreshadowing e callbacks
 */
export interface GameMasterPromptParams {
	/** Estado completo do jogo com todos os personagens, localizações e histórico */
	gameState: GameState;
	/** Texto da ação que o jogador deseja executar */
	playerInput: string;
	/** Idioma no qual a narrativa deve ser gerada */
	language: Language;
	/** Resultado do roll de destino, se houver um evento especial a incorporar */
	fateResult?: FateResult;
	/** Gênero narrativo para aplicar convenções de estilo específicas */
	genre?: NarrativeGenre;
	/** Modo de seleção do estilo narrativo (auto vs custom) */
	narrativeStyleMode?: NarrativeStyleMode;
	/** Instruções personalizadas para substituir o gênero automático */
	customNarrativeStyle?: string;
	/** Estado atual do ritmo/pacing da narrativa */
	pacingState?: PacingState;
	/** Threads narrativas ativas (foreshadowing, callbacks, Chekhov's guns) */
	narrativeThreads?: NarrativeThread[];
	/** Se true, solicita voiceTone para TTS. Se false, não inclui instruções de tom */
	useTone?: boolean;
}

/**
 * Representação simplificada de um personagem para o contexto do prompt.
 * Usado internamente para serializar apenas os dados relevantes.
 *
 * @interface CharacterContext
 */
interface CharacterContext {
	id: string;
	name: string;
	state: string;
	description: string;
	stats: Record<string, number>;
	inventory: Item[] | string[];
}

/**
 * Infere um perfil de voz básico a partir da descrição do NPC.
 * Usa heurísticas simples para criar diferenciação de voz.
 */
function inferVoiceProfileFromDescription(description: string, name: string): Partial<NPCVoiceProfile> {
	const desc = description.toLowerCase();
	const profile: Partial<NPCVoiceProfile> = {};

	// Inferir classe social
	if (
		desc.includes('rei') ||
		desc.includes('rainha') ||
		desc.includes('king') ||
		desc.includes('queen') ||
		desc.includes('majest')
	) {
		profile.socialClass = 'royalty';
		profile.educationLevel = 'educated';
	} else if (
		desc.includes('nobre') ||
		desc.includes('lord') ||
		desc.includes('lady') ||
		desc.includes('conde') ||
		desc.includes('duque')
	) {
		profile.socialClass = 'nobility';
		profile.educationLevel = 'educated';
	} else if (
		desc.includes('mercador') ||
		desc.includes('merchant') ||
		desc.includes('comerciante') ||
		desc.includes('lojista')
	) {
		profile.socialClass = 'middle';
		profile.educationLevel = 'common';
		profile.verbalTics = ['meu amigo', 'bom negócio', 'entre nós'];
	} else if (
		desc.includes('camponês') ||
		desc.includes('peasant') ||
		desc.includes('fazendeiro') ||
		desc.includes('farmer')
	) {
		profile.socialClass = 'lower';
		profile.educationLevel = 'uneducated';
	} else if (desc.includes('mendigo') || desc.includes('beggar') || desc.includes('ladrão') || desc.includes('thief')) {
		profile.socialClass = 'outcast';
		profile.educationLevel = 'uneducated';
	}

	// Inferir educação por profissão
	if (
		desc.includes('mago') ||
		desc.includes('wizard') ||
		desc.includes('scholar') ||
		desc.includes('estudioso') ||
		desc.includes('sábio')
	) {
		profile.educationLevel = 'scholarly';
		profile.verbalTics = ['de fato', 'curiosamente', 'segundo os textos'];
	} else if (desc.includes('padre') || desc.includes('priest') || desc.includes('monge') || desc.includes('monk')) {
		profile.educationLevel = 'educated';
		profile.verbalTics = ['que os deuses', 'abençoado seja', 'minha criança'];
	} else if (
		desc.includes('soldado') ||
		desc.includes('soldier') ||
		desc.includes('guarda') ||
		desc.includes('guard')
	) {
		profile.educationLevel = 'common';
		profile.speechRhythm = 'fast';
		profile.verbalTics = ['senhor', 'entendido', 'às ordens'];
	}

	// Inferir ritmo de fala
	if (desc.includes('velho') || desc.includes('old') || desc.includes('ancião') || desc.includes('elderly')) {
		profile.speechRhythm = 'slow';
	} else if (desc.includes('criança') || desc.includes('child') || desc.includes('jovem') || desc.includes('young')) {
		profile.speechRhythm = 'fast';
		profile.educationLevel = 'uneducated';
	} else if (desc.includes('nervoso') || desc.includes('nervous') || desc.includes('ansioso')) {
		profile.speechRhythm = 'erratic';
	}

	// Traço de personalidade baseado em adjetivos
	if (desc.includes('sombrio') || desc.includes('dark') || desc.includes('sinistro')) {
		profile.personalityTrait = 'misterioso e reservado';
	} else if (desc.includes('alegre') || desc.includes('cheerful') || desc.includes('sorridente')) {
		profile.personalityTrait = 'otimista e caloroso';
	} else if (desc.includes('sério') || desc.includes('serious') || desc.includes('grave')) {
		profile.personalityTrait = 'solene e direto';
	} else if (desc.includes('astuto') || desc.includes('cunning') || desc.includes('esperto')) {
		profile.personalityTrait = 'calculista e observador';
	}

	return profile;
}

/**
 * Constrói o prompt para o Game Master que processa ações do jogador
 * e gera respostas narrativas com atualizações de estado.
 *
 * Este prompt instrui a IA a:
 *
 * **1. Validar Viabilidade e Custos:**
 * - MAGIA: Verificar mana nos Stats, deduzir custo
 * - COMBATE: Verificar arma no Inventário
 * - CONSUMÍVEIS: Verificar item no Inventário, remover se usado
 * - PROPRIEDADES OCULTAS: Aplicar efeitos de veneno, buffs, etc.
 *
 * **2. Verificar Propriedade e Interação:**
 * - Roubo/Troca requer consentimento do NPC ou check de capacidade
 * - Transferências de itens devem ser validadas
 *
 * **3. Atualizar Estado (O Banco de Dados):**
 * - INVENTÁRIO: Retornar array completo se alterado
 * - STATS: Retornar apenas chaves alteradas como pares key-value
 *
 * **4. Formatar Resposta:**
 * - 'dialogue': Fala de personagem
 * - 'narration': Descrição de ações/cena
 * - 'system': Mecânicas fora do personagem (OOC)
 * - 'voiceTone': Tom emocional para cada mensagem (para TTS)
 *
 * **5. Processar Eventos de Destino:**
 * - Se fateResult.type === 'good': Incorporar evento positivo
 * - Se fateResult.type === 'bad': Incorporar evento negativo
 * - Usar hint como guia para o tipo de evento
 *
 * **6. Considerar Heavy Context:**
 * - Usar missão atual para direcionar narrativa
 * - Referenciar problemas ativos quando relevante
 * - Manter preocupações em mente para tensão
 *
 * @param {GameMasterPromptParams} params - Parâmetros de entrada para o prompt
 * @param {GameState} params.gameState - Estado atual do jogo
 * @param {string} params.playerInput - Ação do jogador
 * @param {Language} params.language - Idioma alvo
 * @param {FateResult} [params.fateResult] - Evento de destino opcional
 *
 * @returns {string} O prompt formatado para envio à API da OpenAI
 *
 * @example
 * ```typescript
 * // Ação simples sem evento de destino
 * const prompt = buildGameMasterPrompt({
 *   gameState: currentGameState,
 *   playerInput: 'Examino a estante de livros',
 *   language: 'pt'
 * });
 *
 * // Ação com evento de destino positivo
 * const luckyPrompt = buildGameMasterPrompt({
 *   gameState: currentGameState,
 *   playerInput: 'Tento abrir o baú',
 *   language: 'pt',
 *   fateResult: {
 *     type: 'good',
 *     hint: 'Encontra um item valioso escondido'
 *   }
 * });
 *
 * // Ação com evento de destino negativo
 * const unluckyPrompt = buildGameMasterPrompt({
 *   gameState: currentGameState,
 *   playerInput: 'Entro na caverna escura',
 *   language: 'pt',
 *   fateResult: {
 *     type: 'bad',
 *     hint: 'Aciona uma armadilha'
 *   }
 * });
 * ```
 */
export function buildGameMasterPrompt({
	gameState,
	playerInput,
	language,
	fateResult,
	genre,
	pacingState,
	narrativeThreads,
	useTone = true,
	narrativeStyleMode,
	customNarrativeStyle,
}: GameMasterPromptParams): string {
	const currentLocation: Location | undefined = gameState.locations[gameState.currentLocationId];
	const charactersHere: Character[] = Object.values(gameState.characters).filter(
		(c) => c.locationId === gameState.currentLocationId,
	);
	const player: Character = gameState.characters[gameState.playerCharacterId];
	const langName = getLanguageName(language);
	const playerNameForPrompt = player.name.replace(/"/g, '"');

	// Build NPC voice profiles for differentiation
	const npcsInScene = charactersHere
		.filter((c) => !c.isPlayer && c.state !== 'dead')
		.map((npc) => {
			// Try to infer voice profile from NPC description
			const profile: Partial<NPCVoiceProfile> = inferVoiceProfileFromDescription(npc.description, npc.name);
			return { name: npc.name, profile };
		});

	const runtimeNarrative = gameState.narrativeConfig || {};
	const configNarrativeMode: NarrativeStyleMode =
		runtimeNarrative.narrativeStyleMode ?? gameState.config?.narrativeStyleMode ?? 'auto';
	const effectiveNarrativeMode = narrativeStyleMode ?? configNarrativeMode;
	const configCustomStyle =
		runtimeNarrative.customNarrativeStyle?.trim() || gameState.config?.customNarrativeStyle?.trim();
	const providedCustomStyle = customNarrativeStyle?.trim();
	const finalCustomStyle = effectiveNarrativeMode === 'custom' ? providedCustomStyle || configCustomStyle : undefined;
	const shouldUseCustomStyle = effectiveNarrativeMode === 'custom' && !!finalCustomStyle;
	const runtimeGenre = runtimeNarrative.genre ?? gameState.config?.genre;
	const resolvedGenre = shouldUseCustomStyle ? undefined : genre ?? runtimeGenre;

	const narrativeStyleSection = generateNarrativeInstructions({
		genre: resolvedGenre,
		customStyleDescription: shouldUseCustomStyle ? finalCustomStyle : undefined,
		pacingState,
		npcsInScene: npcsInScene.length > 0 ? npcsInScene : undefined,
		narrativeThreads,
	});

	// Build universe context section if available
	let universeContextSection = '';
	if (gameState.universeContext) {
		universeContextSection = `
    === UNIVERSE NARRATIVE CONTEXT ===
    This is the comprehensive narrative context for the "${gameState.config.universeName}" universe.
    USE THIS CONTEXT to maintain consistency in:
    - Character dialogue style, slang, and expressions
    - Currency names and economic references
    - Cultural customs, greetings, and social norms
    - Technology/magic terminology
    - Narrative tone and atmosphere

    --- BEGIN UNIVERSE CONTEXT ---
    ${gameState.universeContext}
    --- END UNIVERSE CONTEXT ---

`;
	}

	// Build heavy context section if available
	let heavyContextSection = '';
	if (gameState.heavyContext) {
		const ctx: HeavyContext = gameState.heavyContext;
		const parts: string[] = [];

		if (ctx.mainMission) {
			parts.push(`MAIN MISSION: ${ctx.mainMission}`);
		}
		if (ctx.currentMission) {
			parts.push(`CURRENT MISSION: ${ctx.currentMission}`);
		}
		if (ctx.activeProblems && ctx.activeProblems.length > 0) {
			parts.push(`ACTIVE PROBLEMS: ${ctx.activeProblems.join(' | ')}`);
		}
		if (ctx.currentConcerns && ctx.currentConcerns.length > 0) {
			parts.push(`CURRENT CONCERNS: ${ctx.currentConcerns.join(' | ')}`);
		}
		if (ctx.importantNotes && ctx.importantNotes.length > 0) {
			parts.push(`IMPORTANT NOTES: ${ctx.importantNotes.join(' | ')}`);
		}

		if (parts.length > 0) {
			heavyContextSection = `
    === NARRATIVE CONTEXT (HEAVY CONTEXT) ===
    This is important ongoing context that should influence your narrative decisions:
    ${parts.join('\n    ')}

    Consider this context when:
    - Determining NPC reactions and dialogue
    - Describing the player's emotional state or concerns
    - Adding tension or urgency when appropriate
    - Referencing ongoing story threads
`;
		}
	}

	// Build grid context section if available
	let gridContextSection = '';
	if (gameState.gridSnapshots && gameState.gridSnapshots.length > 0) {
		const latestGrid = gameState.gridSnapshots[gameState.gridSnapshots.length - 1];
		const gridPositions = latestGrid.characterPositions
			.map((pos: GridCharacterPosition) => {
				const distance = pos.isPlayer
					? ''
					: ` - Distance from player: ~${
							Math.abs(
								pos.position.x -
									(latestGrid.characterPositions.find((p: GridCharacterPosition) => p.isPlayer)?.position.x || 5),
							) +
							Math.abs(
								pos.position.y -
									(latestGrid.characterPositions.find((p: GridCharacterPosition) => p.isPlayer)?.position.y || 5),
							)
					  } cells`;
				return `- ${pos.characterName}${pos.isPlayer ? ' [PLAYER]' : ''}: position (${pos.position.x}, ${
					pos.position.y
				})${distance}`;
			})
			.join('\n    ');

		gridContextSection = `
    === SPATIAL CONTEXT (10x10 GRID MAP) ===
    Characters' current positions on the map (coordinates 0-9):
    ${gridPositions}

    Narration requirements:
    - Explicitly describe where key NPCs are relative to the player whenever their placement matters (e.g., "Lyra lingers two cells to your right").
    - When movement happens, mention how the distance/direction between the player and the moving character changes.

    Consider spatial positioning when:
    - Determining if characters can interact directly (same or adjacent cells)
    - Describing movement ("approaches", "moves away", "crosses the room")
    - Combat range and positioning
    - Characters at distance (3+ cells) require movement to interact closely
`;
	}

	// Build fate instruction if there's a fate event
	let fateInstruction = '';
	if (fateResult && fateResult.type !== 'neutral') {
		if (fateResult.type === 'good') {
			fateInstruction = `
    === FATE EVENT: CRITICAL SUCCESS (ACTION MUST TRIUMPH) ===
    The fate dice have GUARANTEED that the player's intended action WORKS exactly as planned and produces an EXTRA BENEFIT.
    Hint about the amplified payoff: "${fateResult.hint || 'An unexpected benefit or advantage'}"

    You MUST narrate the player accomplishing their goal and layer on top a boon that matches the hint. Treat it like a cinematic critical success:
    - The intended objective is completed cleanly and decisively (no partial success wording)
    - Add an additional boon: discovery, ally aid, bonus loot, positional advantage, etc.
    - Show how luck tilts the scene in the player's favor (enemies slip, mechanisms click, weather helps, etc.)
    - Update stats/inventory/relationships to reflect the hard benefit (not just flavor text)

    This CRITICAL SUCCESS overrides other cautionary rules. Make the payoff feel dramatic yet coherent with the current context.
`;
		} else {
			fateInstruction = `
    === FATE EVENT: CRITICAL FAILURE (ACTION MUST COLLAPSE) ===
    The fate dice have DOOMED the player's intended action. It MUST FAIL or BACKFIRE spectacularly.
    Hint about the setback: "${fateResult.hint || 'An unexpected complication or danger'}"

    You MUST deny the player's desired outcome. Portray the failure as catastrophic and use the hint to decide the punishment:
    - The key objective is blocked, undone, or produces the opposite effect
    - Introduce lasting harm: damage, item loss, alerted enemies, broken tools, captured allies, etc.
    - Ensure any progress that would have stemmed from the action is halted or inverted
    - Update stats/inventory/relationships to reflect the negative consequence (not just narration)

    This CRITICAL FAILURE overrides any other logic. Make it clear the attempt backfired and the player must recover in future turns.
`;
		}
	}

	// Build character context array for characters present at current location
	const charactersContext: CharacterContext[] = charactersHere.map((c) => ({
		id: c.id,
		name: c.name,
		state: c.state,
		description: c.description,
		stats: c.stats,
		inventory: c.inventory,
	}));

	// Build list of ALL known characters in the game (for dialogue attribution)
	const allCharacters = Object.values(gameState.characters);
	const knownCharactersList = allCharacters
		.filter((c) => !c.isPlayer)
		.map(
			(c) => `- "${c.name}" (ID: ${c.id}) - ${c.description.substring(0, 80)}${c.description.length > 80 ? '...' : ''}`,
		)
		.join('\n    ');

	return `
    You are the Game Master (GM), Physics Engine, and Logic Core for a text-based RPG.

    Current Universe: ${gameState.config.universeName} (${gameState.config.universeType})
    Current Location: ${currentLocation?.name} - ${currentLocation?.description}
    Current Turn: ${gameState.turnCount}
    Target Language: ${langName}

    ACTIVE PLAYER:
    ID: ${player.id} | Name: ${player.name}
    ${formatStatsForPrompt(player.stats)}
    ${formatInventoryForPrompt(isItemInventory(player.inventory) ? player.inventory : [])}

    CHARACTERS PRESENT AT LOCATION (Interactive Entities):
    ${JSON.stringify(charactersContext)}

    === KNOWN_CHARACTERS (ALL NPCs IN THE GAME) ===
    These characters ALREADY EXIST in the game. When they speak, use their exact name.
    ${knownCharactersList || '(No NPCs introduced yet)'}

${universeContextSection}${heavyContextSection}${gridContextSection}${fateInstruction}${narrativeStyleSection}
${getEconomyRulesForGMPrompt()}

    === ACTION RESOLUTION LOGIC (MANDATORY) ===
    You must validate the Player's Action "${playerInput}" against the current state before narrating.

    1. FEASIBILITY & COSTS:
       - MAGIC: Check 'mana' in Stats. Deduct cost in 'updatedCharacters'.
       - COMBAT: Check weapon in Inventory.
       - CONSUMABLES: Check item in Inventory. Remove it if used.
       - HIDDEN PROPERTIES: Apply effects (poison, buffs) to Stats.

    2. OWNERSHIP & INTERACTION:
       - Stealing/Trading requires NPC consent or capability check.

    3. STATE UPDATES (The Database):
       - INVENTORY: Return NEW full array if changed.
       - STATS: Return specific changed keys in the 'stats' array (key-value pairs).

    === MESSAGE FORMAT (CRITICAL) ===
    Your response contains an array of messages. Each message has a TYPE:

    **For NARRATION (type: "narration"):**
    - Use "text" field for the narrative description
    - Example: { "type": "narration", "text": "The door creaks open..."${useTone ? ', "voiceTone": "mysterious"' : ''} }

    **For SYSTEM (type: "system"):**
    - Use "text" field for OOC mechanics info
    - Example: { "type": "system", "text": "You lost 10 HP"${useTone ? ', "voiceTone": "neutral"' : ''} }

    **For DIALOGUE (type: "dialogue") - IMPORTANT:**
    - Use "characterName" for WHO is speaking
    - Use "dialogue" for WHAT they say
    - Example: { "type": "dialogue", "characterName": "Old Sage", "dialogue": "Welcome, traveler!"${
			useTone ? ', "voiceTone": "warm"' : ''
		} }

    === CHARACTER DIALOGUE RULES (CRITICAL) ===

    **When a character speaks:**
    1. Check if the characterName is in KNOWN_CHARACTERS list above
    2. If YES (character exists): Just use characterName + dialogue
    3. If NO (new character): You MUST include "newCharacterData" with:
       - id: "npc_${gameState.turnCount}_[shortname]_[4randomDigits]"
       - name: Same as characterName
       - description: Physical appearance (2-3 sentences, be creative and detailed)
       - locationId: "${currentLocation?.id || 'unknown'}"
       - state: "talking"
       - Optional: inventory, stats

    **EXAMPLE - Existing character speaks:**
    {
      "type": "dialogue",
      "characterName": "Old Sage",
      "dialogue": "I remember you from last time!"${useTone ? ',\n      "voiceTone": "friendly"' : ''}
    }

    **EXAMPLE - NEW character speaks (first appearance):**
    {
      "type": "dialogue",
      "characterName": "Mysterious Merchant",
      "dialogue": "Interested in my wares?"${useTone ? ',\n      "voiceTone": "sly"' : ''},
      "newCharacterData": {
        "id": "npc_${gameState.turnCount}_merchant_4821",
        "name": "Mysterious Merchant",
        "description": "A hooded figure with glowing purple eyes and long fingers adorned with silver rings. Their cloak seems to shimmer between colors.",
        "locationId": "${currentLocation?.id || 'unknown'}",
        "state": "talking",
        "inventory": ["strange potions", "ancient map", "silver dagger"]
      }
    }

    **ENCOURAGEMENT TO CREATE NEW CHARACTERS:**
    - The world should feel ALIVE with interesting NPCs
    - When the player visits new places, introduce new characters naturally
    - When the player seeks someone specific, create that character
    - Each new NPC should have a unique personality and appearance
    - Don't be afraid to introduce merchants, guards, travelers, etc.

    === PLAYER AGENCY RULES (CRITICAL) ===
    The human player is the only one who decides what "${playerNameForPrompt}" says, thinks, or feels.
    - NEVER generate a dialogue bubble for the player character
    - NEVER paraphrase or answer on their behalf
    - If an NPC expects an answer, narrate that they await the player's reply instead of providing it
    - FORBIDDEN characterName values (case insensitive): "${playerNameForPrompt}", "${player.name.toUpperCase()}", "${player.name.toLowerCase()}", "Player", "The Player", "You", "Tu", "Você", "Voce", "Jogador", "Jugadora", "Jugador"

    WRONG:
    { "type": "dialogue", "characterName": "${playerNameForPrompt}", "dialogue": "Claro, eu aceito a missão." }

    CORRECT:
    { "type": "narration", "text": "${playerNameForPrompt} sente o peso da decisão enquanto todos aguardam sua resposta."${
		useTone ? ', "voiceTone": "tense"' : ''
	} }
${
	useTone
		? `
    === VOICE TONE (for Text-to-Speech) ===
    For EACH message, specify a 'voiceTone' describing how it should be read aloud.
    Examples: 'excited', 'mysterious', 'angry', 'sad', 'fearful', 'whispering', 'shouting', 'sarcastic', 'calm', 'urgent', 'playful', 'solemn', 'threatening', 'warm', 'cold', 'nervous', 'confident'.
`
		: ''
}
    === ABSOLUTE FATE OUTCOME DIRECTIVE (OVERRIDES EVERYTHING ELSE) ===
    - If fateResult?.type === 'good': Treat it as a CRITICAL SUCCESS. The player's intention MUST succeed completely, and you must apply an extra advantage aligned with the hint.
    - If fateResult?.type === 'bad': Treat it as a CRITICAL FAILURE. The player's intention MUST fail or backfire, and you must apply a concrete punishment aligned with the hint.
    - If no fateResult is provided or the type is 'neutral': Resolve the action normally using feasibility and context checks.
    NEVER undermine this directive with soft wording. Make the success/failure unmistakable and reflect the outcome in state updates.

    CRITICAL: All narrative text must be in ${langName} (${language}).
  `;
}

/**
 * JSON Schema for Item objects in inventory.
 * Defines the structure for items with category, value, and effects.
 */
export const itemSchema = {
	type: 'object',
	properties: {
		id: {
			type: 'string',
			description: 'Unique identifier. Format: item_[timestamp]_[random]',
		},
		name: {
			type: 'string',
			description: 'Display name of the item',
		},
		category: {
			type: 'string',
			enum: ['consumable', 'weapon', 'armor', 'valuable', 'material', 'quest', 'currency', 'misc'],
			description: 'Item category for pricing and rules',
		},
		description: {
			type: 'string',
			description: 'Optional description of the item',
		},
		baseValue: {
			type: 'number',
			description: 'Base value in gold (use PRICE_RANGES by category)',
		},
		quantity: {
			type: 'number',
			description: 'Quantity if stackable (default: 1)',
		},
		isStackable: {
			type: 'boolean',
			description: 'Whether multiple can stack (consumables/materials typically stack)',
		},
		effects: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					stat: { type: 'string', description: 'Stat to modify (hp, gold, etc.)' },
					value: { type: 'number', description: 'Amount to add/subtract' },
					duration: { type: 'number', description: 'Duration in turns (optional)' },
				},
				required: ['stat', 'value'],
			},
			description: 'Effects when used/equipped',
		},
		isEquipped: {
			type: 'boolean',
			description: 'Whether currently equipped (for weapons/armor)',
		},
	},
	required: ['name', 'category'],
};

/**
 * JSON Schema para validação da resposta do Game Master.
 * Define a estrutura exata que a IA deve retornar.
 *
 * @constant
 * @type {object}
 *
 * @description
 * A resposta contém duas seções principais:
 *
 * **messages**: Array de mensagens para exibir no chat
 * - senderName: Nome do personagem, 'Narrator' ou 'SYSTEM'
 * - text: Conteúdo visível da mensagem
 * - type: Classificação para renderização (dialogue, narration, system)
 * - voiceTone: Tom emocional para Text-to-Speech
 *
 * **stateUpdates**: Instruções para atualizar o estado do jogo
 * - newLocations: Novas localizações descobertas
 * - newCharacters: Novos NPCs encontrados
 * - updatedCharacters: Modificações em personagens existentes
 * - locationChange: ID da nova localização se o jogador se moveu
 * - eventLog: Resumo do que aconteceu (obrigatório)
 */
export const gmResponseSchema = {
	type: 'object',
	properties: {
		messages: {
			type: 'array',
			description:
				'List of response messages (bubbles) to be displayed in the chat UI. Each message is either a narration, system message, or character dialogue.',
			items: {
				type: 'object',
				properties: {
					type: {
						type: 'string',
						enum: ['dialogue', 'narration', 'system'],
						description:
							'Type of message: narration (GM describing), dialogue (character speaking), or system (OOC mechanics).',
					},
					voiceTone: {
						type: 'string',
						description:
							"Emotional tone for text-to-speech. Examples: 'excited', 'mysterious', 'angry', 'sad', 'fearful', 'whispering', 'shouting', 'sarcastic', 'calm', 'urgent', 'playful', 'solemn', 'threatening', 'warm', 'cold', 'nervous', 'confident'.",
					},
					// For narration and system messages
					text: {
						type: 'string',
						description:
							'Text content for narration or system messages. Use this field when type is "narration" or "system".',
					},
					// For dialogue messages
					characterName: {
						type: 'string',
						description:
							'Name of the character speaking. REQUIRED when type is "dialogue". Must match a character from KNOWN_CHARACTERS or be a new character.',
					},
					dialogue: {
						type: 'string',
						description: 'The dialogue text spoken by the character. REQUIRED when type is "dialogue".',
					},
					// For NEW characters speaking for the first time
					newCharacterData: {
						type: 'object',
						description:
							'REQUIRED when type is "dialogue" AND the characterName is NOT in KNOWN_CHARACTERS list. Contains data to create the new character.',
						properties: {
							id: {
								type: 'string',
								description: 'Unique ID for the character. Format: npc_[turnNumber]_[shortName]_[random4digits]',
							},
							name: {
								type: 'string',
								description: 'Full name of the character (must match characterName).',
							},
							description: {
								type: 'string',
								description: 'Physical description and notable features (2-3 sentences).',
							},
							locationId: {
								type: 'string',
								description: 'Current location ID where the character is.',
							},
							state: {
								type: 'string',
								enum: ['idle', 'talking', 'fighting', 'unconscious', 'dead'],
								description: 'Current state of the character.',
							},
							inventory: {
								type: 'array',
								items: itemSchema,
								description: 'Items the character carries (use Item format with category and baseValue).',
							},
							stats: {
								type: 'array',
								items: {
									type: 'object',
									properties: {
										key: { type: 'string' },
										value: { type: 'number' },
									},
									required: ['key', 'value'],
								},
								description: 'Character stats like hp, strength, etc.',
							},
						},
						required: ['id', 'name', 'description', 'locationId', 'state'],
					},
				},
				required: ['type'],
			},
		},
		stateUpdates: {
			type: 'object',
			description: 'Instructions to update the internal IndexedDB state.',
			properties: {
				newLocations: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							id: { type: 'string' },
							name: { type: 'string' },
							description: { type: 'string' },
							connectedLocationIds: { type: 'array', items: { type: 'string' } },
						},
						required: ['id', 'name', 'description'],
					},
				},
				newCharacters: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							id: { type: 'string' },
							name: { type: 'string' },
							description: { type: 'string' },
							locationId: { type: 'string' },
							state: { type: 'string' },
							inventory: { type: 'array', items: itemSchema },
							stats: {
								type: 'array',
								items: {
									type: 'object',
									properties: {
										key: { type: 'string' },
										value: { type: 'number' },
									},
									required: ['key', 'value'],
								},
							},
						},
						required: ['id', 'name', 'description', 'locationId', 'state'],
					},
				},
				updatedCharacters: {
					type: 'array',
					description: 'Modifications to existing characters (Inventory, Stats, Relationships).',
					items: {
						type: 'object',
						properties: {
							id: { type: 'string' },
							name: { type: 'string' },
							relationships: {
								type: 'array',
								items: {
									type: 'object',
									properties: {
										targetId: { type: 'string' },
										score: { type: 'number' },
									},
									required: ['targetId', 'score'],
								},
							},
							state: { type: 'string' },
							inventory: { type: 'array', items: itemSchema },
							stats: {
								type: 'array',
								items: {
									type: 'object',
									properties: {
										key: { type: 'string' },
										value: { type: 'number' },
									},
									required: ['key', 'value'],
								},
							},
						},
						required: ['id'],
					},
				},
				locationChange: { type: 'string' },
				eventLog: { type: 'string' },
			},
			required: ['eventLog'],
		},
	},
	required: ['messages', 'stateUpdates'],
};
