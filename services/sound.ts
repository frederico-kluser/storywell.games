/**
 * Sound Service - Web Audio API based sound system
 *
 * Uses Web Audio API for zero-latency playback with support for:
 * - Pre-loading audio into memory
 * - Instant playback without delay
 * - Interrupting previous sounds on rapid clicks
 * - Touch device support
 *
 * @module services/sound
 */

type SoundBuffer = {
	buffer: AudioBuffer;
	lastSource: AudioBufferSourceNode | null;
};

class SoundService {
	private audioContext: AudioContext | null = null;
	private sounds: Map<string, SoundBuffer> = new Map();
	private initialized = false;
	private initPromise: Promise<void> | null = null;

	/**
	 * Initialize the AudioContext.
	 * Must be called after user interaction due to browser autoplay policies.
	 */
	async init(): Promise<void> {
		if (this.initialized) return;

		if (this.initPromise) {
			return this.initPromise;
		}

		this.initPromise = this._doInit();
		return this.initPromise;
	}

	private async _doInit(): Promise<void> {
		try {
			// Create AudioContext (with webkit prefix fallback for Safari)
			const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

			if (!AudioContextClass) {
				console.warn('[SoundService] Web Audio API not supported');
				return;
			}

			this.audioContext = new AudioContextClass();

			// Resume context if suspended (required by some browsers)
			if (this.audioContext.state === 'suspended') {
				await this.audioContext.resume();
			}

			this.initialized = true;
			console.log('[SoundService] Initialized successfully');
		} catch (error) {
			console.error('[SoundService] Failed to initialize:', error);
		}
	}

	/**
	 * Pre-load a sound file into memory for instant playback.
	 * @param name - Identifier for the sound
	 * @param url - URL or path to the audio file
	 */
	async preload(name: string, url: string): Promise<void> {
		if (!this.audioContext) {
			await this.init();
		}

		if (!this.audioContext) {
			console.warn('[SoundService] Cannot preload - AudioContext not available');
			return;
		}

		try {
			const response = await fetch(url);
			const arrayBuffer = await response.arrayBuffer();
			const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

			this.sounds.set(name, {
				buffer: audioBuffer,
				lastSource: null,
			});

			console.log(`[SoundService] Preloaded sound: ${name}`);
		} catch (error) {
			console.error(`[SoundService] Failed to preload sound "${name}":`, error);
		}
	}

	/**
	 * Play a preloaded sound.
	 * If the sound is already playing, it will be stopped and restarted.
	 * This creates the "interrupt previous sound" behavior.
	 *
	 * @param name - Identifier of the preloaded sound
	 * @param volume - Volume level (0.0 to 1.0), defaults to 1.0
	 */
	play(name: string, volume: number = 1.0): void {
		if (!this.audioContext) {
			console.warn('[SoundService] Cannot play - AudioContext not available');
			return;
		}

		const sound = this.sounds.get(name);
		if (!sound) {
			console.warn(`[SoundService] Sound "${name}" not found. Did you preload it?`);
			return;
		}

		// Stop the previous instance if it's still playing (interruption behavior)
		if (sound.lastSource) {
			try {
				sound.lastSource.stop();
			} catch {
				// Source may have already stopped, ignore
			}
		}

		// Create a new source node for this playback
		const source = this.audioContext.createBufferSource();
		source.buffer = sound.buffer;

		// Create gain node for volume control
		const gainNode = this.audioContext.createGain();
		gainNode.gain.value = Math.max(0, Math.min(1, volume));

		// Connect: source -> gain -> destination
		source.connect(gainNode);
		gainNode.connect(this.audioContext.destination);

		// Start playback
		source.start(0);

		// Store reference to stop on next play
		sound.lastSource = source;

		// Clean up reference when playback ends
		source.onended = () => {
			if (sound.lastSource === source) {
				sound.lastSource = null;
			}
		};
	}

	/**
	 * Stop a currently playing sound.
	 * @param name - Identifier of the sound to stop
	 */
	stop(name: string): void {
		const sound = this.sounds.get(name);
		if (sound?.lastSource) {
			try {
				sound.lastSource.stop();
				sound.lastSource = null;
			} catch {
				// Already stopped
			}
		}
	}

	/**
	 * Resume AudioContext if it was suspended.
	 * Call this on user interaction if sounds aren't playing.
	 */
	async resume(): Promise<void> {
		if (this.audioContext?.state === 'suspended') {
			await this.audioContext.resume();
		}
	}

	/**
	 * Check if the service is ready to play sounds.
	 */
	isReady(): boolean {
		return this.initialized && this.audioContext?.state === 'running';
	}

	/**
	 * Get current AudioContext state.
	 */
	getState(): AudioContextState | 'not-initialized' {
		return this.audioContext?.state ?? 'not-initialized';
	}
}

// Export singleton instance
export const soundService = new SoundService();

// Sound identifiers
export const SOUNDS = {
	UI_CLICK: 'ui-click',
} as const;

export type SoundName = (typeof SOUNDS)[keyof typeof SOUNDS];
