import { BrowserRouter, Outlet, Routes, Route } from 'react-router-dom'
import { LoginPage } from './presentation/auth/LoginPage'
import { ProtectedRoute } from './presentation/auth/ProtectedRoute'
import { AppLayout } from './presentation/layout/AppLayout'
import { OrderDashboardPage } from './presentation/order/OrderDashboardPage'
import { OrderHistoryPage } from './presentation/order/OrderHistoryPage'
import { StoreFormPage } from './presentation/store/StoreFormPage'
import { ProductListPage } from './presentation/product/ProductListPage'
import { ProductImportPage } from './presentation/product/import/ProductImportPage'
import { AddonGroupListPage } from './presentation/product/addons/AddonGroupListPage'
import { VariationGroupListPage } from './presentation/product/variations/VariationGroupListPage'
import { CategoryListPage } from './presentation/category/CategoryListPage'
import { AdminUserListPage } from './presentation/admin/AdminUserListPage'
import { SetupFirstAdminPage } from './presentation/admin/SetupFirstAdminPage'
import { SettingsPage } from './presentation/settings/SettingsPage'
import { ReportsPage } from './presentation/report/ReportsPage'
import { AttendantListPage } from './presentation/attendant/AttendantListPage'
import { PromotionListPage } from './presentation/promotion/PromotionListPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<SetupFirstAdminPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<OrderDashboardPage />} />
          <Route path="/historico" element={<OrderHistoryPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="/produtos" element={<ProductListPage />} />
          <Route path="/produtos/importar" element={<ProductImportPage />} />
          <Route path="/produtos/adicionais" element={<AddonGroupListPage />} />
          <Route path="/produtos/variacoes" element={<VariationGroupListPage />} />
          <Route path="/produtos/categorias" element={<CategoryListPage />} />
          <Route path="/atendentes" element={<AttendantListPage />} />
          <Route path="/promocoes" element={<PromotionListPage />} />
          <Route
            element={
              <ProtectedRoute requireRole="super_admin">
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route path="/lojas/nova" element={<StoreFormPage />} />
            <Route path="/usuarios" element={<AdminUserListPage />} />
            <Route path="/relatorios" element={<ReportsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
