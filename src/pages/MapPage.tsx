import MapView from '../map/MapView'
import Highlights from '../map/Highlights'
import SearchBox from '../map/SearchBox'
import Planner from '../planner/Planner'

export default function MapPage() {
  return (
    <MapView>
      <SearchBox />
      <Planner />
      <Highlights />
    </MapView>
  )
}
