
# Arquitetura Técnica: O Cérebro do storywell.games

Este documento detalha como o sistema processa a entrada do jogador e toma decisões, transformando texto em mecânicas de RPG sem código hard-coded tradicional.

**Versão:** 1.3.0

---

## O Ciclo de Vida de um Turno (The Turn Loop)

O jogo opera em um ciclo estrito de "Input -> Processamento LLM -> Atualização de Estado -> Renderização".

### 1. Entrada do Jogador (Input)
O usuário digita "Eu ataco o goblin com minha espada" ou "Bebo a poção vermelha".
*   **Contexto:** O App coleta não apenas o texto atual, mas também as últimas 100 mensagens e os dados do banco local.
*   **Estado Completo:** Enviamos o Inventário do Jogador, Status (HP/Mana/Gold) e o Inventário/Status dos NPCs ao redor.
*   **Heavy Context:** Inclui missões ativas, problemas, preocupações e notas importantes.
*   **Narrative Context:** Inclui instruções de gênero, pacing e threads narrativas (v1.3.0).

### 2. O Prompt do Sistema (The Logic Engine)
Enviamos tudo para o **GPT-4.1**. O prompt não é apenas narrativo; ele atua como um **Motor de Regras Semântico**.

#### Validação e Resolução de Ações
Antes de narrar, a LLM executa um algoritmo lógico descrito em linguagem natural:
1.  **Viabilidade (Feasibility):**
    *   *Uso de Item:* Se o jogador diz "Bebo a poção", a LLM verifica o array `inventory`. Se a poção não existir, a ação falha narrativamente.
    *   *Magia:* Se o jogador diz "Bola de Fogo", a LLM checa o objeto `stats`. Se `mana < custo`, a magia falha.
    *   *Economia:* Se o jogador tenta comprar algo, verifica se `gold >= preço`.
2.  **Propriedades Ocultas (Hidden Traits):**
    *   Se o item for "Maçã Envenenada", a LLM aplica dano ao HP no `stateUpdates`, mesmo que o jogador não saiba.
3.  **Interação entre Entidades (Ownership):**
    *   Se o jogador tenta pegar um item de um NPC (`npc.inventory`), a LLM julga a reação do NPC baseado em `relationships`.

#### Sistema de Qualidade Narrativa (v1.3.0)
O prompt do GM agora inclui instruções de qualidade narrativa:
1.  **Estilo de Gênero:** Vocabulário, tom, padrões de sentença específicos do gênero selecionado.
2.  **Show, Don't Tell:** Regras para evitar rótulos emocionais diretos.
3.  **Diferenciação de Voz:** Instruções para que cada NPC tenha voz distinta.
4.  **Controle de Pacing:** Nível de tensão atual e recomendações de ritmo.
5.  **Threads Narrativas:** Elementos plantados que podem ser referenciados.

### 3. Banco de Dados Relacional (IndexedDB)
O sistema utiliza o padrão **Data Mapper** para persistência.

#### A Camada "Shadow DB" (IndexedDB)
Ao contrário de salvar um único arquivo JSON, o jogo desmonta o estado em tabelas relacionais:
*   **Tabela `Characters`**: Armazena stats, inventário e *Avatar Base64* de cada NPC.
*   **Tabela `Messages`**: Histórico linear do chat.
*   **Tabela `Locations`**: O grafo de lugares.
*   **Tabela `Events`**: Log semântico para futura implementação de RAG.

Quando o jogo salva (`dbService.saveGame`):
1.  O objeto `GameState` (que o React usa) é "desidratado".
2.  Uma transação abre acesso a todas as `Object Stores`.
3.  Personagens e Locais são salvos individualmente, linkados pelo índice `gameId`.

Quando o jogo carrega (`dbService.loadGame`):
1.  Busca o registro na tabela `Games`.
2.  Faz queries paralelas (`Promise.all`) nas tabelas `Characters`, `Locations`, `Messages` usando o índice `by_game_id`.
3.  "Re-hidrata" o objeto `GameState` para a UI do React funcionar de forma reativa.

### 4. Persistência de Avatares
Imagens geradas (Blobs/Base64) são pesadas. Ao normalizar o banco:
*   Cada personagem carrega sua própria string Base64 na tabela `Characters`.
*   Isso evita que o carregamento da lista de jogos (`loadGames`) fique lento, pois nessa listagem buscamos apenas a tabela `Games` (metadados), sem carregar as imagens pesadas dos personagens.

---

## Sistema de Qualidade Narrativa (v1.3.0)

### Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NARRATIVE QUALITY SYSTEM                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────┐    ┌───────────────┐ │
│  │  GENRE PRESETS   │    │  SHOW/DON'T TELL │    │ VOICE PROFILES │ │
│  │  (15 gêneros)    │    │  (Detecção auto) │    │ (8 templates)  │ │
│  └────────┬─────────┘    └────────┬─────────┘    └───────┬───────┘ │
│           │                       │                       │          │
│           └───────────────────────┼───────────────────────┘          │
│                                   │                                  │
│                    ┌──────────────▼──────────────┐                  │
│                    │ generateNarrativeInstructions│                  │
│                    │      (Combina tudo)         │                  │
│                    └──────────────┬──────────────┘                  │
│                                   │                                  │
│  ┌──────────────────┐             │             ┌──────────────────┐│
│  │  PACING SYSTEM   │◄────────────┼─────────────│ NARRATIVE THREADS││
│  │  (5 níveis)      │             │             │ (Foreshadowing)  ││
│  └──────────────────┘             │             └──────────────────┘│
│                                   │                                  │
│                    ┌──────────────▼──────────────┐                  │
│                    │     GM PROMPT ASSEMBLY      │                  │
│                    │   (System + Narrative)      │                  │
│                    └──────────────┬──────────────┘                  │
│                                   │                                  │
│                    ┌──────────────▼──────────────┐                  │
│                    │    QUALITY ANALYSIS         │                  │
│                    │    (Post-generation)        │                  │
│                    └─────────────────────────────┘                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Fluxo de Instruções Narrativas

1. **Seleção de Gênero**: Quando o universo é criado, o jogador escolhe um gênero (ou é inferido do tipo de universo).

2. **Construção de Instruções**: A função `generateNarrativeInstructions()` combina:
   - Preset do gênero (vocabulário, tom, técnicas)
   - Regras de "mostrar, não contar"
   - Perfis de voz dos NPCs na cena
   - Estado atual de pacing
   - Threads narrativas ativas

3. **Injeção no Prompt**: As instruções são anexadas ao prompt do Game Master antes de cada turno.

4. **Análise Pós-Geração**: Opcionalmente, a resposta pode ser analisada por `buildNarrativeQualityAnalysisPrompt()` para scoring e identificação de problemas.

### Componentes Principais

#### narrativeStyles.ts
*   **GENRE_PRESETS**: 15 presets completos com todas as configurações de estilo.
*   **SHOW_DONT_TELL_RULES**: Regras e exemplos para evitar "contar".
*   **VOICE_TEMPLATES**: 8 templates de voz para NPCs.
*   **generateNarrativeInstructions()**: Função principal que combina tudo.
*   **generatePacingInstructions()**: Gera instruções baseadas no nível de tensão.
*   **generateVoiceDifferentiationInstructions()**: Gera instruções para vozes de NPCs.

#### narrativeQualityAnalysis.prompt.ts
*   **buildNarrativeQualityAnalysisPrompt()**: Prompt para análise completa.
*   **buildQuickShowDontTellCheckPrompt()**: Verificação rápida de violações.
*   **quickClientSideCheck()**: Verificação no cliente sem chamar API.
*   **TELL_NOT_SHOW_INDICATORS**: Listas de indicadores em PT/EN/ES.

#### heavyContext.prompt.ts (Atualizado)
*   Agora rastreia **narrativeThreads** (foreshadowing, callbacks, Chekhov's guns).
*   Inclui **pacingAnalysis** para monitorar ritmo da história.
*   Retorna mudanças incrementais em vez de substituir todo o contexto.

#### universeContext.prompt.ts (Atualizado)
*   Inclui seção de **NPC Voice Archetypes** com padrões de fala por classe social.
*   Recebe **genre** opcional para alinhar estilo com o gênero selecionado.

---

## Memória e Permanência

Como a LLM tem limite de contexto, usamos um padrão de "Estado Atual + Histórico Curto + Heavy Context". A persistência relacional garante que, mesmo que o frontend limpe a memória RAM, os dados de um NPC encontrado há 2 meses ainda residem na tabela `Characters` prontos para serem recuperados.

### Níveis de Contexto

| Nível | Conteúdo | Persistência |
|-------|----------|--------------|
| **Imediato** | Últimas 100 mensagens | Runtime (RAM) |
| **Heavy Context** | Missões, problemas, preocupações | IndexedDB |
| **Universe Context** | Cultura, gírias, economia | IndexedDB |
| **Narrative Threads** | Foreshadowing, callbacks | IndexedDB (via Heavy Context) |
| **Full State** | Personagens, locais, eventos | IndexedDB |

### Atualização Incremental

O Heavy Context agora usa atualizações incrementais (diff) em vez de substituição completa:

```typescript
// Exemplo de resposta de atualização
{
  "shouldUpdate": true,
  "changes": {
    "mainMission": { "action": "set", "value": "Impedir o ritual." },
    "activeProblems": [
      { "action": "remove", "value": "Guardas alertados" },
      { "action": "add", "value": "Porta selada magicamente" }
    ]
  },
  "narrativeThreadChanges": [
    {
      "action": "plant",
      "thread": {
        "type": "chekhov_gun",
        "description": "Adaga antiga mencionada",
        "importance": "major"
      }
    }
  ],
  "pacingAnalysis": {
    "currentLevel": "building",
    "trend": "rising"
  }
}
```

---

## Diagrama de Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TURNO DO JOGO                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. PLAYER INPUT                                                     │
│     └─► "Ataco o goblin com minha espada"                           │
│                                                                      │
│  2. CONTEXT ASSEMBLY                                                 │
│     ├─► Game State (personagens, locais, inventário)                │
│     ├─► Heavy Context (missões, problemas)                          │
│     ├─► Universe Context (cultura, economia)                         │
│     ├─► Narrative Instructions (gênero, pacing, vozes) ◄── NOVO     │
│     └─► Últimas 100 mensagens                                        │
│                                                                      │
│  3. GM PROMPT                                                        │
│     └─► GPT-4.1 processa e retorna GMResponse                       │
│                                                                      │
│  4. STATE UPDATES                                                    │
│     ├─► Atualiza personagens (HP, inventário)                       │
│     ├─► Adiciona mensagens ao chat                                   │
│     ├─► Persiste no IndexedDB                                        │
│     └─► Atualiza narrative threads ◄── NOVO                         │
│                                                                      │
│  5. HEAVY CONTEXT UPDATE                                             │
│     ├─► Analisa eventos recentes                                     │
│     ├─► Atualiza missões/problemas incrementalmente                 │
│     ├─► Atualiza pacing state ◄── NOVO                              │
│     └─► Gerencia narrative threads ◄── NOVO                         │
│                                                                      │
│  6. ACTION OPTIONS                                                   │
│     └─► Gera 5 novas opções de ação                                 │
│                                                                      │
│  7. RENDER                                                           │
│     └─► UI atualizada com novas mensagens                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Stack de Prompts

### Ordem de Execução por Turno

| # | Prompt | Quando | Propósito |
|---|--------|--------|-----------|
| 1 | `buildPlayerMessageProcessingPrompt` | Opcional | Adapta input casual ao universo |
| 2 | `buildGameMasterPrompt` | Sempre | Processa ação e gera narrativa |
| 3 | `buildHeavyContextPrompt` | Sempre | Atualiza memória persistente |
| 4 | `buildNarrativeQualityAnalysisPrompt` | Opcional | Analisa qualidade da resposta |
| 5 | `buildActionOptionsPrompt` | Sempre | Gera próximas opções |
| 6 | `buildCharacterAvatarPrompt` | Se novo NPC | Gera avatar via DALL-E 3 |

### Prompts de Setup (Uma vez)

| Prompt | Quando | Propósito |
|--------|--------|-----------|
| `buildOnboardingPrompt` | Criação | Entrevista de mundo |
| `buildStoryInitializationPrompt` | Criação | Estado inicial |
| `buildUniverseContextPrompt` | Criação | Contexto profundo |

---

*Documento atualizado em Dezembro de 2025 - Versão 1.3.0*
