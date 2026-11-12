import { Link } from 'react-router-dom'
import PageFrame from '../components/PageFrame'

export default function NotFoundPage() {
  return (
    <PageFrame sheet="00" title="Nicht gefunden" intro="Diese Seite gibt es nicht (mehr).">
      <Link to="/" className="btn btn-primary">
        Zur Karte
      </Link>
    </PageFrame>
  )
}
