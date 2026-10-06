import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../i18n/LanguageContext'
import styles from './ReserveModal.module.css'

export default function ReserveModal({ productId, onClose, onReserved }) {
  const { t } = useLanguage()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | success | error | conflict
  const [errors, setErrors] = useState({})

  function validate() {
    const next = {}
    if (!firstName.trim()) next.firstName = true
    if (!lastName.trim()) next.lastName = true
    if (!phone.trim()) next.phone = true
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validate()) return

    setStatus('submitting')
    const { error } = await supabase.rpc('reserve_product', {
      p_product_id: productId,
      p_first_name: firstName.trim(),
      p_last_name: lastName.trim(),
      p_phone: phone.trim(),
    })

    if (error) {
      if (error.message?.includes('PRODUCT_NOT_AVAILABLE')) {
        setStatus('conflict')
      } else {
        setStatus('error')
      }
      return
    }

    setStatus('success')
    onReserved?.()
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          ×
        </button>

        {status === 'success' ? (
          <p className={styles.success} data-testid="reserve-success">
            {t('reserveModal.success')}
          </p>
        ) : status === 'conflict' ? (
          <p className={styles.error} data-testid="reserve-conflict">
            {t('reserveModal.alreadyReserved')}
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <h2 className={styles.title}>{t('reserveModal.title')}</h2>
            <p className={styles.description}>{t('reserveModal.description')}</p>

            <label className={styles.field}>
              <span>{t('reserveModal.firstName')}</span>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                data-testid="reserve-first-name"
              />
              {errors.firstName && <small className={styles.fieldError}>{t('validation.required')}</small>}
            </label>

            <label className={styles.field}>
              <span>{t('reserveModal.lastName')}</span>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                data-testid="reserve-last-name"
              />
              {errors.lastName && <small className={styles.fieldError}>{t('validation.required')}</small>}
            </label>

            <label className={styles.field}>
              <span>{t('reserveModal.phone')}</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                data-testid="reserve-phone"
              />
              <small className={styles.hint}>{t('reserveModal.phoneHint')}</small>
              {errors.phone && <small className={styles.fieldError}>{t('validation.required')}</small>}
            </label>

            {status === 'error' && (
              <p className={styles.error} data-testid="reserve-error">
                {t('reserveModal.error')}
              </p>
            )}

            <div className={styles.actions}>
              <button type="button" className={styles.cancel} onClick={onClose} data-testid="reserve-cancel">
                {t('reserveModal.cancel')}
              </button>
              <button
                type="submit"
                className={styles.submit}
                disabled={status === 'submitting'}
                data-testid="reserve-submit"
              >
                {t('reserveModal.submit')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
