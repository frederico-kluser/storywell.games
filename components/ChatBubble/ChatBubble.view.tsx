import React, { useState, useEffect, useRef } from 'react';
import { MessageType, ChatMessage, Language } from '../../types';
import { Terminal, Info, Play, Loader2, StopCircle } from 'lucide-react';
import { generateSpeech } from '../../services/ai/openaiClient';
import { playMP3Audio, TTSVoice } from '../../utils/ai';

export interface ChatBubbleProps {
	message: ChatMessage;
	isPlayer: boolean;
	senderName: string;
	avatarBase64?: string;
	avatarUrl?: string;
	apiKey?: string;
	skipAnimation?: boolean; // Skip typewriter for old messages
	onTypingComplete?: () => void; // Callback when typing animation finishes
	selectedVoice?: TTSVoice; // User's preferred TTS voice
	useTone?: boolean; // Whether to use tone instructions (default true)
	onAvatarClick?: (imageSrc: string, name: string) => void; // Callback when avatar is clicked for zoom
	language?: Language;
}

/**
 * Visual component for displaying a single chat message.
 * Handles styling for Player vs NPC vs System/Narration.
 * Includes Typewriter effect and Text-to-Speech playback.
 */
export const ChatBubbleView: React.FC<ChatBubbleProps> = ({
	message,
	isPlayer,
	senderName,
	avatarBase64,
	avatarUrl,
	apiKey,
	skipAnimation = false,
	onTypingComplete,
	selectedVoice,
	useTone = true,
	onAvatarClick,
	language = 'en',
}) => {
	const isNarrator = message.senderId === 'GM' && message.type === MessageType.NARRATION;
	const isSystem = message.type === MessageType.SYSTEM || message.senderId === 'SYSTEM';

	// State for Typewriter Effect
	const [displayedText, setDisplayedText] = useState('');
	const [isTyping, setIsTyping] = useState(true);

	// State for Audio Playback
	const [isPlaying, setIsPlaying] = useState(false);
	const [isLoadingAudio, setIsLoadingAudio] = useState(false);

	// Refs to prevent multiple callback calls and store latest callback
	const hasCalledCompleteRef = useRef(false);
	const onTypingCompleteRef = useRef(onTypingComplete);

	// Keep ref updated with latest callback
	useEffect(() => {
		onTypingCompleteRef.current = onTypingComplete;
	}, [onTypingComplete]);

	// Reset hasCalledComplete when message changes
	useEffect(() => {
		hasCalledCompleteRef.current = false;
	}, [message.id]);

	// Typewriter Logic
	useEffect(() => {
		const fullText = message.text || '';

		// Skip animation for old messages - show instantly
		if (skipAnimation) {
			setDisplayedText(fullText);
			setIsTyping(false);
			// Call callback only once
			if (!hasCalledCompleteRef.current) {
				hasCalledCompleteRef.current = true;
				onTypingCompleteRef.current?.();
			}
			return;
		}

		setDisplayedText(''); // Reset on text change
		setIsTyping(true);

		const interval = setInterval(() => {
			// Speed: 20ms for comfortable reading (approx 50 chars/sec)
			setDisplayedText((prev) => {
				if (prev.length < fullText.length) {
					return prev + fullText.charAt(prev.length);
				} else {
					clearInterval(interval);
					setIsTyping(false);
					// Call onTypingComplete when animation finishes (only once)
					if (!hasCalledCompleteRef.current) {
						hasCalledCompleteRef.current = true;
						onTypingCompleteRef.current?.();
					}
					return prev;
				}
			});
		}, 20);

		return () => clearInterval(interval);
	}, [message.text, message.id, skipAnimation]);

	// Get avatar source (prefer base64 for IndexedDB persistence, fallback to URL)
	const getAvatarSrc = () => {
		if (avatarBase64) {
			// If already a data URI, use directly; otherwise add prefix
			return avatarBase64.startsWith('data:') ? avatarBase64 : `data:image/png;base64,${avatarBase64}`;
		}
		if (avatarUrl) return avatarUrl;
		return null;
	};

	const avatarSrc = getAvatarSrc();

	// Handle avatar click for zoom modal
	const handleAvatarClick = () => {
		if (avatarSrc && onAvatarClick) {
			onAvatarClick(avatarSrc, senderName);
		}
	};

	// Audio Playback Handler
	const handlePlayAudio = async () => {
		if (!apiKey) {
			alert('API Key missing');
			return;
		}

		if (isPlaying || isLoadingAudio) {
			return;
		}

		setIsLoadingAudio(true);
		try {
			// Determine voice type based on message context
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

	// Play Button Component
	const PlayButton = () => (
		<button
			onClick={handlePlayAudio}
			disabled={isLoadingAudio || isPlaying || isTyping || !apiKey}
			className={`absolute top-2 right-2 p-1.5 rounded-full transition-colors border ${
				isPlayer
					? 'border-stone-700 text-stone-400 hover:text-white hover:bg-stone-700'
					: 'border-stone-200 text-stone-400 hover:text-stone-900 hover:bg-stone-100'
			} disabled:opacity-30`}
			title="Read Aloud"
		>
			{isLoadingAudio ? (
				<Loader2 className="w-4 h-4 animate-spin" />
			) : isPlaying ? (
				<StopCircle className="w-4 h-4 animate-pulse text-green-500" />
			) : (
				<Play className="w-4 h-4" />
			)}
		</button>
	);

	// --- RENDERERS ---

	if (isSystem) {
		return (
			<div className="flex justify-center my-4 md:my-6 animate-fade-in w-full px-2 md:px-0">
				<div className="w-full max-w-3xl bg-blue-50/80 text-blue-900 px-4 md:px-6 py-3 md:py-4 border border-blue-200 text-xs md:text-sm font-mono tracking-wide rounded-md shadow-sm relative">
					<div className="flex items-center gap-2 font-bold mb-1 text-blue-700 uppercase text-[10px] md:text-xs">
						<Info className="w-3 h-3 md:w-4 md:h-4" /> SYSTEM
					</div>
					<p className="leading-relaxed whitespace-pre-wrap">{displayedText}</p>
				</div>
			</div>
		);
	}

	if (isNarrator) {
		return (
			<div className="flex justify-center my-4 md:my-8 animate-fade-in w-full">
				<div className="w-full bg-[#fafaf9] text-stone-800 px-4 md:px-8 py-4 md:py-8 border-y-2 border-stone-300 text-center font-mono tracking-wide relative group">
					<div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#fafaf9] px-3 md:px-4 border border-stone-300 text-[10px] md:text-xs font-bold uppercase text-stone-500 flex items-center gap-1 md:gap-2 rounded-full">
						<Terminal className="w-3 h-3" /> NARRATOR
					</div>
					<PlayButton />
					<div className="max-w-4xl mx-auto leading-relaxed text-base md:text-lg font-serif italic text-stone-700 min-h-[2rem]">
						<span className="text-2xl md:text-3xl text-stone-300 leading-none align-middle mr-1 md:mr-2">&ldquo;</span>
						{displayedText}
						{isTyping && <span className="animate-pulse">|</span>}
						<span className="text-2xl md:text-3xl text-stone-300 leading-none align-middle ml-1 md:ml-2">&rdquo;</span>
					</div>
				</div>
			</div>
		);
	}

	// Character dialogue - responsive layout (avatar on top for mobile, side for desktop)
	return (
		<div
			className={`flex flex-col md:flex-row w-full mt-4 md:mt-8 md:space-x-6 max-w-5xl mx-auto px-2 md:px-0 ${
				isPlayer ? 'items-end md:justify-end' : 'items-start md:justify-start'
			}`}
		>
			{/* Avatar - shown on top for mobile */}
			<div
				className={`flex-shrink-0 flex md:flex-col items-center gap-2 mb-2 md:mb-0 md:mt-2 ${
					isPlayer ? 'flex-row-reverse md:flex-col order-first md:order-last' : 'flex-row md:flex-col'
				}`}
			>
				<div
					onClick={avatarSrc ? handleAvatarClick : undefined}
					className={`h-10 w-10 md:h-16 md:w-16 flex items-center justify-center border-2 border-stone-900 shadow-[2px_2px_0px_#a8a29e] md:shadow-[4px_4px_0px_#a8a29e] overflow-hidden relative ${
						isPlayer ? 'bg-stone-200' : 'bg-white'
					} ${avatarSrc ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
				>
					{avatarSrc ? (
						<img src={avatarSrc} alt={senderName} className="w-full h-full object-cover" />
					) : (
						<span className={`text-lg md:text-2xl font-bold ${isPlayer ? 'text-stone-500' : 'text-stone-800'}`}>
							{isPlayer ? 'YOU' : senderName.substring(0, 1).toUpperCase()}
						</span>
					)}
				</div>
				<span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest max-w-[80px] truncate">
					{isPlayer ? 'PLAYER' : senderName}
				</span>
			</div>

			{/* Message bubble */}
			<div className={`relative w-full md:max-w-[70%]`}>
				<div
					className={`relative px-4 md:px-8 py-4 md:py-6 border-2 shadow-[4px_4px_0px_rgba(0,0,0,0.1)] md:shadow-[6px_6px_0px_rgba(0,0,0,0.1)] min-h-[3rem] md:min-h-[4rem] ${
						isPlayer ? 'bg-stone-800 border-stone-900 text-white' : 'bg-white border-stone-300 text-stone-900'
					}`}
				>
					<PlayButton />
					<p className="text-base md:text-xl leading-relaxed whitespace-pre-wrap font-mono pr-8">
						{displayedText}
						{isTyping && <span className="animate-pulse">_</span>}
					</p>
				</div>

				{/* Arrow pointer - hidden on mobile, shown on desktop */}
				<div
					className={`hidden md:block absolute top-6 w-4 h-4 border-t-2 border-l-2 transform rotate-45 ${
						isPlayer ? 'bg-stone-800 border-stone-900 -right-2.5' : 'bg-white border-stone-300 -left-2.5'
					}`}
				></div>
			</div>
		</div>
	);
};
