/**
 * @fileoverview Prompt de Opções de Ação - Gerador de Sugestões Contextuais
 *
 * Este módulo contém o prompt responsável por gerar 5 opções de ação contextuais
 * para o jogador, cada uma com probabilidades de eventos bons e ruins associadas.
 * Implementa o sistema de "destino" que adiciona aleatoriedade narrativa ao jogo.
 *
 * @module prompts/actionOptions
 *
 * @description
 * O Action Options Prompt é usado para:
 *
 * - **Sugerir ações** - Gerar 5 opções relevantes ao contexto atual
 * - **Definir riscos** - Atribuir probabilidades de eventos positivos e negativos
 * - **Variar tipos** - Misturar diálogos, exploração, combate e interações
 * - **Prover dicas** - Indicar o que pode acontecer de bom ou ruim
 *
 * Este prompt alimenta o sistema de "rolagem de destino" onde cada ação
 * tem uma chance de desencadear consequências inesperadas.
 *
 * @example
 * ```typescript
 * import { buildActionOptionsPrompt } from './prompts/actionOptions.prompt';
 *
 * const prompt = buildActionOptionsPrompt({
 *   gameState,
 *   language: 'pt'
 * });
 * ```
 *
 * @see {@link ActionOptionsPromptParams} - Parâmetros aceitos pela função
 * @see {@link ActionOptionsResponse} - Formato da resposta esperada
 */

import { GameState, Language, ChatMessage, Character, Location } from '../../../types';
import { getLanguageName } from '../../../i18n/locales';
import { formatInventorySimple, normalizeInventory } from './helpers';
import { getItemAwarenessRulesForPrompt } from '../../../constants/economy';

/**
 * Parâmetros necessários para construir o prompt de opções de ação.
 *
 * @interface ActionOptionsPromptParams
 * @property {GameState} gameState - Estado completo do jogo para contexto
 * @property {Language} language - Idioma para geração das opções ('en', 'pt', 'es')
 */
export interface ActionOptionsPromptParams {
  /** Estado completo do jogo incluindo localização, personagem e histórico recente */
  gameState: GameState;
  /** Idioma no qual as opções de ação devem ser geradas */
  language: Language;
}

/**
 * Representa uma opção de ação gerada com suas probabilidades.
 *
 * @interface GeneratedActionOption
 * @property {string} text - Texto da ação (3-8 palavras)
 * @property {number} goodChance - Probabilidade (0-50) de algo bom acontecer
 * @property {number} badChance - Probabilidade (0-50) de algo ruim acontecer
 * @property {string} goodHint - Dica do que de bom pode acontecer
 * @property {string} badHint - Dica do que de ruim pode acontecer
 */
export interface GeneratedActionOption {
  /** Texto curto descrevendo a ação (3-8 palavras) */
  text: string;
  /** Probabilidade de evento positivo (0-50%) */
  goodChance: number;
  /** Probabilidade de evento negativo (0-50%) */
  badChance: number;
  /** Descrição breve do potencial benefício */
  goodHint: string;
  /** Descrição breve do potencial prejuízo */
  badHint: string;
}

/**
 * Formato da resposta esperada do prompt de opções de ação.
 *
 * @interface ActionOptionsResponse
 * @property {GeneratedActionOption[]} options - Array de exatamente 5 opções de ação
 */
export interface ActionOptionsResponse {
  options: GeneratedActionOption[];
}

/**
 * Constrói o prompt para gerar opções de ação contextuais com probabilidades.
 *
 * Este prompt instrui a IA a criar exatamente 5 ações que:
 *
 * **1. Sejam Contextuais:**
 * - Relevantes à localização atual
 * - Apropriadas à situação recente
 * - Considerem NPCs presentes
 *
 * **2. Sejam Concisas:**
 * - 3-8 palavras cada
 * - Claras e diretas
 * - Sem ambiguidade
 *
 * **3. Tenham Variedade:**
 * - Pelo menos uma opção de diálogo
 * - Pelo menos uma de exploração
 * - Opções de combate quando apropriado
 * - Uma opção cautelosa/defensiva
 *
 * **4. Incluam Probabilidades:**
 * - goodChance: 0-50% - chance de benefício
 * - badChance: 0-50% - chance de prejuízo
 * - O restante (100 - good - bad) é neutro
 *
 * **5. Forneçam Dicas:**
 * - goodHint: "encontrar tesouro", "ganhar aliado"
 * - badHint: "alertar inimigos", "acionar armadilha"
 *
 * A soma de goodChance + badChance não deve exceder 100%.
 * Ações arriscadas têm badChance maior, ações seguras menor.
 *
 * @param {ActionOptionsPromptParams} params - Parâmetros de entrada
 * @param {GameState} params.gameState - Estado atual do jogo
 * @param {Language} params.language - Idioma alvo
 *
 * @returns {string} O prompt formatado para envio à API da OpenAI
 *
 * @example
 * ```typescript
 * // Em uma taverna medieval
 * const tavernPrompt = buildActionOptionsPrompt({
 *   gameState: tavernGameState,
 *   language: 'pt'
 * });
 * // Pode gerar:
 * // 1. "Falar com o taverneiro" (good: 20, bad: 5)
 * // 2. "Observar os clientes suspeitos" (good: 15, bad: 10)
 * // 3. "Pedir uma bebida" (good: 10, bad: 0)
 * // 4. "Procurar por rumores" (good: 25, bad: 15)
 * // 5. "Sair discretamente" (good: 5, bad: 5)
 *
 * // Em uma masmorra perigosa
 * const dungeonPrompt = buildActionOptionsPrompt({
 *   gameState: dungeonGameState,
 *   language: 'pt'
 * });
 * // Pode gerar:
 * // 1. "Avançar pelo corredor escuro" (good: 20, bad: 30)
 * // 2. "Examinar a porta suspeita" (good: 25, bad: 20)
 * // 3. "Preparar uma tocha" (good: 15, bad: 5)
 * // 4. "Ouvir por sons" (good: 20, bad: 10)
 * // 5. "Recuar para área segura" (good: 5, bad: 5)
 * ```
 *
 * @remarks
 * O sistema de probabilidades cria uma camada de imprevisibilidade:
 * - Ações "seguras" podem ter surpresas positivas (encontrar algo)
 * - Ações "arriscadas" podem dar muito certo ou muito errado
 * - Jogadores podem calcular risco vs. recompensa antes de agir
 */
export function buildActionOptionsPrompt({
  gameState,
  language,
}: ActionOptionsPromptParams): string {
  const langName = getLanguageName(language);
  const player: Character | undefined =
    gameState.characters[gameState.playerCharacterId];
  const currentLocation: Location | undefined =
    gameState.locations[gameState.currentLocationId];
  const recentMessages: ChatMessage[] = gameState.messages.slice(-5);

  // Get player inventory and gold
  const normalizedInventory = normalizeInventory(player?.inventory);
  const playerInventory = formatInventorySimple(normalizedInventory);
  const playerGold = player?.stats?.gold ?? 0;
  const playerHp = player?.stats?.hp ?? 100;
  const playerMaxHp = player?.stats?.maxHp ?? 100;
  const healthPercent = Math.round((playerHp / playerMaxHp) * 100);

  // Obter NPCs presentes na localização atual (excluindo o jogador)
  const npcsInLocation: Character[] = Object.values(gameState.characters).filter(
    (char) =>
      char.locationId === gameState.currentLocationId &&
      char.id !== gameState.playerCharacterId &&
      char.state !== 'dead'
  );

  // Get NPC info with inventory/gold hints
  const npcList = npcsInLocation.map(npc => {
    const npcInventory = normalizeInventory(npc.inventory);
    const hasItems = npcInventory.length > 0;
    const npcGold = npc.stats?.gold;
    return `- ${npc.name} (${npc.state}): ${npc.description}${hasItems ? ' [has items]' : ''}${npcGold ? ` [${npcGold}g]` : ''}`;
  }).join('\n') || 'No one else is here';

  // Obter localizações conectadas
  const connectedLocations: Location[] = (currentLocation?.connectedLocationIds || [])
    .map((id) => gameState.locations[id])
    .filter(Boolean);

  // Construir contexto narrativo do heavyContext
  const heavyContext = gameState.heavyContext;
  const narrativeContext: string[] = [];

  if (heavyContext?.mainMission) {
    narrativeContext.push(`Main Mission: ${heavyContext.mainMission}`);
  }
  if (heavyContext?.currentMission) {
    narrativeContext.push(`Current Objective: ${heavyContext.currentMission}`);
  }
  if (heavyContext?.activeProblems?.length) {
    narrativeContext.push(`Active Problems: ${heavyContext.activeProblems.join('; ')}`);
  }
  if (heavyContext?.currentConcerns?.length) {
    narrativeContext.push(`Current Concerns: ${heavyContext.currentConcerns.join('; ')}`);
  }
  if (heavyContext?.importantNotes?.length) {
    narrativeContext.push(`Important Notes: ${heavyContext.importantNotes.join('; ')}`);
  }

  // Check for consumables
  const consumables = normalizedInventory.filter(item => item.consumable);
  const hasHealingItems = consumables.some(item =>
    item.name.toLowerCase().includes('potion') ||
    item.name.toLowerCase().includes('heal') ||
    item.name.toLowerCase().includes('cura') ||
    item.name.toLowerCase().includes('poção')
  );

  return `
You are a game master assistant. Based on the current game context, generate exactly 5 action options for the player.

=== UNIVERSE ===
${gameState.config.universeName}

=== CURRENT LOCATION ===
${currentLocation?.name || 'Unknown'}: ${currentLocation?.description || ''}
${connectedLocations.length > 0 ? `Connected to: ${connectedLocations.map((loc) => loc.name).join(', ')}` : ''}

=== PLAYER CHARACTER ===
Name: ${player?.name || 'Unknown'}
Description: ${player?.description || ''}
Status: HP ${playerHp}/${playerMaxHp} (${healthPercent}%) | Gold: ${playerGold}
Inventory: ${playerInventory || 'empty'}

=== NPCs PRESENT ===
${npcList}

=== NARRATIVE CONTEXT ===
${narrativeContext.length > 0 ? narrativeContext.join('\n') : 'No active quests or objectives'}

=== RECENT EVENTS ===
${recentMessages.map((m) => m.text).join(' | ')}

${getItemAwarenessRulesForPrompt()}

Rules:
1. Generate exactly 5 distinct, contextually appropriate actions
2. Actions should be short (3-8 words each)
3. Mix action types: dialogue, exploration, combat, interaction
4. Write in ${langName}
5. Make them specific to the current situation
6. Include at least one cautious/defensive option
${hasHealingItems && healthPercent < 70 ? '7. IMPORTANT: Player has low HP and healing items - suggest using them!\n' : ''}
8. For each action, assign probability percentages for good and bad events
   - goodChance: 0-50 (probability of something beneficial happening)
   - badChance: 0-50 (probability of something harmful happening)
   - The remaining percentage (100 - goodChance - badChance) is neutral (nothing special happens)
   - Risky actions should have higher badChance, safe actions lower
   - Interesting/bold actions may have both good and bad chances
9. For each action, provide brief hints about what could happen:
   - goodHint: brief description of the potential benefit (e.g., "find hidden treasure", "gain ally trust")
   - badHint: brief description of the potential harm (e.g., "alert enemies", "trigger trap")

Respond with JSON:
{
  "options": [
    {
      "text": "action text",
      "goodChance": 15,
      "badChance": 10,
      "goodHint": "what good could happen",
      "badHint": "what bad could happen"
    }
  ]
}
`;
}

/**
 * JSON Schema para validação da resposta de opções de ação.
 *
 * @constant
 * @type {object}
 */
export const actionOptionsSchema = {
  type: 'object',
  properties: {
    options: {
      type: 'array',
      description: 'Array of exactly 5 action options with probabilities',
      items: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Short action text (3-8 words)',
          },
          goodChance: {
            type: 'number',
            description: 'Probability (0-50) of a beneficial event',
            minimum: 0,
            maximum: 50,
          },
          badChance: {
            type: 'number',
            description: 'Probability (0-50) of a harmful event',
            minimum: 0,
            maximum: 50,
          },
          goodHint: {
            type: 'string',
            description: 'Brief description of potential benefit',
          },
          badHint: {
            type: 'string',
            description: 'Brief description of potential harm',
          },
        },
        required: ['text', 'goodChance', 'badChance', 'goodHint', 'badHint'],
      },
      minItems: 5,
      maxItems: 5,
    },
  },
  required: ['options'],
};
