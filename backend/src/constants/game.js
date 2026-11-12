export const SUPPORTED_LANGUAGES = ['tamil', 'telugu', 'english', 'hindi'];
export const SUPPORTED_DIFFICULTIES = ['easy', 'hard'];

export function isSupportedLanguage(language) {
  return SUPPORTED_LANGUAGES.includes(language);
}

export function isSupportedDifficulty(difficulty) {
  return SUPPORTED_DIFFICULTIES.includes(difficulty);
}
