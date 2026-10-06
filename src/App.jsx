import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { SITE_NAME } from './config'
import Home from './pages/Home'
import ProductPage from './pages/ProductPage'
import AdminLogin from './pages/admin/AdminLogin'
import AdminLayout from './pages/admin/AdminLayout'
import AdminProductList from './pages/admin/AdminProductList'
import AdminProductForm from './pages/admin/AdminProductForm'
import AdminCategories from './pages/admin/AdminCategories'

export default function App() {
  useEffect(() => {
    document.title = SITE_NAME
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/product/:id" element={<ProductPage />} />

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminProductList />} />
        <Route path="products/new" element={<AdminProductForm />} />
        <Route path="products/:id/edit" element={<AdminProductForm />} />
        <Route path="categories" element={<AdminCategories />} />
      </Route>
    </Routes>
  )
}
