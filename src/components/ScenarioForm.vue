<template>
  <form
    ref="formEl"
    class="scenario-form"
    @submit.prevent="onSubmit"
    :class="{ loading: saving }"
    novalidate
  >
    <!-- Nombre (full width) -->
    <div class="field field--full">
      <label class="form-label" for="name">Nombre</label>
      <input
        id="name"
        class="form-control"
        v-model.trim="form.name"
        required
        maxlength="100"
        placeholder="Ej: Bosque Verde"
      />
      <small v-if="errors.name" class="form-help">{{ errors.name }}</small>
    </div>

    <!-- Modificadores (grid 2 cols) -->
    <div class="field">
      <label class="form-label" for="atk">Modificador Ataque ×</label>
      <input
        id="atk"
        class="form-control"
        type="number"
        step="0.1"
        min="0.1"
        max="3"
        v-model.number="form.attack_modifier"
        required
        placeholder="1.0"
      />
      <small v-if="errors.attack_modifier" class="form-help">{{ errors.attack_modifier }}</small>
    </div>

    <div class="field">
      <label class="form-label" for="def">Modificador Defensa ×</label>
      <input
        id="def"
        type="number"
        step="0.1"
        min="0.1"
        max="3"
        v-model.number="form.defense_modifier"
        required
        placeholder="1.0"
      />
      <small v-if="errors.defense_modifier" class="form-help">{{ errors.defense_modifier }}</small>
    </div>

    <div class="field">
      <label class="form-label" for="spd">Modificador Velocidad ×</label>
      <input
        id="spd"
        class="form-control"
        type="number"
        step="0.1"
        min="0.1"
        max="3"
        v-model.number="form.speed_modifier"
        required
        placeholder="1.0"
      />
      <small v-if="errors.speed_modifier" class="form-help">{{ errors.speed_modifier }}</small>
    </div>

    <!-- Acciones -->
    <div class="form-buttons">
      <button type="button" class="btn btn--ghost" @click="$emit('cancel')">Cancelar</button>
      <button type="submit" class="btn btn--primary">{{ isEdit ? 'Actualizar' : 'Crear' }}</button>
    </div>
  </form>
</template>

<script>
import api from '../api.js';

export default {
  name: 'ScenarioForm',
  props: {
    scenario: { type: Object, default: null },
    // para no duplicar botones con el footer del modal
    showActions: { type: Boolean, default: false },
  },
  emits: ['saved', 'cancel', 'valid'],
  data() {
    return {
      saving: false,
      errors: {},
      form: {
        id: null,
        name: '',
        attack_modifier: 1.0,
        defense_modifier: 1.0,
        speed_modifier: 1.0,
      },
    };
  },
  computed: {
    isEdit() {
      return !!this.form.id;
    },
    disableSubmit() {
      // Sólo aplica cuando showActions = true
      return this.saving || !this.computeValidity();
    },
  },
  watch: {
    scenario: {
      immediate: true,
      handler(s) {
        this.errors = {};
        this.form = s
          ? {
              id: s.id ?? null,
              name: s.name ?? '',
              attack_modifier: +s.attack_modifier,
              defense_modifier: +s.defense_modifier,
              speed_modifier: +s.speed_modifier,
            }
          : { id: null, name: '', attack_modifier: 1.0, defense_modifier: 1.0, speed_modifier: 1.0 };
        this.$nextTick(this.emitValidity);
      },
    },
    form: {
      deep: true,
      handler(newVal, oldVal) {
        this.emitValidity();
        // limpia errores del campo editado
        if (oldVal) {
          for (const k of Object.keys(this.errors)) {
            if (newVal[k] !== oldVal[k]) delete this.errors[k];
          }
        }
      },
    },
  },
  methods: {
    // método público para que el modal pueda invocar submit()
    submit() { return this.onSubmit(); },
    sanitizeNumber(val) {
      let n = Number(val);
      if (!isFinite(n)) n = 1.0;
      if (n < 0.1) n = 0.1;
      if (n > 3) n = 3;
      return Math.round(n * 100) / 100;
    },
    normalize(field) {
      this.form[field] = this.sanitizeNumber(this.form[field]);
      this.$nextTick(this.emitValidity);
    },
    computeValidity() {
      const formEl = this.$refs.formEl;
      const nativeOk = formEl?.checkValidity ? formEl.checkValidity() : true;
      const nameOk = this.form.name.trim().length > 0;
      return nativeOk && nameOk && !this.saving;
    },
    emitValidity() {
      this.$emit('valid', this.computeValidity());
    },
    async onSubmit() {
      if (!this.computeValidity()) {
        this.$refs.formEl?.reportValidity?.();
        return;
      }
      this.saving = true;
      this.errors = {};
      try {
        const payload = {
          name: this.form.name.trim(),
          attack_modifier: this.sanitizeNumber(this.form.attack_modifier),
          defense_modifier: this.sanitizeNumber(this.form.defense_modifier),
          speed_modifier: this.sanitizeNumber(this.form.speed_modifier),
        };
        if (this.isEdit) {
          await api.put(`scenarios/${this.form.id}/`, payload);
        } else {
          await api.post('scenarios/', payload);
        }
        this.$emit('saved');
      } catch (e) {
        const data = e?.response?.data;
        if (data && typeof data === 'object') {
          this.errors = Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v.join(' ') : String(v)])
          );
        } else {
          alert('Error guardando escenario');
        }
      } finally {
        this.saving = false;
        this.emitValidity();
      }
    },
  },
};
</script>

<style scoped>
/* Grid igual al de Pokémon: 2 columnas, con gaps */
.scenario-form{
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
  row-gap: 12px;
}

/* Bloques label+input */
.field{ display: flex; flex-direction: column; }
.field--full{ grid-column: 1 / -1; }

.form-label{
  font-weight: 700;
  margin-bottom: 6px;
  color: var(--muted, #7f8ea3);
}

/* Inputs coherentes con tema claro (reutiliza tus vars globales) */
.form-control{
  width: 100%;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--ink, #0f172a);
  outline: none;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.form-control:focus{
  border-color: var(--accent, #169183);
  box-shadow: 0 0 0 3px var(--ring, rgba(22,145,131,.25));
}

/* Mensajes de ayuda / error */
.form-help{ color:#a84b2f; font-size:.85rem; margin-top:4px; }

/* Botones internos opcionales (misma línea que el modal) */
.form-buttons{
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}

/* Reutiliza tus utilidades de botón */
.btn{
  display:inline-flex; align-items:center; justify-content:center; gap:.5rem;
  font-weight:600; border-radius:10px; padding:.6rem .95rem;
  border:1px solid #e5e7eb; background:#fff; color: var(--ink, #0f172a);
  cursor:pointer; transition: background .15s, border-color .15s, box-shadow .15s, transform .08s;
}
.btn:hover{ background:#f7fafb; }
.btn:active{ transform: translateY(1px); }
.btn--ghost{ background: transparent; border-color: #cfd7e3; }
.btn--ghost:hover{ background:#f3f5f7; }
.btn--primary{
  background: var(--accent, #169183);
  border-color: var(--accent, #169183);
  color:#fff; box-shadow: 0 6px 18px rgba(22,145,131,.18);
}
.btn--primary:hover{
  background: var(--accent-700, #117565);
  border-color: var(--accent-700, #117565);
  box-shadow: 0 8px 22px rgba(22,145,131,.25);
}

/* Móvil: 1 columna */
@media (max-width: 520px){
  .scenario-form{ grid-template-columns: 1fr; }
}
</style>
