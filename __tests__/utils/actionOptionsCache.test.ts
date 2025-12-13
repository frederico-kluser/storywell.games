import {
  getCachedActionOptions,
  saveCachedActionOptions,
  CachedActionOptions,
} from '../../utils/actionOptionsCache';
import { ActionOption } from '../../types';

describe('actionOptionsCache', () => {
  const mockStoryId = 'test-story-123';
  const mockMessageId = 'msg-456';
  const mockOptions: ActionOption[] = [
    { text: 'Attack the dragon', probability: 30, hint: 'Risky move' },
    { text: 'Run away', probability: 80, hint: 'Safe choice' },
    { text: 'Negotiate', probability: 50, hint: 'Depends on charisma' },
  ];

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('saveCachedActionOptions', () => {
    it('should save options to localStorage', () => {
      saveCachedActionOptions(mockStoryId, mockMessageId, mockOptions);

      const stored = localStorage.getItem(`storywell_options_cache_${mockStoryId}`);
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!) as CachedActionOptions;
      expect(parsed.lastMessageId).toBe(mockMessageId);
      expect(parsed.options).toEqual(mockOptions);
    });

    it('should overwrite existing cache for same story', () => {
      const oldOptions: ActionOption[] = [{ text: 'Old option', probability: 10 }];
      saveCachedActionOptions(mockStoryId, 'old-msg', oldOptions);

      saveCachedActionOptions(mockStoryId, mockMessageId, mockOptions);

      const stored = localStorage.getItem(`storywell_options_cache_${mockStoryId}`);
      const parsed = JSON.parse(stored!) as CachedActionOptions;
      expect(parsed.lastMessageId).toBe(mockMessageId);
      expect(parsed.options).toEqual(mockOptions);
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('Storage full');
      });

      // Should not throw
      expect(() => {
        saveCachedActionOptions(mockStoryId, mockMessageId, mockOptions);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save options cache:',
        expect.any(Error)
      );

      Storage.prototype.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });

    it('should save empty options array', () => {
      saveCachedActionOptions(mockStoryId, mockMessageId, []);

      const stored = localStorage.getItem(`storywell_options_cache_${mockStoryId}`);
      const parsed = JSON.parse(stored!) as CachedActionOptions;
      expect(parsed.options).toEqual([]);
    });
  });

  describe('getCachedActionOptions', () => {
    it('should return cached options when available', () => {
      saveCachedActionOptions(mockStoryId, mockMessageId, mockOptions);

      const result = getCachedActionOptions(mockStoryId);

      expect(result).not.toBeNull();
      expect(result!.lastMessageId).toBe(mockMessageId);
      expect(result!.options).toEqual(mockOptions);
    });

    it('should return null when no cache exists', () => {
      const result = getCachedActionOptions('non-existent-story');

      expect(result).toBeNull();
    });

    it('should return null for empty localStorage item', () => {
      localStorage.setItem(`storywell_options_cache_${mockStoryId}`, '');

      const result = getCachedActionOptions(mockStoryId);

      expect(result).toBeNull();
    });

    it('should handle invalid JSON gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      localStorage.setItem(`storywell_options_cache_${mockStoryId}`, 'invalid-json');

      const result = getCachedActionOptions(mockStoryId);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to read options cache:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = jest.fn(() => {
        throw new Error('Storage access denied');
      });

      const result = getCachedActionOptions(mockStoryId);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to read options cache:',
        expect.any(Error)
      );

      Storage.prototype.getItem = originalGetItem;
      consoleSpy.mockRestore();
    });
  });

  describe('cache isolation', () => {
    it('should keep separate caches for different stories', () => {
      const storyId1 = 'story-1';
      const storyId2 = 'story-2';
      const options1: ActionOption[] = [{ text: 'Option 1', probability: 10 }];
      const options2: ActionOption[] = [{ text: 'Option 2', probability: 20 }];

      saveCachedActionOptions(storyId1, 'msg-1', options1);
      saveCachedActionOptions(storyId2, 'msg-2', options2);

      const cached1 = getCachedActionOptions(storyId1);
      const cached2 = getCachedActionOptions(storyId2);

      expect(cached1!.options).toEqual(options1);
      expect(cached2!.options).toEqual(options2);
    });
  });

  describe('CachedActionOptions interface', () => {
    it('should have correct structure', () => {
      saveCachedActionOptions(mockStoryId, mockMessageId, mockOptions);
      const cached = getCachedActionOptions(mockStoryId);

      expect(cached).toHaveProperty('lastMessageId');
      expect(cached).toHaveProperty('options');
      expect(typeof cached!.lastMessageId).toBe('string');
      expect(Array.isArray(cached!.options)).toBe(true);
    });
  });
});
