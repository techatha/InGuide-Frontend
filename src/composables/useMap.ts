import { ref } from 'vue'
import L, { type PolylineOptions } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import mockMap from '@/assets/InGuide/F3_floor_plan.svg'

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

let _mapBound = L.latLngBounds([0, 1], [1, 0])
let _mapImageOverlay: L.ImageOverlay | null = null
let _mapWalkablePath: L.Polyline | null = null

export function init(mapContainer: HTMLElement) {
  map.value = L.map(mapContainer, {
    zoomControl: false,
  }).fitBounds(_mapBound)
  map.value.createPane('userPane').style.zIndex = '999'
  _mapImageOverlay = L.imageOverlay(mockMap, _mapBound).addTo(map.value as L.Map)
  userPosition.addTo(map.value as L.Map)
  console.log('map at 0,0')
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

export function setUserPosition(newLatLng: [number, number]) {
  userPosition.setLatLng(newLatLng)
}

export function setViewToUser() {
  map.value?.setView(userPosition.getLatLng())
}

export function setWalkablePath(latlng: [[number, number], [number, number]], style: PolylineOptions) {
  _mapWalkablePath = L.polyline(latlng, style)
  _mapWalkablePath.addTo(map.value as L.Map)
}
