/**
 * @fileoverview Prompt de Análise de Qualidade Narrativa
 *
 * Este módulo contém o prompt responsável por analisar a qualidade narrativa
 * de uma resposta gerada, identificando problemas e sugerindo melhorias.
 * Funciona como um "editor literário" automatizado.
 *
 * @module prompts/narrativeQualityAnalysis
 *
 * @description
 * O Narrative Quality Analysis Prompt é usado para:
 *
 * - **Detectar "contar" em vez de "mostrar"** - Identificar uso de rótulos emocionais
 * - **Avaliar diferenciação de voz** - Verificar se NPCs têm vozes distintas
 * - **Analisar ritmo** - Verificar variação de comprimento de frases
 * - **Identificar clichês** - Detectar frases e expressões sobreusadas
 * - **Sugerir melhorias** - Propor correções específicas
 */

import { Language } from '../../../types';
import { getLanguageName } from '../../../i18n/locales';
import { NarrativeGenre, GENRE_PRESETS } from './narrativeStyles';

/**
 * Parâmetros para análise de qualidade narrativa.
 */
export interface NarrativeQualityAnalysisParams {
  /** Texto narrativo a ser analisado */
  narrativeText: string;
  /** Gênero do universo para verificar conformidade */
  genre?: NarrativeGenre;
  /** Idioma da narrativa */
  language: Language;
  /** Se deve incluir sugestões de reescrita */
  includeSuggestions?: boolean;
}

/**
 * Problema identificado na narrativa.
 */
export interface NarrativeIssue {
  /** Tipo do problema */
  type: 'tell_not_show' | 'voice_homogenization' | 'pacing' | 'cliche' | 'genre_violation' | 'repetition';
  /** Severidade: low, medium, high */
  severity: 'low' | 'medium' | 'high';
  /** Trecho problemático original */
  originalText: string;
  /** Explicação do problema */
  explanation: string;
  /** Sugestão de correção (se requestIncludeSuggestions) */
  suggestion?: string;
}

/**
 * Resultado da análise de qualidade narrativa.
 */
export interface NarrativeQualityAnalysisResponse {
  /** Score geral de qualidade (0-100) */
  overallScore: number;
  /** Problemas identificados */
  issues: NarrativeIssue[];
  /** Pontos fortes da narrativa */
  strengths: string[];
  /** Resumo executivo da análise */
  summary: string;
  /** Se a narrativa atende ao padrão de qualidade aceitável */
  meetsQualityThreshold: boolean;
}

/**
 * Constrói o prompt para analisar a qualidade de uma narrativa gerada.
 */
export function buildNarrativeQualityAnalysisPrompt({
  narrativeText,
  genre,
  language,
  includeSuggestions = true,
}: NarrativeQualityAnalysisParams): string {
  const langName = getLanguageName(language);

  // Get genre-specific guidelines if provided
  let genreGuidelines = '';
  if (genre && GENRE_PRESETS[genre]) {
    const style = GENRE_PRESETS[genre];
    genreGuidelines = `
=== GENRE-SPECIFIC GUIDELINES: ${style.displayName.toUpperCase()} ===

**Expected Vocabulary:**
- Complexity: ${style.vocabulary.complexity}
- Should use: ${style.vocabulary.useWords.slice(0, 5).join(', ')}
- Should avoid: ${style.vocabulary.avoidWords.slice(0, 5).join(', ')}

**Expected Sentence Patterns:**
- Length: ${style.sentencePatterns.averageLength}
- Rhythm: ${style.sentencePatterns.rhythm}

**Expected Atmosphere:**
- Primary tone: ${style.atmosphere.primaryTone}
- Violence level: ${style.atmosphere.violenceLevel}
- Humor: ${style.atmosphere.humorStyle}

**Techniques that should be present:**
${style.techniques.slice(0, 3).map((t) => `- ${t}`).join('\n')}

**Should avoid:**
${style.avoid.slice(0, 3).map((a) => `- ${a}`).join('\n')}
`;
  }

  return `
You are a literary editor specialized in interactive fiction and RPG narratives.
Analyze the following narrative text for quality issues and provide detailed feedback.

=== NARRATIVE TEXT TO ANALYZE ===
"""
${narrativeText}
"""

=== ANALYSIS CRITERIA ===

**1. SHOW VS TELL (Most Important)**
Identify any instances where emotions or states are TOLD instead of SHOWN.
- BAD: "She was angry", "He felt nervous", "They were happy"
- GOOD: Physical actions, body language, environmental details, dialogue subtext
- Severity: HIGH for direct emotion labels, MEDIUM for implied telling

**2. VOICE DIFFERENTIATION**
If multiple characters speak, check if they sound distinct.
- Each character should have unique speech patterns
- Different vocabulary levels, verbal tics, sentence structures
- Severity: HIGH if all characters sound identical

**3. PACING & RHYTHM**
Analyze sentence length variation and flow.
- Good pacing alternates between short and long sentences
- Action scenes should have shorter sentences
- Reflective moments can have longer sentences
- Severity: MEDIUM for monotonous rhythm

**4. CLICHÉS & OVERUSED PHRASES**
Identify tired expressions that should be replaced.
- "Suddenly", "very", "really", "beautiful", "amazing"
- Overused metaphors and similes
- Generic descriptions
- Severity: LOW for occasional use, MEDIUM for frequent use

**5. REPETITION**
Check for word or phrase repetition within close proximity.
- Same word used multiple times in a paragraph
- Same sentence structure repeated
- Severity: LOW to MEDIUM based on frequency

${genreGuidelines}

=== OUTPUT FORMAT ===

Respond with JSON:
{
  "overallScore": 0-100,
  "meetsQualityThreshold": true/false (threshold is 70),
  "summary": "Brief 1-2 sentence summary of the narrative quality",
  "strengths": [
    "List of things done well (2-4 items)"
  ],
  "issues": [
    {
      "type": "tell_not_show" | "voice_homogenization" | "pacing" | "cliche" | "genre_violation" | "repetition",
      "severity": "low" | "medium" | "high",
      "originalText": "The problematic text excerpt",
      "explanation": "Why this is a problem"${includeSuggestions ? `,
      "suggestion": "How to fix it"` : ''}
    }
  ]
}

**SCORING GUIDELINES:**
- 90-100: Excellent prose, publishable quality
- 80-89: Good quality, minor issues
- 70-79: Acceptable, some noticeable issues
- 60-69: Below threshold, needs improvement
- Below 60: Significant quality problems

Be thorough but fair. Not every narrative needs to be literary fiction.
Focus on the most impactful issues first.
Write all explanations and suggestions in ${langName}.
`;
}

/**
 * JSON Schema para validação da resposta de análise de qualidade.
 */
export const narrativeQualityAnalysisSchema = {
  type: 'object',
  properties: {
    overallScore: {
      type: 'number',
      minimum: 0,
      maximum: 100,
      description: 'Overall quality score from 0 to 100.',
    },
    meetsQualityThreshold: {
      type: 'boolean',
      description: 'Whether the narrative meets the minimum quality threshold (70).',
    },
    summary: {
      type: 'string',
      description: 'Brief summary of the narrative quality.',
    },
    strengths: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of things done well in the narrative.',
    },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['tell_not_show', 'voice_homogenization', 'pacing', 'cliche', 'genre_violation', 'repetition'],
          },
          severity: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
          },
          originalText: {
            type: 'string',
            description: 'The problematic text excerpt.',
          },
          explanation: {
            type: 'string',
            description: 'Why this is a problem.',
          },
          suggestion: {
            type: 'string',
            description: 'How to fix the issue (optional).',
          },
        },
        required: ['type', 'severity', 'originalText', 'explanation'],
      },
    },
  },
  required: ['overallScore', 'meetsQualityThreshold', 'summary', 'strengths', 'issues'],
};

/**
 * Prompt rápido para detecção de "contar" em vez de "mostrar".
 * Usado para validação em tempo real durante a geração.
 */
export function buildQuickShowDontTellCheckPrompt(text: string, language: Language): string {
  const langName = getLanguageName(language);

  return `
Quickly scan this text for "telling" instead of "showing" violations.
Only flag DIRECT emotion labels (e.g., "she was sad", "he felt angry").

Text: "${text}"

Respond with JSON:
{
  "hasViolations": true/false,
  "violations": [
    {
      "originalPhrase": "the problematic phrase",
      "suggestedFix": "a showing alternative"
    }
  ]
}

Write suggestions in ${langName}. Be concise.
`;
}

export const quickShowDontTellSchema = {
  type: 'object',
  properties: {
    hasViolations: {
      type: 'boolean',
      description: 'Whether any show-dont-tell violations were found.',
    },
    violations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          originalPhrase: { type: 'string' },
          suggestedFix: { type: 'string' },
        },
        required: ['originalPhrase', 'suggestedFix'],
      },
    },
  },
  required: ['hasViolations', 'violations'],
};

/**
 * Lista de palavras/frases que frequentemente indicam "contar" em vez de "mostrar".
 * Útil para validação rápida no cliente sem chamar a API.
 */
export const TELL_NOT_SHOW_INDICATORS = {
  emotions: {
    pt: [
      'estava triste', 'estava feliz', 'estava com raiva', 'estava nervoso', 'estava ansioso',
      'ficou triste', 'ficou feliz', 'ficou com raiva', 'ficou nervoso', 'ficou ansioso',
      'sentiu raiva', 'sentiu tristeza', 'sentiu felicidade', 'sentiu medo', 'sentiu alegria',
      'estava com medo', 'estava aliviado', 'estava preocupado', 'estava irritado',
    ],
    en: [
      'was sad', 'was happy', 'was angry', 'was nervous', 'was anxious',
      'felt sad', 'felt happy', 'felt angry', 'felt nervous', 'felt anxious',
      'felt fear', 'felt joy', 'felt relief', 'felt worried', 'felt irritated',
      'was afraid', 'was relieved', 'was worried', 'was irritated',
    ],
    es: [
      'estaba triste', 'estaba feliz', 'estaba enojado', 'estaba nervioso', 'estaba ansioso',
      'se sintió triste', 'se sintió feliz', 'se sintió enojado', 'sintió miedo', 'sintió alegría',
      'tenía miedo', 'estaba aliviado', 'estaba preocupado', 'estaba irritado',
    ],
  },
  cliches: {
    pt: ['de repente', 'subitamente', 'muito bonito', 'muito forte', 'incrível', 'maravilhoso', 'espetacular'],
    en: ['suddenly', 'very beautiful', 'very strong', 'amazing', 'wonderful', 'spectacular', 'incredible'],
    es: ['de repente', 'súbitamente', 'muy hermoso', 'muy fuerte', 'increíble', 'maravilloso', 'espectacular'],
  },
};

/**
 * Verifica rapidamente no cliente se o texto contém indicadores de "contar".
 * Não substitui a análise completa, mas serve como pré-filtro.
 */
export function quickClientSideCheck(text: string, language: Language): {
  hasPotentialIssues: boolean;
  indicators: string[];
} {
  const lowerText = text.toLowerCase();
  const indicators: string[] = [];

  // Check emotions
  const emotionIndicators = TELL_NOT_SHOW_INDICATORS.emotions[language] || TELL_NOT_SHOW_INDICATORS.emotions.en;
  for (const indicator of emotionIndicators) {
    if (lowerText.includes(indicator.toLowerCase())) {
      indicators.push(indicator);
    }
  }

  // Check clichés
  const clicheIndicators = TELL_NOT_SHOW_INDICATORS.cliches[language] || TELL_NOT_SHOW_INDICATORS.cliches.en;
  for (const cliche of clicheIndicators) {
    if (lowerText.includes(cliche.toLowerCase())) {
      indicators.push(cliche);
    }
  }

  return {
    hasPotentialIssues: indicators.length > 0,
    indicators,
  };
}
