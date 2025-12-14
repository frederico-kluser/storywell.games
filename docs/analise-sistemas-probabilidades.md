# Análise dos Sistemas de Probabilidade, Avaliação e Resolução de Ações

Este documento descreve, de forma reflexiva, como os três blocos que envolvem porcentagens de sucesso/falha funcionam hoje: a geração das opções sugeridas, a análise quando o jogador prefere escrever algo próprio e a resolução narrativa que considera o bônus de sucesso ou o demérito de falha. Ele serve como guia para quem precisar ajustar prompts, fluxos ou validações.

## 1. Fluxo Geral de Uma Ação
1. **Sugestões carregadas** – O componente `components/ActionInput/ActionInput.tsx` observa quando um novo turno termina e chama `generateActionOptions` (em `services/ai/openaiClient.ts`). O resultado fica em memória e no cache local (`utils/actionOptionsCache.ts`) até que outra mensagem mude o contexto.

```
[Fim de turno detectado]

      ↓ observa (vigia fim de turno)

ActionInput (ActionInput.tsx)

      ↓ chama (aciona geração)

`generateActionOptions`

      ↓ persiste (guarda resposta)

Memória + cache local

      ↓ disponibiliza (expõe ao jogador)

Lista atualizada de sugestões
```
2. **Jogador escolhe** – Ao tocar em uma opção, `ActionInput` aciona `rollFate` (também em `openaiClient.ts`) para definir se haverá evento bom, ruim ou neutro, mostra o `FateToast` e envia a ação+resultado ao hook `useGameEngine` por meio de `handleSendMessage`.

```
Jogador toca na opção

      ↓ repassa interação

ActionInput chama `rollFate`

      ↓ aciona rolagem

`rollFate` avalia porcentagens e define evento

      ↓ informa desfecho

`FateToast` comunica o destino

      ↓ encaminha resultado

`handleSendMessage` envia ação + Fate ao `useGameEngine`
```
3. **Entrada alternativa** – Se o jogador usar “Outro”, o mesmo componente chama `analyzeCustomAction` para calcular as porcentagens antes de confirmar e só então executa o fluxo acima.

```
Jogador seleciona "Outro"

      ↓ inicia análise

ActionInput dispara `analyzeCustomAction`

      ↓ exibe cálculo

Modal mostra porcentagens + reasoning

      ↓ confirma (usuário aceita)

Jogador aceita os valores

      ↓ retoma (volta ao fluxo)

Fluxo volta para `rollFate` e `handleSendMessage`
```
4. **Classificação/ajuste textual** – `useGameEngine.ts` roda `classifyAndProcessPlayerInput` (prompt `playerMessageProcessing.prompt.ts`) para garantir que a fala/ação final esteja no tom do personagem antes de ir para o GM.

```
`useGameEngine` recebe ação + Fate

      ↓ prepara normalização

`classifyAndProcessPlayerInput`

      ↓ ajusta estilo

Texto ajustado ao tom/personagem

      ↓ libera envio

Conteúdo validado segue para o GM
```
5. **Resolução narrativa** – `generateGameTurn` monta o `buildGameMasterPrompt`, injeta o `fateResult` e envia tudo ao GPT-4.1. A resposta volta estruturada (`GMResponse`) com mensagens, atualizações de stats/inventário/local e possíveis novos NPCs, agora obedecendo ao bloco **ABSOLUTE FATE OUTCOME**: resultados “good” viram sucessos críticos obrigatórios e resultados “bad” viram falhas críticas incontornáveis.

```
`generateGameTurn` compõe `buildGameMasterPrompt`

      ↓ inclui (insere contexto)

`fateResult` + contexto completo

      ↓ envia (manda ao modelo)

GPT-4.1 responde seguindo `gmResponseSchema`

      ↓ valida (confere schema)

`GMResponse` aprovado

      ↓ aplica (atualiza estado)

Atualização de mensagens, stats, inventário e NPCs
```

**Como cada função se encaixa nesse fluxo:**
- `ActionInput` atua como o orquestrador visual: ele decide quando buscar prompts novos, mostra o loader, cuida do cache e agrega a escolha do jogador (seja sugerida ou customizada) antes de despachar para `handleSendMessage`.
- `fetchActionOptionsWithCache` + `getCachedActionOptions` protegem o sistema contra chamadas redundantes; eles comparam uma chave composta (`turnCount + lastMessageId`) e só invocam o LLM se a história avançou para um novo turno.
- `generateActionOptions` e `analyzeCustomAction` são wrappers que montam mensagens para o modelo, chamam `queryLLM` e normalizam o JSON retornado, aplicando clamps de 0–50 e defaults quando necessário.
- `rollFate` converte as porcentagens em um evento concreto: ele avalia primeiro `badChance`, depois `goodChance`, registra a dica (`hint`) e agora classifica implicitamente o turno em **critical success** (good), **critical failure** (bad) ou **neutral**, rótulo que o prompt do GM usa para impor o desfecho.
- `handleSendMessage` (dentro do hook `useGameEngine`) injeta o Fate result no pipeline, chama `classifyAndProcessPlayerInput` para harmonizar estilo e então `generateGameTurn` para a resolução final.
- `generateGameTurn` usa `buildGameMasterPrompt` para juntar todo o contexto relevante, pedir uma resposta válida segundo `gmResponseSchema` e devolver os diffs que atualizam React state, IndexedDB e UI. O prompt termina com o bloco **ABSOLUTE FATE OUTCOME DIRECTIVE**, deixando claro que resultados “good/bad” não são flavor – eles obrigam o modelo a concluir o turno com sucesso ou fracasso total e atualizar o estado de acordo.

**O que está sendo bem executado nesta sessão:**
- O fluxo segue fielmente a separação de responsabilidades descrita no README (componentes → hooks → services), evitando lógica de rede na UI.
- Existe um caminho feliz claro que combina cachê local e prompts, reduzindo custo de tokens e latência perceptível.
- O pipeline mantém contratos tipados (`GMResponse`, `ActionOption`, `FateResult`), o que simplifica debugging quando algo foge do esperado.

**Sugestões de melhoria (5):**
1. Instrumentar cada etapa (ActionInput, fetch/cache, analyze, GM) com tracing leve para medir latência e custo por turno, alinhando-se ao roadmap de observabilidade citado na documentação.

```
ActionInput / fetch / analyze / GM

              ↓ registram spans (coletam latência)

Tracing leve coleta latência + custo

              ↓ agrega (envia ao painel)

Painel de observabilidade mostra gargalos
```
2. Adicionar uma fila resiliente/offline (IndexedDB) para ações pendentes caso a rede caia após o jogador confirmar, garantindo consistência com o motor baseado em browser.

```
Jogador confirma ação

        ↓ enfileira (garante backup)

Registro é salvo na IndexedDB

        ↓ verifica rede (teste online)

Se offline → aguarda retry
Se online → sincroniza com motor
```
3. Introduzir validações locais antes de chamar prompts (ex.: impedir ações vazias repetidas ou detectar spam), poupando tokens e evitando respostas redundantes do GM.

```
Input do jogador

      ↓ validações locais (spam, vazio, repetição filtradas)

      ↙                 ↘

Falhou → bloqueia e avisa   Passou → chama prompt/LLM
```
4. Expor no UI (ou devtools internas) um painel que mostre qual prompt foi disparado por último e qual cache foi utilizado, ajudando QA a reproduzir problemas.

```
Eventos das chamadas (prompt + cache)

                ↓ alimentam (registram uso)

Painel devtools/UX interno

                ↓ mostra (expõe métricas)

Último prompt, cache hit/miss e tempo → QA reproduz fluxo
```
5. Criar feature flags/versionamento de prompt para permitir rollout gradual de novas instruções sem precisar duplicar código em produção.

```
Nova instrução de prompt

        ↓ associada a feature flag/versão (controla rollout)

Ambiente decide flag ON/OFF

        ↓ aplica seleção

LLM recebe prompt antigo ou novo sem duplicar código
```

## 2. Sistema de Geração de Opções com Probabilidades
- **`buildActionOptionsPrompt` (services/ai/prompts/actionOptions.prompt.ts)**: o builder monta um dossiê com nove blocos de contexto. Ele começa descrevendo o universo e a localização atual (incluindo conexões disponíveis para sugerir deslocamentos), depois serializa o jogador com HP em porcentagem, ouro, inventário normalizado via `formatInventorySimple` e status atual. Em seguida lista NPCs vivos na cena com notas sobre itens/ouro, junta resumos do `heavyContext`, injeta os últimos 100 diálogos/eventos (usando o helper `getRecentMessagesForPrompt`) e, se houver snapshot do grid, contextualiza distância. Por fim adiciona as regras de economia vindas de `getItemAwarenessRulesForPrompt`, um bloco **Probability Calibration** (faixas Safe/Moderate/High/Extreme com limites explícitos e soma ≤ 80), o novo **Critical Outcome Directive** (explica que qualquer `goodChance` gera CRITICAL SUCCESS, qualquer `badChance` gera CRITICAL ERROR e que o GM é obrigado a obedecer aos hints) e um **Quality Rubric** que define o que é uma opção “boa”, “cautelosa” ou “ousada” e exige evitar repetições recentes. O checklist de regras agora obriga que ações cautelosas permaneçam na banda Safe, que cada opção seja internamente classificada no band adequado antes de definir os números, que qualquer ação High/Extreme traga, no `goodHint`, o payoff concreto que justifica o risco e que todo hint comece explicitamente com “Critical Success:” ou “Critical Error:” para instruir o GM.
- **`generateActionOptions` (services/ai/openaiClient.ts)**: esta função envia o prompt acima para o modelo `MODEL_CONFIG.actionOptions`, instruindo-o com um system prompt especializado (“You generate RPG action options…”). Após receber o JSON, ela normaliza cada opção: garante exatamente cinco itens, clampa `goodChance` e `badChance` para 0–50, substitui hints faltantes por strings vazias e cai em `getDefaultOptions` quando o parsing falha. A estratégia é manter o jogo previsível do ponto de vista da UI enquanto delega a criatividade ao prompt.
- **`fetchActionOptionsWithCache` e `getCachedActionOptions` (utils/actionOptionsCache.ts)**: o cache combina `storyId` + `turnCount` + `lastMessageId`. Quando o jogador volta para o mesmo turno (ex.: reload da página), `ActionInput` lê primeiro da memória/localStorage; só quando detecta um novo turno (ou um novo `messageId`) é que `generateActionOptions` é chamado novamente. Esse comportamento também evita que o LLM seja solicitado duas vezes para o mesmo estado durante animações longas.
- **`rollFate` (services/ai/openaiClient.ts)**: ainda que simples, ele fecha o raciocínio desta sessão ao transformar as porcentagens das opções em um evento discreto. A função considera o intervalo cumulativo (primeiro falha, depois sucesso) e devolve um `FateResult` com `hint` alinhado ao que o prompt descreveu, garantindo consistência quando o GM for instruído posteriormente.
- **Quando modificar**: Alterar o “estilo mental” das sugestões (ex.: priorizar stealth) exige editar os blocos narrativos do prompt; alterar formato de saída ou limites demanda mudanças coordenadas em `buildActionOptionsPrompt`, no schema `actionOptionsSchema` e no pós-processamento de `generateActionOptions`. Já ajustes em UX (ordem, destaque visual) pertencem exclusivamente ao `ActionInput`.

**O que está sendo bem executado nesta sessão:**
- O prompt injeta praticamente todo o estado rico descrito no README (economia, grid, heavy context, inventário), reduzindo alucinações.
- A função de geração aplica sanitização rigorosa (clamp + fallback), mantendo previsibilidade mesmo quando o modelo varia.
- O cache híbrido memória/localStorage conversa bem com o modelo de “turnos em fila”, evitando chamadas duplicadas quando o usuário recarrega a página.

**Sugestões de melhoria (5):**
1. Incorporar dados de ritmo narrativo (`pacingState`) e threads ativas ao prompt para orientar melhor a variedade (ex.: mais ações de investigação quando a tensão cai).

```
`pacingState` + threads ativas

              ↓ adicionam contexto

Enriquecem `buildActionOptionsPrompt`

              ↓ orientam variedade

Modelo gera opções alinhadas ao ritmo
```
2. Adicionar uma camada heurística pós-prompt que descarte ações repetidas em turnos próximos, usando hashing simples dos textos das últimas N opções.

```
Opções retornadas pelo LLM

        ↓ passam pelo filtro

Hash/heurística compara com últimas N

        ↓ evita repetição

Duplicada? → remove/substitui
Única? → segue para UI
```
3. Permitir pesos dinâmicos por gênero narrativo (config) para ajustar automaticamente a proporção diálogo/exploração/combate sem editar o prompt manualmente.

```
Configuração de gênero narrativo

          ↓ define pesos (regras globais)

Builder aplica pesos às categorias

          ↓ ajusta prompt

Prompt força proporção diálogo/exploração/combate desejada
```
4. Registrar telemetria das porcentagens escolhidas para detectar quando o modelo está tendendo demais a cenários neutros ou extremos, facilitando tuning.

```
Jogador seleciona opção + porcentagens

           ↓ envia métricas

Telemetria registra good/bad/neutral

           ↓ agrega histórico

Dashboard analisa tendência neutra/extrema

           ↓ sugere ajustes

Time ajusta prompts/modelo conforme padrões
```
5. Expandir os testes Jest mencionados no README para validar que `generateActionOptions` respeita formatos em PT/EN/ES e inclui as dicas obrigatórias, pegando regressões cedo.

```
Casos de teste PT/EN/ES

        ↓ alimentam (simulam entradas)

`generateActionOptions`

        ↓ verificam (checam output)

Formato + dicas obrigatórias

        ↓ alerta regressão

Falha? → acusa regressão cedo
```

## 3. Sistema de Avaliação de Ações Customizadas (botão “Outro”)
- **`analyzeCustomAction` (services/ai/openaiClient.ts)**: recebe o texto digitado, o `gameState` e o idioma corrente, monta um schema JSON obrigatório (`customActionAnalysisSchema`) e chama `queryLLM` com `MODEL_CONFIG.customActionAnalysis`. A temperatura 0 garante determinismo, enquanto o pós-processamento aplica clamp 0–50, defaults amigáveis e mensagens de log em caso de falha. Essa função é chamada somente após o jogador pedir “Analisar”, evitando latência desnecessária para quem só escolhe opções prontas.
- **`buildCustomActionAnalysisPrompt` (services/ai/prompts/customActionAnalysis.prompt.ts)**: o prompt constrói um panorama detalhado para que o modelo raciocine. Ele inclui universo, localização, descrição do jogador, stats completos, inventário (normalizado), heavyContext, últimas 100 mensagens (via helper `getRecentMessagesForPrompt`) e dados do grid 10x10 (incluindo distância em células). Na sequência apresenta regras numeradas que explicitam a linha de pensamento esperada: categorias de complexidade, checagens de recursos, impacto do nível de detalhamento, uso do posicionamento espacial e restrições de soma (deixar espaço para resultado neutro). A instrução final reforça que os campos precisam estar no idioma alvo (via `getLanguageName`) e descreve exatamente o formato do JSON esperado.
- **`ActionInput` + modal de confirmação**: o componente mantém `customActionAnalysis` em estado local. Assim que `analyzeCustomAction` responde, o modal mostra os percentuais e as dicas, explica o raciocínio (`reasoning`) e só libera o botão “Confirmar” quando os dados são válidos. Essa etapa comunica ao jogador como o sistema interpretou sua ação antes de rolar o destino.
- **`rollFate` reutilizado**: após a confirmação, `ActionInput` cria um `ActionOption` Fake usando os números analisados e passa para `rollFate`. Dessa forma, o pipeline downstream (`handleSendMessage` → `generateGameTurn`) nem precisa saber se a origem foi “Outro” ou uma sugestão – ele apenas recebe um `FateResult` coerente.
- **Fallbacks controlados**: Se o LLM não responder ou retornar JSON inválido, `analyzeCustomAction` devolve `goodChance`/`badChance` = 15 e hints vazios com `reasoning: 'Analysis failed...'`. O modal informa que é um valor padrão, e o jogador pode tentar novamente ou aceitar o risco. Para mudar esse comportamento, é necessário alterar tanto a função quanto o texto exibido no componente para manter alinhamento.

**O que está sendo bem executado nesta sessão:**
- O uso de temperatura 0 e schema explícito reduz drasticamente a variância – algo alinhado ao foco em consistência descrito no README.
- A UI expõe ao jogador o raciocínio do modelo antes da confirmação, aumentando transparência e confiança.
- O fallback elegante impede que o jogo trave quando o serviço da OpenAI oscila, mantendo a UX fluida.

**Sugestões de melhoria (5):**
1. Adicionar verificações locais (stats/inventário) antes de chamar o prompt para já impedir ações impossíveis, poupando tokens e devolvendo feedback imediato.

```
Entrada "Outro" do jogador

        ↓ dispara verificação

Validador cruza stats/inventário

        ↙             ↘

Inválido → mensagem imediata   Válido → chama `analyzeCustomAction`
```
2. Persistir as análises confirmadas no IndexedDB (junto ao turno) para que futuros turnos possam auditar ou reaproveitar probabilidades semelhantes.

```
Análise custom aprovada

        ↓ persiste decisão

Registro salvo no IndexedDB + turno

        ↓ referencia ações

Turnos futuros consultam histórico

        ↓ reaproveitam dados

Auditoria ou reaproveitamento das probabilidades
```
3. Introduzir um limite mínimo/máximo configurável por camada (ex.: “ações furtivas não podem ter badChance < 20%”) para manter balanço entre gênero narrativo e risco.

```
Configuração de limites por camada

          ↓ define faixas

`analyzeCustomAction` aplica clamp customizado

          ↓ gera números seguros

Probabilidades respeitam faixa segura por gênero
```
4. Gerar sugestões alternativas automaticamente quando a análise retorna risco extremo (ex.: oferecer um plano B mais seguro sem precisar voltar para a lista padrão).

```
`analyzeCustomAction` → risco extremo detectado

                ↓ aciona fallback

Gera plano B automático

                ↓ sugere opção

UI oferece alternativa segura sem sair do modal
```
5. Acrescentar testes unitários que validem o builder com diferentes idiomas e configurações de grid para evitar regressões em campanhas sci-fi/fantasia.

```
Casos de teste multi-idioma + grids variados

        ↓ exercitam (diversificam entradas)

`buildCustomActionAnalysisPrompt`

        ↓ conferem (validam estrutura)

Strings obrigatórias e referências espaciais

        ↓ alertam falhas

Alarmam regressões antes do deploy
```

## 4. Resolução no Game Master + Bônus/Demérito
- **`handleSendMessage` + `generateGameTurn`**: o hook `useGameEngine` injeta o `fateResult` recebido do `ActionInput` diretamente no call de `generateGameTurn`. Antes disso, ele passa o texto pelo classificador (`classifyAndProcessPlayerInput`) para garantir que as instruções entregues ao GM estejam alinhadas ao personagem e ao idioma ativo. Esse encadeamento significa que qualquer bônus/demérito já chega acompanhado da fala ou ação final que o jogador assumiu.
- **`buildGameMasterPrompt` (services/ai/prompts/gameMaster.prompt.ts)**: este é o prompt mais longo do sistema. Ele agrega: contexto do universo (texto completo de `universeContext`), heavyContext formatado, lista de personagens na cena com stats/inventário normalizados, inventário completo do jogador, snapshot do grid (com distância em células) e instruções narrativas derivadas de `narrativeStyles`. O novo bloco `fateInstruction` foi reescrito como “CRITICAL SUCCESS/FAILURE” e exige explicitamente que eventos `good` façam a ação do jogador dar certo + gerar bônus concreto, enquanto eventos `bad` cancelam ou revertem completamente a intenção, aplicando punições persistentes. A sessão "ACTION RESOLUTION LOGIC" lista passo a passo a linha de raciocínio esperada: validar recursos, consumir itens, atualizar stats, registrar mudanças na estrutura JSON, respeitar regras de economia e nunca falar pelo jogador.
- **`generateGameTurn` (services/ai/openaiClient.ts)**: constrói as mensagens para o LLM com `systemInstruction + schemaInstruction`, adiciona o histórico das últimas 100 mensagens (via `getRecentMessagesForPrompt`) e a ação do jogador. O retorno é validado via `gmResponseSchema` e convertido em `GMResponse`. Essa função também é responsável por lançar erros caso o JSON venha quebrado, evitando que turnos inconsistentes avancem silenciosamente – e agora sempre inclui, no final do prompt, o bloco **ABSOLUTE FATE OUTCOME DIRECTIVE**, que lembra o modelo de obedecer aos críticos obrigatórios.
- **`GMResponse` aplicado**: após a resposta, `useGameEngine` atualiza o estado: adiciona novas localizações/personagens, aplica `updatedCharacters`, muda `currentLocationId`, registra `eventLog` e salva mensagens com `voiceTone`. Assim, quando o Fate Toast exibido no começo indica “boa sorte” ou “azar”, o texto do GM reflete imediatamente os efeitos (ex.: ganho de item, armadilha ativada) e, graças às instruções críticas, o estado sempre prova que o sucesso/falha extremo realmente ocorreu.
- **Pontos de intervenção**: para alterar como o bônus/demérito influencia a narrativa, edite o bloco `fateInstruction`. Para que o destino impacte cálculos antes da IA (por exemplo, diminuir HP automaticamente), seria preciso ajustar `handleSendMessage` ou criar middleware antes de `generateGameTurn` *e* atualizar o prompt para explicar essa nova mecânica, garantindo que a narração continue coerente com o estado já modificado.

**O que está sendo bem executado nesta sessão:**
- O prompt do GM incorpora virtualmente todos os sistemas descritos no README (economia, grid, heavy context, narrativa custom, universo), garantindo coerência global.
- A validação via `gmResponseSchema` impede respostas fora do contrato e facilita logging de erros.
- O hook `useGameEngine` realiza pós-processamento cuidadoso (merge de stats, inventory, NPC dedupe), mantendo o estado local/IndexedDB sincronizado.

**Sugestões de melhoria (5):**
1. Implementar compressão/rotacionamento do universo/heavyContext enviados ao prompt para reduzir custo de tokens sem perder instruções críticas (ex.: sumarizar eventos muito antigos automaticamente).

```
HeavyContext completo

        ↓ prepara condensação

Processo de compressão/rotacionamento

        ↓ remove excessos

Contexto resumido + instruções críticas

        ↓ otimiza prompt

Prompt do GM consome menos tokens
```
2. Adicionar um campo `reasoning_log` opcional na resposta do GM para auditoria – útil quando precisamos entender por que determinado evento de Fate resultou em certo efeito.

```
`generateGameTurn` solicita `reasoning_log`

             ↓ pede justificativa

LLM explica passo a passo a decisão

             ↓ fornece rastreio

Auditoria lê log e entende vínculo com Fate
```
3. Rodar `buildNarrativeQualityAnalysisPrompt` automaticamente em turnos onde `fateResult` é “bad” para verificar se a punição não está desbalanceada (já que tal prompt existe segundo o README).

```
Turno com `fateResult = bad`

            ↓ sinaliza revisão

Dispara `buildNarrativeQualityAnalysisPrompt`

            ↓ avalia equilíbrio

Checagem confirma severidade adequada

            ↓ emite alerta

Alertas quando punição está fora do esperado
```
4. Criar tiers de modelos (ex.: gpt-4.1 vs gpt-4.1-mini) dependendo da complexidade do turno, conforme recomendado na seção “Sistema de Requisições à IA”, economizando custo.

```
Avaliação de complexidade do turno

          ↓ decide tier (classifica esforço)

Tier alto → gpt-4.1 | Tier baixo → gpt-4.1-mini

          ↓ aplica escolha

`generateGameTurn` chama modelo adequado e otimiza custo
```
5. Automatizar a chamada de `gridUpdate.prompt.ts` logo após aplicar o `GMResponse` sempre que houver movimento implícito ou transformação de elementos, garantindo que o mapa 10x10 permaneça fiel sem depender de ações manuais no hook. O sistema agora usa **gpt-4.1** (não mini) para lidar com transformações complexas como árvores cortadas, baús abertos, etc. (ver seção 6).

```
`GMResponse` aplicado

        ↓ detecta movimento ou transformação (observa diffs)

Aciona `gridUpdate.prompt.ts` (gpt-4.1)

        ↓ atualiza grid com sistema delta

Mapa 10x10 é sincronizado + elementos transformados
```

## 5. Considerações para Evoluções
- **Visibilidade das porcentagens**: Hoje só o ActionInput conhece os valores; se quiser registrar em log ou mostrar histórico, seria preciso propagar `lastFateResult` para outro reducer ou armazenar no banco local.
- **Acoplamento a heavyContext**: Tanto o prompt de opções quanto o de análise dependem do heavyContext ficar atualizado turno a turno. Qualquer atraso nessa atualização (função `updateHeavyContext`) afeta diretamente a qualidade das probabilidades.
- **Internacionalização**: Os prompts usam `getLanguageName` para exigir o idioma correto, mas o front só suporta `pt/en/es`. Ao adicionar novos idiomas, lembre-se de atualizar todos os builders citados aqui.
- **Testes automatizados**: `__tests__/services/openaiClient.test.ts` cobre apenas as bordas/casos de fallback (não há snapshot do texto dos prompts). Se for modificar regras de probabilidade, considere expandir esses testes para validar clamps e mensagens de erro.

**O que está sendo bem executado nesta sessão:**
- A seção consolida dependências críticas (UI ↔ hooks ↔ prompts) e conecta esses pontos com o que o README e `docs/architecture.md` ressaltam sobre observabilidade e governança de prompts. Isso dá à equipe uma visão macro que vai além de um único arquivo.
- A análise já evidencia que temos mecanismos de fallback (cache local, clamps, defaults) que mantêm o jogo funcional mesmo sem telemetria, algo alinhado à estratégia “browser-first” descrita na arquitetura.
- Há uma preocupação explícita com consistência de idiomas e schemas — requisito listado tanto na seção de internacionalização quanto no catálogo de prompts do README — mostrando que o documento não ignora os compromissos globais do projeto.

**Sugestões de melhoria (5):**
1. **Painel de Observabilidade Integrado:** Criar um dashboard embutido em `StoryCard` (visível apenas em modo dev) exibindo `lastFateResult`, estado do heavyContext e qual prompt/schema foi usado no último turno. Isso responde à carência de visibilidade e reaproveita o contexto já disponível em `useGameEngine` sem calls extras.

```
`useGameEngine` expõe lastFateResult + heavyContext + prompt

                    ↓ alimenta painel

Dashboard dev em `StoryCard`

                    ↓ revela insights

Time visualiza estado crítico sem novas requisições
```
2. **Manutenção Proativa do Heavy Context:** Introduzir um job automático (a cada X turnos) que chama `buildHeavyContextPrompt` para auditar consistência, removendo entradas obsoletas e documentando mudanças. Essa rotina pode ser disparada pelo hook quando `turnCount % X === 0`, garantindo que as dependências citadas aqui não degradem com o tempo.

```
`turnCount % X === 0`

          ↓ aciona rotina

Hook dispara `buildHeavyContextPrompt`

          ↓ revisa dados

Audita, limpa e documenta heavyContext
```
3. **Pipeline de Internacionalização para Prompts:** Antes de habilitar novos idiomas previstos no README (FR/RU/ZH), montar testes de snapshot para cada builder relevante (action options, análise custom, GM). Isso evita regressões silenciosas e cria confiança para expandir a matriz de idiomas.

```
Novos idiomas planejados

        ↓ entram no pipeline

Testes de snapshot por builder

        ↓ verificam strings

Validação garante consistência multi-idioma

        ↓ libera expansão

Rollout seguro para FR/RU/ZH
```
4. **Suite de Testes para Builders e Schemas:** Expandir `__tests__/services/openaiClient.test.ts` adicionando verificações diretas dos builders (strings chave, limites, seções obrigatórias). Cobrir também o parsing dos schemas (`gmResponseSchema`, `actionOptionsSchema`, `customActionAnalysisSchema`) para detectar incompatibilidades assim que surgirem.

```
Testes unitários ampliados

        ↓ exercitam cenários

Executam builders + schemas

        ↓ validam contratos

Checam strings chave, limites e parsing

        ↓ sinalizam falha

Quebra detectada antes do merge
```
5. **Versionamento Formal de Prompts:** Documentar e implementar um mecanismo de versionamento/flags nos builders (ex.: `PROMPT_VERSION` em `GameState.config`). Isso permite ativar novas instruções gradualmente por campanha ou universo, reduz risco em campanhas longas e segue o princípio de migrações descrito em `docs/ITEM_CURRENCY_SYSTEM_PROPOSAL.md`.

```
Definir `PROMPT_VERSION`/flags nos builders

              ↓ controla versões

Campanhas escolhem versão ativa

              ↓ aplicam política

Rollout gradual aplica instruções novas sem romper legados
```

Com estas referências você sabe exatamente onde alterar prompts, como os dados fluem entre front e back e quais são os efeitos esperados quando um bônus ou penalidade de destino é processado.

## 6. Sistema de Grid Map com Elementos de Cenário

O grid 10x10 evoluiu de um simples rastreador de posições para um sistema completo que representa tanto personagens quanto **elementos de cenário interativos**, com suporte a **transformações complexas de objetos**.

### Estrutura de Dados

```typescript
interface GridElement {
  id: string;
  symbol: string;      // Letra A-Z (ex: "D" para Door, "C" para Chest)
  name: string;        // "Oak Door", "Treasure Chest"
  description: string; // Descrição mostrada no popup ao clicar
  position: GridPosition;
}

interface GridSnapshot {
  characterPositions: GridCharacterPosition[];
  elements?: GridElement[];  // Elementos de cenário
  timestamp: number;
}

interface GridUpdateResponse {
  shouldUpdate: boolean;
  characterPositions?: {...}[];  // DELTA: apenas personagens que moveram
  elements?: {...}[];            // DELTA: apenas elementos novos/modificados
  removedElements?: string[];    // Símbolos de elementos removidos
  reasoning?: string;            // Explicação da mudança
}
```

### Sistema Delta (Anti-Alucinação)

O LLM retorna **apenas as mudanças**, não o grid inteiro. Isso reduz alucinações e economiza tokens:

```
Jogador: "Corto a árvore com meu machado"

Estado anterior: [T] Oak Tree em (5,5), jogador em (4,5)

      ↓ LLM analisa narrativa

Resposta Delta:
{
  "shouldUpdate": true,
  "characterPositions": [],
  "elements": [
    { "symbol": "S", "name": "Tree Stump", "x": 5, "y": 5 },
    { "symbol": "L", "name": "Fallen Log", "x": 6, "y": 5 }
  ],
  "removedElements": ["T"],
  "reasoning": "Árvore cortada. Toco na posição original. Tronco caiu para leste."
}

      ↓ Cliente faz merge

Estado final: [S] Stump (5,5), [L] Log (6,5), jogador (4,5)
```

### Transformações de Elementos (CRÍTICO)

O prompt instrui o LLM a lidar com objetos que mudam de estado sem desaparecer completamente:

| Ação | Elemento Original | Resultado |
|------|-------------------|-----------|
| Árvore cortada | [T] Oak Tree | [S] Stump (mesma posição) + [L] Fallen Log (adjacente) |
| Baú aberto | [C] Locked Chest | [O] Open Chest (mesma posição, nova descrição) |
| Porta quebrada | [D] Wooden Door | [B] Broken Door (mesma posição) |
| Barril destruído | [B] Barrel | [D] Debris (mesma posição) |
| Fogo em palha | [H] Haystack | [F] Burning Haystack (mesma posição) |
| Alavanca puxada | [L] Lever | [L] Lever (mesma posição, descrição atualizada) |

**Regras de transformação:**
1. REMOVER elemento original (adicionar símbolo a `removedElements`)
2. ADICIONAR elemento(s) transformado(s) com NOVO símbolo e descrição
3. Resíduos/detritos vão para células ADJACENTES
4. Se jogador corta/quebra algo, a parte que cai vai para LONGE do jogador (física básica)

### Integração com GM e Action Options

Ambos os prompts principais recebem o estado completo do grid:

```
=== SPATIAL CONTEXT (10x10 GRID MAP) ===
**Characters on the map (coordinates 0-9):**
- @ Hero [PLAYER]: (5, 5)
- @ Old Sage: (3, 4) - Distance: ~3 cells

**Scene Elements (interactable objects):**
- [D] Oak Door: (0, 5) - Distance: ~5 cells
    → A heavy wooden door leading to the courtyard
- [C] Treasure Chest: (7, 3) - Distance: ~4 cells
    → An ornate chest with golden trim

**Legend:**
- @ = Character (player marked with [PLAYER])
- [A-Z] = Scene elements (doors, chests, objects, etc.)

**Spatial rules:**
- Same/adjacent cells (distance 0-1): Can interact directly
- Nearby (distance 2-3): Can see clearly, short walk to interact
- Far (distance 4+): Requires movement to interact
```

**Regra especial para Action Options:**
```
7. If scene elements exist in the SPATIAL MAP, suggest at least one action
   interacting with nearby elements (doors, chests, levers, etc.)
```

### Modelo e Custo

`gridUpdate` usa **gpt-4.1** (não nano/mini) devido à complexidade das decisões de transformação:

```typescript
MODEL_CONFIG = {
  // ...outras configurações...
  gridUpdate: 'gpt-4.1', // Análise espacial complexa (transformações)
}
```

A escolha do modelo full se justifica porque:
- Decisões de transformação requerem raciocínio sobre física básica
- O sistema delta exige compreensão precisa do que mudou vs. o que permanece
- Erros no grid afetam diretamente a consistência narrativa

### Fluxo de Atualização

```
1. generateGameTurn retorna narrativa
   └─ "Você corta a árvore. Ela cai para o leste com estrondo."

2. updateGridPositions() é chamada
   ├─ Recebe: gameState, mensagens recentes, grid atual
   ├─ Monta: buildGridUpdatePrompt()
   ├─ Envia: queryLLM com gpt-4.1
   └─ Retorna: GridUpdateResponse (delta)

3. Merge no cliente (openaiClient.ts)
   ├─ Copia todas as posições/elementos anteriores
   ├─ Remove elementos listados em removedElements
   ├─ Adiciona/atualiza elementos do delta
   ├─ Garante símbolos únicos (A-Z sem colisão)
   └─ Retorna novo GridSnapshot

4. UI atualiza (GridMap.tsx)
   ├─ Renderiza personagens com avatar (@)
   ├─ Renderiza elementos com letra (A-Z)
   ├─ Popup ao clicar em elemento
   └─ Legenda mostra todos os símbolos
```

### Popup de Elemento

Ao clicar em uma letra no grid, aparece popup com:
- Nome do elemento
- Descrição completa
- Botão de fechar

Isso permite que o jogador entenda o que cada símbolo representa sem sobrecarregar a visualização do grid.

### Arquivos Envolvidos

| Arquivo | Responsabilidade |
|---------|------------------|
| `types.ts` | Interfaces `GridElement`, `GridSnapshot`, `GridUpdateResponse` |
| `services/ai/prompts/gridUpdate.prompt.ts` | Prompt de análise espacial + transformações |
| `services/ai/openaiClient.ts` | `updateGridPositions()` + lógica de merge delta |
| `components/GridMap/GridMap.tsx` | Renderização visual + popup |
| `services/ai/prompts/gameMaster.prompt.ts` | Injeção do grid no contexto do GM |
| `services/ai/prompts/actionOptions.prompt.ts` | Injeção do grid nas opções de ação |

**O que está sendo bem executado:**
- Sistema delta evita alucinações e reduz tokens
- Transformações são tratadas como remove+add, mantendo consistência
- Grid é passado para GM e Action Options, garantindo coerência espacial
- Modelo gpt-4.1 garante qualidade nas decisões complexas

**Sugestões de melhoria (3):**
1. Adicionar cache de elementos por localização para evitar recálculo quando jogador volta a um local já visitado
2. Implementar validação de colisão de elementos (dois elementos não devem ocupar a mesma célula)
3. Criar sistema de "elementos temporários" com TTL para efeitos como fogo, fumaça, etc.

### Extração Proativa de Elementos Narrativos

O prompt `gridUpdate.prompt.ts` foi reformulado para ser **proativo** na detecção de elementos. A filosofia mudou de "só atualize quando necessário" para "um mapa vazio em uma cena descrita é um ERRO".

**Nova missão do prompt:**
```
You are a PROACTIVE spatial positioning analyzer for an RPG game.
Your MISSION is to make the 10x10 grid map ALIVE and RICH with elements from the narrative.
An EMPTY or SPARSE map is a FAILURE. The map should visually represent the scene!
```

**Três passos obrigatórios de extração:**

1. **SCAN FOR ELEMENTS IN LOCATION DESCRIPTION**
   - Furniture: tables, chairs, beds, thrones, counters, shelves
   - Structures: doors, windows, stairs, pillars, arches, walls
   - Nature: trees, rocks, bushes, water, fire pits, gardens
   - Interactive: chests, levers, switches, altars, pedestals
   - Ambient: torches, lamps, fountains, statues, paintings

2. **SCAN FOR ELEMENTS IN RECENT MESSAGES**
   - Characters interacting with something? ADD IT
   - Environment details? ADD THEM
   - NPCs near objects? ADD THOSE OBJECTS
   - Combat references? ADD weapons, obstacles, cover

3. **SCAN FOR CHARACTERS/CREATURES**
   - NPCs mentioned but not in character list
   - Creatures: wolves, dragons, spiders, ghosts
   - Groups: guards, bandits, villagers

**Guia de elementos por tipo de local:**

| Local | Elementos Típicos |
|-------|------------------|
| Tavern/Inn | [B] Bar Counter, [T] Tables, [F] Fireplace, [S] Stairs, [D] Door, [K] Kitchen |
| Forest | [T] Trees, [R] Rocks, [B] Bushes, [P] Path, [S] Stream, [C] Campfire |
| Cave/Dungeon | [R] Rocks, [P] Pillars, [C] Chest, [A] Altar, [D] Door, [W] Web |
| Castle/Throne | [T] Throne, [P] Pillars, [B] Banners, [G] Guards, [D] Doors |
| Market/Town | [S] Stalls, [F] Fountain, [C] Carts, [B] Barrels, [W] Well |
| Beach/Shore | [R] Rocks, [B] Boat, [D] Driftwood, [S] Shells, [W] Waves |
| Library/Study | [B] Bookshelves, [D] Desk, [C] Candles, [G] Globe, [S] Scrolls |

**Exemplo de população automática de mapa vazio:**

```
Localização: "The Dragon's Breath Tavern - A cozy tavern with a large fireplace,
wooden tables scattered about, and a long bar counter where the innkeeper serves
drinks. Stairs lead to the upper rooms."

Current elements: None

→ LLM detecta mapa vazio + descrição rica

Response:
{
  "shouldUpdate": true,
  "elements": [
    { "symbol": "D", "name": "Tavern Door", "x": 5, "y": 9 },
    { "symbol": "F", "name": "Fireplace", "x": 1, "y": 2 },
    { "symbol": "B", "name": "Bar Counter", "x": 7, "y": 2 },
    { "symbol": "T", "name": "Wooden Table", "x": 3, "y": 5 },
    { "symbol": "S", "name": "Stairs", "x": 9, "y": 3 }
  ],
  "reasoning": "Populated tavern with elements from description"
}
```

## 7. Sistema de Reutilização de Locais (KNOWN_LOCATIONS)

O sistema de gerenciamento de locais foi aprimorado para evitar a criação de locais duplicados quando o jogador retorna a um lugar já visitado.

### Problema Original

A LLM não tinha conhecimento dos IDs de locais existentes, então sempre criava novos IDs quando o jogador viajava. Isso causava:
- Duplicação de locais no banco de dados
- Perda de imagens de fundo já geradas
- Inconsistência no mapa de conexões

### Solução Implementada

**1. Lista KNOWN_LOCATIONS no prompt do GM:**

```typescript
// Em gameMaster.prompt.ts
const allLocations = Object.values(gameState.locations);
const knownLocationsList = allLocations.map((loc) =>
  `- "${loc.name}" (ID: ${loc.id}) - ${loc.description.substring(0, 80)}...`
).join('\n    ');
```

**2. Nova seção no prompt:**

```
=== KNOWN_LOCATIONS (ALL LOCATIONS IN THE GAME) ===
These locations ALREADY EXIST in the game. When the player travels to one of these, use its EXACT ID.
- "Dragon's Breath Tavern" (ID: loc_1_tavern_2847) - A cozy tavern with a large fireplace...
- "Town Square" (ID: loc_1_square_3921) - The central plaza of the village...
- "Dark Forest Path" (ID: loc_2_forest_1234) - A winding path through ancient trees...
```

**3. Regras de mudança de localização (LOCATION CHANGE RULES):**

```
=== LOCATION CHANGE RULES (CRITICAL) ===
When the player moves to a different location:

**STEP 1: Check KNOWN_LOCATIONS list above**
- If the destination matches a location in KNOWN_LOCATIONS, use its EXACT ID in "locationChange"
- Match by semantic meaning, not exact name (e.g., "tavern", "the inn", "bar" = same location if context fits)

**STEP 2: Only create new location if truly new**
- If the player goes somewhere NOT in KNOWN_LOCATIONS, create it via "newLocations"
- Format: { "id": "loc_[turnNumber]_[shortname]_[random4digits]", ... }
```

**4. Exemplos no prompt:**

```
**EXAMPLE - Returning to existing location:**
Player says: "I go back to the tavern"
KNOWN_LOCATIONS includes: "Dragon's Breath Tavern" (ID: loc_1_tavern_2847)

CORRECT:
"stateUpdates": {
  "locationChange": "loc_1_tavern_2847",
  "eventLog": "Player returned to the tavern"
}

WRONG (creates duplicate):
"stateUpdates": {
  "newLocations": [{ "id": "loc_5_tavern_9999", "name": "Dragon's Breath Tavern", ... }],
  "locationChange": "loc_5_tavern_9999"
}
```

### Preservação de Imagens de Fundo

No `useGameEngine.ts`, ao atualizar locais, a imagem existente é preservada:

```typescript
if (response.stateUpdates.newLocations) {
  response.stateUpdates.newLocations.forEach((l) => {
    const existingLocation = next.locations[l.id];
    next.locations[l.id] = {
      ...l,
      // Preserva imagem existente quando atualiza um local
      backgroundImage: existingLocation?.backgroundImage || l.backgroundImage,
    };
  });
}
```

### Benefícios

1. **Economia de tokens**: Não gera novas descrições para locais já conhecidos
2. **Consistência visual**: Imagens de fundo são reutilizadas
3. **Integridade do mapa**: Conexões entre locais permanecem válidas
4. **Melhor UX**: Jogador reconhece visualmente locais já visitados

## 8. Sistema de Separação de Ações e Falas (Input Segmentation)

O sistema de processamento de input do jogador foi completamente reformulado para separar ações de falas, permitindo uma apresentação visual mais rica e narrativa mais interessante.

### Problema Original

O sistema anterior tratava todo input do jogador como um único bloco, sempre exibido como diálogo do personagem:

```
Input: "Olho para o guarda e digo: 'Boa noite' antes de sorrir"

Resultado anterior:
[Diálogo - Avatar do Jogador] "Olho para o guarda e digo: 'Boa noite' antes de sorrir"
```

Isso causava:
- Ações sendo apresentadas como falas
- Perda do tom narrativo literário
- Mistura visual confusa entre ação e diálogo

### Nova Arquitetura

**Interface de Segmento:**

```typescript
interface InputSegment {
  type: 'action' | 'speech';
  originalText: string;
  processedText: string;  // Transformado para narrativa (ações) ou adaptado (falas)
}

interface ClassifiedPlayerInput {
  segments: ProcessedSegment[];
  hasMultipleSegments: boolean;
  // Legacy fields mantidos para compatibilidade
  type: 'action' | 'speech';
  processedText: string;
  wasProcessed: boolean;
}
```

### Regras de Transformação

**Para AÇÕES (terceira pessoa narrativa):**

| Input Original | Texto Transformado |
|----------------|-------------------|
| "Olho ao redor" | "Seus olhos percorrem o ambiente, absorvendo cada detalhe" |
| "Pego a espada" | "Os dedos se fecham em torno do cabo da espada, sentindo o peso familiar do aço" |
| "Corro em direção à porta" | "Seus pés ecoam pelo piso de pedra enquanto corre em direção à porta" |
| "Sorrio" | "Um sorriso sutil se forma em seus lábios" |

**Para FALAS (adaptadas ao personagem/universo):**

| Input Original | Texto Adaptado (Medieval) |
|----------------|--------------------------|
| "Oi, tudo bem?" | "Salve, bom homem! Como passas?" |
| "Onde fica a taverna?" | "Poderia me indicar onde fica a taverna, senhor?" |
| "Me ajuda!" | "Imploro vossa ajuda!" |

### Exemplo de Separação Completa

```
Input do Jogador: "Olho para o guarda e digo: 'Boa noite' antes de fazer uma reverência"

→ LLM identifica 3 segmentos:

Segment 1 (action):
  original: "Olho para o guarda"
  processed: "Seus olhos encontram o olhar atento do guarda de plantão"

Segment 2 (speech):
  original: "Boa noite"
  processed: "Boa noite, senhor guarda"

Segment 3 (action):
  original: "antes de fazer uma reverência"
  processed: "Uma reverência elegante completa a saudação cortês"
```

### Criação de Mensagens no useGameEngine

O hook agora cria uma mensagem para cada segmento:

```typescript
for (let i = 0; i < classified.segments.length; i++) {
  const segment = classified.segments[i];

  if (segment.type === 'speech') {
    // Speech: Player dialogue com avatar
    playerMessages.push({
      id: msgId,
      senderId: currentStoryRef.playerCharacterId, // Mostra avatar do jogador
      text: segment.processedText,
      type: MessageType.DIALOGUE,
      ...
    });
  } else {
    // Action: Narrada em terceira pessoa pelo GM
    playerMessages.push({
      id: msgId,
      senderId: 'GM', // Narrador
      text: segment.processedText,
      type: MessageType.NARRATION,
      ...
    });
  }
}
```

### Resultado Visual

```
Antes (sistema antigo):
┌─────────────────────────────────────┐
│ [Avatar Jogador] "Olho para o       │
│ guarda e digo: 'Boa noite' antes    │
│ de fazer uma reverência"            │
└─────────────────────────────────────┘

Depois (novo sistema):
┌─────────────────────────────────────┐
│ [Narrador] Seus olhos encontram o   │
│ olhar atento do guarda de plantão   │
├─────────────────────────────────────┤
│ [Avatar Jogador] "Boa noite, senhor │
│ guarda"                             │
├─────────────────────────────────────┤
│ [Narrador] Uma reverência elegante  │
│ completa a saudação cortês          │
└─────────────────────────────────────┘
```

### Prompt de Classificação Reformulado

O `textClassification.prompt.ts` agora:

1. **Identifica segmentos** separando ações de falas
2. **Transforma ações** para terceira pessoa literária
3. **Adapta falas** ao estilo do personagem/universo
4. **Preserva ordem** dos segmentos conforme o input original

```
=== SEGMENT IDENTIFICATION ===

**ACTION segments** - What the character DOES:
- Physical actions: attack, move, jump, run, hide, climb
- Object interactions: pick up, open, close, use, examine
- Emotional expressions: smile, frown, sigh, laugh

**SPEECH segments** - What the character SAYS:
- Dialogue with NPCs or others
- Anything between quotes or after "digo:", "falo:", "pergunto:"

=== TRANSFORMATION RULES ===

**For ACTION segments:**
Transform into THIRD-PERSON NARRATIVE with literary style:
- DO NOT use first person ("I", "eu", "yo")
- Use third person or poetic descriptions
- Avoid being literal - be creative and atmospheric
```

### Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `textClassification.prompt.ts` | Novo prompt para separação e transformação de segmentos |
| `openaiClient.ts` | Nova interface `ProcessedSegment`, função `classifyAndProcessPlayerInput` reformulada |
| `useGameEngine.ts` | Loop de criação de múltiplas mensagens por segmento |
| `types.ts` | Interface `InputSegment` exportada |

### Benefícios

1. **Separação visual clara**: Falas com avatar, ações narradas
2. **Narrativa literária**: Ações não são mais literais ("eu fiz X")
3. **Imersão aumentada**: Jogador vê a história sendo contada, não comandos
4. **Flexibilidade**: Input misto é tratado corretamente
5. **Consistência de estilo**: Todas as ações seguem o tom do universo

**O que está sendo bem executado:**
- Transformação para terceira pessoa evita quebra de imersão
- Separação permite UI mais rica com avatares corretos
- Sistema delta de segmentos reduz complexidade no downstream

**Sugestões de melhoria (3):**
1. Adicionar cache de transformações comuns para reduzir chamadas ao LLM
2. Permitir configuração de "nível de literariedade" por gênero narrativo
3. Implementar fallback local quando transformação falha (manter original)
