# storywell.games - Análise Definitiva de Problemas e Soluções

> **Documento Consolidado de Análise Técnica**
> Versão: 1.1 | Data: 2025-12-11
> Commit base: 4bb23c7

---

## Índice

1. [Sumário Executivo](#sumário-executivo)
2. [Problema 1: Perda de Contexto de Conversas Antigas](#problema-1-perda-de-contexto-de-conversas-antigas)
3. [Problema 2: Sistema Parafraseia ao Invés de Criar Personagens](#problema-2-sistema-parafraseia-ao-invés-de-criar-personagens)
4. [Problema 3: IA Cria Diálogos Pelo Jogador](#problema-3-ia-cria-diálogos-pelo-jogador)
5. [Problemas Arquiteturais Adicionais](#problemas-arquiteturais-adicionais)
6. [Soluções Detalhadas](#soluções-detalhadas)
7. [Arquitetura Recomendada](#arquitetura-recomendada)
8. [Plano de Implementação](#plano-de-implementação)
9. [Métricas de Sucesso](#métricas-de-sucesso)
10. [Referências e Pesquisas](#referências-e-pesquisas)

---

## Sumário Executivo

O **storywell.games** segue como RPG em navegador com GPT-4.1, mas a versão 1.1.0 já incorporou parte das recomendações anteriores (janela de 100 mensagens, prompt reforçado, filtros de agência). A análise atual compara o estado anterior com o commit `4bb23c7` para indicar o que foi sanado e o que ainda exige priorização.

### Problemas Reportados pelo Usuário

| # | Problema | Status (11/12) | Evidências | O que ainda falta |
|---|----------|----------------|------------|-------------------|
| 1 | Perda de contexto de conversas antigas | **Parcialmente resolvido** | `generateGameTurn()` agora envia `slice(-100)` (linha 494) e heavy context é atualizado turno a turno | Ainda não há sumarização/embeddings, heavy context continua com apenas 5 slots e é atualizado após a resposta bloquear a UI |
| 2 | Sistema parafraseia ao invés de criar NPCs | **Parcialmente resolvido** | Prompt do GM ganhou regras severas de criação (linhas 314–356) + lista de personagens conhecidos | Falta classificar intenção do jogador e deduplicar NPCs; ainda não há gatilho automático para "quero encontrar X" |
| 3 | IA cria diálogos pelo jogador | **Resolvido** | `useGameEngine` envia texto bruto (linha 421) e filtra mensagens cujo speaker coincide com o player (linhas 487–521) | Monitoramento opcional (logs) apenas; funcionalidade atende ao requisito |

### Diagnóstico Rápido

```
Problema 1 → services/ai/openaiClient.ts:494 (janela 100, ainda sem memória persistente)
Problema 2 → services/ai/prompts/gameMaster.prompt.ts (regras ok, falta dedupe/intent)
Problema 3 → hooks/useGameEngine.ts (agência garantida e processPlayerMessage não é usado)
```

---

## Problema 1: Perda de Contexto de Conversas Antigas

**Status (11/12):** Parcialmente resolvido. A janela agora leva 100 mensagens, mas continuamos sem sumarização/embeddings e o heavy context segue minimalista.

### O que melhorou
- `generateGameTurn()` envia `gameState.messages.slice(-100)` (linha 494), multiplicando por 10 a janela original.
- O heavy context é recalculado após cada turno (`updateHeavyContext`), reduzindo esquecimentos imediatos.

```typescript
{
  role: 'user',
  content: `History (Context): ${JSON.stringify(gameState.messages.slice(-100))}`
}
```

### Onde ainda falha
- `HeavyContext` continua limitado a 5 itens por lista e não armazena fatos sobre NPCs, locais ou linhas do tempo.
- A atualização acontece **depois** do turno ( `useGameEngine.ts` linhas 566–589 ), travando a UI e impedindo o uso do novo contexto dentro do mesmo request.
- Não há sumarização periódica ou banco vetorial; mensagens antigas são simplesmente descartadas.

```typescript
setIsUpdatingContext(true);
const contextUpdate = await updateHeavyContext(...);
// aplica apenas se shouldUpdate === true (máximo 5 itens por campo)
```

### Risco
Campanhas longas continuam perdendo tramas porque, após ~100 bolhas, eventos antigos nunca mais entram no prompt. Sem resumos/embeddings, NPCs reaparecem "zerados" e missões de arco longo dependem de memória humana.

### Como o mercado lida
Mesmas referências anteriores seguem válidas (AI Dungeon, Character.ai, SillyTavern, NovelAI) e reforçam a necessidade de multi-layer memory (permanente + arco + curto prazo) e RAG.

---

## Problema 2: Sistema Parafraseia ao Invés de Criar Personagens

**Status (11/12):** Parcial. O prompt foi fortalecido, porém ainda não há classificador de intenção nem deduplicação automática.

### O que melhorou
- `buildGameMasterPrompt` agora lista TODOS os NPCs já existentes e exige `newCharacterData` quando um nome inédito fala (linhas 314–356).
- `transformRawResponse()` injeta automaticamente novos personagens retornados dentro dos diálogos (`newCharacterData`) em `stateUpdates.newCharacters`.

```typescript
if (msg.type === 'dialogue' && msg.newCharacterData) {
  const newChar = transformNewCharacterData(charData);
  raw.stateUpdates.newCharacters.push(newChar);
}
```

### Onde ainda falha
1. **Detecção de intenção**: `handleSendMessage` envia texto bruto sem classificar se o jogador quer criar/encontrar alguém, então a IA ainda pode ignorar pedidos como "Procuro um ferreiro".
2. **Deduplicação inexistente**: ao reapresentar "o velho da taverna", um novo ID é criado porque não há checagem antes de inserir no mapa (`useGameEngine.ts` linhas 455–466).
3. **Sem entidade mínima**: Character interface ainda não possui campos de personalidade, objetivos, etc., deixando os NPCs similares demais entre turnos longos.

### Próximos passos sugeridos
- Implementar classificador de intenção (dialogue/action/creation/request) para acionar prompts específicos.
- Validar novos NPCs antes de salvar (nome aproximado + localização) para evitar clones.
- Estender `Character`/`NPCProfile` com personalidade/speechPattern para manter consistência narrativa.

---

## Problema 3: IA Cria Diálogos Pelo Jogador

**Status (11/12):** Resolvido.

### Evidências do fix
- `handleSendMessage` envia exatamente o texto digitado (`userMsg.text = rawText`) e `processPlayerMessage` não é mais invocado em lugar nenhum.
- Após receber a resposta, `useGameEngine` monta uma lista de nomes proibidos (player name, tokens normalizados, traduções de "você") e filtra quaisquer diálogos cujo `characterName` coincida com essa lista antes de salvar nas mensagens.
- O prompt do GM contém regras explícitas de agência (linhas 358–369) proibindo senderName do jogador.

```typescript
const userMsg: ChatMessage = {
  senderId: currentStoryRef.playerCharacterId,
  text: rawText,
  type: MessageType.DIALOGUE
};

const filteredMessages = (response.messages || []).filter(m => {
  if (m.type !== 'dialogue') return true;
  return !isForbiddenSpeaker(m.characterName);
});
```

### Recomendações finais
- Manter telemetria nos `console.warn('[Player Agency] Blocked...')` para medir se o LLM volta a infringir as regras.
- Avaliar remoção do import morto `processPlayerMessage` para evitar regressão futura.

---

## Problemas Arquiteturais Adicionais

### 4. NPCs Não São Deduplicados
**Status:** Em aberto.

Mesmo após o ajuste no prompt, o client continua adicionando novos NPCs sem comparar IDs/nome/local.
```typescript
response.stateUpdates.newCharacters.forEach(c => {
  next.characters[c.id] = {
    ...c,
    avatarColor: colors[Math.floor(Math.random() * colors.length)]
  };
});
```
➡️ Falta um guard (nome aproximado + localização) para evitar clones.

### 5. Heavy Context Atualiza Tarde Demais
**Status:** Em aberto.

O update continua ocorrendo somente **após** o turno, bloqueando a UI e impedindo que o próprio turno use o novo contexto.
```typescript
setIsUpdatingContext(true);
const contextUpdate = await updateHeavyContext(...);
// aplica após o GM responder
```
Solução proposta continua sendo mover a atualização para o backend antes da resposta final ou usar pipeline paralelo.

### 6. Personalidade de NPC Não Persiste
**Status:** Em aberto.

`Character` ainda só traz aparência, stats e inventário. Sem `personality`, `speechPattern`, `goals` ou memória, o GM tem pouca âncora para manter consistência.

### 7. Voice Tone Gerado Mas Não Usado
**Status:** Resolvido.

`ChatBubble` usa `message.voiceTone` ao chamar `generateSpeech()` e respeita a voz escolhida pelo jogador, então o dado deixou de ser "ruído".

### 8. Sem Monitoramento de Tokens
**Status:** Em aberto.

Ainda não há coleta de métricas de custo (prompt/completion) nem alertas antes de atingir limites da OpenAI.

### 9. Model ID Potencialmente Incorreto
**Status:** Em aberto.

`const MODEL_ID = 'gpt-4.1';` continua hardcoded. O SDK oficial não expõe esse alias; usar IDs suportados (`gpt-4.1-mini`, `gpt-4o`) ou tornar configurável via env.

**Arquivo:** `services/ai/openaiClient.ts:19`
```typescript
const MODEL_ID = 'gpt-4.1';  // Este modelo não existe oficialmente
```

---

## Soluções Detalhadas

### Solução 1: Sistema de Memória em Camadas
**Status:** Em aberto (nenhuma camada adicional implementada).

Implementar arquitetura de memória inspirada no ChatGPT e AI Dungeon:

```typescript
// types.ts - Nova estrutura de memória
interface GameMemory {
  // Camada 1: Fatos Permanentes (nunca expiram)
  permanentFacts: {
    worldLore: string[];           // Regras do universo
    majorDecisions: string[];      // Escolhas importantes do jogador
    characterDeaths: string[];     // Mortes permanentes
  };

  // Camada 2: Personagens Conhecidos
  knownCharacters: {
    [characterId: string]: {
      name: string;
      relationship: 'ally' | 'enemy' | 'neutral' | 'unknown';
      lastInteraction: string;     // Resumo do último encontro
      importantFacts: string[];    // 3-5 fatos sobre este personagem
      firstMetTurn: number;
      personality: string[];
      speechPattern: string;
    };
  };

  // Camada 3: Resumos de Arco (rolling summaries)
  arcSummaries: {
    arcNumber: number;
    turnRange: [number, number];
    summary: string;               // Resumo de ~20 turnos
    keyEvents: string[];
    npcsIntroduced: string[];
    locationsVisited: string[];
  }[];

  // Camada 4: Localizações Visitadas
  locationMemories: {
    locationId: string;
    discoveries: string[];
    events: string[];
    npcsPresent: string[];
  }[];

  // Camada 5: Heavy Context (expandido)
  heavyContext: EnhancedHeavyContext;
}

interface EnhancedHeavyContext {
  currentMission?: string;
  activeProblems?: string[];
  currentConcerns?: string[];
  importantNotes?: string[];

  // NOVOS CAMPOS
  knownSecrets?: string[];
  promisesMade?: { to: string; what: string }[];
  debts?: { with: string; amount: string }[];
  enemiesMade?: string[];
  alliesMade?: string[];
  narrativeSummary?: string;       // Resumo geral da história
}
```

### Solução 2: Sumarização Progressiva Automática
**Status:** Em aberto (não há prompts/cron jobs de resumo a cada 20 turnos).

```typescript
// services/ai/prompts/summarization.prompt.ts
export async function summarizeArc(
  apiKey: string,
  messages: ChatMessage[],
  language: string
): Promise<ArcSummary> {
  const prompt = `
    Analyze these ${messages.length} RPG messages and create a concise summary.

    EXTRACT:
    1. Key events that happened
    2. Important decisions the player made
    3. New characters introduced (name + 1 sentence description)
    4. Changes in relationships
    5. Items gained or lost
    6. Locations visited
    7. Promises made or received
    8. Secrets discovered

    Keep the summary under 500 words. Focus on what would be
    important to remember in future sessions.

    Messages:
    ${messages.map(m => `[${m.senderName}]: ${m.text}`).join('\n')}
  `;

  // ... chamar LLM
}

// Trigger automático a cada 20 turnos
// openaiClient.ts
if (gameState.messages.length % 20 === 0 && gameState.messages.length > 0) {
  const recentMessages = gameState.messages.slice(-20);
  const summary = await summarizeArc(apiKey, recentMessages, language);
  gameState.memory.arcSummaries.push(summary);
}
```

### Solução 3: Classificador de Intenção do Input
**Status:** Em aberto (handleSendMessage ainda trata todo input como diálogo).

Separar processamento de input por tipo de intenção:

```typescript
// services/ai/intentClassifier.ts
interface PlayerIntent {
  type: 'dialogue' | 'action' | 'creation_request' | 'query' | 'narration';
  originalText: string;
  shouldParaphrase: boolean;
  entityToCreate?: {
    type: 'character' | 'location' | 'item';
    suggestedName?: string;
  };
}

export async function classifyPlayerIntent(
  apiKey: string,
  rawInput: string,
  gameState: GameState
): Promise<PlayerIntent> {
  const prompt = `
    Classify the player's input into one of these categories:

    1. DIALOGUE - Player is speaking as their character to NPCs
       Example: "Olá, como você está?"

    2. ACTION - Player is performing a physical action
       Example: "Ataco o goblin", "Examino a porta"

    3. CREATION_REQUEST - Player wants to create/find/meet someone or something
       Example: "Encontro um ferreiro", "Quero criar um elfo chamado Legolas"

    4. QUERY - Player is asking about the world/game state
       Example: "O que há nesta sala?", "Quem está aqui?"

    5. NARRATION - Player is describing what happens (collaborative storytelling)
       Example: "O sol se põe no horizonte"

    Player input: "${rawInput}"

    IMPORTANT:
    - If input mentions finding/meeting/creating someone NEW → CREATION_REQUEST
    - If input is in quotes or clearly speech → DIALOGUE
    - If input describes physical action → ACTION

    Return JSON: {
      "type": "DIALOGUE|ACTION|CREATION_REQUEST|QUERY|NARRATION",
      "shouldParaphrase": true/false,
      "entityToCreate": { "type": "character|location|item", "suggestedName": "..." } // only if CREATION_REQUEST
    }
  `;

  // ... chamar LLM
}
```

**Fluxo Revisado:**
```
Input → classifyPlayerIntent() →
  SE DIALOGUE → processPlayerMessage() → GM (com limites)
  SE ACTION → direto para GM (sem paráfrase)
  SE CREATION_REQUEST → instruir GM a criar entidade
  SE QUERY → GM responde como narrador
  SE NARRATION → direto para GM
```

### Solução 4: Instruções Explícitas de Criação de NPCs
**Status:** Implementado parcialmente (prompt atualizado, mas sem dedupe automático).

Adicionar ao `gameMaster.prompt.ts`:

```typescript
const npcCreationInstructions = `
=== REGRAS DE CRIAÇÃO DE PERSONAGENS (CRÍTICO) ===

PERSONAGENS QUE JÁ EXISTEM NO JOGO (NÃO RECRIAR):
${Object.values(gameState.characters).map(c =>
  `- "${c.name}" (ID: ${c.id}) - ${c.description.substring(0, 50)}...`
).join('\n')}

QUANDO CRIAR UM NOVO PERSONAGEM (populate newCharacters):
1. Jogador ENCONTRA alguém novo (entra em sala com NPCs, aborda estranhos)
2. Um personagem é MENCIONADO PELO NOME pela primeira vez em diálogo
3. Alguém APARECE na cena (guardas chegam, mercador se aproxima)
4. Jogador PERGUNTA SOBRE alguém ("Quem é o ferreiro?")
5. Jogador BUSCA alguém ("Procuro um curandeiro")

QUANDO NÃO CRIAR (use existente ou apenas narração):
1. Personagem já existe na lista acima
2. Personagem é apenas referenciado historicamente ("meu pai falecido")
3. Grupos genéricos ("a multidão aplaude") - a menos que jogador interaja

OBRIGATÓRIO PARA NOVOS PERSONAGENS:
- Gerar ID ÚNICO (formato: npc_${turnCount}_${name}_${random4digits})
- Descrição deve ser ORIGINAL e DETALHADA (2-3 frases)
- Incluir pelo menos 3 stats relevantes
- Incluir inventário inicial apropriado ao papel
- Definir estado inicial ('idle', 'talking', 'working', etc.)
- Personalidade específica (3 traços)

REGRAS ANTI-PARÁFRASE:
- NUNCA descreva encontro com novo personagem sem adicioná-lo a newCharacters
- Se você escreve "Você vê um mercador" → o mercador DEVE estar em newCharacters
- Se um NPC fala → ele DEVE existir em characters ou newCharacters
`;
```

### Solução 5: Regras de Player Agency (CRÍTICO)

Adicionar ao `gameMaster.prompt.ts`:

```typescript
const playerAgencyRules = `
=== REGRAS DE AGÊNCIA DO JOGADOR (CRÍTICO - NUNCA VIOLAR) ===

O JOGADOR É O ÚNICO QUE DECIDE:
- O que seu personagem DIZ
- O que seu personagem FAZ
- O que seu personagem PENSA
- Como seu personagem REAGE emocionalmente

VOCÊ (GM) NUNCA DEVE:
❌ Escrever diálogos do personagem do jogador
❌ Descrever ações que o jogador não solicitou explicitamente
❌ Assumir decisões do jogador
❌ Continuar uma conversa falando pelo jogador
❌ Descrever pensamentos ou sentimentos do jogador
❌ Fazer o jogador "automaticamente" responder a NPCs
❌ Usar senderName igual ao nome do personagem do jogador

VOCÊ (GM) DEVE:
✅ Descrever o ambiente e reações dos NPCs
✅ PARAR e AGUARDAR input quando NPCs fazem perguntas ao jogador
✅ Descrever CONSEQUÊNCIAS das ações do jogador, não ações adicionais
✅ Terminar sua resposta convidando o jogador a agir

FORMATO DE RESPOSTA:
- Termine SEMPRE com situação que REQUER decisão do jogador
- Nunca termine com o jogador já tendo respondido/agido
- Use "[Aguardando sua ação]" ou similar se apropriado

EXEMPLO ERRADO:
NPC: "Você aceita a missão?"
Jogador: "Sim, aceito!" ← NÃO FAÇA ISSO

EXEMPLO CORRETO:
NPC: "Você aceita a missão?"
[O NPC aguarda sua resposta com expectativa]

NOMES PROIBIDOS PARA senderName: "${player.name}", qualquer variação do nome do jogador
`;
```

### Solução 6: Remover/Limitar Processamento de Mensagem

**Opção A - Remover Completamente (Recomendado):**

```typescript
// hooks/useGameEngine.ts - handleSendMessage
const handleSendMessage = async (directMessage?: string, fateResult?: FateResult) => {
  const rawText = directMessage || inputValue;

  // REMOVER: const processedMessage = await processPlayerMessage(...)

  // Usar texto raw diretamente
  const userMsg: ChatMessage = {
    id: Date.now().toString(),
    senderId: currentStoryRef.playerCharacterId,
    text: rawText,  // Texto ORIGINAL do jogador
    type: MessageType.DIALOGUE,
    timestamp: Date.now(),
    voiceTone: 'neutral'
  };

  // ...resto do código
};
```

**Opção B - Tornar Configurável:**

```typescript
// types.ts
interface GameConfig {
  // ...existente...

  /**
   * Controla como mensagens do jogador são processadas:
   * - 'raw': Usa exatamente o que jogador digitou (RECOMENDADO)
   * - 'format': Apenas formatação mínima (pontuação, capitalização)
   * - 'adapt': Adapta ao estilo do universo (comportamento atual)
   */
  playerInputMode: 'raw' | 'format' | 'adapt';
}
```

**Opção C - Limitar Estritamente (se manter processamento):**

```typescript
// playerMessageProcessing.prompt.ts - Novo prompt restritivo
const strictAdaptationPrompt = `
Você é um formatador MÍNIMO, não reescritor.

REGRAS ESTRITAS:
1. NUNCA adicione informação que o jogador não disse
2. NUNCA mude o significado ou intenção
3. APENAS ajuste vocabulário básico para o cenário
4. Se o input é curto, a saída DEVE ser curta
5. Se o jogador disse "ok", retorne "Ok" - NÃO elabore

PROIBIDO:
- Adicionar ações não mencionadas
- Expandir "sim" para uma frase longa
- Adicionar emoções não expressas
- Adicionar detalhes não fornecidos
- Mudar "oi" para "Salve, nobre viajante!"

EXEMPLOS:
Input: "oi"         → Output: "Oi."
Input: "sim"        → Output: "Sim."
Input: "atacar"     → Output: "Atacar." (ou original)
Input: "olá amigo"  → Output: "Olá, amigo."

INPUT: "${rawInput}"
OUTPUT: Versão formatada SEM adicionar conteúdo
`;
```

### Solução 7: Validação Pós-Resposta do GM

```typescript
// services/ai/validators/responseValidator.ts
export function validateGMResponse(
  response: GMResponse,
  playerCharacterName: string
): GMResponse {
  // 1. Filtrar mensagens que falam pelo jogador
  const filteredMessages = response.messages.filter(msg => {
    if (msg.senderName.toLowerCase() === playerCharacterName.toLowerCase()) {
      console.warn('GM tentou falar pelo jogador - removido:', msg.text);
      return false;
    }
    return true;
  });

  // 2. Verificar narrativa por ações não solicitadas do jogador
  const narratorMessages = filteredMessages.filter(m => m.senderName === 'Narrator');
  narratorMessages.forEach(msg => {
    const patterns = [
      `${playerCharacterName} disse`,
      `${playerCharacterName} respondeu`,
      `você disse`,
      `você respondeu`,
      `você decide`,
      `você aceita`,
    ];

    patterns.forEach(pattern => {
      if (msg.text.toLowerCase().includes(pattern.toLowerCase())) {
        console.warn('Narrativa contém ação não solicitada do jogador:', pattern);
        // Opcionalmente remover ou marcar
      }
    });
  });

  return { ...response, messages: filteredMessages };
}
```

### Solução 8: Sistema de Deduplicação de NPCs

```typescript
// services/ai/validators/characterValidator.ts
export function validateNewCharacter(
  newChar: Partial<Character>,
  existingCharacters: Character[]
): { isValid: boolean; issues: string[]; matchedCharacter?: Character } {
  const issues: string[] = [];
  const newNameLower = newChar.name?.toLowerCase() || '';

  for (const existing of Object.values(existingCharacters)) {
    const existingNameLower = existing.name.toLowerCase();

    // Match exato
    if (existingNameLower === newNameLower) {
      return {
        isValid: false,
        issues: [`Personagem "${newChar.name}" já existe`],
        matchedCharacter: existing
      };
    }

    // Match parcial (ex: "velho" em "velho sábio")
    if (existingNameLower.includes(newNameLower) ||
        newNameLower.includes(existingNameLower)) {
      return {
        isValid: false,
        issues: [`Nome similar a personagem existente: ${existing.name}`],
        matchedCharacter: existing
      };
    }
  }

  return { isValid: true, issues: [] };
}
```

### Solução 9: Implementar RAG com Embeddings (Avançado)

Para jogos muito longos:

```typescript
// services/ai/memory/vectorStore.ts
interface EmbeddedMemory {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    turnNumber: number;
    speaker: string;
    type: 'dialogue' | 'narration' | 'event';
    characters: string[];
  };
}

export async function embedMessage(apiKey: string, text: string): Promise<number[]> {
  const openai = new OpenAI({ apiKey });
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  });
  return response.data[0].embedding;
}

export async function findRelevantContext(
  apiKey: string,
  query: string,
  embeddings: EmbeddedMemory[],
  topK: number = 5
): Promise<string[]> {
  const queryEmbedding = await embedMessage(apiKey, query);

  const scored = embeddings.map(e => ({
    text: e.content,
    score: cosineSimilarity(queryEmbedding, e.embedding)
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(s => s.text);
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}
```

### Solução 10: Character Cards Expandidos para NPCs

```typescript
// types.ts - NPCProfile expandido
interface NPCProfile {
  id: string;
  name: string;

  // Identidade
  appearance: string;
  personality: string[];      // ["sarcástico", "leal", "desconfiado"]
  speechPattern: string;      // "Fala em rimas", "Usa gírias"
  voiceDescription: string;   // Para TTS

  // Comportamento
  goals: string[];
  fears: string[];
  secrets: string[];
  quirks: string[];

  // Memória do NPC
  knownFacts: string[];       // O que este NPC sabe
  relationshipToPlayer: string;
  opinionOfPlayer: number;    // -100 a 100

  // Histórico
  firstAppearance: number;    // Turno em que apareceu
  lastInteraction: number;
  interactionHistory: string[]; // Resumo das interações
}
```

---

## Arquitetura Recomendada

### Fluxo de Turno Melhorado

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE TURNO MELHORADO                     │
└─────────────────────────────────────────────────────────────────┘

1. JOGADOR ENVIA INPUT
   └─ Texto raw do jogador

2. CLASSIFICAR INTENÇÃO
   ├─ DIALOGUE → Processamento mínimo (ou nenhum)
   ├─ ACTION → Direto para GM
   ├─ CREATION_REQUEST → Instruir GM a criar
   ├─ QUERY → GM responde como narrador
   └─ NARRATION → Direto para GM

3. CONSTRUIR CONTEXTO RICO
   ├─ Últimas 15-20 mensagens (contexto imediato)
   ├─ Resumos de arcos anteriores (contexto médio)
   ├─ Heavy Context expandido (contexto longo)
   ├─ Lista COMPLETA de personagens existentes
   ├─ Memórias de NPCs relevantes
   └─ [Opcional] Memórias via RAG

4. GAME MASTER PROCESSA
   ├─ Regras de Player Agency ATIVAS
   ├─ Instruções de criação de NPCs
   ├─ Proibição de falar pelo jogador
   └─ Retorna resposta estruturada

5. VALIDAR RESPOSTA
   ├─ Remover diálogos do jogador gerados
   ├─ Validar novos personagens contra existentes
   ├─ Deduplicar NPCs
   └─ Verificar se resposta aguarda jogador

6. ATUALIZAR MEMÓRIA
   ├─ Atualizar Heavy Context
   ├─ Atualizar memórias de NPCs
   ├─ Compactar mensagens antigas (se >30 msgs)
   ├─ Criar resumo de arco (se múltiplo de 20)
   └─ [Opcional] Indexar para RAG

7. EXIBIR E AGUARDAR
   ├─ Mostrar resposta do GM
   ├─ Indicar claramente: "Sua vez"
   └─ NÃO processar automaticamente
```

### Diagrama de Contexto

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESTRUTURA DE CONTEXTO                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SYSTEM PROMPT                                                   │
│ ├─ Regras do universo                                          │
│ ├─ Player Agency Rules                                         │
│ ├─ NPC Creation Rules                                          │
│ └─ Anti-paraphrase Rules                                       │
├─────────────────────────────────────────────────────────────────┤
│ NARRATIVE SUMMARY (se existir)                                  │
│ └─ Resumo de arcos anteriores (~200 tokens)                    │
├─────────────────────────────────────────────────────────────────┤
│ HEAVY CONTEXT EXPANDIDO                                         │
│ ├─ Missão atual                                                │
│ ├─ Problemas ativos                                            │
│ ├─ Personagens conhecidos                                      │
│ ├─ Locais visitados                                            │
│ └─ Segredos/Promessas                                          │
├─────────────────────────────────────────────────────────────────┤
│ KNOWN CHARACTERS (lista completa)                               │
│ └─ Nome, ID, descrição curta de TODOS os NPCs                  │
├─────────────────────────────────────────────────────────────────┤
│ CHARACTERS PRESENT (na cena atual)                              │
│ └─ Detalhes completos dos NPCs presentes                       │
├─────────────────────────────────────────────────────────────────┤
│ RECENT MESSAGES (últimas 15-20)                                 │
│ └─ Histórico recente completo                                  │
├─────────────────────────────────────────────────────────────────┤
│ CURRENT INPUT                                                   │
│ └─ Ação/fala do jogador                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Plano de Implementação

### Fase 1: Correções Críticas (P0) - Impacto Imediato

| # | Tarefa | Arquivo | Esforço | Impacto |
|---|--------|---------|---------|---------|
| 1.1 | Adicionar Player Agency Rules ao GM prompt | `gameMaster.prompt.ts` | 1h | Crítico |
| 1.2 | Adicionar NPC Creation Instructions | `gameMaster.prompt.ts` | 1h | Alto |
| 1.3 | Remover/limitar processPlayerMessage | `useGameEngine.ts` | 2h | Crítico |
| 1.4 | Adicionar lista de personagens existentes no prompt | `gameMaster.prompt.ts` | 30min | Alto |
| 1.5 | Implementar validação pós-resposta | `openaiClient.ts` | 2h | Alto |

**Tempo estimado Fase 1:** 6-8 horas

### Fase 2: Melhorias de Memória (P1)

| # | Tarefa | Arquivo | Esforço | Impacto |
|---|--------|---------|---------|---------|
| 2.1 | Expandir Heavy Context com novos campos | `types.ts`, `heavyContext.prompt.ts` | 3h | Alto |
| 2.2 | Aumentar janela de contexto para 15-20 msgs | `openaiClient.ts` | 30min | Médio |
| 2.3 | Implementar deduplicação de NPCs | `useGameEngine.ts` | 2h | Médio |
| 2.4 | Adicionar classificador de intenção | Novo arquivo | 4h | Alto |

**Tempo estimado Fase 2:** 10-12 horas

### Fase 3: Sistema de Memória Avançado (P2)

| # | Tarefa | Arquivo | Esforço | Impacto |
|---|--------|---------|---------|---------|
| 3.1 | Implementar sumarização progressiva | Novo arquivo | 6h | Alto |
| 3.2 | Criar estrutura GameMemory completa | `types.ts` | 4h | Alto |
| 3.3 | Expandir Character para NPCProfile | `types.ts` | 2h | Médio |
| 3.4 | Atualizar UI para nova estrutura | Vários | 4h | Médio |

**Tempo estimado Fase 3:** 16-20 horas

### Fase 4: Features Avançadas (P3)

| # | Tarefa | Esforço | Impacto |
|---|--------|---------|---------|
| 4.1 | Implementar RAG com embeddings | 16-24h | Alto |
| 4.2 | Knowledge Graph de entidades | 12-16h | Alto |
| 4.3 | Sistema de pensamento interno para NPCs | 4h | Médio |
| 4.4 | Modos de input (do/say/story) | 8h | Médio |

---

## Métricas de Sucesso

### Testes de Validação

| Teste | Descrição | Critério de Sucesso |
|-------|-----------|---------------------|
| **Contexto Longo** | Criar NPC no turno 1, verificar se é lembrado no turno 50 | NPC reconhecido sem reapresentação |
| **Criação de Personagem** | Input: "Quero encontrar um ferreiro chamado João" | Novo NPC criado em `newCharacters`, não paráfrase |
| **Player Agency** | NPC faz pergunta ao jogador | GM para e aguarda input, não responde pelo jogador |
| **Deduplicação** | Mencionar mesmo NPC de formas diferentes | Sistema reconhece como mesmo personagem |
| **Memória de NPC** | Conversar com NPC, voltar após 20 turnos | NPC lembra interação anterior |

### Métricas Quantitativas

| Métrica | Antes | Meta |
|---------|-------|------|
| Personagens "esquecidos" por sessão | Alto | < 1 |
| Diálogos gerados pelo player sem input | Frequente | 0 |
| NPCs mencionados mas não criados | ~40% | < 5% |
| NPCs duplicados criados | Frequente | 0 |
| Contexto útil no prompt | ~10 msgs | 15-20 msgs + resumos |

---

## Referências e Pesquisas

### Artigos e Tutoriais

- [Ian Bicking - Roleplaying driven by an LLM: observations & open questions](https://ianbicking.org/blog/2024/04/roleplaying-by-llm)
- [How to Build an AI Dungeon Master for Tabletop RPGs](https://medium.com/@kgiannopoulou4033/how-to-build-an-ai-dungeon-master-for-tabletop-rpgs-548b7dd6d1ee)
- [Marc Ueberall - Generating Believable Characters and NPCs using LLM](https://www.marcueberall.com/generating-believable-characters-and-npcs-using-llm/)
- [How I Built an LLM-Based Game from Scratch](https://towardsdatascience.com/how-i-built-an-llm-based-game-from-scratch-86ac55ec7a10/)
- [Top techniques to Manage Context Lengths in LLMs](https://agenta.ai/blog/top-6-techniques-to-manage-context-length-in-llms)
- [How Should I Manage Memory for my LLM Chatbot?](https://www.vellum.ai/blog/how-should-i-manage-memory-for-my-llm-chatbot)

### Sistemas de Referência

- [AI Dungeon - Memory System](https://help.aidungeon.com/faq/the-memory-system)
- [AI Dungeon - Context Composition](https://help.aidungeon.com/faq/what-goes-into-the-context-sent-to-the-ai)
- [Character.ai - Inference Optimization](https://research.character.ai/optimizing-inference/)
- [SillyTavern - Smart Context](https://docs.sillytavern.app/extensions/smart-context/)
- [SillyTavern - Character Design](https://docs.sillytavern.app/usage/core-concepts/characterdesign/)
- [NovelAI - Chat Format](https://docs.novelai.net/en/text/chatformat/)
- [RPGGO - Text-to-Game Framework](https://blog.rpggo.ai/2025/02/21/technical-overview-rpggos-text-to-game-framework-for-ai-rpg/)

### Papers Acadêmicos

- [Character-LLM: A Trainable Agent for Role-Playing](https://arxiv.org/html/2310.10158v2)
- [Prompt Framework for Role-playing: Generation and Evaluation](https://arxiv.org/html/2406.00627v1)
- [From Role-Play to Drama-Interaction: An LLM Solution](https://arxiv.org/html/2405.14231v1)
- [Player-Driven Emergence in LLM-Driven Game Narrative](https://arxiv.org/html/2404.17027v3)
- [RPGBench - Evaluating LLMs as RPG Engines](https://arxiv.org/html/2502.00595v1)
- [The Effect of Context-aware LLM-based NPC Dialogues on Player Engagement](https://projekter.aau.dk/projekter/files/536738243/)

### Repositórios de Referência

- [awesome-llm-role-playing-with-persona](https://github.com/Neph0s/awesome-llm-role-playing-with-persona)
- [Interactive-LLM-Powered-NPCs](https://github.com/AkshitIreddy/Interactive-LLM-Powered-NPCs)
- [long-memory-character-chat](https://github.com/Caellwyn/long-memory-character-chat)
- [XTalk Framework - RPGGO](https://github.com/RPGGO-AI/XTalk/blob/main/doc/Tech_Debrief.md)

### Discussões da Comunidade

- [OpenAI Developer Community - RPG Games with GPT](https://community.openai.com/t/using-gpt-for-text-based-adventure-game-rpg-game-master/693985)
- [How to Stop Character AI from Writing as Your Persona](https://www.roborhythms.com/stop-character-ai-writing-as-your-persona/)
- [Robo Rhythms - Fixing Roleplay Problems](https://www.roborhythms.com/prompt-fixes-janitor-ai-roleplay-problems/)
- [D&D Prompt Template](https://deckofdmthings.wordpress.com/2023/03/05/the-prompt-that-makes-chat-gpt-a-dungeon-master/)

---

## Conclusão

Os três problemas reportados pelo usuário têm causas raiz identificáveis no código:

| Problema | Causa Raiz | Solução Principal |
|----------|------------|-------------------|
| **Contexto** | Janela de 10 msgs + Heavy Context limitado | Sistema de memória em camadas + sumarização |
| **Personagens** | Falta de instruções de criação + processamento indiscriminado | Classificador de intenção + instruções explícitas |
| **Agência** | Ausência de regras + input reescrito | Player Agency Rules + remover/limitar processamento |

As soluções de **Fase 1 (P0)** podem ser implementadas em **6-8 horas** e terão **impacto imediato** na experiência do usuário. Recomenda-se começar por:

1. **Adicionar Player Agency Rules** - Impede GM de falar pelo jogador
2. **Remover processPlayerMessage** - Preserva input original do jogador
3. **Adicionar NPC Creation Instructions** - Instrui quando criar novos NPCs

Estas três mudanças resolvem diretamente as reclamações do usuário com esforço mínimo.

---

*Documento consolidado a partir de análises de 5 branches independentes*
*Gerado em: 2025-12-11*
*Versão: 1.0*
