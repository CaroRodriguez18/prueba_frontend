<template>
  <form
    ref="formEl"
    class="battle-form"
    @submit.prevent="onSubmit"
    novalidate
  >
    <!-- Pokémon A -->
    <div class="field">
      <label for="pokeA">Pokémon A</label>
      <select
        id="pokeA"
        ref="selA"
        v-model.number="form.pokemon_a"
        required
        :virtual-scroll-slice-size="pokemons.length"
        clearable
        lazy-rules
        outlined
        dense
        emit-value
        map-options
        use-input
      >
        <option :value="null" disabled>Selecciona un Pokémon</option>
        <option
          v-for="p in pokemons"
          :key="p.id"
          :value="p.id"
          :disabled="p.id === form.pokemon_b"
        >
          {{ p.name }} (HP:{{ p.hp }}, ATK:{{ p.attack }})
        </option>
      </select>
    </div>

    <!-- Pokémon B -->
    <div class="field">
      <label for="pokeB">Pokémon B</label>
      <select
        id="pokeB"
        ref="selB"
        v-model.number="form.pokemon_b"
        required
      >
        <option :value="null" disabled>Selecciona un Pokémon</option>
        <option
          v-for="p in pokemons"
          :key="p.id"
          :value="p.id"
          :disabled="p.id === form.pokemon_a"
        >
          {{ p.name }} (HP:{{ p.hp }}, ATK:{{ p.attack }})
        </option>
      </select>
    </div>

    <!-- Escenario -->
    <div class="field field--full">
      <label for="scenario">Escenario</label>
      <select
        id="scenario"
        v-model.number="form.scenario"
        required
      >
        <option :value="null" disabled>Selecciona un escenario</option>
        <option v-for="s in scenarios" :key="s.id" :value="s.id">
          {{ s.name }}
        </option>
      </select>
    </div>

    <!-- CRON -->
    <div class="field field--full">
      <label for="cron">Programar CRON (opcional)</label>
      <input
        id="cron"
        ref="cronEl"
        type="text"
        v-model.trim="form.scheduled_cron"
        placeholder="Vacío = pendiente. Formato CRON de 5 campos."
        inputmode="text"
        autocomplete="off"
      />
      <small class="form-help">Ej: <code>*/5 * * * *</code> cada 5 min</small>
    </div>

    <!-- Acciones -->
    <div class="form-buttons">
      <button type="button" class="btn btn--ghost" @click="$emit('cancel')">Cancelar</button>
      <button type="submit" class="btn btn--primary">{{ isEdit ? 'Actualizar' : 'Crear' }}</button>
    </div>
  </form>
</template>

<script>
import api from "../api.js";

export default {
  name: "BattleForm",
  props: {
    battle: { type: Object, default: null },
    pokemons: { type: Array, default: () => [] },
    scenarios: { type: Array, default: () => [] },
    showActions: { type: Boolean, default: false }, // usa el footer del modal por defecto
  },
  emits: ["saved", "cancel", "valid"],
  data() {
    return {
      saving: false,
      form: {
        id: null,
        pokemon_a: null,
        pokemon_b: null,
        scenario: null,
        scheduled_cron: "",
      },
    };
  },
  computed: {
    isEdit() { return this.form.id !== null; },
    isValid() { return this.computeValidity(false); }, // sin reportar
  },
  watch: {
    battle: {
      immediate: true,
      handler(b) {
        this.form = b
          ? {
              id: b.id,
              pokemon_a: b.pokemon_a,
              pokemon_b: b.pokemon_b,
              scenario: b.scenario,
              scheduled_cron: b.scheduled_cron || "",
            }
          : { id: null, pokemon_a: null, pokemon_b: null, scenario: null, scheduled_cron: "" };
        this.$nextTick(() => {
          this.updateCustomValidity();
          this.$emit("valid", this.isValid);
        });
      },
    },
    form: {
      deep: true,
      handler() {
        this.updateCustomValidity();
        this.$emit("valid", this.isValid);
      },
    },
  },
  methods: {
    // Regla simple para CRON (5 campos con caracteres válidos)
    isCronLike(val) {
      if (!val) return true; // vacío es válido (pendiente)
      const parts = val.trim().split(/\s+/);
      if (parts.length !== 5) return false;
      return parts.every(f => /^[\d*,\-*/]+$/.test(f));
    },
    updateCustomValidity() {
      // A ≠ B
      const same = this.form.pokemon_a && this.form.pokemon_b && this.form.pokemon_a === this.form.pokemon_b;
      this.$refs.selA?.setCustomValidity(same ? "Pokémon A y B no pueden ser el mismo." : "");
      this.$refs.selB?.setCustomValidity(same ? "Pokémon A y B no pueden ser el mismo." : "");

      // CRON
      const cronOk = this.isCronLike(this.form.scheduled_cron);
      this.$refs.cronEl?.setCustomValidity(cronOk ? "" : "CRON inválido. Usa 5 campos (min hora día mes día-sem).");
    },
    computeValidity(reportIfInvalid = false) {
      const el = this.$refs.formEl;
      this.updateCustomValidity();
      const ok = el?.checkValidity ? el.checkValidity() : !!(this.form.pokemon_a && this.form.pokemon_b && this.form.scenario);
      if (!ok && reportIfInvalid) el?.reportValidity?.();
      return ok && !this.saving;
    },
    async onSubmit() {
      if (!this.computeValidity(true)) return;

      this.saving = true;
      try {
        // Crear / actualizar batalla
        const payload = {
          pokemon_a: this.form.pokemon_a,
          pokemon_b: this.form.pokemon_b,
          scenario: this.form.scenario,
        };

        let battleId = this.form.id;
        if (this.isEdit) {
          await api.put(`battles/${battleId}/`, payload);
        } else {
          const { data } = await api.post("battles/", payload);
          battleId = data.id;
        }

        // Programación (opcional)
        const cron = (this.form.scheduled_cron || "").trim();
        if (cron === "") {
          await api.post(`battles/${battleId}/schedule/`, {}); // desprograma (pendiente)
        } else {
          await api.post(`battles/${battleId}/schedule/`, { cron });
        }

        this.$emit("saved");
      } catch (err) {
        // Si quieres, aquí podrías mapear errores del backend a mensajes de campo
        console.error(err);
      } finally {
        this.saving = false;
        this.$emit("valid", this.isValid);
      }
    },
    submit() { return this.onSubmit(); }, // para que el modal pueda forzar submit
  },
};
</script>

<style scoped>
.battle-form{
  display:grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap:12px 16px;
}
.field{ display:flex; flex-direction:column; }
.field--full{ grid-column: 1 / -1; }

label{
  font-weight:700;
  margin-bottom:6px;
  color: var(--muted, #7f8ea3);
}

select, input{
  width:100%;
  background:#fff;
  border:1px solid #e5e7eb;
  border-radius:10px;
  padding:10px 12px;
  color: var(--ink, #0f172a);
  outline:none;
  transition: border-color .15s ease, box-shadow .15s ease;
}
select:focus, input:focus{
  border-color: var(--accent, #169183);
  box-shadow: 0 0 0 3px var(--ring, rgba(22,145,131,.25));
}

.form-help{
  margin-top:6px; font-size:.85rem; color:#6b7280;
}

.form-buttons{
  grid-column:1 / -1;
  display:flex; justify-content:flex-end; gap:10px; margin-top:4px;
}
.btn{
  display:inline-flex; align-items:center; justify-content:center; gap:.5rem;
  font-weight:600; border-radius:10px; padding:.6rem .95rem;
  border:1px solid #e5e7eb; background:#fff; color:var(--ink,#0f172a);
  cursor:pointer; transition: background .15s, border-color .15s, box-shadow .15s, transform .08s;
}
.btn--ghost{ background:transparent; border-color:#cfd7e3; }
.btn--ghost:hover{ background:#f3f5f7; }
.btn--primary{ background: var(--accent,#169183); color:#fff; border-color: var(--accent,#169183); }
.btn--primary:hover{ background: var(--accent-700,#117565); border-color: var(--accent-700,#117565); }
@media (max-width: 520px){ .battle-form{ grid-template-columns:1fr; } }
</style>
