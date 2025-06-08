import { ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import mockMap from '@/assets/MockMap.svg'

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
const invisiblePath = {
  color: 'orange',
  weight: 5,
  smoothFactor: 1
}

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

export function setUserPosition(newLatLng: [number, number]) {
  userPosition.setLatLng(newLatLng)
}

export function setViewToUser() {
  map.value?.setView(userPosition.getLatLng())
}

export function setWalkablePath() {
  _mapWalkablePath = L.polyline([[18.755652251965408, 99.03422248332312], [18.755780543801684,99.03483569353317], [18.755511641013268,99.03451059679955]], invisiblePath)
  _mapWalkablePath.addTo(map.value as L.Map)
}
