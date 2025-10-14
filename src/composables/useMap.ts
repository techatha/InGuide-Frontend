import L, { Map } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import mockMap from '@/assets/sample-img.jpg'
import { toRaw, type Ref } from 'vue'

export function useMap(map: Ref<Map | null>) {
  let _mapBound = L.latLngBounds([0, 1], [1, 0])
  let _mapImageOverlay: L.ImageOverlay | null = null

  async function init(mapContainer: HTMLElement, poiLayer?: L.LayerGroup, pathLayer?: L.LayerGroup) {
    return new Promise<void>((resolve, reject) => {
      map.value = L.map(mapContainer, {
        zoomControl: false,
        attributionControl: false,
      }).fitBounds(_mapBound)
      toRaw(map.value).createPane('userPane').style.zIndex = '999'
      _mapImageOverlay = L.imageOverlay(mockMap, _mapBound)
      _mapImageOverlay.once('load', () => resolve())
      _mapImageOverlay.once('error', (err) => {
        console.error('Failed to load map image', err)
        reject(new Error('Failed to load map image'))
      })
      _mapImageOverlay.addTo(toRaw(map.value) as L.Map)
      userPosition.addTo(toRaw(map.value) as L.Map)
      headingLine.addTo(toRaw(map.value) as L.Map)
      // debug position
      userDebugPosition.addTo(toRaw(map.value) as L.Map)
      poiLayer?.addTo(toRaw(map.value) as L.Map)
      pathLayer?.addTo(toRaw(map.value) as L.Map)
      console.log('map at 0,0')
    })
  }

  function setMapBound(sw: [number, number], ne: [number, number]) {
    _mapBound = L.latLngBounds(sw, ne)
    toRaw(map.value)?.fitBounds(_mapBound)
    _mapImageOverlay?.setBounds(_mapBound)
    toRaw(map.value)?.setView(sw)
  }

  function setMapOverlay(filepath: string) {
    _mapImageOverlay?.setUrl(filepath)
  }

  function setUserPosition(newLatLng: [number, number], headingRad: number) {
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
  function setUserDebugPosition(newLatLng: [number, number]) {
    userDebugPosition.setLatLng(newLatLng)
  }

  function setViewToUser() {
    map.value?.setView(userPosition.getLatLng())
  }

  function setView(latlng: [number, number]) {
    const loc = L.latLng(latlng[0], latlng[1])
    map.value?.setView(loc)
  }

  // function setWalkablePath(
  //   latlng: [[number, number], [number, number]],
  //   style: PolylineOptions,
  // ) {
  //   const newPath = L.polyline(latlng, style)
  //   newPath.addTo(pathLayer)
  // }

  // function clearWalkablePaths() {
  //   pathLayer.clearLayers()
  // }

  async function changeImageOverlay(newImageUrl: string) {
    return new Promise<void>((resolve, reject) => {
      if (_mapImageOverlay) {
        _mapImageOverlay.once('load', () => resolve())
        _mapImageOverlay.once('error', (err) => {
          console.error('Failed to load map image', err)
          reject(new Error('Failed to load map image'))
        })
        _mapImageOverlay.setUrl(newImageUrl)
      }
    })
  }

  return {
    init,
    setMapBound,
    setMapOverlay,
    setUserPosition,
    setUserDebugPosition,
    setViewToUser,
    setView,
    // setWalkablePath,
    // clearWalkablePaths,
    changeImageOverlay,
  }
}

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
