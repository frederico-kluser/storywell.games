import {
  supportedLanguages,
  getLanguageName,
  getBrowserLanguage,
  setLanguageCookie,
  getLanguageCookie,
  translations
} from '../../i18n/locales';
import { Language } from '../../types';

describe('locales', () => {
  describe('supportedLanguages', () => {
    it('should contain all supported languages (en, pt, es, fr, ru, zh)', () => {
      expect(supportedLanguages).toContain('en');
      expect(supportedLanguages).toContain('pt');
      expect(supportedLanguages).toContain('es');
      expect(supportedLanguages).toContain('fr');
      expect(supportedLanguages).toContain('ru');
      expect(supportedLanguages).toContain('zh');
    });

    it('should have exactly 6 languages', () => {
      expect(supportedLanguages.length).toBe(6);
    });
  });

  describe('getLanguageName', () => {
    it('should return "English" for en', () => {
      expect(getLanguageName('en')).toBe('English');
    });

    it('should return "Portuguese" for pt', () => {
      expect(getLanguageName('pt')).toBe('Portuguese');
    });

    it('should return "Spanish" for es', () => {
      expect(getLanguageName('es')).toBe('Spanish');
    });

    it('should return "French" for fr', () => {
      expect(getLanguageName('fr')).toBe('French');
    });

    it('should return "Russian" for ru', () => {
      expect(getLanguageName('ru')).toBe('Russian');
    });

    it('should return "Chinese" for zh', () => {
      expect(getLanguageName('zh')).toBe('Chinese');
    });
  });

  describe('setLanguageCookie and getLanguageCookie', () => {
    beforeEach(() => {
      // Clear cookies before each test (handled in jest.setup.ts)
    });

    it('should set and retrieve a language cookie', () => {
      setLanguageCookie('pt');
      const result = getLanguageCookie();
      expect(result).toBe('pt');
    });

    it('should overwrite existing language cookie', () => {
      setLanguageCookie('en');
      setLanguageCookie('es');
      const result = getLanguageCookie();
      expect(result).toBe('es');
    });

    it('should return null when no cookie is set', () => {
      // Cookie store is cleared in beforeEach
      const result = getLanguageCookie();
      expect(result).toBe(null);
    });

    it('should return null for invalid language values', () => {
      // Manually set an invalid language (German is not supported)
      document.cookie = 'infinitum_lang=de';
      const result = getLanguageCookie();
      expect(result).toBe(null);
    });

    it('should handle all supported languages', () => {
      supportedLanguages.forEach(lang => {
        setLanguageCookie(lang);
        expect(getLanguageCookie()).toBe(lang);
      });
    });
  });

  describe('getBrowserLanguage', () => {
    beforeEach(() => {
      // Reset navigator.language mock
      Object.defineProperty(navigator, 'language', {
        value: 'en-US',
        configurable: true,
      });
    });

    it('should return cookie language if set', () => {
      setLanguageCookie('es');
      expect(getBrowserLanguage()).toBe('es');
    });

    it('should return browser language if supported and no cookie', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'pt-BR',
        configurable: true,
      });
      expect(getBrowserLanguage()).toBe('pt');
    });

    it('should return "en" for unsupported browser language', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'de-DE', // German is not supported
        configurable: true,
      });
      expect(getBrowserLanguage()).toBe('en');
    });

    it('should return "fr" for French browser language', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'fr-FR',
        configurable: true,
      });
      expect(getBrowserLanguage()).toBe('fr');
    });

    it('should return "ru" for Russian browser language', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'ru-RU',
        configurable: true,
      });
      expect(getBrowserLanguage()).toBe('ru');
    });

    it('should return "zh" for Chinese browser language', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'zh-CN',
        configurable: true,
      });
      expect(getBrowserLanguage()).toBe('zh');
    });

    it('should extract language code from locale', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'es-MX',
        configurable: true,
      });
      expect(getBrowserLanguage()).toBe('es');
    });
  });

  describe('translations', () => {
    it('should have translations for all supported languages', () => {
      supportedLanguages.forEach(lang => {
        expect(translations[lang]).toBeDefined();
        expect(typeof translations[lang]).toBe('object');
      });
    });

    it('should have consistent keys across all languages', () => {
      const englishKeys = Object.keys(translations.en);

      supportedLanguages.forEach(lang => {
        const langKeys = Object.keys(translations[lang]);
        expect(langKeys.sort()).toEqual(englishKeys.sort());
      });
    });

    it('should have non-empty strings for all translations', () => {
      supportedLanguages.forEach(lang => {
        Object.values(translations[lang]).forEach(value => {
          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);
        });
      });
    });

    describe('specific translation keys', () => {
      const requiredKeys = [
        'appTitle',
        'newStory',
        'settings',
        'enterKeyTitle',
        'apiKeyPlaceholder',
        'startEngine',
        'validating',
        'invalidKey',
        'selectStory',
        'inputPlaceholder',
        'thinking',
        'wizTitle',
        'back',
        'cancel',
        'next',
        'turn',
        'exportJourney',
        'loadJourney',
        'importSuccess',
        'importError'
      ];

      requiredKeys.forEach(key => {
        it(`should have "${key}" in all languages`, () => {
          supportedLanguages.forEach(lang => {
            expect(translations[lang][key]).toBeDefined();
          });
        });
      });
    });

    describe('language-specific content', () => {
      it('should have correct appTitle for all languages', () => {
        supportedLanguages.forEach(lang => {
          expect(translations[lang].appTitle).toBe('storywell.games');
        });
      });

      it('should have localized newStory', () => {
        expect(translations.en.newStory).toBe('New Story');
        expect(translations.pt.newStory).toBe('Nova História');
        expect(translations.es.newStory).toBe('Nueva Historia');
        expect(translations.fr.newStory).toBe('Nouvelle Histoire');
        expect(translations.ru.newStory).toBe('Новая История');
        expect(translations.zh.newStory).toBe('新故事');
      });

      it('should have localized back button', () => {
        expect(translations.en.back).toBe('< BACK');
        expect(translations.pt.back).toBe('< VOLTAR');
        expect(translations.es.back).toBe('< ATRÁS');
        expect(translations.fr.back).toBe('< RETOUR');
        expect(translations.ru.back).toBe('< НАЗАД');
        expect(translations.zh.back).toBe('< 返回');
      });
    });
  });
});
