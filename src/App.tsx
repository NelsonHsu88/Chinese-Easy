import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { TabLayout } from './components/TabLayout'
import { Dashboard } from './screens/Dashboard'
import { NewWords } from './screens/NewWords'
import { Review } from './screens/Review'
import { Settings } from './screens/Settings'
import { Onboarding } from './screens/Onboarding'
import { Dictionary } from './screens/Dictionary'
import { Profile } from './screens/Profile'
import { DueWords } from './screens/DueWords'

function AppRoutes() {
  const { onboardingComplete } = useApp()
  const location = useLocation()

  if (!onboardingComplete && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/review" element={<Review />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/due-words" element={<DueWords />} />
      <Route element={<TabLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new-words" element={<NewWords />} />
        <Route path="/dictionary" element={<Dictionary />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  )
}
