# Guia definitivo dos modelos da OpenAI API — dezembro de 2025

Este documento consolida e padroniza as informações dos arquivos `new-1.md`, `new-2.md` e `new-3.md`, ajustando todos os
dados a partir da documentação pública mais recente da OpenAI. A ideia é funcionar como uma "fonte única da verdade"
para quem precisa escolher, combinar ou operar modelos na API ao final de 2025.

## Como ler este guia

- **Destaques rápidos**: monte o contexto estratégico antes de mergulhar em tabelas de preço ou specs.
- **Matriz de decisão**: identifique o eixo crítico (custo, reasoning, contexto, multimodalidade) e vá direto à família
  recomendada.
- **Checklists práticos**: use as seções de ferramentas/tiers para planejar operações (caching, Batch, Responses API,
  AgentKit).
- **Referências oficiais**: cada número de preço, contexto ou limite aponta para a fonte correspondente ao final do
  arquivo.

## Destaques confirmados para dezembro/2025

- **GPT-5.2 se torna o flagship**: 400k tokens de contexto total (272k input + 128k reasoning/output), cutoff em
  31/ago/2025, suporte a `reasoning_effort` (minimal/low/medium/high) e `verbosity`, além de ferramentas nativas
  (web/file search, image generation, code interpreter, MCP). Preço base: $1,75/1M input, $14/1M output e **90% de
  desconto** para cached input ($0,175/1M).[^2]
- **GPT-5 segue como base reasoning**: lançado em 7/ago/2025, mantém o mesmo envelope de 400k tokens e introduz
  parâmetros `reasoning_effort` + `verbosity`, além de custom tools e suporte oficial a agentes agentic (Codex CLI, Apps
  SDK). Preços: $1,25/$10 (input/output), com variantes mini ($0,25/$2) e nano ($0,05/$0,40).[^3]
- **Série o entra em modo legado premium**: o3 continua disponível (200k contexto, $2/$8) para workloads que exigem a
  etapa deliberativa tradicional, enquanto o4-mini ($1,10/$4,40) virou a opção economicamente equilibrada para reasoning
  rápido.[^4][^5]
- **GPT-4.1 permanece rei do contexto longo**: 1.047.576 tokens de janela, 32k de output e latência baixa sem etapa de
  thinking; recomendação primária para ingestão massiva e workflows sem reasoning.[^6]
- **GPT-4o e GPT-4o mini seguram custo/latência**: 128k tokens, multimodalidade (texto+imagem), function calling
  completo e preços de $2,50/$10 e $0,15/$0,60 respectivamente, tornando-os ideais para chatbots e pipelines de alto
  volume.[^7][^8]
- **Ferramentas e descontos**: Batch API aplica 50% de economia em execuções assíncronas, enquanto prompt caching caiu
  para uma fração do custo em modelos novos (ex.: $0,175/1M para GPT-5.2). AgentKit permanece gratuito até o "Run" e
  oferece storage com medição diária.[^1]

## Matriz rápida de decisão

| Necessidade principal                                     | Modelo base recomendado                            | Por quê                                                                                               |
| --------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Reasoning profundo com limites críticos de qualidade      | GPT-5.2 (ou GPT-5.2 pro se custo for secundário)   | 400k tokens, parâmetros `reasoning_effort`/`verbosity`, melhor desempenho em coding/tool use.[^2][^3] |
| Long context (>500k tokens) sem thinking                  | GPT-4.1 (ou mini/nano para custo)                  | 1M tokens de janela com latência previsível e fine-tuning disponível.[^6]                             |
| Custo mínimo em chatbots e automações simples             | GPT-4o mini ou GPT-5 nano                          | $0,15/$0,60 e $0,05/$0,40 por 1M tokens, ainda com function calling/structured outputs.[^3][^8]       |
| STEM/coding que exigem CoT explícito, mas orçamento médio | o4-mini                                            | $1,10/$4,40, 200k tokens e reasoning tokens explícitos sem custo dos flagships.[^5]                   |
| Voz em tempo real (speech in/out)                         | GPT-realtime / GPT-4o mini TTS + GPT-4o Transcribe | Modelos dedicados com billing separado para áudio e suporte a WebRTC/WebSocket.[^1][^11][^12]         |
| Pipelines RAG/semantic search                             | text-embedding-3-large ou -small                   | Matryoshka embeddings até 3.072 dimensões e custo de $0,13/$0,02 por 1M tokens.[^10]                  |
| Monitoramento e safety                                    | omni-moderation-latest                             | Modelo multimodal gratuito para hate/violence/sexual/self-harm.[^9]                                   |

## Família GPT-5.x (flagships)

| Modelo            | Contexto (input + reasoning/output)                    | Preço (input/output/cached) | Destaques & uso recomendado                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GPT-5.2           | 400k (272k + 128k)                                     | $1,75 / $14 / $0,175        | Razão custo x qualidade para agentes de código, planejamento corporativo e fluxos multimodais (texto + imagem). Melhor escolha quando há ferramentas no loop e necessidade de CoT automático.[^2] |
| GPT-5.2 pro       | (mesmo envelope; OpenAI não divulga limites distintos) | $21 / $168 / —              | Variante com mais compute para auditoria, finanças, jurídico e workloads críticos onde latência é secundária.[^1]                                                                                 |
| GPT-5             | 400k totais                                            | $1,25 / $10 / $0,125        | Versão base reasoning com suporte a `reasoning_effort = minimal` (respostas rápidas), custom tools e integrações Codex. Ótima para IDEs e agentes que operam horas seguidas.[^3]                  |
| GPT-5 mini        | 400k totais                                            | $0,25 / $2 / $0,025         | Trade-off custo/latência para chatops, classificações e tarefas bem definidas. Pode ser distillado a partir do GPT-5 completo.[^3]                                                                |
| GPT-5 nano        | 400k totais                                            | $0,05 / $0,40 / $0,005      | Volume extremo (triagens, roteadores, validações). Mantém `reasoning_effort` para casos em que a etapa mínima ainda agrega valor.[^3]                                                             |
| GPT-5 chat/latest | 400k totais                                            | $1,25 / $10 / —             | Router não reasoning usado no ChatGPT, exposto na API para quem prefere comportamento mais conversacional e determinístico.[^3]                                                                   |

### Práticas recomendadas

- Ajuste `reasoning_effort` dinamicamente: `minimal` para rotinas rápidas, `medium` no dia a dia, `high`/`xhigh` apenas
  quando benchmarks internos provarem ganho real (o custo cresce proporcionalmente aos reasoning tokens).[^2][^3]
- Use `verbosity` para manter respostas enxutas em pipelines longos e reduzir tokens de output.
- Combine **prompt caching** (até 90% de desconto) com **Batch API** (−50%) para workloads repetitivos, derrubando CAPEX
  computacional.[^1][^2]

## Série de reasoning (o3, o4-mini, o3-pro)

| Modelo  | Contexto    | Preço (input/output/cached) | Situação                       | Quando escolher                                                                                                                                     |
| ------- | ----------- | --------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| o3      | 200k / 100k | $2 / $8 / $0,50             | Ativo, sucedido por GPT-5      | Matemática, ciência e coding que já dependem de prompts calibrados para o3; oferece visão + web search, mas com latência maior.[^4]                 |
| o3-pro  | 200k / 100k | $20 / $80 / —               | Premium                        | Tarefas mission-critical onde repetibilidade e explicabilidade do chain-of-thought interno são mandatórias (compliance, trading, P&D sensível).[^1] |
| o4-mini | 200k / 100k | $1,10 / $4,40 / $0,275      | Ativo, sucedido por GPT-5 mini | Reasoning acessível para equipes que precisam de CoT explícito mas têm SLA apertado ou budget limitado.[^5]                                         |

### Notas

- Todos os modelos o-series ignoram `temperature/top_p` e cobram reasoning tokens como output; planeje orçamentos
  considerando cadeias longas.
- A OpenAI recomenda migrar gradualmente para GPT-5 (`reasoning_effort` alto) quando for possível aproveitar router
  único + tool use avançado.[^4][^5]

## GPT-4.1 e GPT-4o: contexto longo e multimodalidade econômica

| Família               | Contexto                      | Preço (input/output/cached)                            | Diferenciais                                                                                                                                                                        |
| --------------------- | ----------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GPT-4.1 / mini / nano | 1.047.576 tokens / 32k output | $2 / $8 / $0,50 (mini: $0,40/$1,60; nano: $0,10/$0,40) | Melhor janela de contexto sem reasoning. Ideal para ingestão de dossiês, relatórios e análises legais; suporta fine-tuning, structured outputs e ferramentas padrão.[^6]            |
| GPT-4o                | 128k / 16.384 output          | $2,50 / $10 / $1,25                                    | Modelo multimodal versátil (texto + imagem) com latência baixa, streaming, fine-tuning e endpoints realtime/audio. Bom default para apps gerais sem necessidade de 400k tokens.[^7] |
| GPT-4o mini           | 128k / 16.384                 | $0,15 / $0,60 / $0,075                                 | Aposta de custo mínimo mantendo multimodalidade e tool use. Excelente para distillation e workloads serverless.[^8]                                                                 |

## Modelos especializados

### Imagens e vídeo

- **GPT Image 1 / GPT Image 1 mini**: billed por tokens + custo aproximado de $0,01/$0,04/$0,17 por imagem quadrada
  (qualidades low/medium/high). Integrado ao Responses API para tool chaining.[^1]
- **Sora 2 / Sora 2 Pro**: geração de vídeo com áudio sincronizado; tarifas atuais começam em $0,10 por clipe 720p e
  chegam a $0,50 em 1792×1024 na versão Pro.[^1]

### Áudio (voz e transcrição)

| Modelo                           | Tipo                     | Preço                                                        | Observações                                                                                                |
| -------------------------------- | ------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| GPT-4o Transcribe                | Speech-to-text           | $2,50/1M tokens text + $6/1M tokens de áudio                 | Latência baixa, melhor WER que Whisper, suporta streaming e endpoints Responses/Realtime.[^11]             |
| GPT-4o mini Transcribe           | Speech-to-text econômico | (mesmo esquema com fator 0,5)                                | Use para call centers ou meeting bots com volume alto.[^1]                                                 |
| GPT-4o mini TTS                  | Text-to-speech           | $0,60/1M tokens input + $12/1M tokens áudio                  | 11 vozes, suporte a instruções de estilo e integração realtime.[^12]                                       |
| GPT-realtime / GPT-realtime-mini | Texto/áudio low-latency  | $4/$0,60 por 1M tokens input (texto) + áudio conforme tabela | Ideal para voice agents WebRTC/WebSocket; combine com GPT-4o mini TTS para sair com áudio sintetizado.[^1] |

### Embeddings & RAG

| Modelo                 | Dimensões              | Preço           | Uso                                                                                                 |
| ---------------------- | ---------------------- | --------------- | --------------------------------------------------------------------------------------------------- |
| text-embedding-3-large | Até 3.072 (Matryoshka) | $0,13/1M tokens | Máxima precisão e suporte a redução de dimensionalidade sem retreinar, ideal para RAG premium.[^10] |
| text-embedding-3-small | 1.536                  | $0,02/1M tokens | Custo-benefício para chatbots, busca semântica e classificação leve.[^10]                           |

### Moderação e segurança

- **omni-moderation-latest**: gratuito, aceita texto + imagens e cobre hate, violence, harassment, self-harm, sexual e
  ilícitos em um único endpoint. Deve ser usado como primeira camada antes de respostas ao usuário.[^9]

## Ferramentas da plataforma e otimização de custos

- **Responses API**: padrão recomendado; combina chat completions com tool use, streaming e estado (Conversations API).
  Priorize Responses para explorar toolchains, connectors/MCP e Code Interpreter embutido.[^2][^3]
- **Batch API**: até 24h de latência com 50% de desconto em input/output. Combine com caching para pipelines noturnos ou
  ETLs.[^1]
- **Prompt caching estendido**: GPT-5.x e GPT-5.2 mantêm cache de prompts por até 24h; repetição massiva de
  system/contextos reduz custo de forma agressiva.
- **AgentKit & ChatKit**: design e testes gratuitos até o momento de "Run". Depois, storage é cobrado a $0,10/GB-dia
  após o 1º GB; ideal para prototipar agentes com logging estruturado antes de promover para produção.[^1]
- **Custom tools + MCP**: preferidos para automação em vez de hacks DOM; permitem definir gramáticas ou regex para tool
  inputs, reduzindo erros de parsing.[^3]
- **Structured logging**: padronize logs com contexto (emoji + tag) para acompanhar reasoning tokens, tool calls e
  falhas — prática já adotada na documentação oficial para debugging de agentes complexos.[^3]

## Rate limits e tiers (exemplo: GPT-5.2)

| Tier   | Requests/min  | Input TPM  | Output TPM     |
| ------ | ------------- | ---------- | -------------- |
| Free   | Não suportado | —          | —              |
| Tier 1 | 500           | 500.000    | 1.500.000      |
| Tier 2 | 5.000         | 1.000.000  | 3.000.000      |
| Tier 3 | 5.000         | 2.000.000  | 100.000.000    |
| Tier 4 | 10.000        | 4.000.000  | 200.000.000    |
| Tier 5 | 15.000        | 40.000.000 | 15.000.000.000 |

> **Dica**: os limites se elevam automaticamente conforme o gasto acumulado. Planeje rollouts graduais (Tier 1 → Tier 3)
> reaproveitando Batch/caching para não estourar TPM durante migrações.[^2]

## Checklist para escolher o modelo

1. **Defina o eixo crítico** (reasoning, contexto, multimodalidade, custo) e filtre a família correspondente (GPT-5.x,
   o-series, GPT-4.1, GPT-4o, especializados).
2. **Estime tokens e ferramental**: se haverá tool use pesado, prefira modelos com suporte a `reasoning_effort` e custom
   tools (GPT-5.2/5). Caso contrário, GPT-4o mini resolve.
3. **Calcule o TCO**: aplique caching + Batch + distillation antes de subir de tier; monitore reasoning tokens cobrados
   como output.
4. **Planeje fallback**: mantenha pelo menos um modelo sem reasoning (ex.: GPT-4o mini) para absorver picos ou falhas
   dos flagships.
5. **Implemente observabilidade**: capture diagnostic strings e structured logging com emojis/tags por etapa (prompt,
   tool, resposta) para auditar latência e RUs.
6. **Teste segurança**: passe todo output público por omni-moderation-latest e monitore limites da política de uso
   aceitável.

## Referências

[^1]: OpenAI — API Pricing. [https://openai.com/api/pricing](https://openai.com/api/pricing)
[^2]:
    OpenAI — GPT-5.2 model card.
    [https://platform.openai.com/docs/models/gpt-5.2](https://platform.openai.com/docs/models/gpt-5.2)

[^3]:
    OpenAI — "Introducing GPT-5 for developers".
    [https://openai.com/index/introducing-gpt-5-for-developers/](https://openai.com/index/introducing-gpt-5-for-developers/)

[^4]: OpenAI — o3 model card. [https://platform.openai.com/docs/models/o3](https://platform.openai.com/docs/models/o3)
[^5]:
    OpenAI — o4-mini model card.
    [https://platform.openai.com/docs/models/o4-mini](https://platform.openai.com/docs/models/o4-mini)

[^6]:
    OpenAI — GPT-4.1 model card.
    [https://platform.openai.com/docs/models/gpt-4.1](https://platform.openai.com/docs/models/gpt-4.1)

[^7]:
    OpenAI — GPT-4o model card.
    [https://platform.openai.com/docs/models/gpt-4o](https://platform.openai.com/docs/models/gpt-4o)

[^8]:
    OpenAI — GPT-4o mini model card.
    [https://platform.openai.com/docs/models/gpt-4o-mini](https://platform.openai.com/docs/models/gpt-4o-mini)

[^9]:
    OpenAI — omni-moderation-latest model card.
    [https://platform.openai.com/docs/models/omni-moderation-latest](https://platform.openai.com/docs/models/omni-moderation-latest)

[^10]:
    OpenAI — text-embedding-3-large model card.
    [https://platform.openai.com/docs/models/text-embedding-3-large](https://platform.openai.com/docs/models/text-embedding-3-large)

[^11]:
    OpenAI — GPT-4o Transcribe model card.
    [https://platform.openai.com/docs/models/gpt-4o-transcribe](https://platform.openai.com/docs/models/gpt-4o-transcribe)

[^12]:
    OpenAI — GPT-4o mini TTS model card.
    [https://platform.openai.com/docs/models/gpt-4o-mini-tts](https://platform.openai.com/docs/models/gpt-4o-mini-tts)
