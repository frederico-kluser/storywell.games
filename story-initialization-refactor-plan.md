# Story Initialization Parallelization Plan

## 1. Background & Problem Statement
- The "Characters" phase during world generation currently waits for a **single large GPT‑4.1 request** (`initializeStory`) to return the entire initial GM payload (locations, player sheet, NPCs, narration, etc.).
- This monolithic request routinely takes **60+ seconds** because it asks the model to synthesize multiple artifacts in one go and also chains avatar generation afterward.
- If the request stalls or hits rate limits, the UI has no partial progress to show, and the user experiences a hard freeze.

## 2. Current Pipeline (Simplified)
```
handleCreateStory
 ├─ generateThemeColors (in parallel)
 └─ initializeStory (single GPT call → gmResponse + universeContext)
       └─ generateCharacterAvatar (player)  ← sequential inside initializeStory
```
- `initializeStory` builds one massive prompt (`storyInitialization.prompt.ts`) and expects the GM schema back.
- The response contains: `stateUpdates.newLocations`, `stateUpdates.newCharacters`, and `messages` (opening narration) all at once.

## 3. Proposed Multi-Request Architecture
We will split the initialization into a blueprint step followed by **5–7 focused requests** that can run in parallel via `Promise.all`. Total LLM calls for the stage will stay **≤ 7**.

### 3.1 Sequential Seed
1. **`generateStoryBlueprint`** (gpt-4.1-mini)
   - Produces immutable IDs and high-level descriptors:
     - `locationSeeds[]` (id, name, type: interior/exterior, short hook)
     - `playerSeed` (id, class archetype, key traits)
     - `npcSeeds[]` (optional supporting roles)
     - `toneDirectives` (genre-specific notes)
   - Lightweight JSON (<1k tokens) that all other requests consume to stay in sync.

### 3.2 Parallel Detail Requests (Promise.all)
| Request | Model | Inputs | Output | Notes |
| --- | --- | --- | --- | --- |
| `generateStartingLocation` | gpt-4.1 | blueprint.locationSeeds[0], onboarding config | Full location description, exits, interior/exterior flag, `connectedLocationIds` seeds | Drives grid + background clarity |
| `generatePlayerSheet` | gpt-4.1-mini | playerSeed + economy presets | Stats, inventory, avatar brief | Splits stats/inventory from narration to reduce payload |
| `generateSupportingNPCs` | gpt-4.1-mini | npcSeeds + location context | Up to 3 NPCs with bios/inventory | Can be skipped if user picked "solo" |
| `generateOpeningNarration` | gpt-4.1 | blueprint tone + location detail | Array of GM messages (narration/dialogue) | Keeps textual intro independent |
| `generateQuestHooks` | gpt-4.1-mini | tone directives + background | Mission summary, concerns, economy hints | Seeds heavy context & objective text |
| `generateGridSeed` (optional) | gpt-4.1-mini | location detail + player sheet | Starting grid positions/elements | Allows consistent map initialization |

Total requests per run: **1 seed + 5 core + optional grid = 6 or 7**, satisfying the “≤ 8” requirement while giving us enough granularity.

## 4. Aggregation Strategy
1. After `Promise.all`, a new `assembleInitialState()` utility will:
   - Merge location + NPC outputs into `stateUpdates.newLocations` / `stateUpdates.newCharacters`.
   - Convert narration JSON straight into `GMResponse.messages`.
   - Insert quest hooks into both `stateUpdates.eventLog` and `heavyContext` defaults.
   - Fall back to seed data if any request fails (graceful degradation).
2. Because IDs come from the blueprint, we maintain referential integrity without waiting for one model to invent everything.
3. Avatar generation moves **outside** of `initializeStory`: once `playerSheet` resolves we trigger avatar creation in parallel with the other jobs, instead of blocking the final response.

## 5. Implementation Notes
- Create new prompt builders under `services/ai/prompts/initialization/` (e.g., `storyBlueprint.prompt.ts`, `startingLocation.prompt.ts`, etc.) to keep prompts short and specialized.
- Introduce a new TypeScript module `services/ai/storyInitialization.ts` that orchestrates the sequence:
  ```ts
  const blueprint = await generateStoryBlueprint(...);
  const [location, player, npcs, narration, hooks, grid] = await Promise.all([
    generateStartingLocation(blueprint, ...),
    generatePlayerSheet(blueprint, ...),
    generateSupportingNPCs(blueprint, ...),
    generateOpeningNarration(blueprint, ...),
    generateQuestHooks(blueprint, ...),
    generateGridSeed(blueprint, ...),
  ]);
  return assembleInitialState({ blueprint, location, player, npcs, narration, hooks, grid });
  ```
- Update `handleCreateStory` to call this new orchestrator instead of the current `initializeStory` monolith.
- Keep `generateUniverseContext` as-is (can still run in parallel with the Promise.all group).

## 6. Expected Benefits
- **Latency:** Smaller payloads + parallelism should cut perceived wait time from ~60s to ~15–20s (each mini request <10s, running simultaneously).
- **Resilience:** If one specialized request fails, we can retry only that piece or fall back to a template without restarting the whole world gen.
- **Telemetry:** We can log timings per request to identify hot spots (e.g., if NPC generation is the bottleneck we can downgrade its model).
- **Extensibility:** New onboarding options (e.g., companion pets) can plug in as another parallel request without touching existing prompts.

## 7. Next Steps
1. Scaffold the new prompt builders + orchestrator module.
2. Add feature flags to switch between legacy and parallel initialization for gradual rollout.
3. Instrument timing metrics to verify speed improvements.
4. Once stable, remove the old monolithic `initializeStory` code path.
