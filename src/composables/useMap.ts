import { ref } from 'vue'
import L, { type PolylineOptions } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import mockMap from '@/assets/sample-img.jpg'

export const map = ref<L.Map | null>(null)
const userPosition = L.circleMarker([0, 0], {
  radius: 10, // Radius of the circle
  fillColor: '#278cea', // Fill color
  color: '#fffbf3', // Border color
  weight: 2, // Border width
  opacity: 1, // Border opacity
  fillOpacity: 1, // Fill opacity
  pane: 'userPane',
})

const headingLine = L.polyline([], {
  color: '#ff0000', // red arrow
  weight: 3,
  opacity: 0.9,
  pane: 'userPane',
})

// for debug
const userDebugPosition = L.circleMarker([0, 0], {
  radius: 10, // Radius of the circle
  fillColor: '#ED7117', // Fill color
  color: '#fffbf3', // Border color
  weight: 2, // Border width
  opacity: 1, // Border opacity
  fillOpacity: 1, // Fill opacity
  pane: 'userPane',
})

let _mapBound = L.latLngBounds([0, 1], [1, 0])
let _mapImageOverlay: L.ImageOverlay | null = null
let _mapWalkablePath: L.Polyline | null = null

export async function init(mapContainer: HTMLElement) {
  return new Promise<void>((resolve, reject) => {
    map.value = L.map(mapContainer, {
      zoomControl: false,
    }).fitBounds(_mapBound)
    map.value.createPane('userPane').style.zIndex = '999'
    _mapImageOverlay = L.imageOverlay(mockMap, _mapBound).addTo(map.value as L.Map)
    _mapImageOverlay.once("load", () => resolve())
    _mapImageOverlay.once("error", (err) => {
      console.error("Failed to load map image", err)
      reject(new Error("Failed to load map image"))
    })
    userPosition.addTo(map.value as L.Map)
    headingLine.addTo(map.value as L.Map)
    // debug position
    userDebugPosition.addTo(map.value as L.Map)
    console.log('map at 0,0')
  })
}

export function setMapBound(sw: [number, number], ne: [number, number]) {
  _mapBound = L.latLngBounds(sw, ne)
  map.value?.fitBounds(_mapBound)
  _mapImageOverlay?.setBounds(_mapBound)
  map.value?.setView(sw)
}

export function setMapOverlay(filepath: string) {
  _mapImageOverlay?.setUrl(filepath)
}

export function setUserPosition(newLatLng: [number, number], headingRad: number) {
  userPosition.setLatLng(newLatLng)
  // Calculate the heading line end point
  const length = 0.00005 // ~5 meters (adjust if needed)
  const endLat = newLatLng[0] + length * Math.cos(-headingRad)
  const endLng = newLatLng[1] + length * Math.sin(-headingRad)

  // Update the heading line
  headingLine.setLatLngs([
    [newLatLng[0], newLatLng[1]],
    [endLat, endLng],
  ])
}

// for debug
export function setUserDebugPosition(newLatLng: [number, number]) {
  userDebugPosition.setLatLng(newLatLng)
}

export function setViewToUser() {
  map.value?.setView(userPosition.getLatLng())
}

export function setView(latlng: [number, number]) {
  const loc = L.latLng(latlng[0], latlng[1])
  map.value?.setView(loc)
}

export function setWalkablePath(
  latlng: [[number, number], [number, number]],
  style: PolylineOptions,
) {
  _mapWalkablePath = L.polyline(latlng, style)
  _mapWalkablePath.addTo(map.value as L.Map)
}

export function changeFloorPlan(newImageUrl: string) {
  if (_mapImageOverlay) {
    _mapImageOverlay.setUrl(newImageUrl)
  }
}
