# storywell.games

**Versão:** 1.4.2

Um motor de RPG de texto alimentado por IA que cria experiências narrativas dinâmicas e imersivas. O jogo utiliza
GPT-4.1 da OpenAI para gerar histórias, gerenciar estados de personagens e responder às ações do jogador em tempo real.

> **Novidade v1.4.0:** Sistema completo de Qualidade Narrativa com 15 gêneros literários, técnicas de "mostrar, não
> contar", diferenciação de vozes de NPCs, geração de backgrounds de localização e controle de ritmo narrativo.
>
> **Novidade v1.4.7 (commit 79cc5d6):** Sistema de mapa em grade 10x10 com snapshots históricos, prompt dedicado de
> atualização espacial e UI flip no StoryCard para visualizar posicionamento tático sem sair da narrativa.

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Projeto](#arquitetura-do-projeto)
3. [Sistema de Tipos](#sistema-de-tipos)
4. [Principais Técnicas do Código](#principais-técnicas-do-código)
5. [Sistema de Qualidade Narrativa](#sistema-de-qualidade-narrativa)
6. [Sistema de Requisições à IA](#sistema-de-requisições-à-ia)
7. [Gerenciamento de Estado](#gerenciamento-de-estado)
8. [Banco de Dados IndexedDB](#banco-de-dados-indexeddb)
9. [Sistema de Economia](#sistema-de-economia)
10. [Engenharia de Prompts](#engenharia-de-prompts)
11. [Fluxo do Jogo](#fluxo-do-jogo)
12. [Sistema de Mapa em Grade](#sistema-de-mapa-em-grade)
13. [Componentes de UI](#componentes-de-ui)
14. [Internacionalização](#internacionalização)
15. [Tratamento de Erros](#tratamento-de-erros)
16. [Stack Tecnológico](#stack-tecnológico)
17. [Instalação e Uso](#instalação-e-uso)
18. [Guia de Contribuição](#guia-de-contribuição)

---

## Visão Geral

storywell.games é um motor de RPG baseado em navegador que usa inteligência artificial para:

- **Gerar mundos dinâmicos** - Crie universos originais ou jogue em universos conhecidos (filmes, livros, jogos)
- **Gerenciar personagens** - NPCs com personalidades, inventários, estatísticas e relacionamentos
- **Resolver ações** - Validação de magia, combate, consumíveis e interações
- **Criar narrativas** - Diálogos e narrações contextualmente apropriados com 15 gêneros narrativos
- **Gerar avatares** - Retratos de personagens via gpt-image-1-mini
- **Gerar backgrounds** - Cenários imersivos de localização via gpt-image-1-mini
- **Mapa tático 10x10** - Grid com snapshots por mensagem, legendas dinâmicas e integração direta com o StoryCard
- **Text-to-Speech** - Narração por voz com tom emocional via gpt-4o-mini-tts
- **Speech-to-Text** - Comandos por voz via Whisper
- **Sistema de Destino (Fate)** - Cada sugestão de ação inclui probabilidades de eventos positivos/negativos
- **Sistema de Itens e Currency** - Itens estruturados com categorias, preços e efeitos; economia com gold
- **Transporte de Campanhas** - Exportação/importação versionada de saves (JSON) + validação local

### Recursos Principais

| Área                       | Destaques                                                                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Experiência do jogador** | Wizard de onboarding assistido por IA, sugestões de ação com rolagem de destino, modo "Outro" para input livre, chat com efeito typewriter e botões de TTS |
| **IA Generativa**          | GPT-4.1 para narrativa, gpt-image-1-mini para imagens, Whisper para STT, gpt-4o-mini-tts para voz e prompts com schema JSON obrigatório                    |
| **Persistência**           | IndexedDB normalizado, auto-save por turno, heavy context incremental e exportação/importação versionada                                                   |
| **Internacionalização**    | EN/PT/ES/FR/RU/ZH com detecção automática + cookie, UI retro-futurista e suporte de voz sincronizado                                                       |
| **Ferramentas para devs**  | Testes Jest/RTL cobrindo hooks/serviços/componentes e estrutura modular com separation of concerns                                                         |

---

## Arquitetura do Projeto

```
/components               # Camada de apresentação (React)
  /ActionInput            # Input com sugestões, rolagem de destino e modo "Outro"
    ActionInput.tsx       # Componente principal (300+ linhas)
  /ChatBubble             # Balões com typewriter e avatares
  /StoryCard              # Cards de história com navegação + flip para mapa
  /GridMap                # Visualização 3D do grid 10x10 com legendas e fundo
  /ErrorModal             # Modal de erros categorizados
  /FateToast              # Toast para feedback do FateResult
  /StoryCreator.tsx       # Wizard colaborativo de mundo/personagem
  /VoiceInput.tsx         # Captura áudio e envia para Whisper
  /VoiceSettings          # Seleção/preview das vozes TTS
  /LandingPage.tsx        # Página inicial com API key e seleção de idioma

/hooks                    # Regras de negócio e estado
  useGameEngine.ts        # Hook principal - orquestra API, DB, prompts e UI (800+ linhas)
  useCardNavigation.ts    # Navegação de cards com teclado e swipe (200+ linhas)
  useMessageQueue.ts      # Timeline ordenada e anti-duplicação
  useThemeColors.tsx      # Contexto de cores do tema
  useWakeLock.ts          # Previne sleep do dispositivo

/services                 # Integrações externas e data layer
  /ai
    openaiClient.ts       # Cliente OpenAI - loop GM, avatars, TTS, STT (1500+ linhas)
    systemPrompts.ts      # Catálogo legado de prompts
    /prompts              # Sistema modular de prompts
      index.ts            # Exporta todos os prompts e schemas
      gameMaster.prompt.ts           # Loop principal do jogo
      storyInitialization.prompt.ts  # Criação do estado inicial
      onboarding.prompt.ts           # Wizard de criação de mundo
      actionOptions.prompt.ts        # Sugestões de ação
      heavyContext.prompt.ts         # Memória narrativa persistente
      universeContext.prompt.ts      # Contexto profundo do universo
      characterAvatar.prompt.ts      # Geração de avatares
      locationBackground.prompt.ts   # Geração de backgrounds
      narrativeStyles.ts             # 15 gêneros narrativos
      helpers.ts                     # Funções auxiliares
  db.ts                   # Data mapper IndexedDB + export/import versionado (380+ linhas)

/utils                    # Utilitários compartilhados
  ai.ts                   # Wrapper OpenAI (LLM, TTS, Whisper, Images)
  helpers.ts              # Limpeza de JSON, blob helpers
  errorHandler.ts         # Classificação de erros OpenAI
  inventory.ts            # Operações de inventário, type guards, migração (670+ linhas)
  migration.ts            # Migração de saves legados
  messages.ts             # Sanitização de mensagens

/constants                # Constantes do jogo
  economy.ts              # Regras econômicas, preços, gold inicial (350+ linhas)

/i18n                     # Internacionalização
  locales.ts              # Traduções + cookies + detecção de idioma

/contexts                 # React Contexts
  LoadingContext.tsx      # Estado global de loading

/__tests__                # Testes Jest + Testing Library
/types.ts                 # Tipos globais (GameState, GMResponse, etc)
/App.tsx                  # Componente raiz / composição de views (1000+ linhas)
```

### Separação de Responsabilidades

| Camada                     | Responsabilidade                      | Arquivos-Chave                             |
| -------------------------- | ------------------------------------- | ------------------------------------------ |
| **Views** (`components/`)  | Renderização pura, recebem props      | `StoryCard.view.tsx`, `ActionInput.tsx`    |
| **Logic** (`hooks/`)       | Gerenciamento de estado, orquestração | `useGameEngine.ts`, `useCardNavigation.ts` |
| **Services** (`services/`) | APIs externas (OpenAI, IndexedDB)     | `openaiClient.ts`, `db.ts`                 |
| **Utils** (`utils/`)       | Funções auxiliares reutilizáveis      | `inventory.ts`, `errorHandler.ts`          |

---

## Sistema de Tipos

### GameState - Estado Principal do Jogo

**Arquivo:** `types.ts:175-202`

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

	// Heavy Context - Contexto narrativo persistente
	heavyContext?: HeavyContext;

	// Universe Context - Contexto profundo gerado na criação
	universeContext?: string;

	// Theme Colors - Paleta de cores baseada no universo
	themeColors?: ThemeColors;

	// Grid Map snapshots sincronizados com pageNumber
	gridSnapshots?: GridSnapshot[];
}
```

### GridSnapshot & Tipos do Mapa

**Arquivo:** `types.ts:457-521`

```typescript
export interface GridPosition {
	x: number;
	y: number;
}

export interface GridCharacterPosition {
	characterId: string;
	characterName: string;
	position: GridPosition;
	isPlayer: boolean;
	avatarBase64?: string;
}

export interface GridSnapshot {
	id: string;
	gameId: string;
	atMessageNumber: number;
	timestamp: number;
	locationId: string;
	locationName: string;
	characterPositions: GridCharacterPosition[];
}

export interface GridUpdateResponse {
	shouldUpdate: boolean;
	characterPositions?: { characterId: string; characterName: string; x: number; y: number; isPlayer: boolean }[];
	reasoning?: string;
}
```

- `GameState.gridSnapshots` guarda uma linha do tempo espacial sincronizada com `pageNumber`, permitindo reconstruir o
  mapa para qualquer carta.
- `GridUpdateResponse` é o contrato consumido por `openaiClient.updateGridPositions`/`gridUpdate.prompt.ts`, garantindo
  que só updates necessários sejam persistidos.
- `updateGridPositions` sempre mantém player + NPCs no snapshot: reutiliza coordenadas anteriores para quem não se moveu
  e gera posições de fallback próximas ao jogador para NPCs novos.

### Character - Modelo de Entidade

**Arquivo:** `types.ts:92-106`

```typescript
interface Character {
	id: string;
	gameId?: string; // Foreign Key para IndexedDB
	name: string;
	description: string;
	isPlayer: boolean;
	locationId: string;
	stats: CharacterStats; // hp, maxHp, gold obrigatórios
	inventory: Item[]; // Lista estruturada de itens
	relationships: Record<string, number>; // CharacterID -> 0-100 (Afinidade)
	state: 'idle' | 'talking' | 'fighting' | 'unconscious' | 'dead';
	avatarColor?: string; // Hex code fallback
	avatarBase64?: string; // Imagem gerada (IndexedDB)
}
```

### Item - Sistema de Itens

**Arquivo:** `types.ts:43-73`

```typescript
type ItemCategory =
	| 'weapon' // Espadas, arcos, armas
	| 'armor' // Escudos, armaduras
	| 'consumable' // Poções, comida, pergaminhos
	| 'material' // Materiais de crafting
	| 'quest' // Itens de missão (não vendíveis)
	| 'valuable' // Gemas, joias, tesouros
	| 'currency' // Moedas
	| 'misc'; // Outros

interface Item {
	name: string;
	description?: string;
	quantity: number;
	category: ItemCategory;
	baseValue?: number; // Valor em gold
	stackable: boolean;
	consumable: boolean;
	effects?: ItemEffect[]; // Efeitos quando usado
	canSell?: boolean;
	canDrop?: boolean;
}
```

### GMResponse - Formato de Saída da IA

**Arquivo:** `types.ts:251-261`

```typescript
interface GMResponse {
	messages: GMResponseMessage[];
	stateUpdates: {
		newLocations?: Location[];
		newCharacters?: Character[];
		updatedCharacters?: Partial<Character>[];
		locationChange?: string; // Novo ID de localização
		eventLog?: string; // Resumo do turno
	};
}
```

### HeavyContext - Contexto Narrativo Persistente

**Arquivo:** `types.ts:288-295`

```typescript
interface HeavyContext {
	mainMission?: string; // Missão de longo prazo
	currentMission?: string; // Objetivo imediato
	activeProblems?: string[]; // Problemas/conflitos ativos
	currentConcerns?: string[]; // Preocupações/medos
	importantNotes?: string[]; // Elementos importantes da história
	lastUpdated?: number;
}
```

---

## Principais Técnicas do Código

Esta seção detalha as técnicas mais importantes implementadas no código, com referências específicas aos arquivos e
funções.

### 1. Fuzzy Matching para Busca de Personagens

**Arquivo:** `hooks/useGameEngine.ts:115-154`

O sistema usa uma estratégia de 4 níveis para encontrar personagens por nome, tolerando erros de digitação e acentos:

```typescript
const findCharacterByName = (characters: Record<string, Character>, charName: string): Character | undefined => {
	const normalizedSearch = normalizeSpeakerName(charName);
	const charArray = Object.values(characters);

	// 1. Exact match (case insensitive)
	let found = charArray.find((c) => c.name.toLowerCase() === charName.toLowerCase());
	if (found) return found;

	// 2. Normalized match (ignoring accents/special chars)
	found = charArray.find((c) => normalizeSpeakerName(c.name) === normalizedSearch);
	if (found) return found;

	// 3. Partial match - search name contains character name or vice versa
	found = charArray.find((c) => {
		const normalizedCharName = normalizeSpeakerName(c.name);
		return normalizedCharName.includes(normalizedSearch) || normalizedSearch.includes(normalizedCharName);
	});
	if (found) return found;

	// 4. Word-based match - any significant word matches
	const searchWords = normalizedSearch.split(/\s+/).filter((w) => w.length > 2);
	if (searchWords.length > 0) {
		found = charArray.find((c) => {
			const charWords = normalizeSpeakerName(c.name)
				.split(/\s+/)
				.filter((w) => w.length > 2);
			return searchWords.some((sw) => charWords.some((cw) => cw === sw || cw.includes(sw)));
		});
	}

	return found;
};
```

**Funções auxiliares:** `stripDiacritics()` e `normalizeSpeakerName()` em `useGameEngine.ts:95-106`

### 2. Padrão Data Mapper para IndexedDB

**Arquivo:** `services/db.ts:31-381`

O banco usa normalização relacional: o `GameState` é decomposto em 5 tabelas e reconstruído ao carregar.

```typescript
// Decomposição ao salvar (db.ts:79-115)
saveGame: async (gameState: GameState): Promise<void> => {
	const db = await dbService.open();
	const tx = db.transaction(
		[STORES.GAMES, STORES.CHARACTERS, STORES.LOCATIONS, STORES.MESSAGES, STORES.EVENTS],
		'readwrite',
	);

	const gameId = gameState.id;
	const { characters, locations, events, ...metaData } = gameState;

	// Metadados vão para GAMES
	tx.objectStore(STORES.GAMES).put(metaData);

	// Personagens normalizados com gameId
	Object.values(characters).forEach((char) => {
		tx.objectStore(STORES.CHARACTERS).put({ ...char, gameId });
	});

	// Localizações, mensagens e eventos também normalizados
	// ...
};

// Reconstrução ao carregar (db.ts:123-187)
loadGame: async (id: string): Promise<GameState | undefined> => {
	// Query paralela em todas as tabelas
	const [charsArr, locsArr, msgsArr, evtsArr] = await Promise.all([
		getAllByIndex(STORES.CHARACTERS, 'by_game_id', id),
		getAllByIndex(STORES.LOCATIONS, 'by_game_id', id),
		getAllByIndex(STORES.MESSAGES, 'by_game_id', id),
		getAllByIndex(STORES.EVENTS, 'by_game_id', id),
	]);

	// Reconstrói a árvore hidratada
	const characters: Record<string, Character> = {};
	charsArr.forEach((c: Character) => (characters[c.id] = c));
	// ...
};
```

### 3. Type Guards para Sistema de Inventário

**Arquivo:** `utils/inventory.ts:27-57`

Type guards garantem segurança de tipos em runtime e suportam migração automática:

```typescript
// Verifica se é um Item válido
export function isItem(item: unknown): item is Item {
	if (typeof item !== 'object' || item === null) return false;
	const obj = item as Record<string, unknown>;
	return typeof obj.id === 'string' && typeof obj.name === 'string' && typeof obj.category === 'string';
}

// Verifica se é inventário legado (string[])
export function isLegacyInventory(inventory: unknown): inventory is string[] {
	if (!Array.isArray(inventory)) return false;
	if (inventory.length === 0) return false;
	return typeof inventory[0] === 'string';
}

// Verifica se é inventário moderno (Item[])
export function isItemInventory(inventory: unknown): inventory is Item[] {
	if (!Array.isArray(inventory)) return false;
	if (inventory.length === 0) return true; // Empty array é válido
	return isItem(inventory[0]);
}
```

### 4. Detecção de Categoria Bilíngue

**Arquivo:** `utils/inventory.ts:67-205`

O sistema detecta categorias de itens usando keywords em múltiplos idiomas:

```typescript
const CATEGORY_KEYWORDS: Record<ItemCategory, string[]> = {
	consumable: [
		// English
		'potion',
		'elixir',
		'food',
		'drink',
		'herb',
		'medicine',
		// Portuguese
		'poção',
		'pocao',
		'elixir',
		'comida',
		'bebida',
		'erva',
		// Spanish
		'poción',
		'comida',
		'bebida',
		'hierba',
		'medicina',
	],
	weapon: [
		'sword',
		'axe',
		'bow',
		'dagger', // English
		'espada',
		'machado',
		'arco',
		'adaga', // Portuguese
		'espada',
		'hacha',
		'arco',
		'daga', // Spanish
	],
	// ... outras categorias
};

export function detectItemCategory(name: string): ItemCategory {
	const lower = name.toLowerCase();
	for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
		for (const keyword of keywords) {
			if (lower.includes(keyword)) {
				return category as ItemCategory;
			}
		}
	}
	return 'misc';
}
```

### 5. Transformação de Resposta da IA

**Arquivo:** `services/ai/openaiClient.ts:150-232`

A função `transformRawResponse` normaliza a resposta JSON da IA para o formato tipado:

```typescript
const transformRawResponse = (raw: any): GMResponse => {
	// Initialize stateUpdates if not present
	if (!raw.stateUpdates) raw.stateUpdates = {};
	if (!raw.stateUpdates.newCharacters) raw.stateUpdates.newCharacters = [];

	// Track character IDs to avoid duplicates
	const existingNewCharacterIds = new Set(raw.stateUpdates.newCharacters.map((c: any) => c.id));

	// Process messages and extract new characters from dialogue
	if (raw.messages && Array.isArray(raw.messages)) {
		raw.messages = raw.messages.map((msg: any): GMResponseMessage => {
			// Handle old format (senderName/text) - convert to new format
			if (msg.senderName !== undefined && msg.characterName === undefined) {
				if (msg.type === 'dialogue') {
					return {
						type: 'dialogue',
						characterName: msg.senderName,
						dialogue: msg.text,
						voiceTone: msg.voiceTone || 'neutral',
					};
				}
				// ... handle other types
			}

			// Extract newCharacterData from dialogue messages
			if (msg.type === 'dialogue' && msg.newCharacterData) {
				const charData = msg.newCharacterData;
				if (charData.id && !existingNewCharacterIds.has(charData.id)) {
					raw.stateUpdates.newCharacters.push(transformNewCharacterData(charData));
					existingNewCharacterIds.add(charData.id);
				}
			}

			return msg;
		});
	}

	// Transform stats arrays to objects: [{key: "hp", value: 100}] → {hp: 100}
	// Transform relationships arrays to objects
	// Normalize inventory to Item[] format
	// ...

	return raw as GMResponse;
};
```

### 6. Sistema de Navegação com Swipe

**Arquivo:** `hooks/useCardNavigation.ts:1-200`

Hook que gerencia navegação por teclado, touch e mouse:

```typescript
const SWIPE_THRESHOLD = 50;        // Distância mínima para trigger
const SWIPE_VELOCITY_THRESHOLD = 0.3;

export const useCardNavigation = ({
  totalCards,
  enabled = true,
  onIndexChange,
}: UseCardNavigationProps): UseCardNavigationReturn => {
  const [currentIndex, setCurrentIndexState] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Keyboard navigation (Arrow keys, Home, End)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enabled) return;
      switch (e.key) {
        case 'ArrowLeft': goToPrevious(); break;
        case 'ArrowRight': goToNext(); break;
        case 'Home': goToFirst(); break;
        case 'End': goToLast(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, goToNext, goToPrevious]);

  // Touch handlers with velocity detection
  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current) return;
    const deltaX = /* calculate delta */;
    const velocity = deltaX / elapsed;

    if (Math.abs(deltaX) > SWIPE_THRESHOLD ||
        Math.abs(velocity) > SWIPE_VELOCITY_THRESHOLD) {
      if (deltaX > 0) goToPrevious();
      else goToNext();
    }
  }, [goToNext, goToPrevious]);

  return { currentIndex, touchHandlers, swipeDirection, swipeProgress, /* ... */ };
};
```

### 7. Classificação de Erros OpenAI

**Arquivo:** `utils/errorHandler.ts:19-77`

Sistema robusto de classificação de erros:

```typescript
export const parseOpenAIError = (error: any): { errorType: ErrorType; message?: string } => {
	// Handle OpenAI SDK errors
	if (error?.error?.code || error?.error?.type) {
		const code = error.error.code || error.error.type;
		switch (code) {
			case 'insufficient_quota':
				return { errorType: 'insufficient_quota', message };
			case 'invalid_api_key':
				return { errorType: 'invalid_key', message };
			case 'rate_limit_exceeded':
				return { errorType: 'rate_limit', message };
			default:
				return { errorType: 'generic', message };
		}
	}

	// Handle HTTP status codes
	if (error?.status) {
		switch (error.status) {
			case 401:
				return { errorType: 'invalid_key' };
			case 429:
				if (error.message?.includes('quota')) return { errorType: 'insufficient_quota' };
				return { errorType: 'rate_limit' };
			case 500:
			case 502:
			case 503:
				return { errorType: 'network' };
		}
	}

	// Handle string patterns
	const errorMessage = error?.message || String(error);
	if (errorMessage.includes('insufficient_quota')) return { errorType: 'insufficient_quota' };
	if (errorMessage.includes('invalid') && errorMessage.includes('key')) return { errorType: 'invalid_key' };
	// ...

	return { errorType: 'generic', message: errorMessage };
};
```

### 8. Configuração de Modelos por Tarefa

**Arquivo:** `services/ai/openaiClient.ts:52-81`

Estratégia de seleção de modelos otimizada para custo vs qualidade:

```typescript
const MODEL_CONFIG = {
	// Tarefas complexas - mantém gpt-4.1 ($2.00/1M input, $8.00/1M output)
	gameMaster: 'gpt-4.1', // Loop principal: narrativa, NPCs, mecânicas
	storyInitialization: 'gpt-4.1', // Criação inicial do mundo
	universeContext: 'gpt-4.1', // Geração de contexto narrativo

	// Tarefas médias - gpt-4.1-mini (80% economia)
	onboarding: 'gpt-4.1-mini', // Entrevista de criação
	heavyContext: 'gpt-4.1-mini', // Análise de contexto
	playerMessageProcessing: 'gpt-4.1-mini',
	customActionAnalysis: 'gpt-4.1-mini',
	actionOptions: 'gpt-4.1-mini', // 5 sugestões de ação
	themeColors: 'gpt-4.1-mini',

	// Tarefas simples - gpt-4.1-nano (95% economia)
	textClassification: 'gpt-4.1-nano',
} as const;
```

### 9. Presets de Geração de Imagem

**Arquivo:** `utils/ai.ts:44-57`

```typescript
const IMAGE_SIZE_PRESETS = {
	characterAvatar: {
		imageSize: '1024x1024',
		quality: 'medium',
		targetDimensions: { width: 124, height: 124 },
		description: 'Character avatars scaled down to 124px squares.',
	},
	locationBackground: {
		imageSize: '1536x1024',
		quality: 'medium',
		targetDimensions: { width: 768, height: 512 },
		description: 'Cinematic widescreen backgrounds for locations.',
	},
} as const;
```

### 10. Sanitização de Mensagens

**Arquivo:** `utils/messages.ts`

Remove duplicatas geradas por race conditions:

```typescript
export function sanitizeMessages(messages: ChatMessage[]): ChatMessage[] {
	const seen = new Set<string>();
	const result: ChatMessage[] = [];

	for (const msg of messages) {
		// Deduplication by ID
		if (seen.has(msg.id)) continue;
		seen.add(msg.id);

		// Deduplication by content within 2-second window
		const contentKey = `${msg.senderId}|${msg.type}|${msg.text}`;
		const recentDupe = result.find(
			(existing) =>
				Math.abs(existing.timestamp - msg.timestamp) < 2000 &&
				`${existing.senderId}|${existing.type}|${existing.text}` === contentKey,
		);
		if (recentDupe) continue;

		result.push(msg);
	}

	return result;
}
```

---

## Sistema de Qualidade Narrativa

### Gêneros Narrativos (15 Presets)

**Arquivo:** `services/ai/prompts/narrativeStyles.ts`

Cada universo pode ser configurado com um gênero que define vocabulário, tom e técnicas:

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

### Diferenciação de Voz de NPCs

**Arquivo:** `services/ai/prompts/gameMaster.prompt.ts:104-149`

Cada NPC recebe um perfil de voz inferido da sua descrição:

```typescript
function inferVoiceProfileFromDescription(description: string): Partial<NPCVoiceProfile> {
	const desc = description.toLowerCase();
	const profile: Partial<NPCVoiceProfile> = {};

	// Inferir classe social
	if (desc.includes('rei') || desc.includes('king') || desc.includes('queen')) {
		profile.socialClass = 'royalty';
		profile.educationLevel = 'educated';
	} else if (desc.includes('mercador') || desc.includes('merchant')) {
		profile.socialClass = 'middle';
		profile.verbalTics = ['meu amigo', 'bom negócio', 'entre nós'];
	} else if (desc.includes('camponês') || desc.includes('peasant')) {
		profile.socialClass = 'lower';
		profile.educationLevel = 'uneducated';
	}

	// Inferir ritmo de fala
	if (desc.includes('velho') || desc.includes('elderly')) {
		profile.speechRhythm = 'slow';
	} else if (desc.includes('nervoso') || desc.includes('anxious')) {
		profile.speechRhythm = 'erratic';
	}

	return profile;
}
```

### Sistema "Mostrar, Não Contar"

O sistema inclui regras rígidas para evitar "contar" emoções:

```typescript
// NUNCA faça isso:
'Ela estava com raiva.';
'Ele estava nervoso.';

// SEMPRE faça isso:
'Ela bateu o punho na mesa, sua voz subindo uma oitava.';
'Ele ajustou a gravata pela terceira vez, os olhos saltando para a porta.';
```

---

## Sistema de Requisições à IA

### Fluxo de Requisição LLM

**Arquivo:** `utils/ai.ts:163-184`

```typescript
export const queryLLM = async (
	apiKey: string,
	messages: LLMMessage[],
	config: LLMRequestConfig,
): Promise<LLMResponse> => {
	const client = new OpenAI({
		apiKey,
		dangerouslyAllowBrowser: true, // Required for browser-side usage
	});

	const response = await client.chat.completions.create({
		model: config.model,
		messages: messages,
		temperature: 0, // Determinístico
		response_format: config.responseFormat === 'json' ? { type: 'json_object' } : { type: 'text' },
		...(config.maxTokens && { max_tokens: config.maxTokens }),
	});

	return {
		text: response.choices[0]?.message?.content || null,
	};
};
```

### Construção de Contexto para o Game Master

**Arquivo:** `services/ai/openaiClient.ts` (função `generateGameTurn`)

```typescript
// Montagem do contexto
const messages: LLMMessage[] = [
	{
		role: 'system',
		content: systemPrompt + '\n\n' + JSON.stringify(gmResponseSchema),
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

// Execução
const response = await queryLLM(apiKey, messages, {
	model: MODEL_CONFIG.gameMaster,
	responseFormat: 'json',
});

// Processamento
const raw = JSON.parse(cleanJsonString(response.text));
const result = transformRawResponse(raw);

// Geração paralela de avatares para novos personagens
if (result.stateUpdates.newCharacters?.length > 0) {
	result.stateUpdates.newCharacters = await Promise.all(
		result.stateUpdates.newCharacters.map(async (char) => {
			const avatar = await generateCharacterAvatar(
				apiKey,
				char.name,
				char.description,
				gameState.config.universeName,
				gameState.config.visualStyle,
			);
			return { ...char, avatarBase64: avatar };
		}),
	);
}
```

### Geração de Imagens

A pipeline de imagens usa `generateImageWithPromptGuardrails` para equilibrar criatividade com conformidade:

- **1ª tentativa:** envia o prompt original exatamente como foi montado pelo builder, preservando a intenção do designer
  de narrativa.
- **2ª e 3ª tentativas:** reescrevem o prompt com base no excerto de `docs/bypass.md`, aplicando descrições indiretas e
  contextos artísticos antes de chamar a API.
- **Observabilidade:** todos os passos são logados com emojis (🧑‍🎨/🌆/🛡️) para facilitar o tracing em produção.

**Arquivo:** `services/ai/openaiClient.ts:269-347`

```typescript
const rawAvatarBase64 = await generateImageWithPromptGuardrails({
	apiKey,
	basePrompt: prompt,
	size: avatarPreset.imageSize,
	quality: avatarPreset.quality,
	contextLabel: 'Avatar',
});

if (!rawAvatarBase64) {
	console.warn(`🧑‍🎨 [Avatar] Unable to craft an image for "${charName}" after guarded attempts.`);
	return undefined;
}

const optimizedAvatar = await applyImagePresetToBase64(rawAvatarBase64, 'characterAvatar');
return optimizedAvatar;
```

### Text-to-Speech com Tom Emocional

**Arquivo:** `services/ai/openaiClient.ts:369-400`

```typescript
const buildTTSInstructions = (
	language: Language,
	voiceTone: string | undefined,
	voiceType: 'narrator' | 'player' | 'npc',
): string => {
	const languageDirective = getLanguageDirective(language);

	// Instruções específicas para português brasileiro
	const languageSpecificInstructions: Partial<Record<Language, string>> = {
		pt: `[Brazilian Portuguese]
You MUST speak in Brazilian Portuguese with an authentic Brazilian accent.
- Open vowels typical of Brazilian speech
- Soft 's' sounds (not 'sh' of European Portuguese)
- Pronounce final 'e' as 'i' (e.g., "leite" → "leiti")
- Pronounce 'd' and 't' before 'i' as 'dj' and 'tch'`,
	};

	return `${languageDirective}\nTone: ${voiceTone || 'neutral'}`;
};
```

### Speech-to-Text com Whisper

**Arquivo:** `utils/ai.ts:194-220`

```typescript
export const transcribeAudioWithWhisper = async (
	apiKey: string,
	audioBlob: Blob,
	language: string,
): Promise<string> => {
	const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

	// Converter blob para File
	const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });

	const transcription = await client.audio.transcriptions.create({
		file: audioFile,
		model: 'whisper-1',
		language: language, // Hint de idioma
	});

	return transcription.text;
};
```

### Atualização de Grid via LLM

**Arquivos:** `services/ai/openaiClient.ts:1550-1729` e `services/ai/prompts/gridUpdate.prompt.ts`

```typescript
export const updateGridPositions = async (
	apiKey: string,
	gameState: GameState,
	recentResponse: GMResponse,
	language: Language,
	currentMessageNumber: number,
): Promise<GridUpdateResult> => {
	const prompt = buildGridUpdatePrompt({
		gameState,
		recentMessages,
		eventLog: recentResponse.stateUpdates.eventLog,
		currentGridPositions,
		language,
	});

	const response = await queryLLM(apiKey, messages, {
		model: MODEL_CONFIG.gridUpdate,
		responseFormat: 'json',
	});

	const parsed: GridUpdateResponse = JSON.parse(cleanJsonString(response.text));
	if (!parsed.shouldUpdate || !parsed.characterPositions) {
		return { updated: false };
	}

	const snapshot: GridSnapshot = {
		id: `grid_${gameState.id}_${Date.now()}`,
		gameId: gameState.id,
		atMessageNumber: currentMessageNumber,
		locationId: gameState.currentLocationId,
		locationName: currentLocation?.name || 'Unknown',
		timestamp: Date.now(),
		characterPositions,
	};

	return { updated: true, snapshot };
};
```

- O prompt `gridUpdate` aplica regras físicas (velocidade máxima, ocupação compartilhada, reset em mudança de
  localização) e schema JSON obrigatório para manter determinismo.
- A função reaproveita o snapshot mais recente como contexto, só cria novo registro quando há movimento e loga o
  `reasoning` retornado pela IA.
- Após interpretar o JSON, normalizamos os dados e mesclamos com o snapshot anterior para manter player + todos os NPCs
  visíveis no IndexedDB, mesmo quando apenas um personagem se move.
- Quando não há histórico, `createInitialGridSnapshot` gera posições padrão (player no centro, NPCs ao redor) para
  evitar jitter no primeiro update.
- O `gridContextSection` do `buildGameMasterPrompt` agora obriga o GM a citar onde os NPCs estão em relação ao jogador
  sempre que o posicionamento impactar a cena, mantendo a narrativa alinhada ao mapa.

---

## Gerenciamento de Estado

### Hook Principal: useGameEngine

**Arquivo:** `hooks/useGameEngine.ts:177-800+`

```typescript
export const useGameEngine = (): UseGameEngineReturn => {
	// Estados principais
	const [apiKey, setApiKey] = useState<string>('');
	const [stories, setStories] = useState<GameState[]>([]);
	const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const [creationPhase, setCreationPhase] = useState<CreationPhase>(null);
	const [processingPhase, setProcessingPhase] = useState<ProcessingPhase>(null);

	// Theme Colors Context
	const { setColors, setIsGenerating: setIsGeneratingColors } = useThemeColors();

	// Inicialização (linhas 237-258)
	useEffect(() => {
		const init = async () => {
			const detected = getBrowserLanguage();
			setLanguage(detected);

			const savedApiKey = localStorage.getItem('infinitum_api_key');
			if (savedApiKey) setApiKey(savedApiKey);
			else setShowApiKeyModal(true);

			// Load voice preference
			const savedVoice = localStorage.getItem('infinitum_tts_voice');
			if (savedVoice) setSelectedVoiceState(savedVoice);

			const loadedStories = await dbService.loadGames();
			setStories(loadedStories);
		};
		init();
	}, []);

	// Carregamento de história completa (linhas 261-331)
	useEffect(() => {
		const loadFullStory = async () => {
			if (!currentStoryId) return;
			if (loadedStoriesRef.current.has(currentStoryId)) return;

			let fullStory = await dbService.loadGame(currentStoryId);

			// Migração automática se necessário
			if (fullStory && needsMigration(fullStory)) {
				const { migrated, gameState } = migrateGameState(fullStory);
				if (migrated) {
					fullStory = gameState;
					await dbService.saveGame(fullStory);
				}
			}

			// Merge messages e sanitize
			setStories((prev) =>
				prev.map((s) => {
					if (s.id !== currentStoryId) return s;
					const mergedMessages = sanitizeMessages([...s.messages, ...fullStory.messages]);
					return { ...fullStory, messages: mergedMessages };
				}),
			);
		};
		loadFullStory();
	}, [currentStoryId]);

	// Geração automática de background (linhas 346-410)
	useEffect(() => {
		const generateBackgroundIfNeeded = async () => {
			const activeStory = stories.find((s) => s.id === currentStoryId);
			const currentLocation = activeStory?.locations[activeStory.currentLocationId];

			if (!currentLocation?.backgroundImage) {
				const backgroundImage = await generateLocationBackground(
					apiKey,
					currentLocation.name,
					currentLocation.description,
					activeStory.config.universeName,
					activeStory.config.visualStyle,
				);
				// Update and save...
			}
		};
		generateBackgroundIfNeeded();
	}, [currentStoryId, stories]);

	return {
		handleSendMessage,
		handleCreateStory,
		handleDeleteStory,
		activeStory,
		player,
		// ...
	};
};
```

### Linha do Tempo de Grid no Estado

- Na criação de histórias, `createInitialGridSnapshot(newState, newMessages.length)` posiciona o jogador no centro (5,5)
  e distribui NPCs em círculo, garantindo snapshot para a primeira carta.
- A cada turno, após `generateGameTurn`, o hook executa `updateGridPositions` em background; se `updated: true`, o
  snapshot retornado é anexado via `safeUpdateStory`, preservando todo o histórico.
- Saves legados sem snapshots recebem um snapshot inicial on-the-fly antes de qualquer análise, evitando erros no
  `GridMap`.
- `gridSnapshots` é persistido no IndexedDB (store `GRIDS`) e exportado/importado junto com o resto do estado,
  permitindo reconstruir o mapa em qualquer dispositivo.

### Fases de Criação

**Arquivo:** `hooks/useGameEngine.ts:14-29`

```typescript
// Fases durante criação de história
type CreationPhase =
	| 'initializing'
	| 'colors' // Gerando paleta de cores
	| 'world' // Criando mundo
	| 'characters' // Criando personagens
	| 'avatar' // Gerando avatar do jogador
	| 'finalizing'
	| null;

// Fases durante processamento de mensagem
type ProcessingPhase =
	| 'classifying' // Classificando input
	| 'generating' // Gerando resposta
	| 'updating' // Atualizando contexto
	| null;
```

---

## Banco de Dados IndexedDB

### Schema (Versão 3)

**Arquivo:** `services/db.ts:5-66`

```typescript
const DB_NAME = 'InfinitumRPG_Core';
const DB_VERSION = 3;
const EXPORT_VERSION = 2;

const STORES = {
	GAMES: 'games',
	CHARACTERS: 'characters',
	LOCATIONS: 'locations',
	MESSAGES: 'messages',
	EVENTS: 'events',
	GRIDS: 'grids', // Snapshots 10x10 sincronizados com pageNumber
};

charStore.createIndex('by_game_id', 'gameId', { unique: false });
locStore.createIndex('by_game_id', 'gameId', { unique: false });
msgStore.createIndex('by_game_id', 'gameId', { unique: false });
evtStore.createIndex('by_game_id', 'gameId', { unique: false });
gridStore.createIndex('by_game_id', 'gameId', { unique: false });
```

- A atualização de schema adiciona a store `GRIDS`, permitindo persistir histórico infinito de `GridSnapshot` sem inflar
  documentos principais.
- `EXPORT_VERSION` permanece 2, mas agora inclui snapshots; durante importação os IDs `grid_*` e o `characterId` do
  player são reescritos para manter consistência (ver `services/db.ts:281-399`).

### Exportação e Importação

**Arquivo:** `services/db.ts:265-380`

```typescript
// Exportar com versionamento
exportGame: async (id: string): Promise<ExportedGameData | undefined> => {
	const gameState = await dbService.loadGame(id);
	return {
		version: EXPORT_VERSION,
		exportedAt: Date.now(),
		game: gameState,
	};
};

// Validar antes de importar
validateImport: (data: unknown): { valid: boolean; error?: string } => {
	const exported = data as ExportedGameData;

	// Check version - bloqueia versões futuras
	if (!exported.version || exported.version > EXPORT_VERSION) {
		return { valid: false, error: 'version' };
	}

	// Verificar campos obrigatórios
	const requiredFields = ['id', 'title', 'config', 'playerCharacterId'];
	for (const field of requiredFields) {
		if (!(field in exported.game)) {
			return { valid: false, error: `Missing: ${field}` };
		}
	}

	return { valid: true };
};

// Importar com novo ID
importGame: async (data: ExportedGameData): Promise<string> => {
	const newId = crypto.randomUUID();
	const newPlayerCharacterId = `player_${newId}`;

	// Atualizar todas as referências
	const updatedCharacters = Object.entries(data.game.characters).map(([key, char]) => {
		const newCharId = key === data.game.playerCharacterId ? newPlayerCharacterId : key;
		return { ...char, id: newCharId, gameId: newId };
	});

	// ... atualizar messages, locations, events

	await dbService.saveGame(importedGame);
	return newId;
};
```

---

## Sistema de Economia

### Constantes Econômicas

**Arquivo:** `constants/economy.ts:30-101`

```typescript
export const ECONOMY = {
	SELL_MULTIPLIER: 0.5, // Jogador recebe 50% do valor base
	BUY_MULTIPLIER: 1.0, // Jogador paga 100% do valor base

	PRICE_RANGES: {
		consumable: { min: 5, max: 50 },
		weapon: { min: 20, max: 500 },
		armor: { min: 30, max: 600 },
		valuable: { min: 50, max: 1000 },
		material: { min: 1, max: 20 },
		quest: { min: 0, max: 0 }, // Não vendível
		currency: { min: 1, max: 1000 },
		misc: { min: 1, max: 50 },
	},

	STARTING_GOLD: {
		fantasy: 50,
		medieval: 50,
		scifi: 100,
		modern: 200,
		cyberpunk: 150,
		steampunk: 75,
		horror: 30,
		western: 40,
		postapocalyptic: 20,
	},

	MAX_STACK_SIZE: 99,
	DEFAULT_INVENTORY_LIMIT: 30,
	MIN_GOLD: 0,

	LOOT_GOLD_RANGES: {
		trivial: { min: 1, max: 10 },
		easy: { min: 5, max: 25 },
		medium: { min: 15, max: 50 },
		hard: { min: 40, max: 100 },
		boss: { min: 100, max: 500 },
	},
};

export const DEFAULT_PLAYER_STATS = {
	hp: 100,
	maxHp: 100,
	gold: 50,
};
```

### Funções de Economia

**Arquivo:** `constants/economy.ts:117-250`

```typescript
// Calcular preço de venda
export function calculateSellPrice(baseValue: number): number {
	return Math.floor(baseValue * ECONOMY.SELL_MULTIPLIER);
}

// Determinar gold inicial pelo nome do universo
export function getStartingGold(universeName: string): number {
	const lower = universeName.toLowerCase();

	if (lower.includes('star wars') || lower.includes('sci-fi')) {
		return ECONOMY.STARTING_GOLD.scifi;
	}
	if (lower.includes('cyberpunk') || lower.includes('blade runner')) {
		return ECONOMY.STARTING_GOLD.cyberpunk;
	}
	if (lower.includes('horror') || lower.includes('lovecraft')) {
		return ECONOMY.STARTING_GOLD.horror;
	}
	// ... outros tipos

	return ECONOMY.STARTING_GOLD.fantasy; // Default
}

// Formatar regras para prompt da IA
export function getEconomyRulesForGMPrompt(): string {
	return `
=== ECONOMY & TRADING RULES (MANDATORY) ===

**BUYING FROM NPCs:**
1. Verify the NPC has the item in their inventory
2. Determine price based on item category
3. Check player's stats.gold >= price
4. If SUFFICIENT: deduct gold, add item
5. If INSUFFICIENT: NPC refuses

**SELLING TO NPCs:**
1. NPCs buy at ${ECONOMY.SELL_MULTIPLIER * 100}% of base price
2. Quest items CANNOT be sold
3. Add gold to player stats
4. Remove item from inventory
`;
}
```

---

## Engenharia de Prompts

### Estrutura Modular

**Diretório:** `services/ai/prompts/`

```
prompts/
├── index.ts                      # Exporta todos os prompts e schemas
├── gameMaster.prompt.ts          # Loop principal (~400 linhas)
├── storyInitialization.prompt.ts # Criação do estado inicial
├── onboarding.prompt.ts          # Wizard de criação
├── actionOptions.prompt.ts       # 5 sugestões de ação
├── heavyContext.prompt.ts        # Memória narrativa
├── universeContext.prompt.ts     # Contexto profundo
├── characterAvatar.prompt.ts     # Geração de avatares
├── locationBackground.prompt.ts  # Geração de cenários
├── themeColors.prompt.ts         # Paleta de cores
├── textClassification.prompt.ts  # ACTION vs SPEECH
├── customActionAnalysis.prompt.ts # Análise de ação livre
├── narrativeStyles.ts            # 15 gêneros narrativos
├── narrativeQualityAnalysis.prompt.ts # Análise de qualidade
└── helpers.ts                    # Funções auxiliares
```

### Padrão de Arquivo de Prompt

**Exemplo:** `services/ai/prompts/gameMaster.prompt.ts:1-83`

```typescript
/**
 * @fileoverview Prompt do Game Master - Motor de Lógica do RPG
 * @module prompts/gameMaster
 */

export interface GameMasterPromptParams {
	gameState: GameState;
	playerInput: string;
	language: Language;
	fateResult?: FateResult;
	genre?: NarrativeGenre;
	useTone?: boolean;
}

export function buildGameMasterPrompt(params: GameMasterPromptParams): string {
	const { gameState, playerInput, language, fateResult, genre, useTone } = params;

	// Construir contexto do jogador
	const player = gameState.characters[gameState.playerCharacterId];
	const location = gameState.locations[gameState.currentLocationId];

	// Gerar instruções narrativas baseadas no gênero
	const narrativeInstructions = genre ? generateNarrativeInstructions(genre, language) : '';

	return `
You are the Game Master (GM) for an immersive RPG.

=== CURRENT STATE ===
Location: ${location.name} - ${location.description}
Player: ${player.name}
${formatStatsForPrompt(player.stats)}
${formatInventoryForPrompt(player.inventory)}

=== HEAVY CONTEXT ===
${JSON.stringify(gameState.heavyContext || {})}

=== NARRATIVE STYLE ===
${narrativeInstructions}

=== ECONOMY RULES ===
${getEconomyRulesForGMPrompt()}

=== PLAYER ACTION ===
"${playerInput}"
${fateResult ? `Fate Result: ${fateResult.type} - ${fateResult.hint}` : ''}

Generate a response following the JSON schema provided.
  `;
}

// Schema JSON para structured output
export const gmResponseSchema = {
	type: 'object',
	properties: {
		messages: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					type: { enum: ['narration', 'dialogue', 'system'] },
					text: { type: 'string' },
					characterName: { type: 'string' },
					dialogue: { type: 'string' },
					voiceTone: { type: 'string' },
					newCharacterData: {
						/* ... */
					},
				},
			},
		},
		stateUpdates: {
			type: 'object',
			properties: {
				newLocations: { type: 'array' },
				newCharacters: { type: 'array' },
				updatedCharacters: { type: 'array' },
				locationChange: { type: 'string' },
				eventLog: { type: 'string' },
			},
		},
	},
};
```

### Heavy Context Updates

**Arquivo:** `services/ai/prompts/heavyContext.prompt.ts`

O sistema envia apenas diferenças incrementais:

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

---

## Fluxo do Jogo

### Inicialização do App

```
1. Carregar API key do localStorage
2. Carregar jogos do IndexedDB (apenas metadados)
3. Detectar idioma do navegador
4. Se não há API key → mostrar modal
5. Carregar preferências de voz
```

### Criação de História

```
1. Usuário clica "Nova História"
2. Wizard pergunta: Universo Original ou Existente?
3. Loop de onboarding (processOnboardingStep):
   - IA faz pergunta → Usuário responde → IA processa
4. Quando isComplete=true:
   - Fase 'colors': generateThemeColors()
   - Fase 'world': initializeStory()
   - Fase 'avatar': generateCharacterAvatar()
   - Fase 'finalizing': saveGame()
5. Navegar para o jogo
```

### Loop Principal do Jogo

```
1. Exibir opções de ação (generateActionOptions → 5 sugestões + "Outro")
2. Jogador escolhe ação ou digita customizada
3. handleSendMessage():
   a. Fase 'classifying': classifyAndProcessPlayerInput()
   b. UI otimista: adiciona mensagem do jogador
   c. Fase 'generating': generateGameTurn()
   d. Processa resposta:
      - Adiciona novas localizações
      - Cria novos NPCs (gera avatares em paralelo)
      - Atualiza personagens existentes
      - Muda localização se necessário
   e. Fase 'updating': updateHeavyContext()
   f. Salva estado no IndexedDB
4. Gerar novas opções de ação
5. Repetir
```

---

## Sistema de Mapa em Grade

> Introduzido no commit `79cc5d6` (merge `claude/grid-navigation-system-HYTk0`) para fornecer contexto espacial
> sincronizado a cada carta.

### Visão Geral

- `gridSnapshots` grava posições 10x10 por `pageNumber`, permitindo voltar no tempo sem perder coerência.
- A IA especializada (`gridUpdate.prompt.ts`) lê mensagens recentes + `eventLog` e decide se houve movimento físico
  antes de sugerir uma nova matriz.
- A UI expõe o mapa via flip-card dentro do `StoryCard`, evitando modais externos.

### Fluxo Completo

1. **Criação** – `createInitialGridSnapshot` posiciona o jogador no centro e NPCs em círculo após as mensagens iniciais.
2. **Turno** – Após `generateGameTurn`, `updateGridPositions` consulta o prompt e pode retornar `updated: true` com
   `GridSnapshot` completo.
3. **Persistência** – Snapshots são salvos na store IndexedDB `GRIDS`, exportados/importados e anexados em memória via
   `safeUpdateStory`.
4. **Renderização** – `StoryCard` passa `gridSnapshots`, `pageNumber` atual e cache de avatares para o `GridMap`, que
   seleciona o snapshot <= carta ativa.

### UX e Traduções

- `GridMap` traz animação 3D, highlight piscante no player, badge de crowd e legenda rolável.
- Botões `Map`/`Back to card`, rótulo `Map` e mensagem `No map data` estão traduzidos em EN/PT/ES/FR/RU/ZH
  (`i18n/locales.ts`).

---

## Componentes de UI

### StoryCard

**Arquivo:** `components/StoryCard/StoryCard.view.tsx`

- Efeito typewriter + fallback instantâneo para mensagens já vistas.
- Background híbrido (avatar, cenário ou textura) com overlay para leitura confortável.
- Botão de play com TTS configurável por voz/tom.
- Navegação Prev/Next com barra de progresso, swipe e atalhos de teclado.
- Botão **Map** aciona flip 3D e envia `gridSnapshots`, `pageNumber` e avatares atuais para o `GridMap` renderizar o
  snapshot correto.

### GridMap

**Arquivo:** `components/GridMap/GridMap.tsx`

- Busca o snapshot mais recente com `atMessageNumber <= carta atual` e aplica fallback de avatar.
- Grid 10x10 responsivo com player piscando (intervalo de 500 ms) e badges de quantidade para NPCs empilhados.
- Cabeçalho com localização, botão "Back" e integração total com `ThemeColors`; corpo pode usar o background da cena com
  overlay.
- Legenda rolável lista personagens, coordenadas e avatar, mantendo contexto mesmo em telas menores.

### ActionInput

**Arquivo:** `components/ActionInput/ActionInput.tsx`

- Grid de 5 opções geradas pela IA
- Badges de probabilidade (goodChance/badChance)
- Modo "Outro..." para ação customizada
- Integração com VoiceInput
- Cache de opções no localStorage

### ErrorModal

**Arquivo:** `components/ErrorModal.tsx`

Trata erros específicos:

- `insufficient_quota`: Link para billing da OpenAI
- `invalid_key`: Modal para re-inserir key
- `rate_limit`: Permite retry
- `network`: Mensagem de conectividade

---

## Internacionalização

### Idiomas Suportados

**Arquivo:** `i18n/locales.ts`

- 🇺🇸 English (en)
- 🇧🇷 Português do Brasil (pt)
- 🇪🇸 Español (es)
- 🇫🇷 Français (fr)
- 🇷🇺 Русский (ru)
- 🇨🇳 中文 (zh)

### Detecção de Idioma

```typescript
export function getBrowserLanguage(): Language {
	// 1. Cookie 'infinitum_lang'
	const cookie = document.cookie.match(/infinitum_lang=(\w+)/);
	if (cookie && supportedLanguages.includes(cookie[1])) {
		return cookie[1] as Language;
	}

	// 2. navigator.language
	const browserLang = navigator.language.split('-')[0];
	if (supportedLanguages.includes(browserLang)) {
		return browserLang as Language;
	}

	// 3. Fallback
	return 'en';
}
```

---

## Tratamento de Erros

### Classificação

**Arquivo:** `utils/errorHandler.ts`

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

| Camada         | Tecnologia                 |
| -------------- | -------------------------- |
| Frontend       | React 19.2, TypeScript 5.8 |
| Build          | Vite 6.2                   |
| Ícones         | Lucide React 0.560         |
| IA - LLM       | OpenAI GPT-4.1             |
| IA - Imagem    | gpt-image-1-mini           |
| IA - Voz       | Whisper + gpt-4o-mini-tts  |
| Banco de Dados | IndexedDB + localStorage   |
| Testes         | Jest 29 + Testing Library  |
| Git Hooks      | Husky 9                    |

### Scripts npm

```bash
npm run dev          # Servidor Vite com HMR
npm run build        # Build de produção
npm run preview      # Preview do build
npm test             # Executar testes
npm run test:watch   # Testes em modo watch
npm run test:coverage # Relatório de cobertura
```

---

## Instalação e Uso

### Pré-requisitos

- Node.js 18+
- Chave de API da OpenAI

### Instalação

```bash
# Clone o repositório
git clone <repo-url>
cd storywell.games

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

1. Acesse `http://localhost:5173`
2. Insira sua chave OpenAI
3. Garanta permissão de microfone (opcional)
4. Inicie uma nova história ou importe um save

---

## Guia de Contribuição

### Versionamento

> **IMPORTANTE:** Ao fazer qualquer alteração no código, **SEMPRE atualize a versão** no `package.json`.

Seguimos [Semantic Versioning](https://semver.org/):

- **MAJOR (X):** Mudanças incompatíveis na API
- **MINOR (Y):** Novas funcionalidades compatíveis
- **PATCH (Z):** Correções de bugs

### Checklist de Contribuição

- [ ] Código segue os padrões existentes
- [ ] **Versão atualizada no `package.json`**
- [ ] Testes passando (`npm test`)
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

- **Views** devem ser "burras" - apenas renderizam props
- **Logic** (Hooks/Services) cuida do _como_ e _quando_

#### Abstração de IA

Todas as chamadas de IA devem passar por `utils/ai.ts` - nunca instancie `new OpenAI()` diretamente.

#### Documentação

Funções exportadas devem ter TSDoc:

```typescript
/**
 * Descrição do que a função faz.
 * @param paramName - Descrição do parâmetro.
 * @returns Descrição do retorno.
 */
```

---

## Testes Automatizados

O projeto utiliza **Jest** e **React Testing Library** para testes unitários, de integração e snapshots. A cobertura de testes foca nos componentes críticos da UI e na lógica de negócios.

### Executando Testes

```bash
# Executar todos os testes
npm test

# Executar em modo watch
npm run test:watch

# Executar com cobertura
npm run test:coverage
```

### Estrutura de Testes

```
__tests__/
├── components/           # Testes de componentes React
│   ├── ActionInput.test.tsx
│   ├── ChatBubble.test.tsx
│   ├── ErrorModal.test.tsx
│   ├── FateToast.test.tsx
│   ├── GridMap.test.tsx
│   ├── NarrativeStyleModal.test.tsx
│   ├── SettingsModal.test.tsx
│   └── StoryCard.test.tsx
├── hooks/               # Testes de custom hooks
│   ├── useGameEngine.test.ts
│   └── useMessageQueue.test.ts
├── services/            # Testes de serviços
│   ├── db.test.ts
│   ├── openaiClient.test.ts
│   └── systemPrompts.test.ts
├── utils/               # Testes de utilitários
│   ├── errorHandler.test.ts
│   └── helpers.test.ts
├── i18n/               # Testes de internacionalização
│   └── locales.test.ts
└── types.test.ts       # Testes de tipos TypeScript
```

### Casos de Teste por Componente

#### StoryCard (`components/StoryCard.test.tsx`)

| Categoria | Caso de Teste | Descrição |
|-----------|---------------|-----------|
| **Renderização** | `should render without crashing` | Verifica renderização básica |
| | `should render player message correctly` | Mensagem do jogador exibe "YOU" |
| | `should render narrator message correctly` | Mensagem de narração exibe "NARRATOR" com ícone Terminal |
| | `should render system message correctly` | Mensagem de sistema exibe "SYSTEM" com ícone Info |
| | `should render NPC message correctly` | Mensagem de NPC exibe nome em uppercase |
| | `should display page number correctly` | Exibe página atual e total |
| | `should display avatar when provided` | Avatar base64 é exibido como imagem |
| **Efeito Typewriter** | `should animate text character by character` | Texto aparece letra por letra |
| | `should skip animation when skipAnimation is true` | Texto aparece instantaneamente |
| | `should call onTypingComplete when animation finishes` | Callback é chamado ao finalizar |
| | `should show typing cursor during animation` | Cursor piscante durante digitação |
| **Navegação** | `should call onPrevious when Previous button is clicked` | Botão anterior funciona |
| | `should call onNext when Next button is clicked` | Botão próximo funciona |
| | `should disable Previous button when canGoPrevious is false` | Botão desabilitado corretamente |
| | `should disable Next button when canGoNext is false` | Botão desabilitado corretamente |
| **Grid Map** | `should show Map button when grid data is available` | Botão mapa visível com dados |
| | `should not show Map button when no grid data` | Botão mapa oculto sem dados |
| | `should toggle map view when Map button is clicked` | Flip 3D para mapa funciona |
| **Snapshots** | 6 testes de snapshot | Captura visual de diferentes estados |

#### GridMap (`components/GridMap.test.tsx`)

| Categoria | Caso de Teste | Descrição |
|-----------|---------------|-----------|
| **Renderização** | `should render without crashing` | Verifica renderização básica |
| | `should render map title` | Título "Map" é exibido |
| | `should render location name` | Nome da localização é exibido |
| | `should render back button` | Botão voltar é exibido |
| | `should call onToggleFlip when back button is clicked` | Callback de voltar funciona |
| | `should render 100 grid cells (10x10)` | Grid 10x10 completo |
| **Posições de Personagens** | `should display player character on the grid` | Jogador aparece na célula correta |
| | `should display NPC character on the grid` | NPCs aparecem corretamente |
| | `should display multiple characters in same cell` | Múltiplos personagens na mesma célula |
| | `should show character avatar when provided` | Avatar exibido na célula |
| | `should show character initial when no avatar` | Inicial do nome sem avatar |
| **Estados Históricos** | `should show correct grid state for current message` | Snapshot correto por mensagem |
| | `should show latest snapshot for future message numbers` | Snapshot mais recente para futuro |
| **Estado Vazio** | `should show no data message when no snapshots` | Mensagem de sem dados |
| **Legenda** | `should show character legend when characters are present` | Legenda com coordenadas |
| | `should not show legend when no characters` | Legenda oculta sem personagens |
| **Animação** | `should toggle player cell blinking state` | Célula do jogador pisca |
| **Snapshots** | 6 testes de snapshot | Captura visual de diferentes estados |

#### ActionInput (`components/ActionInput.test.tsx`)

| Categoria | Caso de Teste | Descrição |
|-----------|---------------|-----------|
| **Renderização** | `should render without crashing` | Verifica renderização básica |
| | `should show loading or options initially` | Exibe loading ou opções |
| **Modo Input Customizado** | `should switch to custom input when custom action is clicked` | Muda para input manual |
| **Estado de Processamento** | `should handle processing state` | Componente em estado de processamento |
| **Traduções** | `should use provided translations` | Usa traduções fornecidas |
| **Snapshots** | 4 testes de snapshot | Captura visual de diferentes estados |

#### ChatBubble (`components/ChatBubble.test.tsx`)

| Categoria | Caso de Teste | Descrição |
|-----------|---------------|-----------|
| **Renderização** | `should render without crashing` | Verifica renderização básica |
| | `should render player message correctly` | Mensagem do jogador estilizada |
| | `should render narrator message correctly` | Narração com aspas decorativas |
| | `should render system message correctly` | Mensagem de sistema azul |
| | `should render NPC message correctly` | Mensagem de NPC com nome |
| | `should display avatar when provided` | Avatar exibido corretamente |
| | `should show YOU for player without avatar` | Placeholder para jogador |
| | `should show first letter for NPC without avatar` | Inicial para NPC |
| **Efeito Typewriter** | `should animate text character by character` | Animação de digitação |
| | `should skip animation when skipAnimation is true` | Pular animação |
| | `should call onTypingComplete when animation finishes` | Callback de conclusão |
| | `should show typing cursor during animation` | Cursor durante digitação |
| **Áudio** | `should show play button when apiKey is provided` | Botão TTS visível |
| | `should disable play button while typing` | Botão desabilitado durante digitação |
| | `should disable play button when no apiKey` | Botão desabilitado sem API key |
| **Click no Avatar** | `should call onAvatarClick when avatar is clicked` | Callback de zoom |
| | `should not call onAvatarClick when no avatar` | Sem callback sem avatar |
| **Estilização** | `should apply dark styling for player messages` | Estilo escuro para jogador |
| | `should apply light styling for NPC messages` | Estilo claro para NPCs |
| **Snapshots** | 6 testes de snapshot | Captura visual de diferentes estados |

#### SettingsModal (`components/SettingsModal.test.tsx`)

| Categoria | Caso de Teste | Descrição |
|-----------|---------------|-----------|
| **Renderização** | `should render nothing when isOpen is false` | Modal oculto quando fechado |
| | `should render when isOpen is true` | Modal visível quando aberto |
| | `should display settings icon in header` | Ícone no cabeçalho |
| | `should display all settings options` | Todas as opções visíveis |
| | `should display option descriptions` | Descrições das opções |
| | `should display icons for each option` | Ícones de cada opção |
| **Funcionalidade Fechar** | `should call onClose when X button is clicked` | Botão X fecha modal |
| | `should call onClose when Close button is clicked` | Botão Fechar fecha modal |
| **Configurações de Voz** | `should call onOpenVoiceSettings and onClose when Voice Settings is clicked` | Abre config de voz |
| **Estilo Narrativo** | `should call onOpenNarrativeStyle and onClose when Edit Narrative Style is clicked` | Abre editor de estilo narrativo |
| | `should not call onOpenNarrativeStyle when canEditNarrativeStyle is false` | Desabilita quando não há história |
| | `should show disabled message when canEditNarrativeStyle is false` | Mostra mensagem de desabilitado |
| | `should show enabled description when canEditNarrativeStyle is true` | Mostra descrição quando habilitado |
| | `should disable narrative style button when canEditNarrativeStyle is false` | Botão desabilitado |
| **Excluir Banco de Dados** | `should show confirmation when Delete All Saves is clicked` | Confirmação de exclusão |
| | `should hide confirmation when Cancel is clicked` | Cancelar oculta confirmação |
| | `should call onDeleteDatabase when Delete All is clicked` | Executa exclusão |
| | `should show loading state while deleting` | Estado de carregamento |
| | `should handle deletion errors gracefully` | Trata erros graciosamente |
| **Excluir API Key** | `should show confirmation when Remove API Key is clicked` | Confirmação de remoção |
| | `should hide confirmation when Cancel is clicked` | Cancelar oculta confirmação |
| | `should call onDeleteApiKey and onClose when Remove Key is clicked` | Remove chave API |
| **Traduções** | `should use provided translations` | Usa traduções fornecidas |
| **Snapshots** | 6 testes de snapshot | Captura visual de diferentes estados |

#### NarrativeStyleModal (`components/NarrativeStyleModal.test.tsx`)

| Categoria | Caso de Teste | Descrição |
|-----------|---------------|-----------|
| **Renderização** | `should render nothing when isOpen is false` | Modal oculto quando fechado |
| | `should render when isOpen is true` | Modal visível quando aberto |
| | `should display sparkles icon in header` | Ícone sparkles no cabeçalho |
| | `should display current mode and genre` | Mostra modo e gênero atual |
| | `should display mode selection buttons` | Botões de seleção de modo |
| | `should display genre fallback when no genre is provided` | Fallback quando sem gênero |
| | `should display last custom style when provided` | Mostra último estilo customizado |
| **Seleção de Modo** | `should switch to custom mode when Custom Brief button is clicked` | Troca para modo custom |
| | `should show textarea only in custom mode` | Textarea apenas em modo custom |
| | `should show info box in custom mode` | Info box em modo custom |
| **Funcionalidade Fechar** | `should call onClose when X button is clicked` | Botão X fecha modal |
| | `should call onClose when Cancel button is clicked` | Botão Cancelar fecha modal |
| **Funcionalidade Salvar** | `should call onSave with auto mode` | Salva com modo auto |
| | `should call onSave with custom mode and style` | Salva com modo custom e estilo |
| | `should show error when saving custom mode without style` | Erro ao salvar custom vazio |
| | `should show error when onSave fails` | Trata erro de salvamento |
| | `should show saving state while saving` | Estado de salvando |
| | `should disable buttons while saving` | Desabilita botões durante save |
| **Comportamento Textarea** | `should update custom style on input` | Atualiza estilo no input |
| | `should preserve custom style when switching modes` | Preserva estilo entre modos |
| **Traduções** | `should use provided translations` | Usa traduções fornecidas |
| **Snapshots** | 5 testes de snapshot | Captura visual de diferentes estados |

#### FateToast (`components/FateToast.test.tsx`)

| Categoria | Caso de Teste | Descrição |
|-----------|---------------|-----------|
| **Renderização** | `should render good toast with sparkles icon` | Toast verde com sparkles |
| | `should render bad toast with alert icon` | Toast vermelho com alerta |
| | `should not render neutral toast` | Toast neutro não renderiza |
| | `should display hint when provided` | Exibe dica quando fornecida |
| **Estilização** | `should have green/emerald styling for good toast` | Estilo verde para bom |
| | `should have red styling for bad toast` | Estilo vermelho para ruim |
| **Auto-fechamento** | `should auto-close after 4 seconds` | Fecha após 4 segundos |
| | `should not call onClose before 4 seconds` | Não fecha antes de 4s |
| **Fechamento Manual** | `should close when close button is clicked` | Botão X fecha toast |
| | `should trigger exit animation before calling onClose` | Animação de saída |
| **Acessibilidade** | `should have a clickable close button` | Botão acessível |

#### ErrorModal (`components/ErrorModal.test.tsx`)

| Categoria | Caso de Teste | Descrição |
|-----------|---------------|-----------|
| **Renderização** | `should not render when isOpen is false` | Modal oculto quando fechado |
| | `should render when isOpen is true` | Modal visível quando aberto |
| **Tipos de Erro** | `should display insufficient_quota error correctly` | Erro de quota |
| | `should display invalid_key error correctly` | Erro de chave inválida |
| | `should display rate_limit error correctly` | Erro de rate limit |
| | `should display network error correctly` | Erro de rede |
| | `should display generic error correctly` | Erro genérico |
| **Interações** | `should call onClose when X button is clicked` | Fechar com X |
| | `should call onClose when CLOSE button is clicked` | Fechar com botão |
| **Links Externos** | `should render external link for insufficient_quota error` | Link para billing |
| | `should render external link for invalid_key error` | Link para API keys |
| **Acessibilidade** | Testes de acessibilidade | Atributos ARIA corretos |

### Testes de Hooks

#### useGameEngine (`hooks/useGameEngine.test.ts`)

- Inicialização e estado padrão
- Gerenciamento de idioma (detecção, mudança)
- Gerenciamento de API key (validação, salvamento, logout)
- Gerenciamento de histórias (criar, selecionar, deletar)
- Envio de mensagens
- Transcrição de voz
- Exportação/Importação de jornadas
- Tratamento de erros

#### useMessageQueue (`hooks/useMessageQueue.test.ts`)

- Ordenação de mensagens por pageNumber
- Fallback para timestamp quando pageNumber é igual

### Testes de Serviços

#### Database Service (`services/db.test.ts`)

- Abertura do IndexedDB
- Salvar e carregar jogos
- Deletar jogos
- Validar importações
- Exportar/Importar jogos

#### OpenAI Client (`services/openaiClient.test.ts`)

- Sistema de rolagem de destino (fate)
- Geração de avatar
- Geração de fala (TTS)
- Geração de opções de ação
- Processamento de mensagens do jogador
- Atualização de contexto pesado

### Testes de Utilitários

#### Error Handler (`utils/errorHandler.test.ts`)

- Parse de erros da OpenAI (códigos, status HTTP, mensagens)
- Identificação de erros de quota
- Identificação de erros recuperáveis

#### Helpers (`utils/helpers.test.ts`)

- Conversão de Blob para base64
- Limpeza de strings JSON
- Reprodução de áudio raw
- Conversão de URL de imagem para base64

### Testes de i18n

#### Locales (`i18n/locales.test.ts`)

- Idiomas suportados (en, pt, es, fr, ru, zh)
- Nomes de idiomas
- Cookies de idioma
- Detecção de idioma do navegador
- Consistência de traduções entre idiomas

### Cobertura de Snapshots

Os testes de snapshot capturam a renderização visual dos componentes para detectar mudanças não intencionais:

- **StoryCard**: 6 snapshots (jogador, narrador, sistema, NPC, com mapa, com pulso)
- **GridMap**: 6 snapshots (básico, múltiplos personagens, com fundo, vazio, com avatares, não flipado)
- **ActionInput**: 4 snapshots (loading, processando, com opções, idioma diferente)
- **ChatBubble**: 6 snapshots (jogador, narrador, sistema, NPC com avatar, jogador com avatar, com API key)
- **SettingsModal**: 6 snapshots (padrão, fechado, confirmação DB, confirmação API key, português, estilo narrativo desabilitado)
- **NarrativeStyleModal**: 5 snapshots (modo auto, modo custom, fechado, com estilo existente, português)

**Total: 33 snapshots**

Para atualizar snapshots após mudanças intencionais:

```bash
npm test -- --updateSnapshot
```

---

## Licença

Este projeto é privado e de uso restrito.

---

## Documentação de Testes

Esta seção documenta todos os casos de teste implementados para os componentes React do projeto, utilizando Jest e Testing Library.

### Visão Geral

O projeto possui cobertura de testes abrangente com **641 testes** distribuídos em **25 suites de teste**. Os testes incluem:

- **Testes Unitários**: Verificam comportamento isolado de componentes
- **Testes de Integração**: Verificam interações entre componentes e serviços
- **Testes de Snapshot**: Capturam renderizações visuais para detectar alterações não intencionais

### Componentes Testados

#### StoryCard (`__tests__/components/StoryCard.test.tsx`)

| Categoria | Caso de Teste | Descrição |
|-----------|---------------|-----------|
| Rendering | should render without crashing | Verifica renderização básica |
| Rendering | should match snapshot for NPC dialogue | Snapshot para diálogo de NPC |
| Rendering | should match snapshot for player message | Snapshot para mensagem do jogador |
| Rendering | should match snapshot for narrator message | Snapshot para narração |
| Rendering | should match snapshot for system message | Snapshot para mensagem de sistema |
| Rendering | should match snapshot with avatar | Snapshot com avatar base64 |
| Rendering | should match snapshot with location background | Snapshot com imagem de fundo |
| Typewriter | should show typing cursor during animation | Verifica cursor de digitação |
| Typewriter | should complete animation and call callback | Verifica callback de conclusão |
| Typewriter | should skip animation when skipAnimation is true | Verifica pular animação |
| Navigation | should call onPrevious when previous button is clicked | Navegação anterior |
| Navigation | should call onNext when next button is clicked | Navegação próxima |
| Navigation | should disable previous/next buttons appropriately | Desabilitar navegação |
| Page Counter | should display correct page number | Contador de páginas correto |
| Speaker Labels | should show YOU/NARRATOR/SYSTEM/character name labels | Rótulos de locutor |
| Grid Map | should show/hide map button based on grid data | Botão de mapa condicional |
| Play Button | should render and disable play button appropriately | Botão de áudio |

#### GridMap (`__tests__/components/GridMap.test.tsx`)

| Categoria | Caso de Teste | Descrição |
|-----------|---------------|-----------|
| Rendering | should match snapshot with characters | Snapshot com personagens |
| Rendering | should match snapshot with no characters | Snapshot sem personagens |
| Rendering | should match snapshot when not flipped | Snapshot não virado |
| Rendering | should match snapshot with location background | Snapshot com fundo |
| Rendering | should match snapshot with multiple characters at same position | Snapshot com sobreposição |
| Grid Display | should display 10x10 grid (100 cells) | Verifica grid 10x10 |
| Grid Display | should display location name | Nome da localização |
| Grid Display | should display map title | Título do mapa |
| Character Display | should display character names in legend | Nomes na legenda |
| Character Display | should display character positions | Posições (x, y) |
| Interactions | should call onToggleFlip when back button is clicked | Botão voltar |
| Snapshot Selection | should show correct snapshot for message number | Seleção de snapshot |
| No Data State | should show no map data message | Mensagem de dados ausentes |
| Player Blinking | should toggle player visibility | Efeito piscante |
| Character Avatars | should display avatars/initials appropriately | Avatares e iniciais |

#### ActionInput (`__tests__/components/ActionInput.test.tsx`)

| Categoria | Caso de Teste | Descrição |
|-----------|---------------|-----------|
| Rendering | should render without crashing | Renderização básica |
| Rendering | should show loading or options initially | Estado inicial |
| Custom Input | should switch to custom input mode | Modo de entrada customizada |
| Processing State | should handle processing state | Estado de processamento |
| Translations | should use provided translations | Traduções corretas |
| Snapshots | should match snapshot for loading/options/processing/custom states | Snapshots de estados |
| Option Buttons | should display action options with risk indicators | Indicadores de risco |
| Option Buttons | should display Safe label for zero-risk actions | Label "Safe" |
| Option Buttons | should call onSendMessage when option is clicked | Callback de envio |
| Voice Input | should render voice input button | Botão de voz |
| Voice Input | should call onVoiceTranscription when used | Transcrição de voz |

#### ChatBubble (`__tests__/components/ChatBubble.test.tsx`)

| Categoria | Caso de Teste | Descrição |
|-----------|---------------|-----------|
| Rendering | should match snapshot for NPC/player/narrator/system | Snapshots por tipo |
| Rendering | should match snapshot with avatar base64/URL | Snapshots com avatar |
| Typewriter | should show typing cursor during animation | Cursor de digitação |
| Typewriter | should complete animation and call callback | Callback de conclusão |
| Message Types | should display NARRATOR/SYSTEM/PLAYER/sender name labels | Rótulos de tipo |
| Avatar Display | should display avatar/initials appropriately | Avatar ou iniciais |
| Avatar Click | should call onAvatarClick when avatar is clicked | Click no avatar |
| Play Button | should render/disable play button appropriately | Botão de áudio |
| Narrator Styling | should render narrator message | Estilização de narrador |

#### SettingsModal (`__tests__/components/SettingsModal.test.tsx`)

| Categoria | Caso de Teste | Descrição |
|-----------|---------------|-----------|
| Rendering | should render nothing when isOpen is false | Não renderiza fechado |
| Rendering | should render modal when isOpen is true | Renderiza aberto |
| Rendering | should match snapshot when open | Snapshot aberto |
| Rendering | should match snapshot with confirmations | Snapshots de confirmação |
| Voice Settings | should display voice settings option | Opção de voz |
| Voice Settings | should call onOpenVoiceSettings | Callback de configurações |
| Narrative Style | should display narrative style option | Opção de estilo narrativo |
| Narrative Style | should display enabled/disabled descriptions | Descrições por estado |
| Narrative Style | should call onOpenNarrativeStyle when enabled | Callback quando habilitado |
| Narrative Style | should NOT call when disabled | Bloqueia quando desabilitado |
| Delete Database | should show/hide confirmation | Confirmação de exclusão |
| Delete Database | should call onDeleteDatabase when confirmed | Callback de exclusão |
| Delete Database | should show loading state during deletion | Estado de loading |
| Delete API Key | should show confirmation | Confirmação de remoção |
| Delete API Key | should call onDeleteApiKey | Callback de remoção |
| Close | should call onClose on X/Close button click | Fechar modal |

#### VoiceSettings (`__tests__/components/VoiceSettings.test.tsx`)

| Categoria | Caso de Teste | Descrição |
|-----------|---------------|-----------|
| Rendering | should render nothing when isOpen is false | Não renderiza fechado |
| Rendering | should match snapshot with different configurations | Snapshots de config |
| Voice List | should display all 11 voice options | 11 opções de voz |
| Voice List | should display voice descriptions | Descrições de voz |
| Voice List | should highlight selected voice | Destaque de seleção |
| Voice Selection | should call onVoiceChange when clicked | Callback de seleção |
| Tone Toggle | should display/toggle voice tone | Toggle de tom |
| Tone Toggle | should show expressive/standard description | Descrição de tom |
| Preview Text | should display/change preview text | Texto de preview |
| Voice Preview | should have preview buttons for each voice | Botões de preview |
| Voice Preview | should call generateSpeechWithTTS when clicked | Callback de preview |
| Close | should call onClose on X/Done button click | Fechar modal |

#### ProcessingIndicator (`__tests__/components/ProcessingIndicator.test.tsx`)

| Categoria | Caso de Teste | Descrição |
|-----------|---------------|-----------|
| Rendering | should render nothing when phase is null | Não renderiza nulo |
| Rendering | should render for classifying/generating/updating phases | Renderização por fase |
| Snapshots | should match snapshot for each phase | Snapshots de fases |
| Languages | should display EN/PT/ES labels | Rótulos por idioma |
| Progress Bar | should show 20%/60%/90% for each phase | Barra de progresso |
| Phase Indicators | should display 3 phase indicator dots | Indicadores de fase |
| Animated Dots | should animate dots over time | Animação de pontos |
| Icons | should display Brain/BookOpen/Sparkles icons | Ícones por fase |
| Custom ClassName | should apply custom className | Classe customizada |

#### ProgressLoader (`__tests__/components/ProgressLoader.test.tsx`)

| Categoria | Caso de Teste | Descrição |
|-----------|---------------|-----------|
| Rendering | should render all steps with title/subtitle | Renderização completa |
| Snapshots | should match snapshot for modal/inline/compact variants | Snapshots de variantes |
| Snapshots | should match snapshot with all completed/pending | Snapshots de estados |
| Variants | should render compact/inline/modal correctly | Variantes de exibição |
| Progress | should calculate 0%/50%/100% correctly | Cálculo de progresso |
| Step Status | should show check/custom/loader icons | Ícones de status |
| createLoadingStep | should create step with defaults/icon | Helper de criação |
| Preset Steps | should have EN/PT/ES steps for story/message | Steps pré-definidos |
| Custom ClassName | should apply custom className | Classe customizada |

#### StoryCreationLoader (`__tests__/components/StoryCreationLoader.test.tsx`)

| Categoria | Caso de Teste | Descrição |
|-----------|---------------|-----------|
| Rendering | should render without crashing | Renderização básica |
| Rendering | should render all 6 phases | Todas as 6 fases |
| Snapshots | should match snapshot for each phase | Snapshots de fases |
| Phase Labels | should display correct label for each phase | Rótulos de fase |
| Phase Descriptions | should display description for phases | Descrições de fase |
| Languages | should display EN/PT/ES labels | Rótulos por idioma |
| Progress | should show correct percentage for each phase | Progresso por fase |
| Step Indicators | should display 6 indicators and highlight current | Indicadores de fase |
| Animated Dots | should animate dots over time | Animação de pontos |
| Tips | should display/rotate tips | Dicas rotativas |
| Icons | should display correct icon for each phase | Ícones por fase |

#### ThemeColorsModal (`__tests__/components/ThemeColorsModal.test.tsx`)

| Categoria | Caso de Teste | Descrição |
|-----------|---------------|-----------|
| Rendering | should render nothing when isOpen is false | Não renderiza fechado |
| Rendering | should match snapshot when open/generating/with input | Snapshots de estados |
| Color Palette | should display current palette with 8 swatches | 8 amostras de cor |
| Font Preview | should display current font section and name | Preview de fonte |
| User Input | should display/allow changing considerations | Input customizado |
| Quick Regenerate | should call onRegenerate without input | Regeneração rápida |
| Apply Custom | should enable/call onRegenerate with input | Aplicar customizado |
| Close | should call onClose when X clicked | Fechar modal |
| Loading State | should show loader icons when generating | Estado de loading |

#### VoiceInput (`__tests__/components/VoiceInput.test.tsx`)

| Categoria | Caso de Teste | Descrição |
|-----------|---------------|-----------|
| Rendering | should render microphone icon when not recording | Ícone de microfone |
| Rendering | should match snapshot in idle/disabled/custom className | Snapshots de estados |
| Button State | should be disabled when disabled prop is true | Desabilitar botão |
| Recording Flow | should start recording when clicked | Iniciar gravação |
| Recording Flow | should show stop icon/indicator when recording | Indicadores de gravação |
| Recording Flow | should stop recording when clicked again | Parar gravação |
| API Key | should alert when API key is missing | Alerta de API key |
| Transcription | should call onTranscription after processing | Callback de transcrição |
| Error Handling | should handle getUserMedia error gracefully | Tratamento de erro |
| Button Styling | should have recording/idle styles | Estilos de botão |

#### CharacterZoomModal (`__tests__/components/CharacterZoomModal.test.tsx`)

| Categoria | Caso de Teste | Descrição |
|-----------|---------------|-----------|
| Rendering | should render nothing when isOpen is false/imageSrc is null | Não renderiza inválido |
| Rendering | should match snapshot with different configurations | Snapshots de config |
| Character Name | should display character name in header | Nome do personagem |
| Image Display | should display image with base64/URL source | Exibição de imagem |
| Close | should call onClose on X/backdrop/ESC | Fechar modal |
| Close | should NOT call onClose when modal content clicked | Prevenção de propagação |
| Keyboard Events | should add/remove keydown listener | Eventos de teclado |
| Styling | should have backdrop blur and animation class | Classes de estilo |
| Accessibility | should have proper alt text and button | Acessibilidade |

#### NarrativeStyleModal (`__tests__/components/NarrativeStyleModal.test.tsx`)

| Categoria | Caso de Teste | Descrição |
|-----------|---------------|-----------|
| Rendering | should render nothing when isOpen is false | Não renderiza fechado |
| Rendering | should render modal when isOpen is true | Renderiza aberto |
| Rendering | should match snapshot for auto/custom modes | Snapshots de modos |
| Mode Selection | should display both mode options | Exibir opções de modo |
| Mode Selection | should highlight current mode | Destacar modo atual |
| Mode Selection | should switch between modes | Alternar entre modos |
| Context Display | should display current mode/genre | Exibir contexto atual |
| Context Display | should display last custom brief | Exibir último brief |
| Custom Mode | should display info box | Caixa de informações |
| Custom Mode | should allow typing in textarea | Permitir digitação |
| Save | should call onSave with mode and style | Callback de salvamento |
| Save | should show error when custom style empty | Erro para estilo vazio |
| Save | should show saving/error states | Estados de loading/erro |
| Close | should call onClose on X/Cancel click | Fechar modal |
| State Reset | should reset state when reopened | Resetar ao reabrir |

### Utilitários Testados

#### actionOptionsCache (`__tests__/utils/actionOptionsCache.test.ts`)

| Categoria | Caso de Teste | Descrição |
|-----------|---------------|-----------|
| saveCachedActionOptions | should save options to localStorage | Salvar opções no cache |
| saveCachedActionOptions | should overwrite existing cache | Sobrescrever cache existente |
| saveCachedActionOptions | should handle localStorage errors | Tratamento de erros |
| saveCachedActionOptions | should save empty options array | Salvar array vazio |
| getCachedActionOptions | should return cached options | Retornar opções do cache |
| getCachedActionOptions | should return null when no cache | Retornar null se não existir |
| getCachedActionOptions | should handle invalid JSON | Tratamento de JSON inválido |
| getCachedActionOptions | should handle localStorage errors | Tratamento de erros |
| Cache Isolation | should keep separate caches for stories | Isolamento por história |
| Interface | should have correct structure | Estrutura correta |

### Como Executar os Testes

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm run test:watch

# Gerar relatório de cobertura
npm run test:coverage

# Atualizar snapshots
npm test -- --updateSnapshot
```

### Configuração do Ambiente de Testes

Os testes utilizam as seguintes configurações (ver `jest.config.js` e `jest.setup.ts`):

- **Test Environment**: jsdom (ambiente de navegador simulado)
- **Preset**: ts-jest (suporte a TypeScript)
- **Test Pattern**: `**/__tests__/**/*.test.ts(x)`
- **Coverage Threshold**: 70% para branches, functions, lines e statements
- **Mocks Configurados**:
  - `@testing-library/jest-dom` para matchers de DOM
  - `fake-indexeddb` para testes de banco de dados
  - Mocks de AudioContext, MediaRecorder, crypto.randomUUID
  - Mock de window.matchMedia e navigator
  - Mock de FileReader e document.cookie

---

**Desenvolvido com IA** | storywell.games v2.0.4
