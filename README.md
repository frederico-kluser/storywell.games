# storywell.games

**Versão:** 1.4.0

Um motor de RPG de texto alimentado por IA que cria experiências narrativas dinâmicas e imersivas. O jogo utiliza
GPT-4.1 da OpenAI para gerar histórias, gerenciar estados de personagens e responder às ações do jogador em tempo real.

> **Novidade v1.3.0:** Sistema completo de Qualidade Narrativa com 15 gêneros literários, técnicas de "mostrar, não
> contar", diferenciação de vozes de NPCs e controle de ritmo narrativo.

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Projeto](#arquitetura-do-projeto)
3. [Sistema de Tipos](#sistema-de-tipos)
4. [Sistema de Qualidade Narrativa](#sistema-de-qualidade-narrativa-v130)
5. [Engenharia de Prompts](#engenharia-de-prompts)
6. [Construção de Contexto](#construção-de-contexto)
7. [Tomada de Decisões da IA](#tomada-de-decisões-da-ia)
8. [Gerenciamento de Estado](#gerenciamento-de-estado)
9. [Banco de Dados](#banco-de-dados)
10. [Fluxo do Jogo](#fluxo-do-jogo)
11. [Componentes de UI](#componentes-de-ui)
12. [Internacionalização](#internacionalização)
13. [Tratamento de Erros](#tratamento-de-erros)
14. [Stack Tecnológico](#stack-tecnológico)
15. [Instalação e Uso](#instalação-e-uso)
16. [Guia de Contribuição](#guia-de-contribuição)

---

## Visão Geral

storywell.games é um motor de RPG baseado em navegador que usa inteligência artificial para:

- **Gerar mundos dinâmicos** - Crie universos originais ou jogue em universos conhecidos (filmes, livros, jogos)
- **Gerenciar personagens** - NPCs com personalidades, inventários, estatísticas e relacionamentos
- **Resolver ações** - Validação de magia, combate, consumíveis e interações
- **Criar narrativas** - Diálogos e narrações contextualmente apropriados
- **Gerar avatares** - Retratos e backgrounds via gpt-image-1-mini
- **Text-to-Speech** - Narração por voz via OpenAI TTS
- **Speech-to-Text** - Comandos por voz via Whisper
- **Sistema de Destino (Fate)** - Cada sugestão de ação inclui probabilidades de eventos positivos/negativos
- **Sistema de Itens e Currency** - Itens estruturados com categorias, preços e efeitos; economia com gold
- **Transporte de Campanhas** - Exportação/importação versionada de saves (JSON assinado) + validação local
- **Ferramentas de Apoio** - Viewer retro de logs, modal de erros categorizado e fila de mensagens com anti-spam

### Recursos Principais

| Área                       | Destaques                                                                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Experiência do jogador** | Wizard de onboarding assistido por IA, sugestões de ação com rolagem de destino, modo "Outro" para input livre, chat com efeito typewriter e botões de TTS |
| **IA Generativa**          | GPT-4.1 para narrativa, gpt-image-1-mini para imagens, Whisper para STT, gpt-4o-mini-tts para voz e prompts com schema JSON obrigatório                    |
| **Persistência**           | IndexedDB normalizado, auto-save por turno, heavy context incremental e exportação/importação versionada                                                   |
| **Internacionalização**    | EN/PT/ES/FR/RU/ZH com detecção automática + cookie, UI retro-futurista e suporte de voz sincronizado                                                       |
| **Ferramentas para devs**  | Console log viewer, testes Jest/RTL cobrindo hooks/serviços/componentes e estrutura modular com separation of concerns                                     |

---

## Arquitetura do Projeto

```
/components               # Camada de apresentação
  /ActionInput            # Input com sugestões, rolagem de destino e modo "Outro"
  /ChatBubble             # Balões com typewriter, botões de TTS e avatares
  /ErrorModal             # Modal de erros categorizados (quota, key, rede...)
  /FateToast              # Toast para feedback imediato do FateResult
  /LogViewer              # Console retro alimentado por useConsoleLogs
  /StoryCreator           # Wizard colaborativo de mundo/Personagem
  /VoiceInput             # Captura áudio e envia para Whisper
  /VoiceSettings          # Seleção/preview das vozes gpt-4o-mini-tts

/hooks                    # Regras de negócio
  useGameEngine.ts        # Orquestra API, IndexedDB, prompts e UI
  useConsoleLogs.ts       # Espelha console.* em estado React
  useMessageQueue.ts      # Mantém timeline ordenada, paginação e salto automático dos cards

/services                 # Integrações externas e data layer
  /ai
    openaiClient.ts       # Loop do GM, prompts, avatars, TTS, STT
    systemPrompts.ts      # Catálogo de prompts modulares
    prompts/*.prompt.ts   # Onboarding, GM, action options, heavy context etc
  db.ts                   # Data mapper IndexedDB + export/import versionado
  geminiService.ts        # Re-export central para componentes legados

/utils                    # Utilitários compartilhados
  ai.ts                   # Wrapper OpenAI (LLM, TTS, Whisper, Images)
  helpers.ts              # Limpeza de JSON, blob helpers
  errorHandler.ts         # Classificação de erros OpenAI
  inventory.ts            # Operações de inventário, type guards, migração
  migration.ts            # Migração de saves legados (string[] → Item[])

/constants                # Constantes do jogo
  economy.ts              # Regras econômicas, preços, gold inicial por universo
  index.ts                # Re-exports

/i18n                     # Internacionalização
  locales.ts              # Traduções + cookies + detecção de idioma

/__tests__                # Testes Jest + Testing Library (hooks, serviços, UI)
/types.ts                 # Tipos globais (GameState, GMResponse etc)
/App.tsx                  # Componente raiz / composição de views
```

### Separação de Responsabilidades

| Camada                     | Responsabilidade                      |
| -------------------------- | ------------------------------------- |
| **Views** (`components/`)  | Renderização pura, recebem props      |
| **Logic** (`hooks/`)       | Gerenciamento de estado, orquestração |
| **Services** (`services/`) | APIs externas (OpenAI, IndexedDB)     |
| **Utils** (`utils/`)       | Funções auxiliares reutilizáveis      |

---

## Sistema de Tipos

### GameState - Estado Principal do Jogo

```typescript
interface GameState {
	id: string;
	title: string;
	turnCount: number;
	lastPlayed: number;
	config: GameConfig;

	// Coleções em runtime (mapas para acesso O(1))
	characters: Record<string, Character>;
	locations: Record<string, Location>;
	messages: ChatMessage[];
	events: GameEvent[];

	// Ponteiros de contexto atual
	playerCharacterId: string;
	currentLocationId: string;
}
```

### Character - Modelo de Entidade

```typescript
interface Character {
	id: string;
	name: string;
	description: string;
	isPlayer: boolean;
	locationId: string;
	stats: CharacterStats | Record<string, number>; // Para jogadores: hp, maxHp, gold obrigatórios
	inventory: Item[] | string[]; // Item[] (novo) ou string[] (legado, será migrado)
	relationships: Record<string, number>; // CharID -> 0-100
	state: 'idle' | 'talking' | 'fighting' | 'unconscious' | 'dead';
	avatarUrl?: string; // Base64 da imagem gerada
}
```

### Item - Sistema de Itens (v1.2.0)

```typescript
type ItemCategory =
	| 'consumable' // Poções, comida, pergaminhos
	| 'weapon' // Espadas, arcos, armas
	| 'armor' // Escudos, capacetes, armaduras
	| 'valuable' // Gemas, joias, tesouros
	| 'material' // Materiais de crafting
	| 'quest' // Itens de missão (não vendíveis)
	| 'currency' // Moedas, créditos
	| 'misc'; // Outros

interface Item {
	id: string; // ID único do item
	name: string; // Nome de exibição
	category: ItemCategory; // Categoria para preços e regras
	description?: string; // Descrição opcional
	baseValue?: number; // Valor base em gold
	quantity?: number; // Quantidade se empilhável
	isStackable?: boolean; // Se pode empilhar
	effects?: ItemEffect[]; // Efeitos quando usado/equipado
	isEquipped?: boolean; // Se está equipado (armas/armaduras)
}

interface ItemEffect {
	stat: string; // Stat a modificar (ex: 'hp', 'gold')
	value: number; // Quantidade a adicionar/subtrair
	duration?: number; // Duração em turnos (opcional)
}
```

### CharacterStats - Stats do Personagem

```typescript
interface CharacterStats {
	hp: number; // Pontos de vida atuais
	maxHp: number; // Pontos de vida máximos
	gold: number; // Quantidade de gold
	[key: string]: number; // Stats adicionais (força, mana, etc.)
}
```

### GMResponse - Formato de Saída da IA

```typescript
interface GMResponse {
	messages: {
		senderName: string; // 'Narrator', 'SYSTEM', ou nome do NPC
		text: string;
		type: 'dialogue' | 'narration' | 'system';
	}[];
	stateUpdates: {
		newLocations?: Location[];
		newCharacters?: Character[];
		updatedCharacters?: Partial<Character>[];
		locationChange?: string;
		eventLog?: string;
	};
}
```

---

## Sistema de Economia (v1.2.0)

### Regras de Preços por Categoria

| Categoria  | Preço Mínimo     | Preço Máximo |
| ---------- | ---------------- | ------------ |
| consumable | 5 gold           | 50 gold      |
| weapon     | 20 gold          | 500 gold     |
| armor      | 30 gold          | 600 gold     |
| valuable   | 50 gold          | 1000 gold    |
| material   | 1 gold           | 20 gold      |
| quest      | 0 (não vendível) | 0            |
| currency   | 1 gold           | 1000 gold    |
| misc       | 1 gold           | 50 gold      |

### Gold Inicial por Tipo de Universo

| Universo            | Gold Inicial |
| ------------------- | ------------ |
| Fantasy/Medieval    | 50           |
| Sci-Fi/Space        | 100          |
| Cyberpunk           | 150          |
| Modern/Contemporary | 200          |
| Steampunk           | 75           |
| Horror              | 30           |
| Western             | 40           |
| Post-Apocalyptic    | 20           |

### Multiplicadores de Compra/Venda

- **Compra:** 100% do valor base (sem markup)
- **Venda:** 50% do valor base (jogador recebe metade)

### Migração Automática

Saves antigos com `inventory: string[]` são automaticamente migrados para `Item[]` ao carregar:

```typescript
// Antes (legado)
inventory: ['Espada de Ferro', 'Poção de Cura'];

// Depois (migrado)
inventory: [
	{ id: 'item_123', name: 'Espada de Ferro', category: 'weapon', baseValue: 100 },
	{ id: 'item_124', name: 'Poção de Cura', category: 'consumable', baseValue: 25 },
];
```

A categoria é detectada automaticamente usando keywords bilíngues (EN, PT, ES).

---

## Sistema de Qualidade Narrativa (v1.3.0)

O storywell.games implementa um sistema avançado de qualidade narrativa baseado em técnicas literárias profissionais.
Este sistema garante que as histórias geradas tenham a qualidade de ficção publicável.

### Gêneros Narrativos (15 Presets)

Cada universo pode ser configurado com um gênero narrativo que define vocabulário, tom, ritmo e técnicas específicas:

| Gênero             | Estilo                                                | Tom Principal           |
| ------------------ | ----------------------------------------------------- | ----------------------- |
| `epic_fantasy`     | Tolkien - dicção arcaica, estrutura paratática        | Épico, majestoso        |
| `dark_fantasy`     | Grimdark - moralidade cinza, violência consequente    | Sombrio, opressivo      |
| `sword_sorcery`    | Howard - prosa dinâmica, ação poética                 | Aventuresco, visceral   |
| `cosmic_horror`    | Lovecraft - narrador não confiável, pavor crescente   | Perturbador, alienígena |
| `noir`             | Hardboiled - cinismo, símiles inesperados             | Cínico, melancólico     |
| `sci_fi_space`     | Space Opera - terminologia técnica, escala épica      | Aventuresco, grandioso  |
| `cyberpunk`        | Dystopia tecnológica - jargão de rua, alta tecnologia | Distópico, frenético    |
| `steampunk`        | Era vitoriana alternativa - formalidade, gadgets      | Aventuresco, elegante   |
| `post_apocalyptic` | Sobrevivência - escassez, desconfiança                | Desolador, tenso        |
| `mystery`          | Detetive - pistas, red herrings, revelação gradual    | Intrigante, cerebral    |
| `romance`          | Relacionamentos - tensão emocional, vulnerabilidade   | Emocional, íntimo       |
| `comedy`           | Humor - timing, subversão de expectativas             | Humorístico, absurdo    |
| `historical`       | Época específica - precisão cultural, autenticidade   | Autêntico, imersivo     |
| `superhero`        | Ação heróica - dilemas morais, poderes                | Heroico, espetacular    |
| `slice_of_life`    | Cotidiano - momentos pequenos, realismo               | Contemplativo, caloroso |

### Configuração de Gênero

Cada preset define:

```typescript
interface NarrativeStyle {
	genre: NarrativeGenre;
	displayName: string;
	description: string;
	vocabulary: {
		complexity: 'simple' | 'moderate' | 'elaborate' | 'archaic';
		useWords: string[]; // Palavras características a usar
		avoidWords: string[]; // Palavras a evitar
		formality: 'casual' | 'neutral' | 'formal' | 'ceremonial';
	};
	sentencePatterns: {
		averageLength: 'short' | 'medium' | 'long' | 'varied';
		rhythm: 'staccato' | 'flowing' | 'mixed';
		complexity: 'simple' | 'compound' | 'complex';
		patterns: string[]; // Padrões específicos do gênero
	};
	atmosphere: {
		primaryTone: string;
		secondaryTones: string[];
		sensoryPriorities: ('visual' | 'auditory' | 'tactile' | 'olfactory' | 'gustatory')[];
		violenceLevel: 'none' | 'implied' | 'moderate' | 'graphic';
		humorStyle: 'none' | 'subtle' | 'moderate' | 'frequent';
	};
	techniques: string[]; // Técnicas a usar
	avoid: string[]; // O que evitar
	examplePhrases: string[]; // Exemplos de prosa no estilo
}
```

### Sistema "Mostrar, Não Contar"

O sistema inclui regras rígidas para evitar "contar" emoções em vez de "mostrá-las":

```typescript
// NUNCA faça isso:
'Ela estava com raiva.';
'Ele estava nervoso.';
'Maria ficou triste.';

// SEMPRE faça isso:
'Ela bateu o punho na mesa, sua voz subindo uma oitava.';
'Ele ajustou a gravata pela terceira vez, os olhos saltando para a porta.';
'Maria virou o rosto para a janela. A chuva traçava caminhos no vidro.';
```

O sistema detecta automaticamente violações através de:

- Lista de indicadores de "contar" em PT/EN/ES
- Análise de qualidade pós-geração com scoring (0-100)
- Sugestões de reescrita para frases problemáticas

### Diferenciação de Voz de NPCs

Cada NPC recebe um perfil de voz único baseado em:

```typescript
interface NPCVoiceProfile {
	educationLevel: 'uneducated' | 'common' | 'educated' | 'scholarly' | 'archaic';
	socialClass: 'outcast' | 'lower' | 'middle' | 'upper' | 'nobility' | 'royalty';
	region: string; // Afeta dialeto
	profession: string; // Afeta jargão
	verbalTics: string[]; // "né", "sabe", "tipo assim"
	catchphrases: string[]; // Frases características
	speechRhythm: 'slow' | 'normal' | 'fast' | 'erratic';
	personalityTrait: string; // Traço dominante que afeta fala
}
```

**Templates Pré-definidos:**

- `peasant` - Vocabulário simples, gírias, ritmo rápido
- `merchant` - Vocabulário médio, expressões comerciais
- `scholar` - Vocabulário técnico, referências eruditas
- `noble` - Tom formal e superior, ritmo pausado
- `soldier` - Tom direto, jargão militar
- `mystic` - Fala enigmática, referências ao destino
- `criminal` - Gírias de rua, linguagem codificada
- `child` - Vocabulário limitado, entusiasmo

### Sistema de Controle de Ritmo (Pacing)

O sistema monitora e ajusta automaticamente o ritmo narrativo:

| Nível          | Descrição          | Características                                |
| -------------- | ------------------ | ---------------------------------------------- |
| `high_tension` | Alta tensão        | Frases curtas, ações imediatas, urgência       |
| `building`     | Construindo tensão | Complicações crescentes, prenúncios            |
| `moderate`     | Ritmo moderado     | Equilíbrio ação/reflexão, progresso constante  |
| `calm`         | Calmo/Respiro      | Exploração, relacionamentos, momentos pessoais |
| `release`      | Liberação          | Resolução de tensão, consequências, reflexão   |

O sistema emite avisos automáticos:

- ⚠️ Alta tensão por mais de 3 turnos → "Considere um momento de respiro"
- ⚠️ Cenas calmas por mais de 5 turnos → "Considere introduzir conflito"

### Sistema de Foreshadowing e Callbacks

Rastreamento automático de elementos narrativos plantados:

```typescript
interface NarrativeThread {
	id: string;
	type: 'foreshadowing' | 'callback' | 'chekhov_gun';
	description: string;
	plantedTurn: number;
	status: 'planted' | 'referenced' | 'resolved';
	resolvedTurn?: number;
	importance: 'minor' | 'moderate' | 'major';
}
```

**Tipos de Threads:**

- **Foreshadowing** - Prenúncios de eventos futuros (profecias, avisos, comportamentos suspeitos)
- **Chekhov's Gun** - Objetos/habilidades introduzidos que devem ser usados depois
- **Callback** - Referências a eventos passados que criam conexão

### Análise de Qualidade Narrativa

O sistema inclui um analisador de qualidade que pontua narrativas geradas:

```typescript
interface NarrativeQualityAnalysisResponse {
	overallScore: number; // 0-100
	meetsQualityThreshold: boolean; // Threshold = 70
	summary: string;
	strengths: string[];
	issues: NarrativeIssue[];
}

interface NarrativeIssue {
	type: 'tell_not_show' | 'voice_homogenization' | 'pacing' | 'cliche' | 'genre_violation' | 'repetition';
	severity: 'low' | 'medium' | 'high';
	originalText: string;
	explanation: string;
	suggestion?: string;
}
```

**Escala de Pontuação:**

- 90-100: Prosa excelente, qualidade publicável
- 80-89: Boa qualidade, problemas menores
- 70-79: Aceitável, alguns problemas notáveis
- 60-69: Abaixo do threshold, precisa melhorar
- < 60: Problemas significativos de qualidade

---

## Engenharia de Prompts

Os prompts são o **cérebro do motor de jogo**. Eles definem como a IA se comporta e qual formato ela retorna.

### Estrutura Modular de Prompts

Os prompts estão organizados em uma estrutura modular em `services/ai/prompts/`:

```
services/ai/prompts/
├── index.ts                           # Exporta todos os prompts
├── onboarding.prompt.ts               # Criação de mundo
├── gameMaster.prompt.ts               # Loop principal do jogo
├── storyInitialization.prompt.ts      # Estado inicial
├── playerMessageProcessing.prompt.ts  # Adaptação de diálogo
├── actionOptions.prompt.ts            # Sugestões de ações
├── characterAvatar.prompt.ts          # Geração de avatares
├── heavyContext.prompt.ts             # Memória narrativa persistente
├── universeContext.prompt.ts          # Contexto profundo do universo
├── textClassification.prompt.ts       # Classificação de texto
├── customActionAnalysis.prompt.ts     # Análise de ações customizadas
├── narrativeStyles.ts                 # Sistema de estilos narrativos (v1.3.0)
├── narrativeQualityAnalysis.prompt.ts # Análise de qualidade (v1.3.0)
└── helpers.ts                         # Funções auxiliares
```

### Padrão de Arquivos de Prompt

Cada arquivo de prompt segue o mesmo padrão:

```typescript
/**
 * @fileoverview Descrição do propósito do prompt
 * @module prompts/nomeDoPrompt
 */

// Interface de parâmetros tipados
export interface NomeDoPromptParams {
  param1: TipoParam1;
  param2: TipoParam2;
}

/**
 * Constrói o prompt para [propósito].
 *
 * @param {NomeDoPromptParams} params - Parâmetros de entrada
 * @returns {string} O prompt formatado
 *
 * @example
 * const prompt = buildNomeDoPrompt({ param1, param2 });
 */
export function buildNomeDoPrompt(params: NomeDoPromptParams): string {
  // Lógica de construção do prompt
  return `...`;
}

// Schema JSON (quando aplicável)
export const nomeDoPromptSchema = { ... };
```

### Importação de Prompts

```typescript
// Importação recomendada (centralizada)
import {
	buildOnboardingPrompt,
	buildGameMasterPrompt,
	buildStoryInitializationPrompt,
	buildPlayerMessageProcessingPrompt,
	buildActionOptionsPrompt,
	buildCharacterAvatarPrompt,
	// Schemas
	onboardingSchema,
	gmResponseSchema,
	actionOptionsSchema,
} from './services/ai/prompts';

// Uso
const prompt = buildGameMasterPrompt({
	gameState,
	playerInput: 'Lanço uma bola de fogo',
	language: 'pt',
	fateResult: { type: 'good', hint: 'Crítico!' },
});
```

### Catálogo de Prompts

| Prompt                                | Arquivo                              | Uso                             | Modelo           |
| ------------------------------------- | ------------------------------------ | ------------------------------- | ---------------- |
| `buildOnboardingPrompt`               | `onboarding.prompt.ts`               | Entrevista de criação de mundo  | GPT-4.1          |
| `buildGameMasterPrompt`               | `gameMaster.prompt.ts`               | Loop principal do jogo          | GPT-4.1          |
| `buildStoryInitializationPrompt`      | `storyInitialization.prompt.ts`      | Criação do estado inicial       | GPT-4.1          |
| `buildPlayerMessageProcessingPrompt`  | `playerMessageProcessing.prompt.ts`  | Adaptação de diálogo            | GPT-4.1          |
| `buildActionOptionsPrompt`            | `actionOptions.prompt.ts`            | Sugestões de ações              | GPT-4.1          |
| `buildCharacterAvatarPrompt`          | `characterAvatar.prompt.ts`          | Geração de avatares             | gpt-image-1-mini |
| `buildHeavyContextPrompt`             | `heavyContext.prompt.ts`             | Memória narrativa persistente   | GPT-4.1          |
| `buildUniverseContextPrompt`          | `universeContext.prompt.ts`          | Contexto profundo do universo   | GPT-4.1          |
| `buildNarrativeQualityAnalysisPrompt` | `narrativeQualityAnalysis.prompt.ts` | Análise de qualidade narrativa  | GPT-4.1          |
| `generateNarrativeInstructions`       | `narrativeStyles.ts`                 | Instruções de estilo por gênero | -                |

---

### 1. buildOnboardingPrompt - Criação de Mundo

```typescript
import { buildOnboardingPrompt } from './prompts';

const prompt = buildOnboardingPrompt({
	history: [{ question: 'Qual universo?', answer: 'Star Wars' }],
	universeType: 'existing',
	language: 'pt',
});
```

**Propósito:** Entrevista interativa para construir o mundo do RPG.

**Parâmetros:** | Parâmetro | Tipo | Descrição | |-----------|------|-----------| | `history` |
`{question: string, answer: string}[]` | Histórico de perguntas e respostas | | `universeType` |
`'original' \| 'existing'` | Tipo de universo | | `language` | `Language` | Idioma alvo |

**Coleta 7 dados obrigatórios:**

1. Nome do Universo/Cenário
2. Período/Era temporal
3. Nome do personagem
4. Aparência do personagem
5. Background/História
6. Localização inicial
7. Memórias do personagem

---

### 2. buildGameMasterPrompt - Loop Principal

```typescript
import { buildGameMasterPrompt } from './prompts';

const prompt = buildGameMasterPrompt({
	gameState,
	playerInput: 'Lanço bola de fogo no goblin',
	language: 'pt',
	fateResult: { type: 'good', hint: 'Crítico!' },
});
```

**Propósito:** Define a lógica do Game Master para resolução de ações.

**Parâmetros:** | Parâmetro | Tipo | Descrição | |-----------|------|-----------| | `gameState` | `GameState` | Estado
completo do jogo | | `playerInput` | `string` | Ação do jogador | | `language` | `Language` | Idioma alvo | |
`fateResult` | `FateResult?` | Evento de destino opcional |

**Regras de Validação:**

- MAGIA: Verificar mana nos Stats, deduzir custo
- COMBATE: Verificar arma no Inventário
- CONSUMÍVEIS: Verificar e remover item se usado
- PROPRIEDADES OCULTAS: Aplicar efeitos (veneno, buffs)

---

### 3. buildStoryInitializationPrompt - Estado Inicial

```typescript
import { buildStoryInitializationPrompt } from './prompts';

const prompt = buildStoryInitializationPrompt({
	config: {
		universeName: 'Star Wars',
		universeType: 'existing',
		playerName: 'Kira',
		playerDesc: 'Jovem padawan',
		startSituation: 'Templo Jedi',
		background: 'Órfã treinada desde criança',
		memories: 'Lembra de um misterioso salvador',
	},
	language: 'pt',
});
```

**Propósito:** Cria o estado inicial do jogo.

**Parâmetros:** | Parâmetro | Tipo | Descrição | |-----------|------|-----------| | `config` | `StoryConfig` |
Configuração da história do onboarding | | `language` | `Language` | Idioma alvo |

---

### 4. buildPlayerMessageProcessingPrompt - Adaptador de Diálogo

```typescript
import { buildPlayerMessageProcessingPrompt } from './prompts';

const prompt = buildPlayerMessageProcessingPrompt({
	gameState,
	rawInput: 'oi, tudo bem?',
	language: 'pt',
});
// Transforma em: "Salve, nobre viajante! Que notícias trazes?"
```

**Propósito:** Transforma input casual em diálogo apropriado ao universo.

**Parâmetros:** | Parâmetro | Tipo | Descrição | |-----------|------|-----------| | `gameState` | `GameState` | Estado
do jogo para contexto | | `rawInput` | `string` | Texto original do jogador | | `language` | `Language` | Idioma alvo |

---

### 5. buildActionOptionsPrompt - Sugestões de Ação

```typescript
import { buildActionOptionsPrompt } from './prompts';

const prompt = buildActionOptionsPrompt({
	gameState,
	language: 'pt',
});
```

**Propósito:** Gera 5 opções de ação com probabilidades de eventos.

**Parâmetros:** | Parâmetro | Tipo | Descrição | |-----------|------|-----------| | `gameState` | `GameState` | Estado
do jogo para contexto | | `language` | `Language` | Idioma das opções |

**Formato da Resposta:**

```typescript
{
	options: [
		{
			text: string, // Texto da ação (3-8 palavras)
			goodChance: number, // 0-50% chance de evento bom
			badChance: number, // 0-50% chance de evento ruim
			goodHint: string, // Dica do que pode acontecer de bom
			badHint: string, // Dica do que pode acontecer de ruim
		},
	];
}
```

---

### 6. buildCharacterAvatarPrompt - Geração de Avatar

```typescript
import { buildCharacterAvatarPrompt } from './prompts';

const prompt = buildCharacterAvatarPrompt({
	characterName: 'Elara',
	characterDescription: 'Elfa com cabelos prateados e olhos verdes',
	universeContext: 'Fantasia Medieval',
});
```

**Propósito:** Gera avatares via gpt-image-1-mini.

**Parâmetros:** | Parâmetro | Tipo | Descrição | |-----------|------|-----------| | `characterName` | `string` | Nome do
personagem | | `characterDescription` | `string` | Descrição visual | | `universeContext` | `string` | Contexto do
universo |

---

### JSON Schemas

#### gmResponseSchema

```typescript
{
  messages: [{
    messages: [{
    type: enum["dialogue", "narration", "system"],
    voiceTone: string,
    text?: string,
    characterName?: string,      // Obrigatório quando type === 'dialogue'
    dialogue?: string,           // Obrigatório quando type === 'dialogue'
    newCharacterData?: {
      id: string,
      name: string,
      description: string,
      locationId: string,
      state: enum['idle','talking','fighting','unconscious','dead'],
      inventory?: string[],
      stats?: [{ key: string, value: number }]
    }
  }],
  stateUpdates: {
    newLocations?: Location[],
    newCharacters?: Character[],
    updatedCharacters?: {
      id: string,
      stats?: [{key: string, value: number}],
      inventory?: string[],
      relationships?: [{targetId: string, score: number}]
    }[],
    locationChange?: string,
    eventLog: string  // OBRIGATÓRIO
  }
}
```

- **Narração/Sistema:** usam apenas `text` + `voiceTone`.
- **Diálogo:** deve trazer `characterName` + `dialogue`. Se o NPC ainda não existe, inclua `newCharacterData` para que o
  cliente possa registrá-lo e gerar avatar.
- **Agência do Jogador:** nunca gere `type: "dialogue"` cujo `characterName` seja o jogador ou variações dele ("Player",
  "You", "Você", etc.). Caso um NPC aguarde resposta, descreva essa expectativa numa mensagem de narração.
- **Avatares:** sempre que `newCharacterData` aparece, o backend chama o gerador de avatar e salva o resultado antes de
  enviar ao app.

---

## Construção de Contexto

### Como o contexto é montado para cada chamada de IA

```typescript
// Em generateGameTurn()
const messages: LLMMessage[] = [
	{
		role: 'system',
		content: systemPrompt + schemaInstruction,
	},
	{
		role: 'user',
		content: `History (Context): ${JSON.stringify(gameState.messages.slice(-100))}`,
	},
	{
		role: 'user',
		content: `Player Action: "${input}"`,
	},
];
```

### Componentes do Contexto

1. **System Prompt** (~2000 tokens)

   - Regras do universo
   - Estado completo do jogador
   - NPCs na cena
   - Instruções de validação

2. **Histórico Recente** (últimas 100 mensagens)

   - Fornece continuidade narrativa
   - Evita repetições
   - Mantém coerência de diálogos

3. **Ação do Jogador**
   - Texto exato digitado/selecionado
   - Usado para resolução de mecânicas

### Geração de Opções de Ação

```typescript
// Em generateActionOptions()
const contextPrompt = `
Current Location: ${location.name} - ${location.description}
Player: ${player.name} - ${player.description}
Recent events: ${recentMessages.map((m) => m.text).join(' | ')}

Rules:
1. Generate exactly 5 distinct actions
2. Actions should be short (3-8 words)
3. Mix types: dialogue, exploration, combat, interaction
4. Write in ${languageName}
5. Make them specific to the situation
6. Include at least one cautious option
`;
```

### Heavy Context Incremental Updates

- **Main Mission:** arco principal de longo prazo (texto livre maior)
- **Current Mission:** objetivo imediato que guia o próximo turno
- **Active Problems / Current Concerns / Important Notes:** listas de até 5 itens cada

Em vez de sobrescrever todo o contexto, o LLM envia apenas as diferenças:

```json
{
	"shouldUpdate": true,
	"changes": {
		"mainMission": { "action": "set", "value": "Impedir que o império acorde o titã." },
		"currentMission": { "action": "clear" },
		"activeProblems": [
			{ "action": "remove", "value": "Tempestade acima" },
			{ "action": "add", "value": "Guardas do templo em alerta" }
		],
		"importantNotes": [{ "action": "add", "value": "A runa reage à luz da lua" }]
	}
}
```

O motor aplica cada `set/clear` para campos singulares e `add/remove` para listas, garantindo deduplicação e limite de 5
itens.

---

## Tomada de Decisões da IA

### Fluxo de Resolução de Ação

```
Jogador: "Lanço bola de fogo no goblin"
         ↓
┌─────────────────────────────────────┐
│  1. VALIDAÇÃO DE VIABILIDADE        │
│  - Jogador tem mana suficiente?     │
│  - Jogador sabe magia de fogo?      │
│  - Há um goblin na cena?            │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  2. CÁLCULO DE EFEITOS              │
│  - Custo: mana -= 20                │
│  - Dano: goblin.hp -= 25            │
│  - Chance de falha crítica?         │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  3. GERAÇÃO DE NARRATIVA            │
│  - Narrador descreve a cena         │
│  - Goblin reage (diálogo)           │
│  - Sistema informa mudanças         │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  4. ATUALIZAÇÃO DE ESTADO           │
│  - updatedCharacters com novos stats│
│  - eventLog para histórico          │
└─────────────────────────────────────┘
```

### Regras de Validação (do System Prompt)

```markdown
ITEM VALIDATION:

- Se ação requer item, verificar inventário
- Se item é consumível, remover após uso
- Se item tem propriedade oculta (veneno), aplicar efeito

MAGIC VALIDATION:

- Verificar se personagem tem mana suficiente
- Deduzir custo do stat de mana
- Falha se mana insuficiente

COMBAT VALIDATION:

- Verificar se alvo está na mesma localização
- Verificar estado do alvo (não pode atacar morto)
- Aplicar modificadores de arma/armadura

SOCIAL VALIDATION:

- Verificar relacionamento para persuasão
- NPCs hostis rejeitam pedidos
- Roubo requer check de habilidade
```

---

## Gerenciamento de Estado

### Hook Principal: useGameEngine

```typescript
export const useGameEngine = (): UseGameEngineReturn => {
	// Estados principais
	const [apiKey, setApiKey] = useState<string>('');
	const [stories, setStories] = useState<GameState[]>([]);
	const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);

	// Ações expostas para a UI
	return {
		handleSendMessage, // Loop principal do jogo
		handleCreateStory, // Criar nova história
		handleDeleteStory, // Deletar história
		handleSaveApiKey, // Salvar chave API
		// ... outros
	};
};
```

### Padrão de Atualização Segura

```typescript
const safeUpdateStory = (updater: (s: GameState) => GameState) => {
	setStories((prevStories) => {
		const index = prevStories.findIndex((s) => s.id === currentStoryId);
		if (index === -1) return prevStories;

		const oldStory = prevStories[index];
		const newStory = updater(oldStory);

		// Persistência automática (fire-and-forget)
		dbService.saveGame(newStory).catch(console.error);

		return [...prevStories.slice(0, index), newStory, ...prevStories.slice(index + 1)];
	});
};
```

### Saneamento de Mensagens (v1.3.1)

- Toda vez que um jogo é salvo ou carregado, a função `sanitizeMessages` remove duplicatas geradas por race conditions
  ou replays do IndexedDB.
- A deduplicação considera o `id` e também combinações `senderId + type + text` dentro de uma janela de 2 segundos,
  garantindo que diálogos idênticos disparados apenas uma vez não apareçam repetidos ao reabrir a campanha.
- O `dbService.loadGame` regrava automaticamente o snapshot limpo, evitando que o histórico volte a se corromper em
  sessões futuras.

### Transformação de Resposta da IA

```typescript
const transformRawResponse = (raw: any): GMResponse => {
	// Arrays de stats → Objetos
	// [{key: "hp", value: 100}] → {hp: 100}

	// Arrays de relationships → Objetos
	// [{targetId: "npc1", score: 75}] → {npc1: 75}

	return normalized;
};
```

---

## Banco de Dados

### Design: Normalização Relacional em IndexedDB

O app usa **padrão Data Mapper**: GameState é uma árvore que é **decomposta em tabelas relacionais** ao salvar e
**reidratada ao carregar**.

### Object Stores

```typescript
const STORES = {
	GAMES: 'games', // Metadados do jogo
	CHARACTERS: 'characters', // Entidades com FK para gameId
	LOCATIONS: 'locations', // Localizações com FK
	MESSAGES: 'messages', // Histórico de chat
	EVENTS: 'events', // Log de eventos
};
```

### Operações Principais

#### Salvar Jogo

```typescript
async saveGame(gameState: GameState) {
  // 1. Abre transação atômica
  // 2. Decompõe GameState:
  //    - Metadados → GAMES
  //    - Characters map → CHARACTERS (com gameId)
  //    - Locations map → LOCATIONS (com gameId)
  //    - Messages array → MESSAGES (com gameId)
  //    - Events array → EVENTS (com gameId)
  // 3. Commit atômico
}
```

#### Carregar Jogo

```typescript
async loadGame(id: string): Promise<GameState> {
  // 1. Busca metadados
  // 2. Query por índice by_game_id em cada store
  // 3. Reconstrói árvore:
  //    - Characters → Record<id, Character>
  //    - Locations → Record<id, Location>
  //    - Messages ordenados por timestamp
  // 4. Retorna GameState hidratado
}
```

### Exportação, Importação e Versionamento

- `dbService.exportGame(id)` embala o GameState completo + `version` + timestamp → usado pelo botão **Export Journey**.
- `validateImport()` bloqueia arquivos com versão futura ou collections ausentes antes de tocar em IndexedDB.
- `importGame()` gera novo `gameId`, duplica playerId e reescreve `senderId` das mensagens para evitar colisões.
- A UI (`App.tsx`) valida e mostra toasts de sucesso/erro, além de selecionar automaticamente o save importado.

---

## Fluxo do Jogo

### Inicialização do App

```
1. Carregar API key do localStorage
2. Carregar jogos do IndexedDB (apenas metadados)
3. Detectar idioma do navegador
4. Se não há API key → mostrar modal
```

### Criação de História

```
1. Usuário clica "Nova História"
2. Wizard pergunta: Universo Original ou Existente?
3. Loop de onboarding:
   - IA faz pergunta
   - Usuário responde (texto ou select)
   - IA processa e faz próxima pergunta
4. Quando isComplete=true:
   - Chamar initializeStory()
   - Criar GameState com fallbacks
   - Salvar no IndexedDB
   - Navegar para o jogo
```

### Loop Principal do Jogo

```
1. Exibir opções de ação (5 sugestões + "Outro")
2. Jogador escolhe ação ou digita customizada
3. handleSendMessage():
   a. UI otimista: adiciona mensagem do jogador
   b. Monta contexto para IA
   c. Chama generateGameTurn()
   d. Processa resposta:
      - Adiciona novas localizações
      - Cria novos NPCs (gera avatares)
      - Atualiza personagens existentes
      - Muda localização se necessário
      - Adiciona mensagens da IA ao chat
   e. Salva estado no IndexedDB
4. Gerar novas opções de ação
5. Repetir
```

---

## Componentes de UI

### ActionInput

- Gera 5 opções de ação baseadas no contexto
- Botões em grid responsivo (1/2/3 colunas)
- Opção "Outro..." para ação customizada
- Integração com VoiceInput
- Respeita a paleta dinâmica do Theme Colors com contraste mínimo WCAG AA em botões, toggle mobile e textarea (sem
  fundos brancos fixos)

### Player Status Modal

- Exibe estatísticas e inventário do personagem ativo
- Inventário entende tanto Item[] estruturado quanto o legado string[] e mostra quantidade, categoria e descrição quando
  disponível

### ChatBubble

- Efeito typewriter para novas mensagens
- Botão de play para TTS
- Avatares gerados por IA
- Estilos diferentes para Narrador/Jogador/NPC/Sistema

### StoryCreator

- Wizard dinâmico com perguntas da IA
- Suporta text input e select dropdown
- Chat-like interface com histórico

### ErrorModal

- Trata erros de API específicos
- Links diretos para billing da OpenAI
- Mensagens amigáveis por tipo de erro

### VoiceInput

- Captura áudio (MediaRecorder) e envia blob direto para Whisper
- Avisa quando não há API key ou permissão de microfone
- Suporte a idiomas configurados (hint para Whisper)

### VoiceSettings

- Lista as vozes suportadas pelo gpt-4o-mini-tts com descrição
- Permite preview em tempo real e persistência da escolha no localStorage
- Usa generateSpeechWithTTS + playMP3Audio para testes rápidos

### LogViewer

- Hook `useConsoleLogs` intercepta `console.log/warn/error`
- Viewer retro com auto-scroll e botão de wipe
- Permite copiar mensagens estruturadas (JSON stringificado)

### FateToast

- Feedback visual para FateResult bom/ruim mostrado sobre o grid de ações
- Fecha automaticamente em 4s ou manualmente
- Ajuda o jogador a relacionar rolagem probabilística com a narrativa seguinte

---

## Voz e Acessibilidade

1. **Entrada de Voz (STT)**

   - `VoiceInput` captura áudio WebM, o envia para `transcribeAudio()` que usa Whisper (`openaiClient.transcribeAudio`).
   - Requer permissão de microfone no metadata (`metadata.json`) e valida presença da API key.
   - O idioma ativo (en/pt/es/fr/ru/zh) é enviado como hint para o Whisper, garantindo que o microfone entenda qualquer
     idioma suportado.

2. **Saída de Voz (TTS)**

   - Cada `ChatMessage` recebe `voiceTone` no GM response.
   - `ChatBubble` e `StoryCard` chamam `generateSpeech(..., language)` que injeta instruções de idioma antes de delegar
     para `generateSpeechWithTTS` (gpt-4o-mini-tts) → `playMP3Audio`, respeitando voz e idioma.

3. **Configuração pelo usuário**
   - `VoiceSettings` expõe preview das 11 vozes suportadas, escreve a preferência em `localStorage` e reutiliza no hook
     principal.

---

## Internacionalização

### Idiomas Suportados

- English (en)
- Português do Brasil (pt)
- Español (es)
- Français (fr)
- Русский (ru)
- 中文 (zh)

### Implementação

```typescript
// i18n/locales.ts
export const supportedLanguages: Language[] = ['en', 'pt', 'es', 'fr', 'ru', 'zh'];

export const translations: Record<Language, Translations> = {
  en: { newStory: 'New Story', ... },
  pt: { newStory: 'Nova História', ... },
  es: { newStory: 'Nueva Historia', ... },
  fr: { newStory: 'Nouvelle Histoire', ... },
  ru: { newStory: 'Новая История', ... },
  zh: { newStory: '新的冒险', ... }
};

// Uso
const t = translations[language];
<button>{t.newStory}</button>
```

- `languageInfo` alimenta o seletor/flags e reaproveita os mesmos códigos ISO para STT/TTS.
- `VoiceInput`, `generateSpeech` e o motor narrativo consomem o mesmo tipo `Language`, mantendo UI, microfone e áudio
  sempre alinhados.

### Detecção de Idioma

1. Cookie `infinitum_lang` (persistido por 1 ano)
2. `navigator.language` do navegador
3. Fallback para 'en'

---

## Tratamento de Erros

### Classificação de Erros

```typescript
type ErrorType =
	| 'insufficient_quota' // Conta sem créditos
	| 'invalid_key' // API key inválida
	| 'rate_limit' // Muitas requisições
	| 'network' // Problemas de conexão
	| 'generic'; // Outros erros
```

### Estratégias de Recuperação

| Tipo                 | Ação                            |
| -------------------- | ------------------------------- |
| `insufficient_quota` | Modal com link para billing     |
| `invalid_key`        | Modal para re-inserir key       |
| `rate_limit`         | Mensagem in-game, permite retry |
| `network`            | Mensagem in-game, permite retry |
| `generic`            | Mensagem genérica de erro       |

---

## Stack Tecnológico

| Camada         | Tecnologia                |
| -------------- | ------------------------- |
| Frontend       | React 19, TypeScript      |
| Estilização    | Tailwind CSS              |
| Ícones         | Lucide React              |
| Build          | Vite 6                    |
| IA - LLM       | OpenAI GPT-4.1            |
| IA - Imagem    | gpt-image-1-mini          |
| IA - Voz       | Whisper + gpt-4o-mini-tts |
| Banco de Dados | IndexedDB + localStorage  |
| Testes         | Jest 29 + Testing Library |

### Scripts npm

- `npm run dev` → servidor Vite com HMR.
- `npm run build` → build de produção + type checking via Vite.
- `npm run preview` → serve o build para QA.
- `npm test` / `npm run test:watch` / `npm run test:coverage` → suíte Jest configurada com jsdom e ts-jest.

### Testes Automatizados

- Cobrem hooks (ex.: `useGameEngine`, `useMessageQueue`), serviços (OpenAI, DB), i18n e componentes críticos.
- Use `fake-indexeddb` para simular IndexedDB dentro do Jest.
- Coverage report é emitido em `coverage/` e garante que regressões em prompts/serializadores sejam detectadas.

---

## Instalação e Uso

### Pré-requisitos

- Node.js 18+
- Chave de API da OpenAI

### Instalação

```bash
# Clone o repositório
git clone <repo-url>
cd infinity_stories

# Instale dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

### Build de Produção

```bash
npm run build
npm run preview
```

### Configuração

1. Acesse a aplicação no navegador (Vite levanta em `http://localhost:5173`).
2. Insira sua chave OpenAI (é salva apenas em `localStorage@infinitum_api_key` e pode ser removida via botão **End
   Session**).
3. Garanta permissão de microfone caso queira usar VoiceInput.
4. Inicie uma nova história pelo wizard ou importe um save `.json` compatível.

---

## Guia de Contribuição

### Versionamento

> **IMPORTANTE:** Ao fazer qualquer alteração no código, **SEMPRE atualize a versão** no `package.json`.

```json
{
	"version": "X.Y.Z"
}
```

Seguimos [Semantic Versioning](https://semver.org/):

- **MAJOR (X):** Mudanças incompatíveis na API
- **MINOR (Y):** Novas funcionalidades compatíveis
- **PATCH (Z):** Correções de bugs

### Exemplos de Versionamento

| Alteração                     | Versão Anterior | Nova Versão |
| ----------------------------- | --------------- | ----------- |
| Correção de bug no typewriter | 1.0.0           | 1.0.1       |
| Nova feature de export        | 1.0.1           | 1.1.0       |
| Refatoração total da IA       | 1.1.0           | 2.0.0       |

### Checklist de Contribuição

- [ ] Código segue os padrões existentes
- [ ] **Versão atualizada no `package.json`**
- [ ] Testes manuais realizados
- [ ] Apenas finalize a task após o hook `pre-push` (Husky) encerrar e o `npm run test` passar
- [ ] README atualizado se necessário
- [ ] Commit message descritiva

### Estrutura de Commits

```
tipo(escopo): descrição breve

Corpo opcional com mais detalhes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Padrões de Código

#### Views vs Logic

- **Views** devem ser "burras" - apenas renderizam o que recebem
- **Logic** (Hooks/Services) cuida do _como_ e _quando_

#### Abstração de IA

Não instancie `new OpenAI()` diretamente em serviços ou componentes. Todas as chamadas de IA devem passar por
`utils/ai.ts`.

#### Documentação

Todas as funções exportadas devem ter documentação TSDoc:

```typescript
/**
 * Descrição do que a função faz.
 * @param paramName - Descrição do parâmetro.
 * @returns Descrição do retorno.
 */
```

---

## Licença

Este projeto é privado e de uso restrito.

---

**Desenvolvido com IA** | storywell.games v1.4.0
