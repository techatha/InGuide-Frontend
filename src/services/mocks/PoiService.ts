import type { POI } from "@/types/poi"

const mockPOIs: POI[] = [
  {
    id: 1,
    name: 'Toilet 3rd Floor',
    location: [18.799661920915920, 98.95048809046690],
    type: 'Restroom',
    image: '/src/assets/sample-img.jpg',
  },
  {
    id: 2,
    name: 'B302',
    location: [18.799661920915920, 98.95048809046690],
    type: 'Lecture Room',
    image: '/src/assets/sample-img.jpg'
  },
  {
    id: 3,
    name: 'B205',
    location: [18.799661920915920, 98.95048809046690],
    type: 'Lecture Room',
    image: '/src/assets/sample-img.jpg'
  },
  {
    id: 4,
    name: 'C302',
    location: [18.799661920915920, 98.95048809046690],
    type: 'Computer Lab',
    image: '/src/assets/sample-img.jpg'
  }
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
