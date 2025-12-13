import React, { useState } from 'react';
import { X, Settings, Volume2, Trash2, Key, AlertTriangle, Loader2, Edit3, Palette } from 'lucide-react';

interface SettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	onOpenVoiceSettings: () => void;
	onOpenNarrativeStyle: () => void;
	onOpenThemeColors: () => void;
	onDeleteDatabase: () => Promise<void>;
	onDeleteApiKey: () => void;
	canEditNarrativeStyle: boolean;
	canEditThemeColors: boolean;
	t: Record<string, string>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
	isOpen,
	onClose,
	onOpenVoiceSettings,
	onOpenNarrativeStyle,
	onOpenThemeColors,
	onDeleteDatabase,
	onDeleteApiKey,
	canEditNarrativeStyle,
	canEditThemeColors,
	t,
}) => {
	const [showDeleteDbConfirm, setShowDeleteDbConfirm] = useState(false);
	const [showDeleteKeyConfirm, setShowDeleteKeyConfirm] = useState(false);
	const [isDeletingDb, setIsDeletingDb] = useState(false);

	if (!isOpen) return null;

	const handleOpenVoiceSettings = () => {
		onClose();
		onOpenVoiceSettings();
	};

	const handleOpenNarrativeStyle = () => {
		if (!canEditNarrativeStyle) return;
		onClose();
		onOpenNarrativeStyle();
	};

	const handleOpenThemeColors = () => {
		if (!canEditThemeColors) return;
		onClose();
		onOpenThemeColors();
	};

	const handleDeleteDatabase = async () => {
		setIsDeletingDb(true);
		try {
			await onDeleteDatabase();
			setShowDeleteDbConfirm(false);
			onClose();
		} catch (error) {
			console.error('Failed to delete database:', error);
		} finally {
			setIsDeletingDb(false);
		}
	};

	const handleDeleteApiKey = () => {
		onDeleteApiKey();
		setShowDeleteKeyConfirm(false);
		onClose();
	};

	return (
		<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
			<div className="bg-[#f5f5f4] border-2 border-stone-900 w-full max-w-md shadow-[12px_12px_0px_rgba(0,0,0,1)] relative">
				{/* Header */}
				<div className="p-5 border-b-2 border-stone-900 bg-stone-800 flex justify-between items-center">
					<h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
						<Settings className="w-6 h-6" />
						{t.settings || 'Settings'}
					</h2>
					<button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
						<X className="w-6 h-6" />
					</button>
				</div>

				{/* Content */}
				<div className="p-4 space-y-3">
					{/* Narrative Style Option */}
					<button
						onClick={handleOpenNarrativeStyle}
						className={`w-full p-4 border-2 bg-white transition-all flex items-center gap-4 group ${
							canEditNarrativeStyle
								? 'border-stone-300 hover:border-stone-900'
								: 'border-dashed border-stone-200 cursor-not-allowed opacity-60'
						}`}
						disabled={!canEditNarrativeStyle}
					>
						<div
							className={`w-12 h-12 flex items-center justify-center transition-colors ${
								canEditNarrativeStyle ? 'bg-stone-100 group-hover:bg-stone-200' : 'bg-stone-50'
							}`}
						>
							<Edit3 className="w-6 h-6 text-stone-700" />
						</div>
						<div className="text-left flex-1">
							<h3 className="font-bold uppercase text-stone-900">
								{t.settingsNarrativeStyle || 'Edit Narrative Style'}
							</h3>
							<p className="text-xs text-stone-500">
								{canEditNarrativeStyle
									? t.settingsNarrativeStyleDesc || 'Adjust tone presets or inject a custom writing brief.'
									: t.settingsNarrativeStyleDisabled || 'Start a story to edit its narrative tone.'}
							</p>
						</div>
					</button>

					{/* Theme Colors Option */}
					<button
						onClick={handleOpenThemeColors}
						className={`w-full p-4 border-2 bg-white transition-all flex items-center gap-4 group ${
							canEditThemeColors
								? 'border-stone-300 hover:border-stone-900'
								: 'border-dashed border-stone-200 cursor-not-allowed opacity-60'
						}`}
						disabled={!canEditThemeColors}
					>
						<div
							className={`w-12 h-12 flex items-center justify-center transition-colors ${
								canEditThemeColors ? 'bg-stone-100 group-hover:bg-stone-200' : 'bg-stone-50'
							}`}
						>
							<Palette className="w-6 h-6 text-stone-700" />
						</div>
						<div className="text-left flex-1">
							<h3 className="font-bold uppercase text-stone-900">
								{t.settingsThemeColors || 'Theme Colors'}
							</h3>
							<p className="text-xs text-stone-500">
								{canEditThemeColors
									? t.settingsThemeColorsDesc || 'Customize colors, fonts and text size.'
									: t.settingsThemeColorsDisabled || 'Start a story to customize its theme.'}
							</p>
						</div>
					</button>

					{/* Voice Settings Option */}
					<button
						onClick={handleOpenVoiceSettings}
						className="w-full p-4 border-2 border-stone-300 bg-white hover:border-stone-900 transition-all flex items-center gap-4 group"
					>
						<div className="w-12 h-12 bg-stone-100 flex items-center justify-center group-hover:bg-stone-200 transition-colors">
							<Volume2 className="w-6 h-6 text-stone-700" />
						</div>
						<div className="text-left flex-1">
							<h3 className="font-bold uppercase text-stone-900">{t.settingsVoice || 'Voice Settings'}</h3>
							<p className="text-xs text-stone-500">{t.settingsVoiceDesc || 'Configure TTS voice and tone options'}</p>
						</div>
					</button>

					{/* Delete Database Option */}
					{!showDeleteDbConfirm ? (
						<button
							onClick={() => setShowDeleteDbConfirm(true)}
							className="w-full p-4 border-2 border-stone-300 bg-white hover:border-red-500 transition-all flex items-center gap-4 group"
						>
							<div className="w-12 h-12 bg-stone-100 flex items-center justify-center group-hover:bg-red-50 transition-colors">
								<Trash2 className="w-6 h-6 text-stone-700 group-hover:text-red-500" />
							</div>
							<div className="text-left flex-1">
								<h3 className="font-bold uppercase text-stone-900 group-hover:text-red-600">
									{t.settingsDeleteDb || 'Delete All Saves'}
								</h3>
								<p className="text-xs text-stone-500">
									{t.settingsDeleteDbDesc || 'Remove all stories from local storage'}
								</p>
							</div>
						</button>
					) : (
						<div className="p-4 border-2 border-red-500 bg-red-50">
							<div className="flex items-center gap-2 text-red-600 mb-3">
								<AlertTriangle className="w-5 h-5" />
								<span className="font-bold uppercase text-sm">{t.settingsConfirmDelete || 'Confirm Deletion'}</span>
							</div>
							<p className="text-sm text-red-700 mb-4">
								{t.settingsDeleteDbWarning ||
									'This will permanently delete all your saved stories. This action cannot be undone.'}
							</p>
							<div className="flex gap-2">
								<button
									onClick={() => setShowDeleteDbConfirm(false)}
									className="flex-1 py-2 px-4 bg-stone-200 text-stone-700 font-bold uppercase text-sm hover:bg-stone-300 transition-colors"
									disabled={isDeletingDb}
								>
									{t.cancel || 'Cancel'}
								</button>
								<button
									onClick={handleDeleteDatabase}
									className="flex-1 py-2 px-4 bg-red-600 text-white font-bold uppercase text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
									disabled={isDeletingDb}
								>
									{isDeletingDb ? (
										<>
											<Loader2 className="w-4 h-4 animate-spin" />
											{t.settingsDeleting || 'Deleting...'}
										</>
									) : (
										t.settingsDeleteConfirm || 'Delete All'
									)}
								</button>
							</div>
						</div>
					)}

					{/* Delete API Key Option */}
					{!showDeleteKeyConfirm ? (
						<button
							onClick={() => setShowDeleteKeyConfirm(true)}
							className="w-full p-4 border-2 border-stone-300 bg-white hover:border-orange-500 transition-all flex items-center gap-4 group"
						>
							<div className="w-12 h-12 bg-stone-100 flex items-center justify-center group-hover:bg-orange-50 transition-colors">
								<Key className="w-6 h-6 text-stone-700 group-hover:text-orange-500" />
							</div>
							<div className="text-left flex-1">
								<h3 className="font-bold uppercase text-stone-900 group-hover:text-orange-600">
									{t.settingsDeleteKey || 'Remove API Key'}
								</h3>
								<p className="text-xs text-stone-500">
									{t.settingsDeleteKeyDesc || 'Clear saved OpenAI key and return to start'}
								</p>
							</div>
						</button>
					) : (
						<div className="p-4 border-2 border-orange-500 bg-orange-50">
							<div className="flex items-center gap-2 text-orange-600 mb-3">
								<AlertTriangle className="w-5 h-5" />
								<span className="font-bold uppercase text-sm">{t.settingsConfirmDelete || 'Confirm Deletion'}</span>
							</div>
							<p className="text-sm text-orange-700 mb-4">
								{t.settingsDeleteKeyWarning ||
									'This will remove your API key. You will need to enter it again to continue playing.'}
							</p>
							<div className="flex gap-2">
								<button
									onClick={() => setShowDeleteKeyConfirm(false)}
									className="flex-1 py-2 px-4 bg-stone-200 text-stone-700 font-bold uppercase text-sm hover:bg-stone-300 transition-colors"
								>
									{t.cancel || 'Cancel'}
								</button>
								<button
									onClick={handleDeleteApiKey}
									className="flex-1 py-2 px-4 bg-orange-600 text-white font-bold uppercase text-sm hover:bg-orange-700 transition-colors"
								>
									{t.settingsRemoveKey || 'Remove Key'}
								</button>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="p-4 border-t-2 border-stone-300 bg-stone-50">
					<button
						onClick={onClose}
						className="w-full py-2 px-6 bg-stone-900 text-white font-bold uppercase tracking-widest hover:bg-stone-700 transition-colors text-sm"
					>
						{t.settingsClose || 'Close'}
					</button>
				</div>
			</div>
		</div>
	);
};
