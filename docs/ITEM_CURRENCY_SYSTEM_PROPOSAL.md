# Proposta de Sistema de Itens e Currency - storywell.games

**Data:** 2025-12-11
**Autor:** Claude (Análise baseada em pesquisa)
**Status:** Proposta para Implementação

---

## Sumário

1. [Contexto e Problemas Atuais](#1-contexto-e-problemas-atuais)
2. [Pesquisa e Referências](#2-pesquisa-e-referências)
3. [Arquitetura Proposta](#3-arquitetura-proposta)
4. [Sistema de Itens](#4-sistema-de-itens)
5. [Sistema de Currency](#5-sistema-de-currency)
6. [Modificações nos Prompts](#6-modificações-nos-prompts)
7. [Function Calling para State Management](#7-function-calling-para-state-management)
8. [Plano de Implementação](#8-plano-de-implementação)

---

## 1. Contexto e Problemas Atuais

### 1.1 Diagnóstico

O sistema atual do storywell.games possui falhas críticas:

| Problema | Impacto | Severidade |
|----------|---------|------------|
| Action Options não conhece inventário | Impossível sugerir ações com itens | 🔴 Crítico |
| Currency inexistente | Economia não funciona | 🔴 Crítico |
| Itens são apenas strings | Sem metadados, quantidades ou valores | 🟡 Alto |
| GM não tem instruções de economia | Comportamento imprevisível em trades | 🟡 Alto |
| Sem validação server-side | Estado pode corromper | 🟠 Médio |

### 1.2 Fluxo Atual Quebrado

```
Player: "Uso minha poção"
   ↓
Action Options Prompt: (não sabe que player tem poção!)
   ↓
Gera opções genéricas sem mencionar itens
   ↓
❌ Experiência ruim
```

---

## 2. Pesquisa e Referências

### 2.1 Sistemas de Inventário em RPGs

Segundo pesquisa em design de jogos, existem 4 abordagens principais:

| Sistema | Descrição | Adequação para storywell.games |
|---------|-----------|--------------------------------|
| **Weight-based** (Ultima Online) | Itens têm peso, força define capacidade | ❌ Muito complexo para narrativo |
| **Volume-based** (Diablo) | Grid de inventário com espaço limitado | ❌ Requer UI complexa |
| **Fixed Slots** (WoW) | X slots, cada item = 1 slot | ✅ Simples e funcional |
| **Stackable Items** | Quantidades + tipos | ✅ **Recomendado** |

**Fonte:** [LÖVE Forums - Best inventory system](https://love2d.org/forums/viewtopic.php?t=27968), [Meegle - Inventory Systems](https://www.meegle.com/en_us/topics/game-design/inventory-systems)

### 2.2 Sistemas de Currency em RPGs

Existem 3 abordagens principais segundo [Mythcreants](https://mythcreants.com/blog/three-ways-of-handling-money-in-roleplaying-games/):

| Sistema | Prós | Contras | Adequação |
|---------|------|---------|-----------|
| **Coin Counting** | Controle preciso | Tedioso, requer preços para tudo | ⚠️ Parcial |
| **Storytelling Method** | Elimina tracking | Sem regras para compras grandes | ❌ Muito abstrato |
| **Resource Stat** | Integrado à narrativa | Mal para trocas frequentes | ✅ **Recomendado** |

**Insight chave de [Troy Press](https://troypress.com/wealth-systems-in-rpgs/):**
> "Abstract wealth makes trading more dynamic and engaging. The unpredictability is rife for surprises and emergent play."

### 2.3 Function Calling para State Management

Pesquisa acadêmica de 2024 ([arXiv](https://arxiv.org/html/2409.06949v1)) demonstra que AI Game Masters funcionam melhor com **function calling**:

```
Abordagem Híbrida:
┌─────────────────────────────────────────────────┐
│  LLM (Narrativa)     +     Code (Estado)        │
│  ────────────────         ──────────────        │
│  • Descreve ações         • Valida inventário   │
│  • Gera diálogos          • Deduz currency      │
│  • Cria atmosfera         • Atualiza stats      │
└─────────────────────────────────────────────────┘
```

**Citação do paper:**
> "This dual approach—combining natural language generation with deterministic state functions—prevents the consistency problems traditional LLM game masters experience."

### 2.4 Lições de AI Dungeon e AI Roguelite

De [AI Roguelite](https://store.steampowered.com/app/1889620/AI_Roguelite/) e discussões no [Hacker News](https://news.ycombinator.com/item?id=42698610):

- ✅ AI gera nomes e descrições de itens
- ✅ Código valida e executa mecânicas
- ✅ Condições triggeram ações: "When monster defeated, give user sword"
- ❌ Não confiar na AI para tracking de estado
- ❌ Accuracy drops < 65% com contexto longo

**Solução adotada por devs:**
> "Honing prompts and finding the limits of the AI, then figuring out how to offload the parts it struggled with (mainly storing stats, inventory)."

---

## 3. Arquitetura Proposta

### 3.1 Princípio Core: Separação de Responsabilidades

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARQUITETURA PROPOSTA                         │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────┐
                    │   PLAYER    │
                    │   ACTION    │
                    └──────┬──────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     ACTION OPTIONS PROMPT                        │
│  ─────────────────────────────────────────────────────────────   │
│  RECEBE:                                                         │
│  • Player inventory (com quantidades e valores)                  │
│  • Player stats (incluindo gold)                                 │
│  • NPCs presentes (com seus inventários)                         │
│  • Contexto de localização                                       │
│                                                                  │
│  GERA:                                                           │
│  • 5 opções incluindo interações com itens                       │
│  • Opções de compra/venda quando apropriado                      │
│  • Sugestões de uso de consumíveis                               │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     GAME MASTER PROMPT                           │
│  ─────────────────────────────────────────────────────────────   │
│  VALIDA:                                                         │
│  • Item existe no inventário?                                    │
│  • Player tem gold suficiente?                                   │
│  • NPC tem o item para vender?                                   │
│                                                                  │
│  RETORNA:                                                        │
│  • Narrativa da ação                                             │
│  • stateUpdates com inventário/gold atualizados                  │
│  • Instruções claras de economia                                 │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     useGameEngine.ts                             │
│  ─────────────────────────────────────────────────────────────   │
│  VALIDA (server-side):                                           │
│  • Inventário não ficou negativo                                 │
│  • Gold não ficou negativo                                       │
│  • Transação faz sentido                                         │
│                                                                  │
│  APLICA:                                                         │
│  • Atualiza estado do jogo                                       │
│  • Persiste no IndexedDB                                         │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Decisão: Simplicidade sobre Complexidade

Baseado na pesquisa, escolhemos:

| Aspecto | Decisão | Justificativa |
|---------|---------|---------------|
| **Inventário** | Objetos com metadados básicos | Balanceia funcionalidade e simplicidade |
| **Currency** | Stat numérico único (gold) | Evita complexidade de múltiplas moedas |
| **Preços** | Ranges por categoria | AI tem liberdade criativa dentro de limites |
| **Quantidades** | Stack de items iguais | Permite "3x poções" sem duplicar strings |
| **Validação** | Dupla (AI + código) | Previne estados inválidos |

---

## 4. Sistema de Itens

### 4.1 Nova Estrutura de Item

```typescript
// types.ts - NOVO

/**
 * Representa um item no inventário com metadados.
 * Balanceia simplicidade com funcionalidade.
 */
export interface Item {
  /** Nome único do item para identificação */
  name: string;

  /** Descrição curta para display (gerada pela AI) */
  description?: string;

  /** Quantidade do item (default: 1) */
  quantity: number;

  /** Categoria do item para mecânicas */
  category: ItemCategory;

  /** Valor base em gold (para compra/venda) */
  baseValue?: number;

  /** Se o item pode ser empilhado (stackable) */
  stackable: boolean;

  /** Se o item é consumível (removido ao usar) */
  consumable: boolean;

  /** Efeitos ao usar (para consumíveis) */
  effects?: ItemEffect[];
}

export type ItemCategory =
  | 'weapon'      // Armas - espadas, arcos, etc.
  | 'armor'       // Armaduras e proteções
  | 'consumable'  // Poções, comidas, pergaminhos
  | 'material'    // Materiais de crafting
  | 'quest'       // Itens de quest (não vendáveis)
  | 'valuable'    // Joias, tesouros (alto valor)
  | 'misc';       // Outros

export interface ItemEffect {
  /** Stat afetada */
  stat: string;
  /** Valor da mudança (+50 HP, -10 mana) */
  value: number;
}
```

### 4.2 Character Atualizado

```typescript
// types.ts - MODIFICADO

export interface Character {
  id: string;
  name: string;
  description: string;
  isPlayer: boolean;
  locationId: string;

  // MODIFICADO: Stats agora inclui gold obrigatoriamente
  stats: {
    hp: number;
    maxHp: number;
    gold: number;        // ← NOVO: Currency principal
    [key: string]: number;
  };

  // MODIFICADO: Inventário agora é array de Items
  inventory: Item[];     // ← Era string[], agora Item[]

  relationships: Record<string, number>;
  state: 'idle' | 'talking' | 'fighting' | 'unconscious' | 'dead';
  avatarColor?: string;
  avatarBase64?: string;
  avatarUrl?: string;
}
```

### 4.3 Migração de Dados Legados

```typescript
// utils/migration.ts - NOVO

/**
 * Migra inventário antigo (string[]) para novo formato (Item[])
 */
export function migrateInventory(oldInventory: string[]): Item[] {
  return oldInventory.map(itemString => ({
    name: itemString,
    quantity: 1,
    category: guessCategory(itemString),
    stackable: true,
    consumable: isLikelyConsumable(itemString),
  }));
}

function guessCategory(name: string): ItemCategory {
  const lower = name.toLowerCase();
  if (lower.includes('sword') || lower.includes('bow') || lower.includes('dagger')) return 'weapon';
  if (lower.includes('armor') || lower.includes('shield') || lower.includes('helmet')) return 'armor';
  if (lower.includes('potion') || lower.includes('scroll') || lower.includes('food')) return 'consumable';
  if (lower.includes('gold') || lower.includes('gem') || lower.includes('jewel')) return 'valuable';
  if (lower.includes('key') || lower.includes('letter') || lower.includes('map')) return 'quest';
  return 'misc';
}
```

---

## 5. Sistema de Currency

### 5.1 Abordagem Escolhida: Resource Stat Híbrido

Combinamos as vantagens de múltiplas abordagens:

```
┌─────────────────────────────────────────────────────────────────┐
│              SISTEMA DE CURRENCY HÍBRIDO                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TRACKING PRECISO (para mecânicas):                             │
│  • stats.gold = número exato                                    │
│  • Deduzido em compras                                          │
│  • Adicionado em vendas/loot                                    │
│                                                                 │
│  FLEXIBILIDADE NARRATIVA (para AI):                             │
│  • AI define preços dentro de ranges                            │
│  • Descrições podem ser criativas                               │
│  • Barganha é possível via diálogo                              │
│                                                                 │
│  RANGES DE PREÇO POR CATEGORIA:                                 │
│  ┌────────────────┬─────────────┬─────────────┐                │
│  │ Categoria      │ Compra      │ Venda (50%) │                │
│  ├────────────────┼─────────────┼─────────────┤                │
│  │ Consumable     │ 5-50 gold   │ 2-25 gold   │                │
│  │ Weapon (basic) │ 20-100 gold │ 10-50 gold  │                │
│  │ Weapon (rare)  │ 100-500     │ 50-250      │                │
│  │ Armor (basic)  │ 30-150 gold │ 15-75 gold  │                │
│  │ Armor (rare)   │ 150-600     │ 75-300      │                │
│  │ Valuable       │ 50-1000     │ 25-500      │                │
│  │ Material       │ 1-20 gold   │ 1-10 gold   │                │
│  │ Quest          │ N/A         │ N/A         │                │
│  └────────────────┴─────────────┴─────────────┘                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Regras de Economia

```typescript
// constants/economy.ts - NOVO

export const ECONOMY_RULES = {
  // Multiplicador de venda (jogador recebe X% do valor base)
  SELL_MULTIPLIER: 0.5,

  // Multiplicador de compra (jogador paga X% a mais do base)
  BUY_MULTIPLIER: 1.0,

  // Ranges de preço por categoria
  PRICE_RANGES: {
    consumable: { min: 5, max: 50 },
    weapon: { min: 20, max: 500 },
    armor: { min: 30, max: 600 },
    valuable: { min: 50, max: 1000 },
    material: { min: 1, max: 20 },
    quest: { min: 0, max: 0 },  // Não vendável
    misc: { min: 1, max: 50 },
  },

  // Gold inicial por tipo de universo
  STARTING_GOLD: {
    fantasy: 50,
    scifi: 100,
    modern: 200,
    horror: 30,
    default: 50,
  },
};
```

---

## 6. Modificações nos Prompts

### 6.1 Action Options Prompt - ANTES vs DEPOIS

**ANTES (problemático):**
```typescript
return `
Current Location: ${currentLocation?.name}
Player: ${player?.name} - ${player?.description}
Recent events: ${recentMessages.map(m => m.text).join(' | ')}

Rules:
1. Generate exactly 5 distinct actions
2. Mix types: dialogue, exploration, combat, interaction
`;
```

**DEPOIS (corrigido):**
```typescript
return `
You are a game master assistant. Generate 5 contextual action options.

=== CURRENT CONTEXT ===
Location: ${currentLocation?.name} - ${currentLocation?.description}

=== PLAYER STATUS ===
Name: ${player?.name}
HP: ${player?.stats?.hp}/${player?.stats?.maxHp}
Gold: ${player?.stats?.gold} coins

=== PLAYER INVENTORY ===
${formatInventoryForPrompt(player?.inventory)}

=== NPCs PRESENT ===
${formatNPCsForPrompt(charactersHere)}

=== RECENT EVENTS ===
${recentMessages.map(m => m.text).join(' | ')}

=== RULES FOR ACTION GENERATION ===
1. Generate exactly 5 distinct, contextually appropriate actions
2. Write in ${langName}

3. **ITEM-AWARE ACTIONS (CRITICAL):**
   - If player has CONSUMABLES (potions, food, scrolls) and is damaged/in danger,
     suggest using them (e.g., "Drink healing potion")
   - If player has WEAPONS, suggest combat options when appropriate
   - If player has VALUABLE items and there's a merchant, suggest selling
   - If NPCs have items the player might want, suggest trading/buying

4. **ECONOMY-AWARE ACTIONS:**
   - If merchant NPC is present, suggest "Browse merchant's wares" or similar
   - If player has gold and NPC sells things, suggest purchasing
   - Consider player's gold when suggesting expensive actions

5. **VARIETY REQUIREMENTS:**
   - At least one dialogue/social option
   - At least one exploration/movement option
   - At least one item-related option (use, trade, examine) when inventory allows
   - One cautious/defensive option

6. **PROBABILITY HINTS:**
   - goodHint for items: "find treasure", "gain useful item", "discover gold"
   - badHint for items: "lose item to trap", "item stolen", "break equipment"
`;
```

### 6.2 Funções Helper para Formatação

```typescript
// services/ai/prompts/helpers.ts - NOVO

export function formatInventoryForPrompt(inventory: Item[]): string {
  if (!inventory || inventory.length === 0) {
    return '(Empty inventory)';
  }

  return inventory.map(item => {
    const qty = item.quantity > 1 ? `${item.quantity}x ` : '';
    const value = item.baseValue ? ` [~${item.baseValue}g]` : '';
    const consumable = item.consumable ? ' (consumable)' : '';
    return `- ${qty}${item.name}${value}${consumable}`;
  }).join('\n');
}

export function formatNPCsForPrompt(npcs: Character[]): string {
  if (!npcs || npcs.length === 0) {
    return '(No one else here)';
  }

  return npcs
    .filter(c => !c.isPlayer)
    .map(npc => {
      const hasShop = npc.inventory && npc.inventory.length > 0;
      const shopInfo = hasShop
        ? ` | Sells: ${npc.inventory.slice(0, 3).map(i => i.name).join(', ')}...`
        : '';
      return `- ${npc.name} (${npc.state})${shopInfo}`;
    }).join('\n');
}
```

### 6.3 Game Master Prompt - Adições de Economia

```typescript
// Adicionar ao buildGameMasterPrompt, após as regras existentes:

=== ECONOMY & TRADING RULES (MANDATORY) ===

**BUYING FROM NPCs:**
1. Verify the NPC has the item in their inventory
2. Determine price based on item category:
   - Consumables: 5-50 gold
   - Basic weapons: 20-100 gold
   - Rare weapons: 100-500 gold
   - Basic armor: 30-150 gold
   - Rare armor: 150-600 gold
   - Valuables: 50-1000 gold
3. Check player's gold >= price
4. If SUFFICIENT:
   - Deduct gold from player stats
   - Add item to player inventory
   - Remove item from NPC inventory (or reduce quantity)
5. If INSUFFICIENT:
   - NPC refuses the sale
   - May offer alternatives or suggest where to get gold

**SELLING TO NPCs:**
1. Verify player has the item
2. NPCs buy at 50% of base price
3. Quest items CANNOT be sold (warn player)
4. Add gold to player stats
5. Remove item from player inventory
6. Optionally add to NPC inventory

**LOOTING & FINDING ITEMS:**
1. When player finds treasure, add items to inventory
2. Include baseValue for found items
3. For gold finds, add directly to stats.gold
4. Describe the find narratively

**USING CONSUMABLES:**
1. Verify item exists in inventory
2. Verify item is consumable
3. Apply effects to stats (e.g., +50 HP)
4. Remove item from inventory (or reduce quantity)
5. Narrate the use and effects

**STATE UPDATE FORMAT:**
When updating inventory/gold, use this structure:
{
  "updatedCharacters": [{
    "id": "player_id",
    "inventory": [...full new inventory array...],
    "stats": [
      { "key": "gold", "value": NEW_GOLD_AMOUNT },
      { "key": "hp", "value": NEW_HP_IF_CHANGED }
    ]
  }]
}

CRITICAL: Always return the COMPLETE inventory array, not just changes.
```

### 6.4 Grid Map & Spatial Callouts

- `gridUpdate.prompt.ts` agora obriga que cada resposta com `shouldUpdate=true` liste player + todos os NPCs na cena, reaproveitando coordenadas anteriores quando ninguém se move.
- O `reasoning` deve mencionar distâncias/direções em relação ao jogador, ajudando o loop de economia a saber quem está perto o bastante para negociar, trocar itens ou tentar furtos.
- `buildGameMasterPrompt` ganhou instruções explícitas para citar essas relações espaciais nas narrações, mantendo coerência entre o texto (troca de itens, pagamentos) e o mapa 10x10 renderizado no `StoryCard`.

---

## 7. Function Calling para State Management

### 7.1 Abordagem Recomendada (Baseada em Pesquisa)

Segundo o paper [arXiv 2409.06949](https://arxiv.org/html/2409.06949v1), a melhor abordagem é:

```
┌─────────────────────────────────────────────────────────────────┐
│              FUNCTION CALLING ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AI Response (JSON):                                            │
│  {                                                              │
│    "narrative": "You drink the potion...",                      │
│    "actions": [                                                 │
│      { "function": "use_item", "item": "healing_potion" },      │
│      { "function": "modify_stat", "stat": "hp", "value": 50 }   │
│    ]                                                            │
│  }                                                              │
│                                                                 │
│  Code executes:                                                 │
│  1. validate use_item("healing_potion") → exists? consumable?   │
│  2. execute modify_stat("hp", +50) → new HP = old + 50          │
│  3. execute remove_item("healing_potion") → inventory updated   │
│  4. return success/failure to narrative                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Funções de Estado (Futuro)

```typescript
// services/game/stateActions.ts - PROPOSTA FUTURA

export interface StateAction {
  function: string;
  params: Record<string, unknown>;
}

export const stateActions = {
  add_item: (state: GameState, params: { characterId: string; item: Item }) => {
    const char = state.characters[params.characterId];
    if (!char) return { success: false, error: 'Character not found' };

    // Stack se existir item igual e for stackable
    const existing = char.inventory.find(i => i.name === params.item.name);
    if (existing && existing.stackable) {
      existing.quantity += params.item.quantity;
    } else {
      char.inventory.push(params.item);
    }

    return { success: true };
  },

  remove_item: (state: GameState, params: { characterId: string; itemName: string; quantity?: number }) => {
    const char = state.characters[params.characterId];
    const item = char?.inventory.find(i => i.name === params.itemName);

    if (!item) return { success: false, error: 'Item not found' };

    const qtyToRemove = params.quantity || 1;
    if (item.quantity < qtyToRemove) return { success: false, error: 'Not enough items' };

    item.quantity -= qtyToRemove;
    if (item.quantity <= 0) {
      char.inventory = char.inventory.filter(i => i.name !== params.itemName);
    }

    return { success: true };
  },

  modify_gold: (state: GameState, params: { characterId: string; amount: number }) => {
    const char = state.characters[params.characterId];
    if (!char) return { success: false, error: 'Character not found' };

    const newGold = (char.stats.gold || 0) + params.amount;
    if (newGold < 0) return { success: false, error: 'Insufficient gold' };

    char.stats.gold = newGold;
    return { success: true };
  },

  transfer_item: (state: GameState, params: {
    fromId: string;
    toId: string;
    itemName: string;
    goldExchange?: number;
  }) => {
    // Implementa troca com validação
    // ...
  },
};
```

---

## 8. Plano de Implementação

### 8.1 Fases

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLANO DE IMPLEMENTAÇÃO                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FASE 1: FUNDAÇÃO (Prioridade Alta)                             │
│  ─────────────────────────────────────                          │
│  □ Atualizar types.ts com Item interface                        │
│  □ Adicionar gold aos stats padrão                              │
│  □ Criar migration para inventários existentes                  │
│  □ Atualizar actionOptions.prompt.ts com contexto de inventário │
│                                                                 │
│  FASE 2: ECONOMIA (Prioridade Alta)                             │
│  ─────────────────────────────────                              │
│  □ Adicionar regras de economia ao gameMaster.prompt.ts         │
│  □ Criar constantes de preços por categoria                     │
│  □ Atualizar storyInitialization para gold inicial              │
│  □ Testar fluxo de compra/venda                                 │
│                                                                 │
│  FASE 3: VALIDAÇÃO (Prioridade Média)                           │
│  ────────────────────────────────────                           │
│  □ Adicionar validação no useGameEngine                         │
│  □ Prevenir gold/inventory negativos                            │
│  □ Logs de transações para debug                                │
│                                                                 │
│  FASE 4: UI/UX (Prioridade Baixa)                               │
│  ─────────────────────────────────                              │
│  □ Mostrar gold na UI                                           │
│  □ Mostrar quantidades de itens                                 │
│  □ Tooltips com valores de itens                                │
│  □ Botões de usar item (opcional)                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Arquivos a Modificar

| Arquivo | Modificação | Prioridade |
|---------|-------------|------------|
| `types.ts` | Adicionar Item interface, modificar Character.inventory | 🔴 P0 |
| `actionOptions.prompt.ts` | Incluir inventário e NPCs no contexto | 🔴 P0 |
| `gameMaster.prompt.ts` | Adicionar regras de economia | 🔴 P0 |
| `storyInitialization.prompt.ts` | Inicializar gold e itens estruturados | 🟡 P1 |
| `useGameEngine.ts` | Validação de transações | 🟡 P1 |
| `openaiClient.ts` | Atualizar schemas para novo formato | 🟡 P1 |
| `App.tsx` | Exibir gold e melhorar inventory UI | 🟢 P2 |

### 8.3 Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| AI ignora instruções de economia | Alta | Alto | Validação no código + exemplos no prompt |
| Migração quebra saves existentes | Média | Alto | Migration script + fallback para string[] |
| Preços inconsistentes da AI | Alta | Médio | Ranges definidos + validação de bounds |
| Contexto muito longo | Média | Médio | Resumir inventário se > 20 itens |

---

## Referências

### Pesquisa Acadêmica
- [You Have Thirteen Hours in Which to Solve the Labyrinth: Enhancing AI Game Masters with Function Calling](https://arxiv.org/html/2409.06949v1) - arXiv 2024

### Design de Jogos
- [Mastering Inventory Management in Game Design](https://www.numberanalytics.com/blog/ultimate-guide-inventory-management-game-design)
- [Inventory Systems - Meegle](https://www.meegle.com/en_us/topics/game-design/inventory-systems)
- [Best inventory system for an RPG game - LÖVE Forums](https://love2d.org/forums/viewtopic.php?t=27968)

### Sistemas de Currency
- [Three Ways of Handling Money in Roleplaying Games - Mythcreants](https://mythcreants.com/blog/three-ways-of-handling-money-in-roleplaying-games/)
- [Wealth Systems in RPGs - Troy Press](https://troypress.com/wealth-systems-in-rpgs/)

### AI e LLMs em Jogos
- [How to Build an AI Dungeon Master - Medium](https://medium.com/@kgiannopoulou4033/how-to-build-an-ai-dungeon-master-for-tabletop-rpgs-548b7dd6d1ee)
- [Building LLM Gameplay mechanics with Guidance](https://medium.com/@mikudev/building-llm-gameplay-mechanics-with-guidance-0bc3d52e52e9)
- [LLM based agents as Dungeon Masters - Hacker News](https://news.ycombinator.com/item?id=42698610)

### Economia de Jogos
- [Game Economy Design Essentials - UserWise](https://www.userwise.io/blog/game-economy-design-essentials-part-2-things-to-do)
- [Mastering Video Game Economy Design 2025](https://www.redappletech.com/blog/video-game-economy-design)

---

## Conclusão

A implementação proposta resolve os problemas críticos identificados:

1. ✅ **Action Options conhecerá o inventário** - Permitindo sugestões contextuais
2. ✅ **Currency funcional** - Gold como stat numérico com regras claras
3. ✅ **Itens com metadados** - Quantidades, valores, categorias
4. ✅ **Economia definida** - Preços, compra, venda, uso
5. ✅ **Validação dupla** - AI + código para consistência

O sistema mantém a natureza narrativa do jogo enquanto adiciona mecânicas robustas de economia que funcionam de verdade.
