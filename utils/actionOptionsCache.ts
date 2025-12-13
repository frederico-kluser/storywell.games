import { ActionOption } from '../types';

const OPTIONS_CACHE_KEY = 'storywell_options_cache';

const memoryCache: Record<string, CachedActionOptions> = {};
const storageMirror: Record<string, string | null> = {};
const pendingRequests: Record<string, Promise<ActionOption[]>> = {};

const getStorageKey = (storyId: string) => `${OPTIONS_CACHE_KEY}_${storyId}`;

export interface CachedActionOptions {
	lastMessageId: string;
	options: ActionOption[];
}

export const getCachedActionOptions = (storyId: string): CachedActionOptions | null => {
	const storageKey = getStorageKey(storyId);

	try {
		const cached = localStorage.getItem(storageKey);
		if (!cached) {
			delete memoryCache[storyId];
			storageMirror[storyId] = null;
			return null;
		}

		if (memoryCache[storyId] && storageMirror[storyId] === cached) {
			return memoryCache[storyId];
		}

		const parsed = JSON.parse(cached) as CachedActionOptions;
		memoryCache[storyId] = parsed;
		storageMirror[storyId] = cached;
		return parsed;
	} catch (error) {
		delete memoryCache[storyId];
		storageMirror[storyId] = null;
		console.error('Failed to read options cache:', error);
		return null;
	}
};

export const saveCachedActionOptions = (storyId: string, lastMessageId: string, options: ActionOption[]): void => {
	const payload: CachedActionOptions = { lastMessageId, options };
	const serialized = JSON.stringify(payload);
	memoryCache[storyId] = payload;
	storageMirror[storyId] = serialized;

	try {
		localStorage.setItem(getStorageKey(storyId), serialized);
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
