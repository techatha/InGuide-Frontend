import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faRestroom,
  faChalkboardTeacher,
  faDesktop,
  faCircle,
} from '@fortawesome/free-solid-svg-icons'

import L, { Map } from 'leaflet'
import router from '@/router'
import type { POI } from '@/types/poi'
import { useUIMenuPanelStore } from '@/stores/uiMenuPanel'
import { toRaw, type Ref } from 'vue'

export function usePOI(map: Ref<Map>, poiLayer: L.LayerGroup) {
  function createPOIMarker(latlng: [number, number], poiType: string, id: string, name?: string) {
    const iconDef = poiIconMap[poiType] || faCircle
    const svgIcon = createSvgIcon(iconDef)
    const color = poiColorMap[poiType] || '#FDA172'

    const uiStore = useUIMenuPanelStore()

    const icon = L.divIcon({
      className: 'custom-poi-icon',
      html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        color: white;
        font-weight: 600;
        font-size: 12px;
        user-select: none;
      ">
        <div style="
          background-color: ${color};
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 0 5px rgba(0,0,0,0.4);
        ">
          ${svgIcon}
        </div>
        <div style="margin-top: 2px; color: black; background: white; padding: 0 4px; border-radius: 3px; white-space: nowrap;">
          ${name ?? ''}
        </div>
      </div>
    `,
      iconSize: [36, 50], // increase height to fit label
      iconAnchor: [18, 50], // anchor at bottom center of icon + label
    })

    const poi = L.marker(latlng, { icon })

    poi.on('click', () => {
      uiStore.showDetail()
      map.value?.setView(latlng)
      router.push({ name: 'placeDetail', params: { id } })
    })

    return poi
  }

  function renderPOIs(POIs: POI[]) {
    POIs.forEach((p) => {
      const poi = createPOIMarker(p.location, p.type, p.id, p.name)
      try {
        poi.addTo(toRaw(poiLayer))
      } catch (e) {
        console.log(e)
      }
    })
  }

  function removePOIs() {
    toRaw(poiLayer).clearLayers()
  }

  return {
    renderPOIs,
    removePOIs,
  }
}

// Helper functions
const poiIconMap: Record<string, IconDefinition> = {
  Restroom: faRestroom,
  'Lecture Room': faChalkboardTeacher,
  'Computer Lab': faDesktop,
}

const poiColorMap: Record<string, string> = {
  Restroom: '#FF0000',
  'Lecture Room': '#00FF00',
  'Computer Lab': '#0000FF',
}

function createSvgIcon(icon: IconDefinition, size = 18, color = 'white') {
  const [width, height, , , svgPath] = icon.icon
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${size}" height="${size}" fill="${color}">
      <path d="${svgPath}" />
    </svg>
  `
}
