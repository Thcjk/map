import MapView from '../map/MapView'
import SearchBox from '../map/SearchBox'
import Planner from '../planner/Planner'

export default function MapPage() {
  return (
    <MapView>
      <SearchBox />
      <Planner />
    </MapView>
  )
}
