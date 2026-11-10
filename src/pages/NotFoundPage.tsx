import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">Seite nicht gefunden</h1>
      <Link to="/" className="rounded-xl bg-accent px-6 py-3 font-semibold text-bg">
        Zur Karte
      </Link>
    </div>
  )
}
