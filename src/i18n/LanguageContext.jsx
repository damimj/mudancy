import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { DEFAULT_LANG } from '../config'
import { LANGUAGES, LANGUAGE_CODES, localeFor } from './languages'

const DICTIONARIES = Object.fromEntries(LANGUAGES.map(({ code, dictionary }) => [code, dictionary]))
const STORAGE_KEY = 'mudancy-lang'
const FALLBACK_LANG = LANGUAGE_CODES.includes(DEFAULT_LANG) ? DEFAULT_LANG : LANGUAGE_CODES[0]

const LanguageContext = createContext(null)

// Saved choice first, then the browser's language, then the configured default.
function getInitialLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && DICTIONARIES[stored]) return stored
  } catch {
    // localStorage unavailable, fall through
  }
  const browserLangs = typeof navigator === 'undefined' ? [] : navigator.languages || [navigator.language]
  for (const tag of browserLangs) {
    const code = String(tag || '').slice(0, 2).toLowerCase()
    if (DICTIONARIES[code]) return code
  }
  return FALLBACK_LANG
}

function resolve(dict, key) {
  return key.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), dict)
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next) => {
    if (!DICTIONARIES[next]) return
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore write failures (private browsing, etc.)
    }
  }, [])

  const t = useCallback(
    (key, params) => {
      const value = resolve(DICTIONARIES[lang], key) ?? resolve(DICTIONARIES[FALLBACK_LANG], key) ?? key
      if (!params || typeof value !== 'string') return value
      return value.replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match)
    },
    [lang]
  )

  const value = useMemo(
    () => ({ lang, setLang, t, locale: localeFor(lang), defaultLang: FALLBACK_LANG }),
    [lang, setLang, t]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider')
  return ctx
}
