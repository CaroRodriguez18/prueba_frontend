import { createRouter, createWebHashHistory } from 'vue-router';
import Pokemons from '../views/PokemonView.vue';
import Scenarios from '../views/ScenariosView.vue';
import Battles from '../views/BattlesView.vue';
import BattleDetail from '@/views/BattleDetailView.vue';


const routes = [
  { path: '/', redirect: '/battles' },
  { path: '/battles', component: Battles },
  {
    path: '/battles/:id(\\d+)',
    name: 'battle-detail-view',
    component: BattleDetail,
    props: true,
  },
  { path: '/pokemons', component: Pokemons },
  { path: '/scenarios', component: Scenarios },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
