import { createRouter, createWebHistory } from 'vue-router'
import SearchBar from '@/components/SearchBar.vue'
import MenuPanel from '@/components/MenuPanel.vue'
import SearchingPage from '@/views/SearchingPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      components: {
        searchBar: SearchBar,
        menuPanel: MenuPanel
      }
    },
    {
      path: '/search',
      name: 'searchingPage',
      component: SearchingPage
    }
  ]
})

export default router
