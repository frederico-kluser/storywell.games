# Guia de Padrões de Código · storywell.games

_Atualizado em 13 de dezembro de 2025_

Este documento consolida os padrões observados no código atual (React 19 + TypeScript) e serve como referência para novas contribuições. A análise considerou os arquivos principais do front-end (`components/ActionInput`, `StoryCard`, `GridMap`, `VoiceInput`), hooks (`useGameEngine`, `useCardNavigation`), serviços (`services/ai/openaiClient`, `services/db.ts`, `services/ai/prompts/*`) e utilitários (`utils/*.ts`).

## 1. Linguagem, formatação e tooling

- **Linguagem padrão:** TypeScript (`tsconfig` alvo ES2022, JSX `react-jsx`). `allowJs` existe apenas para arquivos de configuração (ex.: `jest.config.js`).
- **Indentação:** predominância de _tabs_ (ver `components/ActionInput/ActionInput.tsx`, `hooks/useGameEngine.ts`, `services/ai/openaiClient.ts`). Ao criar arquivos novos, utilize tabs; se editar arquivos legados em espaços (ex.: `components/VoiceInput.tsx`), converta para tabs para manter consistência.
- **Aspas:** simples (`'...'`) para strings; backticks para templates e prompts multi-linha. Evite `"` quando puder interpolar com `${}`.
- **Imports:** bloco único por categoria – bibliotecas externas primeiro, depois módulos internos com paths relativos curtos. Exemplo: `ActionInput.tsx` importa React/lucide antes dos hooks e serviços.
- **Comentários de arquivo:** prompts e serviços longos usam cabeçalho JSDoc `@fileoverview` descrevendo propósito e exemplos. Replique esse padrão em novos módulos complexos.

## 2. Estrutura e nomenclatura de arquivos

| Item | Padrão | Exemplos |
| --- | --- | --- |
| Componentes React | Pasta e arquivo em PascalCase | `components/StoryCard/StoryCard.tsx`, `components/FateToast/index.tsx` |
| Hooks | snake? não, `useCamelCase` | `hooks/useGameEngine.ts`, `hooks/useThemeColors.tsx` |
| Serviços | descritivo em camelCase | `services/db.ts`, `services/ai/openaiClient.ts` |
| Builders de prompt | `<nome>.prompt.ts` com função `build<Name>Prompt` | `services/ai/prompts/actionOptions.prompt.ts` |
| Utilitários | camelCase curto | `utils/inventory.ts`, `utils/messages.ts` |
| Constantes | arquivos em `constants/`, nomes UPPER_SNAKE | `constants/economy.ts`, `constants/fonts.ts` |
| Testes | `__tests__/` espelhando pasta alvo | `__tests__/components/ActionInput.test.tsx`, `__tests__/services/openaiClient.test.ts` |

## 3. Funções e serviços

- **Assinaturas previsíveis:** quando interagirmos com a OpenAI, o primeiro parâmetro é quase sempre `apiKey`, seguido do estado (`gameState`, `config`, etc.) e `language` (ver `generateGameTurn`, `generateActionOptions`, `analyzeCustomAction`). Mantenha essa ordem em novas integrações.
- **Async/await obrigatório:** evite `Promise.then`; envolva blocos em `try/catch` e logue erros com contexto (`console.error('[Theme] Generation failed:', error)` em `openaiClient.ts`).
- **Schema enforcement:** qualquer prompt que espera JSON adiciona `schemaInstruction` (vide `buildGameMasterPrompt`, `buildCustomActionAnalysisPrompt`). Replique essa prática em novos prompts.
- **Helpers reutilizáveis:** utilize `utils/inventory` (`formatInventoryForPrompt`, `isItemInventory`) e `constants/economy` para evitar repetir lógica em prompts/serviços.

## 4. Componentes React

- **Declaração:** `export const ComponentName: React.FC<Props> = ({ ... }) => { ... }`. Desestruture props logo na assinatura.
- **Hooks locais agrupados:** chame `useState`, `useEffect`, `useMemo` no topo, agrupando estados por domínio (ex.: `ActionInput` separa estados de UI, custom action e Fate).
- **Funções internas nomeadas:** declare handlers (`handleSend`, `handleOptionClick`) com `const` e arrow functions, mantenha a ordem em que são usados.
- **Estilos:** classes Tailwind-like em `className`, com `useThemeColors` injetando cores quando necessário (`ActionInput`).
- **Feedback ao usuário:** componentes que disparam efeitos assíncronos devem setar indicadores de loading (`isLoadingOptions`, `isProcessing`), e exibir fallback visuais/textuais.

## 5. Hooks personalizados

- Nome iniciando com `use`, retorno explícito. `useGameEngine` exemplifica: expõe funções (`handleSendMessage`, `handleCreateStory`) e estado composto.
- **Responsabilidade única:** `useCardNavigation` lida apenas com navegação; `useThemeColors` encapsula contexto visual. Ao criar novos hooks, evite misturar IO e UI.

## 6. Padrões específicos de prompts

- **Estrutura textual:** seções separadas por `=== TITLE ===` (por exemplo, `actionOptions.prompt.ts`, `gameMaster.prompt.ts`).
- **Contexto rico:** inclua universo, localização, inventário, heavy context, últimos diálogos e dados espaciais quando fizer sentido.
- **Regras enumeradas:** descreva passo a passo o raciocínio exigido antes de pedir JSON. `customActionAnalysis.prompt.ts` e `actionOptions.prompt.ts` são modelos ideais.
- **Schema JSON embutido:** sempre adicione `schemaInstruction` com `JSON.stringify(schema, null, 2)` antes de enviar ao modelo.

## 7. Persistência e tipos

- **Fonte única de tipos:** `types.ts` define `GameState`, `GMResponse`, `ActionOption`, etc. Não declare duplicatas em componentes.
- **Data Mapper:** use `dbService.saveGame`/`loadGame` para qualquer interação com IndexedDB; nunca interaja direto com IndexedDB fora desse serviço.
- **Inventário tipado:** preferir `Item[]`; use `isItemInventory` quando houver compatibilidade com formatos legados.

## 8. Erros, logs e UX

- Use `console.error/warn/info` com prefixos descritivos (alguns módulos utilizam emojis – mantenha apenas se a saída permanecer legível).
- Para feedback ao usuário, prefira componentes visuais (`FateToast`, banners) em vez de `alert`; `VoiceInput.tsx` ainda usa `alert(...)` e deve ser atualizado.
- Sempre trate exceções com mensagens amigáveis e, quando possível, fallback (ex.: `analyzeCustomAction` devolve 15/15 em caso de erro).

## 9. Testes e ferramentas

- **Frameworks:** Jest + Testing Library; `fake-indexeddb` para testar persistência.
- **Estrutura:** use mocks regionais para serviços (`jest.mock('../../services/ai/openaiClient')`).
- **Snapshots:** quando alterar prompts críticos, atualize e valide snapshots relacionados (vide `tests/core.test.ts`).
- **Scripts úteis:** `npm run test:watch`, `npm run validate:translations`.

## 10. Documentação

- README e documentos em `docs/` devem ser atualizados sempre que mudar fluxo, prompts ou estrutura de dados. Utilize o mesmo tom descritivo/métrico (seções claras, tabelas, diagramas Mermaid).

## 11. Itens fora do padrão (pendências)

| Item | Observação |
| --- | --- |
| `components/VoiceInput.tsx` | Usa indentação em espaços e aspas duplas, dispara `alert()` diretamente para erros e consome `transcribeAudio` via `services/geminiService`. Deve ser alinhado ao restante da base (tabs, mensagens amigáveis, import direto de `services/ai`). |
| `services/geminiService.ts` | Apenas reexporta `openaiClient`. Mantém nomenclatura legada "Gemini" que já não condiz com o uso do GPT-4.1. Ideal remover/renomear para evitar confusão e atualizar imports (`VoiceInput`, testes). |
| `tests/unit.test.ts` | Ainda referencia `geminiService` (legado). Revisar para aderir ao padrão atual de serviços em `services/ai`. |

Manter este documento versionado junto com o código garante que colaboradores novos tenham clareza sobre estilo e arquitetura antes de abrir PRs.
