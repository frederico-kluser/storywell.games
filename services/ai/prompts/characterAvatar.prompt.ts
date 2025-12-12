/**
 * @fileoverview Prompt de Avatar de Personagem - Gerador de Retratos Pixel Art
 *
 * Este módulo contém o prompt responsável por gerar avatares de personagens
 * no estilo pixel art retrô usando DALL-E 3. Os avatares são usados para
 * representar visualmente o jogador e NPCs no jogo.
 *
 * @module prompts/characterAvatar
 *
 * @description
 * O Character Avatar Prompt é usado para:
 *
 * - **Gerar retratos** - Criar imagens de personagens em pixel art 8-bit
 * - **Manter consistência** - Adaptar estilo ao universo do jogo
 * - **Representar visualmente** - Dar identidade visual a personagens
 *
 * Este prompt é enviado à API DALL-E 3 da OpenAI, não ao GPT.
 * As imagens geradas são armazenadas como URLs temporárias.
 *
 * @example
 * ```typescript
 * import { buildCharacterAvatarPrompt } from './prompts/characterAvatar.prompt';
 *
 * const prompt = buildCharacterAvatarPrompt({
 *   characterName: 'Elara',
 *   characterDescription: 'Elfa com cabelos prateados e olhos verdes',
 *   universeContext: 'Fantasia Medieval'
 * });
 * ```
 *
 * @see {@link CharacterAvatarPromptParams} - Parâmetros aceitos pela função
 */

/**
 * Parâmetros necessários para construir o prompt de avatar.
 *
 * @interface CharacterAvatarPromptParams
 * @property {string} characterName - Nome do personagem para referência
 * @property {string} characterDescription - Descrição visual detalhada do personagem
 * @property {string} universeContext - Nome/tipo do universo para consistência de estilo
 * @property {string} [visualStyle] - Referência artística para o estilo visual (obra, artista, jogo, etc.)
 */
export interface CharacterAvatarPromptParams {
  /** Nome do personagem a ser retratado */
  characterName: string;
  /** Descrição visual detalhada (aparência, roupas, características distintivas) */
  characterDescription: string;
  /** Contexto do universo para adaptar estilo visual (ex: "Star Wars", "Fantasia Medieval") */
  universeContext: string;
  /** Referência artística para estilo visual (ex: "Studio Ghibli", "Dark Souls concept art") */
  visualStyle?: string;
}

/**
 * Constrói o prompt para gerar um avatar de personagem usando DALL-E 3.
 *
 * Este prompt instrui o DALL-E a criar:
 *
 * **1. Estilo Visual Dinâmico:**
 * - Baseado em referência artística fornecida pelo usuário
 * - Consistente entre todos os personagens da história
 * - Exemplos: "Studio Ghibli", "Dark Souls", "Final Fantasy Tactics"
 *
 * **2. Composição Otimizada para Avatar:**
 * - Close-up do rosto (cabeça e ombros superiores)
 * - Rosto olhando diretamente para a câmera
 * - Alto contraste e características faciais claras
 *
 * **3. Contextualização:**
 * - Aparência baseada na descrição fornecida
 * - Estilo visual alinhado à referência artística escolhida
 * - Fundo simples que não compete com o personagem
 *
 * @param {CharacterAvatarPromptParams} params - Parâmetros de entrada
 * @param {string} params.characterName - Nome do personagem
 * @param {string} params.characterDescription - Descrição visual
 * @param {string} params.universeContext - Contexto do universo
 * @param {string} [params.visualStyle] - Referência artística (ex: "Studio Ghibli style")
 *
 * @returns {string} O prompt formatado para envio à API DALL-E
 *
 * @example
 * ```typescript
 * // Personagem de fantasia medieval com estilo Dark Souls
 * const fantasyAvatar = buildCharacterAvatarPrompt({
 *   characterName: 'Sir Aldric',
 *   characterDescription: 'Cavaleiro humano de meia-idade com barba grisalha, cicatriz no olho esquerdo, armadura de placas prateada',
 *   universeContext: 'Reinos de Aethoria - Fantasia Medieval',
 *   visualStyle: 'Dark Souls concept art style'
 * });
 *
 * // Personagem de sci-fi com estilo Mass Effect
 * const scifiAvatar = buildCharacterAvatarPrompt({
 *   characterName: 'Zyx-7',
 *   characterDescription: 'Androide com carcaça metálica azulada, olhos LED vermelhos, marcas de batalha no chassi',
 *   universeContext: 'Galáxia Nebulosa - Space Opera',
 *   visualStyle: 'Mass Effect character portraits'
 * });
 *
 * // Personagem de Star Wars com estilo Ralph McQuarrie
 * const swAvatar = buildCharacterAvatarPrompt({
 *   characterName: 'Kira Vex',
 *   characterDescription: "Twi'lek azul com lekku longos, olhos amarelos, traje de caçadora de recompensas",
 *   universeContext: 'Star Wars - Era do Império',
 *   visualStyle: 'Ralph McQuarrie Star Wars concept art'
 * });
 *
 * // Personagem de anime com estilo Studio Ghibli
 * const ghibliAvatar = buildCharacterAvatarPrompt({
 *   characterName: 'Yuki',
 *   characterDescription: 'Jovem bruxa com cabelos negros longos, olhos grandes e expressivos, vestido azul',
 *   universeContext: 'Mundo mágico de fantasia japonesa',
 *   visualStyle: 'Studio Ghibli style'
 * });
 * ```
 *
 * @remarks
 * **Especificações Técnicas:**
 * - Tamanho recomendado: 1024x1024 pixels
 * - Modelo: DALL-E 3
 * - As imagens são URLs temporárias que expiram após algumas horas
 *
 * **Limitações:**
 * - DALL-E pode interpretar descrições de forma diferente do esperado
 * - Personagens de franquias conhecidas podem não ser reproduzidos fielmente
 * - O estilo pixel art pode variar em qualidade
 *
 * **Boas Práticas:**
 * - Descrições mais detalhadas geram resultados melhores
 * - Incluir cores específicas ajuda na consistência
 * - Mencionar estilo de roupa/época melhora contextualização
 */
export function buildCharacterAvatarPrompt({
  characterName,
  characterDescription,
  universeContext,
  visualStyle,
}: CharacterAvatarPromptParams): string {
  // Use the provided visual style or fallback to a default style based on universe
  const styleReference = visualStyle || 'classic RPG portrait art style';

  return `
    Square avatar portrait of a character named "${characterName}".

    CHARACTER APPEARANCE:
    ${characterDescription}

    UNIVERSE/SETTING:
    ${universeContext}

    ARTISTIC STYLE (CRITICAL - FOLLOW THIS EXACTLY):
    Create this portrait in the style of "${styleReference}".
    Study and emulate the specific visual characteristics, color palettes, lighting, and artistic techniques of this reference.
    All characters in this story share this same visual style for consistency.

    COMPOSITION REQUIREMENTS:
    - Close-up face portrait showing head and upper shoulders only
    - Face looking directly at the viewer (front-facing)
    - Centered composition optimized for small avatar display
    - Simple, uncluttered background (dark, gradient, or contextually appropriate)
    - High contrast and clear facial features visible even at small sizes
    - No text, watermarks, or borders

    The final image should look like a character avatar/profile picture from a video game or visual novel,
    instantly recognizable even when displayed at thumbnail size.
  `;
}
