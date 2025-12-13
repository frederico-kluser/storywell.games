# Análise dos Sistemas de Probabilidade, Avaliação e Resolução de Ações

Este documento descreve, de forma reflexiva, como os três blocos que envolvem porcentagens de sucesso/falha funcionam hoje: a geração das opções sugeridas, a análise quando o jogador prefere escrever algo próprio e a resolução narrativa que considera o bônus de sucesso ou o demérito de falha. Ele serve como guia para quem precisar ajustar prompts, fluxos ou validações.

## 1. Fluxo Geral de Uma Ação
1. **Sugestões carregadas** – O componente `components/ActionInput/ActionInput.tsx` observa quando um novo turno termina e chama `generateActionOptions` (em `services/ai/openaiClient.ts`). O resultado fica em memória e no cache local (`utils/actionOptionsCache.ts`) até que outra mensagem mude o contexto.
2. **Jogador escolhe** – Ao tocar em uma opção, `ActionInput` aciona `rollFate` (também em `openaiClient.ts`) para definir se haverá evento bom, ruim ou neutro, mostra o `FateToast` e envia a ação+resultado ao hook `useGameEngine` por meio de `handleSendMessage`.
3. **Entrada alternativa** – Se o jogador usar “Outro”, o mesmo componente chama `analyzeCustomAction` para calcular as porcentagens antes de confirmar e só então executa o fluxo acima.
4. **Classificação/ajuste textual** – `useGameEngine.ts` roda `classifyAndProcessPlayerInput` (prompt `playerMessageProcessing.prompt.ts`) para garantir que a fala/ação final esteja no tom do personagem antes de ir para o GM.
5. **Resolução narrativa** – `generateGameTurn` monta o `buildGameMasterPrompt`, injeta o `fateResult` e envia tudo ao GPT-4.1. A resposta volta estruturada (`GMResponse`) com mensagens, atualizações de stats/inventário/local e possíveis novos NPCs.

## 2. Sistema de Geração de Opções com Probabilidades
- **Prompt principal**: `services/ai/prompts/actionOptions.prompt.ts` reúne o estado inteiro do jogo (local atual, NPCs presentes, inventário normalizado, HP%, gold, heavyContext, últimos diálogos e snapshot do mapa quando existe) e injeta regras econômicas via `getItemAwarenessRulesForPrompt`.
- **Modelo utilizado**: `generateActionOptions` conversa com o modelo configurado em `MODEL_CONFIG.actionOptions` (atualmente gpt-4.1-nano) e exige JSON com exatamente cinco ações, cada uma com `goodChance`, `badChance`, `goodHint` e `badHint`. O código ainda limita os valores a 0–50% para evitar discrepâncias.
- **Variedade forçada**: O prompt impõe mistura de diálogos, exploração, combate e uma opção cautelosa, além de instruções específicas quando o jogador está ferido ou possui consumíveis que curam.
- **Persistência e desempenho**: Antes de chamar o modelo, `fetchActionOptionsWithCache` verifica se já existe cache para o último `messageId`. Isso evita repetir prompts caros em reloads ou em sessões onde o turno ainda não mudou.
- **Quando modificar**: Alterações no tom, no número de opções ou na granularidade das dicas devem acontecer neste prompt; mudanças na forma de apresentar ou ordenar as opções pertencem ao `ActionInput`. Mexer no limite 0–50% precisa de ajuste tanto no prompt quanto nas validações de `generateActionOptions`.

## 3. Sistema de Avaliação de Ações Customizadas (botão “Outro”)
- **Entrada**: Quando o jogador digita algo próprio e clica em “Analisar”, `ActionInput` chama `analyzeCustomAction` (também em `openaiClient.ts`). Enquanto isso, a UI exibe um modal de confirmação com loader.
- **Prompt dedicado**: `services/ai/prompts/customActionAnalysis.prompt.ts` é mais minucioso: inclui heavyContext completo, últimos 10 eventos, estatísticas e inventário do jogador (com grid 10x10 para medir distância), além de instruções explícitas sobre faixas recomendadas para ações simples, moderadas, complexas ou impossíveis.
- **Determinismo**: O modelo `MODEL_CONFIG.customActionAnalysis` roda com temperatura 0 e o prompt reforça que a mesma ação no mesmo contexto deve gerar as mesmas probabilidades. Isso impede o usuário de ficar “rerollando” até conseguir 0% de risco.
- **Resultado**: O JSON retornado contém `goodChance`, `badChance`, dicas textualizadas no idioma atual e um `reasoning` curto. O modal mostra tudo e só dispara o envio quando o jogador confirma; nesse momento, `rollFate` usa exatamente esses números para calcular o evento que será enviado ao GM.
- **Fallbacks**: Em caso de erro na análise, o front usa valores neutros (15/15) para não travar o fluxo. Se quiser mudar esse padrão é preciso ajustar tanto `analyzeCustomAction` quanto a cópia exibida no modal.

## 4. Resolução no Game Master + Bônus/Demérito
- **Recebimento**: `useGameEngine` sempre passa o `fateResult` (quando houver) para `generateGameTurn`. O prompt `buildGameMasterPrompt` (arquivo `services/ai/prompts/gameMaster.prompt.ts`) transforma esse resultado em um bloco "FATE EVENT" com instruções distintas para `good` ou `bad`, usando o hint para guiar o tipo de benefício ou complicação.
- **Contexto narrativo**: Além do bloco de destino, o prompt injeta universo completo, heavyContext, snapshot do grid e instruções de economia, garantindo coerência espacial/econômica e continuidade de missões.
- **Normas de validação**: A seção "ACTION RESOLUTION LOGIC" obriga o modelo a checar inventário, consumir itens, aplicar dano/custos e retornar updates nos campos corretos do JSON (`stateUpdates`). Isso é o que efetivamente torna o bônus/demérito visível na UI: se o GM adiciona ouro, altera HP ou cria eventos no log, o hook escreve as mudanças no estado do jogo.
- **Saída**: O `GMResponse` retorna mensagens com `voiceTone` opcional, novos personagens/localizações e difs de stats. O componente de chat renderiza isso e o `FateToast` já exibido antes fecha o ciclo, deixando claro para o jogador que o efeito veio daquela rolagem.
- **Pontos de intervenção**: Qualquer alteração na forma como o evento de destino é interpretado deve ser feita no bloco `fateInstruction`. Se quiser que o bônus/demérito afete cálculos numéricos antes do prompt (por exemplo, alterar a probabilidade de crítico no código), seria necessário introduzir lógica adicional antes de chamar o LLM e refletir essa mudança nas instruções do prompt para não haver choque.

## 5. Considerações para Evoluções
- **Visibilidade das porcentagens**: Hoje só o ActionInput conhece os valores; se quiser registrar em log ou mostrar histórico, seria preciso propagar `lastFateResult` para outro reducer ou armazenar no banco local.
- **Acoplamento a heavyContext**: Tanto o prompt de opções quanto o de análise dependem do heavyContext ficar atualizado turno a turno. Qualquer atraso nessa atualização (função `updateHeavyContext`) afeta diretamente a qualidade das probabilidades.
- **Internacionalização**: Os prompts usam `getLanguageName` para exigir o idioma correto, mas o front só suporta `pt/en/es`. Ao adicionar novos idiomas, lembre-se de atualizar todos os builders citados aqui.
- **Testes automatizados**: `__tests__/services/openaiClient.test.ts` cobre apenas as bordas/casos de fallback (não há snapshot do texto dos prompts). Se for modificar regras de probabilidade, considere expandir esses testes para validar clamps e mensagens de erro.

Com estas referências você sabe exatamente onde alterar prompts, como os dados fluem entre front e back e quais são os efeitos esperados quando um bônus ou penalidade de destino é processado.