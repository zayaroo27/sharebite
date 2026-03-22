import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import MainLayout from './layouts/MainLayout.jsx'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import AuthLayout from './layouts/AuthLayout.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ListingsPage from './pages/ListingsPage.jsx'
import ListingDetailsPage from './pages/ListingDetailsPage.jsx'
import DonorDashboardPage from './pages/DonorDashboardPage.jsx'
import CreateListingPage from './pages/CreateListingPage.jsx'
import RecipientDashboardPage from './pages/RecipientDashboardPage.jsx'
import AdminDashboardPage from './pages/AdminDashboardPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import NotificationsPage from './pages/NotificationsPage.jsx'
import MessagesPage from './pages/MessagesPage.jsx'
import NotAuthorizedPage from './pages/NotAuthorizedPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/listings" element={<ListingsPage />} />
        <Route path="/listings/:id" element={<ListingDetailsPage />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route
        element={(
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        )}
      >
        <Route
          path="/dashboard/donor"
          element={(
            <ProtectedRoute allowedRoles={['DONOR']}>
              <DonorDashboardPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/dashboard/donor/create-listing"
          element={(
            <ProtectedRoute allowedRoles={['DONOR']}>
              <CreateListingPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/dashboard/recipient"
          element={(
            <ProtectedRoute allowedRoles={['RECIPIENT']}>
              <RecipientDashboardPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/dashboard/admin"
          element={(
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:requestId" element={<MessagesPage />} />
        <Route path="/requests/:requestId/messages" element={<MessagesPage />} />
      </Route>

      <Route path="/not-authorized" element={<NotAuthorizedPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
