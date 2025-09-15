export interface POI {
  id: string
  name: string
  location: [number, number]
  floor: number
  type: string
  images: string[]
  detail: string
  recommended?: boolean
}
