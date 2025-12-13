import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supportedLanguages } from './i18n/locales';
import { StoryCreator } from './components/StoryCreator';
import { StoryCard } from './components/StoryCard';
import { ActionInput } from './components/ActionInput';
import { ErrorModal } from './components/ErrorModal';
import { VoiceSettings } from './components/VoiceSettings';
import { ThemeColorsModal } from './components/ThemeColorsModal';
import { LandingPage } from './components/LandingPage';
import { CharacterZoomModal } from './components/CharacterZoomModal';
import { StoryCreationLoader } from './components/StoryCreationLoader/StoryCreationLoader';
import { ProcessingIndicator } from './components/ProcessingIndicator/ProcessingIndicator';
import { SettingsModal } from './components/SettingsModal';
import { NarrativeStyleModal } from './components/NarrativeStyleModal';
import { useGameEngine } from './hooks/useGameEngine';
import { dbService } from './services/db';
import { useMessageQueue } from './hooks/useMessageQueue';
import { useCardNavigation } from './hooks/useCardNavigation';
import { useThemeColors } from './hooks/useThemeColors';
import { Item, NarrativeStyleMode } from './types';
import {
	Plus,
	Terminal,
	Settings,
	Menu,
	MapPin,
	Users,
	Trash2,
	Backpack,
	X,
	User,
	Download,
	Upload,
	Volume2,
	Palette,
	ImageIcon,
} from 'lucide-react';
import { version } from './package.json';

const CARD_INDEX_STORAGE_KEY = 'infinityStories.cardIndex';
type CardIndexMap = Record<string, number>;
const isBrowser = typeof window !== 'undefined';

const readCardIndexMap = (): CardIndexMap => {
	if (!isBrowser) {
		return {};
	}

	try {
		const raw = window.localStorage.getItem(CARD_INDEX_STORAGE_KEY);
		if (!raw) {
			return {};
		}

		const parsed = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null) {
			return {};
		}

		return parsed as CardIndexMap;
	} catch (error) {
		console.warn('⚠️ [card-navigation] Failed to read card index cache', { error });
		return {};
	}
};

const getStoredCardIndex = (storyId: string): number | null => {
	const cache = readCardIndexMap();
	const value = cache[storyId];

	if (typeof value === 'number' && value >= 0) {
		return value;
	}

	return null;
};

const persistStoredCardIndex = (storyId: string, index: number): void => {
	if (!isBrowser) {
		return;
	}

	try {
		const cache = readCardIndexMap();
		cache[storyId] = index;
		window.localStorage.setItem(CARD_INDEX_STORAGE_KEY, JSON.stringify(cache));
	} catch (error) {
		console.warn('⚠️ [card-navigation] Failed to persist card index', { storyId, index, error });
	}
};

/**
 * Main Application View.
 * Connects the Logic (useGameEngine) to the UI.
 */
const App: React.FC = () => {
	const {
		apiKey,
		setApiKey,
		stories,
		currentStoryId,
		setCurrentStoryId,
		language,
		setLanguage,
		inputValue,
		setInputValue,
		isProcessing,
		isGenerating,
		isUpdatingContext,
		showApiKeyModal,
		setShowApiKeyModal,
		keyError,
		validating,
		t,
		showErrorModal,
		errorType,
		errorMessage,
		closeErrorModal,
		handleSendMessage,
		handleCreateStory,
		handleDeleteStory,
		handleSaveApiKey,
		handleLogout,
		handleVoiceTranscription,
		handleExportJourney,
		handleImportJourney,
		activeStory,
		player,
		selectedVoice,
		setSelectedVoice,
		useTone,
		setUseTone,
		regenerateThemeColors,
		isGeneratingColors,
		isGeneratingBackground,
		backgroundLocationName,
		creationPhase,
		processingPhase,
		markCardAsViewed,
		updateNarrativeStyle,
	} = useGameEngine();

	const { colors } = useThemeColors();
	const storyLanguage = activeStory?.config?.language || language;
	const narrativeModeForModal: NarrativeStyleMode =
		activeStory?.narrativeConfig?.narrativeStyleMode || activeStory?.config?.narrativeStyleMode || 'auto';
	const narrativeStylePreset =
		activeStory?.narrativeConfig?.customNarrativeStyleRaw ??
		(activeStory?.config?.narrativeStyleMode === 'custom'
			? activeStory?.config?.customNarrativeStyleRaw ?? activeStory?.config?.customNarrativeStyle
			: undefined) ??
		'';
	const narrativeGenre = activeStory?.narrativeConfig?.genre || activeStory?.config?.genre;

	const [showWizard, setShowWizard] = useState(false);
	const [showStatus, setShowStatus] = useState(false);
	const [showVoiceSettings, setShowVoiceSettings] = useState(false);
	const [showThemeColors, setShowThemeColors] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [showNarrativeStyleModal, setShowNarrativeStyleModal] = useState(false);
	const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
	const [zoomModalData, setZoomModalData] = useState<{ imageSrc: string; name: string } | null>(null);

	// File input ref for import
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Use message timeline to keep cards ordered
	const { visibleMessages } = useMessageQueue(activeStory?.messages || []);
	const totalCards = visibleMessages.length;

	// State for pulse animation on Next button (shows when new content is available)
	const [showNextPulse, setShowNextPulse] = useState(false);

	// Callback to stop pulse animation and decrement new cards count when user navigates
	const handleNavigate = useCallback(() => {
		setShowNextPulse(false);
		// Decrement new cards count when navigating forward
		setNewCardsCount((prev) => Math.max(0, prev - 1));
	}, []);

	// Card navigation for keyboard and swipe
	const {
		currentIndex: currentCardIndex,
		setCurrentIndex: setCurrentCardIndex,
		goToNext,
		goToPrevious,
		goToLast,
		canGoNext,
		canGoPrevious,
		touchHandlers,
		swipeDirection,
		isMobile,
	} = useCardNavigation({
		totalCards,
		enabled: !!currentStoryId && !!activeStory,
		onNavigate: handleNavigate,
	});

	const pendingCardIndexRef = useRef<number | null>(null);
	const previousLengthRef = useRef(0);
	const userJustSentRef = useRef(false);
	const [newCardsCount, setNewCardsCount] = useState(0);

	useEffect(() => {
		if (!activeStory) {
			setShowNarrativeStyleModal(false);
		}
	}, [activeStory]);

	useEffect(() => {
		if (!currentStoryId) {
			pendingCardIndexRef.current = null;
			setCurrentCardIndex(0);
			return;
		}

		const storedIndex = getStoredCardIndex(currentStoryId);
		pendingCardIndexRef.current = storedIndex ?? 0;
		setCurrentCardIndex(0);
	}, [currentStoryId, setCurrentCardIndex]);

	useEffect(() => {
		if (!currentStoryId) {
			return;
		}

		if (pendingCardIndexRef.current === null) {
			return;
		}

		if (totalCards === 0) {
			return;
		}

		const targetIndex = Math.min(pendingCardIndexRef.current, totalCards - 1);
		setCurrentCardIndex(targetIndex);
		pendingCardIndexRef.current = null;
	}, [currentStoryId, totalCards, setCurrentCardIndex]);

	useEffect(() => {
		if (!currentStoryId) {
			return;
		}

		if (totalCards === 0) {
			return;
		}

		persistStoredCardIndex(currentStoryId, currentCardIndex);
	}, [currentStoryId, currentCardIndex, totalCards]);

	useEffect(() => {
		const previousLength = previousLengthRef.current;
		const newCardsAdded = totalCards - previousLength;

		if (pendingCardIndexRef.current === null && newCardsAdded > 0) {
			// Only auto-advance when user just sent a message (to show their message)
			if (userJustSentRef.current) {
				// Advance only by 1 to show the user's message, not all responses
				setCurrentCardIndex(Math.min(currentCardIndex + 1, totalCards - 1));
				userJustSentRef.current = false;
				// Update new cards count (responses that came after user's message)
				const remainingNewCards = totalCards - 1 - (currentCardIndex + 1);
				if (remainingNewCards > 0) {
					setNewCardsCount(remainingNewCards);
					setShowNextPulse(true); // Show pulse animation when new content is available
				}
			} else if (previousLength > 0) {
				// AI responses arrived - don't auto-advance, just update the count
				const cardsAhead = totalCards - 1 - currentCardIndex;
				if (cardsAhead > 0) {
					setNewCardsCount(cardsAhead);
					setShowNextPulse(true); // Show pulse animation when new content is available
				}
			} else {
				// First load - go to last card
				setCurrentCardIndex(Math.max(0, totalCards - 1));
			}
		}
		previousLengthRef.current = totalCards;
	}, [totalCards, currentCardIndex, setCurrentCardIndex]);

	const isOnLastCard = totalCards === 0 || currentCardIndex >= totalCards - 1;

	// Reset new cards count and pulse animation when user reaches the last card
	useEffect(() => {
		if (isOnLastCard) {
			if (newCardsCount > 0) {
				setNewCardsCount(0);
			}
			if (showNextPulse) {
				setShowNextPulse(false);
			}
		}
	}, [isOnLastCard, newCardsCount, showNextPulse]);

	// Wrapper for handleSendMessage to track user-initiated messages
	const handleSendMessageWithTracking = async (message: string) => {
		userJustSentRef.current = true;
		setNewCardsCount(0); // Reset count when user sends a new message
		return handleSendMessage(message);
	};

	// Handle file import
	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const result = await handleImportJourney(file);

		if (result.success) {
			setImportMessage({ type: 'success', text: t.importSuccess });
		} else {
			setImportMessage({
				type: 'error',
				text: result.error === 'version' ? t.importErrorVersion : t.importError,
			});
		}

		// Clear the input
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}

		// Auto-hide message after 3 seconds
		setTimeout(() => setImportMessage(null), 3000);
	};

	// --- Landing Page View (API Key) ---
	if (showApiKeyModal) {
		return (
			<LandingPage
				language={language}
				setLanguage={setLanguage}
				apiKey={apiKey}
				setApiKey={setApiKey}
				onValidateKey={() => handleSaveApiKey(apiKey)}
				validating={validating}
				keyError={keyError}
				t={t}
			/>
		);
	}

	// --- Main Layout ---
	return (
		<div
			className="flex h-screen w-screen max-w-full overflow-x-hidden overflow-y-hidden font-mono"
			style={{ backgroundColor: colors.background, color: colors.text }}
		>
			{/* Sidebar */}
			<div
				className={`${currentStoryId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80`}
				style={{ backgroundColor: colors.backgroundSecondary, borderRight: `2px solid ${colors.border}` }}
			>
				<div
					className="p-4 flex items-center justify-between"
					style={{ borderBottom: `2px solid ${colors.border}`, backgroundColor: colors.backgroundAccent }}
				>
					<h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: colors.text }}>
						<Terminal className="w-6 h-6" />
						{t.appTitle}
					</h1>
					<div className="flex items-center gap-2">
						<button
							onClick={() => setShowVoiceSettings(true)}
							className="hover:opacity-70 transition-opacity"
							style={{ color: colors.textSecondary }}
							title="Voice Settings"
						>
							<Volume2 className="w-5 h-5" />
						</button>
						<button
							onClick={() => setShowSettings(true)}
							className="hover:opacity-70 transition-opacity"
							style={{ color: colors.textSecondary }}
							title={t.settings}
							aria-label={t.settings}
						>
							<Settings className="w-5 h-5" />
						</button>
					</div>
				</div>

				<div
					className="px-4 py-3 flex gap-2 justify-center"
					style={{ backgroundColor: colors.backgroundAccent, borderBottom: `1px solid ${colors.border}` }}
				>
					{supportedLanguages.map((lang) => (
						<button
							key={lang}
							onClick={() => setLanguage(lang)}
							className="flex-1 py-1 text-xs font-bold uppercase transition-colors border-2"
							style={{
								backgroundColor: language === lang ? colors.buttonPrimary : colors.backgroundSecondary,
								color: language === lang ? colors.buttonPrimaryText : colors.textSecondary,
								borderColor: language === lang ? colors.buttonPrimary : colors.border,
							}}
						>
							{lang}
						</button>
					))}
				</div>

				<div className="flex-1 overflow-y-auto p-4 space-y-4">
					{/* Hidden file input for import */}
					<input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

					<button
						onClick={() => setShowWizard(true)}
						className="w-full py-6 border-2 border-dashed flex flex-col items-center justify-center transition-all group hover:shadow-md"
						style={{
							backgroundColor: colors.backgroundAccent,
							color: colors.textSecondary,
							borderColor: colors.border,
						}}
					>
						<Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
						<span className="font-bold tracking-widest">{t.newStory}</span>
					</button>

					<button
						onClick={() => fileInputRef.current?.click()}
						className="w-full py-4 border-2 flex items-center justify-center gap-2 transition-all hover:shadow-md"
						style={{
							backgroundColor: colors.backgroundSecondary,
							color: colors.textSecondary,
							borderColor: colors.border,
						}}
					>
						<Upload className="w-5 h-5" />
						<span className="font-bold tracking-widest">{t.loadJourney}</span>
					</button>

					{/* Import message toast */}
					{importMessage && (
						<div
							className="p-3 text-sm font-bold text-center border-2"
							style={{
								backgroundColor: importMessage.type === 'success' ? `${colors.success}20` : `${colors.danger}20`,
								borderColor: importMessage.type === 'success' ? colors.success : colors.danger,
								color: importMessage.type === 'success' ? colors.success : colors.danger,
							}}
						>
							{importMessage.text}
						</div>
					)}

					{stories.map((story) => (
						<div
							key={story.id}
							onClick={() => setCurrentStoryId(story.id)}
							className="p-4 cursor-pointer transition-all border-2 relative group"
							style={{
								backgroundColor: currentStoryId === story.id ? colors.buttonPrimary : colors.backgroundSecondary,
								borderColor: currentStoryId === story.id ? colors.buttonPrimary : colors.border,
								color: currentStoryId === story.id ? colors.buttonPrimaryText : colors.text,
								boxShadow: `4px 4px 0px ${colors.border}`,
							}}
						>
							<h3 className="font-bold truncate uppercase text-lg">{story.title}</h3>
							<div className="text-xs opacity-70 mt-2 flex justify-between font-mono">
								<span>
									{t.turn}: {story.turnCount}
								</span>
								<span>{new Date(story.lastPlayed).toLocaleDateString()}</span>
							</div>
							<button
								onClick={(e) => handleDeleteStory(e, story.id)}
								className="absolute right-2 top-2 p-2 transition-colors rounded-full hover:opacity-70"
								style={{ color: currentStoryId === story.id ? colors.buttonPrimaryText : colors.textSecondary }}
								title="Delete Save"
							>
								<Trash2 className="w-4 h-4" />
							</button>
						</div>
					))}
				</div>

				<div
					className="p-4 flex items-center justify-end"
					style={{ borderTop: `2px solid ${colors.border}`, backgroundColor: colors.backgroundAccent }}
				>
					<span className="text-[10px] font-mono" style={{ color: colors.textSecondary }}>
						v{version}
					</span>
				</div>
			</div>

			{/* Main Game Area */}
			{currentStoryId && activeStory ? (
				<div
					className="flex-1 flex flex-col h-full relative min-w-0 overflow-hidden"
					style={{ backgroundColor: colors.background }}
				>
					<div
						className="h-auto min-h-14 md:h-16 flex items-center justify-between px-2 md:px-6 py-2 md:py-0 z-10 shadow-sm sticky top-0 flex-shrink-0 w-full max-w-full overflow-hidden"
						style={{ backgroundColor: colors.backgroundSecondary, borderBottom: `2px solid ${colors.border}` }}
					>
						<div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
							<button
								onClick={() => setCurrentStoryId(null)}
								className="md:hidden flex-shrink-0 hover:opacity-70"
								style={{ color: colors.textSecondary }}
							>
								<Menu />
							</button>
							<div className="min-w-0 flex-1">
								<h2
									className="font-black text-lg md:text-2xl leading-none uppercase tracking-wide truncate"
									style={{ color: colors.text }}
								>
									{activeStory.title}
								</h2>
								<div
									className="flex items-center gap-2 md:gap-4 text-[10px] md:text-xs font-bold mt-1 flex-wrap"
									style={{ color: colors.textSecondary }}
								>
									<span className="flex items-center gap-1 truncate max-w-[120px] md:max-w-none">
										<MapPin className="w-3 h-3 flex-shrink-0" />{' '}
										<span className="truncate">
											{activeStory.locations[activeStory.currentLocationId]?.name || 'UNKNOWN_SECTOR'}
										</span>
									</span>
									<span className="flex items-center gap-1">
										<Users className="w-3 h-3 flex-shrink-0" />{' '}
										{Object.keys(activeStory.characters).filter(
											(k) => activeStory.characters[k].locationId === activeStory.currentLocationId,
										).length - 1}
									</span>
								</div>
							</div>
						</div>

						<div className="flex items-center gap-1 md:gap-3 flex-shrink-0 ml-1">
							<button
								onClick={handleExportJourney}
								className="p-1.5 md:p-2 border-2 transition-colors hover:opacity-80"
								style={{
									backgroundColor: colors.buttonSecondary,
									borderColor: colors.border,
									color: colors.buttonSecondaryText,
								}}
								title={t.exportJourney}
							>
								<Download className="w-4 h-4 md:w-5 md:h-5" />
							</button>
							<button
								onClick={() => setShowThemeColors(true)}
								className="p-1.5 md:p-2 border-2 transition-colors hover:opacity-80"
								style={{
									backgroundColor: colors.buttonSecondary,
									borderColor: colors.border,
									color: colors.buttonSecondaryText,
								}}
								title="Theme Colors"
								disabled={isGeneratingColors}
							>
								<Palette className={`w-4 h-4 md:w-5 md:h-5 ${isGeneratingColors ? 'animate-spin' : ''}`} />
							</button>
							<button
								onClick={() => setShowStatus(true)}
								className="p-1.5 md:p-2 border-2 transition-colors hover:opacity-80"
								style={{
									backgroundColor: colors.buttonSecondary,
									borderColor: colors.border,
									color: colors.buttonSecondaryText,
								}}
							>
								<Backpack className="w-4 h-4 md:w-5 md:h-5" />
							</button>
							<div
								className="hidden md:block text-xs px-3 py-1 border font-bold uppercase font-mono rounded-full"
								style={{
									backgroundColor: colors.backgroundAccent,
									color: colors.textSecondary,
									borderColor: colors.border,
								}}
							>
								{activeStory.config.language || 'en'}
							</div>
						</div>
					</div>

					{/* Card-based Story View */}
					<div
						className="flex-1 relative flex flex-col overflow-hidden select-none w-full max-w-full min-h-0"
						style={{ backgroundColor: colors.backgroundAccent }}
						{...touchHandlers}
					>
						{/* Location Background Image */}
						{activeStory.locations[activeStory.currentLocationId]?.backgroundImage && (
							<div
								className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
								style={{
									backgroundImage: `url(${activeStory.locations[activeStory.currentLocationId].backgroundImage})`,
								}}
							/>
						)}
						{/* Color Overlay with Transparency */}
						<div
							className="absolute inset-0 transition-opacity duration-500"
							style={{
								backgroundColor: colors.backgroundAccent,
								opacity: activeStory.locations[activeStory.currentLocationId]?.backgroundImage ? 0.85 : 1,
							}}
						/>
						{/* Background Generation Indicator */}
						{isGeneratingBackground && !activeStory.locations[activeStory.currentLocationId]?.backgroundImage && (
							<div
								className="absolute top-4 right-4 z-20 flex items-center gap-2 px-4 py-3 shadow-md border-2"
								style={{
									backgroundColor: colors.backgroundSecondary,
									borderColor: colors.border,
									boxShadow: `4px 4px 0px ${colors.shadow}`,
								}}
							>
								<div className="relative">
									<ImageIcon className="w-5 h-5 animate-pulse" style={{ color: colors.textSecondary }} />
									<div
										className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin"
										style={{ borderColor: `${colors.border}`, borderTopColor: 'transparent' }}
									/>
								</div>
								<div className="flex flex-col">
									<span className="text-xs font-bold uppercase" style={{ color: colors.text }}>
										Generating scene
									</span>
									{backgroundLocationName && (
										<span className="text-[10px] truncate max-w-[150px]" style={{ color: colors.textSecondary }}>
											{backgroundLocationName}
										</span>
									)}
								</div>
							</div>
						)}

						{/* Story Cards Container */}
						<div className="relative z-10 flex-1 flex flex-col p-1 md:p-4 w-full max-w-full overflow-hidden min-h-0">
							{totalCards > 0 ? (
								(() => {
									const msg = visibleMessages[currentCardIndex];
									if (!msg) return null;

									const sender = activeStory.characters[msg.senderId];
									const pageIndex =
										typeof msg.pageNumber === 'number' ? msg.pageNumber - 1 : Math.max(0, visibleMessages.indexOf(msg));
									const isActiveCard = pageIndex === currentCardIndex;
									// Skip animation if card is not active OR if it was previously viewed
									const wasViewed = activeStory.viewedCards?.includes(msg.id) ?? false;
									const shouldSkipAnimation = !isActiveCard || wasViewed;

									let senderName = '';
									if (sender) {
										senderName = sender.name;
									} else if (msg.senderId === 'GM') {
										senderName = '';
									} else if (msg.senderId === 'SYSTEM') {
										senderName = 'SYSTEM';
									} else {
										senderName = msg.senderId;
									}

									return (
										<div
											className={`flex-1 min-h-0 transition-transform duration-300 ease-out ${
												swipeDirection === 'left'
													? 'animate-slide-left'
													: swipeDirection === 'right'
													? 'animate-slide-right'
													: ''
											}`}
										>
											<StoryCard
												key={msg.id}
												message={msg}
												isPlayer={msg.senderId === activeStory.playerCharacterId}
												senderName={senderName}
												avatarBase64={sender?.avatarBase64}
												avatarUrl={sender?.avatarUrl}
												locationBackgroundImage={activeStory.locations[activeStory.currentLocationId]?.backgroundImage}
												apiKey={apiKey}
												skipAnimation={shouldSkipAnimation}
												onTypingComplete={() => {
													// Mark card as viewed when typewriter animation completes
													if (!wasViewed) {
														markCardAsViewed(msg.id);
													}
												}}
												selectedVoice={selectedVoice}
												useTone={useTone}
												colors={colors}
												currentIndex={pageIndex}
												totalCards={totalCards}
												onPrevious={goToPrevious}
												onNext={goToNext}
												canGoPrevious={canGoPrevious}
												canGoNext={canGoNext}
												isActive={isActiveCard}
												t={t}
												language={storyLanguage}
												showNextPulse={showNextPulse}
												isMobile={isMobile}
												gridSnapshots={activeStory.gridSnapshots}
												currentLocationName={activeStory.locations[activeStory.currentLocationId]?.name}
												characterAvatars={Object.fromEntries(
													Object.entries(activeStory.characters).map(([id, char]) => [id, char.avatarBase64]),
												)}
											/>
										</div>
									);
								})()
							) : (
								<div className="flex-1 flex items-center justify-center">
									<div className="text-center p-8" style={{ color: colors.textSecondary }}>
										<Terminal className="w-16 h-16 mx-auto mb-4 opacity-30" />
										<p className="text-lg font-bold uppercase tracking-wider">Your story begins...</p>
									</div>
								</div>
							)}

							{/* Processing Indicator */}
							{isProcessing && processingPhase && (
								<div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
									<ProcessingIndicator phase={processingPhase} language={activeStory.config?.language || language} />
								</div>
							)}

							{/* New Cards Indicator - Visual only, not clickable */}
							{newCardsCount > 0 && !isProcessing && (
								<div
									className="absolute bottom-2 right-2 md:bottom-4 md:right-4 z-30 px-2 py-1.5 md:px-4 md:py-3 font-bold uppercase tracking-wider text-[10px] md:text-sm animate-pulse border-2 pointer-events-none"
									style={{
										backgroundColor: colors.buttonPrimary,
										color: colors.buttonPrimaryText,
										borderColor: colors.borderStrong,
										boxShadow: `2px 2px 0px ${colors.shadow}`,
									}}
								>
									<span>
										{newCardsCount} {t.newCards || 'new'}
									</span>
								</div>
							)}
						</div>
					</div>

					{isOnLastCard ? (
						<ActionInput
							apiKey={apiKey}
							language={storyLanguage}
							activeStory={activeStory}
							inputValue={inputValue}
							setInputValue={setInputValue}
							isProcessing={isProcessing}
							isUpdatingContext={isUpdatingContext}
							onSendMessage={handleSendMessageWithTracking}
							onVoiceTranscription={handleVoiceTranscription}
							t={t}
						/>
					) : (
						<div
							className="border-t-2 w-full max-w-full"
							style={{ backgroundColor: colors.backgroundSecondary, borderTopColor: colors.border }}
						>
							<div
								className="max-w-full md:max-w-5xl mx-auto px-2 md:px-4 py-3 md:py-4 flex items-center gap-2 md:gap-3 text-[10px] md:text-sm font-mono uppercase tracking-wider md:tracking-widest"
								style={{ color: colors.textSecondary }}
							>
								<Terminal className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
								<span className="line-clamp-2">
									{t.lastCardReminder || 'Navigate to the latest card to unlock your next move.'}
								</span>
							</div>
						</div>
					)}
				</div>
			) : (
				<div
					className="hidden md:flex flex-1 items-center justify-center"
					style={{ backgroundColor: colors.background, color: colors.textSecondary }}
				>
					<div
						className="text-center border-4 border-dashed p-16 rounded-xl"
						style={{ borderColor: colors.border, backgroundColor: colors.backgroundSecondary }}
					>
						<Terminal className="w-24 h-24 mx-auto mb-6 opacity-20" style={{ color: colors.text }} />
						<p className="tracking-widest text-2xl font-bold" style={{ color: colors.textSecondary }}>
							{t.selectStory}
						</p>
					</div>
				</div>
			)}

			{showWizard && !creationPhase && (
				<StoryCreator
					language={language}
					isCreating={isGenerating}
					onCreate={async (conf) => {
						await handleCreateStory(conf);
						setShowWizard(false);
					}}
					onCancel={() => setShowWizard(false)}
				/>
			)}

			{/* Story Creation Loader */}
			{creationPhase && <StoryCreationLoader phase={creationPhase} language={language} />}

			{showStatus && player && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
					style={{ backgroundColor: `${colors.text}99` }}
				>
					<div
						className="w-full max-w-lg relative animate-fade-in"
						style={{
							backgroundColor: colors.background,
							border: `2px solid ${colors.borderStrong}`,
							boxShadow: `12px 12px 0px ${colors.shadow}`,
						}}
					>
						<button
							onClick={() => setShowStatus(false)}
							className="absolute top-2 right-2 p-2 transition-colors border border-transparent hover:opacity-70"
							style={{ color: colors.text }}
						>
							<X className="w-5 h-5" />
						</button>
						<div
							className="p-6 flex items-center gap-4"
							style={{ borderBottom: `2px solid ${colors.border}`, backgroundColor: colors.backgroundSecondary }}
						>
							<div
								className="w-16 h-16 border-2"
								style={{ borderColor: colors.borderStrong, backgroundColor: colors.backgroundAccent }}
							>
								{player.avatarBase64 ? (
									<img
										src={
											player.avatarBase64.startsWith('data:')
												? player.avatarBase64
												: `data:image/png;base64,${player.avatarBase64}`
										}
										className="w-full h-full object-cover"
									/>
								) : player.avatarUrl ? (
									<img src={player.avatarUrl} className="w-full h-full object-cover" />
								) : (
									<User className="w-full h-full p-2" style={{ color: colors.textSecondary }} />
								)}
							</div>
							<div>
								<h2 className="text-2xl font-black uppercase" style={{ color: colors.text }}>
									{player.name}
								</h2>
								<div className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.textSecondary }}>
									{player.state}
								</div>
							</div>
						</div>
						<div className="p-6 space-y-6">
							<div>
								<h3
									className="text-sm font-bold px-2 py-1 inline-block uppercase mb-3"
									style={{ backgroundColor: colors.buttonPrimary, color: colors.buttonPrimaryText }}
								>
									Statistics
								</h3>
								<div className="grid grid-cols-2 gap-2 text-sm font-mono">
									{player.stats && Object.entries(player.stats).length > 0 ? (
										Object.entries(player.stats).map(([k, v]) => (
											<div
												key={k}
												className="flex justify-between pb-1"
												style={{ borderBottom: `1px solid ${colors.border}` }}
											>
												<span className="uppercase" style={{ color: colors.textSecondary }}>
													{k}
												</span>
												<span className="font-bold" style={{ color: colors.text }}>
													{v}
												</span>
											</div>
										))
									) : (
										<span className="italic" style={{ color: colors.textSecondary }}>
											No stats detected.
										</span>
									)}
								</div>
							</div>
							<div>
								<h3
									className="text-sm font-bold px-2 py-1 inline-block uppercase mb-3"
									style={{ backgroundColor: colors.buttonPrimary, color: colors.buttonPrimaryText }}
								>
									Inventory
								</h3>
								<div
									className="p-4 h-48 overflow-y-auto shadow-inner border-2"
									style={{ backgroundColor: colors.backgroundSecondary, borderColor: colors.border }}
								>
									{player.inventory && player.inventory.length > 0 ? (
										<ul className="space-y-2">
											{(player.inventory as Array<Item | string>).map((entry, i) => {
												const structured = typeof entry === 'object' && entry !== null;

												if (structured) {
													const item = entry as Item & { id?: string };
													const details: string[] = [];
													if (typeof item.quantity === 'number' && item.quantity > 1) {
														details.push(`x${item.quantity}`);
													}
													if ((item as Item).category) {
														details.push(item.category);
													}
													return (
														<li
															key={item.id || `${item.name}-${i}`}
															className="flex items-center gap-2 font-mono text-base pb-1"
															style={{ color: colors.text, borderBottom: `1px solid ${colors.border}` }}
														>
															<div className="w-2 h-2 rotate-45" style={{ backgroundColor: colors.text }} />
															<div className="flex-1">
																<span className="font-bold">{item.name}</span>
																{details.length > 0 && (
																	<span className="ml-2 text-xs uppercase" style={{ color: colors.textSecondary }}>
																		{details.join(' • ')}
																	</span>
																)}
																{item.description && (
																	<div className="text-xs" style={{ color: colors.textSecondary }}>
																		{item.description}
																	</div>
																)}
															</div>
														</li>
													);
												}

												return (
													<li
														key={`legacy-${i}`}
														className="flex items-center gap-2 font-mono text-base pb-1"
														style={{ color: colors.text, borderBottom: `1px solid ${colors.border}` }}
													>
														<div className="w-2 h-2 rotate-45" style={{ backgroundColor: colors.text }} />
														<span>{String(entry)}</span>
													</li>
												);
											})}
										</ul>
									) : (
										<div
											className="h-full flex flex-col items-center justify-center gap-2"
											style={{ color: colors.textSecondary }}
										>
											<Backpack className="w-8 h-8 opacity-20" />
											<span className="text-xs uppercase font-bold">Bag Empty</span>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Error Modal */}
			<ErrorModal isOpen={showErrorModal} onClose={closeErrorModal} errorType={errorType} errorMessage={errorMessage} />

			{/* Voice Settings Modal */}
			<VoiceSettings
				isOpen={showVoiceSettings}
				onClose={() => setShowVoiceSettings(false)}
				apiKey={apiKey}
				selectedVoice={selectedVoice}
				onVoiceChange={setSelectedVoice}
				useTone={useTone}
				onUseToneChange={setUseTone}
			/>

			{/* Settings Modal */}
			<SettingsModal
				isOpen={showSettings}
				onClose={() => setShowSettings(false)}
				onOpenVoiceSettings={() => setShowVoiceSettings(true)}
				onOpenNarrativeStyle={() => setShowNarrativeStyleModal(true)}
				onDeleteDatabase={async () => {
					await dbService.deleteAllGames();
					// Clear local state after database deletion
					setCurrentStoryId(null);
					// Reload the stories list (will be empty)
					const loadedStories = await dbService.loadGames();
					// This will trigger a re-render with empty stories - we need to access setStories
					// Since setStories is not exposed, we'll use handleLogout logic
					window.location.reload();
				}}
				onDeleteApiKey={handleLogout}
				canEditNarrativeStyle={!!activeStory}
				t={t}
			/>

			{/* Theme Colors Modal */}
			<ThemeColorsModal
				isOpen={showThemeColors}
				onClose={() => setShowThemeColors(false)}
				onRegenerate={regenerateThemeColors}
				isGenerating={isGeneratingColors}
			/>

			<NarrativeStyleModal
				isOpen={showNarrativeStyleModal && !!activeStory}
				onClose={() => setShowNarrativeStyleModal(false)}
				currentMode={narrativeModeForModal}
				currentStyle={narrativeStylePreset}
				genre={narrativeGenre}
				onSave={updateNarrativeStyle}
				t={t}
			/>

			{/* Character Zoom Modal */}
			<CharacterZoomModal
				isOpen={!!zoomModalData}
				onClose={() => setZoomModalData(null)}
				imageSrc={zoomModalData?.imageSrc || null}
				characterName={zoomModalData?.name || ''}
			/>
		</div>
	);
};

export default App;
