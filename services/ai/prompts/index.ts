/**
 * @fileoverview Módulo Central de Prompts - storywell.games
 *
 * Este módulo serve como ponto de entrada centralizado para todos os prompts
 * utilizados pelo motor de jogo. Cada prompt é documentado, tipado e exportado
 * como uma função que aceita parâmetros específicos.
 *
 * @module prompts
 *
 * @description
 * O sistema de prompts do storywell.games é dividido em 8 categorias principais:
 *
 * | Prompt | Uso | Modelo |
 * |--------|-----|--------|
 * | {@link buildOnboardingPrompt} | Entrevista de criação de mundo | GPT-4.1 |
 * | {@link buildGameMasterPrompt} | Loop principal do jogo | GPT-4.1 |
 * | {@link buildStoryInitializationPrompt} | Criação do estado inicial | GPT-4.1 |
 * | {@link buildPlayerMessageProcessingPrompt} | Adaptação de diálogo | GPT-4.1 |
 * | {@link buildActionOptionsPrompt} | Sugestões de ações | GPT-4.1 |
 * | {@link buildHeavyContextPrompt} | Memória narrativa persistente | GPT-4.1 |
 * | {@link buildCharacterAvatarPrompt} | Geração de avatares | DALL-E 3 |
 * | {@link buildLocationBackgroundPrompt} | Imagens de fundo de localização | DALL-E 3 |
 *
 * @example
 * ```typescript
 * // Importação centralizada
 * import {
 *   buildOnboardingPrompt,
 *   buildGameMasterPrompt,
 *   buildStoryInitializationPrompt,
 *   buildPlayerMessageProcessingPrompt,
 *   buildActionOptionsPrompt,
 *   buildHeavyContextPrompt,
 *   buildCharacterAvatarPrompt,
 *   buildLocationBackgroundPrompt,
 *   // Schemas
 *   onboardingSchema,
 *   gmResponseSchema,
 *   actionOptionsSchema,
 *   heavyContextSchema
 * } from './services/ai/prompts';
 *
 * // Uso individual
 * const onboardingPrompt = buildOnboardingPrompt({
 *   history: [],
 *   universeType: 'original',
 *   language: 'pt'
 * });
 * ```
 *
 * ## Arquitetura de Prompts
 *
 * Cada arquivo de prompt segue a mesma estrutura:
 *
 * 1. **JSDoc completo** - Documentação detalhada do propósito e uso
 * 2. **Interfaces de parâmetros** - Tipagem forte dos inputs
 * 3. **Função exportada** - Recebe parâmetros e retorna string do prompt
 * 4. **Schema (quando aplicável)** - Estrutura esperada da resposta JSON
 *
 * ## Fluxo de Uso dos Prompts
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    CRIAÇÃO DE HISTÓRIA                      │
 * │  buildOnboardingPrompt → buildStoryInitializationPrompt    │
 * └─────────────────────────────────────────────────────────────┘
 *                              ↓
 * ┌─────────────────────────────────────────────────────────────┐
 * │                     LOOP DO JOGO                            │
 * │  buildActionOptionsPrompt → Player escolhe ação            │
 * │            ↓                                                │
 * │  buildPlayerMessageProcessingPrompt → Adapta mensagem      │
 * │            ↓                                                │
 * │  buildGameMasterPrompt → Processa ação e gera resposta     │
 * │            ↓                                                │
 * │  buildHeavyContextPrompt → Atualiza memória narrativa      │
 * │            ↓                                                │
 * │  buildCharacterAvatarPrompt → Gera avatares (se necessário)│
 * │            ↓                                                │
 * │  buildLocationBackgroundPrompt → Gera fundo (mudança loc.) │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 */

// =============================================================================
// ONBOARDING PROMPT
// =============================================================================

export {
  buildOnboardingPrompt,
  onboardingSchema,
  type OnboardingPromptParams,
  type OnboardingHistoryItem,
  type OnboardingFinalConfig,
  type OnboardingResponse,
} from './onboarding.prompt';

// =============================================================================
// GAME MASTER PROMPT
// =============================================================================

export {
  buildGameMasterPrompt,
  gmResponseSchema,
  type GameMasterPromptParams,
} from './gameMaster.prompt';

// =============================================================================
// STORY INITIALIZATION PROMPT
// =============================================================================

export {
  buildStoryInitializationPrompt,
  type StoryInitializationPromptParams,
  type StoryConfig,
} from './storyInitialization.prompt';

// =============================================================================
// PLAYER MESSAGE PROCESSING PROMPT
// =============================================================================

export {
  buildPlayerMessageProcessingPrompt,
  playerMessageProcessingSchema,
  type PlayerMessageProcessingPromptParams,
  type PlayerMessageProcessingResponse,
} from './playerMessageProcessing.prompt';

// =============================================================================
// ACTION OPTIONS PROMPT
// =============================================================================

export {
  buildActionOptionsPrompt,
  actionOptionsSchema,
  type ActionOptionsPromptParams,
  type GeneratedActionOption,
  type ActionOptionsResponse,
} from './actionOptions.prompt';

// =============================================================================
// HEAVY CONTEXT PROMPT
// =============================================================================

export {
  buildHeavyContextPrompt,
  heavyContextSchema,
  type HeavyContextPromptParams,
  type HeavyContextResponse,
  type HeavyContextChanges,
  type HeavyContextFieldChange,
  type HeavyContextListChange,
  type RecentMessage,
  type RecentResponse,
  type NarrativeThreadChange,
  type PacingAnalysis,
} from './heavyContext.prompt';

// =============================================================================
// CHARACTER AVATAR PROMPT
// =============================================================================

export {
  buildCharacterAvatarPrompt,
  type CharacterAvatarPromptParams,
} from './characterAvatar.prompt';

// =============================================================================
// TEXT CLASSIFICATION PROMPT
// =============================================================================

export {
  buildTextClassificationPrompt,
  textClassificationSchema,
  type TextClassificationPromptParams,
  type TextClassificationResponse,
} from './textClassification.prompt';

// =============================================================================
// UNIVERSE CONTEXT PROMPT
// =============================================================================

export {
  buildUniverseContextPrompt,
  universeContextSchema,
  type UniverseContextPromptParams,
} from './universeContext.prompt';

// =============================================================================
// CUSTOM ACTION ANALYSIS PROMPT
// =============================================================================

export {
  buildCustomActionAnalysisPrompt,
  customActionAnalysisSchema,
  type CustomActionAnalysisParams,
  type CustomActionAnalysisResponse,
} from './customActionAnalysis.prompt';

// =============================================================================
// THEME COLORS PROMPT
// =============================================================================

export {
  buildThemeColorsPrompt,
  themeColorsSchema,
  type ThemeColorsPromptParams,
  type ThemeColorsResponse,
} from './themeColors.prompt';

// =============================================================================
// LOCATION BACKGROUND PROMPT
// =============================================================================

export {
  buildLocationBackgroundPrompt,
  type LocationBackgroundPromptParams,
} from './locationBackground.prompt';

// =============================================================================
// PROMPT HELPERS
// =============================================================================

export {
  formatInventoryForPrompt,
  formatInventorySimple,
  formatNPCsForPrompt,
  formatStatsForPrompt,
  formatItem,
  normalizeInventory,
  formatEconomyRulesForPrompt,
  formatPriceRangesForPrompt,
  getEconomyRulesForGMPrompt,
  getItemAwarenessRulesForPrompt,
  calculateSellPrice,
} from './helpers';

// =============================================================================
// NARRATIVE STYLES & QUALITY SYSTEM
// =============================================================================

export {
  // Types
  type NarrativeGenre,
  type PacingLevel,
  type PacingState,
  type NarrativeThread,
  type NarrativeStyle,
  type NPCVoiceProfile,
  type VocabularyStyle,
  type SentencePatterns,
  type PointOfViewConfig,
  type AtmosphereConfig,
  // Presets and utilities
  GENRE_PRESETS,
  SHOW_DONT_TELL_RULES,
  VOICE_TEMPLATES,
  generateNarrativeInstructions,
  generateVoiceDifferentiationInstructions,
  generatePacingInstructions,
  NarrativeUtils,
} from './narrativeStyles';

// =============================================================================
// NARRATIVE QUALITY ANALYSIS PROMPT
// =============================================================================

export {
  buildNarrativeQualityAnalysisPrompt,
  buildQuickShowDontTellCheckPrompt,
  narrativeQualityAnalysisSchema,
  quickShowDontTellSchema,
  quickClientSideCheck,
  TELL_NOT_SHOW_INDICATORS,
  type NarrativeQualityAnalysisParams,
  type NarrativeQualityAnalysisResponse,
  type NarrativeIssue,
} from './narrativeQualityAnalysis.prompt';
