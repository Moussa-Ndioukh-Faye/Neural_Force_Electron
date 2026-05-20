import fr from './fr.json';
import en from './en.json';

type Lang = 'fr' | 'en';
const messages: Record<Lang, Record<string, any>> = { fr, en };
let currentLang: Lang = 'fr';

export function setLang(lang: Lang) { currentLang = lang; }
export function getLang(): Lang { return currentLang; }

export function t(path: string): string {
  const keys = path.split('.');
  let result = messages[currentLang];
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return path;
    }
  }
  return typeof result === 'string' ? result : path;
}
