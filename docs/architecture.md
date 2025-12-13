# Arquitetura Técnica – storywell.games 1.4.7

> Última revisão: 13/12/2025

Este documento explica como o motor transforma o input do jogador em narrativa jogável usando apenas o navegador, IndexedDB e a pilha de prompts em `services/ai/prompts/`.

---

## 1. Visão geral do turno

```
┌──────────────┐   ┌─────────────────────────┐   ┌───────────────────────┐
│ Player Input │─►│ Context Assembly (React) │─►│ GPT-4.1 (GM Prompt)   │
└──────────────┘   └─────────────────────────┘   └───────────┬───────────┘
                                                            │
                                      ┌─────────────────────▼─────────────────────┐
                                      │ GMResponse + Fate Result + State Updates │
                                      └───────────────┬──────────────────────────┘
                                                      │
                           ┌──────────────────────────▼──────────────────────────┐
                           │ Persistência (IndexedDB) + Heavy Context + UI Render │
                           └──────────────────────────────────────────────────────┘
```

1. **Entrada** (`ActionInput`): texto livre ou sugestão escolhida. Caso seja "Outro", `analyzeCustomAction` calcula chances antes do envio.
2. **Montagem de contexto** (`useGameEngine`): agrega últimas 100 mensagens, `heavyContext`, `universeContext`, snapshots do grid, inventário, stats e instruções narrativas (`narrativeStyles`).
3. **Processamento** (`generateGameTurn` → `buildGameMasterPrompt`): GPT-4.1 recebe o estado completo + `fateResult`. A resposta precisa seguir `gmResponseSchema`.
4. **Atualização**: `useGameEngine` aplica `stateUpdates`, salva no IndexedDB (`dbService.saveGame`), dispara `updateHeavyContext`, `gridUpdate.prompt.ts` e pré-carrega novas ações (`generateActionOptions`).

---

## 2. Papéis dos prompts

| Etapa | Prompt | Arquivo | Modelo |
| --- | --- | --- | --- |
| Classificar fala/ação | `buildPlayerMessageProcessingPrompt` | `playerMessageProcessing.prompt.ts` | gpt-4.1-nano |
| Loop principal | `buildGameMasterPrompt` | `gameMaster.prompt.ts` | gpt-4.1 |
| Memória persistente | `buildHeavyContextPrompt` | `heavyContext.prompt.ts` | gpt-4.1-mini |
| Análise de ações customizadas | `buildCustomActionAnalysisPrompt` | `customActionAnalysis.prompt.ts` | gpt-4.1-mini (temp 0) |
| Opções com probabilidades | `buildActionOptionsPrompt` | `actionOptions.prompt.ts` | gpt-4.1-nano |
| Grid 10x10 | `buildGridUpdatePrompt` | `gridUpdate.prompt.ts` | gpt-4.1-mini |
| Onboarding/Setup | `buildOnboardingPrompt`, `buildStoryInitializationPrompt`, `buildUniverseContextPrompt` | `prompts/` | gpt-4.1 |

Todos os builders retornam strings prontas para `queryLLM`, acompanhadas de schemas JSON (quando aplicável). Isso garante que respostas inválidas sejam detectadas imediatamente.

---

## 3. Componentes-chave do front-end

| Componente | Função | Detalhes técnicos |
| --- | --- | --- |
| `ActionInput` | Painel de ações e Fate | Cacheia opções (`fetchActionOptionsWithCache`), chama `rollFate`, controla o modal de análise customizada. |
| `StoryCard` | Render de narrativa | Integra o chat, controles de TTS/STT e o flip para o `GridMap`. |
| `GridMap` | Mapa 10x10 | Renderiza `gridSnapshots` e destaca player/NPCs com tooltips. |
| `FateToast` | Feedback de destino | Sincroniza evento positivo/negativo com cores/sons. |
| `VoiceInput` | Speech-to-Text | Usa Whisper direto do navegador, sem backend.

Hooks importantes:
- `useGameEngine`: orquestra prompts, salva no IndexedDB, atualiza heavyContext, pré-carrega ações e controla o fluxo de loading.
- `useCardNavigation`: acesso rápido ao histórico via teclado/swipe.
- `useThemeColors`: aplica paletas dinâmicas geradas pela IA.

---

## 4. Persistência (IndexedDB Data Mapper)

`services/db.ts` (DB_VERSION = 3) decompõe o `GameState` em seis object stores:

| Store | Conteúdo | Observações |
| --- | --- | --- |
| `games` | Metadados da campanha (title, turnCount, config, ponteiros) | KeyPath `id`. |
| `characters` | Jogador + NPCs com stats, `inventory: Item[]`, `avatarBase64` | Index `by_game_id`. |
| `locations` | Grafo de locais com `connectedLocationIds`, `backgroundImage` | Index `by_game_id`. |
| `messages` | Histórico de chat (ordenado por timestamp) | Sanitizado por `sanitizeMessages` para remover duplicados. |
| `events` | Logs semânticos (`GameEvent`) | Base para futuros resumos/RAG. |
| `grids` | `GridSnapshot` (posições x,y por mensagem) | Alimenta o `GridMap` e o painel tático.

Operações relevantes:
- `saveGame`: inicia transação única (`games`, `characters`, `locations`, `messages`, `events`, `grids`). Cada entidade recebe `gameId` antes de ser persistida.
- `loadGame`: consulta paralela (`Promise.all`) por `gameId`, ordena mensagens/grids e hidrata o `GameState`. Duplicidades encontradas são limpas e o estado é salvo novamente para manter consistência.
- Export/Import: `dbService.exportGame`/+`importGame` adicionam `EXPORT_VERSION` ao payload.

---

## 5. Heavy Context & memória narrativa

- **Heavy Context (`heavyContext.prompt.ts`):** mantém `mainMission`, `currentMission`, `activeProblems`, `currentConcerns`, `importantNotes`, `narrativeThreads` e `pacingState`. O prompt retorna diffs (`set`, `clear`, `add`, `remove`) para cada campo, evitando overwrite completo.
- **Universe Context (`universeContext.prompt.ts`):** gerado uma única vez, descreve cultura, moeda, voz dos NPCs e peculiaridades do universo.
- **Narrative Styles (`narrativeStyles.ts`):** combina presets de gênero, regras “show, don’t tell”, templates de voz e contexto de pacing para injetar no GM prompt.

Esses blocos são enviados a cada turno, garantindo consistência mesmo quando a janela de tokens do LLM é atingida.

---

## 6. Sistema de Destino (Fate)

1. `generateActionOptions` gera ações com porcentagens e dicas (good/bad hints). Os valores são restringidos a 0–50.
2. Quando o jogador clica, `rollFate` avalia primeiro o "bad range", depois o "good range" e retorna um `FateResult` com `hint` coerente.
3. `fateResult` é injetado no `buildGameMasterPrompt` como bloco `FATE EVENT`, instruindo o GM a garantir um benefício ou penalidade real na narrativa/estado.
4. `analyzeCustomAction` (temperatura 0) gera as porcentagens de uma ação escrita manualmente, exibindo o raciocínio antes da confirmação.

---

## 7. Fluxo detalhado (sequência)

```
Player Action
   │
   ├─► classifyAndProcessPlayerInput (opcional)
   ├─► generateGameTurn (GM prompt + fateResult)
   │      └─► gridUpdate.prompt.ts (avaliar movimento)
   │
   ├─► updateHeavyContext (se necessário)
   ├─► saveGame (IndexedDB)
   ├─► generateActionOptions (para próximo turno)
   └─► analyzeCustomAction (apenas se jogador pedir "Outro")
```

---

## 8. Observabilidade e boas práticas

- **Tracing recomendado:** logar `promptName`, `model`, `tokens`, `latency` e `fateResult` no console (modo dev) para debugging.
- **Controle de versão de prompts:** mantenha comentários `@version` nos builders e documente mudanças relevantes neste arquivo + README.
- **Testes:** `__tests__/services/openaiClient.test.ts` cobre transformações e erros; `tests/core.test.ts` valida assembly dos prompts principais.

---

## 9. Referências relacionadas

- [`docs/analise-sistemas-probabilidades.md`](./analise-sistemas-probabilidades.md) — zoom no pipeline de probabilidades.
- [`docs/database_structure.md`](./database_structure.md) — estrutura completa do IndexedDB.
- [`docs/ITEM_CURRENCY_SYSTEM_PROPOSAL.md`](./ITEM_CURRENCY_SYSTEM_PROPOSAL.md) — evolução planejada para economia e prompts.
