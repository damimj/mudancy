import { useCallback, useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { SITE_NAME } from '../../config'
import { supabase } from '../../lib/supabase'
import { formatTotal, sumPrices } from '../../lib/currency'
import { useAuth } from '../../lib/AuthContext'
import { useLanguage } from '../../i18n/LanguageContext'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import styles from './AdminLayout.module.css'

export default function AdminLayout() {
  const { isAdmin, loading, signOut } = useAuth()
  const { t, locale } = useLanguage()
  const location = useLocation()
  // null until the first fetch finishes, so we never flash a misleading zero.
  const [totals, setTotals] = useState(null)

  const refreshTotals = useCallback(async () => {
    const { data } = await supabase.from('products').select('price, status')
    const products = data || []
    setTotals({
      estimated: sumPrices(products),
      sold: sumPrices(products.filter((product) => product.status === 'sold')),
    })
  }, [])

  // Refetch on every admin navigation (e.g. after saving the product form)...
  useEffect(() => {
    if (isAdmin) refreshTotals()
  }, [isAdmin, location.pathname, refreshTotals])

  if (loading) return null
  if (!isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={`container ${styles.headerInner}`}>
          <span className={styles.brand}>{SITE_NAME} — Admin</span>
          <div className={styles.stats}>
            <span data-testid="admin-stat-estimated" data-amount={totals?.estimated}>
              {t('admin.stats.estimated')}: {totals ? formatTotal(totals.estimated, undefined, locale) : '…'}
            </span>
            <span className={styles.statSold} data-testid="admin-stat-sold" data-amount={totals?.sold}>
              {t('admin.stats.sold')}: {totals ? formatTotal(totals.sold, undefined, locale) : '…'}
            </span>
          </div>
          <nav className={styles.nav}>
            <NavLink
              to="/admin"
              end
              className={({ isActive }) => (isActive ? styles.navActive : styles.navLink)}
              data-testid="admin-nav-products"
            >
              {t('admin.nav.products')}
            </NavLink>
            <NavLink
              to="/admin/categories"
              className={({ isActive }) => (isActive ? styles.navActive : styles.navLink)}
              data-testid="admin-nav-categories"
            >
              {t('admin.nav.categories')}
            </NavLink>
            <a href="/" className={styles.navLink}>
              {t('admin.nav.viewSite')}
            </a>
            <LanguageSwitcher />
            <button type="button" className={styles.logout} onClick={() => signOut()} data-testid="admin-logout">
              {t('admin.nav.logout')}
            </button>
          </nav>
        </div>
      </header>
      <main className="container">
        {/* ...and pages that change statuses/delete in place refresh via this. */}
        <Outlet context={{ refreshTotals }} />
      </main>
    </div>
  )
}
