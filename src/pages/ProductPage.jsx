import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/currency'
import { formatDate } from '../lib/date'
import { localizeProduct } from '../lib/translations'
import { useLanguage } from '../i18n/LanguageContext'
import Header from '../components/Header'
import PhotoGallery from '../components/PhotoGallery'
import StatusBadge from '../components/StatusBadge'
import ReserveModal from '../components/ReserveModal'
import styles from './ProductPage.module.css'

export default function ProductPage() {
  const { id } = useParams()
  const { t, lang, locale, defaultLang } = useLanguage()
  const [rawProduct, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const product = useMemo(() => localizeProduct(rawProduct, lang, defaultLang), [rawProduct, lang, defaultLang])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('products')
        .select('*, product_translations(*)')
        .eq('id', id)
        .maybeSingle()
      if (!cancelled) {
        setProduct(data)
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

  function handleReserved() {
    setProduct((prev) => (prev ? { ...prev, status: 'reserved' } : prev))
  }

  if (loading) return null
  if (!rawProduct) {
    return (
      <div>
        <Header />
        <main className="container">
          <p className={styles.notFound}>404</p>
          <Link to="/">{t('product.backToHome')}</Link>
        </main>
      </div>
    )
  }

  const isAvailable = product.status === 'available'
  const buttonLabel =
    product.status === 'reserved' ? t('product.reservedButton') : product.status === 'sold' ? t('product.soldButton') : t('product.reserveButton')

  return (
    <div>
      <Header />
      <main className="container">
        <Link to="/" className={styles.back}>
          ← {t('product.backToHome')}
        </Link>

        <div className={styles.layout}>
          <PhotoGallery images={product.images} alt={product.title} />

          <div className={styles.info}>
            <div className={styles.statusRow}>
              <StatusBadge status={product.status} />
            </div>
            <h1 className={styles.title} data-testid="product-title">
              {product.title}
            </h1>
            {product.available_from && (
              <p className={styles.availableFrom} data-testid="product-available-from">
                {t('product.availableFrom')}: {formatDate(product.available_from, locale)}
              </p>
            )}
            <p className={styles.price} data-testid="product-price">
              {formatPrice(product.price, product.currency, locale)}
            </p>

            {product.original_link && (
              <a
                href={product.original_link}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.originalLink}
                data-testid="original-link"
              >
                {t('product.originalLink')} ↗
              </a>
            )}

            {product.condition && (
              <div className={styles.descriptionBlock} data-testid="product-condition">
                <h2 className={styles.descriptionTitle}>{t('product.condition')}</h2>
                <p className={styles.description}>{product.condition}</p>
              </div>
            )}

            {product.description && (
              <div className={styles.descriptionBlock} data-testid="product-description">
                <h2 className={styles.descriptionTitle}>{t('product.description')}</h2>
                <p className={styles.description}>{product.description}</p>
              </div>
            )}

            <button
              type="button"
              className={styles.reserveButton}
              disabled={!isAvailable}
              onClick={() => setShowModal(true)}
              data-testid="reserve-button"
            >
              {buttonLabel}
            </button>
          </div>
        </div>
      </main>

      {showModal && (
        <ReserveModal
          productId={product.id}
          onClose={() => setShowModal(false)}
          onReserved={handleReserved}
        />
      )}
    </div>
  )
}
