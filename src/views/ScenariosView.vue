<template>
  <div class="pokemon-main">
    <div class="header-row">
      <h2>Gestión de Escenarios</h2>
      <button class="btn-new" @click="nuevo">
        <span class="plus">＋</span> Nuevo Escenario
      </button>
    </div>

    <!-- Buscador -->
    <div class="table-toolbar" style="margin: 12px 0 16px;">
      <input
        type="text"
        v-model.trim="query"
        placeholder="Buscar escenario por nombre"
        class="search-input"
      />
      <button v-if="query" class="btn-clear" @click="clearSearch">Limpiar</button>
    </div>

    <!-- Formulario crear/editar en modal -->
    <ModalComponent
      v-model="showForm"
      :title="editingScenario ? 'Editar escenario' : 'Nuevo escenario'"
      :primary-label="editingScenario ? 'Guardar cambios' : 'Crear escenario'"
      secondary-label="Cancelar"
      :auto-submit="true"        
      @secondary="onCancel"
      @close="onCancel"
    >
      <ScenarioForm
        :scenario="editingScenario"        
        @saved="onSaved"
        @cancel="onCancel"
      />
    </ModalComponent>

    <!-- Cards (mismo layout que Pokemons, sin barras) -->
    <div class="cards" :class="{ loading }">
      <article v-for="s in items" :key="s.id" class="pokemon-card">
        <div class="accent"></div>

        <header class="pokemon-card-header">
          <div class="avatar"><span class="pokeball">{{ s.id }}</span></div>
          <div class="title-wrap">
            <h3 class="pokemon-card-title">{{ s.name }}</h3>
          </div>
          <div class="card-actions">
            <button class="icon-btn" @click="editar(s)" title="Editar">✏️</button>
            <button class="icon-btn danger" @click="eliminar(s.id)" title="Eliminar">🗑️</button>
          </div>
        </header>

        <dl class="stats stats--compact">
          <div class="stat">
            <dt>ATK ×</dt>
            <dd><span :class="badgeClass(s.attack_modifier)">{{ fmt(s.attack_modifier) }}</span></dd>
          </div>
          <div class="stat">
            <dt>DEF ×</dt>
            <dd><span :class="badgeClass(s.defense_modifier)">{{ fmt(s.defense_modifier) }}</span></dd>
          </div>
          <div class="stat">
            <dt>SPD ×</dt>
            <dd><span :class="badgeClass(s.speed_modifier)">{{ fmt(s.speed_modifier) }}</span></dd>
          </div>
        </dl>
      </article>

      <p v-if="!loading && items.length === 0" class="empty" style="grid-column: 1/-1;">
        Sin resultados.
      </p>
    </div>

    <!-- Paginación -->
    <PaginationComponent :page="page" :page-size="pageSize" :total="total" :page-size-options="[5, 10, 50]"
      @update:page="onPageChange" @update:pageSize="onPageSizeChange" />
  </div>
</template>

<script>
import api from '../api.js'
import ScenarioForm from '../components/ScenarioForm.vue'
import ModalComponent from '../components/ModalComponent.vue'
import PaginationComponent from '../components/PaginationComponent.vue' // o PaginationControls.vue

export default {
  name: 'ScenariosView',
  components: { ScenarioForm, ModalComponent, PaginationComponent },
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

      // formulario
      showForm: false,
      editingScenario: null,
    }
  },
  computed: {
    maxPage() {
      return Math.max(1, Math.ceil((this.total || 0) / (this.pageSize || 1)))
    }
  },
  watch: {
    // Si cambias pageSize por fuera del PaginationComponent, mantiene el comportamiento
    pageSize() { this.page = 1; this.reload() },
    query() {
      this.page = 1
      this.isServerPaginated ? this.reload() : this.applyLocalFilter()
    },
  },
  mounted() { this.reload() },
  methods: {
    // ===== fetch principal con fallback =====
    async reload() {
      this.loading = true
      try {
        const params = { page: this.page, page_size: this.pageSize }
        if (this.query) params.search = this.query

        const { data } = await api.get('scenarios/', { params })

        if (Array.isArray(data)) {
          // sin paginación DRF → client-side
          this.isServerPaginated = false
          this.allItems = data
          this.applyLocalFilter()
        } else {
          // con paginación DRF
          this.isServerPaginated = true
          this.items = data.results || []
          this.total = data.count || this.items.length
        }
      } catch (e) {
        console.error(e)
        this.items = []
        this.total = 0
      } finally {
        this.loading = false
      }
    },

    // ===== filtro + paginación en cliente =====
    applyLocalFilter() {
      const q = (this.query || '').toLowerCase()
      const src = this.allItems || []
      const filtered = q
        ? src.filter(s =>
            (s.name || '').toLowerCase().includes(q) ||
            String(s.attack_modifier ?? '').includes(q) ||
            String(s.defense_modifier ?? '').includes(q) ||
            String(s.speed_modifier ?? '').includes(q)
          )
        : src

      this.total = filtered.length
      // clamp de page por si el filtro reduce resultados
      if (this.page > this.maxPage) this.page = this.maxPage

      const start = (this.page - 1) * this.pageSize
      const end = start + this.pageSize
      this.items = filtered.slice(start, end)
    },

    // ===== handlers de PaginationComponent =====
    onPageChange(newPage) {
      if (newPage === this.page) return
      this.page = newPage
      this.isServerPaginated ? this.reload() : this.applyLocalFilter()
    },
    onPageSizeChange(newSize) {
      if (newSize === this.pageSize) return
      this.pageSize = newSize
      this.page = 1
      this.isServerPaginated ? this.reload() : this.applyLocalFilter()
    },

    // ===== CRUD + modal =====
    nuevo(){ this.editingScenario = null; this.showForm = true },
    editar(s){ this.editingScenario = { ...s }; this.showForm = true },
    async eliminar(id){
      if (!confirm('¿Eliminar este escenario?')) return
      await api.delete(`scenarios/${id}/`)
      if (this.items.length === 1 && this.page > 1) this.page--
      this.reload()
    },
    onSaved(){ this.showForm = false; this.reload() },
    onCancel(){ this.showForm = false },

    // ===== estilos y formato =====
    badgeClass(v) {
      if (v > 1) return 'stat-badge positive'
      if (v < 1) return 'stat-badge negative'
      return 'stat-badge neutral'
    },
    fmt(v) {
      return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(v)
    },
    clearSearch(){ this.query = '' },
  },
}
</script>

