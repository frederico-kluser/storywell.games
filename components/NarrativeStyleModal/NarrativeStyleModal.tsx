import React, { useEffect, useState } from 'react';
import { X, Sparkles, Info, Loader2, Check, Edit3, ArrowLeft, ArrowRight, MessageSquare, RotateCcw } from 'lucide-react';
import { VoiceInput } from '../VoiceInput';
import { Language, NarrativeStyleMode, NarrativeGenre } from '../../types';
import { processNarrativeStyleStep } from '../../services/ai/openaiClient';

interface NarrativeStyleHistoryItem {
	question: string;
	answer: string;
}

interface NarrativeStyleModalProps {
	isOpen: boolean;
	onClose: () => void;
	currentMode: NarrativeStyleMode;
	currentStyle?: string;
	genre?: NarrativeGenre;
	universeName?: string;
	onSave: (mode: NarrativeStyleMode, customStyle?: string) => Promise<void> | void;
	t: Record<string, string>;
	apiKey: string;
	language: Language;
}

export const NarrativeStyleModal: React.FC<NarrativeStyleModalProps> = ({
	isOpen,
	onClose,
	currentMode,
	currentStyle,
	genre,
	universeName,
	onSave,
	t,
	apiKey,
	language,
}) => {
	// Mode selection
	const [mode, setMode] = useState<NarrativeStyleMode>(currentMode);

	// Initial description input
	const [initialDescription, setInitialDescription] = useState<string>('');

	// Refinement flow state
	const [isRefining, setIsRefining] = useState(false);
	const [history, setHistory] = useState<NarrativeStyleHistoryItem[]>([]);
	const [currentStep, setCurrentStep] = useState<{
		question?: string;
		options?: string[];
		isComplete: boolean;
		finalStyle?: string;
	} | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [customInputMode, setCustomInputMode] = useState(false);
	const [customInputValue, setCustomInputValue] = useState('');

	// Save state
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Reset state when modal opens
	useEffect(() => {
		if (isOpen) {
			setMode(currentMode);
			setInitialDescription(currentStyle || '');
			setIsRefining(false);
			setHistory([]);
			setCurrentStep(null);
			setCustomInputMode(false);
			setCustomInputValue('');
			setError(null);
		}
	}, [isOpen, currentMode, currentStyle]);

	if (!isOpen) return null;

	// Start the refinement process
	const handleStartRefinement = async () => {
		const trimmed = initialDescription.trim();
		if (!trimmed) {
			setError(t.narrativeStyleRequired || 'Please describe your preferred narrative style.');
			return;
		}

		setError(null);
		setIsLoading(true);
		setIsRefining(true);

		try {
			const result = await processNarrativeStyleStep(
				apiKey,
				trimmed,
				[],
				language,
				genre,
				universeName,
			);

			if (result.isComplete) {
				setCurrentStep({
					isComplete: true,
					finalStyle: result.finalStyle || trimmed,
				});
			} else {
				setCurrentStep({
					isComplete: false,
					question: result.question,
					options: result.options,
				});
			}
		} catch (e) {
			console.error('[Narrative Style] Start refinement error:', e);
			setCurrentStep({
				isComplete: true,
				finalStyle: trimmed,
			});
		} finally {
			setIsLoading(false);
		}
	};

	// Handle answer to refinement question
	const handleAnswer = async (answer: string) => {
		if (!currentStep || currentStep.isComplete) return;

		const questionAsked = currentStep.question || '';
		setCurrentStep(null);
		setCustomInputMode(false);
		setCustomInputValue('');
		setIsLoading(true);

		const newHistory = [...history, { question: questionAsked, answer }];
		setHistory(newHistory);

		try {
			const result = await processNarrativeStyleStep(
				apiKey,
				initialDescription.trim(),
				newHistory,
				language,
				genre,
				universeName,
			);

			if (result.isComplete) {
				setCurrentStep({
					isComplete: true,
					finalStyle: result.finalStyle,
				});
			} else {
				setCurrentStep({
					isComplete: false,
					question: result.question,
					options: result.options,
				});
			}
		} catch (e) {
			console.error('[Narrative Style] Answer error:', e);
			setCurrentStep({
				isComplete: true,
				finalStyle: initialDescription.trim(),
			});
		} finally {
			setIsLoading(false);
		}
	};

	// Reset refinement flow
	const handleReset = () => {
		setIsRefining(false);
		setHistory([]);
		setCurrentStep(null);
		setCustomInputMode(false);
		setCustomInputValue('');
	};

	// Save the final style
	const handleSave = async () => {
		if (mode === 'auto') {
			setSaving(true);
			try {
				await onSave('auto', undefined);
				onClose();
			} catch (err) {
				setError(t.narrativeStyleUpdateError || 'Failed to save. Please try again.');
			} finally {
				setSaving(false);
			}
			return;
		}

		// Custom mode
		if (!currentStep?.isComplete || !currentStep.finalStyle) {
			setError(t.narrativeStyleCompleteFirst || 'Complete the style refinement first.');
			return;
		}

		setSaving(true);
		try {
			await onSave('custom', currentStep.finalStyle);
			onClose();
		} catch (err) {
			setError(t.narrativeStyleUpdateError || 'Failed to save. Please try again.');
		} finally {
			setSaving(false);
		}
	};

	const handleVoiceTranscription = (text: string) => {
		if (customInputMode) {
			setCustomInputValue((prev) => (prev ? `${prev} ${text}` : text));
		} else {
			setInitialDescription((prev) => (prev ? `${prev} ${text}` : text));
		}
		setError(null);
	};

	return (
		<div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
			<div className="bg-white border-4 border-stone-900 w-full max-w-2xl shadow-[8px_8px_0px_rgba(0,0,0,1)] max-h-[90vh] flex flex-col">
				{/* Header */}
				<div className="p-4 border-b-4 border-stone-900 bg-stone-900 flex justify-between items-center flex-shrink-0">
					<h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
						<Sparkles className="w-6 h-6" />
						{t.narrativeStyleEditorTitle || 'Narrative Style'}
					</h2>
					<button
						onClick={onClose}
						className="text-white/70 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
					>
						<X className="w-6 h-6" />
					</button>
				</div>

				{/* Content */}
				<div className="p-5 space-y-5 overflow-y-auto flex-1">
					{/* Mode Selection */}
					<div className="grid grid-cols-2 gap-3">
						<button
							onClick={() => {
								setMode('auto');
								handleReset();
							}}
							className={`p-4 border-3 text-left transition-all ${
								mode === 'auto'
									? 'bg-stone-900 text-white border-stone-900 shadow-[4px_4px_0px_rgba(0,0,0,0.3)]'
									: 'bg-stone-100 text-stone-700 border-stone-300 hover:border-stone-900'
							}`}
						>
							<h3 className="font-black uppercase text-sm">
								{t.narrativeStyleAutoTitle || 'Auto Mode'}
							</h3>
							<p className={`text-xs mt-1 ${mode === 'auto' ? 'text-stone-300' : 'text-stone-500'}`}>
								{t.narrativeStyleAutoDesc || 'AI adapts to each scene automatically'}
							</p>
						</button>
						<button
							onClick={() => setMode('custom')}
							className={`p-4 border-3 text-left transition-all ${
								mode === 'custom'
									? 'bg-stone-700 text-white border-stone-800 shadow-[4px_4px_0px_rgba(0,0,0,0.3)]'
									: 'bg-stone-100 text-stone-700 border-stone-300 hover:border-stone-700'
							}`}
						>
							<h3 className="font-black uppercase text-sm">
								{t.narrativeStyleCustomTitle || 'Custom Style'}
							</h3>
							<p className={`text-xs mt-1 ${mode === 'custom' ? 'text-stone-300' : 'text-stone-500'}`}>
								{t.narrativeStyleCustomDesc || 'Define your preferred writing style'}
							</p>
						</button>
					</div>

					{/* Custom Mode Content */}
					{mode === 'custom' && (
						<div className="space-y-4">
							{/* Initial Description Input (before refinement) */}
							{!isRefining && (
								<>
									<div className="flex gap-3 bg-stone-100 border-2 border-stone-300 p-3">
										<Info className="w-5 h-5 text-stone-500 flex-shrink-0 mt-0.5" />
										<div>
											<p className="text-xs font-bold uppercase tracking-wide text-stone-600">
												{t.narrativeStyleInfoTitle || 'How to describe your style'}
											</p>
											<p className="text-xs text-stone-600 mt-1 leading-relaxed">
												{t.narrativeStyleInfoBody ||
													'Describe how you want the story to be told: detail level, pacing, tone, or reference authors/works you like.'}
											</p>
										</div>
									</div>

									<div className="relative">
										<textarea
											value={initialDescription}
											onChange={(e) => {
												setInitialDescription(e.target.value);
												if (error) setError(null);
											}}
											className="w-full bg-stone-50 border-3 border-stone-300 p-4 pr-12 text-sm text-stone-900 focus:border-stone-600 outline-none min-h-[120px] font-medium"
											placeholder={
												t.narrativeStylePlaceholder ||
												'e.g., "Short sentences, fast pacing, minimal descriptions" or "Like Game of Thrones - dark and political"'
											}
										/>
										<div className="absolute top-3 right-3">
											<VoiceInput
												apiKey={apiKey}
												language={language}
												onTranscription={handleVoiceTranscription}
												className="text-stone-400 hover:text-stone-600"
											/>
										</div>
									</div>

									<button
										onClick={handleStartRefinement}
										disabled={!initialDescription.trim() || isLoading}
										className="w-full py-3 bg-stone-800 text-white font-black uppercase tracking-wide hover:bg-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border-2 border-stone-900 shadow-[4px_4px_0px_rgba(0,0,0,0.2)]"
									>
										{isLoading ? (
											<Loader2 className="w-5 h-5 animate-spin" />
										) : (
											<Sparkles className="w-5 h-5" />
										)}
										{t.narrativeStyleRefineBtn || 'Refine Style'}
									</button>
								</>
							)}

							{/* Refinement Flow */}
							{isRefining && (
								<div className="border-3 border-stone-400 bg-stone-50 p-4 space-y-4">
									{/* Header with Reset */}
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2 text-stone-700">
											<Sparkles className="w-5 h-5" />
											<span className="font-black uppercase text-sm">
												{t.narrativeStyleRefiningTitle || 'Refining Your Style'}
											</span>
										</div>
										<button
											onClick={handleReset}
											className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 font-bold uppercase"
										>
											<RotateCcw className="w-3 h-3" />
											{t.reset || 'Reset'}
										</button>
									</div>

									{/* Original Description */}
									<div className="bg-white border-2 border-stone-300 p-3">
										<span className="text-[10px] font-bold uppercase text-stone-500 block mb-1">
											{t.narrativeStyleYourDescription || 'Your description'}
										</span>
										<p className="text-sm text-stone-700">{initialDescription}</p>
									</div>

									{/* History */}
									{history.map((item, idx) => (
										<div key={idx} className="space-y-2">
											<div className="flex gap-2">
												<div className="w-7 h-7 bg-stone-200 border-2 border-stone-400 flex items-center justify-center flex-shrink-0">
													<MessageSquare className="w-4 h-4 text-stone-600" />
												</div>
												<div className="bg-white border-2 border-stone-300 p-3 text-sm text-stone-700 flex-1">
													{item.question}
												</div>
											</div>
											<div className="flex gap-2 justify-end">
												<div className="bg-stone-700 text-white p-3 text-sm font-bold max-w-[80%]">
													{item.answer}
												</div>
											</div>
										</div>
									))}

									{/* Current Question */}
									{currentStep && !currentStep.isComplete && (
										<div className="flex gap-2">
											<div className="w-7 h-7 bg-stone-700 border-2 border-stone-800 flex items-center justify-center flex-shrink-0 text-white">
												<Sparkles className="w-4 h-4" />
											</div>
											<div className="bg-white border-3 border-stone-600 p-3 text-stone-900 font-bold flex-1">
												{currentStep.question}
											</div>
										</div>
									)}

									{/* Loading */}
									{isLoading && (
										<div className="flex gap-2 items-center">
											<div className="w-7 h-7 bg-stone-200 border-2 border-stone-400 flex items-center justify-center flex-shrink-0">
												<Loader2 className="w-4 h-4 animate-spin text-stone-600" />
											</div>
											<span className="text-stone-500 italic text-sm">
												{t.narrativeStyleAnalyzing || 'Analyzing your style...'}
											</span>
										</div>
									)}

									{/* Complete */}
									{currentStep?.isComplete && (
										<div className="bg-green-100 border-3 border-green-600 p-4">
											<div className="flex items-center gap-2 text-green-800 mb-3">
												<Check className="w-5 h-5" />
												<span className="font-black uppercase text-sm">
													{t.narrativeStyleComplete || 'Style Defined'}
												</span>
											</div>
											<div className="bg-white border-2 border-green-200 p-3 text-xs text-stone-600 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
												{currentStep.finalStyle}
											</div>
										</div>
									)}

									{/* Options */}
									{currentStep && !currentStep.isComplete && currentStep.options && !isLoading && (
										<div className="space-y-2">
											{!customInputMode ? (
												<div className="grid grid-cols-1 gap-2">
													{currentStep.options.map((opt, idx) => (
														<button
															key={idx}
															onClick={() => handleAnswer(opt)}
															disabled={isLoading}
															className="p-3 border-2 border-stone-300 bg-white hover:border-stone-600 hover:bg-stone-50 text-left font-bold text-sm transition-all disabled:opacity-50"
														>
															{opt}
														</button>
													))}
													<button
														onClick={() => setCustomInputMode(true)}
														disabled={isLoading}
														className="p-3 border-2 border-dashed border-stone-400 bg-white hover:border-stone-600 text-left font-bold text-sm flex items-center gap-2 text-stone-600"
													>
														<Edit3 className="w-4 h-4" />
														{t.otherOption || 'Other...'}
													</button>
												</div>
											) : (
												<div className="space-y-2">
													<button
														onClick={() => {
															setCustomInputMode(false);
															setCustomInputValue('');
														}}
														className="flex items-center gap-2 text-stone-500 hover:text-stone-700 text-xs font-bold uppercase"
													>
														<ArrowLeft className="w-3 h-3" />
														{t.backToOptions || 'Back to options'}
													</button>
													<div className="flex gap-2">
														<div className="relative flex-1">
															<textarea
																rows={2}
																value={customInputValue}
																onChange={(e) => setCustomInputValue(e.target.value)}
																onKeyDown={(e) => {
																	if (e.key === 'Enter' && !e.shiftKey && customInputValue.trim()) {
																		e.preventDefault();
																		handleAnswer(customInputValue);
																	}
																}}
																className="w-full bg-white border-2 border-stone-400 p-3 pr-10 text-sm text-stone-900 focus:border-stone-600 outline-none"
																placeholder={t.typeYourAnswer || 'Type your answer...'}
																disabled={isLoading}
																autoFocus
															/>
															<div className="absolute right-2 top-2">
																<VoiceInput
																	apiKey={apiKey}
																	language={language}
																	onTranscription={handleVoiceTranscription}
																	className="text-stone-400 hover:text-stone-600"
																/>
															</div>
														</div>
														<button
															onClick={() => handleAnswer(customInputValue)}
															disabled={!customInputValue.trim() || isLoading}
															className="bg-stone-700 text-white px-4 font-bold disabled:opacity-50 hover:bg-stone-600 transition-colors"
														>
															<ArrowRight className="w-5 h-5" />
														</button>
													</div>
												</div>
											)}
										</div>
									)}
								</div>
							)}
						</div>
					)}

					{/* Error */}
					{error && (
						<div className="bg-red-100 border-2 border-red-500 p-3 text-sm text-red-700 font-bold">
							{error}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="p-4 border-t-4 border-stone-900 bg-stone-100 flex gap-3 flex-shrink-0">
					<button
						onClick={onClose}
						className="flex-1 py-3 px-4 bg-white text-stone-700 font-black uppercase text-sm border-2 border-stone-300 hover:border-stone-900 transition-colors"
						disabled={saving}
					>
						{t.cancel || 'Cancel'}
					</button>
					<button
						onClick={handleSave}
						disabled={saving || isLoading || (mode === 'custom' && (!currentStep?.isComplete || !currentStep?.finalStyle))}
						className="flex-1 py-3 px-4 bg-stone-900 text-white font-black uppercase text-sm tracking-wide hover:bg-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border-2 border-stone-900"
					>
						{saving && <Loader2 className="w-4 h-4 animate-spin" />}
						{t.save || 'Save'}
					</button>
				</div>
			</div>
		</div>
	);
};
