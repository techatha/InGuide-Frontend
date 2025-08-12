import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faRestroom, faChalkboardTeacher, faDesktop, faCircle } from '@fortawesome/free-solid-svg-icons'
import PoiService from '@/services/mocks/PoiService'
import { map } from './useMap'
import L from 'leaflet'

const poiIconMap: Record<string, IconDefinition> = {
  'Restroom': faRestroom,
  'Lecture Room': faChalkboardTeacher,
  'Computer Lab': faDesktop,
}

function createSvgIcon(icon: IconDefinition, size = 18, color = 'white') {
  const [width, height, , , svgPath] = icon.icon
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${size}" height="${size}" fill="${color}">
      <path d="${svgPath}" />
    </svg>
  `
}

export function createPOIMarker(
  latlng: [number, number],
  color: string,
  poiType: string,
  name?: string
) {
  const iconDef = poiIconMap[poiType] || faCircle
  const svgIcon = createSvgIcon(iconDef)

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
    iconSize: [36, 50],  // increase height to fit label
    iconAnchor: [18, 50], // anchor at bottom center of icon + label
  })

  const poi = L.marker(latlng, { icon })

  if (name) {
    poi.bindPopup(name)
  }

  try {
    poi.addTo(map.value as L.Map)
    return true
  } catch (error) {
    console.log(error)
    return false
  }
}


export async function renderAllPOI() {
  const POIs = await PoiService.getRecommendedPOIs()
  POIs.forEach(p => {
    const color = '#FDA172'
    createPOIMarker(p.location, color, p.type, p.name)
  });
}
