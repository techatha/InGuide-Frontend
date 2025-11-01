// src/services/beaconService.ts
import axios from 'axios'
import type { Beacon } from '@/types/beacon'

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

async function getBeacons(buildingId: string, floorId: string): Promise<Beacon[]> {
  try {
    const response = await httpClient.get(`/beacon/${buildingId}/${floorId}`)
    return response.data
  } catch (err) {
    console.error(`Error getting beacons on floor ${floorId}...`, err)
    throw err
  }
}

async function getAllBeacons(buildingId: string): Promise<Beacon[]> {
  try {
    const response = await httpClient.get(`/beacon/${buildingId}/all_beacons`)
    return response.data
  } catch (err) {
    console.error(`Error getting beacons for ${buildingId}...`, err)
    throw err
  }
}

async function getBeaconBuilding(beaconId: string): Promise<{ buildingId: string }> {
  try {
    // This URL matches your new backend endpoint
    const response = await httpClient.get(`/beacon/${beaconId}/get_buildingId`)
    // The return type { buildingId: string } matches the backend
    return response.data
  } catch (err) {
    console.error(`Error getting building for beacon ${beaconId}...`, err)
    throw err
  }
}

export default {
  getBeacons,
  getAllBeacons,
  getBeaconBuilding
}
