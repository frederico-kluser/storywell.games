import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, MoreHorizontal, Sparkles, AlertTriangle, X, Check } from 'lucide-react';
import { VoiceInput } from '../VoiceInput';
import { FateToast } from '../FateToast';
import { GameState, Language, ActionOption, FateResult } from '../../types';
import {
	generateActionOptions,
	rollFate,
	analyzeCustomAction,
	CustomActionAnalysisResult,
} from '../../services/ai/openaiClient';
import { useThemeColors } from '../../hooks/useThemeColors';
import { fetchActionOptionsWithCache, getCachedActionOptions } from '../../utils/actionOptionsCache';

interface ActionInputProps {
	apiKey: string;
	language: Language;
	activeStory: GameState;
	inputValue: string;
	setInputValue: React.Dispatch<React.SetStateAction<string>>;
	isProcessing: boolean;
	isUpdatingContext?: boolean; // True while heavy context is being updated
	onSendMessage: (directMessage?: string, fateResult?: FateResult) => Promise<void>;
	onVoiceTranscription: (text: string) => void;
	t: Record<string, string>;
	isCollapsed: boolean; // Controlled from parent for mobile collapse state
	setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
	onActionsCountChange?: (count: number) => void; // Notify parent of actions count for pulse animation
}

export const ActionInput: React.FC<ActionInputProps> = ({
	apiKey,
	language,
	activeStory,
	inputValue,
	setInputValue,
	isProcessing,
	isUpdatingContext = false,
	onSendMessage,
	onVoiceTranscription,
	t,
	isCollapsed,
	setIsCollapsed,
	onActionsCountChange,
}) => {
	const { colors } = useThemeColors();
	const isBlocked = isProcessing;
	const showBackgroundUpdate = isUpdatingContext && !isProcessing;
	const [options, setOptions] = useState<ActionOption[]>([]);
	const [isLoadingOptions, setIsLoadingOptions] = useState(false);
	const [showCustomInput, setShowCustomInput] = useState(false);
	const [lastMessageCount, setLastMessageCount] = useState(0);
	const [lastFateResult, setLastFateResult] = useState<FateResult | null>(null);
	const [showFateToast, setShowFateToast] = useState<FateResult | null>(null);

	// Custom action confirmation states
	const [isAnalyzingAction, setIsAnalyzingAction] = useState(false);
	const [customActionAnalysis, setCustomActionAnalysis] = useState<CustomActionAnalysisResult | null>(null);
	const [pendingCustomAction, setPendingCustomAction] = useState<string>('');

	// Generate options when messages change (new turn)
	useEffect(() => {
		const currentMessageCount = activeStory.messages.length;
		const lastMessage = activeStory.messages[currentMessageCount - 1];
		const lastMessageId = lastMessage?.id || '';

		// Only regenerate if we have messages and the count changed (new turn happened)
		if (currentMessageCount > 0 && currentMessageCount !== lastMessageCount && !isProcessing) {
			setLastMessageCount(currentMessageCount);
			setLastFateResult(null); // Clear fate result when new options load

			// Check cache first - especially useful on page reload
			const cached = getCachedActionOptions(activeStory.id);
			if (cached && cached.lastMessageId === lastMessageId && cached.options.length > 0) {
				// Cache hit! Use cached options instead of regenerating
				setOptions(cached.options);
				return;
			}

			// Cache miss or invalid - generate new options
			loadOptions();
		}
	}, [activeStory.messages.length, isProcessing, activeStory.id]);

	// Notify parent of actions count changes
	useEffect(() => {
		if (onActionsCountChange) {
			onActionsCountChange(options.length + 1); // +1 for custom action
		}
	}, [options.length, onActionsCountChange]);

	const loadOptions = async () => {
		if (!apiKey || isLoadingOptions) return;
		const lastMessage = activeStory.messages[activeStory.messages.length - 1];
		if (!lastMessage) return;

		setIsLoadingOptions(true);
		setShowCustomInput(false);
		setInputValue('');
		// Reset custom action states
		setCustomActionAnalysis(null);
		setPendingCustomAction('');

		try {
			const storyLang = activeStory.config?.language || language;
			const newOptions = await fetchActionOptionsWithCache(activeStory.id, lastMessage.id, () =>
				generateActionOptions(apiKey, activeStory, storyLang),
			);
			setOptions(newOptions);
		} catch (e) {
			console.error('Failed to load options:', e);
			setOptions([]);
		} finally {
			setIsLoadingOptions(false);
		}
	};

	const handleOptionClick = async (option: ActionOption) => {
		if (isBlocked) return;
		setInputValue(option.text);
		setIsCollapsed(true); // Auto-collapse menu on mobile after selection

		// Roll the fate dice!
		const fateResult = rollFate(option);
		setLastFateResult(fateResult);

		// Show toast for non-neutral results
		if (fateResult.type !== 'neutral') {
			setShowFateToast(fateResult);
		}

		// Send immediately when clicking an option - pass both message and fate result
		await onSendMessage(option.text, fateResult);
		setShowCustomInput(false);
	};

	const handleCustomClick = () => {
		setShowCustomInput(true);
		setInputValue('');
		setIsCollapsed(true); // Auto-collapse menu on mobile after selection
		// Reset confirmation state
		setCustomActionAnalysis(null);
		setPendingCustomAction('');
	};

	// Analyze custom action and show confirmation
	const handleSend = async () => {
		if (!inputValue.trim() || isBlocked || isAnalyzingAction) return;

		setIsCollapsed(true); // Collapse menu on mobile after sending

		const actionText = inputValue.trim();
		setPendingCustomAction(actionText);
		setIsAnalyzingAction(true);

		try {
			const storyLang = activeStory.config?.language || language;
			const analysis = await analyzeCustomAction(apiKey, actionText, activeStory, storyLang);
			setCustomActionAnalysis(analysis);
		} catch (e) {
			console.error('Failed to analyze custom action:', e);
			// On error, use default moderate values
			setCustomActionAnalysis({
				goodChance: 15,
				badChance: 15,
				goodHint: '',
				badHint: '',
				reasoning: 'Analysis unavailable',
			});
		} finally {
			setIsAnalyzingAction(false);
		}
	};

	// Confirm and execute custom action
	const handleConfirmCustomAction = async () => {
		if (!customActionAnalysis || !pendingCustomAction || isBlocked) return;

		// Create action option from analysis for fate roll
		const customOption: ActionOption = {
			text: pendingCustomAction,
			goodChance: customActionAnalysis.goodChance,
			badChance: customActionAnalysis.badChance,
			goodHint: customActionAnalysis.goodHint,
			badHint: customActionAnalysis.badHint,
		};

		// Roll the fate dice!
		const fateResult = rollFate(customOption);
		setLastFateResult(fateResult);

		// Show toast for non-neutral results
		if (fateResult.type !== 'neutral') {
			setShowFateToast(fateResult);
		}

		// Save action before clearing state
		const actionToSend = pendingCustomAction;

		// Reset states immediately so UI hides on confirm click
		setShowCustomInput(false);
		setCustomActionAnalysis(null);
		setPendingCustomAction('');
		setInputValue('');

		// Send the action with fate result
		await onSendMessage(actionToSend, fateResult);
	};

	// Cancel confirmation and allow retry
	const handleCancelConfirmation = () => {
		setCustomActionAnalysis(null);
		setPendingCustomAction('');
		// Keep the input value so user can modify and retry
	};

	const withAlpha = (hex: string, alpha: number) => {
		if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex;
		let normalized = hex.replace('#', '');
		if (normalized.length === 3) {
			normalized = normalized
				.split('')
				.map((char) => char + char)
				.join('');
		}
		if (normalized.length !== 6) return hex;
		const r = parseInt(normalized.slice(0, 2), 16);
		const g = parseInt(normalized.slice(2, 4), 16);
		const b = parseInt(normalized.slice(4, 6), 16);
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	};

	const getRiskColor = (badChance: number) => {
		if (badChance >= 30) return colors.danger;
		if (badChance >= 15) return colors.warning;
		return colors.textSecondary;
	};

	const getLuckColor = (goodChance: number) => {
		if (goodChance >= 30) return colors.success;
		if (goodChance >= 15) return colors.textAccent;
		return colors.textSecondary;
	};

	// Fixed colors for Critical Success/Error hints - these should NEVER change
	// based on narrative theme or percentages
	const CRITICAL_SUCCESS_COLOR = '#166534'; // green-800 - always green for success
	const CRITICAL_ERROR_COLOR = '#dc2626'; // red-600 - always red for error

	const renderContextSyncBadge = () => {
		if (!showBackgroundUpdate) return null;
		return (
			<div
				className="mb-3 flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-wide"
				style={{ color: colors.textSecondary }}
			>
				<Loader2 className="w-3.5 h-3.5 animate-spin" />
				<span>{t.updatingContext || 'Atualizando memória...'}</span>
			</div>
		);
	};

	// Loading state
	if (isLoadingOptions) {
		return (
			<div
				className="p-2 md:p-6 border-t-2 w-full max-w-full overflow-hidden"
				style={{ backgroundColor: colors.backgroundSecondary, borderTopColor: colors.border }}
			>
				<div className="max-w-full md:max-w-5xl mx-auto">
					{renderContextSyncBadge()}
					<div className="flex flex-col items-center gap-3 py-4 md:py-6">
						{/* Animated loader icon */}
						<div className="relative">
							<div
								className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center"
								style={{ backgroundColor: colors.buttonPrimary }}
							>
								<Sparkles className="w-6 h-6 md:w-7 md:h-7 text-white animate-pulse" />
							</div>
							{/* Spinning border */}
							<div
								className="absolute inset-0 rounded-full border-3 border-t-transparent animate-spin"
								style={{
									borderColor: `${colors.buttonPrimary}40`,
									borderTopColor: 'transparent',
									borderWidth: '3px',
								}}
							/>
						</div>

						{/* Label */}
						<div className="text-sm md:text-base font-bold uppercase tracking-wide" style={{ color: colors.text }}>
							{t.generatingOptions}
						</div>

						{/* Animated progress bar */}
						<div className="w-48 md:w-64">
							<div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
								<div
									className="h-full rounded-full relative overflow-hidden animate-pulse"
									style={{
										width: '60%',
										backgroundColor: colors.success,
									}}
								>
									<div
										className="absolute inset-0 animate-shimmer"
										style={{
											background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)`,
										}}
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Custom input mode
	if (showCustomInput) {
		// Show confirmation modal if we have analysis
		if (customActionAnalysis) {
			return (
				<div
					className="p-2 md:p-6 border-t-2 w-full max-w-full overflow-hidden"
					style={{ backgroundColor: colors.backgroundSecondary, borderTopColor: colors.border }}
				>
					<div className="max-w-full md:max-w-5xl mx-auto space-y-3 md:space-y-4">
						{renderContextSyncBadge()}
						{/* Header */}
						<div className="text-xs md:text-sm font-bold uppercase" style={{ color: colors.textSecondary }}>
							{t.customActionRisk || 'Risk Analysis'}
						</div>

						{/* Action text */}
						<div
							className="p-3 md:p-4 border-2"
							style={{ backgroundColor: colors.backgroundAccent, borderColor: colors.border }}
						>
							<h3 className="text-base md:text-lg font-bold uppercase tracking-wide" style={{ color: colors.text }}>
								{t.confirmAction}
							</h3>
							<div className="text-sm md:text-base font-medium italic" style={{ color: colors.text }}>
								"{pendingCustomAction}"
							</div>
						</div>

						{/* Probabilities display */}
						<div className="grid grid-cols-2 gap-2 md:gap-4">
							{/* Good chance */}
							<div
								className="p-2 md:p-3 border-2 rounded"
								style={{ borderColor: colors.success, backgroundColor: withAlpha(colors.success, 0.12) }}
							>
								<div className="flex items-center gap-1.5 mb-1" style={{ color: colors.success }}>
									<Sparkles className="w-4 h-4 md:w-5 md:h-5" />
									<span className="text-lg md:text-2xl font-bold">{customActionAnalysis.goodChance}%</span>
								</div>
								{customActionAnalysis.goodHint && (
									<div className="text-[10px] md:text-xs line-clamp-2" style={{ color: colors.textSecondary }}>
										{customActionAnalysis.goodHint}
									</div>
								)}
							</div>

							{/* Bad chance */}
							<div
								className="p-2 md:p-3 border-2 rounded"
								style={{ borderColor: colors.danger, backgroundColor: withAlpha(colors.danger, 0.12) }}
							>
								<div className="flex items-center gap-1.5 mb-1" style={{ color: colors.danger }}>
									<AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
									<span className="text-lg md:text-2xl font-bold">{customActionAnalysis.badChance}%</span>
								</div>
								{customActionAnalysis.badHint && (
									<div className="text-[10px] md:text-xs line-clamp-2" style={{ color: colors.textSecondary }}>
										{customActionAnalysis.badHint}
									</div>
								)}
							</div>
						</div>

						{/* Reasoning */}
						{customActionAnalysis.reasoning && (
							<div className="text-[10px] md:text-xs italic" style={{ color: colors.textSecondary }}>
								{customActionAnalysis.reasoning}
							</div>
						)}

						{/* Action buttons */}
						<div className="flex gap-2 md:gap-3">
							<button
								onClick={handleCancelConfirmation}
								disabled={isBlocked}
								className="flex-1 p-2 md:p-3 border-2 font-bold uppercase text-xs md:text-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
								style={{
									backgroundColor: colors.backgroundSecondary,
									borderColor: colors.border,
									color: colors.textSecondary,
								}}
							>
								<X className="w-3.5 h-3.5 md:w-4 md:h-4" />
								{t.cancelAction || 'Cancel'}
							</button>
							<button
								onClick={handleConfirmCustomAction}
								disabled={isBlocked}
								className="flex-1 p-2 md:p-3 font-bold uppercase text-xs md:text-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
								style={{
									backgroundColor: colors.buttonPrimary,
									borderColor: colors.buttonPrimary,
									color: colors.buttonPrimaryText,
								}}
							>
								<Check className="w-3.5 h-3.5 md:w-4 md:h-4" />
								{t.proceedAction || 'Proceed'}
							</button>
						</div>

						{/* Back button */}
						<button
							onClick={() => {
								setShowCustomInput(false);
								setCustomActionAnalysis(null);
								setPendingCustomAction('');
							}}
							className="text-xs uppercase font-bold transition-colors"
							style={{ color: colors.textSecondary }}
						>
							&larr; {t.back}
						</button>
					</div>
				</div>
			);
		}

		// Analyzing state
		if (isAnalyzingAction) {
			return (
				<div
					className="p-2 md:p-6 border-t-2 w-full max-w-full overflow-hidden"
					style={{ backgroundColor: colors.backgroundSecondary, borderTopColor: colors.border }}
				>
					<div className="max-w-full md:max-w-5xl mx-auto">
						{renderContextSyncBadge()}
						<div className="flex flex-col items-center gap-3 py-4 md:py-6">
							{/* Animated loader icon */}
							<div className="relative">
								<div
									className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center"
									style={{ backgroundColor: colors.warning }}
								>
									<AlertTriangle className="w-6 h-6 md:w-7 md:h-7 text-white animate-pulse" />
								</div>
								{/* Spinning border */}
								<div
									className="absolute inset-0 rounded-full border-3 border-t-transparent animate-spin"
									style={{
										borderColor: `${colors.warning}40`,
										borderTopColor: 'transparent',
										borderWidth: '3px',
									}}
								/>
							</div>

							{/* Label */}
							<div className="text-sm md:text-base font-bold uppercase tracking-wide" style={{ color: colors.text }}>
								{t.analyzingAction || 'Analyzing action...'}
							</div>

							{/* Action text preview */}
							<div
								className="text-xs md:text-sm italic max-w-xs text-center truncate"
								style={{ color: colors.textSecondary }}
							>
								"{pendingCustomAction}"
							</div>

							{/* Animated progress bar */}
							<div className="w-48 md:w-64">
								<div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
									<div
										className="h-full rounded-full relative overflow-hidden animate-pulse"
										style={{
											width: '40%',
											backgroundColor: colors.warning,
										}}
									>
										<div
											className="absolute inset-0 animate-shimmer"
											style={{
												background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)`,
											}}
										/>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			);
		}

		// Regular custom input mode
		return (
			<div
				className="p-2 md:p-6 border-t-2 w-full max-w-full overflow-hidden"
				style={{ backgroundColor: colors.backgroundSecondary, borderTopColor: colors.border }}
			>
				<div className="max-w-full md:max-w-5xl mx-auto space-y-2 md:space-y-3">
					{renderContextSyncBadge()}
					<div className="flex items-center gap-2 md:gap-4">
						<VoiceInput
							apiKey={apiKey}
							language={activeStory.config?.language || language}
							onTranscription={onVoiceTranscription}
							disabled={isBlocked}
							className="rounded-none p-2 md:p-3 flex-shrink-0 transition-opacity"
						/>
						<div className="relative flex-1 min-w-0">
							<textarea
								autoFocus
								rows={4}
								value={inputValue}
								onChange={(e) => {
									setInputValue(e.target.value);
									// Auto-resize textarea
									e.target.style.height = 'auto';
									e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
								}}
								onKeyDown={(e) => {
									if (e.key === 'Enter' && !e.shiftKey && !isBlocked) {
										e.preventDefault();
										handleSend();
									}
								}}
								placeholder={t.inputPlaceholder}
								disabled={isBlocked}
								className="retro-input w-full pl-3 md:pl-6 pr-14 md:pr-16 py-2.5 md:py-4 text-base md:text-xl transition-all disabled:opacity-50 resize-none overflow-y-auto"
								style={{
									minHeight: '120px',
									maxHeight: '200px',
									backgroundColor: colors.backgroundSecondary,
									color: colors.text,
									borderColor: colors.border,
								}}
							/>
							<button
								onClick={handleSend}
								disabled={!inputValue.trim() || isBlocked}
								className="absolute right-1.5 md:right-3 top-1.5 md:top-3 bottom-1.5 md:bottom-3 px-3 md:px-4 font-bold transition-opacity rounded-none flex items-center justify-center disabled:opacity-50"
								style={{
									backgroundColor: colors.buttonPrimary,
									color: colors.buttonPrimaryText,
								}}
							>
								<Send className="w-5 h-5 md:w-6 md:h-6" />
							</button>
						</div>
					</div>
					<button
						onClick={() => setShowCustomInput(false)}
						className="text-xs uppercase font-bold transition-colors"
						style={{ color: colors.textSecondary }}
					>
						&larr; {t.back}
					</button>
				</div>
			</div>
		);
	}

	// Options buttons mode (same style as StoryCreator)
	return (
		<>
			{showFateToast && (
				<FateToast
					type={showFateToast.type}
					hint={showFateToast.hint}
					onClose={() => setShowFateToast(null)}
					labels={{
						fateGood: t.fateGood || 'Fortune Smiles!',
						fateBad: t.fateBad || 'Misfortune Strikes!',
					}}
				/>
			)}
			<div
				className="border-t-2 w-full max-w-full overflow-hidden"
				style={{ backgroundColor: colors.backgroundSecondary, borderTopColor: colors.border }}
			>
				{/* Options container - collapsible on mobile (toggle button moved to navigation bar) */}
				<div className={`p-1.5 md:p-6 max-h-[50vh] md:max-h-none overflow-y-auto ${isCollapsed ? 'hidden md:block' : 'block'}`}>
					<div className="max-w-full md:max-w-5xl mx-auto">
						{renderContextSyncBadge()}
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
							{options.map((opt, idx) => (
								<button
									key={idx}
									onClick={() => handleOptionClick(opt)}
									disabled={isBlocked}
									className="p-2.5 md:p-4 border-2 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 min-w-0 overflow-hidden"
									style={{
										backgroundColor: colors.backgroundSecondary,
										borderColor: colors.border,
										color: colors.text,
									}}
								>
									<div className="font-bold uppercase text-sm md:text-base tracking-wide md:tracking-wider mb-1.5 md:mb-2 line-clamp-2 break-words">
										{opt.text}
									</div>
									<div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm flex-wrap">
										{opt.goodChance > 0 && (
											<span
												className="flex items-center gap-1 font-medium"
												style={{ color: getLuckColor(opt.goodChance) }}
												title={opt.goodHint || 'Chance of good event'}
											>
												<Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
												{opt.goodChance}%
											</span>
										)}
										{opt.badChance > 0 && (
											<span
												className="flex items-center gap-1 font-medium"
												style={{ color: getRiskColor(opt.badChance) }}
												title={opt.badHint || 'Chance of bad event'}
											>
												<AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4" />
												{opt.badChance}%
											</span>
										)}
										{opt.goodChance === 0 && opt.badChance === 0 && (
											<span className="text-xs md:text-sm font-medium tracking-wide" style={{ color: colors.textSecondary }}>{t.safe || 'Safe'}</span>
										)}
									</div>
									{/* Action hints - visible descriptive text */}
									{/* Critical Success/Error hints always use fixed green/red colors */}
									{(opt.goodHint || opt.badHint) && (
										<div className="mt-2 pt-2 border-t text-xs md:text-sm tracking-wide" style={{ borderColor: colors.border }}>
											{opt.goodHint && (
												<div className="flex items-start gap-1.5 mb-1" style={{ color: CRITICAL_SUCCESS_COLOR }}>
													<Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
													<span className="italic">{opt.goodHint}</span>
												</div>
											)}
											{opt.badHint && (
												<div className="flex items-start gap-1.5" style={{ color: CRITICAL_ERROR_COLOR }}>
													<AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
													<span className="italic">{opt.badHint}</span>
												</div>
											)}
										</div>
									)}
								</button>
							))}
							<button
								onClick={handleCustomClick}
								disabled={isBlocked}
								className="p-2.5 md:p-4 border-2 border-dashed text-left font-bold uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base tracking-wide md:tracking-wider flex items-center gap-2 md:gap-3 min-w-0 overflow-hidden"
								style={{
									borderColor: colors.border,
									backgroundColor: colors.backgroundAccent,
									color: colors.textSecondary,
								}}
							>
								<MoreHorizontal className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
								<span className="truncate">{t.customAction}</span>
							</button>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};
