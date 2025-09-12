import type { Beacon } from "@/types/beacon"

export function findNearestBeacon(lat: number, lng: number, beacons: Beacon[]) {
  let nearest: { beacon: Beacon, distance: number } | null = null
  let minDistance = Infinity

  for (const beacon of beacons) {
    const [bLat, bLng] = beacon.latLng
    const dist = haversineDistance(lat, lng, bLat, bLng)

    if (dist < minDistance) {
      minDistance = dist
      nearest = { beacon: beacon, distance: dist }
    }
  }

  return nearest
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // radius of Earth in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

