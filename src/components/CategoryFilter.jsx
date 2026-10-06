import { useLanguage } from '../i18n/LanguageContext'
import styles from './CategoryFilter.module.css'

export default function CategoryFilter({ categories, activeSlug, onChange }) {
  const { t } = useLanguage()

  return (
    <div className={styles.filters} role="tablist" aria-label="Categories">
      <button
        type="button"
        className={!activeSlug ? styles.active : styles.chip}
        onClick={() => onChange(null)}
        data-testid="category-filter-all"
      >
        {t('home.allCategories')}
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          className={activeSlug === category.slug ? styles.active : styles.chip}
          onClick={() => onChange(category.slug)}
          data-testid={`category-filter-${category.slug}`}
        >
          {category.name}
        </button>
      ))}
    </div>
  )
}
