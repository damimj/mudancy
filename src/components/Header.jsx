import { Link } from 'react-router-dom'
import { SITE_NAME } from '../config'
import { useLanguage } from '../i18n/LanguageContext'
import LanguageSwitcher from './LanguageSwitcher'
import styles from './Header.module.css'

export default function Header() {
  const { t } = useLanguage()

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.brand}>
          {SITE_NAME}
        </Link>
        <p className={styles.tagline}>{t('site.tagline')}</p>
        <LanguageSwitcher />
      </div>
    </header>
  )
}
