<template>
  <div class="pokemon-main">
    <div class="header-row">
      <h2>Gestión de Pokemones</h2>
      <button class="btn-new" @click="abrirFormularioPokemon">
        <span class="plus">＋</span> Nuevo Pokémon
      </button>
    </div>

    <!-- Buscador -->
    <div class="table-toolbar" style="margin: 12px 0 16px;">
      <input
        type="text"
        v-model.trim="query"
        placeholder="Buscar Pokémon por nombre"
        class="search-input"
      />
      <button v-if="query" class="btn-clear" @click="clearSearch">Limpiar</button>
    </div>

    <!-- Formulario crear/editar en modal -->
    <ModalComponent
      v-model="showForm"
      :title="editingPokemon ? 'Editar Pokémon' : 'Agregar Pokémon'"
      :maxWidth="'720px'"
      :primary-disabled="null"
      :auto-submit="true"
      @close="cerrarFormularioPokemon"
    >
      <PokemonForm
        ref="formRef"
        :pokemon="editingPokemon"
        @saved="handleSave"
        @cancel="cerrarFormularioPokemon"
      />
    </ModalComponent>

    <!-- Cards -->
    <div class="cards" :class="{ loading }">
      <article v-for="p in items" :key="p.id" class="pokemon-card">
        <div class="accent"></div>

        <header class="pokemon-card-header">
          <div class="avatar"><span class="pokeball">{{ p.id }}</span></div>
          <div class="title-wrap">
            <h3 class="pokemon-card-title">{{ p.name }}</h3>
          </div>
          <div class="card-actions">
            <button class="icon-btn danger" @click="editarPokemon(p)" title="Editar">✏️</button>
            <button class="icon-btn danger" @click="eliminarPokemon(p.id)" title="Eliminar">🗑️</button>
          </div>
        </header>

        <dl class="stats">
          <div class="stat">
            <dt>HP</dt>
            <dd>
              <div class="bar"><div class="fill hp" :style="{ width: pct(p.hp, displayMax.hp) }"></div></div>
              <span class="val">{{ p.hp }}</span>
            </dd>
          </div>
          <div class="stat">
            <dt>ATK</dt>
            <dd>
              <div class="bar"><div class="fill atk" :style="{ width: pct(p.attack, displayMax.attack) }"></div></div>
              <span class="val">{{ p.attack }}</span>
            </dd>
          </div>
          <div class="stat">
            <dt>DEF</dt>
            <dd>
              <div class="bar"><div class="fill def" :style="{ width: pct(p.defense, displayMax.defense) }"></div></div>
              <span class="val">{{ p.defense }}</span>
            </dd>
          </div>
          <div class="stat">
            <dt>SPD</dt>
            <dd>
              <div class="bar"><div class="fill spd" :style="{ width: pct(p.speed, displayMax.speed) }"></div></div>
              <span class="val">{{ p.speed }}</span>
            </dd>
          </div>
        </dl>
      </article>

      <p v-if="!loading && items.length === 0" class="empty" style="grid-column: 1/-1;">
        No hay Pokémon para mostrar
      </p>
    </div>

    <!-- Paginación -->
    <PaginationComponent
      :page="page"
      :page-size="pageSize"
      :total="total"
      :page-size-options="[5, 10, 50]"
      @update:page="onPageChange"
      @update:pageSize="onPageSizeChange"
    />
  </div>
</template>

<script>
import api from '../api.js';
import PokemonForm from '../components/PokemonForm.vue';
import ModalComponent from '../components/ModalComponent.vue';
import PaginationComponent from '../components/PaginationComponent.vue';

export default {
  name: 'PokemonsView',
  components: { PokemonForm, ModalComponent, PaginationComponent },
  data() {
    return {
      // datos / estado
      items: [],
      allItems: [],
      loading: false,
      isServerPaginated: false,

      // búsqueda + paginación
      query: '',
      page: 1,
      pageSize: 10,
      total: 0,
      maxPage: 1,

      // formulario
      showForm: false,
      editingPokemon: null,

      // cache de máximos globales cuando hay paginación en servidor
      globalMaxStats: null, // { hp, attack, defense, speed } o null
    };
  },
  computed: {
    // Máximos a usar para las barras (sin hardcode)
    displayMax() {
      if (!this.isServerPaginated) {
        // client-side: calcula sobre todo el dataset
        const base = (this.allItems && this.allItems.length) ? this.allItems : this.items;
        return this.calcMaxFrom(base);
      }
      // server-side: usa el cache global (o cae al cálculo de lo que hay)
      return this.globalMaxStats || this.calcMaxFrom(this.items);
    },
  },
  watch: {
    pageSize() { this.page = 1; this.reload(); },
    query() {
      this.page = 1;
      this.isServerPaginated ? this.reload() : this.applyLocalFilter();
    },
  },
  mounted() { this.reload(); },
  methods: {
    // ===== util =====
    pct(v, max) {
      if (!max) return '0%';
      const w = Math.max(0, Math.min(100, (v / max) * 100));
      return w.toFixed(0) + '%';
    },
    calcMaxFrom(list = []) {
      if (!list.length) return { hp: 0, attack: 0, defense: 0, speed: 0 };
      const hp      = Math.max(...list.map(p => p.hp      ?? 0));
      const attack  = Math.max(...list.map(p => p.attack  ?? 0));
      const defense = Math.max(...list.map(p => p.defense ?? 0));
      const speed   = Math.max(...list.map(p => p.speed   ?? 0));
      return { hp, attack, defense, speed };
    },

    // ===== fetch principal con fallback =====
    async reload() {
      this.loading = true;
      try {
        const params = { page: this.page, page_size: this.pageSize };
        if (this.query) params.search = this.query;

        const { data } = await api.get('pokemons/', { params });

        if (Array.isArray(data)) {
          // Sin paginación DRF → client-side
          this.isServerPaginated = false;
          this.allItems = data;
          this.applyLocalFilter();              // pinta page + setea total
          this.globalMaxStats = this.calcMaxFrom(this.allItems);
        } else {
          // Con paginación DRF → server-side
          this.isServerPaginated = true;
          this.items   = data.results || [];
          this.total   = data.count   || this.items.length;
          this.maxPage = Math.max(1, Math.ceil(this.total / this.pageSize));

          // Si NO hay búsqueda y vienen max_stats → son globales
          if (!this.query && data.max_stats) {
            this.globalMaxStats = {
              hp: data.max_stats.hp ?? 0,
              attack: data.max_stats.attack ?? 0,
              defense: data.max_stats.defense ?? 0,
              speed: data.max_stats.speed ?? 0,
            };
          }

          // Si hay búsqueda y aún no tenemos globales, trae una vez sin 'search'
          if (this.query && !this.globalMaxStats) {
            try {
              const { data: globalData } = await api.get('pokemons/', {
                params: { page: 1, page_size: 1 },
              });
              if (globalData?.max_stats) {
                this.globalMaxStats = {
                  hp: globalData.max_stats.hp ?? 0,
                  attack: globalData.max_stats.attack ?? 0,
                  defense: globalData.max_stats.defense ?? 0,
                  speed: globalData.max_stats.speed ?? 0,
                };
              }
            } catch (_) {
              /* si falla, usamos calcMaxFrom(items) como fallback */
            }
          }
        }
      } catch (e) {
        console.error(e);
        this.items = [];
        this.total = 0;
        this.maxPage = 1;
      } finally {
        this.loading = false;
      }
    },

    // ===== filtro + paginación en cliente =====
    applyLocalFilter() {
      const q = (this.query || '').toLowerCase();
      const src = this.allItems || [];
      const filtered = q
        ? src.filter(p => (p.name || '').toLowerCase().includes(q))
        : src;

      this.total = filtered.length;
      this.maxPage = Math.max(1, Math.ceil(this.total / this.pageSize));
      if (this.page > this.maxPage) this.page = this.maxPage;

      const start = (this.page - 1) * this.pageSize;
      const end   = start + this.pageSize;
      this.items  = filtered.slice(start, end);

      // Máximos globales siempre desde el dataset completo (no el filtrado)
      this.globalMaxStats = this.calcMaxFrom(src);
    },

    // ===== handlers del componente de paginación =====
    onPageChange(newPage) {
      if (newPage === this.page) return;
      this.page = newPage;
      this.isServerPaginated ? this.reload() : this.applyLocalFilter();
    },
    onPageSizeChange(newSize) {
      if (newSize === this.pageSize) return;
      this.pageSize = newSize;
      this.page = 1;
      this.isServerPaginated ? this.reload() : this.applyLocalFilter();
    },

    // ===== CRUD + modal =====
    abrirFormularioPokemon() { this.editingPokemon = null; this.showForm = true; },
    cerrarFormularioPokemon() { this.showForm = false; },
    editarPokemon(p) { this.editingPokemon = { ...p }; this.showForm = true; },
    async eliminarPokemon(id) {
      if (!confirm('¿Eliminar este Pokémon?')) return;
      await api.delete(`pokemons/${id}/`);
      if (this.items.length === 1 && this.page > 1) this.page--;
      this.reload();
    },
    handleSave() { this.showForm = false; this.reload(); },
    clearSearch() { this.query = ''; },
  },
};
</script>
