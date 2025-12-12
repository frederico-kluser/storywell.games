
/**
 * Converts a Blob object (like Audio or Image) to a Base64 string.
 * Strips the Data URI prefix (e.g., "data:image/png;base64,") to return raw data.
 * 
 * @param blob - The file blob to convert.
 * @returns Promise resolving to the raw Base64 string.
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Strip the metadata prefix to get raw base64
      const base64Content = base64String.split(',')[1];
      resolve(base64Content);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Decodes and plays raw PCM audio data from a Base64 string.
 * Gemini TTS returns raw PCM (no header), so we use AudioContext to decode it.
 * 
 * @param base64Audio - The raw PCM data in base64.
 * @param sampleRate - Sample rate of the audio (default 24000 for Gemini).
 */
export const playRawAudio = async (base64Audio: string, sampleRate = 24000): Promise<void> => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
  
  // 1. Decode Base64 to ArrayBuffer
  const binaryString = atob(base64Audio);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // 2. Process Raw PCM Data (Float32 or Int16 logic)
  // Gemini usually sends raw PCM. We try to interpret it as simple Int16 Little Endian first
  // Note: The specific decoding often depends on the exact model output, 
  // but using a standard decodeAudioData often fails on RAW PCM without headers.
  // We will manually construct the buffer from Int16 PCM.
  
  const dataInt16 = new Int16Array(bytes.buffer);
  const audioBuffer = audioContext.createBuffer(1, dataInt16.length, sampleRate);
  const channelData = audioBuffer.getChannelData(0);
  
  for (let i = 0; i < dataInt16.length; i++) {
    // Normalize Int16 to Float32 [-1.0, 1.0]
    channelData[i] = dataInt16[i] / 32768.0;
  }

  // 3. Play
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start(0);
};

/**
 * Sanitizes a string allowing it to be parsed as JSON.
 * Removes Markdown code blocks (```json ... ```) often returned by LLMs.
 */
export const cleanJsonString = (str: string): string => {
  if (!str) return "{}";
  // Remove markdown code blocks if present
  let cleaned = str.replace(/```json/g, "").replace(/```/g, "");
  return cleaned.trim();
};

/**
 * Converts an image URL to a Base64 string.
 * Fetches the image, converts to blob, and returns base64 with data URI prefix.
 *
 * @param imageUrl - The URL of the image to convert.
 * @returns Promise resolving to the Base64 data URI string (e.g., "data:image/png;base64,...").
 */
export const imageUrlToBase64 = async (imageUrl: string): Promise<string> => {
  const response = await fetch(imageUrl);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64String = reader.result as string;
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};
