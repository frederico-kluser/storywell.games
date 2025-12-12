/**
 * @fileoverview Prompt de Imagem de Fundo de Localização
 *
 * Este módulo contém o prompt responsável por gerar imagens de fundo
 * para as localizações do jogo usando DALL-E 3. As imagens são usadas
 * como background do chat para aumentar a imersão.
 *
 * @module prompts/locationBackground
 *
 * @description
 * O Location Background Prompt é usado para:
 *
 * - **Gerar cenários imersivos** - Criar imagens atmosféricas do local atual
 * - **Manter consistência visual** - Adaptar ao estilo artístico do universo
 * - **Contextualizar a narrativa** - Dar vida visual aos ambientes
 *
 * Este prompt é enviado à API DALL-E 3 da OpenAI.
 * As imagens geradas são armazenadas como base64 no IndexedDB.
 */

/**
 * Parâmetros necessários para construir o prompt de background.
 *
 * @interface LocationBackgroundPromptParams
 * @property {string} locationName - Nome do local
 * @property {string} locationDescription - Descrição detalhada do local
 * @property {string} universeContext - Nome/tipo do universo para consistência
 * @property {string} [visualStyle] - Referência artística para o estilo visual
 */
export interface LocationBackgroundPromptParams {
  /** Nome do local */
  locationName: string;
  /** Descrição detalhada do local */
  locationDescription: string;
  /** Contexto do universo para adaptar estilo visual */
  universeContext: string;
  /** Referência artística para estilo visual */
  visualStyle?: string;
}

/**
 * Constrói o prompt para gerar uma imagem de fundo de localização usando DALL-E 3.
 *
 * Este prompt instrui o DALL-E a criar:
 *
 * **1. Cenário Atmosférico:**
 * - Paisagem ou ambiente interior detalhado
 * - Iluminação que combina com a atmosfera do local
 * - Elementos visuais que contextualizam a cena
 *
 * **2. Composição para Background:**
 * - Imagem panorâmica/wide adequada para fundo
 * - Sem personagens ou figuras principais
 * - Profundidade de campo suave para não competir com texto
 *
 * **3. Estilo Consistente:**
 * - Baseado na referência artística do universo
 * - Cores e atmosfera que combinam com o tema
 *
 * @param {LocationBackgroundPromptParams} params - Parâmetros de entrada
 * @returns {string} O prompt formatado para envio à API DALL-E
 *
 * @example
 * ```typescript
 * const prompt = buildLocationBackgroundPrompt({
 *   locationName: 'Taverna do Dragão Adormecido',
 *   locationDescription: 'Uma taverna acolhedora com lareiras crepitantes e candelabros...',
 *   universeContext: 'Fantasia Medieval',
 *   visualStyle: 'Dark Souls concept art'
 * });
 * ```
 */
export function buildLocationBackgroundPrompt({
  locationName,
  locationDescription,
  universeContext,
  visualStyle,
}: LocationBackgroundPromptParams): string {
  const styleReference = visualStyle || 'atmospheric concept art';

  return `
    Wide cinematic environment background image of "${locationName}".

    LOCATION DESCRIPTION:
    ${locationDescription}

    UNIVERSE/SETTING:
    ${universeContext}

    ARTISTIC STYLE (CRITICAL - FOLLOW THIS EXACTLY):
    Create this background in the style of "${styleReference}".
    Study and emulate the specific visual characteristics, color palettes, lighting, and artistic techniques of this reference.

    COMPOSITION REQUIREMENTS:
    - Wide/panoramic aspect ratio (landscape orientation)
    - NO characters, people, or creatures in the scene - environment only
    - Atmospheric lighting that evokes the mood of the location
    - Subtle depth of field to allow text overlay
    - Rich environmental details that tell the story of the place
    - Slightly desaturated or muted colors to work well as a background
    - Gentle vignette effect at edges

    MOOD AND ATMOSPHERE:
    - Capture the essence and feeling of this location
    - Use lighting to set the emotional tone
    - Include environmental storytelling elements (signs of life, wear, history)

    The final image should work as an immersive background behind chat text,
    setting the scene without being visually distracting.
  `;
}
