import en from './en.json'
import es from './es.json'

// The languages Mudancy speaks. To add another one, create src/i18n/<code>.json
// (copy en.json), add an entry here, and the language switcher, the admin
// forms and the translated product/category fields pick it up automatically.
//   code:   two-letter code, also stored in the database
//   label:  short text on the language switcher button
//   name:   language name in its own language
//   locale: BCP 47 tag used to format numbers and dates
export const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English', locale: 'en-US', dictionary: en },
  { code: 'es', label: 'ES', name: 'Español', locale: 'es', dictionary: es },
]

export const LANGUAGE_CODES = LANGUAGES.map((language) => language.code)

export function localeFor(code) {
  return LANGUAGES.find((language) => language.code === code)?.locale ?? 'en-US'
}
