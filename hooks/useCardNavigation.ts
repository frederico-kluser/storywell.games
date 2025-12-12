import React, { useState, useEffect, useCallback, useRef } from 'react';

interface UseCardNavigationProps {
	totalCards: number;
	enabled?: boolean;
	onIndexChange?: (index: number) => void;
	onNavigate?: () => void; // Callback when any navigation action occurs
}

interface UseCardNavigationReturn {
	currentIndex: number;
	setCurrentIndex: (index: number) => void;
	goToNext: () => void;
	goToPrevious: () => void;
	goToFirst: () => void;
	goToLast: () => void;
	canGoNext: boolean;
	canGoPrevious: boolean;
	// Touch/Swipe handlers (touch only for mobile, mouse handlers are no-op on desktop)
	touchHandlers: {
		onTouchStart: (e: React.TouchEvent) => void;
		onTouchMove: (e: React.TouchEvent) => void;
		onTouchEnd: () => void;
		onMouseDown: (e: React.MouseEvent) => void;
		onMouseMove: (e: React.MouseEvent) => void;
		onMouseUp: () => void;
		onMouseLeave: () => void;
	};
	swipeDirection: 'left' | 'right' | null;
	swipeProgress: number; // 0 to 1, for animation purposes
	isMobile: boolean; // Whether the device is mobile (swipe enabled)
}

// Detect if device is mobile/touch device
const isMobileDevice = (): boolean => {
	if (typeof window === 'undefined') return false;
	return (
		'ontouchstart' in window ||
		navigator.maxTouchPoints > 0 ||
		// @ts-expect-error - msMaxTouchPoints exists on older IE
		navigator.msMaxTouchPoints > 0 ||
		/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
	);
};

const SWIPE_THRESHOLD = 50; // Minimum distance to trigger swipe
const SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum velocity to trigger swipe

/**
 * Hook for managing card navigation with keyboard and swipe support.
 * Handles arrow keys, touch swipe, and mouse drag gestures.
 */
export const useCardNavigation = ({
	totalCards,
	enabled = true,
	onIndexChange,
	onNavigate,
}: UseCardNavigationProps): UseCardNavigationReturn => {
	const [currentIndex, setCurrentIndexState] = useState(0);
	const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
	const [swipeProgress, setSwipeProgress] = useState(0);
	const [isMobile, setIsMobile] = useState(false);

	// Touch/Mouse tracking refs
	const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
	const isDraggingRef = useRef(false);

	// Detect mobile device on mount
	useEffect(() => {
		setIsMobile(isMobileDevice());
	}, []);

	// Keep index within bounds when totalCards changes
	useEffect(() => {
		if (totalCards === 0) {
			if (currentIndex !== 0) {
				setCurrentIndexState(0);
				onIndexChange?.(0);
			}
			return;
		}

		if (currentIndex >= totalCards) {
			const newIndex = totalCards - 1;
			setCurrentIndexState(newIndex);
			onIndexChange?.(newIndex);
		}
	}, [totalCards, currentIndex, onIndexChange]);

	const setCurrentIndex = useCallback(
		(index: number) => {
			if (index < 0) {
				return;
			}

			if (totalCards === 0) {
				if (index === 0) {
					setCurrentIndexState(0);
					onIndexChange?.(0);
				}
				return;
			}

			if (index >= totalCards) {
				return;
			}

			setCurrentIndexState(index);
			onIndexChange?.(index);
		},
		[totalCards, onIndexChange],
	);

	const canGoNext = currentIndex < totalCards - 1;
	const canGoPrevious = currentIndex > 0;

	const goToNext = useCallback(() => {
		if (canGoNext) {
			const newIndex = currentIndex + 1;
			setCurrentIndexState(newIndex);
			onIndexChange?.(newIndex);
			onNavigate?.(); // Notify navigation occurred
			setSwipeDirection('left');
			setTimeout(() => setSwipeDirection(null), 300);
		}
	}, [currentIndex, canGoNext, onIndexChange, onNavigate]);

	const goToPrevious = useCallback(() => {
		if (canGoPrevious) {
			const newIndex = currentIndex - 1;
			setCurrentIndexState(newIndex);
			onIndexChange?.(newIndex);
			onNavigate?.(); // Notify navigation occurred
			setSwipeDirection('right');
			setTimeout(() => setSwipeDirection(null), 300);
		}
	}, [currentIndex, canGoPrevious, onIndexChange, onNavigate]);

	const goToFirst = useCallback(() => {
		setCurrentIndexState(0);
		onIndexChange?.(0);
		onNavigate?.(); // Notify navigation occurred
	}, [onIndexChange, onNavigate]);

	const goToLast = useCallback(() => {
		const lastIndex = Math.max(0, totalCards - 1);
		setCurrentIndexState(lastIndex);
		onIndexChange?.(lastIndex);
		onNavigate?.(); // Notify navigation occurred
	}, [totalCards, onIndexChange, onNavigate]);

	// Keyboard navigation
	useEffect(() => {
		if (!enabled) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			// Don't capture if user is typing in an input
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
				return;
			}

			switch (e.key) {
				case 'ArrowLeft':
					e.preventDefault();
					goToPrevious();
					break;
				case 'ArrowRight':
					e.preventDefault();
					goToNext();
					break;
				case 'Home':
					e.preventDefault();
					goToFirst();
					break;
				case 'End':
					e.preventDefault();
					goToLast();
					break;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [enabled, goToNext, goToPrevious, goToFirst, goToLast]);

	// Touch handlers
	const handleTouchStart = useCallback(
		(e: React.TouchEvent) => {
			if (!enabled) return;
			const touch = e.touches[0];
			touchStartRef.current = {
				x: touch.clientX,
				y: touch.clientY,
				time: Date.now(),
			};
			setSwipeProgress(0);
		},
		[enabled],
	);

	const handleTouchMove = useCallback(
		(e: React.TouchEvent) => {
			if (!enabled || !touchStartRef.current) return;
			const touch = e.touches[0];
			const deltaX = touch.clientX - touchStartRef.current.x;
			const deltaY = touch.clientY - touchStartRef.current.y;

			// Only track horizontal swipes
			if (Math.abs(deltaX) > Math.abs(deltaY)) {
				const progress = Math.min(Math.abs(deltaX) / SWIPE_THRESHOLD, 1);
				setSwipeProgress(progress);

				if (deltaX > 0 && canGoPrevious) {
					setSwipeDirection('right');
				} else if (deltaX < 0 && canGoNext) {
					setSwipeDirection('left');
				}
			}
		},
		[enabled, canGoNext, canGoPrevious],
	);

	const handleTouchEnd = useCallback(() => {
		if (!enabled || !touchStartRef.current) return;

		const elapsed = Date.now() - touchStartRef.current.time;

		// Check if swipe was completed
		if (swipeProgress >= 1) {
			if (swipeDirection === 'left') {
				goToNext();
			} else if (swipeDirection === 'right') {
				goToPrevious();
			}
		}

		// Reset
		touchStartRef.current = null;
		setSwipeProgress(0);
		setTimeout(() => setSwipeDirection(null), 300);
	}, [enabled, swipeProgress, swipeDirection, goToNext, goToPrevious]);

	// Mouse drag handlers - DISABLED on desktop to prevent swipe
	// On desktop, users should use arrow keys or navigation buttons
	// These handlers are kept as no-ops for the interface compatibility
	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			// Only enable mouse swipe on mobile devices (for hybrid devices with touch+mouse)
			if (!enabled || !isMobile) return;
			isDraggingRef.current = true;
			touchStartRef.current = {
				x: e.clientX,
				y: e.clientY,
				time: Date.now(),
			};
			setSwipeProgress(0);
		},
		[enabled, isMobile],
	);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			// Only enable mouse swipe on mobile devices
			if (!enabled || !isMobile || !isDraggingRef.current || !touchStartRef.current) return;

			const deltaX = e.clientX - touchStartRef.current.x;
			const deltaY = e.clientY - touchStartRef.current.y;

			// Only track horizontal swipes
			if (Math.abs(deltaX) > Math.abs(deltaY)) {
				const progress = Math.min(Math.abs(deltaX) / (SWIPE_THRESHOLD * 2), 1);
				setSwipeProgress(progress);

				if (deltaX > 0 && canGoPrevious) {
					setSwipeDirection('right');
				} else if (deltaX < 0 && canGoNext) {
					setSwipeDirection('left');
				}
			}
		},
		[enabled, isMobile, canGoNext, canGoPrevious],
	);

	const handleMouseUp = useCallback(() => {
		// Only enable mouse swipe on mobile devices
		if (!enabled || !isMobile || !isDraggingRef.current) return;

		// Check if swipe was completed
		if (swipeProgress >= 0.5) {
			if (swipeDirection === 'left') {
				goToNext();
			} else if (swipeDirection === 'right') {
				goToPrevious();
			}
		}

		// Reset
		isDraggingRef.current = false;
		touchStartRef.current = null;
		setSwipeProgress(0);
		setTimeout(() => setSwipeDirection(null), 300);
	}, [enabled, isMobile, swipeProgress, swipeDirection, goToNext, goToPrevious]);

	const handleMouseLeave = useCallback(() => {
		if (isDraggingRef.current && isMobile) {
			handleMouseUp();
		}
	}, [handleMouseUp, isMobile]);

	return {
		currentIndex,
		setCurrentIndex,
		goToNext,
		goToPrevious,
		goToFirst,
		goToLast,
		canGoNext,
		canGoPrevious,
		touchHandlers: {
			onTouchStart: handleTouchStart,
			onTouchMove: handleTouchMove,
			onTouchEnd: handleTouchEnd,
			onMouseDown: handleMouseDown,
			onMouseMove: handleMouseMove,
			onMouseUp: handleMouseUp,
			onMouseLeave: handleMouseLeave,
		},
		swipeDirection,
		swipeProgress,
		isMobile,
	};
};
