<template>
  <form
    ref="formEl"
    class="pokemon-form"
    @submit.prevent="onSubmit"
    :class="{ loading: saving }"
    novalidate
  >
    <!-- Nombre (full width) -->
    <div class="field field--full">
      <label for="name">Nombre</label>
      <input
        id="name"
        v-model.trim="form.name"
        type="text"
        required
        maxlength="50"
        autocomplete="off"
        placeholder="Nombre del Pokémon"
      />
    </div>

    <!-- HP -->
    <div class="field">
      <label for="hp">HP</label>
      <input
        id="hp"
        v-model.number="form.hp"
        type="number"
        required
        min="1"
        max="160"
        step="1"
      />
    </div>

    <!-- Ataque -->
    <div class="field">
      <label for="attack">Ataque</label>
      <input
        id="attack"
        v-model.number="form.attack"
        type="number"
        required
        min="0"
        max="134"
        step="1"
      />
    </div>

    <!-- Defensa -->
    <div class="field">
      <label for="defense">Defensa</label>
      <input
        id="defense"
        v-model.number="form.defense"
        type="number"
        required
        min="0"
        max="160"
        step="1"
      />
    </div>

    <!-- Velocidad -->
    <div class="field">
      <label for="speed">Velocidad</label>
      <input
        id="speed"
        v-model.number="form.speed"
        type="number"
        required
        min="0"
        max="130"
        step="1"
      />
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
  name: 'PokemonForm',
  props: {
    pokemon: { type: Object, default: null },
    showActions: { type: Boolean, default: false }, // evita duplicar con el footer del modal
  },
  emits: ['saved', 'cancel', 'valid'],
  data() {
    return {
      saving: false,
      form: {
        id: null,
        name: '',
        hp: 50,
        attack: 50,
        defense: 50,
        speed: 50,
      },
    };
  },
  computed: {
    isEdit() {
      return this.form.id !== null;
    },
    isValid() {
      const el = this.$refs.formEl;
      // valida HTML5 (required/min/max) + nombre no vacío
      const htmlOk = el?.checkValidity ? el.checkValidity() : true;
      return htmlOk && this.form.name.trim().length > 0 && !this.saving;
    },
  },
  watch: {
    pokemon: {
      immediate: true,
      handler(p) {
        this.form = p
          ? { ...p }
          : { id: null, name: '', hp: 50, attack: 50, defense: 50, speed: 50 };
        this.$nextTick(() => this.$emit('valid', this.isValid));
      },
    },
    form: {
      deep: true,
      handler() {
        this.$emit('valid', this.isValid);
      },
    },
  },
  methods: {
    submit() { return this.onSubmit(); }, // por si lo llama el modal
    async onSubmit() {
      const el = this.$refs.formEl;
      if (el?.checkValidity && !el.checkValidity()) {
        el.reportValidity(); // muestra los tooltips nativos y no envía
        return;
      }
      this.saving = true;
      try {
        const payload = {
          name: this.form.name.trim(),
          hp: Number(this.form.hp),
          attack: Number(this.form.attack),
          defense: Number(this.form.defense),
          speed: Number(this.form.speed),
        };
        if (this.isEdit) {
          await api.put(`pokemons/${this.form.id}/`, payload);
        } else {
          await api.post('pokemons/', payload);
        }
        this.$emit('saved'); // que el padre cierre/recargue
      } catch (e) {
        // aquí puedes mapear otros errores de backend si quieres
        console.error(e);
      } finally {
        this.saving = false;
        this.$emit('valid', this.isValid);
      }
    },
  },
};
</script>

<style scoped>
/* Layout en grid (como Scenario) */
.pokemon-form{
  display:grid;
  grid-template-columns:repeat(2, minmax(0, 1fr));
  gap:12px 16px;
}
.field{ display:flex; flex-direction:column; }
.field--full{ grid-column:1 / -1; }

label{
  font-weight:700;
  margin-bottom:6px;
  color:var(--muted, #7f8ea3);
}

input{
  width:100%;
  background:#fff;
  border:1px solid #e5e7eb;
  border-radius:10px;
  padding:10px 12px;
  color:var(--ink, #0f172a);
  outline:none;
  transition:border-color .15s ease, box-shadow .15s ease;
}
input:focus{
  border-color:var(--accent, #169183);
  box-shadow:0 0 0 3px var(--ring, rgba(22,145,131,.25));
}

/* Botones internos opcionales */
.form-buttons{
  grid-column:1 / -1;
  display:flex;
  justify-content:flex-end;
  gap:10px;
  margin-top:4px;
}

.btn{
  display:inline-flex; align-items:center; justify-content:center; gap:.5rem;
  font-weight:600; border-radius:10px; padding:.6rem .95rem;
  border:1px solid #e5e7eb; background:#fff; color:var(--ink,#0f172a);
  cursor:pointer; transition: background .15s, border-color .15s, box-shadow .15s, transform .08s;
}
.btn:hover{ background:#f7fafb; }
.btn:active{ transform: translateY(1px); }
.btn--ghost{ background:transparent; border-color:#cfd7e3; }
.btn--ghost:hover{ background:#f3f5f7; }
.btn--primary{
  background:var(--accent,#169183);
  border-color:var(--accent,#169183);
  color:#fff; box-shadow:0 6px 18px rgba(22,145,131,.18);
}
.btn--primary:hover{
  background:var(--accent-700,#117565);
  border-color:var(--accent-700,#117565);
  box-shadow:0 8px 22px rgba(22,145,131,.25);
}

/* Responsive: 1 columna en móviles */
@media (max-width:520px){
  .pokemon-form{ grid-template-columns:1fr; }
}
</style>
