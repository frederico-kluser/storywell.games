/**
 * @fileoverview Prompt de Geração de Contexto do Universo
 *
 * Este módulo contém o prompt responsável por gerar um contexto narrativo
 * profundo e detalhado para um novo universo de RPG. Este contexto é gerado
 * uma única vez na criação do universo e serve como referência permanente
 * para todas as interações narrativas subsequentes.
 *
 * @module prompts/universeContext
 *
 * @description
 * O Universe Context Prompt é usado para criar um documento rico contendo:
 *
 * - **Comunicação** - Como as pessoas falam, expressões idiomáticas, formalidade
 * - **Gírias e Jargões** - Termos específicos do universo por grupo social
 * - **Sistema Monetário** - Nome da moeda, valores, economia básica
 * - **Cultura e Costumes** - Saudações, despedidas, gestos, etiqueta
 * - **Estrutura Social** - Classes, hierarquias, grupos de poder
 * - **Elementos Únicos** - Tecnologia, magia, religião, política
 * - **Tom Narrativo** - Estilo de escrita adequado ao universo
 *
 * Este contexto é incluído em todos os prompts que usam heavyContext para
 * garantir consistência narrativa durante toda a gameplay.
 *
 * @example
 * ```typescript
 * import { buildUniverseContextPrompt } from './prompts/universeContext.prompt';
 *
 * const prompt = buildUniverseContextPrompt({
 *   universeName: 'Star Wars',
 *   universeType: 'existing',
 *   language: 'pt'
 * });
 * ```
 */

import { Language, NarrativeStyleMode } from '../../../types';
import { getLanguageName } from '../../../i18n/locales';
import { NarrativeGenre, GENRE_PRESETS } from './narrativeStyles';

/**
 * Parâmetros para construir o prompt de geração de contexto do universo.
 *
 * @interface UniverseContextPromptParams
 * @property {string} universeName - Nome do universo (ex: "Star Wars", "Senhor dos Anéis")
 * @property {string} universeType - Tipo do universo ('original' ou 'existing')
 * @property {Language} language - Idioma para geração do contexto ('en', 'pt', 'es')
 * @property {NarrativeGenre} [genre] - Gênero narrativo para estilo específico
 */
export interface UniverseContextPromptParams {
  /** Nome do universo onde a história se passa */
  universeName: string;
  /** Tipo do universo: 'original' para criações do usuário, 'existing' para franquias */
  universeType: 'original' | 'existing';
  /** Idioma no qual o contexto deve ser gerado */
  language: Language;
  /** Gênero narrativo para aplicar convenções de estilo específicas */
  genre?: NarrativeGenre;
  /** Estrategia escolhida para o estilo narrativo */
  narrativeStyleMode?: NarrativeStyleMode;
  /** Instruções customizadas fornecidas pelo jogador */
  customNarrativeStyle?: string;
}

/**
 * Constrói o prompt para gerar um contexto narrativo profundo do universo.
 *
 * Este prompt instrui a IA a criar um documento extenso que serve como
 * "bíblia narrativa" do universo, contendo todas as informações necessárias
 * para manter consistência em diálogos, descrições e interações.
 *
 * @param {UniverseContextPromptParams} params - Parâmetros de entrada
 * @returns {string} O prompt formatado para envio à API da OpenAI
 *
 * @example
 * ```typescript
 * // Universo existente (Star Wars)
 * const swPrompt = buildUniverseContextPrompt({
 *   universeName: 'Star Wars',
 *   universeType: 'existing',
 *   language: 'pt'
 * });
 *
 * // Universo original
 * const originalPrompt = buildUniverseContextPrompt({
 *   universeName: 'Crônicas de Aethermoor',
 *   universeType: 'original',
 *   language: 'pt'
 * });
 * ```
 */
export function buildUniverseContextPrompt({
  universeName,
  universeType,
  language,
  genre,
  narrativeStyleMode,
  customNarrativeStyle,
}: UniverseContextPromptParams): string {
  const langName = getLanguageName(language);

  const universeTypeInstruction = universeType === 'existing'
    ? `This is a WELL-KNOWN universe ("${universeName}"). Use your knowledge of this franchise to create an accurate and faithful context. Include canon elements, established lore, and recognizable cultural aspects from the original material.`
    : `This is an ORIGINAL universe created by the user ("${universeName}"). Be creative and inventive while maintaining internal consistency. Create unique elements that feel cohesive and immersive.`;

  // Build genre-specific instructions if genre is provided
  let genreInstructions = '';
  if (genre && GENRE_PRESETS[genre]) {
    const style = GENRE_PRESETS[genre];
    genreInstructions = `
===== GENRE-SPECIFIC REQUIREMENTS: ${style.displayName.toUpperCase()} =====

This universe should embody the conventions of the ${style.displayName} genre.

**VOCABULARY GUIDANCE:**
- Complexity level: ${style.vocabulary.complexity}
- Formality level: ${style.vocabulary.formality}
- Include terms like: ${style.vocabulary.useWords.join(', ')}
- Avoid terms like: ${style.vocabulary.avoidWords.join(', ')}

**ATMOSPHERE:**
- Primary tone: ${style.atmosphere.primaryTone}
- Secondary tones: ${style.atmosphere.secondaryTones.join(', ')}
- Violence portrayal: ${style.atmosphere.violenceLevel}
- Humor style: ${style.atmosphere.humorStyle}

**GENRE TECHNIQUES TO INCORPORATE:**
${style.techniques.map((t) => `- ${t}`).join('\n')}

**AVOID THESE IN THIS GENRE:**
${style.avoid.map((a) => `- ${a}`).join('\n')}

**EXAMPLE PROSE STYLE (for reference):**
${style.examplePhrases.map((p) => `"${p}"`).join('\n')}

Ensure the communication style, slang, customs, and narrative tone align with these genre conventions.
`;
  }

  const mode: NarrativeStyleMode = narrativeStyleMode ?? 'auto';
  let customStyleInstructions = '';
  const trimmedCustomStyle = mode === 'custom' ? customNarrativeStyle?.trim() : undefined;
  if (mode === 'custom' && trimmedCustomStyle) {
    genreInstructions = '';
    customStyleInstructions = `
===== PLAYER-DEFINED STYLE (MANDATORY) =====
The player provided explicit narrative instructions. Apply them to the entire universe bible.

CUSTOM STYLE BRIEF:
${trimmedCustomStyle}

INTERPRETATION RULES:
- Treat cited authors/works as tonal references. Mirror cadence, sentence length, and metaphor density.
- Document slang, customs, and cultural behaviors that reflect this custom tone.
- Keep this custom style active for every dialogue, description, and lore entry until the player changes it.
`;
  }

  return `
You are a world-building expert creating a comprehensive NARRATIVE CONTEXT DOCUMENT for an RPG universe.

${universeTypeInstruction}
${customStyleInstructions || genreInstructions}

Create a DETAILED and EXTENSIVE narrative context document in ${langName} for the universe "${universeName}".

This document will be used as a permanent reference for all narrative generation in this universe.
It should be thorough enough that any writer could use it to maintain consistency.

===== REQUIRED SECTIONS =====

## 1. COMMUNICATION STYLE (Como as pessoas se comunicam)

Describe in detail:
- **Formality levels**: How do people address superiors, equals, strangers, friends?
- **Common greetings**: How do people say hello, goodbye, good morning/night?
- **Expressions of emotion**: How do people express surprise, anger, joy, fear?
- **Verbal tics**: Are there common filler words, interjections, or speech patterns?
- **Regional/class variations**: Do different groups speak differently?

## 2. SLANG AND JARGON (Gírias e Jargões)

Create a rich vocabulary including:
- **Common slang terms**: At least 10-15 slang words/phrases with meanings
- **Profanity/curses**: Universe-appropriate swear words or exclamations
- **Professional jargon**: Terms used by soldiers, merchants, mages, pilots, etc.
- **Affectionate terms**: How do lovers, friends, parents speak to each other?
- **Insults**: Common insults and their severity levels

## 3. MONETARY SYSTEM (Sistema Monetário)

Define completely:
- **Currency name(s)**: What is money called? Are there multiple denominations?
- **Currency symbols/slang**: How do people casually refer to money?
- **Value examples**: What does a meal cost? A night at an inn? A weapon?
- **Economic context**: Is there poverty? Wealth disparity? Black markets?
- **Alternate trade**: Do people barter? Use credits? Magic crystals?

## 4. CULTURE AND CUSTOMS (Cultura e Costumes)

Detail the social fabric:
- **Greetings and farewells**: Physical gestures (bows, handshakes, salutes)?
- **Eating customs**: How do people eat? Share meals? Table manners?
- **Religious/spiritual practices**: Common prayers, blessings, superstitions?
- **Death and mourning**: How do people deal with death? Funeral customs?
- **Celebrations**: Major holidays, festivals, traditions?
- **Taboos**: What topics or actions are considered offensive or forbidden?

## 5. SOCIAL STRUCTURE (Estrutura Social)

Map the power dynamics:
- **Class system**: Are there nobles, commoners, outcasts?
- **Power groups**: Who holds power? Guilds? Corporations? Orders?
- **Social mobility**: Can people change their status? How?
- **Discrimination**: Are there prejudices based on species, origin, profession?
- **Law and order**: How is justice administered? Who enforces it?

## 6. UNIQUE ELEMENTS (Elementos Únicos do Universo)

Capture what makes this universe special:
- **Technology level**: What technology exists? How common is it?
- **Magic/supernatural**: Are there powers? How do they work? Who has them?
- **Important organizations**: Major factions, orders, companies?
- **Historical events**: Recent events that affect daily life?
- **Geography references**: Famous places people might mention?

## 7. NARRATIVE TONE (Tom Narrativo)

Guide the storytelling style:
- **Overall tone**: Dark and gritty? Light and adventurous? Epic and dramatic?
- **Humor style**: Is humor common? What kind?
- **Violence level**: How graphically is violence described?
- **Romance style**: How is romance portrayed? Subtle or explicit?
- **Pacing**: Fast-paced action? Slow character development?

## 8. NPC VOICE ARCHETYPES (Arquétipos de Voz de NPCs)

Define how different social groups speak:
- **Nobility/Royalty**: Formal patterns, specific greetings, verbal tics
- **Common folk**: Casual speech, local expressions, slang usage
- **Scholars/Mages**: Technical vocabulary, reference patterns
- **Merchants**: Persuasive speech, negotiation phrases
- **Warriors/Soldiers**: Military jargon, chain of command respect
- **Outcasts/Criminals**: Street slang, coded language

For each archetype, include:
- Typical verbal tics or catchphrases
- Level of formality
- Common topics they discuss
- How they address strangers vs. acquaintances

${genreInstructions}

===== FORMAT REQUIREMENTS =====

- Write EVERYTHING in ${langName}
- Be COMPREHENSIVE - this is the main reference for all future narratives
- Include SPECIFIC EXAMPLES for each category
- Make it feel ALIVE and AUTHENTIC to the universe
- Aim for at least 2000-3000 words of rich, detailed content
- Use bullet points and clear organization for easy reference

===== OUTPUT =====

Return ONLY the narrative context document as plain text (not JSON).
Start directly with the content, no preamble.
`;
}

/**
 * Schema JSON para a resposta do contexto do universo.
 * Como a resposta é texto puro, este schema é simples.
 */
export const universeContextSchema = {
  type: 'object',
  properties: {
    context: {
      type: 'string',
      description: 'The comprehensive narrative context document for the universe.',
    },
  },
  required: ['context'],
};
