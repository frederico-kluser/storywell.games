import { blobToBase64, cleanJsonString, playRawAudio, imageUrlToBase64 } from '../../utils/helpers';

describe('helpers', () => {
  describe('blobToBase64', () => {
    it('should convert a Blob to base64 string', async () => {
      const testData = 'Hello, World!';
      const blob = new Blob([testData], { type: 'text/plain' });

      const result = await blobToBase64(blob);

      // The result should be a base64 string (without the data URI prefix)
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty Blob', async () => {
      const blob = new Blob([], { type: 'text/plain' });

      const result = await blobToBase64(blob);

      expect(typeof result).toBe('string');
    });

    it('should handle binary data Blob', async () => {
      const binaryData = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      const blob = new Blob([binaryData], { type: 'application/octet-stream' });

      const result = await blobToBase64(blob);

      expect(typeof result).toBe('string');
    });
  });

  describe('cleanJsonString', () => {
    it('should return empty object string for falsy input', () => {
      expect(cleanJsonString('')).toBe('{}');
      expect(cleanJsonString(null as any)).toBe('{}');
      expect(cleanJsonString(undefined as any)).toBe('{}');
    });

    it('should remove markdown json code blocks', () => {
      const input = '```json\n{"key": "value"}\n```';
      const result = cleanJsonString(input);

      expect(result).toBe('{"key": "value"}');
    });

    it('should remove multiple markdown code blocks', () => {
      const input = '```json\n{"a": 1}\n```\n```json\n{"b": 2}\n```';
      const result = cleanJsonString(input);

      // The function removes code blocks and trims, result contains both JSON objects
      expect(result).toContain('{"a": 1}');
      expect(result).toContain('{"b": 2}');
    });

    it('should handle string without code blocks', () => {
      const input = '{"key": "value"}';
      const result = cleanJsonString(input);

      expect(result).toBe('{"key": "value"}');
    });

    it('should trim whitespace', () => {
      const input = '  {"key": "value"}  ';
      const result = cleanJsonString(input);

      expect(result).toBe('{"key": "value"}');
    });

    it('should handle nested JSON strings', () => {
      const input = '```json\n{"nested": {"inner": "value"}}\n```';
      const result = cleanJsonString(input);

      expect(result).toBe('{"nested": {"inner": "value"}}');
    });

    it('should preserve valid JSON structure', () => {
      const input = '```json\n{"array": [1, 2, 3], "bool": true, "null": null}\n```';
      const result = cleanJsonString(input);
      const parsed = JSON.parse(result);

      expect(parsed.array).toEqual([1, 2, 3]);
      expect(parsed.bool).toBe(true);
      expect(parsed.null).toBe(null);
    });
  });

  describe('playRawAudio', () => {
    it('should create AudioContext and play audio', async () => {
      // Simple base64 audio data (needs to be valid for Int16Array)
      const audioData = new Int16Array([0, 1000, -1000, 500]);
      const binary = String.fromCharCode(...new Uint8Array(audioData.buffer));
      const base64Audio = btoa(binary);

      // This should not throw
      await expect(playRawAudio(base64Audio)).resolves.toBeUndefined();
    });

    it('should accept custom sample rate', async () => {
      const audioData = new Int16Array([0, 1000]);
      const binary = String.fromCharCode(...new Uint8Array(audioData.buffer));
      const base64Audio = btoa(binary);

      await expect(playRawAudio(base64Audio, 44100)).resolves.toBeUndefined();
    });

    it('should handle empty audio data', async () => {
      const base64Audio = btoa('');

      await expect(playRawAudio(base64Audio)).resolves.toBeUndefined();
    });
  });

  describe('imageUrlToBase64', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should convert image URL to base64 data URI', async () => {
      const mockImageData = 'fake image data';
      const mockBlob = new Blob([mockImageData], { type: 'image/png' });

      // Mock fetch to return our blob
      global.fetch = jest.fn().mockResolvedValue({
        blob: () => Promise.resolve(mockBlob)
      });

      const result = await imageUrlToBase64('https://example.com/image.png');

      expect(global.fetch).toHaveBeenCalledWith('https://example.com/image.png');
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^data:/);
    });

    it('should handle different image types', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });

      global.fetch = jest.fn().mockResolvedValue({
        blob: () => Promise.resolve(mockBlob)
      });

      const result = await imageUrlToBase64('https://example.com/image.jpg');

      expect(typeof result).toBe('string');
    });

    it('should reject on fetch error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(imageUrlToBase64('https://example.com/image.png'))
        .rejects.toThrow('Network error');
    });

    it('should reject on blob conversion error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        blob: () => Promise.reject(new Error('Blob error'))
      });

      await expect(imageUrlToBase64('https://example.com/image.png'))
        .rejects.toThrow('Blob error');
    });

    it('should return full data URI with prefix', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' });

      global.fetch = jest.fn().mockResolvedValue({
        blob: () => Promise.resolve(mockBlob)
      });

      const result = await imageUrlToBase64('https://example.com/test.png');

      // Should contain data URI prefix
      expect(result).toContain('data:');
      expect(result).toContain('base64');
    });
  });
});
