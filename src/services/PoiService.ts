import axios from 'axios'

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Request a list of POIs on a specific floor and building.
 * @param buildingId object id of the building.
 * @param floor specify a floor of this building to retrieve POIs.
 * @returns A Promise that resolves to the list of POIs on the selected floor of the building.
 */
async function getAllPOIs(buildingId: string) {
  try {
    const response = await httpClient.get(`/POIs/${buildingId}`)

    return response.data
  } catch (err) {
    console.error(`Error getting all POIs from ${buildingId}...`, err)
    throw err
  }
}

/**
 * Request a list of POIs on a specific floor and building.
 * @param buildingId object id of the building.
 * @param floor specify a floor of this building to retrieve POIs.
 * @returns A Promise that resolves to the list of POIs on the selected floor of the building.
 */
async function getPOIs(buildingId: string, floorId: string) {
  try {
    const response = await httpClient.get(`/POIs/${buildingId}/${floorId}`)

    return response.data
  } catch (err) {
    console.error(`Error getting POIs on floor ${floorId}...`, err)
    throw err
  }
}

/**
 * Request a list of POIs on a specific floor and building.
 * @param buildingId object id of the building.
 * @param poiId specify target POI id .
 * @returns A Promise that resolves to the selected POI of the building.
 */
async function getPOIById(buildingId: string, poiId: string) {
  try {
    const response = await httpClient.get(`/POIs/POI_info/${buildingId}/${poiId}`)

    return response.data
  } catch (err) {
    console.error(`Error getting POI id: ${poiId}...`, err)
    throw err
  }
}

async function getRecommendedInBuilding(buildingId: string, signal?: AbortSignal) {
  try {
    const res = await httpClient.get(`/POIs/${buildingId}/recommended`, { signal })
    return res.data
  } catch (error) {
    console.error(`Error getting recommendation from building id: ${buildingId}...`, error)
    throw error
  }
}

async function getRecommendedOnFloor(buildingId: string, floorId: string, signal?: AbortSignal) {
  const res = await httpClient.get(`/POIs/${buildingId}/${floorId}/recommended`, { signal })
  return res.data
}

export default {
  getAllPOIs,
  getPOIs,
  getPOIById,
  getRecommendedInBuilding,
  getRecommendedOnFloor,
}
