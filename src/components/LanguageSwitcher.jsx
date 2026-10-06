import { useLanguage } from '../i18n/LanguageContext'
import { LANGUAGES } from '../i18n/languages'
import styles from './LanguageSwitcher.module.css'

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage()

  return (
    <div className={styles.switcher} role="group" aria-label="Language">
      {LANGUAGES.map(({ code, label, name }) => (
        <button
          key={code}
          type="button"
          className={code === lang ? styles.active : styles.button}
          onClick={() => setLang(code)}
          aria-pressed={code === lang}
          title={name}
          data-testid={`lang-${code}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
