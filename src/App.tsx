import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import CloudProvider from './cloud/CloudProvider'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'

// Seiten einzeln nachladen: Die Karte (MapLibre) ist gross und wird nicht überall gebraucht.
const MapPage = lazy(() => import('./pages/MapPage'))
const TrailsPage = lazy(() => import('./pages/TrailsPage'))
const ToursPage = lazy(() => import('./pages/ToursPage'))
const StickersPage = lazy(() => import('./pages/StickersPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const SharedTourPage = lazy(() => import('./pages/SharedTourPage'))
const SourcesPage = lazy(() => import('./pages/SourcesPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

export default function App() {
  return (
    <ErrorBoundary>
      <CloudProvider>
        <Suspense fallback={<p role="status" className="label p-6 text-muted">Lädt …</p>}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<MapPage />} />
              <Route path="fernwege" element={<TrailsPage />} />
              <Route path="touren" element={<ToursPage />} />
              <Route path="sticker" element={<StickersPage />} />
              <Route path="konto" element={<AccountPage />} />
              <Route path="teilen/:id" element={<SharedTourPage />} />
              <Route path="quellen" element={<SourcesPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </CloudProvider>
    </ErrorBoundary>
  )
}
