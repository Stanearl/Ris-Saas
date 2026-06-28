import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Icon } from 'leaflet'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { MapPin } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

interface GPSMapProps {
  latitude: number
  longitude: number
}

// Custom marker icon
const truckIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

export default function GPSMap({ latitude, longitude }: GPSMapProps) {
  return (
    <Card className="h-[400px]">
      <CardHeader>
        <CardTitle className="flex items-center">
          <MapPin className="mr-2 h-5 w-5" />
          Live GPS Location
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[320px] rounded-b-lg overflow-hidden">
          <MapContainer
            center={[latitude, longitude]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[latitude, longitude]} icon={truckIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">Current Location</p>
                  <p className="text-xs text-gray-600">
                    {latitude.toFixed(6)}, {longitude.toFixed(6)}
                  </p>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  )
}
