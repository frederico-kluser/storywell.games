/**
 * @fileoverview Re-exportações de Prompts do Sistema - Compatibilidade Legada
 *
 * Este arquivo mantém compatibilidade com importações existentes enquanto
 * delega para a nova estrutura modular de prompts em `./prompts/`.
 *
 * @deprecated Prefira importar diretamente de `./prompts` para novos códigos.
 *
 * @example
 * ```typescript
 * // Importação legada (ainda funciona)
 * import { buildSystemPrompt, gmResponseSchema } from './systemPrompts';
 *
 * // Importação recomendada (nova estrutura)
 * import { buildGameMasterPrompt, gmResponseSchema } from './prompts';
 * ```
 *
 * @module systemPrompts
 * @see module:prompts - Nova estrutura modular de prompts
 */

// Re-export from new modular structure
export {
  // Onboarding
  buildOnboardingPrompt,
  onboardingSchema,

  // Game Master
  buildGameMasterPrompt,
  gmResponseSchema,

  // Story Initialization
  buildStoryInitializationPrompt,

  // Player Message Processing
  buildPlayerMessageProcessingPrompt,
  playerMessageProcessingSchema,

  // Action Options
  buildActionOptionsPrompt,
  actionOptionsSchema,

  // Heavy Context
  buildHeavyContextPrompt,
  heavyContextSchema,

  // Character Avatar
  buildCharacterAvatarPrompt,
} from './prompts';

// Re-export types
export type {
  OnboardingPromptParams,
  OnboardingHistoryItem,
  OnboardingFinalConfig,
  OnboardingResponse,
  GameMasterPromptParams,
  StoryInitializationPromptParams,
  StoryConfig,
  PlayerMessageProcessingPromptParams,
  PlayerMessageProcessingResponse,
  ActionOptionsPromptParams,
  GeneratedActionOption,
  ActionOptionsResponse,
  HeavyContextPromptParams,
  HeavyContextResponse,
  HeavyContextChanges,
  HeavyContextFieldChange,
  HeavyContextListChange,
  RecentMessage,
  RecentResponse,
  CharacterAvatarPromptParams,
} from './prompts';

/**
 * @deprecated Use `buildGameMasterPrompt` from `./prompts` instead.
 * This alias is kept for backward compatibility.
 *
 * Constrói o prompt do Game Master para processar ações do jogador.
 *
 * @param {GameState} gameState - Estado completo do jogo
 * @param {string} input - Ação do jogador
 * @param {Language} language - Idioma alvo
 * @param {FateResult} [fateResult] - Evento de destino opcional
 * @returns {string} Prompt formatado
 */
export { buildGameMasterPrompt as buildSystemPrompt } from './prompts';

/**
 * @deprecated Use `buildStoryInitializationPrompt` from `./prompts` instead.
 * This alias is kept for backward compatibility.
 *
 * Constrói o prompt de inicialização da história.
 *
 * @param {any} config - Configuração do jogo
 * @param {Language} language - Idioma alvo
 * @returns {string} Prompt formatado
 */
export { buildStoryInitializationPrompt as buildInitializationPrompt } from './prompts';
