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
 * Sends a batch of sensor predictions to the backend and receives a prediction result.
 * @param payload The data structure containing an array of prediction objects with data interval.
 * @returns A Promise that resolves to the PredictionResult from the API.
 */
export async function submitPayload(payload: PredictionPayload) {
  try {
    // console.log("service :", payload);
    const response = await httpClient.post<PredictionResponse>('/predictMovement', payload)
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

