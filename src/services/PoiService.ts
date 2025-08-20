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
async function getPOIs(buildingId: string, floor: number) {
  try {
    const response = await httpClient.get('/POIs', {
      params: {
        building_id: buildingId,
        floor: floor
      }
    });

    return response.data;
  } catch (err) {
    console.error(`Error getting POIs on floor ${floor}...`, err);
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
    const response = await httpClient.get('/POIs/POI', {
      params: {
        building_id: buildingId,
        poi_id: poiId
      }
    });

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
