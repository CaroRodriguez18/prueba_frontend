<template>
    <div class="page">
        <!-- NUEVO: botón volver -->
        <div class="back-row">
            <button type="button" class="btn-new" @click="goBack" aria-label="Volver">
                <span class="arrow">←</span> Volver
            </button>
        </div>

        <div class="topbar">
            <h2 class="title">
                {{ battle?.pokemon_a_name }} <span class="vs">vs</span> {{ battle?.pokemon_b_name }}
            </h2>
            <span class="badge" :class="badgeClass(battle?.status)">{{ prettyStatus(battle?.status_label) }}</span>
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
                <!-- <section class="panel">
                    <h4>Acciones</h4>
                    <button class="btn action" @click="execute" :disabled="battle.status === 'RUNNING'">Ejecutar
                        ahora</button>
                    <button class="btn action" @click="openSchedule">Programar</button>
                </section> -->

                <section class="panel">
                    <h4>Detalles</h4>
                    <p><strong>Fecha de creación:</strong> {{ fmtDateTime(battle.created_at) }}</p>
                    <p><strong>Fecha de actualización:</strong> {{ fmtDateTime(battle.updated_at) }}</p>
                    <p v-if="battle.next_run"><strong>Próxima ejecución:</strong> {{ fmtDateTime(battle.next_run) }}</p>
                </section>
            </aside>
        </div>

        <!-- Modal schedule -->
        <ModalComponent v-model="showSchedule" title="Schedule battle" primary-label="Save" secondary-label="Cancel"
            :primary-disabled="!cronValid" :auto-submit="false" :maxWidth="'520px'" @secondary="showSchedule = false"
            @primary="saveSchedule">
            <form class="sched-form" @submit.prevent="saveSchedule">
                <label for="cron">CRON (5 campos)</label>
                <input id="cron" v-model.trim="cron" placeholder="*/5 * * * *" @input="validateCron" />
                <small class="help">Vacío para dejarla pendiente.</small>
                <!-- Acciones -->
                <div class="form-buttons">
                    <button type="button" class="btn btn--ghost" @click="showSchedule = false">Cancelar</button>
                    <button type="submit" class="btn btn--primary" @click="saveSchedule()">Guardar</button>
                </div>
            </form>
        </ModalComponent>
    </div>
</template>

<script>
import api from '../api.js';
import ModalComponent from '../components/ModalComponent.vue';

export default {
    name: 'BattleDetailView',
    components: { ModalComponent },
    data() {
        return {
            battle: null,
            loading: false,
            showSchedule: false,
            cron: '',
            cronValid: true,
        };
    },
    mounted() { this.load(); },
    methods: {
        async load() {
            this.loading = true;
            try {
                const { id } = this.$route.params;
                const { data } = await api.get(`battles/${id}/`);
                this.battle = data;
                this.cron = data.scheduled_cron || '';
                this.$nextTick(() => this.$refs.logBox?.scrollTo?.(0, this.$refs.logBox.scrollHeight));
            } finally {
                this.loading = false;
            }
        },
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
            this.cronValid = parts.length === 5 && parts.every(f => /^[\d*,-]+$/.test(f.replace(/\\-/g, '-')));
        },
        async saveSchedule() {
            console.log('Saving schedule', this.cron, this.cronValid);
            if (!this.cronValid) return;
            const body = this.cron ? { cron: this.cron } : {};
            await api.post(`battles/${this.battle.id}/schedule/`, body);
            this.showSchedule = false;
            await this.load();
        },

        // helpers
        fmtDateTime(v) { return v ? new Date(v).toLocaleString() : ''; },
        prettyStatus(s) { return (s || '').toLowerCase().replace(/^\w/, m => m.toUpperCase()); },
        badgeClass(s) {
            switch ((s || '').toUpperCase()) {
                case 'FINISHED': return 'is-finished';
                case 'RUNNING': return 'is-running';
                case 'FAILED': return 'is-failed';
                default: return 'is-pending';
            }
        },
        goBack() {
            // Si hay historial, vuelve; si no, lleva al listado
            if (window.history.length > 1) this.$router.back();
            else this.$router.push({ name: 'battles' }); // o path: '/battles'
        },
    },
};
</script>

<style scoped>
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

.is-finished {
    background: #16a34a;
}

.is-running {
    background: #f59e0b;
}

.is-pending {
    background: #9ca3af;
}

.is-failed {
    background: #dc2626;
}

.sched-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.sched-form input {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 10px 12px;
}

.help {
    font-size: .85rem;
    opacity: .8;
}

@media (max-width: 920px) {
    .layout {
        grid-template-columns: 1fr;
    }
}

.back-row {
    margin-bottom: 10px;
}

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

.btn-back .arrow {
    font-size: 18px;
    line-height: 1;
}
</style>
