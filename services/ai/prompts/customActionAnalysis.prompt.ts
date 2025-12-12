/**
 * @fileoverview Prompt de Análise de Ação Customizada
 *
 * Este módulo contém o prompt responsável por analisar ações customizadas digitadas
 * pelo jogador e calcular as probabilidades de sucesso/falha com base no contexto
 * narrativo, dificuldade e elaboração da ação.
 *
 * @module prompts/customActionAnalysis
 *
 * @description
 * O Custom Action Analysis Prompt é usado para:
 *
 * - **Analisar complexidade** - Quanto mais elaborada/difícil a ação, maior o risco
 * - **Considerar contexto** - Usar o heavyContext para avaliar viabilidade
 * - **Calcular probabilidades** - Definir goodChance e badChance (0-50)
 * - **Prover dicas** - Indicar o que pode acontecer de bom ou ruim
 *
 * Este prompt usa temperatura 0 para evitar que o jogador possa "burlar"
 * o sistema tentando várias vezes até conseguir uma taxa favorável.
 */

import { GameState, Language, Character, Location, HeavyContext, GridCharacterPosition } from '../../../types';
import { getLanguageName } from '../../../i18n/locales';

/**
 * Parâmetros necessários para construir o prompt de análise de ação customizada.
 */
export interface CustomActionAnalysisParams {
  /** Estado completo do jogo incluindo heavyContext */
  gameState: GameState;
  /** A ação customizada digitada pelo jogador */
  customAction: string;
  /** Idioma para geração das dicas */
  language: Language;
}

/**
 * Resposta da análise de ação customizada.
 */
export interface CustomActionAnalysisResponse {
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
 * Constrói o prompt para analisar uma ação customizada e calcular suas probabilidades.
 *
 * Este prompt instrui a IA a avaliar:
 *
 * **1. Complexidade da Ação:**
 * - Ações simples (olhar, esperar) = baixo risco
 * - Ações elaboradas (plano complexo) = alto risco/recompensa
 * - Ações impossíveis/absurdas = muito alto risco
 *
 * **2. Contexto Narrativo:**
 * - Considerar localização atual e perigos
 * - Considerar estado do personagem e recursos
 * - Considerar problemas ativos e preocupações
 *
 * **3. Viabilidade:**
 * - O personagem tem os recursos necessários?
 * - A ação faz sentido no contexto?
 * - É fisicamente/magicamente possível?
 *
 * **4. Dificuldade vs Recompensa:**
 * - Ações arriscadas podem ter alta recompensa
 * - Ações seguras têm baixo potencial de ambos
 * - Equilibrar risco/recompensa baseado na elaboração
 */
export function buildCustomActionAnalysisPrompt({
  gameState,
  customAction,
  language,
}: CustomActionAnalysisParams): string {
  const langName = getLanguageName(language);
  const player: Character | undefined =
    gameState.characters[gameState.playerCharacterId];
  const currentLocation: Location | undefined =
    gameState.locations[gameState.currentLocationId];

  // Format heavy context for analysis
  const heavyContext: HeavyContext = gameState.heavyContext || {};
  const heavyContextSection = heavyContext.mainMission || heavyContext.currentMission
    ? `
=== NARRATIVE CONTEXT (HEAVY CONTEXT) ===
Main Mission: ${heavyContext.mainMission || 'None'}
Current Mission: ${heavyContext.currentMission || 'None'}
Active Problems: ${(heavyContext.activeProblems || []).join(' | ') || 'None'}
Current Concerns: ${(heavyContext.currentConcerns || []).join(' | ') || 'None'}
Important Notes: ${(heavyContext.importantNotes || []).join(' | ') || 'None'}
`
    : '';

  // Get recent messages for context
  const recentMessages = gameState.messages.slice(-10);
  const recentMessagesText = recentMessages
    .map((m) => `[${m.senderId}]: ${m.text}`)
    .join('\n');

  // Get player stats and inventory
  const playerStats = player?.stats
    ? Object.entries(player.stats)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')
    : 'Unknown';
  const playerInventory = player?.inventory?.length
    ? player.inventory.join(', ')
    : 'Empty';

  // Build grid context section if available
  let gridContextSection = '';
  if (gameState.gridSnapshots && gameState.gridSnapshots.length > 0) {
    const latestGrid = gameState.gridSnapshots[gameState.gridSnapshots.length - 1];
    const playerPosition = latestGrid.characterPositions.find((p: GridCharacterPosition) => p.isPlayer);
    const gridPositions = latestGrid.characterPositions
      .map((pos: GridCharacterPosition) => {
        if (pos.isPlayer) return `- ${pos.characterName} [PLAYER]: (${pos.position.x}, ${pos.position.y})`;
        const distance = playerPosition
          ? Math.abs(pos.position.x - playerPosition.position.x) + Math.abs(pos.position.y - playerPosition.position.y)
          : 0;
        return `- ${pos.characterName}: (${pos.position.x}, ${pos.position.y}) - ${distance} cells from player`;
      })
      .join('\n');

    gridContextSection = `
=== SPATIAL POSITIONS (10x10 GRID) ===
${gridPositions}
(Consider distances: 0-1 cells = close range, 2-3 cells = medium range, 4+ cells = far)
`;
  }

  return `
You are a game master analyzing a custom player action to determine its success/failure probabilities.
Your analysis must be DETERMINISTIC and CONSISTENT - the same action in the same context should always yield the same probabilities.

=== CURRENT SITUATION ===
Universe: ${gameState.config.universeName} (${gameState.config.universeType})
Location: ${currentLocation?.name || 'Unknown'} - ${currentLocation?.description || 'No description'}
Player: ${player?.name || 'Unknown'} - ${player?.description || 'No description'}
Player Stats: ${playerStats}
Player Inventory: ${playerInventory}
Player State: ${player?.state || 'Unknown'}
${heavyContextSection}${gridContextSection}
=== RECENT EVENTS ===
${recentMessagesText}

=== CUSTOM ACTION TO ANALYZE ===
"${customAction}"

=== ANALYSIS RULES ===
You must evaluate the action based on:

1. **COMPLEXITY/DIFFICULTY:**
   - Simple actions (look, wait, talk casually): goodChance 5-15, badChance 0-10
   - Moderate actions (search, negotiate, sneak past): goodChance 10-25, badChance 10-20
   - Complex actions (elaborate plans, risky maneuvers): goodChance 20-40, badChance 20-40
   - Extremely difficult/dangerous: goodChance 30-50, badChance 30-50
   - Impossible/absurd actions: goodChance 5-15, badChance 40-50

2. **CONTEXTUAL FEASIBILITY:**
   - Does the player have necessary items/skills?
   - Is the action appropriate for the current location?
   - Does it align with the character's capabilities?
   - Consider active problems and dangers

3. **ELABORATION LEVEL:**
   - Vague actions: lower chances for both (more neutral outcomes)
   - Detailed/specific actions: higher potential for both good and bad
   - Over-complicated plans: higher badChance due to more failure points

4. **RESOURCE CHECK:**
   - If action requires items player doesn't have: increase badChance significantly
   - If action uses player's strengths: increase goodChance
   - If action goes against player's weaknesses: increase badChance

5. **SPATIAL POSITIONING (if grid data available):**
   - Actions targeting distant characters (4+ cells) are harder
   - Close range actions (0-1 cells) are more reliable
   - Movement-based actions depend on distance to destination
   - Stealth actions harder when characters are nearby

6. **PROBABILITY CONSTRAINTS:**
   - goodChance: 0-50 (max 50%)
   - badChance: 0-50 (max 50%)
   - Sum should typically not exceed 70% (leaving room for neutral outcomes)
   - Both hints must be written in ${langName}

RESPOND WITH JSON:
{
  "goodChance": <number 0-50>,
  "badChance": <number 0-50>,
  "goodHint": "<brief description of potential benefit in ${langName}>",
  "badHint": "<brief description of potential harm in ${langName}>",
  "reasoning": "<1-2 sentence explanation of why these probabilities in ${langName}>"
}
`;
}

/**
 * JSON Schema para validação da resposta de análise de ação customizada.
 */
export const customActionAnalysisSchema = {
  type: 'object',
  properties: {
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
    reasoning: {
      type: 'string',
      description: 'Brief explanation of why these probabilities were assigned',
    },
  },
  required: ['goodChance', 'badChance', 'goodHint', 'badHint', 'reasoning'],
};
