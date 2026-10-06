import { useLanguage } from '../i18n/LanguageContext'
import styles from './StatusBadge.module.css'

export default function StatusBadge({ status }) {
  const { t } = useLanguage()
  return (
    <span className={`${styles.badge} ${styles[status] || ''}`} data-testid="status-badge" data-status={status}>
      {t(`status.${status}`)}
    </span>
  )
}
