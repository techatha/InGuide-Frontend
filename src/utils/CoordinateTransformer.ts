import { ref } from 'vue'

export function coordinatesTransform(lat = 0.0, lng = 0.0) {
  const EARTH_RADIUS = 6378137 //appeox meter
  const lat0 = ref(lat)
  const lng0 = ref(lng)

  function latLngToENU(lat: number, lng: number): [number, number] {
    const lat0Rad = Math.cos(((lat0.value as number) * Math.PI) / 180)
    const dLat = ((lat - (lat0.value as number)) * Math.PI) / 180
    const dLng = ((lng - (lng0.value as number)) * Math.PI) / 180
    const nort = dLat * EARTH_RADIUS
    const east = dLng * EARTH_RADIUS * lat0Rad
    return [east, nort]
  }

  function ENUToLatLng(east: number, north: number): [number, number] {
    const lat0Rad = Math.cos(((lat0.value as number) * Math.PI) / 180)
    const dLat = north / EARTH_RADIUS
    const dLng = east / (EARTH_RADIUS * lat0Rad)
    const lat = (lat0.value as number) + (dLat * 180) / Math.PI
    const lng = (lng0.value as number) + (dLng * 180) / Math.PI
    return [lat, lng]
  }

  return {
    latLngToENU,
    ENUToLatLng,
  }
}
