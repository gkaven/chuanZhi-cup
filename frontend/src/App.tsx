import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import Login from './pages/Login'
import Landing from './pages/Landing'
import Chat from './pages/Chat'
import Admin from './pages/Admin'
import Report from './pages/Report'
import Profile from './pages/Profile'
import KnowledgeBase from './pages/KnowledgeBase'
import InterviewSim from './pages/InterviewSim'
import 'antd/dist/reset.css'

const darkTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorBgContainer: 'rgba(255,255,255,0.07)',
    colorBgElevated: '#0D1526',
    colorBorder: 'rgba(255,255,255,0.15)',
    colorText: '#E2E8F0',
    colorTextPlaceholder: 'rgba(255,255,255,0.3)',
    colorPrimary: '#6366F1',
    colorBgBase: '#0A0E1A',
    borderRadius: 8,
  },
}

export default function App() {
  const [logged, setLogged] = useState(!!localStorage.getItem('token'))

  if (!logged) {
    return (
      <ConfigProvider theme={darkTheme}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing onEnter={() => window.location.href = '/login'} />} />
            <Route path="/login" element={<Login onLogin={() => setLogged(true)} />} />
            <Route path="*" element={<Landing onEnter={() => window.location.href = '/login'} />} />
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    )
  }

  return (
    <ConfigProvider theme={darkTheme}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Chat />} />
          <Route path="/report/:id" element={<Report />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/knowledge" element={<KnowledgeBase />} />
          <Route path="/interview-sim" element={<InterviewSim />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}
