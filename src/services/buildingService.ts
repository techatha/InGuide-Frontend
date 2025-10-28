import type { BuildingInfo } from '@/types/building';
import type { Floor } from '@/types/floor';
import type { JSONNavigationGraph } from '@/types/path';
import { convertToGraph } from '@/utils/covertToGraph';
import axios from 'axios'

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

async function getFloors(buildingId: string): Promise<Floor[]> { // <-- 4. Return correct type
  try {
    const response = await httpClient.get(`/buildings/${buildingId}/floors`)

    // Type the raw response data
    const floorsData: (Omit<Floor, 'graph'> & { graph?: JSONNavigationGraph })[] = response.data;

    // --- 5. Add conversion loop ---
    const floorsWithConvertedGraphs: Floor[] = floorsData.map(floorData => {
      let convertedGraph = { nodes: new Map(), adjacencyList: new Map() }; // Default empty graph
      try {
        if (floorData.graph && floorData.graph.nodes) {
          convertedGraph = convertToGraph(floorData.graph.nodes, floorData.graph.adjacencyList);
        } else {
           console.warn(`Graph data missing or invalid for floor ${floorData.id}`);
        }
      } catch (convertError) {
         console.error(`Error converting graph for floor ${floorData.id}:`, convertError);
      }

      // Preload image
      const img = new Image();
      img.src = floorData.floor_plan_url;

      // Return the final Floor object with the Map-based graph
      return {
        ...floorData,
        graph: convertedGraph // Now matches the Floor interface
      };
    });
    // --- End conversion loop ---

    return floorsWithConvertedGraphs; // <-- 6. Return the converted array
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
