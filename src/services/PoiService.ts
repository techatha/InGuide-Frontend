import axios from 'axios'

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  timeout: 10000,
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
async function getPOIs(buildingId: string, floorId: string) {
  try {
    const response = await httpClient.get(`/POIs/${buildingId}/${floorId}`);

    return response.data;
  } catch (err) {
    console.error(`Error getting POIs on floor ${floorId}...`, err);
    throw err;
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
    const response = await httpClient.get(`/POIs/POI_info/${buildingId}/${poiId}`);

    return response.data;
  } catch (err) {
    console.error(`Error getting POI id: ${poiId}...`, err);
    throw err;
  }
}

export default {
  getPOIs,
  getPOIById
}
