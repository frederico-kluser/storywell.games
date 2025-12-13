# Análise dos Sistemas de Probabilidade, Avaliação e Resolução de Ações

Este documento descreve, de forma reflexiva, como os três blocos que envolvem porcentagens de sucesso/falha funcionam hoje: a geração das opções sugeridas, a análise quando o jogador prefere escrever algo próprio e a resolução narrativa que considera o bônus de sucesso ou o demérito de falha. Ele serve como guia para quem precisar ajustar prompts, fluxos ou validações.

## 1. Fluxo Geral de Uma Ação
1. **Sugestões carregadas** – O componente `components/ActionInput/ActionInput.tsx` observa quando um novo turno termina e chama `generateActionOptions` (em `services/ai/openaiClient.ts`). O resultado fica em memória e no cache local (`utils/actionOptionsCache.ts`) até que outra mensagem mude o contexto.
2. **Jogador escolhe** – Ao tocar em uma opção, `ActionInput` aciona `rollFate` (também em `openaiClient.ts`) para definir se haverá evento bom, ruim ou neutro, mostra o `FateToast` e envia a ação+resultado ao hook `useGameEngine` por meio de `handleSendMessage`.
3. **Entrada alternativa** – Se o jogador usar “Outro”, o mesmo componente chama `analyzeCustomAction` para calcular as porcentagens antes de confirmar e só então executa o fluxo acima.
4. **Classificação/ajuste textual** – `useGameEngine.ts` roda `classifyAndProcessPlayerInput` (prompt `playerMessageProcessing.prompt.ts`) para garantir que a fala/ação final esteja no tom do personagem antes de ir para o GM.
5. **Resolução narrativa** – `generateGameTurn` monta o `buildGameMasterPrompt`, injeta o `fateResult` e envia tudo ao GPT-4.1. A resposta volta estruturada (`GMResponse`) com mensagens, atualizações de stats/inventário/local e possíveis novos NPCs.

**Como cada função se encaixa nesse fluxo:**
- `ActionInput` atua como o orquestrador visual: ele decide quando buscar prompts novos, mostra o loader, cuida do cache e agrega a escolha do jogador (seja sugerida ou customizada) antes de despachar para `handleSendMessage`.
- `fetchActionOptionsWithCache` + `getCachedActionOptions` protegem o sistema contra chamadas redundantes; eles comparam `lastMessageId` e só invocam o LLM se a história avançou.
- `generateActionOptions` e `analyzeCustomAction` são wrappers que montam mensagens para o modelo, chamam `queryLLM` e normalizam o JSON retornado, aplicando clamps de 0–50 e defaults quando necessário.
- `rollFate` converte as porcentagens em um evento concreto: ele avalia primeiro `badChance`, depois `goodChance`, e registra a dica (`hint`) que será reenviada ao GM.
- `handleSendMessage` (dentro do hook `useGameEngine`) injeta o Fate result no pipeline, chama `classifyAndProcessPlayerInput` para harmonizar estilo e então `generateGameTurn` para a resolução final.
- `generateGameTurn` usa `buildGameMasterPrompt` para juntar todo o contexto relevante, pedir uma resposta válida segundo `gmResponseSchema` e devolver os diffs que atualizam React state, IndexedDB e UI.

**O que está sendo bem executado nesta sessão:**
- O fluxo segue fielmente a separação de responsabilidades descrita no README (componentes → hooks → services), evitando lógica de rede na UI.
- Existe um caminho feliz claro que combina cachê local e prompts, reduzindo custo de tokens e latência perceptível.
- O pipeline mantém contratos tipados (`GMResponse`, `ActionOption`, `FateResult`), o que simplifica debugging quando algo foge do esperado.

**Sugestões de melhoria (5):**
1. Instrumentar cada etapa (ActionInput, fetch/cache, analyze, GM) com tracing leve para medir latência e custo por turno, alinhando-se ao roadmap de observabilidade citado na documentação.
2. Adicionar uma fila resiliente/offline (IndexedDB) para ações pendentes caso a rede caia após o jogador confirmar, garantindo consistência com o motor baseado em browser.
3. Introduzir validações locais antes de chamar prompts (ex.: impedir ações vazias repetidas ou detectar spam), poupando tokens e evitando respostas redundantes do GM.
4. Expor no UI (ou devtools internas) um painel que mostre qual prompt foi disparado por último e qual cache foi utilizado, ajudando QA a reproduzir problemas.
5. Criar feature flags/versionamento de prompt para permitir rollout gradual de novas instruções sem precisar duplicar código em produção.

## 2. Sistema de Geração de Opções com Probabilidades
- **`buildActionOptionsPrompt` (services/ai/prompts/actionOptions.prompt.ts)**: o builder monta um dossiê com nove blocos de contexto. Ele começa descrevendo o universo e a localização atual (incluindo conexões disponíveis para sugerir deslocamentos), depois serializa o jogador com HP em porcentagem, ouro, inventário normalizado via `formatInventorySimple` e status atual. Em seguida lista NPCs vivos na cena com notas sobre itens/ouro, junta resumos do `heavyContext`, injeta os últimos diálogos (`gameState.messages.slice(-5)`) e, se houver snapshot do grid, contextualiza distância. Por fim adiciona as regras de economia vindas de `getItemAwarenessRulesForPrompt` e um checklist rígido (itens 1–9) que explica a linha de raciocínio esperada: variedade forçada, limites de palavras, obrigação de incluir opções de risco baixo e alto e associação de dicas coerentes com cada chance.
- **`generateActionOptions` (services/ai/openaiClient.ts)**: esta função envia o prompt acima para o modelo `MODEL_CONFIG.actionOptions`, instruindo-o com um system prompt especializado (“You generate RPG action options…”). Após receber o JSON, ela normaliza cada opção: garante exatamente cinco itens, clampa `goodChance` e `badChance` para 0–50, substitui hints faltantes por strings vazias e cai em `getDefaultOptions` quando o parsing falha. A estratégia é manter o jogo previsível do ponto de vista da UI enquanto delega a criatividade ao prompt.
- **`fetchActionOptionsWithCache` e `getCachedActionOptions` (utils/actionOptionsCache.ts)**: o cache combina `storyId` + `lastMessageId`. Quando o jogador volta para o mesmo turno (ex.: reload da página), `ActionInput` lê primeiro da memória/localStorage; só quando detecta `messageId` novo é que `generateActionOptions` é chamado novamente. Esse comportamento também evita que o LLM seja solicitado duas vezes para o mesmo estado durante animações longas.
- **`rollFate` (services/ai/openaiClient.ts)**: ainda que simples, ele fecha o raciocínio desta sessão ao transformar as porcentagens das opções em um evento discreto. A função considera o intervalo cumulativo (primeiro falha, depois sucesso) e devolve um `FateResult` com `hint` alinhado ao que o prompt descreveu, garantindo consistência quando o GM for instruído posteriormente.
- **Quando modificar**: Alterar o “estilo mental” das sugestões (ex.: priorizar stealth) exige editar os blocos narrativos do prompt; alterar formato de saída ou limites demanda mudanças coordenadas em `buildActionOptionsPrompt`, no schema `actionOptionsSchema` e no pós-processamento de `generateActionOptions`. Já ajustes em UX (ordem, destaque visual) pertencem exclusivamente ao `ActionInput`.

**O que está sendo bem executado nesta sessão:**
- O prompt injeta praticamente todo o estado rico descrito no README (economia, grid, heavy context, inventário), reduzindo alucinações.
- A função de geração aplica sanitização rigorosa (clamp + fallback), mantendo previsibilidade mesmo quando o modelo varia.
- O cache híbrido memória/localStorage conversa bem com o modelo de “turnos em fila”, evitando chamadas duplicadas quando o usuário recarrega a página.

**Sugestões de melhoria (5):**
1. Incorporar dados de ritmo narrativo (`pacingState`) e threads ativas ao prompt para orientar melhor a variedade (ex.: mais ações de investigação quando a tensão cai).
2. Adicionar uma camada heurística pós-prompt que descarte ações repetidas em turnos próximos, usando hashing simples dos textos das últimas N opções.
3. Permitir pesos dinâmicos por gênero narrativo (config) para ajustar automaticamente a proporção diálogo/exploração/combate sem editar o prompt manualmente.
4. Registrar telemetria das porcentagens escolhidas para detectar quando o modelo está tendendo demais a cenários neutros ou extremos, facilitando tuning.
5. Expandir os testes Jest mencionados no README para validar que `generateActionOptions` respeita formatos em PT/EN/ES e inclui as dicas obrigatórias, pegando regressões cedo.

## 3. Sistema de Avaliação de Ações Customizadas (botão “Outro”)
- **`analyzeCustomAction` (services/ai/openaiClient.ts)**: recebe o texto digitado, o `gameState` e o idioma corrente, monta um schema JSON obrigatório (`customActionAnalysisSchema`) e chama `queryLLM` com `MODEL_CONFIG.customActionAnalysis`. A temperatura 0 garante determinismo, enquanto o pós-processamento aplica clamp 0–50, defaults amigáveis e mensagens de log em caso de falha. Essa função é chamada somente após o jogador pedir “Analisar”, evitando latência desnecessária para quem só escolhe opções prontas.
- **`buildCustomActionAnalysisPrompt` (services/ai/prompts/customActionAnalysis.prompt.ts)**: o prompt constrói um panorama detalhado para que o modelo raciocine. Ele inclui universo, localização, descrição do jogador, stats completos, inventário (normalizado), heavyContext, últimas 10 mensagens e dados do grid 10x10 (incluindo distância em células). Na sequência apresenta regras numeradas que explicitam a linha de pensamento esperada: categorias de complexidade, checagens de recursos, impacto do nível de detalhamento, uso do posicionamento espacial e restrições de soma (deixar espaço para resultado neutro). A instrução final reforça que os campos precisam estar no idioma alvo (via `getLanguageName`) e descreve exatamente o formato do JSON esperado.
- **`ActionInput` + modal de confirmação**: o componente mantém `customActionAnalysis` em estado local. Assim que `analyzeCustomAction` responde, o modal mostra os percentuais e as dicas, explica o raciocínio (`reasoning`) e só libera o botão “Confirmar” quando os dados são válidos. Essa etapa comunica ao jogador como o sistema interpretou sua ação antes de rolar o destino.
- **`rollFate` reutilizado**: após a confirmação, `ActionInput` cria um `ActionOption` Fake usando os números analisados e passa para `rollFate`. Dessa forma, o pipeline downstream (`handleSendMessage` → `generateGameTurn`) nem precisa saber se a origem foi “Outro” ou uma sugestão – ele apenas recebe um `FateResult` coerente.
- **Fallbacks controlados**: Se o LLM não responder ou retornar JSON inválido, `analyzeCustomAction` devolve `goodChance`/`badChance` = 15 e hints vazios com `reasoning: 'Analysis failed...'`. O modal informa que é um valor padrão, e o jogador pode tentar novamente ou aceitar o risco. Para mudar esse comportamento, é necessário alterar tanto a função quanto o texto exibido no componente para manter alinhamento.

**O que está sendo bem executado nesta sessão:**
- O uso de temperatura 0 e schema explícito reduz drasticamente a variância – algo alinhado ao foco em consistência descrito no README.
- A UI expõe ao jogador o raciocínio do modelo antes da confirmação, aumentando transparência e confiança.
- O fallback elegante impede que o jogo trave quando o serviço da OpenAI oscila, mantendo a UX fluida.

**Sugestões de melhoria (5):**
1. Adicionar verificações locais (stats/inventário) antes de chamar o prompt para já impedir ações impossíveis, poupando tokens e devolvendo feedback imediato.
2. Persistir as análises confirmadas no IndexedDB (junto ao turno) para que futuros turnos possam auditar ou reaproveitar probabilidades semelhantes.
3. Introduzir um limite mínimo/máximo configurável por camada (ex.: “ações furtivas não podem ter badChance < 20%”) para manter balanço entre gênero narrativo e risco.
4. Gerar sugestões alternativas automaticamente quando a análise retorna risco extremo (ex.: oferecer um plano B mais seguro sem precisar voltar para a lista padrão).
5. Acrescentar testes unitários que validem o builder com diferentes idiomas e configurações de grid para evitar regressões em campanhas sci-fi/fantasia.

## 4. Resolução no Game Master + Bônus/Demérito
- **`handleSendMessage` + `generateGameTurn`**: o hook `useGameEngine` injeta o `fateResult` recebido do `ActionInput` diretamente no call de `generateGameTurn`. Antes disso, ele passa o texto pelo classificador (`classifyAndProcessPlayerInput`) para garantir que as instruções entregues ao GM estejam alinhadas ao personagem e ao idioma ativo. Esse encadeamento significa que qualquer bônus/demérito já chega acompanhado da fala ou ação final que o jogador assumiu.
- **`buildGameMasterPrompt` (services/ai/prompts/gameMaster.prompt.ts)**: este é o prompt mais longo do sistema. Ele agrega: contexto do universo (texto completo de `universeContext`), heavyContext formatado, lista de personagens na cena com stats/inventário normalizados, inventário completo do jogador, snapshot do grid (com distância em células) e instruções narrativas derivadas de `narrativeStyles`. O bloco `fateInstruction` é inserido dinamicamente quando `fateResult.type !== 'neutral'` e contém exemplos do que o modelo deve fazer (“algo bom deve acontecer” x “algo ruim deve acontecer”), além de reforçar que o evento precisa parecer orgânico. A sessão "ACTION RESOLUTION LOGIC" lista passo a passo a linha de raciocínio esperada: validar recursos, consumir itens, atualizar stats, registrar mudanças na estrutura JSON, respeitar regras de economia e nunca falar pelo jogador.
- **`generateGameTurn` (services/ai/openaiClient.ts)**: constrói as mensagens para o LLM com `systemInstruction + schemaInstruction`, adiciona o histórico `gameState.messages.slice(-100)` e a ação do jogador. O retorno é validado via `gmResponseSchema` e convertido em `GMResponse`. Essa função também é responsável por lançar erros caso o JSON venha quebrado, evitando que turnos inconsistentes avancem silenciosamente.
- **`GMResponse` aplicado**: após a resposta, `useGameEngine` atualiza o estado: adiciona novas localizações/personagens, aplica `updatedCharacters`, muda `currentLocationId`, registra `eventLog` e salva mensagens com `voiceTone`. Assim, quando o Fate Toast exibido no começo indica “boa sorte” ou “azar”, o texto do GM reflete imediatamente os efeitos (ex.: ganho de item, armadilha ativada) e os stats/inventários são sincronizados.
- **Pontos de intervenção**: para alterar como o bônus/demérito influencia a narrativa, edite o bloco `fateInstruction`. Para que o destino impacte cálculos antes da IA (por exemplo, diminuir HP automaticamente), seria preciso ajustar `handleSendMessage` ou criar middleware antes de `generateGameTurn` *e* atualizar o prompt para explicar essa nova mecânica, garantindo que a narração continue coerente com o estado já modificado.

**O que está sendo bem executado nesta sessão:**
- O prompt do GM incorpora virtualmente todos os sistemas descritos no README (economia, grid, heavy context, narrativa custom, universo), garantindo coerência global.
- A validação via `gmResponseSchema` impede respostas fora do contrato e facilita logging de erros.
- O hook `useGameEngine` realiza pós-processamento cuidadoso (merge de stats, inventory, NPC dedupe), mantendo o estado local/IndexedDB sincronizado.

**Sugestões de melhoria (5):**
1. Implementar compressão/rotacionamento do universo/heavyContext enviados ao prompt para reduzir custo de tokens sem perder instruções críticas (ex.: sumarizar eventos muito antigos automaticamente).
2. Adicionar um campo `reasoning_log` opcional na resposta do GM para auditoria – útil quando precisamos entender por que determinado evento de Fate resultou em certo efeito.
3. Rodar `buildNarrativeQualityAnalysisPrompt` automaticamente em turnos onde `fateResult` é “bad” para verificar se a punição não está desbalanceada (já que tal prompt existe segundo o README).
4. Criar tiers de modelos (ex.: gpt-4.1 vs gpt-4.1-mini) dependendo da complexidade do turno, conforme recomendado na seção “Sistema de Requisições à IA”, economizando custo.
5. Automatizar a chamada de `gridUpdate.prompt.ts` logo após aplicar o `GMResponse` sempre que houver movimento implícito, garantindo que o mapa 10x10 permaneça fiel sem depender de ações manuais no hook.

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
2. **Manutenção Proativa do Heavy Context:** Introduzir um job automático (a cada X turnos) que chama `buildHeavyContextPrompt` para auditar consistência, removendo entradas obsoletas e documentando mudanças. Essa rotina pode ser disparada pelo hook quando `turnCount % X === 0`, garantindo que as dependências citadas aqui não degradem com o tempo.
3. **Pipeline de Internacionalização para Prompts:** Antes de habilitar novos idiomas previstos no README (FR/RU/ZH), montar testes de snapshot para cada builder relevante (action options, análise custom, GM). Isso evita regressões silenciosas e cria confiança para expandir a matriz de idiomas.
4. **Suite de Testes para Builders e Schemas:** Expandir `__tests__/services/openaiClient.test.ts` adicionando verificações diretas dos builders (strings chave, limites, seções obrigatórias). Cobrir também o parsing dos schemas (`gmResponseSchema`, `actionOptionsSchema`, `customActionAnalysisSchema`) para detectar incompatibilidades assim que surgirem.
5. **Versionamento Formal de Prompts:** Documentar e implementar um mecanismo de versionamento/flags nos builders (ex.: `PROMPT_VERSION` em `GameState.config`). Isso permite ativar novas instruções gradualmente por campanha ou universo, reduz risco em campanhas longas e segue o princípio de migrações descrito em `docs/ITEM_CURRENCY_SYSTEM_PROPOSAL.md`.

Com estas referências você sabe exatamente onde alterar prompts, como os dados fluem entre front e back e quais são os efeitos esperados quando um bônus ou penalidade de destino é processado.