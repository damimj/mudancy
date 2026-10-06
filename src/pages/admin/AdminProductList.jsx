import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatPrice } from '../../lib/currency'
import { useLanguage } from '../../i18n/LanguageContext'
import { localizeProduct } from '../../lib/translations'
import StatusBadge from '../../components/StatusBadge'
import styles from './AdminProductList.module.css'

export default function AdminProductList() {
  const { t, lang, locale, defaultLang } = useLanguage()
  const { refreshTotals } = useOutletContext()
  const [rawProducts, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const products = useMemo(
    () => rawProducts.map((product) => localizeProduct(product, lang, defaultLang)),
    [rawProducts, lang, defaultLang]
  )

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*, product_translations(*), reservations(first_name, last_name, phone, created_at)')
      .order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDelete(product) {
    if (!window.confirm(t('admin.products.deleteConfirm'))) return
    await supabase.from('products').delete().eq('id', product.id)
    load()
    refreshTotals()
  }

  async function handleStatusChange(product, status) {
    await supabase.from('products').update({ status }).eq('id', product.id)
    load()
    refreshTotals()
  }

  function latestReservation(product) {
    if (!product.reservations?.length) return null
    return [...product.reservations].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
  }

  if (loading) return null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('admin.products.title')}</h1>
        <Link to="/admin/products/new" className={styles.newButton}>
          {t('admin.products.new')}
        </Link>
      </div>

      {products.length === 0 && <p className={styles.empty}>{t('admin.products.empty')}</p>}

      <div className={styles.list}>
        {products.map((product) => {
          const reservation = latestReservation(product)
          return (
            <div key={product.id} className={styles.row} data-testid="admin-product-row" data-product-id={product.id}>
              <img
                src={product.images?.[0]}
                alt=""
                className={styles.thumb}
                style={{ visibility: product.images?.[0] ? 'visible' : 'hidden' }}
              />
              <div className={styles.info}>
                <div className={styles.rowTop}>
                  <span className={styles.name} data-testid="admin-product-name">
                    {product.title}
                  </span>
                  <StatusBadge status={product.status} />
                </div>
                <span className={styles.price}>{formatPrice(product.price, product.currency, locale)}</span>
                {product.status === 'reserved' && reservation && (
                  <span className={styles.reservedBy} data-testid="admin-reserved-by">
                    {t('admin.products.reservedBy')}: {reservation.first_name} {reservation.last_name} —{' '}
                    {reservation.phone}
                  </span>
                )}
              </div>
              <div className={styles.actions}>
                {product.status !== 'available' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(product, 'available')}
                    data-testid="admin-mark-available"
                  >
                    {t('admin.products.markAvailable')}
                  </button>
                )}
                {product.status !== 'sold' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(product, 'sold')}
                    data-testid="admin-mark-sold"
                  >
                    {t('admin.products.markSold')}
                  </button>
                )}
                <a
                  href={`/product/${product.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.previewLink}
                  title={t('admin.products.preview')}
                  aria-label={t('admin.products.preview')}
                  data-testid="admin-preview-link"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </a>
                <Link to={`/admin/products/${product.id}/edit`} data-testid="admin-edit-link">
                  {t('admin.products.edit')}
                </Link>
                <button
                  type="button"
                  className={styles.delete}
                  onClick={() => handleDelete(product)}
                  data-testid="admin-delete-button"
                >
                  {t('admin.products.delete')}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
