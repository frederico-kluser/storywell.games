# storywell.games

> Motor de RPG narrativo em tempo real que combina GPT-4.1, mapas táticos, áudio 3D e prompts versionados para criar campanhas single-player no navegador.

**Versão narrativa:** 1.4.7 · **Stack:** React 19 + Vite 6 · **Engine de IA:** OpenAI GPT-4.1 / gpt-4.1-mini / gpt-image-1-mini / Whisper / gpt-4o-mini-tts

---

## Sumário

1. [Panorama](#panorama)
2. [O que o jogador vivencia](#o-que-o-jogador-vivencia)
3. [Fluxo de jogo em 3 atos](#fluxo-de-jogo-em-3-atos)
4. [Como executar o projeto](#como-executar-o-projeto)
5. [Sistemas em destaque](#sistemas-em-destaque)
6. [Audiovisual dinâmico](#audiovisual-dinâmico)
7. [Internacionalização e acessibilidade](#internacionalização-e-acessibilidade)
8. [Roadmap e observabilidade](#roadmap-e-observabilidade)
9. [Contribuindo](#contribuindo)
10. [Apêndice técnico](#apêndice-técnico)

---

## Panorama

storywell.games é um playground single-player onde o navegador se transforma em uma mesa de RPG completa. O jogador escolhe um universo, descreve seu herói e, a cada turno, recebe cinco ações possíveis com riscos explícitos. Ao selecionar (ou escrever) uma ação, o motor calcula probabilidades por meio do **sistema de Destino (Fate)**, envia todo o estado do jogo para prompts especialistas e retorna narrações com atualizações persistentes (inventário, ouro, grid tático, relacionamentos, etc.).

Diferenciais:
- **Motor 100% web:** nada de backend próprio; IndexedDB + prompts versionados garantem persistência mesmo offline.
- **Prompt stack modular:** cada etapa (onboarding, GM, opções, grid, análise custom) tem builder próprio em `services/ai/prompts/`.
- **Mapa 10x10 com snapshots:** cada mensagem guarda posição espacial para replays táticos.
- **Transparência:** o jogador vê antes os riscos de sucesso/falha e pode inspecionar o raciocínio de ações customizadas.

## O que o jogador vivencia

| Experiência | Descrição |
| --- | --- |
| **Onboarding guiado** | Wizard colaborativo coleta universo, personagem, tom e restrições. |
| **Sugestões de ação** | Após cada resposta do GM, cinco ações curtas vêm com percentual de boa/má sorte. |
| **Modo “Outro”** | Jogador descreve qualquer ação; um prompt dedicado calcula probabilidades e exibe um parecer antes da confirmação. |
| **Mapa tático** | StoryCard pode ser "flipado" para mostrar o grid 10x10 da cena, com NPCs em tempo real. |
| **Áudio bidirecional** | Botões para TTS (gpt-4o-mini-tts) e entrada de voz (Whisper) humanizam a sessão. |
| **Avatares/Backgrounds** | Sempre que surge NPC/Lugar novo, o sistema tenta gerar arte coerente com o estilo escolhido. |

## Fluxo de jogo em 3 atos

1. **Input → Fate**  
   Jogador escolhe uma opção ou escreve algo. `ActionInput` roda `rollFate` com base na probabilidade exibida e envia (texto + fateResult) para `useGameEngine`.
2. **Processamento → GM**  
   `useGameEngine` classifica o texto (ação x fala), monta o contexto (últimas 100 mensagens, heavyContext, universeContext, instruções narrativas) e chama `generateGameTurn` → `buildGameMasterPrompt`. Eventos bons/ruins são injetados como `FATE EVENT` no prompt.
3. **Resposta → Estado Persistente**  
   O `GMResponse` retorna mensagens estruturadas, atualizações de stats/inventário/local, novos NPCs e event logs. O hook salva tudo no IndexedDB (`dbService.saveGame`), dispara `updateHeavyContext` e pré-carrega as próximas ações (`generateActionOptions`).

## Como executar o projeto

1. **Pré-requisitos**
   - Node.js 20+ e npm 10+
   - Chave da API OpenAI (inserida dentro do app na primeira execução)
2. **Instalação**
   ```bash
   npm install
   ```
3. **Ambiente de desenvolvimento**
   ```bash
   npm run dev
   ```
   A UI pedirá sua API key e idioma preferido.
4. **Build de produção**
   ```bash
   npm run build && npm run preview
   ```
5. **Testes**
   ```bash
   npm test            # suíte Jest completa
   npm run test:watch  # modo watch
   npm run test:coverage
   ```
6. **Utilitários adicionais**
   - `npm run validate:translations` garante que todos os arquivos i18n têm chaves sincronizadas.
   - Husky roda automaticamente (hook `prepare`).

## Sistemas em destaque

### Sistema de Destino e Probabilidades
- `generateActionOptions` (prompt `actionOptions.prompt.ts`) monta cinco ações com `goodChance`/`badChance` entre 0 e 50.
- `rollFate` gera o evento concreto e mostra o `FateToast` instantaneamente.
- `analyzeCustomAction` garante que ações livres recebam o mesmo tratamento, com raciocínio explicado ao jogador.

### Heavy Context & Universe Context
- `heavyContext.prompt.ts` mantém missões, problemas, preocupações e threads narrativas sempre atualizadas.
- `universeContext` dá coesão cultural (moedas, gírias, etiquetas) e serve como "bíblia" para o GM.

### Economia e Inventário Estruturado
- `constants/economy.ts` define categorias, faixas de preço e regras de comércio.
- Inventários usam `Item[]` com metadata completa; prompts e UI usam helpers de `utils/inventory.ts` para formatar/validar.

### Mapa em Grade 10x10
- `GridMap` renderiza snapshots armazenados na store `grids` do IndexedDB.
- `gridUpdate.prompt.ts` compara últimas ações com o log para mover personagens, respeitando velocidade e colisões.

### Narrativa guiada por gênero
- `narrativeStyles.ts` gera instruções baseadas em 15 gêneros, controle de pacing, vozes de NPC e threads.
- Opcionalmente, `narrativeQualityAnalysis.prompt.ts` audita o texto para mostrar/dizer.

## Audiovisual dinâmico

- **Avatares:** `characterAvatar.prompt.ts` + `generateCharacterAvatar` criam retratos coerentes com o visual escolhido no onboarding.
- **Backgrounds:** `locationBackground.prompt.ts` gera cenas únicas por localização.
- **TTS/STT:** Botões de voz chamam `gpt-4o-mini-tts` e `Whisper`; resultados são armazenados no estado local, sem backend.

## Internacionalização e acessibilidade

- Idiomas suportados: EN, PT, ES, FR, RU, ZH. O idioma define prompts, UI e hints do Fate.
- `useThemeColors` aplica paletas geradas pela IA e garante contraste mínimo.
- `VoiceInput` e `FateToast` incluem feedback textual + visual + auditivo.

## Roadmap e observabilidade

- **Métricas planejadas:** custo por turno, latência média por prompt, saturação de heavyContext.
- **Melhorias em andamento:** resumo automático de universos longos, painel dev com último prompt + fate, versão 2.0 da economia (docs/ITEM_CURRENCY_SYSTEM_PROPOSAL.md).
- Consulte `docs/roadmap.md` e `definitive-analize.md` para diagnósticos recentes.

## Contribuindo

1. Abra uma issue descrevendo a mudança desejada (novo prompt, ajuste de UI, etc.).
2. Crie branch com convenção `feature/<tema>`.
3. Rode `npm test` + `npm run validate:translations` antes de abrir PR.
4. Descreva quais prompts/serviços foram afetados e se há impacto em custos ou modelos usados.

> **Importante:** prompts são tratados como "assets versionados". Atualize sempre os documentos relacionados (neste README, `docs/architecture.md`, `docs/analise-sistemas-probabilidades.md`) quando fizer alterações de comportamento.

---

## Apêndice técnico

### Estrutura do repositório

```
/components               # UI (ActionInput, StoryCard, GridMap, FateToast)
/hooks                    # Regras de negócio (useGameEngine, useCardNavigation)
/services/ai              # openaiClient + prompts modularizados
/services/db.ts           # Data Mapper IndexedDB (stores: games, characters, locations, messages, events, grids)
/utils                    # Helpers (inventory, AI wrappers, sanitizações)
/constants                # Economia, fontes, etc.
/docs                     # Arquitetura, banco, propostas
/tests/__tests__          # Suítes Jest (hooks, serviços, componentes)
```

### Pipeline de prompts por turno

1. (Opcional) `buildPlayerMessageProcessingPrompt`
2. `buildGameMasterPrompt`
3. `buildHeavyContextPrompt`
4. (Opcional) `buildNarrativeQualityAnalysisPrompt`
5. `buildActionOptionsPrompt`
6. `buildCustomActionAnalysisPrompt` (quando jogador usa “Outro”)
7. `buildGridUpdatePrompt`

### Banco de dados IndexedDB

`dbService` separa o `GameState` em seis stores: `games`, `characters`, `locations`, `messages`, `events`, `grids`. Cada store indexa por `gameId` e é hidratada novamente quando o jogo é recarregado.

### Testes e ferramentas

- **Jest + Testing Library:** cobrem `useGameEngine`, `openaiClient`, `ActionInput` e caches.
- **fake-indexeddb:** simula IndexedDB em ambiente de teste.
- **Scripts úteis:** `npm run test:update-snapshots`, `npm run validate:translations`.

### Referências adicionais

- `docs/architecture.md` — detalha o ciclo completo do turno, narrativa e memória.
- `docs/database_structure.md` — explica o modelo relacional no IndexedDB.
- `docs/analise-sistemas-probabilidades.md` — mergulho nos prompts de probabilidades e fate.

---

*Atualizado em 13 de dezembro de 2025*
