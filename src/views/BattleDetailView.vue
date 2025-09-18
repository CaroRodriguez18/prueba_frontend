<template>
  <div class="page">
    <!-- NUEVO: botón volver -->
    <div class="back-row">
      <button type="button" class="btn-new" @click="goBack" aria-label="Volver">
        <span class="arrow">←</span> Volver
      </button>
    </div>

    <div class="topbar">
      <p class="scenario" v-if="battle?.name">Batalla {{ battle.id }}: {{ battle.name }}</p>
      <p class="scenario" v-else>Batalla {{ battle?.id }}</p>

      <h2 class="title">
        {{ battle?.pokemon_a_name }} <span class="vs">vs</span> {{ battle?.pokemon_b_name }}
      </h2>

      <span class="badge" :class="badgeClass(battle?.status)">
        {{ prettyStatus(battle?.status_label) }}
      </span>
    </div>

    <p class="scenario" v-if="battle">Escenario: {{ battle.scenario_name }}</p>

    <!-- Winner banner -->
    <div v-if="battle?.winner_name" class="winner-banner">
      Ganador: <strong>{{ battle.winner_name }}</strong>
    </div>

    <div class="layout" v-if="battle">
      <!-- Log -->
      <section class="panel">
        <h3>Logs del combate</h3>
        <pre class="log" ref="logBox">{{ battle.log || 'No hay información aún.' }}</pre>
      </section>

      <!-- Side panel -->
      <aside class="side">
        <section class="panel">
            <h4>Detalles</h4>
            <p><strong>Fecha de creación:</strong> {{ fmtDateTime(battle.created_at) }}</p>
            <p><strong>Fecha de actualización:</strong> {{ fmtDateTime(battle.updated_at) }}</p>
            <p v-if="battle.next_run"><strong>Próxima ejecución:</strong> {{ fmtDateTime(battle.next_run) }}</p>
            <p v-if="typeof battle.run_count_total === 'number'"><strong>Ejecuciones totales:</strong> {{ battle.run_count_total }}</p>
        </section>
      </aside>
    </div>

  </div>
</template>

<script>
import api from '../api.js';

export default {
  name: 'BattleDetailView',
  data() {
    return {
      battle: null,
      loading: false,
      showSchedule: false,
      cron: '',
      cronValid: true,
      // SSE
      es: null,
      reconnectId: null,
      // Para mostrar log línea por línea
      fullLogLinesQueue: [],
      displayLog: '',
      tickerId: null,
      tickerSpeedMs: 500,
      modeLineByLine: false,
    };
  },
  mounted() {
    this.load();
    this.openStream();
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  },
  beforeUnmount() {
    this.closeStream();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    if (this.tickerId) clearInterval(this.tickerId);
  },
  methods: {
    // ====== DATA LOADING ======
    async load() {
      this.loading = true;
      try {
        const { id } = this.$route.params;
        const { data } = await api.get(`battles/${id}/`);
        this.battle = data;
        this.cron = data.scheduled_cron || '';

        this.modeLineByLine = false;

        if (this.nextRunTimerId) {
          clearTimeout(this.nextRunTimerId);
          this.nextRunTimerId = null;
        }

        if (data.next_run) {
          const nextRunMs = new Date(data.next_run).getTime();
          const nowMs = Date.now();
          const delay = Math.max(0, nextRunMs - nowMs);

          // Programa un timeout para activar modo línea por línea justo en next_run
          this.nextRunTimerId = setTimeout(() => {
            this.modeLineByLine = true;
            this.startLineByLineLog();
          }, delay);
        }

        if (!this.modeLineByLine) {
          // Mostrar log completo si aún no es hora
          this.displayLog = '';
          this.battle.log = data.log || '';
          this.fullLogLinesQueue = [];
          if (this.tickerId) {
            clearInterval(this.tickerId);
            this.tickerId = null;
          }
        }
      } finally {
        this.loading = false;
      }
    },
    startLineByLineLog() {
      this.fullLogLinesQueue = (this.battle.log || '').split('\n');
      this.displayLog = '';
      this.battle.log = '';
      if (this.tickerId) clearInterval(this.tickerId);
      this.startLogTicker();
    },
    // ====== Mostrar log línea a línea ======
    startLogTicker() {
      if (this.tickerId) clearInterval(this.tickerId);
      this.tickerId = setInterval(() => {
        if (this.fullLogLinesQueue.length === 0) {
          clearInterval(this.tickerId);
          this.tickerId = null;
          return;
        }
        const nextLine = this.fullLogLinesQueue.shift();
        this.displayLog += (this.displayLog ? '\n' : '') + nextLine;
        this.battle.log = this.displayLog;
        this.$nextTick(() => this.$refs.logBox?.scrollTo(0, this.$refs.logBox.scrollHeight));
      }, this.tickerSpeedMs);
    },

    // ====== SSE (Server-Sent Events) ======
    openStream() {
      this.closeStream();
      const { id } = this.$route.params;

      const base = api?.defaults?.baseURL || '/api/';
      const baseClean = base.endsWith('/') ? base : base + '/';
      const url = `${baseClean}battles/${id}/stream/`;

      try {
        this.es = new EventSource(url);

        this.es.onmessage = (e) => {
          const evt = JSON.parse(e.data || '{}');

          if (evt.log_append) {
            // Agregar nuevas líneas a la cola para mostrar línea a línea
            const newLines = (evt.log_append || '').split('\n');
            this.fullLogLinesQueue.push(...newLines);

            // Si ticker detenido, arrancar
            if (!this.tickerId) {
              this.startLogTicker();
            }
          }

          if (typeof evt.hp_a === 'number') this.battle.hp_a = evt.hp_a;
          if (typeof evt.hp_b === 'number') this.battle.hp_b = evt.hp_b;
          if (evt.status) this.battle.status = evt.status;

          if (evt.type === 'done' || evt.type === 'error') this.load();
        };

        this.es.onerror = () => {
          this.closeStream();
          if (!document.hidden) {
            clearTimeout(this.reconnectId);
            this.reconnectId = setTimeout(() => this.openStream(), 1000);
          }
        };
      } catch (err) {
        console.error('SSE error:', err);
      }
    },
    closeStream() {
      try { this.es?.close(); } catch { /* ignore error */ }
      this.es = null;
      clearTimeout(this.reconnectId);
      this.reconnectId = null;
    },
    onVisibilityChange() {
      if (!document.hidden && !this.es) this.openStream();
    },

    // ====== ACCIONES ======
    async execute() {
      await api.post(`battles/${this.battle.id}/execute/`);
      await this.load();
    },
    openSchedule() {
      this.cron = this.battle?.scheduled_cron || '';
      this.validateCron();
      this.showSchedule = true;
    },
    validateCron() {
      if (!this.cron) { this.cronValid = true; return; }
      const parts = this.cron.trim().split(/\s+/);
      this.cronValid = parts.length === 5 && parts.every(f => /^[\d*,-/]+$/.test(f.replace(/\\-/g, '-')));
    },
    async saveSchedule() {
      if (!this.cronValid) return;
      const body = this.cron ? { cron: this.cron } : {};
      await api.post(`battles/${this.battle.id}/schedule/`, body);
      this.showSchedule = false;
      await this.load();
    },

    // ====== HELPERS ======
    fmtDateTime(v) { return v ? new Date(v).toLocaleString() : ''; },
    prettyStatus(s) { return (s || '').toLowerCase().replace(/^\w/, m => m.toUpperCase()); },
    badgeClass(s) {
      switch ((s || '').toUpperCase()) {
        case 'FINISHED': return 'is-finished';
        case 'RUNNING': return 'is-running';
        case 'FAILED': return 'is-failed';
        case 'SCHEDULED': return 'is-pending';
        default: return 'is-pending';
      }
    },
    goBack() {
      if (window.history.length > 1) this.$router.back();
      else this.$router.push({ name: 'battles' });
    },
  },
};
</script>

<style scoped>
/* Mantener tus estilos existentes */
.page {
  max-width: 1100px;
  margin: 24px auto 56px;
  padding: 0 16px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.title {
  margin: 0;
  font-weight: 900;
  font-size: 2rem;
  color: #ffd54a;
}

.vs {
  opacity: .8;
  margin: 0 .35rem;
}

.scenario {
  opacity: .8;
  margin: .25rem 0 12px;
}

.winner-banner {
  margin: 8px 0 18px;
  padding: 14px;
  border-radius: 12px;
  background: #134e4a;
  color: #e2fbe8;
  border: 1px solid rgba(16, 185, 129, .3);
  font-size: 1.2rem;
  text-align: center;
}

.layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 16px;
}

.panel {
  background: rgba(255, 255, 255, .04);
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 12px;
  padding: 14px;
}

.panel h3,
.panel h4 {
  margin: 0 0 10px;
}

.log {
  height: 56vh;
  overflow: auto;
  border-radius: 8px;
  padding: 12px 14px;
  background: #0b1220;
  color: #e5e7eb;
  border: 1px solid rgba(255, 255, 255, .1);
  white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}

.side {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.btn.action {
  width: 100%;
  margin: .3rem 0;
  border-radius: 10px;
  padding: .6rem .95rem;
  background: #374151;
  color: #e5e7eb;
  border: 1px solid rgba(255, 255, 255, .14);
  cursor: pointer;
}

.btn.action:hover {
  background: #4b5563;
}

.badge {
  font-size: .9rem;
  padding: .28rem .7rem;
  border-radius: 999px;
  font-weight: 700;
  color: #fff;
}

.is-finished { background: #16a34a; }
.is-running  { background: #f59e0b; }
.is-pending  { background: #9ca3af; }
.is-failed   { background: #dc2626; }

.sched-form { display: flex; flex-direction: column; gap: 8px; }
.sched-form input {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px 12px;
}
.help { font-size: .85rem; opacity: .8; }

@media (max-width: 920px) {
  .layout { grid-template-columns: 1fr; }
}

.back-row { margin-bottom: 10px; }

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  color: #e5e7eb;
  border: 1px solid rgba(255, 255, 255, .15);
  border-radius: 10px;
  padding: .45rem .75rem;
  cursor: pointer;
  transition: background .15s, border-color .15s;
}

.btn-back:hover {
  background: rgba(255, 255, 255, .06);
  border-color: rgba(255, 255, 255, .25);
}

.btn-back .arrow { font-size: 18px; line-height: 1; }
</style>
