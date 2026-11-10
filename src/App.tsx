import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import MapPage from './pages/MapPage'
import SourcesPage from './pages/SourcesPage'
import ToursPage from './pages/ToursPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<MapPage />} />
        <Route path="touren" element={<ToursPage />} />
        <Route path="quellen" element={<SourcesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
