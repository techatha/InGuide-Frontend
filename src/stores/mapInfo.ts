import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Floor } from '@/types/floor'
import type { POI } from '@/types/poi'
import type { BuildingInfo } from '@/types/building'
import buildingService from '@/services/buildingService'
import PoiService from '@/services/PoiService'

interface SearchResult {
  poi: POI
  floor: Floor | null
}

export const useMapInfoStore = defineStore('mapInfo', () => {
  const dummyFloor = { floor: 3, floor_plan_url: '/src/assets/sample-img.jpg', id: 'sampleFloor' }

  const isMapInitialized = ref(false)
  const current_buildingId = ref<string>('wcnWozOmfZc2zBXxgm1s')
  const currentBuilding = ref<BuildingInfo | null>(null)
  const currentBuildingPOIs = ref<POI[]>([])
  const floors = ref<Floor[]>([])
  const floorPOIs = ref<POI[]>([])
  const current_floor = ref<Floor>(dummyFloor)
  const recommenedPois = ref<POI[]>([])

  async function changeBuilding(buildingId: string) {
    try {
      const newBuildingInfo = await buildingService.getBuilding(buildingId)
      const allNewBuildingPois = await PoiService.getAllPOIs(buildingId)
      current_buildingId.value = buildingId
      currentBuilding.value = newBuildingInfo
      currentBuildingPOIs.value = allNewBuildingPois
    } catch (error) {
      console.error('There is an error changing current building T-T', error)
    }
  }

  function changeCurrentFloor(floor: Floor) {
    current_floor.value = floor
  }

  function loadPOIs(pois: POI[]) {
    floorPOIs.value = pois
  }

  function loadRecommended(pois: POI[]) {
    recommenedPois.value = pois
  }

  function loadFloors(floorList: Floor[]) {
    floors.value = floorList
  }

  function setMapInitialized(status: boolean) {
    isMapInitialized.value = status
  }

  function findPOIbyId(id: string) {
    const trimmedId = id.trim()
    
    const targetPoi = currentBuildingPOIs.value.find((p) => p.id === trimmedId)
    if (!targetPoi) {
      console.warn(`POI with id "${id}" not found.`)
      return null
    }
    const targetPoiFloor = floors.value.find((f) => f.floor === targetPoi.floor)
    const returnResult: SearchResult = {
      poi: targetPoi,
      floor: targetPoiFloor ?? null
    }
    return returnResult
  }

  function loadBuildingAllPois(newPois: POI[]) {
    currentBuildingPOIs.value = newPois
  }

  return {
    isMapInitialized,
    setMapInitialized,
    current_buildingId,
    current_floor,
    floorPOIs,
    loadPOIs,
    floors,
    changeBuilding,
    changeCurrentFloor,
    loadFloors,
    loadRecommended,
    recommenedPois,
    findPOIbyId,
    loadBuildingAllPois,
    currentBuildingPOIs
  }
})
