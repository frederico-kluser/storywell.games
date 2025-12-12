/**
 * @fileoverview Prompt de Geração de Cores do Tema - UI Dinâmica baseada no Universo
 *
 * Este módulo contém o prompt responsável por gerar uma paleta de cores
 * personalizada para a interface do jogo baseada no contexto do universo.
 * As cores são geradas para criar uma atmosfera visual coerente com o mundo do jogo.
 *
 * @module prompts/themeColors
 *
 * @description
 * O Theme Colors Prompt é usado para:
 *
 * - **Gerar paleta** - Criar cores que combinem com o universo do jogo
 * - **Manter legibilidade** - Garantir contraste adequado entre texto e fundo
 * - **Criar atmosfera** - Transmitir o tom do universo através das cores
 * - **Preservar usabilidade** - Manter a interface funcional e acessível
 *
 * @example
 * ```typescript
 * import { buildThemeColorsPrompt } from './prompts/themeColors.prompt';
 *
 * const prompt = buildThemeColorsPrompt({
 *   universeName: 'Dark Souls',
 *   universeType: 'existing',
 *   genre: 'dark_fantasy',
 *   visualStyle: 'Gothic medieval concept art',
 *   userConsiderations: 'Quero cores mais sombrias com tons de vermelho',
 *   language: 'pt'
 * });
 * ```
 *
 * @see {@link ThemeColorsPromptParams} - Parâmetros aceitos pela função
 * @see {@link ThemeColorsResponse} - Formato da resposta esperada
 */

import { Language, NarrativeGenre } from '../../../types';
import { getLanguageName } from '../../../i18n/locales';

/**
 * Parâmetros necessários para construir o prompt de geração de cores.
 *
 * @interface ThemeColorsPromptParams
 */
export interface ThemeColorsPromptParams {
  /** Nome do universo (ex: "Dark Souls", "Star Wars", "Middle-earth") */
  universeName: string;
  /** Tipo do universo: original (criado) ou existing (existente) */
  universeType: 'original' | 'existing';
  /** Gênero narrativo do universo */
  genre?: NarrativeGenre;
  /** Estilo visual de referência (ex: "Studio Ghibli", "Cyberpunk 2077") */
  visualStyle?: string;
  /** Considerações adicionais do usuário para customização */
  userConsiderations?: string;
  /** Idioma para mensagens de erro */
  language: Language;
}

/**
 * Formato da resposta esperada do prompt de cores.
 *
 * @interface ThemeColorsResponse
 */
export interface ThemeColorsResponse {
  /** Primary background color (hex) */
  background: string;
  /** Secondary background color (hex) */
  backgroundSecondary: string;
  /** Accent background color (hex) */
  backgroundAccent: string;
  /** Primary text color (hex) */
  text: string;
  /** Secondary text color (hex) */
  textSecondary: string;
  /** Accent text color (hex) */
  textAccent: string;
  /** Primary border color (hex) */
  border: string;
  /** Strong border color (hex) */
  borderStrong: string;
  /** Primary button background (hex) */
  buttonPrimary: string;
  /** Primary button text (hex) */
  buttonPrimaryText: string;
  /** Secondary button background (hex) */
  buttonSecondary: string;
  /** Secondary button text (hex) */
  buttonSecondaryText: string;
  /** Success/positive color (hex) */
  success: string;
  /** Warning color (hex) */
  warning: string;
  /** Danger/error color (hex) */
  danger: string;
  /** Shadow color (hex) */
  shadow: string;
}

/**
 * Mapeia gêneros narrativos para dicas de cores.
 */
const GENRE_COLOR_HINTS: Record<NarrativeGenre, string> = {
  epic_fantasy: 'Rich golds, deep blues, forest greens - noble and majestic',
  dark_fantasy: 'Deep purples, blood reds, charcoal blacks - ominous and foreboding',
  sword_sorcery: 'Bronze, crimson, sand colors - ancient and adventurous',
  cosmic_horror: 'Sickly greens, void blacks, eldritch purples - alien and unsettling',
  noir: 'Black, white, gray, muted yellows - shadows and mystery',
  sci_fi_space: 'Electric blues, silver, deep space blacks - futuristic and vast',
  cyberpunk: 'Neon pinks, cyans, dark grays - high-tech and gritty',
  steampunk: 'Copper, brass, sepia, wood browns - Victorian industrial',
  post_apocalyptic: 'Rust oranges, dust browns, faded colors - decay and survival',
  mystery: 'Deep burgundy, midnight blue, muted tones - intrigue and shadows',
  romance: 'Soft pinks, warm reds, cream whites - passion and tenderness',
  comedy: 'Bright yellows, playful greens, vibrant colors - joy and lightness',
  historical: 'Parchment tones, period-appropriate colors - authenticity',
  superhero: 'Bold primary colors, strong contrasts - power and heroism',
  slice_of_life: 'Warm pastels, cozy earth tones - comfort and familiarity',
};

/**
 * Constrói o prompt para gerar cores do tema baseadas no universo.
 *
 * @param {ThemeColorsPromptParams} params - Parâmetros de entrada
 * @returns {string} O prompt formatado para envio à API da OpenAI
 */
export function buildThemeColorsPrompt({
  universeName,
  universeType,
  genre,
  visualStyle,
  userConsiderations,
  language,
}: ThemeColorsPromptParams): string {
  const langName = getLanguageName(language);
  const genreHint = genre ? GENRE_COLOR_HINTS[genre] : '';

  return `
You are a UI/UX designer specializing in creating atmospheric color palettes for games.
Generate a cohesive color palette that evokes the atmosphere of the given universe.

=== UNIVERSE CONTEXT ===
Universe Name: ${universeName}
Universe Type: ${universeType === 'existing' ? 'Based on existing IP (use iconic colors)' : 'Original creation'}
${genre ? `Narrative Genre: ${genre}` : ''}
${visualStyle ? `Visual Style Reference: ${visualStyle}` : ''}
${genreHint ? `Genre Color Direction: ${genreHint}` : ''}

${userConsiderations ? `=== USER CUSTOMIZATION REQUESTS ===\n${userConsiderations}\n` : ''}

=== DESIGN REQUIREMENTS ===

1. **Contrast & Readability**
   - Text on background must have WCAG AA compliant contrast (4.5:1 minimum)
   - Button text must be clearly readable on button backgrounds
   - Maintain usability while being atmospheric
   - Explicitly validate these pairs: (background vs text), (backgroundSecondary vs text), (backgroundAccent vs textAccent), (buttonPrimary vs buttonPrimaryText), (buttonSecondary vs buttonSecondaryText), (border vs backgroundSecondary)

2. **Color Harmony**
   - Use a cohesive palette (analogous, complementary, or triadic)
   - Background colors should be muted/desaturated for readability
   - Accent colors can be more vibrant for emphasis

3. **Atmospheric Goals**
   - Colors should immediately evoke the universe's mood
   - For existing IPs, reference iconic colors (e.g., Matrix green, Star Wars blue/yellow)
   - For original universes, derive colors from genre conventions

4. **Functional Colors**
   - Success: Must feel positive/safe (typically green-based)
   - Warning: Must feel cautionary (typically yellow/orange)
   - Danger: Must feel threatening/urgent (typically red)
   - These can be tinted to match the palette but must remain recognizable

=== ACCESSIBILITY CHECKLIST ===
- Follow WCAG 2.1 AA: 4.5:1 for normal text, 3:1 for large UI labels and supporting copy
- Ensure every pair (background/text, button/text, alert/text, accent/text) meets or exceeds those ratios; target 7:1 for the main reading color pair
- Keep textSecondary at least 3:1 against backgroundSecondary and backgroundAccent so helper copy stays legible
- Borders must remain visible against adjacent backgrounds (≥3:1) to separate cards, inputs and option grids
- Avoid pairing hues whose relative luminance differs by less than 0.2 (≈20 L*) to prevent muddy blends
- Prefer deliberate HSL/OKLCH adjustments instead of opacity overlays when darkening/lightening values

=== OUTPUT FORMAT ===

Return ONLY a JSON object with these hex color values:

{
  "background": "#XXXXXX",
  "backgroundSecondary": "#XXXXXX",
  "backgroundAccent": "#XXXXXX",
  "text": "#XXXXXX",
  "textSecondary": "#XXXXXX",
  "textAccent": "#XXXXXX",
  "border": "#XXXXXX",
  "borderStrong": "#XXXXXX",
  "buttonPrimary": "#XXXXXX",
  "buttonPrimaryText": "#XXXXXX",
  "buttonSecondary": "#XXXXXX",
  "buttonSecondaryText": "#XXXXXX",
  "success": "#XXXXXX",
  "warning": "#XXXXXX",
  "danger": "#XXXXXX",
  "shadow": "#XXXXXX"
}

IMPORTANT:
- All values must be valid 6-character hex colors (e.g., "#1c1917", "#ff5500")
- Do NOT include any explanation or text outside the JSON object
- Ensure the palette is cohesive and functional
`;
}

/**
 * JSON Schema para validação da resposta de cores.
 *
 * @constant
 * @type {object}
 */
export const themeColorsSchema = {
  type: 'object',
  properties: {
    background: {
      type: 'string',
      description: 'Primary background color (hex)',
      pattern: '^#[0-9A-Fa-f]{6}$',
    },
    backgroundSecondary: {
      type: 'string',
      description: 'Secondary background color (hex)',
      pattern: '^#[0-9A-Fa-f]{6}$',
    },
    backgroundAccent: {
      type: 'string',
      description: 'Accent background color (hex)',
      pattern: '^#[0-9A-Fa-f]{6}$',
    },
    text: {
      type: 'string',
      description: 'Primary text color (hex)',
      pattern: '^#[0-9A-Fa-f]{6}$',
    },
    textSecondary: {
      type: 'string',
      description: 'Secondary text color (hex)',
      pattern: '^#[0-9A-Fa-f]{6}$',
    },
    textAccent: {
      type: 'string',
      description: 'Accent text color (hex)',
      pattern: '^#[0-9A-Fa-f]{6}$',
    },
    border: {
      type: 'string',
      description: 'Primary border color (hex)',
      pattern: '^#[0-9A-Fa-f]{6}$',
    },
    borderStrong: {
      type: 'string',
      description: 'Strong border color (hex)',
      pattern: '^#[0-9A-Fa-f]{6}$',
    },
    buttonPrimary: {
      type: 'string',
      description: 'Primary button background (hex)',
      pattern: '^#[0-9A-Fa-f]{6}$',
    },
    buttonPrimaryText: {
      type: 'string',
      description: 'Primary button text (hex)',
      pattern: '^#[0-9A-Fa-f]{6}$',
    },
    buttonSecondary: {
      type: 'string',
      description: 'Secondary button background (hex)',
      pattern: '^#[0-9A-Fa-f]{6}$',
    },
    buttonSecondaryText: {
      type: 'string',
      description: 'Secondary button text (hex)',
      pattern: '^#[0-9A-Fa-f]{6}$',
    },
    success: {
      type: 'string',
      description: 'Success color (hex)',
      pattern: '^#[0-9A-Fa-f]{6}$',
    },
    warning: {
      type: 'string',
      description: 'Warning color (hex)',
      pattern: '^#[0-9A-Fa-f]{6}$',
    },
    danger: {
      type: 'string',
      description: 'Danger color (hex)',
      pattern: '^#[0-9A-Fa-f]{6}$',
    },
    shadow: {
      type: 'string',
      description: 'Shadow color (hex)',
      pattern: '^#[0-9A-Fa-f]{6}$',
    },
  },
  required: [
    'background',
    'backgroundSecondary',
    'backgroundAccent',
    'text',
    'textSecondary',
    'textAccent',
    'border',
    'borderStrong',
    'buttonPrimary',
    'buttonPrimaryText',
    'buttonSecondary',
    'buttonSecondaryText',
    'success',
    'warning',
    'danger',
    'shadow',
  ],
};
