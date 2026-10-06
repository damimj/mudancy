import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CURRENCY } from '../../config'
import { supabase, PRODUCT_IMAGES_BUCKET } from '../../lib/supabase'
import { useLanguage } from '../../i18n/LanguageContext'
import { LANGUAGES } from '../../i18n/languages'
import { localizeCategory } from '../../lib/translations'
import styles from './AdminProductForm.module.css'

function SortablePhoto({ url, isCover, coverLabel, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url })

  // The remove button must not start a drag (mouse, touch or keyboard).
  const stopDrag = (event) => event.stopPropagation()

  return (
    <div
      ref={setNodeRef}
      className={styles.photoItem}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 1 : undefined,
      }}
      data-testid="form-photo"
      data-photo-url={url}
      {...attributes}
      {...listeners}
    >
      <img src={url} alt="" draggable={false} />
      {isCover && <span className={styles.coverBadge}>{coverLabel}</span>}
      <button
        type="button"
        aria-label="Remove"
        data-testid="form-photo-remove"
        onClick={() => onRemove(url)}
        onMouseDown={stopDrag}
        onTouchStart={stopDrag}
        onKeyDown={stopDrag}
      >
        ×
      </button>
    </div>
  )
}

const emptyTranslations = () =>
  Object.fromEntries(LANGUAGES.map(({ code }) => [code, { title: '', description: '', condition: '' }]))

const EMPTY_PRODUCT = {
  available_from: '',
  original_link: '',
  price: '',
  category_id: '',
  images: [],
  status: 'available',
  currency: CURRENCY,
}

export default function AdminProductForm() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const { t, lang, defaultLang } = useLanguage()

  const [product, setProduct] = useState(EMPTY_PRODUCT)
  const [translations, setTranslations] = useState(emptyTranslations)
  const [contentLang, setContentLang] = useState(lang)
  const [saveError, setSaveError] = useState(false)
  const [categories, setCategories] = useState([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(isEditing)

  // Mouse drags after a few pixels; touch needs a short press-and-hold so
  // scrolling the page still works on a phone; keyboard uses Space + arrows.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase
        .from('categories')
        .select('*, category_translations(*)')
        .order('position', { ascending: true })
      setCategories(data || [])
    }
    loadCategories()
  }, [])

  useEffect(() => {
    if (!isEditing) return
    // Ignore stale responses: without this, a late duplicate fetch (React
    // StrictMode runs effects twice in dev) can overwrite what the admin
    // has already started typing with the original values.
    let cancelled = false
    async function loadProduct() {
      const { data } = await supabase
        .from('products')
        .select('*, product_translations(*)')
        .eq('id', id)
        .maybeSingle()
      if (cancelled) return
      if (data) {
        const { product_translations: rows, ...fields } = data
        setProduct({ ...fields, available_from: fields.available_from || '', original_link: fields.original_link || '' })
        const next = emptyTranslations()
        for (const row of rows || []) {
          if (next[row.lang]) next[row.lang] = { title: row.title, description: row.description, condition: row.condition }
        }
        setTranslations(next)
      }
      setLoading(false)
    }
    loadProduct()
    return () => {
      cancelled = true
    }
  }, [id, isEditing])

  function updateField(field, value) {
    setProduct((prev) => ({ ...prev, [field]: value }))
  }

  function updateTranslation(field, value) {
    setTranslations((prev) => ({ ...prev, [contentLang]: { ...prev[contentLang], [field]: value } }))
  }

  async function handleFileSelect(event) {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    setUploading(true)

    const uploadedUrls = []
    for (const file of files) {
      const path = `${crypto.randomUUID()}-${file.name}`
      const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, file)
      if (!error) {
        const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path)
        uploadedUrls.push(data.publicUrl)
      }
    }

    setProduct((prev) => ({ ...prev, images: [...prev.images, ...uploadedUrls] }))
    setUploading(false)
    event.target.value = ''
  }

  // The first image is the cover on the grid and the product page, so the
  // array order saved with the product is the display order.
  function handlePhotoDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    setProduct((prev) => ({
      ...prev,
      images: arrayMove(prev.images, prev.images.indexOf(active.id), prev.images.indexOf(over.id)),
    }))
  }

  function removeImage(url) {
    setProduct((prev) => ({ ...prev, images: prev.images.filter((img) => img !== url) }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const filled = LANGUAGES.filter(({ code }) => translations[code].title.trim())
    if (filled.length === 0) return
    setSaving(true)
    setSaveError(false)

    const payload = {
      available_from: product.available_from || null,
      original_link: product.original_link.trim() || null,
      price: Number(product.price) || 0,
      category_id: product.category_id || null,
      images: product.images,
      status: product.status,
    }

    const rows = filled.map(({ code }) => ({
      lang: code,
      title: translations[code].title.trim(),
      description: translations[code].description.trim(),
      condition: translations[code].condition.trim(),
    }))

    let productId = id
    let failed = false

    if (isEditing) {
      const { error } = await supabase.from('products').update(payload).eq('id', id)
      failed = Boolean(error)
    } else {
      const { data, error } = await supabase.from('products').insert(payload).select('id').single()
      failed = Boolean(error) || !data
      productId = data?.id
    }

    if (!failed) {
      const { error } = await supabase
        .from('product_translations')
        .upsert(rows.map((row) => ({ ...row, product_id: productId })))
      failed = Boolean(error)
    }

    // Languages the admin emptied are removed. A product that could not get
    // its text is never left behind half-created.
    if (!failed && isEditing) {
      const emptied = LANGUAGES.filter(({ code }) => !translations[code].title.trim()).map(({ code }) => code)
      if (emptied.length > 0) {
        const { error } = await supabase.from('product_translations').delete().eq('product_id', id).in('lang', emptied)
        failed = Boolean(error)
      }
    }
    if (failed && !isEditing && productId) await supabase.from('products').delete().eq('id', productId)

    setSaving(false)
    if (failed) {
      setSaveError(true)
      return
    }
    navigate('/admin')
  }

  if (loading) return null

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{isEditing ? t('admin.form.editProduct') : t('admin.form.newProduct')}</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <span>{t('admin.form.contentLanguage')}</span>
          <div className={styles.langTabs} role="group" aria-label={t('admin.form.contentLanguage')}>
            {LANGUAGES.map(({ code, name }) => (
              <button
                key={code}
                type="button"
                className={code === contentLang ? styles.langTabActive : styles.langTab}
                onClick={() => setContentLang(code)}
                aria-pressed={code === contentLang}
                data-testid={`form-lang-${code}`}
              >
                {name}
                {translations[code].title.trim() ? ' ✓' : ''}
              </button>
            ))}
          </div>
          <small className={styles.photoHint}>{t('admin.form.translationHint')}</small>
        </div>

        <label className={styles.field}>
          <span>{t('admin.form.title')}</span>
          <input
            type="text"
            value={translations[contentLang].title}
            onChange={(e) => updateTranslation('title', e.target.value)}
            required={!LANGUAGES.some(({ code }) => code !== contentLang && translations[code].title.trim())}
            data-testid="form-title"
          />
        </label>

        <label className={styles.field}>
          <span>{t('admin.form.description')}</span>
          <textarea
            rows={5}
            value={translations[contentLang].description}
            onChange={(e) => updateTranslation('description', e.target.value)}
            data-testid="form-description"
          />
        </label>

        <label className={styles.field}>
          <span>{t('admin.form.condition')}</span>
          <input
            type="text"
            value={translations[contentLang].condition}
            onChange={(e) => updateTranslation('condition', e.target.value)}
            placeholder={t('admin.form.conditionHint')}
            data-testid="form-condition"
          />
        </label>

        <label className={styles.field}>
          <span>{t('admin.form.availableFrom')}</span>
          <input
            type="date"
            value={product.available_from}
            onChange={(e) => updateField('available_from', e.target.value)}
            data-testid="form-available-from"
          />
        </label>

        <label className={styles.field}>
          <span>{t('admin.form.originalLink')}</span>
          <input
            type="url"
            value={product.original_link}
            onChange={(e) => updateField('original_link', e.target.value)}
            placeholder={t('admin.form.originalLinkHint')}
            data-testid="form-original-link"
          />
        </label>

        <label className={styles.field}>
          <span>
            {t('admin.form.price')} ({product.currency})
          </span>
          <input
            type="number"
            min="0"
            step="1"
            value={product.price}
            onChange={(e) => updateField('price', e.target.value)}
            required
            data-testid="form-price"
          />
        </label>

        <label className={styles.field}>
          <span>{t('admin.form.category')}</span>
          <select
            value={product.category_id || ''}
            onChange={(e) => updateField('category_id', e.target.value)}
            data-testid="form-category"
          >
            <option value="">{t('admin.form.selectCategory')}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {localizeCategory(category, lang, defaultLang).name}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.field}>
          <span>{t('admin.form.photos')}</span>
          {product.images.length > 1 && <small className={styles.photoHint}>{t('admin.form.photosHint')}</small>}
          <div className={styles.photoGrid}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePhotoDragEnd}>
              <SortableContext items={product.images} strategy={rectSortingStrategy}>
                {product.images.map((url, index) => (
                  <SortablePhoto
                    key={url}
                    url={url}
                    isCover={index === 0}
                    coverLabel={t('admin.form.coverPhoto')}
                    onRemove={removeImage}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <label className={styles.addPhoto}>
              {uploading ? '…' : '+'}
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleFileSelect}
                disabled={uploading}
                data-testid="form-photo-input"
              />
            </label>
          </div>
        </div>

        {saveError && (
          <p className={styles.error} data-testid="form-error">
            {t('admin.form.saveError')}
          </p>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={() => navigate('/admin')} data-testid="form-cancel">
            {t('admin.form.cancel')}
          </button>
          <button type="submit" className={styles.save} disabled={saving || uploading} data-testid="form-save">
            {saving ? t('admin.form.saving') : t('admin.form.save')}
          </button>
        </div>
      </form>
    </div>
  )
}
