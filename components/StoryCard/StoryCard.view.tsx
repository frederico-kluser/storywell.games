import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MessageType, ChatMessage, ThemeColors, Language, GridSnapshot } from '../../types';
import { Terminal, Info, Play, Loader2, StopCircle, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Map, Backpack, Swords } from 'lucide-react';
import { generateSpeech } from '../../services/ai/openaiClient';
import { playMP3Audio, TTSVoice } from '../../utils/ai';
import { GridMap } from '../GridMap';

export interface StoryCardProps {
	message: ChatMessage;
	isPlayer: boolean;
	senderName: string;
	avatarBase64?: string;
	avatarUrl?: string;
	locationBackgroundImage?: string; // Location/scene background for cards without character avatar
	apiKey?: string;
	skipAnimation?: boolean;
	onTypingComplete?: () => void;
	selectedVoice?: TTSVoice;
	useTone?: boolean;
	colors: ThemeColors;
	currentIndex: number;
	totalCards: number;
	onPrevious: () => void;
	onNext: () => void;
	canGoPrevious: boolean;
	canGoNext: boolean;
	isActive: boolean;
	t: Record<string, string>;
	language: Language;
	showNextPulse?: boolean; // Show pulse animation on Next button when new content is available
	newCardsCount?: number; // Number of new cards available (displayed next to Next button)
	isMobile?: boolean; // Whether device is mobile (show swipe hint) or desktop (show arrow keys hint)
	// Grid Map props
	gridSnapshots?: GridSnapshot[];
	currentLocationName?: string;
	characterAvatars?: Record<string, string | undefined>;
	hasUnviewedGridChanges?: boolean;
	onMapViewed?: () => void;
	// Actions and character sheet controls (mobile navigation)
	isActionsCollapsed?: boolean;
	setIsActionsCollapsed?: React.Dispatch<React.SetStateAction<boolean>>;
	onShowCharacterSheet?: () => void;
	actionsCount?: number; // Number of available actions (for pulse animation)
}

/**
 * StoryCard component - displays a single message as a book page card.
 * Features character avatar as background, book page styling, and navigation.
 */
export const StoryCardView: React.FC<StoryCardProps> = ({
	message,
	isPlayer,
	senderName,
	avatarBase64,
	avatarUrl,
	locationBackgroundImage,
	apiKey,
	skipAnimation = false,
	onTypingComplete,
	selectedVoice,
	useTone = true,
	colors,
	currentIndex,
	totalCards,
	onPrevious,
	onNext,
	canGoPrevious,
	canGoNext,
	isActive,
	t,
	language = 'en',
	showNextPulse = false,
	newCardsCount = 0,
	isMobile = false,
	gridSnapshots,
	currentLocationName,
	characterAvatars,
	hasUnviewedGridChanges = false,
	onMapViewed,
	isActionsCollapsed = true,
	setIsActionsCollapsed,
	onShowCharacterSheet,
	actionsCount = 0,
}) => {
	const isNarrator = message.senderId === 'GM' && message.type === MessageType.NARRATION;
	const isSystem = message.type === MessageType.SYSTEM || message.senderId === 'SYSTEM';

	// State for Text Reveal Effect (curtain-style reveal from top to bottom)
	const [revealProgress, setRevealProgress] = useState(0); // 0 to 100
	const [isRevealing, setIsRevealing] = useState(true);

	// State for Audio Playback
	const [isPlaying, setIsPlaying] = useState(false);
	const [isLoadingAudio, setIsLoadingAudio] = useState(false);

	// State for Grid Map flip
	const [isMapFlipped, setIsMapFlipped] = useState(false);

	// Get the effective background image from the appropriate grid snapshot
	const currentMessageNumber = message.pageNumber ?? currentIndex + 1;
	const effectiveBackgroundImage = useMemo(() => {
		// Try to get the background from the appropriate grid snapshot
		if (gridSnapshots && gridSnapshots.length > 0) {
			// Find the most recent snapshot at or before this message number
			let relevantSnapshot: GridSnapshot | null = null;
			for (const snapshot of gridSnapshots) {
				if (snapshot.atMessageNumber <= currentMessageNumber) {
					if (!relevantSnapshot || snapshot.atMessageNumber > relevantSnapshot.atMessageNumber) {
						relevantSnapshot = snapshot;
					}
				}
			}
			// If we found a snapshot with a background image, use it
			if (relevantSnapshot?.locationBackgroundImage) {
				return relevantSnapshot.locationBackgroundImage;
			}
		}
		// Fallback to the prop if no snapshot background is available
		return locationBackgroundImage;
	}, [gridSnapshots, currentMessageNumber, locationBackgroundImage]);

	// Manual scroll controls
	const textContainerRef = useRef<HTMLDivElement>(null);
	const textContentRef = useRef<HTMLDivElement>(null);
	const [scrollOffset, setScrollOffset] = useState(0);
	const [scrollMetrics, setScrollMetrics] = useState({ maxOffset: 0, hasOverflow: false });

	// Reset flip state when navigating to a different card
	useEffect(() => {
		setIsMapFlipped(false);
	}, [currentIndex]);

	const SCROLL_STEP = 140;

	useEffect(() => {
		setScrollOffset(0);
	}, [message.id]);

	const updateScrollMetrics = useCallback(() => {
		const container = textContainerRef.current;
		const content = textContentRef.current;
		if (!container || !content) return;

		const maxOffset = Math.max(0, content.scrollHeight - container.clientHeight);
		setScrollMetrics((prev) => {
			const hasOverflow = maxOffset > 0;
			if (prev.maxOffset === maxOffset && prev.hasOverflow === hasOverflow) {
				return prev;
			}
			return { maxOffset, hasOverflow };
		});
		setScrollOffset((prev) => Math.min(prev, maxOffset));
	}, []);

	useEffect(() => {
		updateScrollMetrics();
	}, [revealProgress, updateScrollMetrics]);

	useEffect(() => {
		if (typeof window === 'undefined') return;

		if ('ResizeObserver' in window) {
			const observer = new ResizeObserver(() => updateScrollMetrics());
			if (textContainerRef.current) observer.observe(textContainerRef.current);
			if (textContentRef.current) observer.observe(textContentRef.current);

			return () => observer.disconnect();
		}

		window.addEventListener('resize', updateScrollMetrics);
		return () => window.removeEventListener('resize', updateScrollMetrics);
	}, [updateScrollMetrics]);

	const scrollBy = useCallback(
		(delta: number) => {
			setScrollOffset((prev) => {
				const next = Math.max(0, Math.min(prev + delta, scrollMetrics.maxOffset));
				return next === prev ? prev : next;
			});
		},
		[scrollMetrics.maxOffset],
	);

	const handleScrollUp = useCallback(() => scrollBy(-SCROLL_STEP), [scrollBy]);
	const handleScrollDown = useCallback(() => scrollBy(SCROLL_STEP), [scrollBy]);

	const handleWheelScroll = useCallback(
		(event: React.WheelEvent<HTMLDivElement>) => {
			if (!scrollMetrics.hasOverflow) return;
			event.preventDefault();
			scrollBy(event.deltaY);
		},
		[scrollBy, scrollMetrics.hasOverflow],
	);

	const canScrollUp = scrollOffset > 0;
	const canScrollDown = scrollOffset < scrollMetrics.maxOffset;

	// Check if grid map is available
	const hasGridData = gridSnapshots && gridSnapshots.length > 0;

	// Refs to prevent multiple callback calls
	const hasCalledCompleteRef = useRef(false);
	const onTypingCompleteRef = useRef(onTypingComplete);

	useEffect(() => {
		onTypingCompleteRef.current = onTypingComplete;
	}, [onTypingComplete]);

	useEffect(() => {
		hasCalledCompleteRef.current = false;
	}, [message.id]);

	// Text Reveal Logic (curtain-style reveal from top to bottom)
	useEffect(() => {
		if (skipAnimation || !isActive) {
			setRevealProgress(100);
			setIsRevealing(false);
			if (!hasCalledCompleteRef.current) {
				hasCalledCompleteRef.current = true;
				onTypingCompleteRef.current?.();
			}
			return;
		}

		setRevealProgress(0);
		setIsRevealing(true);

		// Calculate animation duration based on text length
		// Base duration: 800ms, scales up to 2000ms for longer texts
		const textLength = (message.text || '').length;
		const baseDuration = 800;
		const maxDuration = 2000;
		const duration = Math.min(baseDuration + (textLength / 500) * 400, maxDuration);

		const startTime = performance.now();
		let animationFrame: number;

		const animate = (currentTime: number) => {
			const elapsed = currentTime - startTime;
			const progress = Math.min((elapsed / duration) * 100, 100);

			// Easing function for smoother animation (ease-out-cubic)
			const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
			const easedProgress = easeOutCubic(progress / 100) * 100;

			setRevealProgress(easedProgress);

			if (progress < 100) {
				animationFrame = requestAnimationFrame(animate);
			} else {
				setIsRevealing(false);
				if (!hasCalledCompleteRef.current) {
					hasCalledCompleteRef.current = true;
					onTypingCompleteRef.current?.();
				}
			}
		};

		animationFrame = requestAnimationFrame(animate);

		return () => {
			if (animationFrame) {
				cancelAnimationFrame(animationFrame);
			}
		};
	}, [message.text, message.id, skipAnimation, isActive]);

	// Get avatar source
	const getAvatarSrc = () => {
		if (avatarBase64) {
			return avatarBase64.startsWith('data:') ? avatarBase64 : `data:image/png;base64,${avatarBase64}`;
		}
		if (avatarUrl) return avatarUrl;
		return null;
	};

	const avatarSrc = getAvatarSrc();

	// Audio Playback Handler
	const handlePlayAudio = async () => {
		if (!apiKey || isPlaying || isLoadingAudio) return;

		setIsLoadingAudio(true);
		try {
			let voiceType: 'narrator' | 'player' | 'npc' = 'npc';
			if (isNarrator) voiceType = 'narrator';
			if (isPlayer) voiceType = 'player';

			const base64Audio = await generateSpeech(
				apiKey,
				message.text,
				voiceType,
				message.voiceTone,
				selectedVoice,
				useTone,
				language,
			);

			if (base64Audio) {
				setIsLoadingAudio(false);
				setIsPlaying(true);
				await playMP3Audio(base64Audio);
				setIsPlaying(false);
			} else {
				setIsLoadingAudio(false);
			}
		} catch (e) {
			console.error('Audio Playback Error', e);
			setIsLoadingAudio(false);
			setIsPlaying(false);
		}
	};

	// Determine card styling based on message type
	const getCardStyle = () => {
		// When there's an avatar, use it as background with overlay
		if (avatarSrc && !isNarrator && !isSystem) {
			return {
				backgroundColor: colors.background,
				borderColor: colors.border,
				color: colors.text,
				backgroundImage: `linear-gradient(to bottom, ${colors.background}ee 0%, ${colors.background}dd 50%, ${colors.background}ee 100%), url(${avatarSrc})`,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
			};
		}

		// When there's no avatar but there's a location background, use it
		if (effectiveBackgroundImage) {
			return {
				backgroundColor: colors.background,
				borderColor: colors.border,
				color: colors.text,
				backgroundImage: `linear-gradient(to bottom, ${colors.background}dd 0%, ${colors.background}cc 50%, ${colors.background}dd 100%), url(${effectiveBackgroundImage})`,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
			};
		}

		// Fallback: solid background color
		return {
			backgroundColor: colors.background,
			borderColor: colors.border,
			color: colors.text,
		};
	};

	// Get speaker label style
	const getSpeakerStyle = () => {
		if (isPlayer) {
			return {
				backgroundColor: colors.buttonPrimary,
				color: colors.buttonPrimaryText,
			};
		}
		if (isNarrator) {
			return {
				backgroundColor: colors.backgroundAccent,
				color: colors.textSecondary,
				border: `1px solid ${colors.border}`,
			};
		}
		if (isSystem) {
			return {
				backgroundColor: '#3b82f620',
				color: '#3b82f6',
				border: '1px solid #3b82f6',
			};
		}
		return {
			backgroundColor: colors.backgroundSecondary,
			color: colors.text,
			border: `1px solid ${colors.border}`,
		};
	};

	// Get speaker label text
	const getSpeakerLabel = () => {
		if (isSystem) return 'SYSTEM';
		if (isNarrator) return 'NARRATOR';
		if (isPlayer) return 'YOU';
		return senderName.toUpperCase();
	};

	// Play Button Component
	const PlayButton = () => (
		<button
			onClick={handlePlayAudio}
			disabled={isLoadingAudio || isPlaying || isRevealing || !apiKey}
			className="p-2 rounded-full transition-all hover:scale-110 disabled:opacity-30 disabled:hover:scale-100"
			style={{
				backgroundColor: colors.backgroundSecondary,
				border: `1px solid ${colors.border}`,
				color: colors.text,
			}}
			title="Read Aloud"
		>
			{isLoadingAudio ? (
				<Loader2 className="w-5 h-5 animate-spin" />
			) : isPlaying ? (
				<StopCircle className="w-5 h-5 animate-pulse text-green-500" />
			) : (
				<Play className="w-5 h-5" />
			)}
		</button>
	);

	return (
		<div className="w-full h-full flex flex-col max-w-full overflow-hidden">
			{/* Card Container with 3D Flip - Book Page Style */}
			<div
				className="flex-1 relative mx-auto w-full max-w-full md:max-w-4xl px-0 md:px-2"
				style={{ perspective: '1000px' }}
			>
				{/* Flip Container */}
				<div
					className="w-full h-full relative"
					style={{
						transformStyle: 'preserve-3d',
						transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
						transform: isMapFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
					}}
				>
					{/* Front Face - Story Card */}
					<div
						className="absolute inset-0 rounded-sm overflow-hidden transition-all duration-300"
						style={{
							...getCardStyle(),
							boxShadow: `
								inset 0 0 30px ${colors.shadow}20,
								8px 8px 0px ${colors.shadow},
								-2px 0 10px ${colors.shadow}30
							`,
							border: `3px solid ${colors.borderStrong}`,
							backfaceVisibility: 'hidden',
						}}
					>
						{/* Book Page Texture Overlay */}
						<div
							className="absolute inset-0 pointer-events-none opacity-10"
							style={{
								background: `
									linear-gradient(90deg, transparent 0%, ${colors.text}05 2%, transparent 3%),
									linear-gradient(180deg, ${colors.text}03 0%, transparent 100%)
								`,
							}}
						/>

						{/* Book Page Fold Effect */}
						<div
							className="absolute top-0 right-0 w-8 h-8 pointer-events-none"
							style={{
								background: `linear-gradient(135deg, ${colors.backgroundSecondary} 50%, ${colors.border} 50%)`,
								boxShadow: `-2px 2px 5px ${colors.shadow}30`,
							}}
						/>

						{/* Content Area */}
						<div className="relative h-full flex flex-col p-3 md:p-8">
							{/* Header - Speaker & Controls */}
							<div className="flex items-center justify-between mb-4 md:mb-6">
								<div className="flex items-center gap-3">
									{/* Avatar thumbnail (only for dialogue) */}
									{avatarSrc && !isNarrator && !isSystem && (
										<div
											className="w-12 h-12 md:w-16 md:h-16 rounded-sm overflow-hidden flex-shrink-0"
											style={{
												border: `2px solid ${colors.borderStrong}`,
												boxShadow: `3px 3px 0px ${colors.shadow}`,
											}}
										>
											<img src={avatarSrc} alt={senderName} className="w-full h-full object-cover" />
										</div>
									)}

									{/* Narrator/System Icon */}
									{(isNarrator || isSystem) && (
										<div
											className="w-12 h-12 md:w-16 md:h-16 rounded-sm flex items-center justify-center flex-shrink-0"
											style={{
												backgroundColor: colors.backgroundSecondary,
												border: `2px solid ${colors.border}`,
											}}
										>
											{isSystem ? (
												<Info className="w-6 h-6 md:w-8 md:h-8" style={{ color: '#3b82f6' }} />
											) : (
												<Terminal className="w-6 h-6 md:w-8 md:h-8" style={{ color: colors.textSecondary }} />
											)}
										</div>
									)}

									{/* Speaker Label */}
									<div
										className="px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-bold uppercase tracking-widest rounded-sm"
										style={getSpeakerStyle()}
									>
										{getSpeakerLabel()}
									</div>
								</div>

								{/* Audio Control */}
								<PlayButton />
							</div>

							{/* Message Text - Book Typography with Reveal Effect */}
					<div
						className="flex-1 relative overflow-hidden min-h-0"
						ref={textContainerRef}
						onWheel={handleWheelScroll}
					>
						<div
							ref={textContentRef}
							className={`leading-relaxed whitespace-pre-wrap font-serif pr-4 md:pr-8 ${
								isNarrator ? 'text-lg md:text-2xl italic text-center' : 'text-base md:text-xl'
							}`}
							style={{
								color: colors.text,
								transform: `translateY(-${scrollOffset}px)`,
								transition: 'transform 120ms ease-out',
								// Curtain reveal effect: clip from bottom, revealing from top to bottom
								clipPath: `inset(0 0 ${100 - revealProgress}% 0)`,
							}}
						>
							{isNarrator && (
								<span
									className="text-3xl md:text-4xl leading-none align-text-top mr-2"
									style={{ color: colors.textSecondary }}
								>
									&ldquo;
								</span>
							)}
							{message.text || ''}
							{isNarrator && !isRevealing && (
								<span
									className="text-3xl md:text-4xl leading-none align-text-bottom ml-2"
									style={{ color: colors.textSecondary }}
								>
									&rdquo;
								</span>
							)}
						</div>

						{scrollMetrics.hasOverflow && (
							<div className="absolute top-2 right-2 flex flex-col gap-2">
								<button
									type="button"
									onClick={handleScrollUp}
									disabled={!canScrollUp}
									className="p-1 rounded-sm border"
									style={{
										backgroundColor: colors.backgroundSecondary,
										color: colors.text,
										borderColor: colors.border,
										opacity: canScrollUp ? 1 : 0.4,
									}}
									aria-label="Scroll up"
								>
									<ChevronUp className="w-4 h-4" />
								</button>
								<button
									type="button"
									onClick={handleScrollDown}
									disabled={!canScrollDown}
									className="p-1 rounded-sm border"
									style={{
										backgroundColor: colors.backgroundSecondary,
										color: colors.text,
										borderColor: colors.border,
										opacity: canScrollDown ? 1 : 0.4,
									}}
									aria-label="Scroll down"
								>
									<ChevronDown className="w-4 h-4" />
								</button>
							</div>
						)}
					</div>
					{/* Footer - Page Number & Navigation Hint */}
							<div
								className="mt-4 md:mt-6 pt-4 flex items-center justify-between"
								style={{ borderTop: `1px solid ${colors.border}` }}
							>
								<div className="text-xs font-mono uppercase tracking-wider" style={{ color: colors.textSecondary }}>
									Page {(message.pageNumber ?? currentIndex + 1)} of {totalCards}
								</div>
								<div className="text-xs font-mono hidden md:block" style={{ color: colors.textSecondary }}>
									Use arrow keys or swipe to navigate
								</div>
							</div>
						</div>
					</div>

					{/* Back Face - Grid Map */}
					<div
						className="absolute inset-0 rounded-sm overflow-hidden"
						style={{
							backgroundColor: colors.background,
							boxShadow: `
								inset 0 0 30px ${colors.shadow}20,
								8px 8px 0px ${colors.shadow},
								-2px 0 10px ${colors.shadow}30
							`,
							border: `3px solid ${colors.borderStrong}`,
							backfaceVisibility: 'hidden',
							transform: 'rotateY(180deg)',
						}}
					>
						{hasGridData && (
							<GridMap
								gridSnapshots={gridSnapshots!}
								currentMessageNumber={currentMessageNumber}
								colors={colors}
								isFlipped={isMapFlipped}
								onToggleFlip={() => setIsMapFlipped(false)}
								locationName={currentLocationName}
								locationBackgroundImage={effectiveBackgroundImage}
								characterAvatars={characterAvatars}
								t={t}
							/>
						)}
						{!hasGridData && (
							<div className="w-full h-full flex items-center justify-center">
								<p style={{ color: colors.textSecondary }}>{t.noMapData || 'No map data available'}</p>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Navigation Buttons - Visible on Mobile & Desktop */}
			<div className="flex items-center justify-between gap-2 mt-2 md:mt-4 px-1 md:px-4 w-full max-w-full">
				<button
					onClick={onPrevious}
					disabled={!canGoPrevious}
					className="flex items-center gap-1 px-2 py-2 md:px-6 md:py-3 font-bold uppercase text-xs md:text-sm transition-all hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 flex-shrink-0"
					style={{
						backgroundColor: colors.buttonSecondary,
						color: colors.buttonSecondaryText,
						border: `2px solid ${colors.border}`,
						boxShadow: canGoPrevious ? `3px 3px 0px ${colors.shadow}` : 'none',
					}}
				>
					<ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
					<span className="hidden md:inline">{t.back || 'Previous'}</span>
				</button>

				{/* Map Button */}
				{hasGridData && (
					<button
						onClick={() => {
							const newFlipState = !isMapFlipped;
							setIsMapFlipped(newFlipState);
							// Mark grid as viewed when opening the map
							if (newFlipState && onMapViewed) {
								onMapViewed();
							}
						}}
						className={`flex items-center gap-1 px-2 py-2 md:px-4 md:py-3 font-bold uppercase text-xs md:text-sm transition-all hover:scale-105 flex-shrink-0 ${
							hasUnviewedGridChanges && !isMapFlipped ? 'animate-pulse-glow' : ''
						}`}
						style={{
							backgroundColor: isMapFlipped || hasUnviewedGridChanges ? colors.buttonPrimary : colors.buttonSecondary,
							color: isMapFlipped || hasUnviewedGridChanges ? colors.buttonPrimaryText : colors.buttonSecondaryText,
							border: `2px solid ${colors.border}`,
							boxShadow: `3px 3px 0px ${colors.shadow}`,
						}}
						title={t.viewMap || 'View Map'}
					>
						<Map className="w-4 h-4 md:w-5 md:h-5" />
						<span className="hidden md:inline">{t.map || 'Map'}</span>
					</button>
				)}

				{/* Actions Toggle Button - Mobile only */}
				{setIsActionsCollapsed && (
					<button
						onClick={() => setIsActionsCollapsed(!isActionsCollapsed)}
						className={`md:hidden flex items-center gap-1 px-2 py-2 font-bold uppercase text-xs transition-all hover:scale-105 flex-shrink-0 ${
							isActionsCollapsed && actionsCount > 0 ? 'animate-pulse-glow' : ''
						}`}
						style={{
							backgroundColor: isActionsCollapsed ? colors.buttonPrimary : colors.buttonSecondary,
							color: isActionsCollapsed ? colors.buttonPrimaryText : colors.buttonSecondaryText,
							border: `2px solid ${isActionsCollapsed ? colors.buttonPrimary : colors.border}`,
							boxShadow: `3px 3px 0px ${colors.shadow}`,
						}}
						title={t.actions || 'Actions'}
					>
						<Swords className="w-4 h-4" />
					</button>
				)}

				{/* Character Sheet Button */}
				{onShowCharacterSheet && (
					<button
						onClick={onShowCharacterSheet}
						className="flex items-center gap-1 px-2 py-2 md:px-4 md:py-3 font-bold uppercase text-xs md:text-sm transition-all hover:scale-105 flex-shrink-0"
						style={{
							backgroundColor: colors.buttonSecondary,
							color: colors.buttonSecondaryText,
							border: `2px solid ${colors.border}`,
							boxShadow: `3px 3px 0px ${colors.shadow}`,
						}}
						title={t.characterSheet || 'Character Sheet'}
					>
						<Backpack className="w-4 h-4 md:w-5 md:h-5" />
						<span className="hidden md:inline">{t.inventory || 'Inventory'}</span>
					</button>
				)}

				{/* Position Indicator - Progress Bar Style */}
				<div className="flex items-center gap-1 md:gap-2 flex-1 min-w-0 max-w-[100px] md:max-w-[180px] mx-1 md:mx-2">
					{/* Progress Bar Container */}
					<div
						className="flex-1 h-1.5 md:h-2 rounded-full overflow-hidden relative min-w-0"
						style={{ backgroundColor: colors.border }}
					>
						{/* Progress Fill */}
						<div
							className="h-full rounded-full transition-all duration-300 ease-out"
							style={{
								backgroundColor: colors.buttonPrimary,
								width: totalCards > 1 ? `${((currentIndex + 1) / totalCards) * 100}%` : '100%',
							}}
						/>
					</div>
					{/* Numeric Indicator */}
					<span
						className="text-[10px] md:text-xs font-mono font-bold whitespace-nowrap flex-shrink-0"
						style={{ color: colors.textSecondary }}
					>
						{currentIndex + 1}/{totalCards}
					</span>
				</div>

				<button
					onClick={onNext}
					disabled={!canGoNext}
					className={`flex items-center gap-1 px-2 py-2 md:px-6 md:py-3 font-bold uppercase text-xs md:text-sm transition-all hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 flex-shrink-0 ${
						showNextPulse && canGoNext ? 'animate-pulse-glow' : ''
					}`}
					style={{
						backgroundColor: showNextPulse && canGoNext ? colors.buttonPrimary : colors.buttonSecondary,
						color: showNextPulse && canGoNext ? colors.buttonPrimaryText : colors.buttonSecondaryText,
						border: `2px solid ${showNextPulse && canGoNext ? colors.buttonPrimary : colors.border}`,
						boxShadow: canGoNext ? `3px 3px 0px ${colors.shadow}` : 'none',
					}}
				>
					<span className="hidden md:inline">
						{t.next || 'Next'}
						{newCardsCount > 0 && ` (${newCardsCount} ${t.newCards})`}
					</span>
					<ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
				</button>
			</div>
		</div>
	);
};
