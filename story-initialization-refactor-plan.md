# Plano de Paralelização da Inicialização de Histórias (versão GPT-4.1 full)

## 1. Contexto e Problema
- A fase “Characters” da criação de mundos depende de **uma única chamada GPT-4.1** (`initializeStory`) que precisa gerar, em um payload massivo, locais, ficha do jogador, NPCs e narração inicial.
- A solicitação concentra requisitos heterogêneos, consome ~60 s e, quando falha, obriga um retry caro sem feedback incremental para o usuário.
- Após o retorno do GM ainda executamos geração de avatar, alongando ainda mais o tempo “sem resposta”.

## 2. Objetivos
1. Reduzir o tempo perceptível de inicialização para **≤ 20 s**, exibindo progresso em etapas.
2. Eliminar o ponto único de falha fragmentando o trabalho em **módulos paralelos**, todos alimentados por um blueprint compartilhado.
3. **Padronizar o uso de GPT-4.1** em todas as etapas para maximizar coerência narrativa, mesmo que cada requisição seja menor.
4. Facilitar extensões futuras (pets, facções, etc.) adicionando novos módulos plugáveis.

## 3. Pipeline Atual (resumo)
```
handleCreateStory
 ├─ generateThemeColors (paralelo)
 └─ initializeStory (GPT-4.1 monolítico)
      └─ generateCharacterAvatar (sequencial, pós-resposta)
```
- `initializeStory` usa `storyInitialization.prompt.ts` para obter `stateUpdates + messages` em um único JSON.
- Não existe forma de parcializar o estado ou monitorar gargalos específicos.

## 4. Arquitetura Proposta (GPT-4.1 em todas as etapas)
Usaremos um **seed sequencial** seguido por um **lote paralelo** de requisições independentes, todas feitas com GPT-4.1 (preview) para preservar consistência estilística.

### 4.1 Seed Sequencial
1. `generateStoryBlueprint` (GPT-4.1)
   - Saídas: `locationSeeds[]`, `playerSeed`, `npcSeeds[]`, `toneDirectives`, `economyPreset`, `questDifficultyTier`.
   - Limite de 900–1100 tokens para manter latência baixa. O blueprint define IDs imutáveis e metadados que os módulos posteriores consomem.

### 4.2 Lote Paralelo (Promise.all)
| Request | Modelo | Entradas principais | Saídas | Observações |
| --- | --- | --- | --- | --- |
| `generateStartingLocation` | GPT-4.1 | `locationSeeds[0]`, preferências do usuário, clima | Descrição completa, conexões, hazards, background prompt para TTS | Garante coesão espacial inicial |
| `generatePlayerSheet` | GPT-4.1 | `playerSeed`, presets de economia | Atributos, perícias, inventário, brief de avatar textual | Libera avatar generation imediatamente após resolver |
| `generateSupportingNPCs` | GPT-4.1 | `npcSeeds[]`, dados do local | Até 3 NPCs com motivações, recursos e intenções reativas | Pode retornar lista vazia; mantém IDs do seed |
| `generateOpeningNarration` | GPT-4.1 | `toneDirectives`, local detalhado | Array de mensagens GM (narrativa + diálogo) com pacing markers | Independente da ficha do jogador para minimizar dependências |
| `generateQuestHooks` | GPT-4.1 | `toneDirectives`, `questDifficultyTier`, economia | 2–3 objetivos prioritários, ameaças latentes, hooks para heavy context | Alimenta painel de objetivos e event log |
| `generateGridSeed` (opcional) | GPT-4.1 | Local + ficha do jogador | Snapshot 10×10, entidades iniciais, texto para as tiles | Rodamos apenas quando o usuário habilita mapa tático |

Total: **1 seed + 5 core + opcional grid = 6–7 chamadas GPT-4.1**, atendendo ao limite (<8) com máxima qualidade.

### 4.3 Diagrama Textual do Fluxo
```
handleCreateStory
 ├─ generateThemeColors (paralelo leve)
 ├─ generateStoryBlueprint (GPT-4.1)
 └─ Promise.all([
       generateStartingLocation,
       generatePlayerSheet,
       generateSupportingNPCs,
       generateOpeningNarration,
       generateQuestHooks,
       generateGridSeed? ,
       generateCharacterAvatar (usa brief da ficha)
     ])
       ↳ assembleInitialState
```
- `generateCharacterAvatar` passa a disparar **assim que `generatePlayerSheet` resolver**, aproveitando o brief rico produzido por GPT-4.1.

## 5. Estratégia de Orquestração e Resiliência
1. Criar `services/ai/storyInitialization.ts` para encapsular a sequência.
2. `assembleInitialState` combinará resultados mantendo IDs do blueprint e aplicará defaults quando algum módulo falhar.
3. Política de retry: até 2 tentativas por módulo, com backoff exponencial curto (500 ms, 1500 ms). Falhas definitivas ativam fallback:
   - `generateSupportingNPCs` → retorna NPC neutro baseado no seed.
   - `generateQuestHooks` → injeta template reutilizável do tema escolhido.
4. Registrar `LLMJobTelemetry` com timestamps de enqueue, start, finish e token usage para cada request.
5. Garantir que qualquer exceção parcial não bloqueie todo o pipeline; apenas o módulo impactado é reprocessado.

## 6. Organização dos Prompts
- Criar pasta `services/ai/prompts/initialization/` contendo prompts discretos (`storyBlueprint.prompt.ts`, `startingLocation.prompt.ts`, etc.), todos otimizados para GPT-4.1.
- Cada prompt terá seção fixa “Shared Blueprint Context” para reutilizar campos chave (IDs, tom, restrições econômicas) e reduzir divergências.
- Incluir instruções explícitas de formato JSON Schema para evitar drift e facilitar validação com `zod`/`superstruct`.

## 7. Observabilidade e Planejamento de Capacidade
- Adicionar logs estruturados (`storyInitPhase`, `model`, `durationMs`, `tokensIn`, `tokensOut`).
- Configurar métricas no dashboard (Grafana):
  - `story_init.total_duration`
  - `story_init.phase_duration{phase="openingNarration"}`
  - `story_init.retry_count`
- Alertas: disparar aviso se `total_duration_p95` > 25 s ou se a taxa de erro de qualquer fase > 5% em 15 min.

## 8. Migração e Feature Flag
1. Implementar flag `feature.storyInitV2` no contexto do jogador.
2. Etapas:
   - **Fase 0:** código legado default, novo pipeline oculto.
   - **Fase 1:** dark launch — executar pipeline novo em background e comparar outputs (sem impactar o usuário) para validar consistência.
   - **Fase 2:** ativar V2 para 10% dos usuários com telemetria reforçada.
   - **Fase 3:** rollout completo, remover código legado após 2 semanas estáveis.

## 9. Indicadores de Sucesso
- `TTI` (time-to-interaction) <= 20 s P90.
- Taxa de retry total < 8% por história.
- NPS específico da etapa de criação de mundos +15 após rollout.
- Nenhum bug de consistência (IDs quebrados, NPCs sem localização) relatado durante a fase beta.

## 10. Próximas Ações
1. Scaffold dos novos prompts + módulos (`storyInitialization.ts`, `assembleInitialState.ts`).
2. Implementar telemetry wrapper e retries por módulo.
3. Construir testes de contrato para cada resposta GPT-4.1 (schema validation + snapshots controlados).
4. Documentar fluxo no README técnico e treinar o time de suporte sobre o novo comportamento.
