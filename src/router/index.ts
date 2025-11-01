import { createRouter, createWebHistory } from 'vue-router'
import MapView from '@/views/MapView.vue'
import PoiDetail from '@/views/mapPanelViews/PoiDetailView.vue'
import RecommendedView from '@/views/mapPanelViews/RecommendedView.vue'
import NavigationOverviewView from '@/views/mapPanelViews/NavigationOverviewView.vue'
import NavigationView from '@/views/NavigationView.vue'
import beaconService from '@/services/beaconService'
import RedirectView from '@/views/RedirectView.vue'

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
      path: '/beacon/:beaconID',
      name: 'beaconRedirect',
      component: RedirectView,
      beforeEnter: async (to) => {
        const beaconID = to.params.beaconID as string

        // Save to storage (as you had before)
        localStorage.setItem('beaconID', beaconID)

        try {
          // Call the service to find the building
          const { buildingId } = (await beaconService.getBeaconBuilding(beaconID))

          // Redirect to the *correct* building's recommend page
          return { name: 'recommend', params: { buildingId: buildingId } }
        } catch (error) {
          console.error(
            `Failed to find building for beacon ${beaconID}. Redirecting to default.`,
            error,
          )
          // Fallback: Redirect to default building if beacon not found
          return { name: 'recommend', params: { buildingId: DEFAULT_BUILDING_ID } }
        }
      },
    },
  ],
})

export default router
