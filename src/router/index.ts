import { createRouter, createWebHistory } from 'vue-router'
import MapView from '@/views/MapView.vue'
import PoiDetail from '@/views/mapPanelViews/PoiDetailView.vue'
import RecommendedView from '@/views/mapPanelViews/RecommendedView.vue'
import NavigationOverviewView from '@/views/mapPanelViews/NavigationOverviewView.vue'
import NavigationView from '@/views/NavigationView.vue'

// This is your app's default building ID
const DEFAULT_BUILDING_ID = 'm0Jhe7OPU45kdGvKLZ0D'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      // Redirects the root path '/' to the default building's map
      path: '/',
      name: 'home',
      redirect: () => {
        return { name: 'recommend', params: { buildingId: DEFAULT_BUILDING_ID } }
      },
    },
    {
      // This is the new parent route that captures the buildingId
      path: '/:buildingId',
      name: 'BuildingHome',
      component: MapView,
      // This passes route params (like :buildingId) as props to MapView
      props: true,
      children: [
        {
          // Matches /:buildingId
          path: '',
          name: 'recommend',
          component: RecommendedView,
        },
        {
          // Matches /:buildingId/details/:id
          path: 'details/:id',
          name: 'placeDetail',
          component: PoiDetail,
          props: true,
        },
        {
          // Matches /:buildingId/overview/:id
          path: 'overview/:id',
          name: 'navigationOverview',
          component: NavigationOverviewView,
          props: true,
        },
      ],
    },
    {
      // This route is also prefixed with :buildingId
      // Matches /:buildingId/navigate/:id
      path: '/:buildingId/navigate/:id',
      name: 'navigate',
      component: NavigationView,
      // This will pass both :buildingId and :id as props
      props: true,
    },
    {
      // IMPORTANT: Changed path to avoid conflict with /:buildingId
      path: '/beacon/:beaconID',
      name: 'beaconRedirect',
      redirect: (to) => {
        const beaconID = to.params.beaconID as string
        localStorage.setItem('beaconID', beaconID)
        // Redirects to the root, which will then send to the default building
        return { name: 'home' }
      },
    },
  ],
})

export default router
