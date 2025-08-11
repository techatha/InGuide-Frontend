import type { POI } from "@/types/poi"

const mockPOIs: POI[] = [
  {
    id: 1,
    name: 'Toilet 3rd Floor',
    location: [18.7991, 98.9504],
    type: 'Restroom',
    image: '/src/assets/sample-img.jpg',
  },
  {
    id: 2,
    name: 'B302',
    location: [18.7993, 98.9505],
    type: 'Lecture Room',
    image: '/src/assets/sample-img.jpg',
  },
  {
    id: 3,
    name: 'B205',
    location: [18.7995, 98.9507],
    type: 'Lecture Room',
    image: '/src/assets/sample-img.jpg',
  },
  {
    id: 4,
    name: 'C302',
    location: [18.7997, 98.9508],
    type: 'Computer Lab',
    image: '/src/assets/sample-img.jpg',
  },
]


export default {
  async getRecommendedPOIs(): Promise<POI[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockPOIs)
      }, 500)
    })
  }
}
