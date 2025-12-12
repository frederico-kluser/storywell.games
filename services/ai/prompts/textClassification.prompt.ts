/**
 * @fileoverview Prompt de Classificação e Processamento de Texto do Jogador
 *
 * Este módulo contém o prompt responsável por classificar o input do jogador
 * como "ação" ou "fala" e, no caso de fala, reescrever para se adequar
 * ao personagem e universo.
 *
 * @module prompts/textClassification
 *
 * @description
 * O Text Classification Prompt usa GPT-4.1-nano para:
 *
 * - **Classificar input** - Identificar se é uma ação ou uma fala
 * - **Reescrever falas** - Adaptar diálogos ao estilo do personagem e universo
 * - **Preservar ações** - Manter comandos/ações inalterados
 *
 * Este prompt é chamado ANTES de qualquer outro processamento, sendo a primeira
 * etapa após o jogador digitar ou selecionar uma opção.
 *
 * @example
 * ```typescript
 * import { buildTextClassificationPrompt } from './prompts/textClassification.prompt';
 *
 * const prompt = buildTextClassificationPrompt({
 *   gameState,
 *   rawInput: 'Ei, você aí! Me ajuda!',
 *   language: 'pt'
 * });
 * // Retorna JSON: { type: "speech", processedText: "Ó, viajante! Poderia me auxiliar?", shouldProcess: true }
 * ```
 */

import { GameState, Language, ChatMessage, Character, Location } from '../../../types';
import { getLanguageName } from '../../../i18n/locales';

/**
 * Parâmetros necessários para construir o prompt de classificação de texto.
 *
 * @interface TextClassificationPromptParams
 * @property {GameState} gameState - Estado completo do jogo para contexto
 * @property {string} rawInput - O texto original digitado pelo jogador
 * @property {Language} language - Idioma para geração ('en', 'pt', 'es')
 */
export interface TextClassificationPromptParams {
  /** Estado completo do jogo incluindo personagem, localização e histórico */
  gameState: GameState;
  /** Texto original que o jogador digitou ou selecionou */
  rawInput: string;
  /** Idioma no qual a mensagem processada deve ser gerada */
  language: Language;
}

/**
 * Formato da resposta esperada da classificação de texto.
 *
 * @interface TextClassificationResponse
 * @property {'action' | 'speech'} type - Tipo do input: ação ou fala
 * @property {string} processedText - Texto processado (alterado se fala, original se ação)
 * @property {boolean} shouldProcess - Se o texto foi processado/alterado
 */
export interface TextClassificationResponse {
  /** Tipo do input identificado */
  type: 'action' | 'speech';
  /** Texto processado - adaptado se for fala, original se for ação */
  processedText: string;
  /** Indica se o texto foi modificado */
  shouldProcess: boolean;
}

/**
 * Constrói o prompt para classificar o input do jogador e processar falas.
 *
 * Este prompt instrui a IA (GPT-4.1-nano) a:
 *
 * **1. Classificar o Input:**
 * - ACTION: Comandos, ações físicas, verbos de ação (atacar, ir, olhar, pegar, etc.)
 * - SPEECH: Diálogos, falas, o que o personagem DIZ a outros
 *
 * **2. Para AÇÕES:**
 * - Retornar o texto ORIGINAL sem alterações
 * - type: "action", shouldProcess: false
 *
 * **3. Para FALAS:**
 * - Reescrever para se adequar ao personagem e universo
 * - Considerar: personalidade, background, estilo do universo
 * - Considerar: contexto das últimas mensagens
 * - Manter a intenção e significado original
 * - type: "speech", shouldProcess: true
 *
 * @param {TextClassificationPromptParams} params - Parâmetros de entrada
 * @returns {string} O prompt formatado para envio à API da OpenAI
 *
 * @example
 * ```typescript
 * // Input é uma AÇÃO - não altera
 * const actionPrompt = buildTextClassificationPrompt({
 *   gameState,
 *   rawInput: 'Atacar o goblin com minha espada',
 *   language: 'pt'
 * });
 * // Resultado: { type: "action", processedText: "Atacar o goblin com minha espada", shouldProcess: false }
 *
 * // Input é uma FALA - reescreve
 * const speechPrompt = buildTextClassificationPrompt({
 *   gameState: medievalGameState,
 *   rawInput: 'e aí cara, beleza?',
 *   language: 'pt'
 * });
 * // Resultado: { type: "speech", processedText: "Salve, bom homem! Como passas?", shouldProcess: true }
 * ```
 */
export function buildTextClassificationPrompt({
  gameState,
  rawInput,
  language,
}: TextClassificationPromptParams): string {
  const langName = getLanguageName(language);
  const player: Character | undefined =
    gameState.characters[gameState.playerCharacterId];
  const currentLocation: Location | undefined =
    gameState.locations[gameState.currentLocationId];
  const recentMessages: ChatMessage[] = gameState.messages.slice(-10);

  // Formatar mensagens recentes para contexto
  const recentContext = recentMessages.map((m) => {
    const sender = gameState.characters[m.senderId];
    const senderName = sender?.name || (m.senderId === 'GM' ? 'Narrator' : 'System');
    return `${senderName}: ${m.text}`;
  }).join('\n');

  return `
You are a text classifier for an interactive RPG game. Your task is to:
1. Identify if the player's input is an ACTION or SPEECH
2. If it's SPEECH, rewrite it to match the character's voice and the universe's style

CONTEXT:
- Universe: ${gameState.config.universeName} (${gameState.config.universeType})
- Character Name: ${player?.name || 'Unknown'}
- Character Description: ${player?.description || 'A mysterious adventurer'}
- Character Background: ${(gameState.config as any).background || 'Unknown background'}
- Character Personality: ${(gameState.config as any).personality || 'Unknown personality'}
- Current Location: ${currentLocation?.name || 'Unknown'} - ${currentLocation?.description || ''}
- Language: ${langName}

RECENT CONVERSATION:
${recentContext || 'No recent messages'}

CLASSIFICATION RULES:

**ACTION** - The player is describing what their character DOES:
- Physical actions: attack, move, jump, run, hide, climb, swim
- Interactions with objects: pick up, open, close, use, examine, search
- Movement commands: go to, enter, exit, follow, approach
- Combat actions: strike, parry, dodge, cast spell, shoot
- Observation: look around, inspect, observe, watch
- Examples: "Atacar o goblin", "Ir para a taverna", "Pegar a espada", "Olhar ao redor"

**SPEECH** - The player is saying what their character SAYS to others:
- Dialogue with NPCs or other characters
- Questions directed at someone
- Greetings, farewells, exclamations
- Negotiations, requests, demands
- Storytelling or explanations to others
- Examples: "Oi, tudo bem?", "Quanto custa isso?", "Me conta sobre a dungeon", "Precisamos de ajuda!"

PROCESSING RULES:

For ACTIONS:
- Return the EXACT original text unchanged
- Set type: "action" and shouldProcess: false

For SPEECH:
- Rewrite the dialogue to match:
  * The universe's style (medieval fantasy = archaic speech, sci-fi = technical jargon, etc.)
  * The character's personality and background
  * The tone appropriate for the situation
- Keep the MEANING and INTENT identical
- Keep similar length to the original
- Write in ${langName}
- Set type: "speech" and shouldProcess: true

RESPOND WITH JSON ONLY:
{
  "type": "action" or "speech",
  "processedText": "the text (original for action, rewritten for speech)",
  "shouldProcess": true or false
}

Player input to classify: "${rawInput}"
`;
}

/**
 * JSON Schema para validação da resposta de classificação de texto.
 *
 * @constant
 * @type {object}
 */
export const textClassificationSchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['action', 'speech'],
      description: 'Classification of the input: action or speech',
    },
    processedText: {
      type: 'string',
      description: 'The processed text (original for action, rewritten for speech)',
    },
    shouldProcess: {
      type: 'boolean',
      description: 'Whether the text was modified',
    },
  },
  required: ['type', 'processedText', 'shouldProcess'],
};
