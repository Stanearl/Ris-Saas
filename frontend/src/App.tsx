import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import MainLayout from './components/layout/MainLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OverviewPage from './pages/OverviewPage'
import FleetPage from './pages/FleetPage'
import DeviceDetailsPage from './pages/DeviceDetailsPage'
import SettingsPage from './pages/SettingsPage'
import { Toaster } from './components/ui/Toaster'

function App() {
  const { token } = useAuthStore()

  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route 
          path="/login" 
          element={token ? <Navigate to="/overview" /> : <LoginPage />} 
        />
        <Route 
          path="/register" 
          element={token ? <Navigate to="/overview" /> : <RegisterPage />} 
        />
        
        {/* Protected Routes with Layout */}
        <Route 
          path="/overview" 
          element={token ? <MainLayout><OverviewPage /></MainLayout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/fleet" 
          element={token ? <MainLayout><FleetPage /></MainLayout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/fleet/:id" 
          element={token ? <MainLayout><DeviceDetailsPage /></MainLayout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/settings" 
          element={token ? <MainLayout><SettingsPage /></MainLayout> : <Navigate to="/login" />} 
        />
        
        {/* Redirects */}
        <Route path="/dashboard" element={<Navigate to="/overview" />} />
        <Route path="/" element={<Navigate to="/overview" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
