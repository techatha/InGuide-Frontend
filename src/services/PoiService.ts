import axios from 'axios'
import type { PredictionPayload, PredictionResponse } from '@/types/prediction'

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Request list of POIs on specific floor and building.
 * @param buildingId object id of the building.
 * @param floor specify a floor of this bilding to retriece POIs.
 * @returns A Promise that resolves to the list of POIs on selcleted floor of the buliding from the API.
 */
export async function getPOIs(buidingId: string, floor: number) {
  try {
    const response = await httpClient.post<>('/predictMovement', payload)
    // console.log('backend response :', response.data)
    return response.data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.log("error sending prediction...", err);
    if (err.response) {
      console.log(err.response.data);
    }
    throw err;
  }
}

