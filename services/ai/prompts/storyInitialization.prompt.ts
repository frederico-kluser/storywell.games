/**
 * @fileoverview Prompt de Inicialização da História - Criação do Mundo Inicial
 *
 * Este módulo contém o prompt responsável por gerar o estado inicial de um novo
 * jogo de RPG, incluindo a localização de partida, o personagem do jogador com
 * seus atributos base, e a mensagem de abertura da narrativa.
 *
 * @module prompts/storyInitialization
 *
 * @description
 * O Story Initialization Prompt é usado após o onboarding para criar:
 *
 * - **Localização Inicial** - O cenário onde a aventura começa
 * - **Personagem do Jogador** - Com stats base, inventário inicial e descrição
 * - **Narrativa de Abertura** - Introdução atmosférica ao mundo do jogo
 *
 * Este prompt transforma a configuração coletada no onboarding em um estado
 * de jogo jogável com todos os elementos necessários para começar.
 *
 * @example
 * ```typescript
 * import { buildStoryInitializationPrompt } from './prompts/storyInitialization.prompt';
 *
 * const prompt = buildStoryInitializationPrompt({
 *   config: {
 *     universeName: 'Star Wars',
 *     universeType: 'existing',
 *     playerName: 'Kira',
 *     playerDesc: 'Uma jovem padawan com cabelos escuros',
 *     startSituation: 'No Templo Jedi em Coruscant',
 *     background: 'Órfã treinada desde criança',
 *     memories: 'Lembra de um misterioso salvador'
 *   },
 *   language: 'pt'
 * });
 * ```
 *
 * @see {@link StoryInitializationPromptParams} - Parâmetros aceitos pela função
 * @see {@link StoryConfig} - Configuração do jogo vinda do onboarding
 */

import { Language } from '../../../types';
import { getLanguageName } from '../../../i18n/locales';
import { getStartingGold, DEFAULT_PLAYER_STATS, formatEconomyRulesForPrompt } from '../../../constants/economy';

/**
 * Configuração da história coletada durante o processo de onboarding.
 *
 * @interface StoryConfig
 * @property {string} universeName - Nome do universo/mundo do jogo
 * @property {string} universeType - Tipo do universo ('original' ou 'existing')
 * @property {string} playerName - Nome do personagem do jogador
 * @property {string} playerDesc - Descrição visual detalhada do personagem
 * @property {string} startSituation - Situação e localização inicial
 * @property {string} background - História de fundo do personagem
 * @property {string} memories - Memórias importantes do personagem
 */
export interface StoryConfig {
  /** Nome do universo onde a história se passa */
  universeName: string;
  /** Tipo do universo: 'original' para criações do usuário, 'existing' para franquias */
  universeType: string;
  /** Nome do personagem protagonista */
  playerName: string;
  /** Descrição física/visual do personagem */
  playerDesc: string;
  /** Contexto da situação inicial onde o jogo começa */
  startSituation: string;
  /** História de fundo do personagem (background) */
  background: string;
  /** Memórias significativas do passado do personagem */
  memories: string;
}

/**
 * Parâmetros necessários para construir o prompt de inicialização.
 *
 * @interface StoryInitializationPromptParams
 * @property {StoryConfig} config - Configuração completa da história vinda do onboarding
 * @property {Language} language - Idioma para geração do texto ('en', 'pt', 'es')
 */
export interface StoryInitializationPromptParams {
  /** Configuração da história coletada no processo de onboarding */
  config: StoryConfig;
  /** Idioma no qual a narrativa inicial deve ser gerada */
  language: Language;
}

/**
 * Constrói o prompt para gerar o estado inicial de um novo jogo de RPG.
 *
 * Este prompt instrui a IA a criar:
 *
 * **1. Localização Inicial:**
 * - Nome e descrição atmosférica do local
 * - Conectada à situação de partida definida pelo usuário
 *
 * **2. Personagem do Jogador:**
 * - ID único para referência no sistema
 * - Stats básicos relevantes ao cenário (ex: HP, mana, força)
 * - Inventário inicial apropriado (roupas, 1 item-chave)
 * - Estado inicial como 'idle'
 *
 * **3. Mensagem de Abertura (Narrador):**
 * - Introdução imersiva ao mundo
 * - Estabelece o tom e atmosfera
 * - Conecta background e memórias à situação atual
 *
 * A resposta segue o mesmo schema do Game Master (gmResponseSchema)
 * para manter consistência no processamento.
 *
 * @param {StoryInitializationPromptParams} params - Parâmetros de entrada
 * @param {StoryConfig} params.config - Configuração da história
 * @param {Language} params.language - Idioma alvo
 *
 * @returns {string} O prompt formatado para envio à API da OpenAI
 *
 * @example
 * ```typescript
 * // Universo existente (Star Wars)
 * const swPrompt = buildStoryInitializationPrompt({
 *   config: {
 *     universeName: 'Star Wars',
 *     universeType: 'existing',
 *     playerName: 'Zara Vex',
 *     playerDesc: 'Twi\'lek azul com cicatriz no rosto',
 *     startSituation: 'Cantina de Mos Eisley em Tatooine',
 *     background: 'Contrabandista em dívida com Jabba',
 *     memories: 'A morte do parceiro em uma emboscada'
 *   },
 *   language: 'pt'
 * });
 *
 * // Universo original
 * const originalPrompt = buildStoryInitializationPrompt({
 *   config: {
 *     universeName: 'Crônicas de Aethermoor',
 *     universeType: 'original',
 *     playerName: 'Elara',
 *     playerDesc: 'Elfa com olhos de prata e manto verde',
 *     startSituation: 'Floresta Anciã, próxima às ruínas élficas',
 *     background: 'Última guardiã de um conhecimento proibido',
 *     memories: 'A destruição de sua biblioteca pelo fogo negro'
 *   },
 *   language: 'pt'
 * });
 * ```
 *
 * @remarks
 * Os stats e inventário iniciais são gerados pela IA de forma contextual.
 * Por exemplo:
 * - Cenários de fantasia medieval: HP, mana, força, armadura básica
 * - Cenários de sci-fi: HP, energia, blaster ou ferramenta
 * - Cenários de horror: HP, sanidade, lanterna, diário
 */
export function buildStoryInitializationPrompt({
  config,
  language,
}: StoryInitializationPromptParams): string {
  const langName = getLanguageName(language);
  const startingGold = getStartingGold(config.universeName);

  return `
      Create the initial state for a new RPG.
      Universe: ${config.universeName} (${config.universeType})
      Player: ${config.playerName} - ${config.playerDesc}
      Background: ${config.background}
      Memories: ${config.memories}
      Start Situation: ${config.startSituation}

      Generate a 'Narrator' introduction message, the initial Location, and the Player Character object.

      === MANDATORY PLAYER STATS ===
      The player character MUST have these stats:
      - hp: ${DEFAULT_PLAYER_STATS.hp} (starting health)
      - maxHp: ${DEFAULT_PLAYER_STATS.maxHp} (maximum health)
      - gold: ${startingGold} (starting currency for this universe type)

      === INVENTORY FORMAT ===
      Inventory items should be objects with:
      - name: Item name
      - category: One of 'consumable', 'weapon', 'armor', 'valuable', 'material', 'quest', 'currency', 'misc'
      - baseValue: Price in gold (use the price ranges below)
      - quantity: Number of items (default 1)
      - isStackable: true for consumables/materials

      ${formatEconomyRulesForPrompt()}

      Initialize the player with basic inventory relevant to the setting (e.g. clothes as armor, 1 key item).
      The output text MUST be in ${langName}.
  `;
}
