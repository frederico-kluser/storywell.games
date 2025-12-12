# Relatório de Substituição de Modelos OpenAI (Dez/2025)

## 1. Contexto atual do storywell.games

- O roteador de modelos central está em [services/ai/openaiClient.ts](services/ai/openaiClient.ts) e hoje concentra
  quase tudo em `gpt-4.1`, `gpt-4.1-mini` e `gpt-4.1-nano`.
- Tarefas de fala usam `gpt-4o-mini-tts` com fallback para `tts-1`, enquanto a transcrição segue em `whisper-1`,
  conforme [utils/ai.ts](utils/ai.ts).
- As automações de voz e imagem se apoiam em DALL·E 3 e Whisper, mas não exploram os upgrades descritos no guia
  [docs/openai_models_2025.md](docs/openai_models_2025.md).

## 2. Critérios para a nova matriz

1. **Reasoning adaptativo** — aproveitar `reasoning_effort`/`verbosity` dos modelos GPT-5.x para equilibrar custo ×
   precisão ([docs/openai_models_2025.md](docs/openai_models_2025.md#L10-L78)).
2. **Janela de contexto** — manter GPT-4.1 apenas para cenários que realmente usem >500k tokens, já que GPT-5.x oferece
   400k com reasoning embutido ([docs/openai_models_2025.md](docs/openai_models_2025.md#L78-L118)).
3. **Multimodalidade e latência** — adotar GPT-4o mini para workloads de UI (voz/imagem) pela combinação de custo baixo
   e suporte realtime ([docs/openai_models_2025.md](docs/openai_models_2025.md#L118-L190)).
4. **Escalabilidade financeira** — combinar prompt caching (–90%) + Batch API (–50%) para amortizar migração para
   GPT-5.2 quando necessário ([docs/openai_models_2025.md](docs/openai_models_2025.md#L190-L250)).

## 3. Recomendações por fluxo

### 3.1 Motor narrativo e criação de universo

| Etapa                                                  | Modelo atual | Substituição sugerida                                                                                                      | Benefícios                                                                                                                                                                                                               | Observações                                                                                                                     |
| ------------------------------------------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `gameMaster`, `storyInitialization`, `universeContext` | `gpt-4.1`    | **Primário:** `gpt-5` com `reasoning_effort=medium`. **Fallback:** `gpt-4.1` apenas quando precisar de >400k tokens úteis. | GPT-5 mantém a mesma janela efetiva (400k totais) com reasoning configurável e custo $1,25/$10 por 1M tokens, liberando CoT explícito e custom tools ([docs/openai_models_2025.md](docs/openai_models_2025.md#L30-L72)). | Atualize o wrapper `queryLLM` para aceitar `reasoning_effort` e `verbosity`. Configure caching para prompts longos de universo. |
| Missões de alta complexidade / avaliações pós-turno    | `gpt-4.1`    | **Burst:** `gpt-5.2` apenas para auditorias narrativas, heavy context diff ou debugging.                                   | `gpt-5.2` agrega 128k tokens só para reasoning, ferramentas MCP e 90% de desconto via cache ([docs/openai_models_2025.md](docs/openai_models_2025.md#L12-L42)).                                                          | Isolar em fila Batch noturna reduz custo e evita impacto no loop síncrono.                                                      |

### 3.2 Onboarding, heavy context e processamento de mensagens

| Etapa                                                                                                           | Modelo atual   | Substituição sugerida                                                                  | Benefícios                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onboarding`, `heavyContext`, `playerMessageProcessing`, `customActionAnalysis`, `actionOptions`, `themeColors` | `gpt-4.1-mini` | `gpt-5 mini` como padrão; `gpt-4o mini` para fluxos extremamente sensíveis a latência. | `gpt-5 mini` replica a inteligência do GPT-5 base por $0,25/$2 por 1M tokens e mantém 400k de contexto ([docs/openai_models_2025.md](docs/openai_models_2025.md#L42-L66)). Já `gpt-4o mini` custa $0,15/$0,60 com multimodalidade para features de UI ([docs/openai_models_2025.md](docs/openai_models_2025.md#L118-L150)). |

### 3.3 Classificação e rotinas leves

| Etapa                                                       | Modelo atual   | Substituição sugerida    | Benefícios                                                                                                                                                                                           |
| ----------------------------------------------------------- | -------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `textClassification`, filtros anti-spam, validações formais | `gpt-4.1-nano` | `gpt-5 nano`             | Mesmo preço de saída ($0,40/1M) e input mais barato ($0,05/1M), porém com suporte a `reasoning_effort` básico e 400k de contexto ([docs/openai_models_2025.md](docs/openai_models_2025.md#L42-L60)). |
| Futuro sistema de moderação                                 | —              | `omni-moderation-latest` | Endpoint gratuito multimodal para hate/violence/sexual ([docs/openai_models_2025.md](docs/openai_models_2025.md#L150-L190)).                                                                         |

### 3.4 Voz e áudio

| Função                 | Modelo atual               | Substituição sugerida                                                                                               | Por quê                                                                                                                                                           |
| ---------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text-to-speech com tom | `gpt-4o-mini-tts` (manual) | Mantê-lo como padrão, mas migrar para o endpoint Responses/Realtime para reduzir latência e simplificar instruções. | Mesmo modelo recomendado oficialmente para voice agents, com custo $0,60/1M tokens de texto ([docs/openai_models_2025.md](docs/openai_models_2025.md#L150-L190)). |
| Speech-to-text         | `whisper-1`                | `gpt-4o-transcribe` ou `gpt-4o mini transcribe`                                                                     | Melhor WER, suporte a streaming e mesma pilha de autenticação dos demais modelos ([docs/openai_models_2025.md](docs/openai_models_2025.md#L150-L190)).            |
| Voice agents imersivos | —                          | `gpt-realtime` + `gpt-4o mini TTS`                                                                                  | Padrão indicado para experiências WebRTC/WS com respostas faladas ([docs/openai_models_2025.md](docs/openai_models_2025.md#L150-L190)).                           |

### 3.5 Imagens e multimodalidade

- Substituir chamadas diretas a DALL·E 3 por **GPT Image 1** (ou mini) quando precisar acoplar geração de imagem ao
  mesmo contexto textual ([docs/openai_models_2025.md](docs/openai_models_2025.md#L130-L150)).
- Planejar suporte a **Sora 2** para trailers de campanha caso o roadmap de marketing peça vídeo curto.

## 4. Matriz resumida de migração

| Fluxo                         | Situação atual                 | Próximo passo                                       | Observações técnicas                                                                                                              |
| ----------------------------- | ------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Loop narrativo + creation     | `gpt-4.1`                      | `gpt-5` (tempo real) + `gpt-5.2` (auditoria)        | Atualizar `MODEL_CONFIG` e permitir `responses`/`reasoning_effort` em [services/ai/openaiClient.ts](services/ai/openaiClient.ts). |
| Context builders & UX helpers | `gpt-4.1-mini`                 | `gpt-5 mini` / `gpt-4o mini`                        | Incluir roteamento dinâmico por SLA/token disponível.                                                                             |
| Classificações                | `gpt-4.1-nano`                 | `gpt-5 nano`                                        | Pode compartilhar cache e throttle com fluxo principal.                                                                           |
| Voz                           | `gpt-4o-mini-tts`, `whisper-1` | `gpt-4o mini TTS` (Responses) + `gpt-4o Transcribe` | Ajustar `generateSpeechWithTTS`/`transcribeAudio` em [utils/ai.ts](utils/ai.ts).                                                  |
| Imagem                        | DALL·E 3                       | GPT Image 1                                         | Permite compartilhar preset/contexto.                                                                                             |
| Segurança                     | —                              | `omni-moderation-latest`                            | Inserir antes do envio ao cliente final.                                                                                          |

## 5. Roadmap sugerido

1. **Refatorar o cliente OpenAI** para aceitar Responses API, `reasoning_effort`, `verbosity` e metadados de caching.
2. **Migrar gradualmente o GM loop**: execute A/B entre `gpt-4.1` e `gpt-5` usando gravações reais, medindo Fate success
   rate e latência.
3. **Trocar onboarding/contexto** para `gpt-5 mini`, habilitando prompt caching (reduce 90% do custo de system prompts
   reutilizados).
4. **Implantar GPT-5 nano** nos validadores e adicionar `omni-moderation-latest` à pipeline de saída.
5. **Atualizar utilitários de áudio** para GPT-4o Transcribe + Responses TTS; adote structured logging com emojis para
   monitorar tokens/audio ([docs/openai_models_2025.md](docs/openai_models_2025.md#L200-L250)).
6. **Rever assets visuais** com GPT Image 1 e documentar presets para StoryCreator.

## 6. Métricas e riscos

- **KPIs**: custo por sessão, latência média por turno, % de prompts atendidos via cache, reasoning tokens gastos vs.
  output tokens, WER em STT e MOS subjetivo do TTS.
- **Riscos**:
  - _Regressão narrativa_ se o ajuste de `reasoning_effort` for excessivo. Mitigar criando testes offline no diretório
    `__tests__/services`.
  - _Custo surpresa_ caso reasoning tokens explodam; monitore structured logs já adotados no código e aplique limites
    máximos por chamada.
  - _Compatibilidade de SDK_: Responses API ainda não está encapsulada no helper atual; planeje refatoração incremental
    para não bloquear release.

Com essas trocas, o storywell.games passa a explorar a geração agentic dos modelos GPT-5.x, ganha redundância multimodal
com GPT-4o mini e reduz custos fixos ao mesmo tempo em que libera features (voz em tempo real, auditoria narrativa,
moderação multimodal) alinhadas às diretrizes mais recentes da OpenAI.
