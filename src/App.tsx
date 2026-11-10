import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import MapPage from './pages/MapPage'
import SourcesPage from './pages/SourcesPage'
import ToursPage from './pages/ToursPage'
import TrailsPage from './pages/TrailsPage'
import AccountPage from './pages/AccountPage'
import SharedTourPage from './pages/SharedTourPage'
import CloudProvider from './cloud/CloudProvider'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <CloudProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<MapPage />} />
          <Route path="fernwege" element={<TrailsPage />} />
          <Route path="touren" element={<ToursPage />} />
          <Route path="konto" element={<AccountPage />} />
          <Route path="teilen/:id" element={<SharedTourPage />} />
          <Route path="quellen" element={<SourcesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </CloudProvider>
  )
}
