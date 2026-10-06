import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../i18n/LanguageContext'
import { LANGUAGES } from '../../i18n/languages'
import { localizeCategory } from '../../lib/translations'
import styles from './AdminCategories.module.css'

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const emptyNames = () => Object.fromEntries(LANGUAGES.map(({ code }) => [code, '']))

export default function AdminCategories() {
  const { t, lang, defaultLang } = useLanguage()
  const [categories, setCategories] = useState([])
  const [names, setNames] = useState(emptyNames)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('categories')
      .select('*, category_translations(*)')
      .order('position', { ascending: true })
    setCategories(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAdd(event) {
    event.preventDefault()
    const filled = LANGUAGES.filter(({ code }) => names[code].trim())
    if (filled.length === 0) return
    setSaving(true)

    const baseName = names[defaultLang]?.trim() || names[filled[0].code].trim()
    let slug = slugify(baseName) || `category-${Date.now()}`
    if (categories.some((category) => category.slug === slug)) slug = `${slug}-${Date.now()}`

    const { data: category } = await supabase
      .from('categories')
      .insert({ slug, position: categories.length + 1 })
      .select()
      .single()

    if (category) {
      await supabase
        .from('category_translations')
        .insert(filled.map(({ code }) => ({ category_id: category.id, lang: code, name: names[code].trim() })))
    }

    setNames(emptyNames())
    setSaving(false)
    load()
  }

  async function handleDelete(category) {
    await supabase.from('categories').delete().eq('id', category.id)
    load()
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('admin.categories.title')}</h1>

      <ul className={styles.list}>
        {categories.map((category) => (
          <li key={category.id} className={styles.row} data-testid="admin-category-row">
            <span>
              {localizeCategory(category, lang, defaultLang).name}
              <small> ({category.category_translations.map((row) => row.lang).sort().join(', ')})</small>
            </span>
            <button type="button" onClick={() => handleDelete(category)}>
              {t('admin.categories.delete')}
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className={styles.form}>
        <h2 className={styles.subtitle}>{t('admin.categories.new')}</h2>
        {LANGUAGES.map(({ code, name }) => (
          <label key={code} className={styles.field}>
            <span>
              {t('admin.categories.name')} ({name})
            </span>
            <input
              type="text"
              value={names[code]}
              onChange={(e) => setNames((prev) => ({ ...prev, [code]: e.target.value }))}
              data-testid={`category-name-${code}`}
            />
          </label>
        ))}
        <p className={styles.hint}>{t('admin.categories.nameHint')}</p>
        <button type="submit" className={styles.addButton} disabled={saving} data-testid="category-add">
          {t('admin.categories.add')}
        </button>
      </form>
    </div>
  )
}
