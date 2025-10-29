// src/stores/beacon.ts
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Beacon } from '@/types/beacon'
import { useMapInfoStore } from '@/stores/mapInfo'

// const dummyBeacon:Beacon = {
//   beaconId: 'testBeacon',
//   name: 'Test Beacon',
//   latLng: [18.79966064431139, 98.95053522655873],
//   floorNum: 1
// }

export const useBeaconStore = defineStore('beacon', () => {
  // Use mapInfo store to get the current floor
  const mapInfo = useMapInfoStore()

  // Ref to hold ALL beacons for the building
  const allBeacons = ref<Beacon[]>([]) // Initialize as empty array

  // Action to load ALL beacons
  function loadAllBeacons(newBeacons: Beacon[]) {
    allBeacons.value = newBeacons
  }

  // Action to clear ALL beacons
  function clearAllBeacons() {
    allBeacons.value = []
  }

  // Computed property to get beacons for the currently viewed floor
  const currentFloorBeacons = computed(() => {
    const currentFloorNum = mapInfo.current_floor?.floor
    if (currentFloorNum === undefined || currentFloorNum === null) {
      return [] // Return empty if no floor selected
    }
    // Filter the full list based on floorNumber
    return allBeacons.value.filter((b) => b.floorNumber === currentFloorNum)
  })

  // Updated function to find a beacon by ID from the full list
  function findBeaconById(beaconId: string): Beacon | null { // Return null if not found
    if (allBeacons.value.length === 0) {
      console.warn('findBeaconById called, but no beacons are loaded.')
      return null
    }
    const trimmedIdToFind = beaconId.trim()
    const foundBeacon = allBeacons.value.find((b) => b.beaconId === trimmedIdToFind)

    // Return the found beacon or null (avoid returning dummy data in production)
    return foundBeacon ?? null
  }

  // New function to find beacon and its floor number
  function findBeaconAndFloorById(beaconId: string): { beacon: Beacon; floorNumber: number } | null {
     const beacon = findBeaconById(beaconId);
     // Check beacon exists and has a valid floor number
     if (beacon && beacon.floorNumber !== undefined && beacon.floorNumber !== null) {
         return { beacon, floorNumber: beacon.floorNumber };
     }
     console.warn(`Beacon or floor number not found for ID: ${beaconId}`)
     return null;
  }

  return {
    // State / Getters
    allBeacons,          // The full list
    currentFloorBeacons, // The filtered list for the current floor

    // Actions
    loadAllBeacons,      // Use this in MapDisplay onMounted
    clearAllBeacons,     // Use this if needed (e.g., leaving building view)
    findBeaconById,
    findBeaconAndFloorById // Needed for usePositioningSystem
  }
})
