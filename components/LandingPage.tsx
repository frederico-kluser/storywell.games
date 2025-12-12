import React, { useState } from 'react';
import {
	Terminal,
	Sparkles,
	Brain,
	Wand2,
	Users,
	BookOpen,
	Gamepad2,
	HelpCircle,
	X,
	ExternalLink,
	CreditCard,
	Key,
	Zap,
	Globe,
	Mic,
	Volume2,
	ArrowRight,
	Check,
	ChevronDown,
	Scroll,
	Sword,
	Heart,
	Github,
	Linkedin,
	MapPin,
	Code,
	User,
} from 'lucide-react';
import { useThemeColors } from '../hooks/useThemeColors';
import { Language } from '../types';
import { supportedLanguages, languageInfo } from '../i18n/locales';
import { version } from '../package.json';

interface LandingPageProps {
	language: Language;
	setLanguage: (lang: Language) => void;
	apiKey: string;
	setApiKey: (key: string) => void;
	onValidateKey: () => void;
	validating: boolean;
	keyError: string;
	t: Record<string, string>;
}

export const LandingPage: React.FC<LandingPageProps> = ({
	language,
	setLanguage,
	apiKey,
	setApiKey,
	onValidateKey,
	validating,
	keyError,
	t,
}) => {
	const { colors } = useThemeColors();
	const [showHelpModal, setShowHelpModal] = useState(false);
	const [showKeyInput, setShowKeyInput] = useState(false);
	const [showDevModal, setShowDevModal] = useState(false);

	const features = [
		{ icon: Brain, titleKey: 'landingFeature1Title', descKey: 'landingFeature1Desc' },
		{ icon: Users, titleKey: 'landingFeature2Title', descKey: 'landingFeature2Desc' },
		{ icon: Wand2, titleKey: 'landingFeature3Title', descKey: 'landingFeature3Desc' },
		{ icon: Globe, titleKey: 'landingFeature4Title', descKey: 'landingFeature4Desc' },
		{ icon: Mic, titleKey: 'landingFeature5Title', descKey: 'landingFeature5Desc' },
		{ icon: Volume2, titleKey: 'landingFeature6Title', descKey: 'landingFeature6Desc' },
	];

	const steps = [
		{ number: '01', titleKey: 'landingStep1Title', descKey: 'landingStep1Desc' },
		{ number: '02', titleKey: 'landingStep2Title', descKey: 'landingStep2Desc' },
		{ number: '03', titleKey: 'landingStep3Title', descKey: 'landingStep3Desc' },
	];

	return (
		<div
			className="min-h-screen overflow-y-auto font-mono"
			style={{ backgroundColor: colors.background, color: colors.text }}
		>
			{/* Header */}
			<header
				className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between"
				style={{
					backgroundColor: colors.backgroundSecondary,
					borderBottom: `2px solid ${colors.border}`,
				}}
			>
				<div className="flex items-center gap-2">
					<Terminal className="w-6 h-6" />
					<span className="text-xl font-bold tracking-tight">{t.appTitle}</span>
				</div>
				<div className="flex items-center gap-3">
					<div className="hidden md:flex gap-1">
						{supportedLanguages.map((lang) => (
							<button
								key={lang}
								onClick={() => setLanguage(lang)}
								className="px-2 py-1 text-xs font-bold transition-all border flex items-center gap-1"
								style={{
									backgroundColor: language === lang ? colors.buttonPrimary : 'transparent',
									color: language === lang ? colors.buttonPrimaryText : colors.textSecondary,
									borderColor: language === lang ? colors.buttonPrimary : colors.border,
								}}
								title={languageInfo[lang].name}
							>
								<span>{languageInfo[lang].flag}</span>
								<span className="hidden lg:inline">{languageInfo[lang].nativeName}</span>
							</button>
						))}
					</div>
					{/* Mobile language selector dropdown */}
					<div className="md:hidden relative">
						<select
							value={language}
							onChange={(e) => setLanguage(e.target.value as Language)}
							className="appearance-none px-3 py-2 text-sm font-bold border cursor-pointer pr-8"
							style={{
								backgroundColor: colors.backgroundSecondary,
								color: colors.text,
								borderColor: colors.border,
							}}
						>
							{supportedLanguages.map((lang) => (
								<option key={lang} value={lang}>
									{languageInfo[lang].flag} {languageInfo[lang].nativeName}
								</option>
							))}
						</select>
						<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
					</div>
					<button
						onClick={() => setShowKeyInput(true)}
						className="retro-btn px-4 py-2 text-sm font-bold uppercase flex items-center gap-2"
					>
						<Key className="w-4 h-4" />
						<span className="hidden sm:inline">{t.landingStartPlaying}</span>
						<span className="sm:hidden">{t.landingStart}</span>
					</button>
				</div>
			</header>

			{/* Hero Section */}
			<section className="relative px-4 py-16 md:py-24 text-center overflow-hidden">
				<div
					className="absolute inset-0 opacity-5"
					style={{
						backgroundImage: `repeating-linear-gradient(0deg, ${colors.text} 0px, ${colors.text} 1px, transparent 1px, transparent 4px)`,
					}}
				/>
				<div className="relative z-10 max-w-4xl mx-auto">
					<div
						className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-xs font-bold uppercase tracking-widest"
						style={{
							backgroundColor: colors.backgroundAccent,
							border: `2px solid ${colors.border}`,
						}}
					>
						<Sparkles className="w-4 h-4" />
						{t.landingBadge}
					</div>

					<h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 tracking-tight leading-tight">
						{t.landingHeroTitle}
					</h1>

					<p
						className="text-lg md:text-xl mb-8 max-w-2xl mx-auto leading-relaxed"
						style={{ color: colors.textSecondary }}
					>
						{t.landingHeroSubtitle}
					</p>

					<div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
						<button
							onClick={() => setShowKeyInput(true)}
							className="retro-btn px-8 py-4 text-lg font-bold uppercase flex items-center gap-3 group"
						>
							<Gamepad2 className="w-6 h-6" />
							{t.landingCTA}
							<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
						</button>
						<button
							onClick={() => setShowHelpModal(true)}
							className="flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase transition-opacity hover:opacity-70"
							style={{ color: colors.textSecondary }}
						>
							<HelpCircle className="w-5 h-5" />
							{t.landingHelpButton}
						</button>
					</div>

					<div className="mt-12 flex flex-wrap justify-center gap-6 text-sm" style={{ color: colors.textSecondary }}>
						<span className="flex items-center gap-2">
							<Check className="w-4 h-4" style={{ color: colors.success }} />
							{t.landingBullet1}
						</span>
						<span className="flex items-center gap-2">
							<Check className="w-4 h-4" style={{ color: colors.success }} />
							{t.landingBullet2}
						</span>
						<span className="flex items-center gap-2">
							<Check className="w-4 h-4" style={{ color: colors.success }} />
							{t.landingBullet3}
						</span>
					</div>
				</div>

				<div className="mt-16 animate-bounce">
					<ChevronDown className="w-8 h-8 mx-auto" style={{ color: colors.textSecondary }} />
				</div>
			</section>

			{/* What is it Section */}
			<section className="px-4 py-16 md:py-20" style={{ backgroundColor: colors.backgroundSecondary }}>
				<div className="max-w-5xl mx-auto">
					<div className="text-center mb-12">
						<h2 className="text-3xl md:text-4xl font-black mb-4 uppercase tracking-wide">{t.landingWhatIsTitle}</h2>
						<p className="text-lg max-w-3xl mx-auto" style={{ color: colors.textSecondary }}>
							{t.landingWhatIsDesc}
						</p>
					</div>

					<div
						className="p-6 md:p-8 border-2"
						style={{
							backgroundColor: colors.backgroundAccent,
							borderColor: colors.border,
							boxShadow: `8px 8px 0px ${colors.shadow}`,
						}}
					>
						<div className="grid md:grid-cols-3 gap-6 text-center">
							<div className="p-4">
								<Scroll className="w-12 h-12 mx-auto mb-4" style={{ color: colors.text }} />
								<h3 className="font-bold text-lg mb-2 uppercase">{t.landingPillar1Title}</h3>
								<p className="text-sm" style={{ color: colors.textSecondary }}>
									{t.landingPillar1Desc}
								</p>
							</div>
							<div className="p-4">
								<Sword className="w-12 h-12 mx-auto mb-4" style={{ color: colors.text }} />
								<h3 className="font-bold text-lg mb-2 uppercase">{t.landingPillar2Title}</h3>
								<p className="text-sm" style={{ color: colors.textSecondary }}>
									{t.landingPillar2Desc}
								</p>
							</div>
							<div className="p-4">
								<Heart className="w-12 h-12 mx-auto mb-4" style={{ color: colors.text }} />
								<h3 className="font-bold text-lg mb-2 uppercase">{t.landingPillar3Title}</h3>
								<p className="text-sm" style={{ color: colors.textSecondary }}>
									{t.landingPillar3Desc}
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* How it Works Section */}
			<section className="px-4 py-16 md:py-20">
				<div className="max-w-5xl mx-auto">
					<div className="text-center mb-12">
						<h2 className="text-3xl md:text-4xl font-black mb-4 uppercase tracking-wide">{t.landingHowItWorks}</h2>
						<p className="text-lg" style={{ color: colors.textSecondary }}>
							{t.landingHowItWorksDesc}
						</p>
					</div>

					<div className="grid md:grid-cols-3 gap-6">
						{steps.map((step, index) => (
							<div
								key={index}
								className="relative p-6 border-2 transition-all hover:translate-y-[-4px]"
								style={{
									backgroundColor: colors.backgroundSecondary,
									borderColor: colors.border,
									boxShadow: `4px 4px 0px ${colors.shadow}`,
								}}
							>
								<div
									className="absolute -top-4 -left-4 w-12 h-12 flex items-center justify-center font-black text-xl"
									style={{
										backgroundColor: colors.buttonPrimary,
										color: colors.buttonPrimaryText,
									}}
								>
									{step.number}
								</div>
								<div className="pt-4">
									<h3 className="font-bold text-lg mb-3 uppercase">{t[step.titleKey]}</h3>
									<p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
										{t[step.descKey]}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section className="px-4 py-16 md:py-20" style={{ backgroundColor: colors.backgroundSecondary }}>
				<div className="max-w-5xl mx-auto">
					<div className="text-center mb-12">
						<h2 className="text-3xl md:text-4xl font-black mb-4 uppercase tracking-wide">{t.landingFeaturesTitle}</h2>
						<p className="text-lg" style={{ color: colors.textSecondary }}>
							{t.landingFeaturesDesc}
						</p>
					</div>

					<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{features.map((feature, index) => {
							const Icon = feature.icon;
							return (
								<div
									key={index}
									className="p-5 border-2 transition-all hover:translate-y-[-2px]"
									style={{
										backgroundColor: colors.background,
										borderColor: colors.border,
									}}
								>
									<Icon className="w-8 h-8 mb-3" style={{ color: colors.text }} />
									<h3 className="font-bold mb-2 uppercase">{t[feature.titleKey]}</h3>
									<p className="text-sm" style={{ color: colors.textSecondary }}>
										{t[feature.descKey]}
									</p>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="px-4 py-16 md:py-24">
				<div className="max-w-3xl mx-auto text-center">
					<Zap className="w-16 h-16 mx-auto mb-6" style={{ color: colors.text }} />
					<h2 className="text-3xl md:text-4xl font-black mb-4 uppercase">{t.landingCTATitle}</h2>
					<p className="text-lg mb-8" style={{ color: colors.textSecondary }}>
						{t.landingCTADesc}
					</p>
					<button
						onClick={() => setShowKeyInput(true)}
						className="retro-btn px-10 py-5 text-xl font-bold uppercase flex items-center gap-3 mx-auto"
					>
						<Gamepad2 className="w-7 h-7" />
						{t.landingCTA}
					</button>
					<p className="mt-6 text-sm" style={{ color: colors.textSecondary }}>
						{t.landingCTANote}
					</p>
				</div>
			</section>

			{/* Footer */}
			<footer
				className="px-4 py-8"
				style={{
					backgroundColor: colors.backgroundAccent,
					borderTop: `2px solid ${colors.border}`,
					color: colors.textSecondary,
				}}
			>
				<div className="max-w-5xl mx-auto">
					<div className="flex flex-col md:flex-row items-center justify-between gap-6">
						{/* Open Source Info */}
						<div className="flex flex-col items-center md:items-start gap-2">
							<div className="flex items-center gap-2">
								<Github className="w-5 h-5" />
								<span className="font-bold uppercase text-sm">{t.landingOpenSource}</span>
							</div>
							<a
								href="https://github.com/frederico-kluser/infinity_stories"
								target="_blank"
								rel="noreferrer"
								className="flex items-center gap-2 text-xs transition-opacity hover:opacity-70"
							>
								<Code className="w-4 h-4" />
								{t.landingViewProject}
								<ExternalLink className="w-3 h-3" />
							</a>
						</div>

						{/* License Info */}
						<div className="flex flex-col items-center gap-1 text-center">
							<p className="text-xs font-bold">{t.landingLicense}</p>
							<p className="text-xs opacity-70">{t.landingLicenseDesc}</p>
							<p className="text-[10px] font-mono mt-1 opacity-50">v{version}</p>
						</div>

						{/* Developer Button */}
						<button
							onClick={() => setShowDevModal(true)}
							className="flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase transition-all hover:opacity-70 border-2"
							style={{
								borderColor: colors.border,
								backgroundColor: colors.backgroundSecondary,
							}}
						>
							<User className="w-4 h-4" />
							{t.landingAboutDev}
						</button>
					</div>

					<p className="text-center text-xs mt-6 opacity-70">{t.landingFooter}</p>
				</div>
			</footer>

			{/* API Key Input Modal */}
			{showKeyInput && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
					style={{ backgroundColor: `${colors.text}99` }}
				>
					<div
						className="w-full max-w-md animate-fade-in"
						style={{
							backgroundColor: colors.backgroundSecondary,
							border: `2px solid ${colors.borderStrong}`,
							boxShadow: `12px 12px 0px ${colors.shadow}`,
						}}
					>
						<div
							className="p-4 flex items-center justify-between"
							style={{ borderBottom: `2px solid ${colors.border}` }}
						>
							<h3 className="font-bold text-lg uppercase flex items-center gap-2">
								<Key className="w-5 h-5" />
								{t.enterKeyTitle}
							</h3>
							<button onClick={() => setShowKeyInput(false)} className="p-1 hover:opacity-70 transition-opacity">
								<X className="w-5 h-5" />
							</button>
						</div>

						<div className="p-6">
							<p className="text-sm mb-6" style={{ color: colors.textSecondary }}>
								{t.landingKeyModalDesc}
							</p>
							<p className="text-xs uppercase tracking-wide mb-6" style={{ color: colors.textSecondary }}>
								{t.enterKeyDesc}
							</p>

							<input
								autoFocus
								type="password"
								value={apiKey}
								placeholder={t.apiKeyPlaceholder}
								className="w-full p-4 mb-4 outline-none font-mono retro-input"
								onChange={(e) => setApiKey(e.target.value)}
								onKeyDown={(e) => e.key === 'Enter' && apiKey && onValidateKey()}
							/>

							{keyError && (
								<p
									className="text-xs mb-4 text-center font-bold p-2"
									style={{
										color: colors.danger,
										backgroundColor: `${colors.danger}20`,
										border: `1px solid ${colors.danger}`,
									}}
								>
									{keyError}
								</p>
							)}

							<button
								onClick={onValidateKey}
								disabled={!apiKey || validating}
								className="w-full retro-btn py-4 font-bold text-lg uppercase tracking-wider flex justify-center items-center gap-2 disabled:opacity-50"
							>
								{validating && (
									<div
										className="w-5 h-5 border-4 rounded-full animate-spin"
										style={{ borderColor: colors.border, borderTopColor: colors.text }}
									/>
								)}
								{validating ? t.validating : t.startEngine}
							</button>

							<button
								onClick={() => {
									setShowKeyInput(false);
									setShowHelpModal(true);
								}}
								className="w-full mt-4 py-3 text-sm font-bold uppercase flex items-center justify-center gap-2 transition-opacity hover:opacity-70"
								style={{ color: colors.textSecondary }}
							>
								<HelpCircle className="w-4 h-4" />
								{t.landingNoKey}
							</button>

							<a
								href="https://platform.openai.com/api-keys"
								target="_blank"
								rel="noreferrer"
								className="w-full mt-3 py-3 text-sm font-bold uppercase flex items-center justify-center gap-2 border-2 transition-colors"
								style={{
									color: colors.buttonSecondaryText,
									borderColor: colors.border,
									backgroundColor: colors.backgroundSecondary,
								}}
							>
								<ExternalLink className="w-4 h-4" />
								{t.getKey}
							</a>

							{/* Language selector in modal */}
							<div
								className="mt-6 pt-4 flex flex-wrap justify-center gap-2"
								style={{ borderTop: `1px solid ${colors.border}` }}
							>
								{supportedLanguages.map((lang) => (
									<button
										key={lang}
										onClick={() => setLanguage(lang)}
										className="px-3 py-1 text-xs font-bold transition-all border flex items-center gap-1"
										style={{
											backgroundColor: language === lang ? colors.buttonPrimary : 'transparent',
											color: language === lang ? colors.buttonPrimaryText : colors.textSecondary,
											borderColor: language === lang ? colors.buttonPrimary : colors.border,
										}}
										title={languageInfo[lang].name}
									>
										<span>{languageInfo[lang].flag}</span>
										<span>{languageInfo[lang].nativeName}</span>
									</button>
								))}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Help Modal */}
			{showHelpModal && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
					style={{ backgroundColor: `${colors.text}99` }}
				>
					<div
						className="w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in"
						style={{
							backgroundColor: colors.backgroundSecondary,
							border: `2px solid ${colors.borderStrong}`,
							boxShadow: `12px 12px 0px ${colors.shadow}`,
						}}
					>
						<div
							className="p-4 flex items-center justify-between sticky top-0"
							style={{
								backgroundColor: colors.backgroundSecondary,
								borderBottom: `2px solid ${colors.border}`,
							}}
						>
							<h3 className="font-bold text-lg uppercase flex items-center gap-2">
								<HelpCircle className="w-5 h-5" />
								{t.landingHelpTitle}
							</h3>
							<button onClick={() => setShowHelpModal(false)} className="p-1 hover:opacity-70 transition-opacity">
								<X className="w-5 h-5" />
							</button>
						</div>

						<div className="p-6 space-y-8">
							{/* What is OpenAI Key */}
							<div>
								<h4 className="font-bold uppercase mb-3 pb-2" style={{ borderBottom: `2px solid ${colors.border}` }}>
									{t.landingHelpWhat}
								</h4>
								<p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
									{t.landingHelpWhatDesc}
								</p>
							</div>

							{/* How to get the key */}
							<div>
								<h4 className="font-bold uppercase mb-3 pb-2" style={{ borderBottom: `2px solid ${colors.border}` }}>
									{t.landingHelpHow}
								</h4>
								<ol className="space-y-3 text-sm" style={{ color: colors.textSecondary }}>
									<li className="flex gap-3">
										<span
											className="flex-shrink-0 w-6 h-6 flex items-center justify-center font-bold"
											style={{ backgroundColor: colors.buttonPrimary, color: colors.buttonPrimaryText }}
										>
											1
										</span>
										<span>{t.landingHelpStep1}</span>
									</li>
									<li className="flex gap-3">
										<span
											className="flex-shrink-0 w-6 h-6 flex items-center justify-center font-bold"
											style={{ backgroundColor: colors.buttonPrimary, color: colors.buttonPrimaryText }}
										>
											2
										</span>
										<span>{t.landingHelpStep2}</span>
									</li>
									<li className="flex gap-3">
										<span
											className="flex-shrink-0 w-6 h-6 flex items-center justify-center font-bold"
											style={{ backgroundColor: colors.buttonPrimary, color: colors.buttonPrimaryText }}
										>
											3
										</span>
										<span>{t.landingHelpStep3}</span>
									</li>
									<li className="flex gap-3">
										<span
											className="flex-shrink-0 w-6 h-6 flex items-center justify-center font-bold"
											style={{ backgroundColor: colors.buttonPrimary, color: colors.buttonPrimaryText }}
										>
											4
										</span>
										<span>{t.landingHelpStep4}</span>
									</li>
								</ol>
								<a
									href="https://platform.openai.com/api-keys"
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-bold uppercase transition-opacity hover:opacity-70"
									style={{
										backgroundColor: colors.buttonPrimary,
										color: colors.buttonPrimaryText,
									}}
								>
									<Key className="w-4 h-4" />
									{t.landingHelpGetKey}
									<ExternalLink className="w-4 h-4" />
								</a>
							</div>

							{/* How to add credits */}
							<div>
								<h4 className="font-bold uppercase mb-3 pb-2" style={{ borderBottom: `2px solid ${colors.border}` }}>
									<CreditCard className="w-5 h-5 inline mr-2" />
									{t.landingHelpCredits}
								</h4>
								<p className="text-sm mb-3" style={{ color: colors.textSecondary }}>
									{t.landingHelpCreditsDesc}
								</p>
								<ol className="space-y-3 text-sm" style={{ color: colors.textSecondary }}>
									<li className="flex gap-3">
										<span
											className="flex-shrink-0 w-6 h-6 flex items-center justify-center font-bold"
											style={{ backgroundColor: colors.buttonPrimary, color: colors.buttonPrimaryText }}
										>
											1
										</span>
										<span>{t.landingHelpCreditsStep1}</span>
									</li>
									<li className="flex gap-3">
										<span
											className="flex-shrink-0 w-6 h-6 flex items-center justify-center font-bold"
											style={{ backgroundColor: colors.buttonPrimary, color: colors.buttonPrimaryText }}
										>
											2
										</span>
										<span>{t.landingHelpCreditsStep2}</span>
									</li>
									<li className="flex gap-3">
										<span
											className="flex-shrink-0 w-6 h-6 flex items-center justify-center font-bold"
											style={{ backgroundColor: colors.buttonPrimary, color: colors.buttonPrimaryText }}
										>
											3
										</span>
										<span>{t.landingHelpCreditsStep3}</span>
									</li>
								</ol>
								<a
									href="https://platform.openai.com/settings/organization/billing/overview"
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-bold uppercase transition-opacity hover:opacity-70"
									style={{
										backgroundColor: colors.buttonPrimary,
										color: colors.buttonPrimaryText,
									}}
								>
									<CreditCard className="w-4 h-4" />
									{t.landingHelpAddCredits}
									<ExternalLink className="w-4 h-4" />
								</a>
							</div>

							{/* Cost info */}
							<div
								className="p-4 border-2"
								style={{
									backgroundColor: colors.backgroundAccent,
									borderColor: colors.border,
								}}
							>
								<h4 className="font-bold uppercase mb-2 flex items-center gap-2">
									<Zap className="w-5 h-5" />
									{t.landingHelpCost}
								</h4>
								<p className="text-sm" style={{ color: colors.textSecondary }}>
									{t.landingHelpCostDesc}
								</p>
							</div>

							{/* Security note */}
							<div
								className="p-4 border-2"
								style={{
									backgroundColor: `${colors.success}10`,
									borderColor: colors.success,
								}}
							>
								<h4 className="font-bold uppercase mb-2 flex items-center gap-2" style={{ color: colors.success }}>
									<Check className="w-5 h-5" />
									{t.landingHelpSecurity}
								</h4>
								<p className="text-sm" style={{ color: colors.textSecondary }}>
									{t.landingHelpSecurityDesc}
								</p>
							</div>

							<button
								onClick={() => {
									setShowHelpModal(false);
									setShowKeyInput(true);
								}}
								className="w-full retro-btn py-4 font-bold uppercase flex items-center justify-center gap-2"
							>
								<Key className="w-5 h-5" />
								{t.landingHelpGotKey}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Developer Modal */}
			{showDevModal && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
					style={{ backgroundColor: `${colors.text}99` }}
				>
					<div
						className="w-full max-w-md animate-fade-in"
						style={{
							backgroundColor: colors.backgroundSecondary,
							border: `2px solid ${colors.borderStrong}`,
							boxShadow: `12px 12px 0px ${colors.shadow}`,
						}}
					>
						<div
							className="p-4 flex items-center justify-between"
							style={{ borderBottom: `2px solid ${colors.border}` }}
						>
							<h3 className="font-bold text-lg uppercase flex items-center gap-2">
								<User className="w-5 h-5" />
								{t.landingAboutDev}
							</h3>
							<button onClick={() => setShowDevModal(false)} className="p-1 hover:opacity-70 transition-opacity">
								<X className="w-5 h-5" />
							</button>
						</div>

						<div className="p-6">
							{/* Profile Section */}
							<div className="flex flex-col items-center mb-6">
								<img
									src="https://avatars.githubusercontent.com/u/13138187?v=4"
									alt="Frederico Kluser"
									className="w-24 h-24 rounded-full mb-4 border-4"
									style={{ borderColor: colors.border }}
								/>
								<h4 className="font-bold text-xl">{t.landingDevName}</h4>
								<p className="text-sm" style={{ color: colors.textSecondary }}>
									{t.landingDevRole}
								</p>
								<p className="flex items-center gap-1 text-xs mt-1" style={{ color: colors.textSecondary }}>
									<MapPin className="w-3 h-3" />
									{t.landingDevLocation}
								</p>
							</div>

							{/* Bio */}
							<p className="text-sm text-center mb-4 leading-relaxed" style={{ color: colors.textSecondary }}>
								{t.landingDevBio}
							</p>

							{/* Skills */}
							<p className="text-xs text-center mb-6 font-mono" style={{ color: colors.text, opacity: 0.7 }}>
								{t.landingDevSkills}
							</p>

							{/* Links */}
							<div className="flex flex-col gap-3">
								<a
									href="https://github.com/frederico-kluser"
									target="_blank"
									rel="noreferrer"
									className="flex items-center justify-center gap-2 w-full py-3 font-bold uppercase text-sm transition-opacity hover:opacity-70 border-2"
									style={{
										backgroundColor: colors.background,
										borderColor: colors.border,
									}}
								>
									<Github className="w-5 h-5" />
									{t.landingViewGitHub}
									<ExternalLink className="w-4 h-4" />
								</a>

								<a
									href="https://www.linkedin.com/in/frederico-kluser/"
									target="_blank"
									rel="noreferrer"
									className="flex items-center justify-center gap-2 w-full py-3 font-bold uppercase text-sm transition-opacity hover:opacity-70"
									style={{
										backgroundColor: colors.buttonPrimary,
										color: colors.buttonPrimaryText,
									}}
								>
									<Linkedin className="w-5 h-5" />
									{t.landingViewLinkedIn}
									<ExternalLink className="w-4 h-4" />
								</a>
							</div>

							{/* Project Link */}
							<div className="mt-6 pt-4 text-center" style={{ borderTop: `1px solid ${colors.border}` }}>
								<p className="text-xs mb-2 uppercase font-bold">{t.landingOpenSource}</p>
								<a
									href="https://github.com/frederico-kluser/infinity_stories"
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center gap-2 text-xs transition-opacity hover:opacity-70"
									style={{ color: colors.textSecondary }}
								>
									<Code className="w-4 h-4" />
									{t.landingViewProject}
									<ExternalLink className="w-3 h-3" />
								</a>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
