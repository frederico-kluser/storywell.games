import { getLanguageName, supportedLanguages, translations } from '../i18n/locales';
import { validateApiKey } from '../services/geminiService';

// Basic Manual Test Suite structure since we don't have Jest in this environment
const runTests = async () => {
  console.log("Running storywell.games Unit Tests...");
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, desc: string) => {
    if (condition) {
      console.log(`✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${desc}`);
      failed++;
    }
  };

  // --- I18n Tests ---
  
  assert(supportedLanguages.includes('pt'), 'Portuguese is supported');
  assert(supportedLanguages.includes('es'), 'Spanish is supported');
  
  assert(getLanguageName('pt') === 'Portuguese', 'Language Name mapping for PT');
  assert(getLanguageName('es') === 'Spanish', 'Language Name mapping for ES');
  assert(getLanguageName('en') === 'English', 'Language Name mapping for EN');

  assert(translations['pt'].newStory === 'Nova História', 'PT translation key exists');
  assert(translations['es'].newStory === 'Nueva Historia', 'ES translation key exists');

  // --- Validation Logic Tests ---
  // Note: We can't easily mock the Network call here without a library, 
  // but we can ensure the function exists and handles empty strings gracefully.
  
  try {
     const result = await validateApiKey("");
     assert(result === false, "Empty API Key validates to false");
  } catch (e) {
     assert(false, "Validate threw error on empty string");
  }

  console.log(`\nTests Completed. Passed: ${passed}, Failed: ${failed}`);
};

// Expose to window for manual run via console
(window as any).runStorywellTests = runTests;

export default runTests;
