import { createRouter, createWebHistory } from 'vue-router'
import MapView from '@/views/MapView.vue'
import PoiDetail from '@/views/mapPanelViews/PoiDetailView.vue'
import RecommendedView from '@/views/mapPanelViews/RecommendedView.vue'
import NavigationOverviewView from '@/views/mapPanelViews/NavigationOverviewView.vue'
import NavigationView from '@/views/NavigationView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: MapView,
      children: [
        {
          path: '',
          name: 'recommend',
          component: RecommendedView,
        },
        {
          path: 'details/:id',
          name: 'placeDetail',
          component: PoiDetail,
          props: true,
        },
        {
          path: 'overview/:id',
          name: 'navigationOverview',
          component: NavigationOverviewView,
          props: true,
        },
      ],
    },
    {
      path: '/:beaconID',
      name: 'beaconRedirect',
      redirect: (to) => {
        const beaconID = to.params.beaconID as string
        localStorage.setItem('beaconID', beaconID)
        return { name: 'home' }
      },
    },
    {
      path: '/navigate/:id',
      name: 'navigate',
      component: NavigationView,
    },
  ],
})

export default router
