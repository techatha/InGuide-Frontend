import type { BuildingInfo } from '@/types/building';
import axios from 'axios'

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

async function getFloors(buildingId: string) {
  try {
    const response = await httpClient.get(`/buildings/${ buildingId }/floors`, {
    });

    const floors = response.data;

    // ✅ preload images so they are cached
    floors.forEach((floor: { floor_plan_url: string }) => {
      const img = new Image();
      img.src = floor.floor_plan_url;
    });

    return floors;
  } catch (err) {
    console.error(`Error getting floors from ${buildingId}...`, err);
    throw err;
  }
}

async function getBuilding(id: string): Promise<BuildingInfo> {
  try {
    const response = await httpClient.get(`/buildings/${id}`)
    return response.data
  } catch (err) {
    console.error('Cannot get building from the server...', err)
    throw err
  }
}

export default {
  getFloors,
  getBuilding,
}
