import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './index.css'

import LandingPage   from './pages/LandingPage'
import LoginPage     from './pages/LoginPage'
import RegisterPage  from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ContractPage  from './pages/ContractPage'
import AppShell      from './components/AppShell'
import ProtectedRoute from './components/ProtectedRoute'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/"         element={<LandingPage />} />
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected app */}
          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route path="/dashboard"            element={<DashboardPage />} />
            <Route path="/contracts/:id"        element={<ContractPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1c1c22',
            color:      '#c4c4d4',
            border:     '1px solid #32323e',
            fontFamily: 'DM Sans, sans-serif',
            fontSize:   '14px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#141418' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#141418' } },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
)
