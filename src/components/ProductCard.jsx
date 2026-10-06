import { Link } from 'react-router-dom'
import { formatPrice } from '../lib/currency'
import { useLanguage } from '../i18n/LanguageContext'
import StatusBadge from './StatusBadge'
import styles from './ProductCard.module.css'

export default function ProductCard({ product }) {
  const { locale } = useLanguage()
  const cover = product.images?.[0]

  return (
    <Link
      to={`/product/${product.id}`}
      className={styles.card}
      data-testid="product-card"
      data-product-id={product.id}
    >
      <div className={styles.imageWrap}>
        {cover ? (
          <img src={cover} alt={product.title} className={styles.image} loading="lazy" />
        ) : (
          <div className={styles.placeholder} />
        )}
        <div className={styles.badgeWrap}>
          <StatusBadge status={product.status} />
        </div>
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{product.title}</h3>
        <p className={styles.price}>{formatPrice(product.price, product.currency, locale)}</p>
      </div>
    </Link>
  )
}
