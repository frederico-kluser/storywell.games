import { ActionOption } from '../types';

const OPTIONS_CACHE_KEY = 'storywell_options_cache';

const memoryCache: Record<string, CachedActionOptions> = {};
const pendingRequests: Record<string, Promise<ActionOption[]>> = {};

const getStorageKey = (storyId: string) => `${OPTIONS_CACHE_KEY}_${storyId}`;

export interface CachedActionOptions {
	lastMessageId: string;
	options: ActionOption[];
}

export const getCachedActionOptions = (storyId: string): CachedActionOptions | null => {
	if (memoryCache[storyId]) {
		return memoryCache[storyId];
	}

	try {
		const cached = localStorage.getItem(getStorageKey(storyId));
		if (cached) {
			const parsed = JSON.parse(cached) as CachedActionOptions;
			memoryCache[storyId] = parsed;
			return parsed;
		}
	} catch (error) {
		console.error('Failed to read options cache:', error);
	}
	return null;
};

export const saveCachedActionOptions = (storyId: string, lastMessageId: string, options: ActionOption[]): void => {
	const payload: CachedActionOptions = { lastMessageId, options };
	memoryCache[storyId] = payload;

	try {
		localStorage.setItem(getStorageKey(storyId), JSON.stringify(payload));
	} catch (error) {
		console.error('Failed to save options cache:', error);
	}
};

type ActionOptionsFetcher = () => Promise<ActionOption[]>;

export const fetchActionOptionsWithCache = async (
	storyId: string,
	lastMessageId: string,
	fetcher: ActionOptionsFetcher,
): Promise<ActionOption[]> => {
	const pendingKey = `${storyId}:${lastMessageId}`;
	const cached = getCachedActionOptions(storyId);
	if (cached && cached.lastMessageId === lastMessageId && cached.options.length > 0) {
		return cached.options;
	}

	if (pendingRequests[pendingKey]) {
		return pendingRequests[pendingKey];
	}

	const pendingPromise = (async () => {
		const options = await fetcher();
		if (options.length > 0) {
			saveCachedActionOptions(storyId, lastMessageId, options);
		}
		return options;
	})();

	pendingRequests[pendingKey] = pendingPromise;

	try {
		return await pendingPromise;
	} finally {
		delete pendingRequests[pendingKey];
	}
};
