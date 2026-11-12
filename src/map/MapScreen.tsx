import Planner from '../planner/Planner'
import MapView from './MapView'

/** Die Kartenseite: Karte plus Bedienung (Suche, Planen, Route, Aufzeichnen). */
export default function MapScreen() {
  return (
    <MapView>
      <Planner />
    </MapView>
  )
}
