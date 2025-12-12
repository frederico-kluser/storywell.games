/**
 * @fileoverview Prompt de Onboarding - Construtor de Mundo RPG
 *
 * Este módulo contém o prompt responsável por conduzir uma entrevista interativa
 * com o usuário para coletar todas as informações necessárias para criar um novo
 * jogo de RPG. O prompt atua como um agente entrevistador especializado.
 *
 * @module prompts/onboarding
 *
 * @description
 * O Onboarding Prompt é usado durante a fase de criação de uma nova história.
 * Ele coleta 7 pontos de dados obrigatórios através de uma conversa dinâmica:
 *
 * 1. **Nome do Universo/Cenário** - Se existente (Star Wars, Harry Potter, etc.) ou original
 * 2. **Período/Era Temporal** - Específico ao universo escolhido
 * 3. **Nome do Personagem** - Nome do protagonista do jogador
 * 4. **Aparência do Personagem** - Descrição visual detalhada
 * 5. **Background do Personagem** - História e papel no mundo
 * 6. **Localização Inicial** - Onde a aventura começa
 * 7. **Memórias do Personagem** - Eventos importantes do passado
 *
 * @example
 * ```typescript
 * import { buildOnboardingPrompt } from './prompts/onboarding.prompt';
 *
 * const history = [
 *   { question: 'Qual universo você gostaria de explorar?', answer: 'Star Wars' }
 * ];
 *
 * const prompt = buildOnboardingPrompt({
 *   history,
 *   universeType: 'existing',
 *   language: 'pt'
 * });
 * ```
 *
 * @see {@link OnboardingPromptParams} - Parâmetros aceitos pela função
 * @see {@link OnboardingResponse} - Formato esperado da resposta da IA
 */

import { Language } from '../../../types';
import { getLanguageName } from '../../../i18n/locales';

/**
 * Representa um par pergunta-resposta do histórico de onboarding.
 *
 * @interface OnboardingHistoryItem
 * @property {string} question - A pergunta feita pela IA ao usuário
 * @property {string} answer - A resposta fornecida pelo usuário
 */
export interface OnboardingHistoryItem {
  question: string;
  answer: string;
}

/**
 * Parâmetros necessários para construir o prompt de onboarding.
 *
 * @interface OnboardingPromptParams
 * @property {OnboardingHistoryItem[]} history - Histórico de perguntas e respostas anteriores
 * @property {'original' | 'existing'} universeType - Tipo de universo: original (criado pelo usuário) ou existente (franquias conhecidas)
 * @property {Language} language - Idioma alvo para as perguntas ('en', 'pt', 'es')
 */
export interface OnboardingPromptParams {
  /** Histórico de perguntas e respostas da conversa de onboarding */
  history: OnboardingHistoryItem[];
  /** Tipo de universo: 'original' para universos criados pelo usuário, 'existing' para franquias conhecidas */
  universeType: 'original' | 'existing';
  /** Idioma no qual as perguntas devem ser geradas */
  language: Language;
}

/**
 * Configuração final do jogo gerada quando o onboarding está completo.
 *
 * @interface OnboardingFinalConfig
 * @property {string} universeName - Nome do universo/mundo do jogo
 * @property {string} universeType - Tipo do universo ('original' ou 'existing')
 * @property {string} playerName - Nome do personagem do jogador
 * @property {string} playerDesc - Descrição visual do personagem
 * @property {string} startSituation - Situação/contexto inicial do jogo
 * @property {string} background - História de fundo do personagem
 * @property {string} memories - Memórias importantes do personagem
 * @property {string} visualStyle - Referência visual para geração de avatares (obra, artista ou estilo)
 */
export interface OnboardingFinalConfig {
  universeName: string;
  universeType: string;
  playerName: string;
  playerDesc: string;
  startSituation: string;
  background: string;
  memories: string;
  visualStyle: string;
}

/**
 * Formato esperado da resposta da IA para o prompt de onboarding.
 *
 * @interface OnboardingResponse
 * @property {string} question - A próxima pergunta a ser feita ao usuário
 * @property {'text' | 'select' | 'finish'} controlType - Tipo de controle de UI a ser usado
 * @property {string[]} [options] - Opções disponíveis se controlType for 'select'
 * @property {boolean} isComplete - Indica se todas as informações foram coletadas
 * @property {OnboardingFinalConfig} [finalConfig] - Configuração final quando isComplete é true
 */
export interface OnboardingResponse {
  question: string;
  controlType: 'text' | 'select' | 'finish';
  options?: string[];
  isComplete: boolean;
  finalConfig?: OnboardingFinalConfig;
}

/**
 * Constrói o prompt para o agente de onboarding que entrevista o usuário
 * para criar um novo jogo de RPG.
 *
 * Este prompt instrui a IA a:
 * - Analisar o histórico de conversa para identificar informações já coletadas
 * - Formular a próxima pergunta lógica na sequência
 * - Adaptar o tipo de input (texto ou seleção) baseado no contexto
 * - Para universos existentes, oferecer opções de Era e Localização baseadas no conhecimento interno
 * - Para universos originais, usar inputs de texto com sugestões criativas
 * - Detectar quando todas as informações foram coletadas e finalizar o onboarding
 *
 * @param {OnboardingPromptParams} params - Parâmetros de entrada para o prompt
 * @param {OnboardingHistoryItem[]} params.history - Histórico de perguntas e respostas
 * @param {'original' | 'existing'} params.universeType - Tipo de universo selecionado
 * @param {Language} params.language - Idioma alvo para geração
 *
 * @returns {string} O prompt formatado para envio à API da OpenAI
 *
 * @example
 * ```typescript
 * // Primeira chamada - sem histórico
 * const firstPrompt = buildOnboardingPrompt({
 *   history: [],
 *   universeType: 'existing',
 *   language: 'pt'
 * });
 *
 * // Chamadas subsequentes - com histórico
 * const nextPrompt = buildOnboardingPrompt({
 *   history: [
 *     { question: 'Qual universo?', answer: 'Star Wars' },
 *     { question: 'Qual era?', answer: 'Era do Império' }
 *   ],
 *   universeType: 'existing',
 *   language: 'pt'
 * });
 * ```
 *
 * @throws {Error} Não lança erros diretamente, mas a resposta da IA pode falhar se o histórico for inválido
 */
export function buildOnboardingPrompt({
  history,
  universeType,
  language,
}: OnboardingPromptParams): string {
  const langName = getLanguageName(language);

  return `
    You are an expert RPG World Builder assisting a user in creating a new game.
    Your goal is to collect specific data points to initialize a "Theatre of the Mind" RPG.
    Target Language: ${langName}.

    REQUIRED DATA POINTS (Collect these one by one or in logical groups):
    1. Universe Name/Setting (If existing, which one? If original, what theme?)
    2. Time Period/Era (Specific to the universe)
    3. Visual Style Reference (IMPORTANT: Ask for a specific artwork, movie, game, anime, or artist style to be used as the visual foundation for ALL character avatars. Examples: "Studio Ghibli style", "Dark Souls concept art", "Akira Toriyama style", "Final Fantasy Tactics", "The Witcher 3 portraits", "Dungeons & Dragons official art". This ensures visual consistency across all characters.)
    4. Character Name
    5. Character Appearance (Visuals)
    6. Character Background (Role/History)
    7. Starting Location
    8. Character Memories (Important past events)

    CONTEXT:
    Universe Type Selected: ${universeType}
    Conversation History: ${JSON.stringify(history)}

    INSTRUCTIONS:
    1. Analyze the history to see what we already know.
    2. Formulate the NEXT logical question. Do not ask for everything at once.
    3. If the universe is known (e.g., Star Wars, Harry Potter), use your internal knowledge to provide 'select' options for Era or Location.
    4. If the universe is 'original', use 'text' input mostly, but offer creative suggestions if helpful.
    5. For Visual Style Reference, always provide 'select' options with relevant artistic references that match the universe (e.g., for Star Wars: "Ralph McQuarrie concept art", "Clone Wars animated style", "Realistic movie style"; for fantasy: "Studio Ghibli", "Dark Souls", "D&D official art").
    6. When ALL required data points (including Visual Style) are gathered with sufficient detail, set 'isComplete' to true and fill 'finalConfig'.
    7. The 'startSituation' in finalConfig should combine Location and immediate context.
    8. The 'visualStyle' in finalConfig should be the exact artistic reference chosen by the user.

    CRITICAL ANTI-LOOP RULES:
    9. NEVER ask the same question twice. If a question appears in the history, that topic is CLOSED.
    10. When a user answers with negation ("no", "não", "nenhum", "none", "nothing", "sem", etc.), ACCEPT IT IMMEDIATELY and move to the next topic or complete the onboarding.
    11. If a user refuses to add more details (e.g., "no special features", "nothing else"), DO NOT insist. Use what you have.
    12. Brief/minimal answers are VALID. "Clone of Madara" is sufficient for appearance - infer visual details from known characters.
    13. "No memories" or "without memories" is a valid answer for memories - the character has amnesia or is newly created.
    14. After asking about ALL 8 data points, if you have ANY answer for each, set isComplete to true. Do not ask for elaboration.
    15. Count the topics covered in history. If you have answers for: Universe, Era, Visual Style, Name, Appearance, Background, Location, and Memories - you are DONE.
  `;
}

/**
 * JSON Schema para validação da resposta do agente de onboarding.
 * Este schema é usado pela API da OpenAI para garantir respostas estruturadas.
 *
 * @constant
 * @type {object}
 */
export const onboardingSchema = {
  type: 'object',
  properties: {
    question: {
      type: 'string',
      description:
        'The next question to ask the user to gather missing information.',
    },
    controlType: {
      type: 'string',
      enum: ['text', 'select', 'finish'],
      description: 'The type of UI input to present to the user.',
    },
    options: {
      type: 'array',
      items: { type: 'string' },
      description: "If controlType is 'select', provide 3-5 relevant options.",
    },
    isComplete: {
      type: 'boolean',
      description:
        'True when ALL 8 topics have been asked and answered (even minimally). If user said "no" or gave brief answers, that counts as answered. NEVER ask the same topic twice.',
    },
    finalConfig: {
      type: 'object',
      description: 'Populate only when isComplete is true.',
      properties: {
        universeName: { type: 'string' },
        universeType: { type: 'string' },
        playerName: { type: 'string' },
        playerDesc: { type: 'string' },
        startSituation: { type: 'string' },
        background: { type: 'string' },
        memories: { type: 'string' },
        visualStyle: { type: 'string', description: 'The artistic reference chosen for avatar generation (e.g., "Studio Ghibli style", "Dark Souls concept art")' },
      },
    },
  },
  required: ['question', 'controlType', 'isComplete'],
};
