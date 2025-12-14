import { Language } from '../../../../types';
import { StoryConfig } from '../storyInitialization.prompt';
import { getLanguageName } from '../../../../i18n/locales';

export interface LocationSeed {
id: string;
name: string;
environment: string;
hook: string;
tone: string;
}

export interface PlayerSeed {
id: string;
name: string;
archetype: string;
motivation: string;
visualTraits: string;
gearFocus: string;
}

export interface NPCSeed {
id: string;
name: string;
role: string;
agenda: string;
relationship: string;
}

export interface StoryBlueprint {
locationSeeds: LocationSeed[];
playerSeed: PlayerSeed;
npcSeeds: NPCSeed[];
toneDirectives: string[];
economyPreset: string;
questDifficultyTier: 'casual' | 'balanced' | 'hardcore';
}

export interface StoryBlueprintPromptParams {
config: StoryConfig;
language: Language;
}

export const storyBlueprintSchema = {
type: 'object',
required: ['locationSeeds', 'playerSeed', 'npcSeeds', 'toneDirectives', 'economyPreset', 'questDifficultyTier'],
properties: {
locationSeeds: {
type: 'array',
minItems: 1,
items: {
type: 'object',
required: ['id', 'name', 'environment', 'hook', 'tone'],
properties: {
id: { type: 'string' },
name: { type: 'string' },
environment: { type: 'string' },
hook: { type: 'string' },
tone: { type: 'string' },
},
},
},
playerSeed: {
type: 'object',
required: ['id', 'name', 'archetype', 'motivation', 'visualTraits', 'gearFocus'],
properties: {
id: { type: 'string' },
name: { type: 'string' },
archetype: { type: 'string' },
motivation: { type: 'string' },
visualTraits: { type: 'string' },
gearFocus: { type: 'string' },
},
},
npcSeeds: {
type: 'array',
items: {
type: 'object',
required: ['id', 'name', 'role', 'agenda', 'relationship'],
properties: {
id: { type: 'string' },
name: { type: 'string' },
role: { type: 'string' },
agenda: { type: 'string' },
relationship: { type: 'string' },
},
},
},
oneDirectives: {
type: 'array',
items: { type: 'string' },
},
economyPreset: { type: 'string' },
questDifficultyTier: { type: 'string', enum: ['casual', 'balanced', 'hardcore'] },
},
} as const;

export const buildStoryBlueprintPrompt = ({ config, language }: StoryBlueprintPromptParams): string => {
const langName = getLanguageName(language);
return `
You are a narrative architect planning the scaffolding for a brand-new campaign.
All descriptive fields must be written in ${langName}.

<player_config>
Name: ${config.playerName}
Description: ${config.playerDesc}
Background: ${config.background}
Memories: ${config.memories}
Starting Situation: ${config.startSituation}
Universe: ${config.universeName} (${config.universeType})
Genre Hint: ${config.genre || 'unspecified'}
Narrative Style: ${config.narrativeStyleMode || 'auto'}
</player_config>

Define immutable IDs and tonal guides that downstream builders will reuse so every request stays in sync.
`;
};

export interface StartingLocationPromptParams {
blueprint: StoryBlueprint;
language: Language;
}

export interface StartingLocationDetail {
id: string;
name: string;
description: string;
connectedExits: { id: string; name: string; reason: string }[];
hazards?: string[];
sensoryNotes?: string[];
backgroundPrompt?: string;
}

export const startingLocationSchema = {
type: 'object',
required: ['id', 'name', 'description', 'connectedExits'],
properties: {
id: { type: 'string' },
name: { type: 'string' },
description: { type: 'string' },
connectedExits: {
type: 'array',
items: {
required: ['id', 'name', 'reason'],
properties: {
id: { type: 'string' },
name: { type: 'string' },
reason: { type: 'string' },
},
},
},
hazards: { type: 'array', items: { type: 'string' } },
sensoryNotes: { type: 'array', items: { type: 'string' } },
backgroundPrompt: { type: 'string' },
},
} as const;

export const buildStartingLocationPrompt = ({ blueprint, language }: StartingLocationPromptParams): string => {
const langName = getLanguageName(language);
const seed = blueprint.locationSeeds[0];
return `
You are elaborating the primary starting location using this seed:
${JSON.stringify(seed, null, 2)}

Tone directives: ${blueprint.toneDirectives.join(' | ')}
Write vivid description, exits, hazards, and a cinematic background prompt in ${langName}.
Keep the original location ID.
`;
};

export interface PlayerSheetPromptParams {
blueprint: StoryBlueprint;
language: Language;
}

export interface PlayerSheetDetail {
id: string;
seedId?: string;
name: string;
description: string;
stats: Record<string, number> | { key: string; value: number }[];
inventory: any[];
relationships?: { targetId: string; score: number }[];
state?: string;
avatarPrompt?: string;
}

export const playerSheetSchema = {
type: 'object',
required: ['id', 'name', 'description', 'stats', 'inventory'],
properties: {
id: { type: 'string' },
seedId: { type: 'string' },
name: { type: 'string' },
description: { type: 'string' },
stats: { type: 'object' },
inventory: { type: 'array' },
relationships: {
type: 'array',
items: { type: 'object', properties: { targetId: { type: 'string' }, score: { type: 'number' } } },
},
state: { type: 'string' },
avatarPrompt: { type: 'string' },
},
} as const;

export const buildPlayerSheetPrompt = ({ blueprint, language }: PlayerSheetPromptParams): string => {
const langName = getLanguageName(language);
return `
You are creating the definitive player sheet based on this seed:
${JSON.stringify(blueprint.playerSeed, null, 2)}

Economy preset: ${blueprint.economyPreset}
Quest difficulty tier: ${blueprint.questDifficultyTier}

Return stats object with hp, maxHp, gold, and any skill stats. Inventory entries must include name, description, quantity, category, stackable, consumable, and baseValue.
All prose must be in ${langName}. Preserve the seed id.
`;
};

export interface SupportingNPCsPromptParams {
blueprint: StoryBlueprint;
language: Language;
}

export interface SupportingNPCsResponse {
npcs: {
id: string;
seedId?: string;
name: string;
description: string;
locationId?: string;
stats?: Record<string, number> | { key: string; value: number }[];
inventory?: any[];
relationshipScore?: number;
state?: string;
}[];
}

export const supportingNPCsSchema = {
type: 'object',
required: ['npcs'],
properties: {
npcs: {
type: 'array',
items: {
type: 'object',
required: ['id', 'name', 'description'],
properties: {
id: { type: 'string' },
seedId: { type: 'string' },
name: { type: 'string' },
description: { type: 'string' },
locationId: { type: 'string' },
stats: { type: 'object' },
inventory: { type: 'array' },
relationshipScore: { type: 'number' },
state: { type: 'string' },
},
},
},
},
} as const;

export const buildSupportingNPCsPrompt = ({ blueprint, language }: SupportingNPCsPromptParams): string => {
const langName = getLanguageName(language);
return `
Define up to three supporting NPCs drawn from these seeds:
${JSON.stringify(blueprint.npcSeeds, null, 2)}

Keep IDs immutable. Provide short bios, relationship score vs the player (-100 to 100), and minimal inventory. Use ${langName} for every text field.
`;
};

export interface OpeningNarrationPromptParams {
blueprint: StoryBlueprint;
language: Language;
}

export interface OpeningNarrationResponse {
messages: {
type: 'narration' | 'dialogue' | 'system';
text?: string;
dialogue?: string;
characterName?: string;
voiceTone?: string;
}[];
}

export const openingNarrationSchema = {
type: 'object',
required: ['messages'],
properties: {
messages: {
type: 'array',
items: {
required: ['type'],
properties: {
type: { type: 'string', enum: ['narration', 'dialogue', 'system'] },
text: { type: 'string' },
dialogue: { type: 'string' },
characterName: { type: 'string' },
voiceTone: { type: 'string' },
},
},
},
},
} as const;

export const buildOpeningNarrationPrompt = ({ blueprint, language }: OpeningNarrationPromptParams): string => {
const langName = getLanguageName(language);
return `
Write 3-4 GM messages that introduce the player to the scene described in the blueprint.
Blend narration and optional dialogue. Highlight the tone directives: ${blueprint.toneDirectives.join(', ')}.
All text must be in ${langName}. Use narrative voice, not meta commentary.
`;
};

export interface QuestHooksPromptParams {
blueprint: StoryBlueprint;
language: Language;
}

export interface QuestHooksResponse {
eventLog: string;
mainMission?: string;
currentMission?: string;
activeProblems?: string[];
currentConcerns?: string[];
importantNotes?: string[];
startingOpportunities?: string[];
}

export const questHooksSchema = {
type: 'object',
required: ['eventLog'],
properties: {
eventLog: { type: 'string' },
mainMission: { type: 'string' },
currentMission: { type: 'string' },
activeProblems: { type: 'array', items: { type: 'string' } },
currentConcerns: { type: 'array', items: { type: 'string' } },
importantNotes: { type: 'array', items: { type: 'string' } },
startingOpportunities: { type: 'array', items: { type: 'string' } },
},
} as const;

export const buildQuestHooksPrompt = ({ blueprint, language }: QuestHooksPromptParams): string => {
const langName = getLanguageName(language);
return `
Summarize the campaign direction according to the blueprint tone and quest tier (${blueprint.questDifficultyTier}).
Provide one event log sentence plus mission statements and problems in ${langName}.
`;
};

export interface GridSeedPromptParams {
blueprint: StoryBlueprint;
language: Language;
}

export interface GridSeedResponse {
locationId: string;
locationName: string;
playerPosition: { x: number; y: number };
characters: { id: string; name: string; x: number; y: number; isPlayer?: boolean }[];
elements?: { symbol: string; name: string; description: string; x: number; y: number }[];
}

export const gridSeedSchema = {
type: 'object',
required: ['locationId', 'locationName', 'playerPosition', 'characters'],
properties: {
locationId: { type: 'string' },
locationName: { type: 'string' },
playerPosition: {
type: 'object',
required: ['x', 'y'],
properties: {
x: { type: 'number' },
y: { type: 'number' },
},
},
characters: {
type: 'array',
items: {
required: ['id', 'name', 'x', 'y'],
properties: {
id: { type: 'string' },
name: { type: 'string' },
x: { type: 'number' },
y: { type: 'number' },
isPlayer: { type: 'boolean' },
},
},
},
elements: {
type: 'array',
items: {
required: ['symbol', 'name', 'description', 'x', 'y'],
properties: {
symbol: { type: 'string' },
name: { type: 'string' },
description: { type: 'string' },
x: { type: 'number' },
y: { type: 'number' },
},
},
},
},
} as const;

export const buildGridSeedPrompt = ({ blueprint, language }: GridSeedPromptParams): string => {
const langName = getLanguageName(language);
return `
Design a 10x10 tactical grid layout for the starting encounter.
Use the same IDs provided in the blueprint for the player (${blueprint.playerSeed.id}) and NPCs.
Return coordinates (0-9) and symbolic elements. Descriptions in ${langName}.
`;
};
