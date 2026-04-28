import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import DeviceList from './pages/DeviceList'
import CreateDashboard from './pages/CreateDashboard'
import AdminPanel from './pages/AdminPanel'
import DataLogs from './pages/DataLogs'
import DevicesAndInfrastructure from './pages/DevicesAndInfrastructure'

import Layout from './components/Layout'
import AdminRoute from './components/AdminRoute'
import './index.css'

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white flex-col gap-6">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-[#346eea] rounded-full animate-spin"></div>
        <div className="flex flex-col items-center">
          <p className="text-[#111827] font-black uppercase tracking-[0.2em] text-xs">Initializing Session</p>
          <p className="text-[#94A3B8] text-[10px] font-bold uppercase tracking-widest mt-1">Establishing Secure Handshake...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />

        {/* Protected Routes */}
        <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          <Route path="devices" element={<DeviceList />} />

          {/* Admin Only Routes */}
          <Route path="create-dashboard" element={<AdminRoute><CreateDashboard /></AdminRoute>} />
          <Route path="admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
          <Route path="infrastructure" element={<AdminRoute><DevicesAndInfrastructure /></AdminRoute>} />
          <Route path="logs" element={<AdminRoute><DataLogs /></AdminRoute>} />

          {/* Catch-all redirect for /dashboard to index map */}
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
