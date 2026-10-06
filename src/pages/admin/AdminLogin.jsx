import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { useLanguage } from '../../i18n/LanguageContext'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import styles from './AdminLogin.module.css'

export default function AdminLogin() {
  const { isAdmin, loading, user, sendSignInLink, signOut } = useAuth()
  const { t } = useLanguage()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

  if (loading) return null

  if (isAdmin) {
    const redirectTo = location.state?.from || '/admin'
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus('sending')
    const { error } = await sendSignInLink(email.trim())
    setStatus(error ? 'error' : 'sent')
  }

  // Signed in with an e-mail that is not in the admins table.
  if (user) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <LanguageSwitcher />
          <h1 className={styles.title}>{t('admin.login.title')}</h1>
          <p className={styles.error} data-testid="login-not-admin">
            {t('admin.login.notAdmin', { email: user.email })}
          </p>
          <button type="button" className={styles.submit} onClick={() => signOut()}>
            {t('admin.login.useAnother')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <LanguageSwitcher />
        <h1 className={styles.title}>{t('admin.login.title')}</h1>

        {status === 'sent' ? (
          <p className={styles.notice} data-testid="login-sent">
            {t('admin.login.sent', { email: email.trim() })}
          </p>
        ) : (
          <>
            <p className={styles.description}>{t('admin.login.description')}</p>

            <label className={styles.field}>
              <span>{t('admin.login.email')}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                data-testid="login-email"
              />
            </label>

            {status === 'error' && (
              <p className={styles.error} data-testid="login-error">
                {t('admin.login.error')}
              </p>
            )}

            <button type="submit" className={styles.submit} disabled={status === 'sending'} data-testid="login-submit">
              {status === 'sending' ? t('admin.login.sending') : t('admin.login.submit')}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
