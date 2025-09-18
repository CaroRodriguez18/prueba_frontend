<template>
  <div class="pokemon-main">
    <!-- Header -->
    <div class="header-row">
      <h2>Gestión de Combates</h2>
      <button class="btn-new" @click="nuevo">
        <span class="plus">＋</span> Crear combate
      </button>
    </div>

    <!-- Toolbar -->
    <div class="table-toolbar" style="margin: 12px 0 16px; display:flex; gap:8px; align-items:center;">
      <label for="statusFilter" class="select-label">Buscar por estado</label>
      <select v-model="statusFilter" class="select-input" rounded>
        <option value="">Todos los estados</option>
        <option v-for="o in STATUS_OPTIONS" :key="o.value" :value="o.value">
          {{ o.label }}
        </option>
      </select>
      <button v-if="statusFilter" class="btn-clear" @click="clearStatus">Limpiar</button>
    </div>

    <!-- Modal crear/editar -->
    <ModalComponent
      v-model="showForm"
      :title="editingBattle ? 'Editar combate' : 'Nuevo combate'"
      :primary-label="editingBattle ? 'Guardar cambios' : 'Crear combate'"
      secondary-label="Cancelar"
      :primary-disabled="!formValid"
      :auto-submit="true"
      :maxWidth="'640px'"
      @secondary="onCancel"
      @close="onCancel"
    >
      <BattleForm
        :battle="editingBattle"
        :pokemons="pokemons"
        :scenarios="scenarios"
        :show-actions="false"
        @valid="formValid = $event"
        @saved="onSaved"
        @cancel="onCancel"
      />
    </ModalComponent>

    <!-- Cards -->
    <div :class="['cards-stack', { loading }]">
      <article v-for="b in items" :key="b.id" class="pokemon-card">
        <div class="accent"></div>

        <header class="pokemon-card-header">
          <div class="avatar"><span class="pokeball">{{ b.id }}</span></div>

          <div class="title-wrap">
            <h3 class="pokemon-card-title">
              {{ b.pokemon_a_name }} <span class="vs">vs</span> {{ b.pokemon_b_name }}
            </h3>
            <span class="meta">Escenario: {{ b.scenario_name }}</span>
          </div>

          <div class="card-actions">
            <button class="icon-btn" @click="editBattle(b)" title="Editar">✏️</button>
            <button class="icon-btn" @click="goDetail(b.id)" title="Detalle">🔎</button>
            <button
              class="icon-btn"
              :disabled="b.status==='RUNNING'"
              @click="executeBattle(b)"
              title="Ejecutar"
            >
              ▶️
            </button>
            <button class="icon-btn danger" @click="deleteBattle(b.id)" title="Eliminar">🗑️</button>
          </div>
        </header>

        <dl class="stats stats--meta">
          <div class="stat">
            <dt>Estado</dt>
            <dd>
              <span class="badge" :class="badgeClass(b?.status)">
                {{ b?.status_label || statusLabel(b?.status) }}
              </span>
            </dd>
          </div>
          <div class="stat" v-if="b.winner_name">
            <dt>Ganador</dt>
            <dd><span class="stat-badge positive">{{ b.winner_name }}</span></dd>
          </div>
          <div class="stat">
            <dt>Creado</dt>
            <dd><span class="meta">{{ fmtDateTime(b.created_at) }}</span></dd>
          </div>
          <div class="stat" v-if="b.status === 'SCHEDULED' && b?.next_run">
            <dt>Próxima</dt>
            <dd><span class="meta">{{ fmtDateTime(b.next_run) }}</span></dd>
          </div>
        </dl>
      </article>

      <p v-if="!loading && items.length === 0" class="empty" style="grid-column: 1/-1;">
        Sin resultados.
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

    <!-- Modal Log simple -->
    <ModalComponent
      v-model="showLogModal"
      :title="`Log del Combate #${selectedBattleId ?? ''}`"
      :showFooter="false"
      :maxWidth="'720px'"
    >
      <pre class="battle-log">{{ selectedBattleLog || 'El combate aún no ha sido ejecutado.' }}</pre>
    </ModalComponent>

    <!-- Modal tiempo real (NO se cierra al terminar) -->
    <ModalComponent
      v-model="live.open"
      title="Ejecución del combate"
      :showFooter="true"
      primary-label="Cerrar"
      secondary-label="Ver detalle"
      :maxWidth="'1800px'"
      @primary="closeLiveAndModal"
      @secondary="goDetail(live.id)"
      @close="closeStreamsOnly"
    >
      <div class="live-grid">
        <!-- Panel HP -->
        <article class="pokemon-card">
          <div class="accent"></div>
          <header class="pokemon-card-header">
            <div class="avatar"><span class="pokeball">{{ live.id ?? '—' }}</span></div>
            <div class="title-wrap">
              <h3 class="pokemon-card-title">
                {{ live.a?.name || '—' }} <span class="vs">vs</span> {{ live.b?.name || '—' }}
              </h3>
            </div>
            <div class="card-actions">
              <span class="stat-badge" :class="statusClass(live.status)">{{ statusLabel(live.status) }}</span>
            </div>
          </header>


          <div class="hp-stats">
            <!-- A -->
            <div class="hp-stat">
              <div class="hp-name">{{ live.a?.name || 'A' }}</div>
              <div class="hp-row">
                <div class="hp-bar">
                  <div class="hp-fill" :style="{ width: pct(live.hpA, live.maxA) }"></div>
                </div>
                <span class="hp-val">{{ live.hpA ?? '—' }}/{{ live.maxA ?? '—' }}</span>
              </div>
            </div>

            <!-- B -->
            <div class="hp-stat">
              <div class="hp-name">{{ live.b?.name || 'B' }}</div>
              <div class="hp-row">
                <div class="hp-bar">
                  <div class="hp-fill" :style="{ width: pct(live.hpB, live.maxB) }"></div>
                </div>
                <span class="hp-val">{{ live.hpB ?? '—' }}/{{ live.maxB ?? '—' }}</span>
              </div>
            </div>
          </div>


        </article>

        <!-- Panel Log -->
        <article class="pokemon-card">
          <div class="accent"></div>
          <h3 class="pokemon-card-title" style="margin-bottom:8px;">Log</h3>
          <pre class="live-log" ref="liveLog">{{ live.log || 'Esperando eventos…' }}</pre>
        </article>
      </div>
    </ModalComponent>
  </div>
</template>

<script>
import api from '../api.js';
import ModalComponent from '../components/ModalComponent.vue';
import PaginationComponent from '../components/PaginationComponent.vue';
import BattleForm from '../components/BattleForm.vue';

export default {
  name: 'BattleView',
  components: { ModalComponent, PaginationComponent, BattleForm },
  data() {
    return {
      // lista
      items: [],
      allItems: [],
      loading: false,
      isServerPaginated: false,

      // filtro + paginación
      statusFilter: '',            // "" = todos
      STATUS_OPTIONS: [
        { value: 'PENDING',   label: 'Pendiente' },
        { value: 'SCHEDULED', label: 'Programado' },
        // { value: 'RUNNING',   label: 'En ejecución' },
        { value: 'FINISHED',  label: 'Finalizado' },
        // { value: 'FAILED',    label: 'Fallido' },
      ],
      page: 1,
      pageSize: 10,
      total: 0,

      // form modal
      showForm: false,
      editingBattle: null,
      formValid: false,

      // selects del form
      pokemons: [],
      scenarios: [],

      // log modal
      showLogModal: false,
      selectedBattleLog: '',
      selectedBattleId: null,

      // tiempo real
      live: {
        open: false,
        id: null,
        status: null,
        a: null, b: null,          // { id, name, hp }
        maxA: null, maxB: null,
        hpA: null,  hpB: null,
        log: '',
        _sse: null,                // EventSource
        _poll: null,               // setInterval
        _etag: null,               // If-None-Match (opcional)
      },
    };
  },
  computed: {
    maxPage() {
      return Math.max(1, Math.ceil((this.total || 0) / (this.pageSize || 1)));
    },
  },
  watch: {
    pageSize() { this.page = 1; this.reload(); },
    statusFilter() {
      this.page = 1;
      this.isServerPaginated ? this.reload() : this.applyLocalFilter();
    },
  },
  mounted() {
    this.reload();
    this.loadPokemons();
    this.loadScenarios();
  },
  beforeUnmount() {
    this.closeStreamsOnly();
  },
  methods: {
    /* ================= Helpers DRF ================= */
    async fetchAllPages(endpoint, params = {}, pageSize = 200) {
      let page = 1;
      let out = [];
      let total = Infinity;
      while (out.length < total) {
        const { data } = await api.get(endpoint, { params: { ...params, page, page_size: pageSize } });
        if (Array.isArray(data)) return data;
        const results = data.results || [];
        total = typeof data.count === 'number' ? data.count : results.length;
        out.push(...results);
        if (!data.next || results.length === 0) break;
        page++;
      }
      return out;
    },

    /* ================= Cargas ================= */
    async reload() {
      this.loading = true;
      try {
        const params = { page: this.page, page_size: this.pageSize };
        if (this.statusFilter) params.status = this.statusFilter;

        const { data } = await api.get('battles/', { params });

        if (Array.isArray(data)) {
          // Backend sin paginación → filtrado local
          this.isServerPaginated = false;
          this.allItems = data;
          this.applyLocalFilter();
        } else {
          // Backend paginado (DRF)
          this.isServerPaginated = true;
          this.items = data.results || [];
          this.total = data.count || this.items.length;
        }
      } catch (e) {
        console.error(e);
        this.items = [];
        this.total = 0;
      } finally {
        this.loading = false;
      }
    },

    async loadPokemons() {
      this.pokemons = await this.fetchAllPages('pokemons/', { ordering: 'name' }, 300);
    },
    async loadScenarios() {
      this.scenarios = await this.fetchAllPages('scenarios/', { ordering: 'name' }, 300);
    },

    /* ================= Filtro client-side ================= */
    applyLocalFilter() {
      const src = this.allItems || [];
      const filtered = this.statusFilter
        ? src.filter(b => (b.status || '').toUpperCase() === this.statusFilter.toUpperCase())
        : src;

      this.total = filtered.length;
      if (this.page > this.maxPage) this.page = this.maxPage;

      const start = (this.page - 1) * this.pageSize;
      const end = start + this.pageSize;
      this.items = filtered.slice(start, end);
    },

    /* ================= Paginación ================= */
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

    /* ================= CRUD / acciones ================= */
    nuevo() { this.editingBattle = null; this.formValid = false; this.showForm = true; },
    onCancel() { this.showForm = false; },
    onSaved() { this.showForm = false; this.reload(); },

    editBattle(b) {
      this.editingBattle = b;
      this.formValid = false;
      this.showForm = true;
    },
    async deleteBattle(id) {
      if (!confirm('¿Eliminar este combate?')) return;
      await api.delete(`battles/${id}/`);
      if (this.items.length === 1 && this.page > 1) this.page--;
      this.reload();
    },

    /* ================= Log / Detalle ================= */
    showLog(battle) {
      this.selectedBattleLog = battle.log || '';
      this.selectedBattleId = battle.id;
      this.showLogModal = true;
    },
    goDetail(id) {
      this.$router.push(`/battles/${id}`);
    },

    /* ================= Tiempo real ================= */
    async executeBattle(battle) {
      // 0) por si quedaba algo abierto de una ejecución anterior
      this.closeStreamsOnly();

      // 1) Preparar modal “en vivo”
      this.startLive(battle);

      // 2) Disparar ejecución
      try {
        await api.post(`battles/${battle.id}/execute/`);
      } catch (e) {
        alert('No se pudo iniciar la ejecución');
        this.closeStreamsOnly();
        return;
      }

      // 3) Comenzar streaming
      this.beginStreaming();
    },

    startLive(battle) {
      this.live.id = battle.id;
      this.live.status = battle.status || 'RUNNING';

      const findP = (byId, byName) =>
        (this.pokemons.find(p => p.id === byId) ||
         this.pokemons.find(p => (p.name || '').toLowerCase() === (byName || '').toLowerCase()) ||
         { id: byId, name: byName, hp: 100 });

      const a = findP(battle.pokemon_a, battle.pokemon_a_name);
      const b = findP(battle.pokemon_b, battle.pokemon_b_name);

      this.live.a = { id: a.id, name: a.name, hp: a.hp };
      this.live.b = { id: b.id, name: b.name, hp: b.hp };
      this.live.maxA = a.hp ?? 100;
      this.live.maxB = b.hp ?? 100;
      this.live.hpA  = this.live.maxA;
      this.live.hpB  = this.live.maxB;
      this.live.log  = (battle.log || '').trim();

      this.live.open = true;
    },

    beginStreaming() {
      // Evita abrir más de un EventSource
      if (this.live._sse) return;

      try {
        const url = `/api/battles/${this.live.id}/events/`;
        const es = new EventSource(url, { withCredentials: false });

        es.onopen = () => {
          // si había polling de fallback, lo detenemos
          this.stopPolling();
        };

        es.onmessage = (ev) => this.onEvent(JSON.parse(ev.data));

        es.onerror = () => {
          // Cerramos el SSE y pasamos a polling
          try { es.close(); } catch { /* intentionally ignored */ }
          this.live._sse = null;
          this.startPolling();
        };

        this.live._sse = es;
      } catch {
        this.startPolling();
      }
    },

    onEvent(ev) {
      if (ev.log_append) {
        this.live.log += (this.live.log ? '\n' : '') + ev.log_append;
        this.$nextTick(this.scrollLogBottom);
      }
      if (typeof ev.hp_a === 'number') this.live.hpA = ev.hp_a;
      if (typeof ev.hp_b === 'number') this.live.hpB = ev.hp_b;
      if (ev.status) this.live.status = ev.status;

      // Al terminar: cortar streams y refrescar lista, PERO mantener el modal abierto
      if (ev.type === 'done' || /FINISHED|FAILED/i.test(this.live.status || '')) {
        this.closeStreamsOnly();
        this.reload();
      }
    },

    startPolling() {
      // Evita duplicados
      this.stopPolling();

      this.live._poll = setInterval(async () => {
        try {
          const config = {};
          if (this.live._etag) config.headers = { 'If-None-Match': this.live._etag };
          const res = await api.get(`battles/${this.live.id}/`, config);
          if (res?.headers?.etag) this.live._etag = res.headers.etag;
          this.updateFromPayload(res.data);
        } catch {
          // Ignorar 304 o errores momentáneos
        }
      }, 800);
    },

    stopPolling() {
      if (this.live._poll) {
        clearInterval(this.live._poll);
        this.live._poll = null;
      }
    },

    closeStreamsOnly() {
      // Cortar SSE/polling sin cerrar el modal
      try { this.live._sse?.close(); } catch { /* intentionally ignored */ }
      this.live._sse = null;
      this.stopPolling();
    },

    closeLiveAndModal() {
      // Botón “Cerrar”
      this.closeStreamsOnly();
      this.live.open = false;
    },

    updateFromPayload(data) {
      if (!data) return;

      if (typeof data.log === 'string' && data.log.length !== (this.live.log?.length || 0)) {
        this.live.log = data.log;
        this.$nextTick(this.scrollLogBottom);
      }
      if (data.status) this.live.status = data.status;

      const hpA = data.hp_a ?? data.state?.hp_a;
      const hpB = data.hp_b ?? data.state?.hp_b;
      if (typeof hpA === 'number') this.live.hpA = hpA;
      if (typeof hpB === 'number') this.live.hpB = hpB;

      // Si terminó, liberamos streams y refrescamos cards (modal queda abierto)
      if (/FINISHED|FAILED/i.test(this.live.status || '')) {
        this.closeStreamsOnly();
        this.reload();
      }
    },

    scrollLogBottom() {
      const el = this.$refs.liveLog;
      if (el && el.scrollTo) el.scrollTo({ top: el.scrollHeight });
    },

    /* ================= UI helpers ================= */
    badgeClass(s) {
      switch ((s || '').toUpperCase()) {
        case 'FINISHED':  return 'is-finished';
        case 'RUNNING':   return 'is-running';
        case 'FAILED':    return 'is-failed';
        case 'SCHEDULED': return 'is-scheduled';
        default:          return 'is-pending'; // incluye PENDING u otros
      }
    },
    fmtDateTime(v) { return v ? new Date(v).toLocaleString() : ''; },
    clearStatus(){ this.statusFilter = ''; },

    pct(v, max) {
      if (!max || v == null) return '0%';
      const w = Math.max(0, Math.min(100, (v / max) * 100));
      return w.toFixed(0) + '%';
    },
    statusLabel(s) {
      const map = {
        PENDING:   'Pendiente',
        SCHEDULED: 'Programado',
        RUNNING:   'En ejecución',
        FINISHED:  'Finalizado',
        FAILED:    'Fallido'
      };
      return map[(s || '').toUpperCase()] || '—';
    },
    statusClass(s) {
      switch ((s || '').toUpperCase()) {
        case 'FINISHED':  return 'positive';
        case 'FAILED':    return 'negative';
        case 'SCHEDULED': return 'info';
        case 'RUNNING':   return 'neutral';
        default:          return 'neutral';
      }
    },
  },
};
</script>

<style scoped>
.vs{ opacity:.8; margin:0 .3rem; }

/* Badges de estado (cards) */
.badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  display: inline-block;
  border: 1px solid transparent;
}
.is-pending   { background:#e5e7eb; color:#111827; border-color:#d1d5db; } /* gris */
.is-scheduled { background:#dbeafe; color:#1e3a8a; border-color:#bfdbfe; } /* azul */
.is-running   { background:#fef3c7; color:#92400e; border-color:#fde68a; } /* ámbar */
.is-finished  { background:#dcfce7; color:#166534; border-color:#bbf7d0; } /* verde */
.is-failed    { background:#fee2e2; color:#991b1b; border-color:#fecaca; } /* rojo */

/* Badge compacta ya existente para “Ganador” y live status */
.stat-badge.info{
  border-color: rgba(65,132,228,.35);
  background:   rgba(65,132,228,.12);
  color: #2b6cb0;
}

/* Log */
.battle-log{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  white-space: pre-wrap;
  background-color: #0b1220;
  padding: 12px 14px;
  border-radius: 10px;
  max-height: 60vh;
  overflow-y: auto;
  border: 1px solid rgba(255,255,255,0.08);
}
.live-grid{
  display:grid;
  grid-template-columns: minmax(0,1fr);
  gap:18px;
}
@media (min-width: 900px){
  .live-grid{ grid-template-columns: 420px minmax(0,1fr); }
}
.live-log{
  height: 56vh; overflow:auto; border-radius:10px; padding:12px 14px;
  background:#0b1220; color:#e5e7eb; border:1px solid rgba(255,255,255,.08);
  white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}

/* Meta grid */
.stats--meta .stat{
  display: grid;
  grid-template-columns: minmax(80px, auto) 1fr;
  align-items: center;
  column-gap: 10px;
  margin: 8px 0;
}
.stats--meta .stat dt{
  font-weight: 700;
  color: #15586c;
}
.stats--meta .stat dd{
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}
@media (max-width: 480px){
  .stats--meta .stat{ grid-template-columns: minmax(72px, auto) 1fr; }
}
/* Contenedor en columna con espacio entre tarjetas */
.cards-stack{
  display: flex;
  flex-direction: column;
  gap: 22px;              /* << separa verticalmente las cards */
  padding-block: 4px;     /* respirito arriba/abajo */
}

/* Asegura que las cards no tengan márgenes que “coman” el gap */
.pokemon-card{ margin: 0; }

/* Un poco más de separación en pantallas grandes */
@media (min-width: 1200px){
  .cards-stack{ gap: 26px; }
}

/* Si muestras el texto “Sin resultados”, centra y dale aire */
.empty{
  margin: 14px 0 6px;
  text-align: center;
  opacity: .7;
}
.hp-stats{
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 6px;
}

.hp-stat{
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hp-name{
  font-weight: 700;
  color: #15586c;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hp-row{
  display: flex;
  align-items: center;
  gap: 10px;
}

.hp-bar{
  position: relative;
  flex: 1 1 auto;
  height: 12px;
  border-radius: 999px;
  background: #e5e7eb;
  overflow: hidden;
}

.hp-fill{
  position: absolute;
  inset: 0;              /* ocupa todo el alto */
  width: 0%;             /* se actualiza por :style */
  border-radius: 999px;
  background: linear-gradient(90deg,#fb7185,#ec4899,#8b5cf6);
  transition: width .25s ease;
}

.hp-val{
  min-width: 60px;
  text-align: right;
  font-weight: 700;
  color: #374151;
}
</style>
