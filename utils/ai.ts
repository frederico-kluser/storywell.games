import OpenAI from 'openai';

export interface LLMRequestConfig {
	model: string;
	systemInstruction?: string;
	responseFormat?: 'json' | 'text';
	temperature?: number;
	maxTokens?: number;
}

export interface LLMMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface LLMResponse {
	text: string | null;
}

/**
 * Supported image sizes for gpt-image-1-mini model.
 * - 1024x1024: Square format (default)
 * - 1536x1024: Landscape/widescreen format
 * - 1024x1536: Portrait format
 */
export type GptImageSize = '1024x1024' | '1536x1024' | '1024x1536' | 'auto';

/**
 * Quality levels for gpt-image-1-mini model.
 * - low: Fastest, cheapest (~0.5 cents)
 * - medium: Balanced (~1.5 cents)
 * - high: Best quality (~3-5 cents)
 * - auto: Let the model decide
 */
export type GptImageQuality = 'low' | 'medium' | 'high' | 'auto';

interface ImageSizePresetConfig {
	imageSize: GptImageSize;
	quality: GptImageQuality;
	targetDimensions?: { width: number; height: number };
	description: string;
}

const IMAGE_SIZE_PRESETS = {
	characterAvatar: {
		imageSize: '1024x1024',
		quality: 'medium',
		targetDimensions: { width: 124, height: 124 },
		description: 'Character avatars scaled down to 124px squares.',
	},
	locationBackground: {
		imageSize: '1536x1024',
		quality: 'medium',
		targetDimensions: { width: 768, height: 512 },
		description: 'Cinematic widescreen backgrounds for locations.',
	},
} as const satisfies Record<string, ImageSizePresetConfig>;

export type ImageGenerationPreset = keyof typeof IMAGE_SIZE_PRESETS;

export const getImageGenerationPreset = (preset: ImageGenerationPreset): ImageSizePresetConfig =>
	IMAGE_SIZE_PRESETS[preset];

type CanvasSurface = HTMLCanvasElement | OffscreenCanvas;

const ensureSurface = (width: number, height: number): CanvasSurface | null => {
	if (typeof OffscreenCanvas !== 'undefined') {
		return new OffscreenCanvas(width, height);
	}
	if (typeof document !== 'undefined') {
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		return canvas;
	}
	return null;
};

const isDataUriImage = (source: string): boolean => /^data:image\//i.test(source);

const blobToDataUrl = async (blob: Blob): Promise<string> => {
	const arrayBuffer = await blob.arrayBuffer();
	const bytes = new Uint8Array(arrayBuffer);
	let binary = '';
	bytes.forEach((byte) => {
		binary += String.fromCharCode(byte);
	});
	return `data:image/png;base64,${btoa(binary)}`;
};

const surfaceToDataUrl = async (surface: CanvasSurface): Promise<string> => {
	if (typeof OffscreenCanvas !== 'undefined' && surface instanceof OffscreenCanvas) {
		const blob = await surface.convertToBlob({ type: 'image/png' });
		return blobToDataUrl(blob);
	}
	return (surface as HTMLCanvasElement).toDataURL('image/png');
};

export const resizeBase64Image = async (base64: string, width: number, height: number): Promise<string> => {
	if (!isDataUriImage(base64)) {
		console.warn('🖼️ [ImageHelper] Input is not a base64 data URI, skipping resize.');
		return base64;
	}

	if (typeof Image === 'undefined') {
		console.warn('🖼️ [ImageHelper] Image constructor unavailable, skipping resize.');
		return base64;
	}

	const surface = ensureSurface(width, height);
	if (!surface) {
		console.warn('🖼️ [ImageHelper] Canvas APIs unavailable, skipping resize.');
		return base64;
	}

	return new Promise((resolve) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = async () => {
			try {
				const ctx = surface.getContext('2d');
				if (!ctx) {
					console.warn('🖼️ [ImageHelper] 2D context unavailable, keeping original image.');
					resolve(base64);
					return;
				}
				ctx.clearRect(0, 0, width, height);
				ctx.drawImage(img, 0, 0, width, height);
				const dataUrl = await surfaceToDataUrl(surface);
				console.info(`🖼️ [ImageHelper] Resized image to ${width}x${height}.`);
				resolve(dataUrl);
			} catch (error) {
				console.error('🖼️ [ImageHelper] Resize failed, returning original image.', error);
				resolve(base64);
			}
		};
		img.onerror = () => {
			console.error('🖼️ [ImageHelper] Image load failed, returning original image.');
			resolve(base64);
		};
		img.src = base64;
	});
};

export const applyImagePresetToBase64 = async (base64: string, preset: ImageGenerationPreset): Promise<string> => {
	const config = getImageGenerationPreset(preset);
	if (!config.targetDimensions) {
		return base64;
	}

	return resizeBase64Image(base64, config.targetDimensions.width, config.targetDimensions.height);
};

/**
 * Universal wrapper for calling the OpenAI LLM.
 * Uses GPT-4.1 model with temperature 0 for deterministic outputs.
 *
 * @param apiKey - The OpenAI API Key.
 * @param messages - The prompt messages (system, user, assistant).
 * @param config - Configuration for the model.
 * @returns The response object with text content.
 */
export const queryLLM = async (
	apiKey: string,
	messages: LLMMessage[],
	config: LLMRequestConfig,
): Promise<LLMResponse> => {
	const client = new OpenAI({
		apiKey,
		dangerouslyAllowBrowser: true, // Required for browser-side usage
	});

	const response = await client.chat.completions.create({
		model: config.model,
		messages: messages,
		temperature: 0, // Always use temperature 0 as requested
		response_format: config.responseFormat === 'json' ? { type: 'json_object' } : { type: 'text' },
		...(config.maxTokens && { max_tokens: config.maxTokens }),
	});

	return {
		text: response.choices[0]?.message?.content || null,
	};
};

/**
 * Transcribes audio using OpenAI Whisper API.
 *
 * @param apiKey - The OpenAI API Key.
 * @param audioBlob - The audio blob to transcribe.
 * @param language - Language hint (ISO code).
 * @returns Transcribed text string.
 */
export const transcribeAudioWithWhisper = async (
	apiKey: string,
	audioBlob: Blob,
	language: string,
): Promise<string> => {
	const client = new OpenAI({
		apiKey,
		dangerouslyAllowBrowser: true,
	});

	// Create a File object from the Blob
	const file = new File([audioBlob], 'audio.webm', { type: audioBlob.type });

	const response = await client.audio.transcriptions.create({
		model: 'whisper-1',
		file: file,
		language: language,
	});

	return response.text;
};

/**
 * Validates the provided OpenAI API key by making a minimal request.
 * @param apiKey - The OpenAI API Key.
 * @returns True if valid, false otherwise.
 */
export const validateOpenAIKey = async (apiKey: string): Promise<boolean> => {
	try {
		const client = new OpenAI({
			apiKey,
			dangerouslyAllowBrowser: true,
		});

		// Make a minimal request to validate the key
		await client.chat.completions.create({
			model: 'gpt-4.1',
			messages: [{ role: 'user', content: 'Hi' }],
			max_tokens: 1,
			temperature: 0,
		});

		return true;
	} catch (e) {
		console.error('OpenAI API Validation Failed:', e);
		return false;
	}
};

/**
 * Generates an image using OpenAI's gpt-image-1-mini model and returns it as base64.
 * This model is 80% cheaper than gpt-image-1 while maintaining good quality.
 *
 * @param apiKey - The OpenAI API Key.
 * @param prompt - The image generation prompt.
 * @param size - Image size (default: 1024x1024).
 * @param quality - Image quality: low, medium, high, or auto (default: medium).
 * @returns Base64 data URI of the generated image or undefined if failed.
 */
export const generateImage = async (
	apiKey: string,
	prompt: string,
	size: GptImageSize = '1024x1024',
	quality: GptImageQuality = 'medium',
): Promise<string | undefined> => {
	try {
		const client = new OpenAI({
			apiKey,
			dangerouslyAllowBrowser: true,
		});

		// gpt-image-1-mini always returns base64 in b64_json field
		// (no response_format parameter - that was only for DALL-E models)
		const response = await client.images.generate({
			model: 'gpt-image-1-mini',
			prompt: prompt,
			n: 1,
			size: size,
			quality: quality,
		});

		const base64Data = response.data[0]?.b64_json;
		if (!base64Data) return undefined;

		// Return as data URI for direct use in img src
		return `data:image/png;base64,${base64Data}`;
	} catch (e) {
		console.error('GPT Image Generation Failed:', e);
		return undefined;
	}
};

/**
 * @deprecated Use generateImage instead. This is kept for backwards compatibility.
 */
export const generateImageWithDallE = generateImage;

/**
 * Available voices for gpt-4o-mini-tts model.
 */
export type TTSVoice =
	| 'alloy'
	| 'ash'
	| 'ballad'
	| 'coral'
	| 'echo'
	| 'fable'
	| 'nova'
	| 'onyx'
	| 'sage'
	| 'shimmer'
	| 'verse';

/**
 * Generates speech from text using OpenAI TTS models.
 * - When useTone is true (default): Uses gpt-4o-mini-tts with instructions for tone control.
 * - When useTone is false: Uses tts-1 (standard voice) without tone instructions.
 *
 * @param apiKey - The OpenAI API Key.
 * @param text - Text to convert to speech.
 * @param voice - Voice to use (alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer, verse).
 * @param instructions - Instructions for tone, emotion, accent, pacing (only used when useTone is true).
 * @param useTone - Whether to use tone instructions (default true). When false, uses tts-1 model.
 * @returns Base64 encoded audio data or undefined if failed.
 */
export const generateSpeechWithTTS = async (
	apiKey: string,
	text: string,
	voice: TTSVoice = 'alloy',
	instructions?: string,
	useTone: boolean = true,
): Promise<string | undefined> => {
	try {
		const client = new OpenAI({
			apiKey,
			dangerouslyAllowBrowser: true,
		});

		// Select model based on useTone setting
		// tts-1: Standard model, no tone instructions support
		// gpt-4o-mini-tts: Advanced model with tone instructions support
		const model = useTone ? 'gpt-4o-mini-tts' : 'tts-1';

		// Build request parameters
		const requestParams: {
			model: string;
			voice: string;
			input: string;
			response_format: 'mp3';
			instructions?: string;
		} = {
			model,
			voice: voice,
			input: text,
			response_format: 'mp3',
		};

		// Add instructions only if useTone is enabled and instructions are provided
		if (useTone && instructions) {
			requestParams.instructions = instructions;
		}

		const response = await client.audio.speech.create(requestParams);

		// Convert the response to base64
		const arrayBuffer = await response.arrayBuffer();
		const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));

		return base64;
	} catch (e) {
		console.error('TTS Generation Failed:', e);
		return undefined;
	}
};

/**
 * Plays MP3 audio from base64 string.
 * @param base64Audio - Base64 encoded MP3 audio.
 * @returns Promise that resolves when audio finishes playing.
 */
export const playMP3Audio = (base64Audio: string): Promise<void> => {
	return new Promise((resolve, reject) => {
		try {
			const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
			audio.onended = () => resolve();
			audio.onerror = (e) => reject(e);
			audio.play();
		} catch (e) {
			reject(e);
		}
	});
};
