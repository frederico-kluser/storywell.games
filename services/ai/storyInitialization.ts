import {
Character,
GMResponse,
GMResponseMessage,
HeavyContext,
Language,
Location,
GridPosition,
} from '../../types';
import { StoryConfig } from './prompts/storyInitialization.prompt';
import {
StoryBlueprint,
StoryBlueprintPromptParams,
buildStoryBlueprintPrompt,
storyBlueprintSchema,
StartingLocationDetail,
StartingLocationPromptParams,
buildStartingLocationPrompt,
startingLocationSchema,
PlayerSheetDetail,
PlayerSheetPromptParams,
buildPlayerSheetPrompt,
playerSheetSchema,
SupportingNPCsPromptParams,
SupportingNPCsResponse,
buildSupportingNPCsPrompt,
supportingNPCsSchema,
OpeningNarrationPromptParams,
OpeningNarrationResponse,
buildOpeningNarrationPrompt,
openingNarrationSchema,
QuestHooksPromptParams,
QuestHooksResponse,
buildQuestHooksPrompt,
questHooksSchema,
GridSeedPromptParams,
GridSeedResponse,
buildGridSeedPrompt,
gridSeedSchema,
} from './prompts/initialization';
import { queryLLM, LLMMessage } from '../../utils/ai';
import { cleanJsonString } from '../../utils/helpers';
import { normalizeInventory } from '../../utils/inventory';
import { DEFAULT_PLAYER_STATS, getStartingGold } from '../../constants/economy';

export type StoryInitializationPhase =
| 'blueprint'
| 'startingLocation'
| 'playerSheet'
| 'supportingNPCs'
| 'openingNarration'
| 'questHooks'
| 'gridSeed'
| 'avatar';

export interface StoryInitializationTelemetryEntry {
phase: StoryInitializationPhase;
model: string;
durationMs: number;
success: boolean;
error?: string;
}

export interface AvatarRequestPayload {
name: string;
description: string;
prompt?: string;
}

export type StoryAvatarGenerator = (payload: AvatarRequestPayload) => Promise<string | undefined>;

export interface InitializationGridSeed {
locationId: string;
locationName: string;
playerPosition: GridPosition;
characters: {
id: string;
name: string;
x: number;
y: number;
isPlayer?: boolean;
}[];
elements?: {
symbol: string;
name: string;
description: string;
x: number;
y: number;
}[];
}

export interface StoryInitializationPipelineParams {
apiKey: string;
config: StoryConfig;
language: Language;
enableGridSeed?: boolean;
generateAvatar?: StoryAvatarGenerator;
}

export interface StoryInitializationPipelineResult {
gmResponse: GMResponse;
heavyContextSeed?: HeavyContext;
gridSeed?: InitializationGridSeed;
telemetry: StoryInitializationTelemetryEntry[];
}

const clampCoordinate = (value?: number): number => {
if (typeof value !== 'number' || Number.isNaN(value)) return 0;
return Math.max(0, Math.min(9, Math.round(value)));
};

const toRecordFromArray = (entries: { key: string; value: number }[] | undefined): Record<string, number> => {
if (!Array.isArray(entries)) return {};
return entries.reduce<Record<string, number>>((acc, entry) => {
if (entry && typeof entry.key === 'string' && typeof entry.value === 'number') {
acc[entry.key] = entry.value;
}
return acc;
}, {});
};

const sanitizeList = (list?: string[]): string[] => {
if (!Array.isArray(list)) return [];
const seen = new Set<string>();
const result: string[] = [];
list.forEach((item) => {
const value = (item || '').trim();
if (!value) return;
const key = value.toLowerCase();
if (seen.has(key)) return;
seen.add(key);
result.push(value);
});
return result.slice(0, 5);
};

const ensureStats = (raw: PlayerSheetDetail['stats'], startingGold: number): Record<string, number> => {
let stats: Record<string, number> = {};
if (Array.isArray(raw)) {
stats = toRecordFromArray(raw);
} else if (raw && typeof raw === 'object') {
stats = Object.entries(raw).reduce<Record<string, number>>((acc, [key, value]) => {
if (typeof value === 'number') acc[key] = value;
return acc;
}, {});
}
if (typeof stats.hp !== 'number') stats.hp = DEFAULT_PLAYER_STATS.hp;
if (typeof stats.maxHp !== 'number') stats.maxHp = DEFAULT_PLAYER_STATS.maxHp;
if (typeof stats.gold !== 'number') stats.gold = startingGold;
return stats;
};

const mapRelationships = (entries?: { targetId: string; score: number }[]): Record<string, number> => {
if (!Array.isArray(entries)) return {};
return entries.reduce<Record<string, number>>((acc, entry) => {
if (!entry || typeof entry.targetId !== 'string' || typeof entry.score !== 'number') return acc;
acc[entry.targetId] = Math.max(-100, Math.min(100, Math.round(entry.score)));
return acc;
}, {});
};

const fallbackBlueprint = (config: StoryConfig): StoryBlueprint => ({
locationSeeds: [
{
id: 'loc_start_seed',
name: config.startSituation?.split(',')[0]?.trim() || `${config.universeName} Gateway`,
environment: config.universeType === 'existing' ? 'familiar landmark' : 'original landmark',
hook: config.startSituation || 'The story ignites in a liminal space.',
tone: 'anticipatory',
},
],
playerSeed: {
id: 'player_seed',
name: config.playerName,
archetype: 'adventurer',
motivation: config.background || 'Seeks purpose.',
visualTraits: config.playerDesc || 'Undefined hero silhouette.',
gearFocus: 'travel kit',
},
npcSeeds: [],
toneDirectives: ['Cinematic', 'Player-focused'],
economyPreset: 'standard',
questDifficultyTier: 'balanced',
});

const fallbackLocation = (blueprint: StoryBlueprint): StartingLocationDetail => {
const seed = blueprint.locationSeeds[0];
return {
id: seed?.id || 'loc_start',
name: seed?.name || 'Starting Point',
description: seed?.hook || 'The air crackles as reality assembles around you.',
connectedExits: [],
hazards: [],
sensoryNotes: ['air smells like ozone', 'dull hum under the floor'],
};
};

const fallbackPlayerSheet = (config: StoryConfig, blueprint: StoryBlueprint): PlayerSheetDetail => ({
id: blueprint.playerSeed?.id || 'player_1',
seedId: blueprint.playerSeed?.id || 'player_1',
name: config.playerName,
description: config.playerDesc,
stats: {
hp: DEFAULT_PLAYER_STATS.hp,
maxHp: DEFAULT_PLAYER_STATS.maxHp,
gold: getStartingGold(config.universeName),
},
inventory: [
{
name: 'Worn travel cloak',
description: 'A reliable layer against unpredictable weather.',
quantity: 1,
category: 'armor',
stackable: false,
consumable: false,
},
],
avatarPrompt: config.playerDesc,
});

const fallbackNPCs = (): SupportingNPCsResponse => ({ npcs: [] });

const fallbackNarration = (location: StartingLocationDetail): OpeningNarrationResponse => ({
messages: [
{
type: 'narration',
text: location.description,
voiceTone: 'mysterious',
},
],
});

const fallbackQuestHooks = (config: StoryConfig): QuestHooksResponse => ({
eventLog: `${config.playerName} steps into ${config.startSituation || 'an unknown frontier'}.`,
mainMission: 'Discover why the world summoned you here.',
currentMission: 'Survey the immediate surroundings and identify allies or threats.',
activeProblems: ['Resources are scarce', 'Motivations of locals unknown'],
currentConcerns: ['Trust is unearned'],
importantNotes: [],
});

const fallbackGridSeed = (blueprint: StoryBlueprint): GridSeedResponse => ({
locationId: blueprint.locationSeeds[0]?.id || 'loc_start',
locationName: blueprint.locationSeeds[0]?.name || 'Starting Point',
playerPosition: { x: 5, y: 5 },
characters: [
{ id: blueprint.playerSeed?.id || 'player_1', name: blueprint.playerSeed?.name || 'Protagonist', x: 5, y: 5, isPlayer: true },
],
elements: [{ symbol: 'Δ', name: 'Glowing console', description: 'Flickers with unreadable glyphs.', x: 7, y: 4 }],
});

const toGMMessage = (msg: OpeningNarrationResponse['messages'][number], fallbackSpeaker: string): GMResponseMessage => {
if (msg.type === 'dialogue') {
return {
type: 'dialogue',
characterName: msg.characterName || fallbackSpeaker,
dialogue: msg.dialogue || msg.text || '',
voiceTone: msg.voiceTone || 'neutral',
};
}
if (msg.type === 'system') {
return {
type: 'system',
text: msg.text || '',
voiceTone: msg.voiceTone || 'neutral',
};
}
return {
type: 'narration',
text: msg.text || msg.dialogue || '',
voiceTone: msg.voiceTone || 'neutral',
};
};

export const runStoryInitializationPipeline = async (
params: StoryInitializationPipelineParams,
): Promise<StoryInitializationPipelineResult> => {
const { apiKey, config, language, generateAvatar } = params;
const enableGridSeed = params.enableGridSeed ?? config.combatStyle === 'tactical';
const telemetry: StoryInitializationTelemetryEntry[] = [];

const runPhase = async <T>(
phase: StoryInitializationPhase,
buildMessages: () => LLMMessage[],
schema: object,
fallback: () => T,
): Promise<T> => {
const start = Date.now();
try {
const response = await queryLLM(apiKey, buildMessages(), { model: 'gpt-4.1', responseFormat: 'json' });
if (!response.text) throw new Error('Empty response');
const parsed = JSON.parse(cleanJsonString(response.text));
telemetry.push({ phase, model: 'gpt-4.1', durationMs: Date.now() - start, success: true });
return parsed as T;
} catch (error) {
telemetry.push({
phase,
model: 'gpt-4.1',
durationMs: Date.now() - start,
success: false,
error: error instanceof Error ? error.message : 'Unknown error',
});
return fallback();
}
};

const blueprintPromptParams: StoryBlueprintPromptParams = { config, language };
const blueprint = await runPhase<StoryBlueprint>(
'blueprint',
() => {
const schemaInstruction = JSON.stringify(storyBlueprintSchema, null, 2);
return [
{
role: 'system',
content: `You are a senior narrative architect. Respond with canonical seeds.
Always respond with valid JSON:
${schemaInstruction}`,
},
{
role: 'user',
content: buildStoryBlueprintPrompt(blueprintPromptParams),
},
];
},
storyBlueprintSchema,
() => fallbackBlueprint(config),
);

if (!blueprint.npcSeeds || blueprint.npcSeeds.length === 0) {
blueprint.npcSeeds = [
{
id: 'npc_seed_1',
name: 'Early Ally',
role: 'guide',
agenda: 'Keeps the player alive long enough to learn the ropes.',
relationship: 'protective',
},
];
}

const locationPromise = runPhase<StartingLocationDetail>(
'startingLocation',
() => {
const schemaInstruction = JSON.stringify(startingLocationSchema, null, 2);
const promptParams: StartingLocationPromptParams = { blueprint, language };
return [
{
role: 'system',
content: `You are an environment artist describing the opening scene.
Return valid JSON with this schema:
${schemaInstruction}`,
},
{ role: 'user', content: buildStartingLocationPrompt(promptParams) },
];
},
startingLocationSchema,
() => fallbackLocation(blueprint),
);

const playerSheetPromise = runPhase<PlayerSheetDetail>(
'playerSheet',
() => {
const schemaInstruction = JSON.stringify(playerSheetSchema, null, 2);
const promptParams: PlayerSheetPromptParams = { blueprint, language };
return [
{
role: 'system',
content: `You are crafting the canonical player sheet.
Return valid JSON matching:
${schemaInstruction}`,
},
{ role: 'user', content: buildPlayerSheetPrompt(promptParams) },
];
},
playerSheetSchema,
() => fallbackPlayerSheet(config, blueprint),
);

const npcPromise = runPhase<SupportingNPCsResponse>(
'supportingNPCs',
() => {
const schemaInstruction = JSON.stringify(supportingNPCsSchema, null, 2);
const promptParams: SupportingNPCsPromptParams = { blueprint, language };
return [
{
role: 'system',
content: `You are designing supporting NPC dossiers.
Return valid JSON matching:
${schemaInstruction}`,
},
{ role: 'user', content: buildSupportingNPCsPrompt(promptParams) },
];
},
supportingNPCsSchema,
fallbackNPCs,
);

const narrationPromise = runPhase<OpeningNarrationResponse>(
'openingNarration',
() => {
const schemaInstruction = JSON.stringify(openingNarrationSchema, null, 2);
const promptParams: OpeningNarrationPromptParams = { blueprint, language };
return [
{
role: 'system',
content: `You are the GM voice writing the first cards.
Return valid JSON matching:
${schemaInstruction}`,
},
{ role: 'user', content: buildOpeningNarrationPrompt(promptParams) },
];
},
openingNarrationSchema,
() => fallbackNarration(fallbackLocation(blueprint)),
);

const questPromise = runPhase<QuestHooksResponse>(
'questHooks',
() => {
const schemaInstruction = JSON.stringify(questHooksSchema, null, 2);
const promptParams: QuestHooksPromptParams = { blueprint, language };
return [
{
role: 'system',
content: `You are a narrative strategist summarizing missions.
Return valid JSON matching:
${schemaInstruction}`,
},
{ role: 'user', content: buildQuestHooksPrompt(promptParams) },
];
},
questHooksSchema,
() => fallbackQuestHooks(config),
);

const gridSeedPromise = enableGridSeed
? runPhase<GridSeedResponse>(
'gridSeed',
() => {
const schemaInstruction = JSON.stringify(gridSeedSchema, null, 2);
const promptParams: GridSeedPromptParams = { blueprint, language };
return [
{
role: 'system',
content: `You are mapping a 10x10 tactical grid.
Return valid JSON matching:
${schemaInstruction}`,
},
{ role: 'user', content: buildGridSeedPrompt(promptParams) },
];
},
gridSeedSchema,
() => fallbackGridSeed(blueprint),
)
: Promise.resolve<GridSeedResponse | undefined>(undefined);

const avatarPromise = playerSheetPromise.then(async (player) => {
if (!generateAvatar) return undefined;
const start = Date.now();
try {
const avatar = await generateAvatar({
name: player.name || config.playerName,
description: player.avatarPrompt || player.description || config.playerDesc,
prompt: player.avatarPrompt,
});
telemetry.push({ phase: 'avatar', model: 'gpt-image-1-mini', durationMs: Date.now() - start, success: true });
return avatar;
} catch (error) {
telemetry.push({
phase: 'avatar',
model: 'gpt-image-1-mini',
durationMs: Date.now() - start,
success: false,
error: error instanceof Error ? error.message : 'Unknown error',
});
return undefined;
}
});

const [startingLocation, playerSheet, npcResponse, narration, questHooks, gridSeedRaw, avatarBase64] = await Promise.all([
locationPromise,
playerSheetPromise,
npcPromise,
narrationPromise,
questPromise,
gridSeedPromise,
avatarPromise,
]);

const location: Location = {
id: startingLocation.id || blueprint.locationSeeds[0]?.id || 'loc_start',
name: startingLocation.name || blueprint.locationSeeds[0]?.name || 'Starting Point',
description: startingLocation.description || blueprint.locationSeeds[0]?.hook || 'A blank space awaiting detail.',
connectedLocationIds: (startingLocation.connectedExits || []).map((exit) => exit.id).filter(Boolean),
};

const startingGold = getStartingGold(config.universeName);
const stats = ensureStats(playerSheet.stats, startingGold);
const normalizedInventory = (normalizeInventory(playerSheet.inventory || []) as Character['inventory']) || [];

const playerCharacter: Character = {
id: playerSheet.id || playerSheet.seedId || blueprint.playerSeed.id || 'player_1',
name: playerSheet.name || config.playerName,
description: playerSheet.description || config.playerDesc,
isPlayer: true,
locationId: location.id,
stats,
inventory: normalizedInventory,
relationships: mapRelationships(playerSheet.relationships),
state: (playerSheet.state as Character['state']) || 'idle',
avatarColor: '#57534e',
avatarBase64: avatarBase64,
};

const npcCharacters: Character[] = (npcResponse.npcs || []).map((npc, index) => {
const npcStats = ensureStats(npc.stats as any, startingGold / 2);
const inventory = (normalizeInventory(npc.inventory || []) as Character['inventory']) || [];
return {
id: npc.id || npc.seedId || `npc_${index}`,
name: npc.name || `NPC ${index + 1}`,
description: npc.description || 'An undefined companion.',
isPlayer: false,
locationId: npc.locationId || location.id,
stats: npcStats,
inventory,
relationships: npc.relationshipScore
? { [playerCharacter.id]: Math.max(-100, Math.min(100, Math.round(npc.relationshipScore))) }
: {},
state: (npc.state as Character['state']) || 'idle',
avatarColor: '#44403c',
};
});

const messages = (narration.messages || []).map((msg) => toGMMessage(msg, playerCharacter.name)).filter((msg) => {
if (msg.type === 'dialogue') return Boolean(msg.dialogue);
return Boolean(msg.text);
});

if (messages.length === 0) {
messages.push({ type: 'narration', text: location.description, voiceTone: 'neutral' });
}

const heavyContextSeed: HeavyContext | undefined = questHooks
? {
mainMission: questHooks.mainMission?.trim() || undefined,
currentMission: questHooks.currentMission?.trim() || undefined,
activeProblems: sanitizeList(questHooks.activeProblems),
currentConcerns: sanitizeList(questHooks.currentConcerns),
importantNotes: sanitizeList([...(questHooks.importantNotes || []), ...(questHooks.startingOpportunities || [])]),
lastUpdated: Date.now(),
}
: undefined;

const gmResponse: GMResponse = {
messages,
stateUpdates: {
newLocations: [location],
newCharacters: [playerCharacter, ...npcCharacters],
eventLog: questHooks.eventLog,
},
};

const characterMap = new Map<string, Character>();
characterMap.set(playerCharacter.id, playerCharacter);
npcCharacters.forEach((npc) => characterMap.set(npc.id, npc));

const blueprintIdMap = new Map<string, string>();
blueprintIdMap.set(blueprint.playerSeed.id, playerCharacter.id);
blueprint.npcSeeds.forEach((seed) => {
const npc = npcCharacters.find((character) => character.id === seed.id || character.name === seed.name);
if (npc) {
blueprintIdMap.set(seed.id, npc.id);
}
});

let gridSeed: InitializationGridSeed | undefined;
if (gridSeedRaw) {
const playerPosition = gridSeedRaw.playerPosition
? { x: clampCoordinate(gridSeedRaw.playerPosition.x), y: clampCoordinate(gridSeedRaw.playerPosition.y) }
: { x: 5, y: 5 };
const characters = (gridSeedRaw.characters || []).map((entry) => {
const resolvedId = blueprintIdMap.get(entry.id) || entry.id;
const resolvedCharacter = characterMap.get(resolvedId);
return {
id: resolvedId,
name: resolvedCharacter?.name || entry.name,
x: clampCoordinate(entry.x),
y: clampCoordinate(entry.y),
isPlayer: entry.isPlayer ?? resolvedCharacter?.isPlayer ?? false,
};
});
if (!characters.some((c) => c.isPlayer)) {
characters.push({ id: playerCharacter.id, name: playerCharacter.name, x: playerPosition.x, y: playerPosition.y, isPlayer: true });
}
gridSeed = {
locationId: gridSeedRaw.locationId || location.id,
locationName: gridSeedRaw.locationName || location.name,
playerPosition,
characters,
elements: (gridSeedRaw.elements || []).map((el) => ({
symbol: el.symbol,
name: el.name,
description: el.description,
x: clampCoordinate(el.x),
y: clampCoordinate(el.y),
})),
};
}

return {
gmResponse,
heavyContextSeed,
gridSeed,
telemetry,
};
};
