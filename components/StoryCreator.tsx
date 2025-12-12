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
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/locales';
import { VoiceInput } from './VoiceInput';
import { processOnboardingStep } from '../services/ai/openaiClient';

interface StoryCreatorProps {
	onCreate: (config: any) => Promise<void>;
	isCreating: boolean;
	onCancel: () => void;
	language: Language;
}

interface OnboardingStep {
	question: string;
	controlType: 'text' | 'select' | 'finish';
	options?: string[];
	isComplete: boolean;
	finalConfig?: any;
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
	}, [history, currentStep, isLoading]);

	// Initial Step: Trigger AI or Manual Input based on selection
	const handleStart = async (type: 'original' | 'existing') => {
		setUniverseType(type);
		setStarted(true);

		if (type === 'existing') {
			// For existing universes, do NOT query AI first. Ask manually.
			const manualQuestion =
				language === 'pt'
					? 'Qual é o nome do Universo onde você quer jogar?'
					: language === 'es'
					? '¿Cuál es el nombre del universo donde quieres jugar?'
					: 'What is the name of the Universe you want to play in?';

			setCurrentStep({
				question: manualQuestion,
				controlType: 'text',
				isComplete: false,
			});
		} else {
			// Original universe: Ask AI for suggestions or theme
			setIsLoading(true);
			try {
				const step = await processOnboardingStep(apiKey, [], type, language);
				setCurrentStep(step);
			} catch (e) {
				console.error(e);
				alert('Failed to initialize AI Agent.');
			} finally {
				setIsLoading(false);
			}
		}
	};

	const handleAnswer = async (answer: string) => {
		if (!currentStep) return;

		// 1. Capture current context before clearing
		const questionAsked = currentStep.question;

		// 2. Immediately clear current step to remove UI (Select/Input)
		setCurrentStep(null);
		setInputValue('');
		setIsCustomInput(false);
		setIsLoading(true);

		// 3. Update History
		const newHistory = [...history, { question: questionAsked, answer }];
		setHistory(newHistory);

		try {
			// 4. Get next step from AI
			const nextStep = await processOnboardingStep(apiKey, newHistory, universeType, language);
			setCurrentStep(nextStep);
		} catch (e) {
			console.error(e);
			alert('AI Agent Connection Lost.');
			// If error, maybe restore previous step so user can try again,
			// but for now simple alert.
		} finally {
			setIsLoading(false);
		}
	};

	const handleFinalSubmit = () => {
		if (currentStep?.isComplete && currentStep.finalConfig) {
			// Merge AI config with defaults
			const fullConfig = {
				...currentStep.finalConfig,
				universeType,
				combatStyle: 'descriptive',
				dialogueHeavy: true,
			};
			onCreate(fullConfig);
		}
	};

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
										<div className="flex gap-3 justify-end">
											<div className="bg-stone-800 text-white p-3 border border-stone-900 rounded-tl-lg rounded-bl-lg rounded-br-lg shadow-sm font-bold">
												{item.answer}
											</div>
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

							{/* Completion Screen */}
							{currentStep?.isComplete && (
								<div className="bg-green-100 border-2 border-green-800 p-6 text-center animate-fade-in mb-4">
									<Check className="w-12 h-12 text-green-800 mx-auto mb-2" />
									<h3 className="font-bold text-green-900 text-xl uppercase">Configuration Complete</h3>
									<p className="text-green-800 text-sm mb-4">The world has been generated successfully.</p>
									<button
										onClick={handleFinalSubmit}
										disabled={isCreating}
										className="w-full py-4 bg-green-800 text-white font-bold uppercase tracking-widest hover:bg-green-900 transition-colors flex items-center justify-center gap-2"
									>
										{isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
										{t.startJourney}
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
