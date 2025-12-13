/**
 * Click Sound Provider - Global UI click sound system
 *
 * Provides automatic click sound feedback for all interactive UI elements.
 * Uses Web Audio API for zero-latency playback and supports touch devices.
 *
 * Features:
 * - Automatic sound on all buttons, links, and interactive elements
 * - Pre-loaded audio for instant playback
 * - Interrupts previous sound on rapid clicks
 * - Touch device support via pointer events
 * - Respects user's sound preferences
 *
 * @module hooks/useClickSound
 */

import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { soundService, SOUNDS } from '../services/sound';

// Path to the UI click sound asset
const UI_CLICK_SOUND_PATH = '/assets/JDSherbert - Ultimate UI SFX Pack - Cursor 4.wav';

interface ClickSoundContextValue {
	/** Whether click sounds are enabled */
	enabled: boolean;
	/** Toggle click sounds on/off */
	setEnabled: (enabled: boolean) => void;
	/** Manually play the click sound */
	playClickSound: () => void;
	/** Whether the sound system is ready */
	isReady: boolean;
}

const ClickSoundContext = createContext<ClickSoundContextValue | null>(null);

// Storage key for sound preference
const CLICK_SOUND_STORAGE_KEY = 'storywell.clickSoundEnabled';

/**
 * Check if an element is interactive (clickable).
 * This includes buttons, links, and elements with interactive roles.
 */
function isInteractiveElement(element: Element | null): boolean {
	if (!element) return false;

	const tagName = element.tagName.toLowerCase();
	const role = element.getAttribute('role');
	const tabIndex = element.getAttribute('tabindex');

	// Standard interactive elements
	if (tagName === 'button') return true;
	if (tagName === 'a' && element.hasAttribute('href')) return true;
	if (tagName === 'input') {
		const type = (element as HTMLInputElement).type?.toLowerCase();
		if (['button', 'submit', 'reset', 'checkbox', 'radio'].includes(type)) return true;
	}
	if (tagName === 'select') return true;
	if (tagName === 'summary') return true;

	// ARIA roles that indicate interactivity
	if (role === 'button' || role === 'link' || role === 'menuitem' || role === 'tab' || role === 'option') {
		return true;
	}

	// Elements with tabindex (but not -1) are likely interactive
	if (tabIndex !== null && tabIndex !== '-1') {
		return true;
	}

	// Check for cursor pointer style (indicates clickability)
	const computedStyle = window.getComputedStyle(element);
	if (computedStyle.cursor === 'pointer') {
		return true;
	}

	return false;
}

/**
 * Find the closest interactive element from the event target.
 * Walks up the DOM tree to find an interactive ancestor.
 */
function findInteractiveElement(target: EventTarget | null): Element | null {
	if (!(target instanceof Element)) return null;

	let current: Element | null = target;

	// Walk up the DOM tree (max 10 levels to avoid infinite loops)
	for (let i = 0; i < 10 && current; i++) {
		if (isInteractiveElement(current)) {
			return current;
		}
		current = current.parentElement;
	}

	return null;
}

interface ClickSoundProviderProps {
	children: React.ReactNode;
}

/**
 * Provider component that enables global click sounds.
 * Wrap your app with this provider to enable click sounds on all interactive elements.
 *
 * @example
 * ```tsx
 * <ClickSoundProvider>
 *   <App />
 * </ClickSoundProvider>
 * ```
 */
export function ClickSoundProvider({ children }: ClickSoundProviderProps) {
	const [enabled, setEnabledState] = useState<boolean>(() => {
		// Load preference from localStorage
		if (typeof window !== 'undefined') {
			const stored = localStorage.getItem(CLICK_SOUND_STORAGE_KEY);
			return stored !== 'false'; // Default to true
		}
		return true;
	});

	const [isReady, setIsReady] = useState(false);
	const initializedRef = useRef(false);

	// Persist preference
	const setEnabled = useCallback((value: boolean) => {
		setEnabledState(value);
		localStorage.setItem(CLICK_SOUND_STORAGE_KEY, String(value));
	}, []);

	// Initialize sound service on first user interaction
	const initializeAudio = useCallback(async () => {
		if (initializedRef.current) return;
		initializedRef.current = true;

		try {
			await soundService.init();
			await soundService.preload(SOUNDS.UI_CLICK, UI_CLICK_SOUND_PATH);
			setIsReady(true);
			console.log('[ClickSound] Audio system initialized');
		} catch (error) {
			console.error('[ClickSound] Failed to initialize:', error);
		}
	}, []);

	// Play click sound function
	const playClickSound = useCallback(() => {
		if (!enabled || !isReady) return;

		// Resume AudioContext if needed (handles browser autoplay restrictions)
		soundService.resume().then(() => {
			soundService.play(SOUNDS.UI_CLICK, 0.25); // Play at 25% volume
		});
	}, [enabled, isReady]);

	// Set up global click listener using event delegation
	useEffect(() => {
		const handlePointerDown = async (event: PointerEvent) => {
			// Initialize on first interaction
			if (!initializedRef.current) {
				await initializeAudio();
			}

			// Check if the clicked element (or ancestor) is interactive
			const interactiveElement = findInteractiveElement(event.target);

			if (interactiveElement && enabled && isReady) {
				// Resume AudioContext if needed
				await soundService.resume();
				soundService.play(SOUNDS.UI_CLICK, 0.25);
			}
		};

		// Use pointerdown for unified mouse/touch handling
		// Capture phase ensures we catch events before they're potentially stopped
		document.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true });

		return () => {
			document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
		};
	}, [enabled, isReady, initializeAudio]);

	// Initialize on mount (will wait for user interaction due to browser policies)
	useEffect(() => {
		// Pre-warm: try to initialize, but it may not work until user interaction
		initializeAudio();
	}, [initializeAudio]);

	const contextValue: ClickSoundContextValue = {
		enabled,
		setEnabled,
		playClickSound,
		isReady,
	};

	return <ClickSoundContext.Provider value={contextValue}>{children}</ClickSoundContext.Provider>;
}

/**
 * Hook to access click sound controls.
 * Must be used within a ClickSoundProvider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { enabled, setEnabled, playClickSound } = useClickSound();
 *
 *   return (
 *     <button onClick={() => setEnabled(!enabled)}>
 *       {enabled ? 'Mute' : 'Unmute'} Click Sounds
 *     </button>
 *   );
 * }
 * ```
 */
export function useClickSound(): ClickSoundContextValue {
	const context = useContext(ClickSoundContext);

	if (!context) {
		throw new Error('useClickSound must be used within a ClickSoundProvider');
	}

	return context;
}

/**
 * Hook for optional click sound access.
 * Returns null if used outside of ClickSoundProvider (won't throw).
 */
export function useClickSoundOptional(): ClickSoundContextValue | null {
	return useContext(ClickSoundContext);
}
