import axios from 'axios'

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function getFloors(buildingId: string) {
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
