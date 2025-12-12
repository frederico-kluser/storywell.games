#!/usr/bin/env tsx
/**
 * Translation Validation Script
 *
 * This script validates that all translations are complete and consistent.
 * Run with: npm run validate:translations
 *
 * Checks performed:
 * 1. All languages have the same translation keys
 * 2. No translation values are empty
 * 3. No translation values contain untranslated English text (optional warning)
 * 4. All keys used in code exist in translations
 */

import { translations, supportedLanguages, languageInfo } from '../i18n/locales.ts';
import { Language } from '../types.ts';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface ValidationResult {
	errors: string[];
	warnings: string[];
}

const COLORS = {
	reset: '\x1b[0m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
	bold: '\x1b[1m',
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SHOW_ALL_UNUSED = process.env.SHOW_ALL_UNUSED === 'true';
const FAIL_ON_WARNINGS = process.env.ALLOW_TRANSLATION_WARNINGS !== 'true';

const TRANSLATION_PATTERNS: RegExp[] = [
	/(?<![A-Za-z0-9_])t\.([A-Za-z0-9_]+)/g,
	/(?<![A-Za-z0-9_])t\['([A-Za-z0-9_]+)'\]/g,
	/(?<![A-Za-z0-9_])t\["([A-Za-z0-9_]+)"\]/g,
	/(?<![A-Za-z0-9_])t\(\s*'([A-Za-z0-9_]+)'\s*\)/g,
	/(?<![A-Za-z0-9_])t\(\s*"([A-Za-z0-9_]+)"\s*\)/g,
];

const DYNAMIC_TRANSLATION_KEYS = new Set([
	'landingStep1Title',
	'landingStep1Desc',
	'landingStep2Title',
	'landingStep2Desc',
	'landingStep3Title',
	'landingStep3Desc',
	'landingFeature1Title',
	'landingFeature1Desc',
	'landingFeature2Title',
	'landingFeature2Desc',
	'landingFeature3Title',
	'landingFeature3Desc',
	'landingFeature4Title',
	'landingFeature4Desc',
	'landingFeature5Title',
	'landingFeature5Desc',
	'landingFeature6Title',
	'landingFeature6Desc',
	'thinking',
]);

function isArrowFunctionMatch(content: string, matchIndex: number): boolean {
	let cursor = matchIndex - 1;
	while (cursor >= 0 && /\s/.test(content[cursor] ?? '')) {
		cursor -= 1;
	}
	return cursor >= 1 && content[cursor] === '>' && content[cursor - 1] === '=';
}

function log(message: string, color: string = COLORS.reset): void {
	console.log(`${color}${message}${COLORS.reset}`);
}

function logError(message: string): void {
	log(`  ❌ ${message}`, COLORS.red);
}

function logWarning(message: string): void {
	log(`  ⚠️  ${message}`, COLORS.yellow);
}

function logSuccess(message: string): void {
	log(`  ✅ ${message}`, COLORS.green);
}

function logInfo(message: string): void {
	log(`  ℹ️  ${message}`, COLORS.cyan);
}

function validateTranslations(): ValidationResult {
	const result: ValidationResult = { errors: [], warnings: [] };

	// Use English as the reference
	const referenceLanguage: Language = 'en';
	const referenceKeys = Object.keys(translations[referenceLanguage]);

	log(`\n${COLORS.bold}🌍 Translation Validation Report${COLORS.reset}\n`);
	log(
		`Reference language: ${languageInfo[referenceLanguage].flag} ${languageInfo[referenceLanguage].name}`,
		COLORS.blue,
	);
	log(`Total keys: ${referenceKeys.length}`, COLORS.blue);
	log(`Languages to validate: ${supportedLanguages.length}\n`, COLORS.blue);

	// Check each language
	for (const lang of supportedLanguages) {
		const langInfo = languageInfo[lang];
		log(`\n${COLORS.bold}${langInfo.flag} ${langInfo.name} (${langInfo.nativeName})${COLORS.reset}`);

		const langTranslations = translations[lang];
		const langKeys = Object.keys(langTranslations);

		// Find missing keys
		const missingKeys = referenceKeys.filter((key) => !(key in langTranslations));
		if (missingKeys.length > 0) {
			result.errors.push(`${langInfo.name}: Missing ${missingKeys.length} keys`);
			logError(`Missing ${missingKeys.length} translation keys:`);
			missingKeys.forEach((key) => {
				logInfo(`  - "${key}": "${translations[referenceLanguage][key].substring(0, 50)}..."`);
			});
		}

		// Find extra keys (not in reference)
		const extraKeys = langKeys.filter((key) => !(key in translations[referenceLanguage]));
		if (extraKeys.length > 0) {
			result.warnings.push(`${langInfo.name}: Has ${extraKeys.length} extra keys not in reference`);
			logWarning(`Has ${extraKeys.length} extra keys not in reference:`);
			extraKeys.forEach((key) => {
				logInfo(`  - "${key}"`);
			});
		}

		// Find empty values
		const emptyKeys = langKeys.filter((key) => {
			const value = langTranslations[key];
			return value === '' || value === null || value === undefined;
		});
		if (emptyKeys.length > 0) {
			result.errors.push(`${langInfo.name}: Has ${emptyKeys.length} empty values`);
			logError(`Has ${emptyKeys.length} empty translation values:`);
			emptyKeys.forEach((key) => {
				logInfo(`  - "${key}"`);
			});
		}

		// Check for potentially untranslated values (same as English)
		if (lang !== 'en') {
			const sameAsEnglish = langKeys.filter((key) => {
				const value = langTranslations[key];
				const englishValue = translations['en'][key];
				// Skip app title, proper nouns, and technical terms
				const skipKeys = ['appTitle', 'landingDevName', 'landingDevSkills'];
				if (skipKeys.includes(key)) return false;
				// Skip if it's a short value (likely intentionally the same)
				if (value && value.length < 5) return false;
				return value === englishValue;
			});

			if (sameAsEnglish.length > 0) {
				result.warnings.push(`${langInfo.name}: ${sameAsEnglish.length} values identical to English`);
				logWarning(`${sameAsEnglish.length} values identical to English (may need translation):`);
				sameAsEnglish.slice(0, 5).forEach((key) => {
					logInfo(`  - "${key}": "${langTranslations[key]?.substring(0, 40)}..."`);
				});
				if (sameAsEnglish.length > 5) {
					logInfo(`  ... and ${sameAsEnglish.length - 5} more`);
				}
			}
		}

		// Calculate completion percentage
		const translatedCount = referenceKeys.filter(
			(key) => key in langTranslations && langTranslations[key] !== '' && langTranslations[key] !== null,
		).length;
		const percentage = Math.round((translatedCount / referenceKeys.length) * 100);

		if (percentage === 100 && missingKeys.length === 0 && emptyKeys.length === 0) {
			logSuccess(`Complete! (${translatedCount}/${referenceKeys.length} keys)`);
		} else {
			logInfo(`Progress: ${percentage}% (${translatedCount}/${referenceKeys.length} keys)`);
		}
	}

	return result;
}

function findTranslationKeysInCode(): string[] {
	const projectRoot = path.join(__dirname, '..');
	const keysFound = new Set<string>();

	// Directories to scan
	const dirsToScan = ['components', 'hooks'];

	// File extensions to check
	const extensions = ['.tsx', '.ts'];

	function scanDirectory(dir: string): void {
		if (!fs.existsSync(dir)) return;

		const files = fs.readdirSync(dir);

		for (const file of files) {
			const filePath = path.join(dir, file);
			const stat = fs.statSync(filePath);

			if (stat.isDirectory()) {
				scanDirectory(filePath);
			} else if (extensions.some((ext) => file.endsWith(ext))) {
				const content = fs.readFileSync(filePath, 'utf-8');

				for (const pattern of TRANSLATION_PATTERNS) {
					let match;
					while ((match = pattern.exec(content)) !== null) {
						if (match.index !== undefined && isArrowFunctionMatch(content, match.index)) {
							continue;
						}
						keysFound.add(match[1]);
					}
				}
			}
		}
	}

	for (const dir of dirsToScan) {
		scanDirectory(path.join(projectRoot, dir));
	}

	// Also scan App.tsx
	const appTsxPath = path.join(projectRoot, 'App.tsx');
	if (fs.existsSync(appTsxPath)) {
		const content = fs.readFileSync(appTsxPath, 'utf-8');
		for (const pattern of TRANSLATION_PATTERNS) {
			let match;
			while ((match = pattern.exec(content)) !== null) {
				if (match.index !== undefined && isArrowFunctionMatch(content, match.index)) {
					continue;
				}
				keysFound.add(match[1]);
			}
		}
	}

	for (const key of DYNAMIC_TRANSLATION_KEYS) {
		keysFound.add(key);
	}

	return Array.from(keysFound);
}

function validateCodeUsage(): ValidationResult {
	const result: ValidationResult = { errors: [], warnings: [] };

	log(`\n${COLORS.bold}🔍 Code Usage Analysis${COLORS.reset}\n`);

	const keysInCode = findTranslationKeysInCode();
	const keysInTranslations = Object.keys(translations['en']);

	log(`Keys found in code: ${keysInCode.length}`, COLORS.blue);
	log(`Keys in translations: ${keysInTranslations.length}`, COLORS.blue);

	// Find keys used in code but not in translations
	const missingInTranslations = keysInCode.filter((key) => !keysInTranslations.includes(key));
	if (missingInTranslations.length > 0) {
		result.errors.push(`${missingInTranslations.length} keys used in code but missing in translations`);
		logError(`\n${missingInTranslations.length} keys used in code but missing in translations:`);
		missingInTranslations.forEach((key) => {
			logInfo(`  - "${key}"`);
		});
	}

	// Find keys in translations but not used in code (potential dead code)
	const unusedKeys = keysInTranslations.filter((key) => !keysInCode.includes(key));
	if (unusedKeys.length > 0) {
		result.warnings.push(
			`${unusedKeys.length} keys in translations but not found in code (may be dynamically accessed)`,
		);
		logWarning(`\n${unusedKeys.length} keys in translations but not found in code:`);
		unusedKeys.slice(0, 10).forEach((key) => {
			logInfo(`  - "${key}"`);
		});
		if (unusedKeys.length > 10) {
			logInfo(`  ... and ${unusedKeys.length - 10} more`);
		}
		if (SHOW_ALL_UNUSED) {
			logInfo(`\n  Full list of unused keys:`);
			unusedKeys.forEach((key) => logInfo(`  - "${key}"`));
		}
		logInfo(`\n  Note: Some keys may be accessed dynamically (e.g., t[step.titleKey])`);
	}

	return result;
}

function main(): void {
	log(`\n${'═'.repeat(60)}`, COLORS.magenta);
	log(`${COLORS.bold}     TRANSLATION VALIDATION SCRIPT${COLORS.reset}`);
	log(`${'═'.repeat(60)}\n`, COLORS.magenta);

	const translationResults = validateTranslations();
	const codeResults = validateCodeUsage();

	// Combine results
	const allErrors = [...translationResults.errors, ...codeResults.errors];
	const allWarnings = [...translationResults.warnings, ...codeResults.warnings];

	// Summary
	log(`\n${'═'.repeat(60)}`, COLORS.magenta);
	log(`${COLORS.bold}     SUMMARY${COLORS.reset}`);
	log(`${'═'.repeat(60)}\n`, COLORS.magenta);

	if (allErrors.length === 0 && allWarnings.length === 0) {
		log(`🎉 All translations are valid and complete!`, COLORS.green);
	} else {
		if (allErrors.length > 0) {
			log(`\n${COLORS.bold}Errors (${allErrors.length}):${COLORS.reset}`, COLORS.red);
			allErrors.forEach((error) => logError(error));
		}

		if (allWarnings.length > 0) {
			log(`\n${COLORS.bold}Warnings (${allWarnings.length}):${COLORS.reset}`, COLORS.yellow);
			allWarnings.forEach((warning) => logWarning(warning));
		}
	}

	log(`\n${'═'.repeat(60)}\n`, COLORS.magenta);

	// Exit with error code if there are errors
	const hasErrors = allErrors.length > 0;
	const hasWarnings = allWarnings.length > 0;

	if (hasErrors || (FAIL_ON_WARNINGS && hasWarnings)) {
		const reason = hasErrors ? 'errors' : 'warnings treated as errors';
		log(`Validation failed due to ${reason}.`, COLORS.red);
		process.exit(1);
	}
}

main();
