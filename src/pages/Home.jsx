import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../i18n/LanguageContext'
import { localizeCategory, localizeProduct } from '../lib/translations'
import Header from '../components/Header'
import CategoryFilter from '../components/CategoryFilter'
import ProductCard from '../components/ProductCard'
import styles from './Home.module.css'

export default function Home() {
  const { t, lang, defaultLang } = useLanguage()
  const [rawProducts, setRawProducts] = useState([])
  const [rawCategories, setRawCategories] = useState([])
  const [activeSlug, setActiveSlug] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const [{ data: productsData }, { data: categoriesData }] = await Promise.all([
        supabase.from('products').select('*, product_translations(*)').order('created_at', { ascending: false }),
        supabase.from('categories').select('*, category_translations(*)').order('position', { ascending: true }),
      ])
      if (!cancelled) {
        setRawProducts(productsData || [])
        setRawCategories(categoriesData || [])
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const products = useMemo(
    () => rawProducts.map((product) => localizeProduct(product, lang, defaultLang)).filter((product) => product.title),
    [rawProducts, lang, defaultLang]
  )
  const categories = useMemo(
    () => rawCategories.map((category) => localizeCategory(category, lang, defaultLang)),
    [rawCategories, lang, defaultLang]
  )

  const visibleProducts = useMemo(() => {
    if (!activeSlug) return products
    const category = categories.find((c) => c.slug === activeSlug)
    if (!category) return products
    return products.filter((p) => p.category_id === category.id)
  }, [products, categories, activeSlug])

  return (
    <div>
      <Header />
      <main className="container">
        <CategoryFilter categories={categories} activeSlug={activeSlug} onChange={setActiveSlug} />
        {!loading && visibleProducts.length === 0 && <p className={styles.empty}>{t('home.noProducts')}</p>}
        <div className={styles.grid} data-testid="product-grid">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </main>
    </div>
  )
}
