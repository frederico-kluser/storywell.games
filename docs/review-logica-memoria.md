# Review de Lógica e Gerenciamento de Memória

Este documento consolida os principais problemas encontrados na análise estática do projeto, com foco em lógica de estado, retenção de memória, persistência indevida e pontos de correção prioritários.

## Resumo Executivo

Os maiores problemas atuais não estão em um único "memory leak" clássico, mas em um conjunto de decisões de arquitetura que fazem o app:

- duplicar dados pesados no IndexedDB;
- manter histórias completas em memória por tempo indefinido;
- replicar blobs base64 ao longo do histórico do grid;
- disparar salvamentos completos para interações leves de UI;
- manter alguns recursos de áudio/microfone sem ciclo de vida robusto.

Se o objetivo for atacar a raiz do problema, a prioridade deve ser:

1. corrigir a duplicação de mensagens no store `GAMES`;
2. descarregar histórias inativas da memória React;
3. parar de repetir `avatarBase64` e `locationBackgroundImage` dentro de cada `gridSnapshot`;
4. separar persistência estrutural pesada de updates pequenos de UI.

---

## 1. Duplicação de Mensagens no IndexedDB

### Problema

Na persistência do jogo, o store `GAMES` continua recebendo o array `messages` dentro de `metaData`, ao mesmo tempo em que as mensagens também são persistidas no store `MESSAGES`.

Isso cria duplicação de dados em disco e também aumenta o custo de leitura, serialização e hidratação.

### Onde está

- `services/db.ts`
- Trecho crítico: `saveGame`

Hoje o código remove `characters`, `locations`, `events` e `gridSnapshots` do objeto principal, mas não remove `messages`.

### Impacto

- aumenta o uso de IndexedDB sem necessidade;
- aumenta uso de memória ao chamar `loadGames()`;
- torna a listagem de histórias mais cara do que deveria;
- duplica I/O e serialização de históricos longos.

### Evidência prática

Em `loadGames()`, o projeto já precisa sobrescrever `messages: []` para transformar o objeto em uma versão leve. Isso indica que os metadados estão vindo carregados com histórico completo, o que não deveria acontecer.

### O que precisa ser feito

1. Ajustar `saveGame()` para excluir `messages` de `metaData` antes de gravar no store `GAMES`.
2. Garantir que o store `GAMES` mantenha apenas metadados leves da campanha.
3. Revisar `loadGames()` para confirmar que ele não depende de nenhum campo pesado embutido.
4. Considerar migração ou rotina de resave para limpar registros antigos já persistidos com duplicação.

### Resultado esperado

- lista de histórias muito mais leve;
- menos consumo de memória ao abrir o app;
- menor custo de persistência e leitura.

---

## 2. Histórias Completas Ficam Retidas em Memória React

### Problema

O hook principal mantém histórias carregadas completamente dentro de `stories`, e essas histórias não voltam para um estado leve quando o usuário troca de campanha.

Na prática, cada história aberta passa a permanecer residente com:

- mensagens;
- personagens;
- locations;
- heavy context;
- universe context;
- grid snapshots;
- imagens base64.

### Onde está

- `hooks/useGameEngine.ts`
- uso de `loadedStoriesRef`
- uso de `storiesRef`
- fluxo de `loadFullStory`

### Impacto

- crescimento contínuo da heap ao navegar por várias histórias;
- mais custo em renderizações e cópias de estado;
- maior pressão no garbage collector;
- risco real de degradação em campanhas longas ou com muitas imagens.

### Sintoma estrutural

O array `stories` deixa de ser uma lista de metadados e passa a ser um cache cumulativo de histórias hidratadas.

### O que precisa ser feito

1. Redefinir `stories` para representar apenas metadados leves por padrão.
2. Manter uma única história completa ativa em memória, ou no máximo um cache pequeno controlado.
3. Ao trocar de história, descarregar os campos pesados das anteriores:
   - `messages`
   - `characters`
   - `locations`
   - `events`
   - `gridSnapshots`
4. Remover a lógica de "loaded forever" baseada só em `loadedStoriesRef`, ou substituí-la por cache com invalidação.
5. Se necessário, criar uma estrutura separada:
   - `storySummaries` para sidebar/lista
   - `activeStory` para campanha carregada

### Resultado esperado

- memória proporcional à história aberta, não ao número total de histórias visitadas;
- navegação mais previsível;
- menos retenção de objetos grandes ao longo da sessão.

---

## 3. `gridSnapshots` Duplica Base64 e Background em Todo o Histórico

### Problema

Cada snapshot do grid pode armazenar:

- `avatarBase64` para cada personagem na posição;
- `locationBackgroundImage` para o cenário daquele momento.

Como snapshots são acumulativos, isso replica dados pesados muitas vezes ao longo da história.

### Onde está

- `types.ts`
- `services/ai/openaiClient.ts`
- `hooks/useGameEngine.ts`

### Impacto

- crescimento explosivo do IndexedDB;
- crescimento explosivo do uso de memória quando a história é hidratada;
- custo alto de cópia em cada update;
- lentidão crescente em campanhas longas.

### Por que isso é grave

Base64 de avatar e background já existe na estrutura principal de personagens e locations. Repetir isso em cada snapshot transforma o histórico em uma coleção de cópias redundantes.

### O que precisa ser feito

1. Remover `avatarBase64` de `GridCharacterPosition`, mantendo apenas `characterId` e dados mínimos de exibição.
2. Resolver avatar em tempo de render a partir de `activeStory.characters[characterId]`.
3. Remover `locationBackgroundImage` de `GridSnapshot`.
4. Resolver o background a partir da location correspondente no momento de render, ou armazenar apenas uma chave/versionamento se for necessário representar mudança histórica real.
5. Se houver necessidade narrativa de preservar mudança visual histórica, guardar somente referência leve, nunca o blob repetido.
6. Considerar poda/compactação de snapshots antigos, caso o histórico não precise de granularidade infinita.

### Resultado esperado

- snapshots passam a ser estruturas leves;
- redução grande no tamanho salvo por turno;
- menos custo para carregar uma campanha antiga.

---

## 4. Updates Simples de UI Disparam `saveGame()` Completo

### Problema

Eventos pequenos de interface, como marcar carta como visualizada ou marcar grid como visto, passam pelo mesmo pipeline de persistência pesada usado para mutações estruturais da campanha.

### Onde está

- `App.tsx`
- `hooks/useGameEngine.ts`
- `safeUpdateStory()`
- `markCardAsViewed()`
- `markGridAsViewed()`

### Impacto

- regravação completa de histórias grandes por interações triviais;
- churn de memória por cópias de arrays e objetos grandes;
- pressão desnecessária no IndexedDB;
- risco de UI menos responsiva em histórias extensas.

### Exemplo

Ao terminar a animação de uma única carta, o app pode disparar um update da história inteira e persistir tudo novamente.

### O que precisa ser feito

1. Separar updates leves de UI dos updates estruturais.
2. Criar persistência incremental para campos pequenos, por exemplo:
   - `viewedCards`
   - `gridLastViewedMessageNumber`
3. Considerar debounce ou batch para persistência de metadados de leitura.
4. Revisar `safeUpdateStory()` para que ele não seja o caminho universal de toda mutação.
5. Se a simplicidade for mais importante que otimização total, pelo menos impedir `saveGame()` completo em eventos muito frequentes.

### Resultado esperado

- menos escrita desnecessária;
- menor churn de memória;
- melhor fluidez nas interações de leitura/navegação.

---

## 5. Ciclo de Vida de Áudio e Microfone Incompleto

### Problema

Existem alguns pontos em que recursos de mídia são criados sem política robusta de descarte.

### Pontos encontrados

#### 5.1 `VoiceInput` pode deixar stream ativo em desmontagem

Em `components/VoiceInput.tsx`, o stream do microfone é encerrado no `onstop`, mas não existe cleanup explícito no unmount caso a gravação ainda esteja ativa.

#### 5.2 `playRawAudio()` cria `AudioContext` por chamada

Em `utils/helpers.ts`, cada reprodução cria um novo `AudioContext` e o código não o fecha ao final.

#### 5.3 `soundService` não tem teardown

Em `services/sound.ts`, o singleton mantém `AudioContext` e buffers carregados por toda a vida da aplicação sem API clara de destruição/liberação.

### Impacto

- retenção transitória ou prolongada de recursos de mídia;
- risco de consumo crescente em sessões longas;
- comportamento inconsistente em mobile/Safari;
- possibilidade de microfone continuar ativo além do esperado em edge cases.

### O que precisa ser feito

1. Em `VoiceInput`, adicionar cleanup no `useEffect` de unmount para:
   - parar o `MediaRecorder` se necessário;
   - encerrar `MediaStreamTrack`s ativos;
   - limpar `chunksRef`.
2. Em `playRawAudio()`, fechar o `AudioContext` ao final da reprodução, ou reutilizar um contexto controlado.
3. Em `soundService`, criar método de teardown para:
   - parar sources ativas;
   - limpar `sounds`;
   - fechar `audioContext` quando apropriado.
4. Revisar o uso de listeners em objetos de mídia para evitar acúmulo silencioso.

### Resultado esperado

- menos retenção de recursos de áudio;
- comportamento mais seguro em sessões longas;
- menor risco de bugs intermitentes em dispositivos móveis.

---

## 6. Timers Sem Cleanup Explícito

### Problema

Há alguns `setTimeout()` usados para resetar estados visuais sem cancelamento explícito quando o componente/hook desmonta antes da execução.

### Onde aparece

- `hooks/useCardNavigation.ts`
- `App.tsx`

### Impacto

- updates tardios em componentes já desmontados;
- warnings e comportamento inconsistente;
- problema pequeno isoladamente, mas sinaliza ciclo de vida frouxo.

### O que precisa ser feito

1. Guardar IDs de timeout em `useRef`.
2. Limpar timeouts no `cleanup` dos efeitos ou antes de criar um novo timeout.
3. Aplicar o mesmo padrão em handlers que disparam timeouts repetidos.

### Resultado esperado

- menos ruído de lifecycle;
- redução de updates assíncronos fora de hora.

---

## 7. Picos Transitórios de Memória em Conversão de Áudio/Base64

### Problema

O pipeline de TTS e algumas conversões para base64 criam alocações temporárias grandes em memória.

Isso não parece ser o principal vazamento estrutural, mas ainda assim gera picos evitáveis.

### Onde está

- `utils/ai.ts`
- `utils/helpers.ts`

### Exemplos

- criação de `new Audio("data:audio/mp3;base64,...")` para cada reprodução;
- construção de strings binárias/base64 em memória;
- criação de `AudioContext` e buffers temporários por operação.

### Impacto

- picos de heap em reproduções repetidas;
- GC mais agressivo durante uso de TTS;
- maior risco de travadas em dispositivos mais fracos.

### O que precisa ser feito

1. Revisar conversões base64 para evitar concatenação custosa de strings quando houver alternativa mais eficiente.
2. Considerar `Blob`/`ObjectURL` com descarte controlado quando fizer sentido.
3. Centralizar/reutilizar recursos de áudio em vez de recriar tudo por reprodução.

### Resultado esperado

- menor pico de alocação por TTS;
- melhor estabilidade em uso intensivo de áudio.

---

## Backlog Prioritário Recomendado

### Fase 1: Correção estrutural imediata

1. Remover `messages` do store `GAMES`.
2. Garantir que apenas a história ativa fique hidratada em memória.
3. Parar de persistir base64 duplicado dentro de `gridSnapshots`.

### Fase 2: Redução de churn

1. Separar persistência leve de UI de persistência estrutural.
2. Reduzir frequência de `saveGame()` completo.
3. Revisar o fluxo de snapshots para não crescer sem controle.

### Fase 3: Higiene de lifecycle

1. Corrigir cleanup de microfone, `AudioContext` e singleton de som.
2. Corrigir timers sem cleanup.
3. Revisar listeners acoplados a recursos do browser.

---

## Ordem Recomendada de Implementação

Se a correção for feita em etapas, a ordem mais racional é:

1. `services/db.ts` - eliminar duplicação persistida.
2. `hooks/useGameEngine.ts` - reduzir retenção em memória da sessão.
3. `types.ts` + `services/ai/openaiClient.ts` + renderização do grid - remover blobs duplicados do histórico.
4. `safeUpdateStory()` e updates de UI - reduzir escrita pesada desnecessária.
5. áudio/microfone/timers - higiene de lifecycle.

---

## Conclusão

O problema principal do projeto hoje é arquitetural: dados grandes são repetidos e mantidos vivos mais tempo do que o necessário.

O foco da correção deve ser:

- evitar duplicação persistida;
- evitar cache ilimitado de histórias completas;
- tornar o histórico do grid leve;
- impedir que pequenos eventos de UI acionem persistência completa.

Depois disso, os ajustes de lifecycle de áudio e timers entram como segunda camada de estabilidade.