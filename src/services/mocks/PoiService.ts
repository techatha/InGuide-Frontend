export interface POI {
  id: number
  name: string
  type: string
  image: string
}

const mockPOIs: POI[] = [
  {
    id: 1,
    name: 'Toilet 3rd Floor',
    type: 'Restroom',
    image: '/src/assets/sample-img.jpg'
  },
  {
    id: 2,
    name: 'B302',
    type: 'Lecture Room',
    image: '/src/assets/sample-img.jpg'
  },
  {
    id: 3,
    name: 'B205',
    type: 'Lecture Room',
    image: '/src/assets/sample-img.jpg'
  },
  {
    id: 4,
    name: 'C302',
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
