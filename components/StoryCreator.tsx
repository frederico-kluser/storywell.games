import React, { useState, useRef, useEffect } from 'react';
import {
	Book,
	ArrowRight,
	Loader2,
	X,
	MessageSquare,
	Check,
	Sparkles,
	Database,
	ChevronDown,
	Edit3,
	ArrowLeft,
	Info,
	RotateCcw,
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/locales';
import { VoiceInput } from './VoiceInput';
import { processOnboardingStep, processNarrativeStyleStep } from '../services/ai/openaiClient';

interface StoryCreatorProps {
	onCreate: (config: any) => Promise<void>;
	isCreating: boolean;
	onCancel: () => void;
	language: Language;
}

interface OnboardingStep {
	question: string;
	controlType: 'select' | 'finish';
	options?: string[];
	isComplete: boolean;
	finalConfig?: any;
}

interface NarrativeStyleHistoryItem {
	question: string;
	answer: string;
}

export const StoryCreator: React.FC<StoryCreatorProps> = ({ onCreate, isCreating, onCancel, language }) => {
	const apiKey = localStorage.getItem('infinitum_api_key') || '';
	const t = translations[language];

	// State for the Dynamic Flow
	const [started, setStarted] = useState(false);
	const [universeType, setUniverseType] = useState<'original' | 'existing'>('original');

	const [history, setHistory] = useState<{ question: string; answer: string }[]>([]);
	const [currentStep, setCurrentStep] = useState<OnboardingStep | null>(null);

	const [inputValue, setInputValue] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [isCustomInput, setIsCustomInput] = useState(false);

	// Edit history states
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [hoveringIndex, setHoveringIndex] = useState<number | null>(null);
	const [editValue, setEditValue] = useState('');
	const [narrativeStyleMode, setNarrativeStyleMode] = useState<'auto' | 'custom'>('auto');
	const [customNarrativeStyle, setCustomNarrativeStyle] = useState('');

	// Narrative style refinement state
	const [narrativeStyleHistory, setNarrativeStyleHistory] = useState<NarrativeStyleHistoryItem[]>([]);
	const [narrativeStyleStep, setNarrativeStyleStep] = useState<{
		question?: string;
		options?: string[];
		isComplete: boolean;
		finalStyle?: string;
	} | null>(null);
	const [isNarrativeStyleRefining, setIsNarrativeStyleRefining] = useState(false);
	const [narrativeStyleLoading, setNarrativeStyleLoading] = useState(false);
	const [narrativeStyleInputValue, setNarrativeStyleInputValue] = useState('');
	const [isNarrativeStyleCustomInput, setIsNarrativeStyleCustomInput] = useState(false);

	const prepChecklist = [
		{ title: t.wizTheme, helper: t.wizThemePlace },
		{ title: `${t.wizChar} // ${t.wizCharName}`, helper: t.wizCharDesc },
		{ title: t.wizStartSit, helper: t.wizStartSitPlace },
	];

	const systemDialSpecs = [t.wizMech, t.wizCombat, t.wizDesc, t.wizTac, t.wizDial, t.wizDialRich];

	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Auto-scroll logic
	useEffect(() => {
		if (messagesEndRef.current) {
			messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
		}
	}, [history, currentStep, isLoading, narrativeStyleHistory, narrativeStyleStep, narrativeStyleLoading]);

	// Reset narrative style refinement when switching modes
	useEffect(() => {
		if (narrativeStyleMode === 'auto') {
			setIsNarrativeStyleRefining(false);
			setNarrativeStyleStep(null);
			setNarrativeStyleHistory([]);
			setNarrativeStyleInputValue('');
			setIsNarrativeStyleCustomInput(false);
		}
	}, [narrativeStyleMode]);

	// Initial Step: Trigger AI or Manual Input based on selection
	const handleStart = async (type: 'original' | 'existing') => {
		setUniverseType(type);
		setStarted(true);

		if (type === 'existing') {
			// For existing universes, provide popular universe options
			const manualQuestion =
				language === 'pt'
					? 'Qual é o nome do Universo onde você quer jogar?'
					: language === 'es'
						? '¿Cuál es el nombre del Universo donde quieres jugar?'
						: language === 'fr'
							? 'Quel est le nom de l\'Univers où vous voulez jouer ?'
							: language === 'ru'
								? 'Как называется Вселенная, в которой вы хотите играть?'
								: language === 'zh'
									? '你想在哪个宇宙中进行游戏？'
									: 'What is the name of the Universe where you want to play?';

			setCurrentStep({
				question: manualQuestion,
				controlType: 'select',
				options: ['Harry Potter', 'Star Wars', 'The Lord of the Rings', 'Arcane: League of Legends'],
				isComplete: false,
			});
		} else {
			// Start AI-powered onboarding
			setIsLoading(true);
			try {
				const response = await processOnboardingStep(apiKey, [], universeType, language);
				setCurrentStep(response);
			} catch {
				console.error('Onboarding error');
				setCurrentStep({
					question: 'An error occurred. Please try again or describe your universe.',
					controlType: 'select',
					isComplete: false,
				});
			} finally {
				setIsLoading(false);
			}
		}
	};

	const handleAnswer = async (answer: string) => {
		if (!currentStep) return;

		const previousStep = currentStep;
		setHistory([...history, { question: currentStep.question, answer }]);
		setCurrentStep(null);
		setInputValue('');
		setIsCustomInput(false);
		setIsLoading(true);

		try {
			const response = await processOnboardingStep(
				apiKey,
				[...history, { question: currentStep.question, answer }],
				universeType,
				language,
			);
			setCurrentStep(response);
		} catch {
			console.error('Error processing answer');
			setCurrentStep(previousStep);
			// Remove the failed answer from history
			setHistory(history);
		} finally {
			setIsLoading(false);
		}
	};

	// Handle editing a previous answer
	const handleStartEdit = (index: number) => {
		setEditingIndex(index);
		setEditValue(history[index].answer);
	};

	const handleCancelEdit = () => {
		setEditingIndex(null);
		setEditValue('');
	};

	const handleConfirmEdit = async () => {
		if (editingIndex === null || !editValue.trim()) return;

		const editedQuestion = history[editingIndex].question;
		const newAnswer = editValue.trim();

		// Truncate history to only include items before the edited one
		const truncatedHistory = history.slice(0, editingIndex);

		// Reset states
		setEditingIndex(null);
		setEditValue('');
		setHoveringIndex(null);

		// Update history with the new answer
		setHistory([...truncatedHistory, { question: editedQuestion, answer: newAnswer }]);
		setCurrentStep(null);
		setIsLoading(true);

		try {
			const response = await processOnboardingStep(
				apiKey,
				[...truncatedHistory, { question: editedQuestion, answer: newAnswer }],
				universeType,
				language,
			);
			setCurrentStep(response);
		} catch {
			console.error('Error processing edited answer');
			// Restore original history on error
			setHistory(history);
		} finally {
			setIsLoading(false);
		}
	};

	// Start narrative style refinement
	const handleStartNarrativeStyleRefinement = async () => {
		const trimmed = customNarrativeStyle.trim();
		if (!trimmed) return;

		setNarrativeStyleLoading(true);
		setIsNarrativeStyleRefining(true);

		try {
			const result = await processNarrativeStyleStep(
				apiKey,
				trimmed,
				[],
				language,
				currentStep?.finalConfig?.genre,
				currentStep?.finalConfig?.universeName,
			);

			if (result.isComplete) {
				setNarrativeStyleStep({
					isComplete: true,
					finalStyle: result.finalStyle || trimmed,
				});
			} else {
				setNarrativeStyleStep({
					isComplete: false,
					question: result.question,
					options: result.options,
				});
			}
		} catch (e) {
			console.error('[Narrative Style] Start refinement error:', e);
			setNarrativeStyleStep({
				isComplete: true,
				finalStyle: trimmed,
			});
		} finally {
			setNarrativeStyleLoading(false);
		}
	};

	// Handle answer to narrative style refinement question
	const handleNarrativeStyleAnswer = async (answer: string) => {
		if (!narrativeStyleStep || narrativeStyleStep.isComplete) return;

		const questionAsked = narrativeStyleStep.question || '';
		setNarrativeStyleStep(null);
		setNarrativeStyleInputValue('');
		setIsNarrativeStyleCustomInput(false);
		setNarrativeStyleLoading(true);

		const newHistory = [...narrativeStyleHistory, { question: questionAsked, answer }];
		setNarrativeStyleHistory(newHistory);

		try {
			const result = await processNarrativeStyleStep(
				apiKey,
				customNarrativeStyle.trim(),
				newHistory,
				language,
				currentStep?.finalConfig?.genre,
				currentStep?.finalConfig?.universeName,
			);

			if (result.isComplete) {
				setNarrativeStyleStep({
					isComplete: true,
					finalStyle: result.finalStyle,
				});
			} else {
				setNarrativeStyleStep({
					isComplete: false,
					question: result.question,
					options: result.options,
				});
			}
		} catch (e) {
			console.error('[Narrative Style] Answer error:', e);
			setNarrativeStyleStep({
				isComplete: true,
				finalStyle: customNarrativeStyle.trim(),
			});
		} finally {
			setNarrativeStyleLoading(false);
		}
	};

	// Reset narrative style refinement
	const handleResetNarrativeStyle = () => {
		setIsNarrativeStyleRefining(false);
		setNarrativeStyleStep(null);
		setNarrativeStyleHistory([]);
		setNarrativeStyleInputValue('');
		setIsNarrativeStyleCustomInput(false);
	};

	const handleFinalSubmit = () => {
		if (!currentStep?.isComplete) return;

		if (!currentStep.finalConfig) {
			console.error('Missing finalConfig in completed step');
			alert('Configuration error. Please try again.');
			return;
		}

		const trimmedStyle = customNarrativeStyle.trim();
		if (narrativeStyleMode === 'custom' && !trimmedStyle) {
			alert(t.narrativeStyleRequired || 'Describe your narrative style before continuing.');
			return;
		}

		// Check if custom mode needs refinement
		if (narrativeStyleMode === 'custom' && !isNarrativeStyleRefining && !narrativeStyleStep?.isComplete) {
			handleStartNarrativeStyleRefinement();
			return;
		}

		// Use the refined style if available
		const finalNarrativeStyle =
			narrativeStyleMode === 'custom'
				? narrativeStyleStep?.finalStyle || trimmedStyle
				: undefined;

		// Merge AI config with defaults
		const fullConfig = {
			...currentStep.finalConfig,
			universeType,
			combatStyle: 'descriptive',
			dialogueHeavy: true,
			narrativeStyleMode,
			customNarrativeStyle: finalNarrativeStyle,
			customNarrativeStyleRaw: narrativeStyleMode === 'custom' ? trimmedStyle : undefined,
		};
		onCreate(fullConfig);
	};

	// Check if ready to submit
	const isReadyToSubmit =
		currentStep?.isComplete &&
		(narrativeStyleMode === 'auto' ||
			(narrativeStyleMode === 'custom' && narrativeStyleStep?.isComplete));

	return (
		<div className="fixed inset-0 bg-stone-900/50 z-50 flex items-center justify-center p-0 md:p-4 backdrop-blur-sm">
			<div className="bg-[#f5f5f4] border-0 md:border-2 border-stone-900 w-full md:max-w-2xl flex flex-col h-full md:h-[80vh] shadow-none md:shadow-[12px_12px_0px_rgba(0,0,0,1)]">
				{/* Header */}
				<div className="p-4 md:p-5 border-b-2 border-stone-900 bg-white flex justify-between items-center flex-shrink-0">
					<h2 className="text-lg md:text-xl font-black text-stone-900 flex items-center gap-2 md:gap-3 uppercase tracking-tight">
						<Book className="w-5 h-5 md:w-6 md:h-6" />
						{t.wizTitle}
					</h2>
					<button
						onClick={onCancel}
						className="text-stone-400 hover:text-red-500 transition-colors p-1"
						title={t.cancel}
						aria-label={t.cancel}
					>
						<X className="w-6 h-6" />
					</button>
				</div>

				{/* Content Area */}
				<div className="flex-1 overflow-y-auto p-4 md:p-6 font-mono bg-stone-100 flex flex-col">
					<div className="mb-4">
						<div className="bg-white border-2 border-stone-900 p-4 md:p-5 shadow-[4px_4px_0px_#d6d3d1]">
							<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
								<div>
									<p className="text-xs font-bold uppercase text-stone-500">{t.narrativeStyleHeading}</p>
									<p className="text-[11px] text-stone-500">{t.narrativeStyleHelper}</p>
								</div>
								<div className="flex gap-2">
									<button
										onClick={() => setNarrativeStyleMode('auto')}
										className={`px-3 py-2 border-2 text-[11px] font-bold uppercase tracking-wide transition-colors ${
											narrativeStyleMode === 'auto'
												? 'bg-stone-900 text-white border-stone-900'
												: 'bg-white text-stone-500 border-stone-300 hover:border-stone-900'
										}`}
									>
										{t.narrativeStyleAuto}
									</button>
									<button
										onClick={() => setNarrativeStyleMode('custom')}
										className={`px-3 py-2 border-2 text-[11px] font-bold uppercase tracking-wide transition-colors ${
											narrativeStyleMode === 'custom'
												? 'bg-amber-500 text-white border-amber-600'
												: 'bg-white text-stone-500 border-stone-300 hover:border-amber-500'
										}`}
									>
										{t.narrativeStyleCustom}
									</button>
								</div>
							</div>
							{narrativeStyleMode === 'custom' && !isNarrativeStyleRefining && (
								<div className="mt-4 space-y-3">
									<div className="flex gap-3 bg-amber-50 border-2 border-amber-200 p-3">
										<Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
										<div>
											<p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">
												{t.narrativeStyleInfoTitle}
											</p>
											<p className="text-[11px] text-amber-800 leading-snug">{t.narrativeStyleInfoBody}</p>
										</div>
									</div>
									<div className="relative">
										<textarea
											value={customNarrativeStyle}
											onChange={(e) => setCustomNarrativeStyle(e.target.value)}
											className="w-full bg-stone-50 border-2 border-stone-400 p-3 pr-12 text-sm text-stone-900 focus:border-amber-500 outline-none min-h-[100px]"
											placeholder={t.narrativeStylePlaceholder}
										></textarea>
										<div className="absolute right-3 top-3">
											<VoiceInput
												apiKey={apiKey}
												language={language}
												onTranscription={(text) => setCustomNarrativeStyle((prev) => (prev ? `${prev} ${text}` : text))}
												className="text-stone-400 hover:text-amber-600"
											/>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Phase 1: Selection */}
					{!started && (
						<div className="flex-1 flex flex-col justify-center space-y-6 md:space-y-8 animate-fade-in">
							<div className="text-center">
								<h3 className="text-xl md:text-2xl font-bold uppercase mb-2">{t.wizWorld}</h3>
								<p className="text-stone-500 text-sm md:text-base">Select source data for world generation.</p>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
								<button
									onClick={() => handleStart('original')}
									className="p-4 md:p-6 border-2 border-stone-400 bg-white hover:border-stone-900 active:bg-stone-50 hover:shadow-[4px_4px_0px_#1c1917] transition-all group text-left"
								>
									<Sparkles className="w-6 h-6 md:w-8 md:h-8 mb-3 md:mb-4 text-stone-400 group-hover:text-yellow-600" />
									<div className="font-bold text-base md:text-lg uppercase mb-1">{t.wizOriginal}</div>
									<div className="text-xs text-stone-500">{t.wizOriginalDesc}</div>
								</button>

								<button
									onClick={() => handleStart('existing')}
									className="p-4 md:p-6 border-2 border-stone-400 bg-white hover:border-stone-900 active:bg-stone-50 hover:shadow-[4px_4px_0px_#1c1917] transition-all group text-left"
								>
									<Database className="w-6 h-6 md:w-8 md:h-8 mb-3 md:mb-4 text-stone-400 group-hover:text-blue-600" />
									<div className="font-bold text-base md:text-lg uppercase mb-1">{t.wizExisting}</div>
									<div className="text-xs text-stone-500">{t.wizExistingDesc}</div>
								</button>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
								{prepChecklist.map((item) => (
									<div key={item.title} className="p-3 border-2 border-dashed border-stone-400 bg-white text-left">
										<p className="text-xs font-bold uppercase tracking-wide text-stone-600">{item.title}</p>
										<p className="text-[11px] text-stone-500 mt-1">{item.helper}</p>
									</div>
								))}
							</div>

							<div className="border-2 border-stone-900 bg-white p-3">
								<div className="grid grid-cols-2 gap-2 text-[11px] md:text-xs font-bold uppercase tracking-tight text-stone-500">
									{systemDialSpecs.map((label) => (
										<span key={label} className="flex items-center gap-1">
											<ArrowRight className="w-3 h-3" /> {label}
										</span>
									))}
								</div>
								<p className="text-[10px] text-stone-500 mt-3">{t.wizNote}</p>
							</div>
						</div>
					)}

					{/* Phase 2: Collaborative Chat */}
					{started && (
						<div className="flex-1 flex flex-col space-y-4">
							{/* Chat History */}
							<div className="flex-1 space-y-6 pb-4">
								{history.map((item, idx) => (
									<div key={idx} className="space-y-2 animate-fade-in">
										<div className="flex gap-3">
											<div className="w-8 h-8 bg-stone-200 border border-stone-400 flex items-center justify-center flex-shrink-0">
												<MessageSquare className="w-4 h-4 text-stone-500" />
											</div>
											<div className="bg-white border border-stone-300 p-3 text-stone-800 rounded-tr-lg rounded-br-lg rounded-bl-lg shadow-sm">
												{item.question}
											</div>
										</div>
										<div
											className="flex gap-3 justify-end"
											onMouseEnter={() => !isLoading && editingIndex === null && setHoveringIndex(idx)}
											onMouseLeave={() => setHoveringIndex(null)}
										>
											{editingIndex === idx ? (
												// Edit mode
												<div className="flex flex-col gap-2 w-full max-w-[80%]">
													<textarea
														value={editValue}
														onChange={(e) => setEditValue(e.target.value)}
														onKeyDown={(e) => {
															if (e.key === 'Enter' && !e.shiftKey && editValue.trim()) {
																e.preventDefault();
																handleConfirmEdit();
															}
															if (e.key === 'Escape') {
																handleCancelEdit();
															}
														}}
														className="w-full bg-stone-50 border-2 border-amber-500 p-3 text-stone-900 focus:border-amber-600 outline-none text-sm font-bold resize-none"
														rows={2}
														autoFocus
													/>
													<div className="flex gap-2 justify-end">
														<button
															onClick={handleCancelEdit}
															className="px-3 py-1.5 border-2 border-stone-300 bg-white hover:border-stone-500 text-stone-600 text-xs font-bold uppercase transition-colors flex items-center gap-1"
														>
															<X className="w-3 h-3" />
															{t.cancel}
														</button>
														<button
															onClick={handleConfirmEdit}
															disabled={!editValue.trim()}
															className="px-3 py-1.5 border-2 border-amber-500 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold uppercase transition-colors flex items-center gap-1 disabled:opacity-50"
														>
															<Check className="w-3 h-3" />
															{t.confirm || 'Confirm'}
														</button>
													</div>
												</div>
											) : (
												// Display mode with edit button on hover
												<div className="relative group">
													<div className="bg-stone-800 text-white p-3 border border-stone-900 rounded-tl-lg rounded-bl-lg rounded-br-lg shadow-sm font-bold">
														{item.answer}
													</div>
													{hoveringIndex === idx && !isLoading && (
														<button
															onClick={() => handleStartEdit(idx)}
															className="absolute -top-2 -right-2 w-7 h-7 bg-amber-500 hover:bg-amber-600 text-white rounded-full flex items-center justify-center shadow-md transition-all transform hover:scale-110 border-2 border-white"
															title={t.edit || 'Edit'}
														>
															<Edit3 className="w-3.5 h-3.5" />
														</button>
													)}
												</div>
											)}
										</div>
									</div>
								))}

								{/* Current Question (AI) */}
								{currentStep && !currentStep.isComplete && (
									<div className="flex gap-3 animate-fade-in">
										<div className="w-8 h-8 bg-stone-900 border border-stone-900 flex items-center justify-center flex-shrink-0 text-white">
											<Sparkles className="w-4 h-4" />
										</div>
										<div className="bg-white border-2 border-stone-900 p-4 text-stone-900 shadow-[4px_4px_0px_#e7e5e4] text-lg font-bold">
											{currentStep.question}
										</div>
									</div>
								)}

								{isLoading && (
									<div className="flex gap-3 animate-pulse">
										<div className="w-8 h-8 bg-stone-200 border border-stone-400 flex items-center justify-center flex-shrink-0">
											<Loader2 className="w-4 h-4 animate-spin text-stone-500" />
										</div>
										<div className="text-stone-400 italic text-sm py-2 flex items-center gap-2">
											System processing...
										</div>
									</div>
								)}

								<div ref={messagesEndRef} />
							</div>

							{/* Completion Screen with Narrative Style Refinement */}
							{currentStep?.isComplete && (
								<div className="space-y-4 animate-fade-in">
									{/* World Configuration Complete */}
									<div className="bg-green-100 border-2 border-green-700 p-4 text-center">
										<Check className="w-10 h-10 text-green-700 mx-auto mb-2" />
										<h3 className="font-bold text-green-800 text-lg uppercase">
											{t.configComplete || 'World Configuration Complete'}
										</h3>
										<p className="text-green-700 text-sm">
											{t.worldGenerated || 'The world has been generated successfully.'}
										</p>
									</div>

									{/* Narrative Style Refinement Flow (only for custom mode) */}
									{narrativeStyleMode === 'custom' && customNarrativeStyle.trim() && (
										<div className="border-3 border-amber-400 bg-amber-50 p-4 space-y-4">
											{/* Header */}
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2 text-amber-800">
													<Sparkles className="w-5 h-5" />
													<span className="font-black uppercase text-sm">
														{t.narrativeStyleRefiningTitle || 'Refining Your Style'}
													</span>
												</div>
												{isNarrativeStyleRefining && (
													<button
														onClick={handleResetNarrativeStyle}
														className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-bold uppercase"
													>
														<RotateCcw className="w-3 h-3" />
														{t.reset || 'Reset'}
													</button>
												)}
											</div>

											{/* Original Description */}
											<div className="bg-white border-2 border-amber-200 p-3">
												<span className="text-[10px] font-bold uppercase text-amber-600 block mb-1">
													{t.narrativeStyleYourDescription || 'Your description'}
												</span>
												<p className="text-sm text-stone-700">{customNarrativeStyle}</p>
											</div>

											{/* Refinement History */}
											{narrativeStyleHistory.map((item, idx) => (
												<div key={idx} className="space-y-2">
													<div className="flex gap-2">
														<div className="w-7 h-7 bg-amber-200 border-2 border-amber-400 flex items-center justify-center flex-shrink-0">
															<MessageSquare className="w-4 h-4 text-amber-700" />
														</div>
														<div className="bg-white border-2 border-amber-200 p-3 text-sm text-stone-700 flex-1">
															{item.question}
														</div>
													</div>
													<div className="flex gap-2 justify-end">
														<div className="bg-amber-600 text-white p-3 text-sm font-bold max-w-[80%]">
															{item.answer}
														</div>
													</div>
												</div>
											))}

											{/* Current Question */}
											{narrativeStyleStep && !narrativeStyleStep.isComplete && (
												<div className="flex gap-2">
													<div className="w-7 h-7 bg-amber-600 border-2 border-amber-700 flex items-center justify-center flex-shrink-0 text-white">
														<Sparkles className="w-4 h-4" />
													</div>
													<div className="bg-white border-3 border-amber-600 p-3 text-stone-900 font-bold flex-1">
														{narrativeStyleStep.question}
													</div>
												</div>
											)}

											{/* Loading */}
											{narrativeStyleLoading && (
												<div className="flex gap-2 items-center">
													<div className="w-7 h-7 bg-amber-200 border-2 border-amber-400 flex items-center justify-center flex-shrink-0">
														<Loader2 className="w-4 h-4 animate-spin text-amber-600" />
													</div>
													<span className="text-amber-600 italic text-sm">
														{t.narrativeStyleAnalyzing || 'Analyzing your style...'}
													</span>
												</div>
											)}

											{/* Complete */}
											{narrativeStyleStep?.isComplete && (
												<div className="bg-green-100 border-3 border-green-600 p-4">
													<div className="flex items-center gap-2 text-green-800 mb-3">
														<Check className="w-5 h-5" />
														<span className="font-black uppercase text-sm">
															{t.narrativeStyleComplete || 'Style Defined'}
														</span>
													</div>
													<div className="bg-white border-2 border-green-200 p-3 text-xs text-stone-600 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
														{narrativeStyleStep.finalStyle}
													</div>
												</div>
											)}

											{/* Options for current question */}
											{narrativeStyleStep && !narrativeStyleStep.isComplete && narrativeStyleStep.options && !narrativeStyleLoading && (
												<div className="space-y-2">
													{!isNarrativeStyleCustomInput ? (
														<div className="grid grid-cols-1 gap-2">
															{narrativeStyleStep.options.map((opt, idx) => (
																<button
																	key={idx}
																	onClick={() => handleNarrativeStyleAnswer(opt)}
																	disabled={narrativeStyleLoading}
																	className="p-3 border-2 border-amber-300 bg-white hover:border-amber-600 hover:bg-amber-50 text-left font-bold text-sm transition-all disabled:opacity-50"
																>
																	{opt}
																</button>
															))}
															<button
																onClick={() => setIsNarrativeStyleCustomInput(true)}
																disabled={narrativeStyleLoading}
																className="p-3 border-2 border-dashed border-amber-400 bg-white hover:border-amber-600 text-left font-bold text-sm flex items-center gap-2 text-amber-700"
															>
																<Edit3 className="w-4 h-4" />
																{t.otherOption || 'Other...'}
															</button>
														</div>
													) : (
														<div className="space-y-2">
															<button
																onClick={() => {
																	setIsNarrativeStyleCustomInput(false);
																	setNarrativeStyleInputValue('');
																}}
																className="flex items-center gap-2 text-amber-600 hover:text-amber-800 text-xs font-bold uppercase"
															>
																<ArrowLeft className="w-3 h-3" />
																{t.backToOptions || 'Back to options'}
															</button>
															<div className="flex gap-2">
																<div className="relative flex-1">
																	<textarea
																		rows={2}
																		value={narrativeStyleInputValue}
																		onChange={(e) => setNarrativeStyleInputValue(e.target.value)}
																		onKeyDown={(e) => {
																			if (e.key === 'Enter' && !e.shiftKey && narrativeStyleInputValue.trim()) {
																				e.preventDefault();
																				handleNarrativeStyleAnswer(narrativeStyleInputValue);
																			}
																		}}
																		className="w-full bg-white border-2 border-amber-400 p-3 pr-10 text-sm text-stone-900 focus:border-amber-600 outline-none"
																		placeholder={t.typeYourAnswer || 'Type your answer...'}
																		disabled={narrativeStyleLoading}
																		autoFocus
																	/>
																	<div className="absolute right-2 top-2">
																		<VoiceInput
																			apiKey={apiKey}
																			language={language}
																			onTranscription={(text) => setNarrativeStyleInputValue(text)}
																			className="text-amber-400 hover:text-amber-600"
																		/>
																	</div>
																</div>
																<button
																	onClick={() => handleNarrativeStyleAnswer(narrativeStyleInputValue)}
																	disabled={!narrativeStyleInputValue.trim() || narrativeStyleLoading}
																	className="bg-amber-600 text-white px-4 font-bold disabled:opacity-50 hover:bg-amber-700 transition-colors"
																>
																	<ArrowRight className="w-5 h-5" />
																</button>
															</div>
														</div>
													)}
												</div>
											)}

											{/* Start refinement button (shown when not yet started) */}
											{!isNarrativeStyleRefining && !narrativeStyleStep && (
												<button
													onClick={handleStartNarrativeStyleRefinement}
													disabled={narrativeStyleLoading}
													className="w-full py-3 bg-amber-500 text-white font-black uppercase tracking-wide hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 border-2 border-amber-600"
												>
													{narrativeStyleLoading ? (
														<Loader2 className="w-5 h-5 animate-spin" />
													) : (
														<Sparkles className="w-5 h-5" />
													)}
													{t.narrativeStyleRefineBtn || 'Refine Style'}
												</button>
											)}
										</div>
									)}

									{/* Final Submit Button */}
									<button
										onClick={handleFinalSubmit}
										disabled={isCreating || narrativeStyleLoading || !isReadyToSubmit}
										className="w-full py-4 bg-green-700 text-white font-black uppercase tracking-widest hover:bg-green-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-green-800"
									>
										{(isCreating || narrativeStyleLoading) && <Loader2 className="w-5 h-5 animate-spin" />}
										{narrativeStyleMode === 'custom' && !narrativeStyleStep?.isComplete
											? t.narrativeStyleRefineAndStart || 'Refine Style & Start'
											: t.startJourney}
									</button>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Input Area (Only visible during active conversation and NOT loading) */}
				{started && currentStep && !currentStep.isComplete && !isLoading && (
					<div className="p-3 md:p-4 bg-white border-t-2 border-stone-900 flex flex-col gap-3 animate-slide-up flex-shrink-0">
						{currentStep.controlType === 'select' && currentStep.options && !isCustomInput ? (
							<div className="relative">
								{/* Label for mobile */}
								<div className="md:hidden flex items-center justify-between mb-2 px-1">
									<span className="text-xs font-bold uppercase text-stone-500">Escolha uma opcao</span>
									{currentStep.options.length > 3 && (
										<span className="text-xs text-stone-400 flex items-center gap-1">
											<ChevronDown className="w-3 h-3 animate-bounce" />
											scroll
										</span>
									)}
								</div>
								{/* Options container */}
								<div className="max-h-[35vh] md:max-h-none overflow-y-auto scrollbar-hide rounded-lg md:rounded-none">
									<div className="grid grid-cols-1 gap-2 p-1 md:p-0">
										{currentStep.options.map((opt) => (
											<button
												key={opt}
												onClick={() => handleAnswer(opt)}
												disabled={isLoading}
												className="p-3 border-2 border-stone-300 bg-white hover:border-stone-900 hover:bg-stone-100 active:bg-stone-200 text-left font-bold uppercase transition-all text-sm md:text-base"
											>
												{opt}
											</button>
										))}
										{/* Other option button */}
										<button
											onClick={() => setIsCustomInput(true)}
											disabled={isLoading}
											className="p-3 border-2 border-dashed border-stone-400 bg-stone-50 hover:border-stone-900 hover:bg-stone-100 active:bg-stone-200 text-left font-bold uppercase transition-all text-sm md:text-base flex items-center gap-2 text-stone-600"
										>
											<Edit3 className="w-4 h-4" />
											{t.otherOption}
										</button>
									</div>
								</div>
							</div>
						) : (
							<div className="flex flex-col gap-2">
								{/* Back to options button (only shown when in custom input mode from select) */}
								{isCustomInput && currentStep.controlType === 'select' && (
									<button
										onClick={() => {
											setIsCustomInput(false);
											setInputValue('');
										}}
										className="flex items-center gap-2 text-stone-500 hover:text-stone-900 text-sm font-bold uppercase transition-colors self-start"
									>
										<ArrowLeft className="w-4 h-4" />
										{t.backToOptions}
									</button>
								)}
								<div className="relative group flex gap-2">
									<div className="relative flex-1">
										<textarea
											rows={3}
											value={inputValue}
											onChange={(e) => {
												setInputValue(e.target.value);
												// Auto-resize textarea
												e.target.style.height = 'auto';
												e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
											}}
											onKeyDown={(e) => {
												if (e.key === 'Enter' && !e.shiftKey && inputValue.trim()) {
													e.preventDefault();
													handleAnswer(inputValue);
												}
											}}
											className="w-full bg-stone-50 border-2 border-stone-400 p-2.5 md:p-3 pr-10 md:pr-12 text-stone-900 focus:border-stone-900 outline-none text-base md:text-lg font-mono shadow-inner resize-none overflow-y-auto"
											style={{ minHeight: '80px', maxHeight: '150px' }}
											placeholder={t.typeYourAnswer}
											disabled={isLoading}
											autoFocus
										/>
										<div className="absolute right-2 top-2.5 md:top-3">
											<VoiceInput
												apiKey={apiKey}
												language={language}
												onTranscription={(text) => setInputValue(text)}
												className="text-stone-400 hover:text-stone-900"
											/>
										</div>
									</div>
									<button
										onClick={() => handleAnswer(inputValue)}
										disabled={!inputValue.trim() || isLoading}
										className="bg-stone-900 text-white px-4 md:px-6 font-bold uppercase disabled:opacity-50 hover:bg-stone-700 active:bg-stone-800 transition-colors"
									>
										<ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
									</button>
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};
