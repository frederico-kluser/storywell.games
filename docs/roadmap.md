
# storywell.games - Documentação Viva & Roadmap

## Visão Geral do Sistema: O Estado da Arte

Este projeto é um **RPG Textual Infinito Single-Player** que utiliza Inteligência Artificial Generativa (OpenAI GPT-4.1) para simular uma experiência de "Chat em Grupo". O jogador interage como se estivesse em um grupo de WhatsApp ou Discord, onde os outros participantes são NPCs e o Narrador, todos controlados por uma Máquina de Estados baseada em LLM.

**Versão Atual:** 1.3.0

---

### O Que a Aplicação FAZ AGORA (Versão 1.3.0)

1.  **Simulação de Chat em Grupo (Single Player):**
    *   A interface simula múltiplos participantes. O jogador fala à direita; NPCs e Narrador falam à esquerda.
    *   **Sistema de Mensagens Híbrido:** Suporta "Diálogo" (In-Character), "Narração" e "Mensagens de Sistema" (OOC).
    *   **Gerador de Avatares:** Uso do DALL-E 3 para gerar retratos pixel-art retrô dos personagens na hora.

2.  **Infraestrutura de Dados Relacional (IndexedDB):**
    *   O sistema não usa mais um simples JSON blob. Ele implementa um banco de dados **Relacional Local** completo.
    *   **Tabelas Normalizadas:** `Games`, `Characters`, `Locations`, `Messages`, `Events`.
    *   Cada entidade possui Chaves Estrangeiras (`gameId`) e índices dedicados, permitindo escalabilidade e consultas otimizadas.
    *   Os avatares (Base64) são salvos diretamente na tabela `Characters`.

3.  **Motor de Lógica e Regras (Rule Engine):**
    *   A IA atua como árbitro de regras em tempo real.
    *   **Validação de Inventário:** Ações como "comer pão" ou "atacar com espada" só funcionam se o item existir no inventário.
    *   **Custo de Recursos:** Magias e habilidades deduzem `mana` ou `stamina` automaticamente.
    *   **Propriedades Ocultas:** Itens podem ter efeitos (ex: veneno) que alteram status sem aviso prévio.

4.  **Criação de Mundo Assistida (Wizard):**
    *   Permite criar universos "Originais" ou baseados em "Universos Existentes".
    *   Configura estilo de combate e densidade de diálogos.

5.  **Interface "Paper Lab" Retrô:**
    *   Estética visual limpa de alto contraste (Branco/Preto/Pedra), inspirada em laboratórios antigos e relatórios impressos.
    *   Modal de Status e Inventário acessível.

6.  **Entrada Multimodal (Voz):**
    *   Captura e transcrição de áudio via Whisper.
    *   Text-to-Speech com gpt-4o-mini-tts (11 vozes disponíveis).

7.  **Sistema de Destino (Fate):**
    *   Cada sugestão de ação inclui probabilidades de eventos positivos/negativos.
    *   Feedback visual via FateToast.

8.  **Sistema de Itens e Currency (v1.2.0):**
    *   Itens estruturados com categorias, preços e efeitos.
    *   Economia com gold e multiplicadores de compra/venda.
    *   Migração automática de saves legados.

9.  **Sistema de Qualidade Narrativa (v1.3.0):**
    *   **15 Presets de Gênero:** Epic Fantasy, Dark Fantasy, Noir, Cyberpunk, Cosmic Horror, etc.
    *   **Sistema "Mostrar, Não Contar":** Detecção automática de violações e sugestões de reescrita.
    *   **Diferenciação de Voz de NPCs:** Perfis de voz baseados em educação, classe social, profissão.
    *   **Controle de Ritmo (Pacing):** 5 níveis de tensão com avisos automáticos.
    *   **Foreshadowing/Callbacks:** Rastreamento de elementos narrativos plantados.
    *   **Análise de Qualidade:** Scoring 0-100 com identificação de problemas.

10. **Transporte de Campanhas:**
    *   Exportação/importação versionada de saves (JSON assinado) + validação local.

---

### O Que a Aplicação NÃO FAZ AINDA (Limitações & Futuro)

1.  **Memória de Longo Prazo (RAG):**
    *   *Limitação:* Contexto limitado às últimas mensagens e estado atual.
    *   *Solução:* Implementar busca vetorial de eventos passados usando a tabela `Events`.

2.  **Validação de Universos Existentes:**
    *   *Limitação:* A IA pode alucinar fatos sobre universos famosos.
    *   *Solução:* Google Search Grounding.

3.  **Geração de Imagens de Cenário:**
    *   *Limitação:* Apenas avatares de personagens são gerados.
    *   *Solução:* Integrar geração de backgrounds via DALL-E.

4.  **Multiplayer:**
    *   *Limitação:* Apenas single-player.
    *   *Solução futura:* Backend com WebSockets.

---

## Roadmap Técnico

### Fase 1: Fundação do Sistema (Concluído)
*   Arquitetura React + TypeScript.
*   **Migração para IndexedDB Relacional (Normalização de Dados).**
*   **Motor de Lógica Avançada (Validação de Ações, Custos, Inventário).**
*   Prompt System do GM (GPT-4.1).
*   Geração de Avatares (DALL-E 3).
*   Inventário Básico.
*   Sistema de Mensagens OOC (Out Of Character).

### Fase 2: Economia e Itens (Concluído - v1.2.0)
*   Sistema de Itens estruturados com categorias.
*   Sistema de Currency (gold) com regras de economia.
*   Migração automática de saves legados.
*   Regras de preços por categoria.
*   Gold inicial por tipo de universo.

### Fase 3: Qualidade Narrativa (Concluído - v1.3.0)
*   **15 Presets de Gênero Narrativo** com vocabulário, tom e técnicas específicas.
*   **Sistema "Mostrar, Não Contar"** com detecção automática e sugestões.
*   **Diferenciação de Voz de NPCs** com perfis e templates.
*   **Controle de Ritmo (Pacing)** com 5 níveis e avisos automáticos.
*   **Sistema de Foreshadowing e Callbacks** para elementos narrativos.
*   **Análise de Qualidade Narrativa** com scoring e identificação de problemas.
*   **Heavy Context Incremental** com rastreamento de threads narrativas.
*   **Universe Context** com arquétipos de voz de NPCs.

### Fase 4: Profundidade (Em Desenvolvimento)
*   Memória RAG Local (Vetores).
*   Google Grounding para universos licenciados.
*   Dinâmica de mundo (NPCs se movem sozinhos).
*   Sistema de quests estruturadas.

### Fase 5: Imersão (Futuro)
*   Geração de Imagens de Cenário (Backgrounds).
*   Voz Real avançada (Gemini Live ou similar).
*   Mapas interativos.
*   Editor de mundo visual.

### Fase 6: Social (Futuro Distante)
*   Multiplayer cooperativo.
*   Compartilhamento de universos.
*   Marketplace de campanhas.

---

## Histórico de Versões

| Versão | Data | Principais Mudanças |
|--------|------|---------------------|
| 1.0.0 | - | Sistema base com IndexedDB, avatares, motor de regras |
| 1.1.0 | - | Sistema de Destino (Fate), VoiceInput, VoiceSettings |
| 1.2.0 | - | Sistema de Itens e Currency, migração automática |
| 1.3.0 | Dez 2025 | Sistema de Qualidade Narrativa completo |

---

## Próximos Passos Prioritários

1. **RAG Local** - Implementar busca vetorial para memória de longo prazo
2. **Google Grounding** - Validar fatos de universos existentes
3. **Dinâmica de Mundo** - NPCs com comportamento autônomo
4. **Cenários Gerados** - Imagens de background por cena

---

*Documento atualizado em Dezembro de 2025 - Versão 1.3.0*
