import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import CloudProvider from './cloud/CloudProvider'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'

const TrailsPage = lazy(() => import('./pages/TrailsPage'))
const ToursPage = lazy(() => import('./pages/ToursPage'))
const MorePage = lazy(() => import('./pages/MorePage'))
const SharedTourPage = lazy(() => import('./pages/SharedTourPage'))
const SourcesPage = lazy(() => import('./pages/SourcesPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

export default function App() {
  return (
    <ErrorBoundary>
      <CloudProvider>
        <Routes>
          <Route element={<Layout />}>
            {/* «/» ist die Karte selbst; sie gehört zum Gerüst und bleibt immer geladen. */}
            <Route index element={null} />
            <Route path="fernwege" element={<TrailsPage />} />
            <Route path="touren" element={<ToursPage />} />
            <Route path="mehr" element={<MorePage />} />
            {/* Ziel des Anmeldelinks (in Supabase als Redirect-URL eingetragen) */}
            <Route path="konto" element={<MorePage />} />
            <Route path="teilen/:id" element={<SharedTourPage />} />
            <Route path="quellen" element={<SourcesPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </CloudProvider>
    </ErrorBoundary>
  )
}
