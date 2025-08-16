import type { POI } from "@/types/poi"

const mockPOIs: POI[] = [
  {
    id: 'POI_FT1',
    name: 'Toilet 3rd Floor',
    location: [18.7991, 98.9504],
    type: 'Restroom',
    images: ['/src/assets/sample-img.jpg'],
    detail: 'text'
  },
  {
    id: 'POI_Lec302',
    name: 'B302',
    location: [18.7993, 98.9505],
    type: 'Lecture Room',
    images: ['/src/assets/sample-img.jpg'],
    detail: 'description'
  },
  {
    id: 'POI_Lec205',
    name: 'B205',
    location: [18.7995, 98.9507],
    type: 'Lecture Room',
    images: ['/src/assets/sample-img.jpg'],
    detail: 'test'
  },
  {
    id: 'POI_Lab302',
    name: 'C302',
    location: [18.7997, 98.9508],
    type: 'Computer Lab',
    images: ['/src/assets/sample-img.jpg'],
    detail: 'test test'
  },
]

async function getRecommendedPOIs(): Promise<POI[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockPOIs)
    }, 500)
  })
}

async function getById(id:string | number): Promise<POI | null> {
  const key = String(id)
  return mockPOIs.find(p => String(p.id) === key) ?? null
}

export default {
  getRecommendedPOIs,
  getById
}



