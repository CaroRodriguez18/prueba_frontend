<template>
  <teleport to="body">
    <div
      v-if="modelValue"
      class="modal"
      tabindex="-1"
      ref="modalRoot"
      @keydown.esc="onClose"
    >
      <div class="modal-backdrop" @click="closeOnBackdrop && onClose()" />
      <div
        class="modal-content"
        ref="dialog"
        :style="{ '--modal-max-width': maxWidth }"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <!-- Header -->
        <header class="modal-header">
          <h3 class="modal-title">{{ title }}</h3>
          <button class="btn-close" @click="onClose" aria-label="Cerrar">×</button>
        </header>

        <!-- Body -->
        <section class="modal-body">
          <slot />
        </section>

      </div>
    </div>
  </teleport>
</template>

<script>
export default {
  name: 'ModalComponent',
  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: '' },
    maxWidth: { type: String, default: '640px' },
    closeOnBackdrop: { type: Boolean, default: true },

    /* Footer integrado */
    showFooter: { type: Boolean, default: true },
    primaryLabel: { type: String, default: 'Guardar' },
    secondaryLabel: { type: String, default: 'Cancelar' },
    // null => el modal deduce disabled con HTML5 validity del primer <form>
    primaryDisabled: { type: [Boolean, null], default: null },
    // si true, busca el primer <form> dentro del modal y hace requestSubmit()
    autoSubmit: { type: Boolean, default: true },
  },
  emits: ['update:modelValue', 'close', 'primary', 'secondary'],
  data() {
    return { localPrimaryDisabled: false };
  },
  computed: {
    computedPrimaryDisabled() {
      return this.primaryDisabled === null
        ? this.localPrimaryDisabled
        : this.primaryDisabled;
    },
  },
  watch: {
    modelValue(val) {
      document.body.style.overflow = val ? 'hidden' : '';
      if (val) this.$nextTick(() => {
        this.$refs.modalRoot?.focus();
        this.syncValidity();
      });
    },
  },
  mounted() {
    if (this.modelValue) this.$nextTick(() => this.$refs.modalRoot?.focus());
  },
  methods: {
    onClose() {
      this.$emit('update:modelValue', false);
      this.$emit('close');
    },
    onSecondary() {
      this.$emit('secondary');
      this.onClose();
    },
    onPrimary() {
      this.$emit('primary');
      if (!this.autoSubmit) return;
      const root = this.$refs.modalRoot;
      const form = root?.querySelector('form');
      if (!form) return;
      if (form.checkValidity && !form.checkValidity()) {
        form.reportValidity?.();
        return;
      }
      form.requestSubmit ? form.requestSubmit() : form.submit();
    },
    syncValidity() {
      if (this.primaryDisabled !== null) return; // control externo
      const root = this.$refs.modalRoot;
      const form = root?.querySelector('form');
      if (!form || !form.checkValidity) {
        this.localPrimaryDisabled = false;
        return;
      }
      this.localPrimaryDisabled = !form.checkValidity();

      // engancha listeners una sola vez para actualizar disabled en vivo
      if (form && !form.__modalValidityHooked) {
        const handler = () => {
          this.localPrimaryDisabled = form.checkValidity ? !form.checkValidity() : false;
        };
        form.addEventListener('input', handler, true);
        form.addEventListener('change', handler, true);
        form.__modalValidityHooked = true;
      }
    },
  },
};
</script>

<style scoped>
/* ===== Overlay y contenedor ===== */
.modal{
  position:fixed; inset:0; z-index:9999;
  display:grid; place-items:center;
  padding:clamp(2rem, 4vw, 4rem) 1rem;
  overflow:auto; overscroll-behavior:contain;
}
.modal-backdrop{
  position:fixed; inset:0; z-index:1;
  background:rgba(15,23,42,.55);
  backdrop-filter: blur(2px);
  will-change: opacity;
  animation: modal-fade-in 160ms ease-out;
}
.modal-content{
  position:relative; z-index:2;
  width:min(100%, var(--modal-max-width, 640px));
  max-height:85vh; overflow:auto;
  background: var(--card, #fff);
  border-radius:16px;
  border:1px solid rgba(2,6,23,.06);
  box-shadow:0 12px 40px rgba(2,6,23,.25);
  will-change: transform, opacity;
  animation: modal-pop-in 180ms cubic-bezier(.16,1,.3,1);
}

/* ===== Header / Body / Footer ===== */
.modal-header{
  display:flex; align-items:center; gap:12px;
  padding:16px 20px;
  border-bottom: 1px solid rgba(2,6,23,.06);
}
.modal-title{ margin:0; font-weight:800; letter-spacing:.2px; }
.btn-close{
  margin-left:auto;
  border:0; background:transparent; font-size:20px; cursor:pointer;
  color: var(--muted, #7f8ea3);
  border-radius:8px; padding:4px 8px;
  transition: background .15s ease, color .15s ease, transform .08s ease;
}
.btn-close:hover{ background: rgba(127,142,163,.15); color: var(--ink, #0f172a); }
.btn-close:active{ transform: translateY(1px); }
.btn-close:focus-visible{ outline:none; box-shadow:0 0 0 3px var(--ring, rgba(22,145,131,.35)); }

.modal-body{ padding:8px 20px 20px; }
.modal-footer{
  position: sticky; bottom: 0;
  background: var(--card, #fff);
  border-top: 1px solid rgba(2,6,23,.06);
  padding:16px 20px;
}
.modal-actions{ display:flex; justify-content:flex-end; gap:10px; }

/* ===== Botones ===== */
.btn{
  display:inline-flex; align-items:center; justify-content:center; gap:.5rem;
  font-weight:600; border-radius:10px; padding:.6rem .95rem;
  border:1px solid #e5e7eb; background:#fff; color: var(--ink, #0f172a);
  cursor:pointer;
  transition: background .15s ease, border-color .15s ease, box-shadow .15s ease, transform .08s ease;
}
.btn:hover{ background:#f7fafb; }
.btn:active{ transform: translateY(1px); }
.btn:focus-visible{ outline:none; box-shadow:0 0 0 3px var(--ring, rgba(22,145,131,.35)); }
.btn:disabled{
  background:#eef4f3; border-color:#ddebea; color:#9ab7b2;
  box-shadow:none; cursor:not-allowed; transform:none;
}

/* Ghost (Cancelar) */
.btn--ghost{
  background: transparent;
  border-color: #cfd7e3;
  color: var(--ink, #0f172a);
}
.btn--ghost:hover{ background:#f3f5f7; }

/* Primary (Guardar) */
.btn--primary{
  background: var(--accent, #169183);
  border-color: var(--accent, #169183);
  color:#fff;
  box-shadow: 0 6px 18px rgba(22,145,131,.18);
}
.btn--primary:hover{
  background: var(--accent-700, #117565);
  border-color: var(--accent-700, #117565);
  box-shadow: 0 8px 22px rgba(22,145,131,.25);
}

/* ===== Animaciones ===== */
@keyframes modal-fade-in { from { opacity:0 } to { opacity:1 } }
@keyframes modal-pop-in { from { opacity:0; transform:translateY(8px) scale(.98) } to { opacity:1; transform:none } }

/* ===== Responsive ===== */
@media (max-width: 520px){
  .modal-content{ width:100%; max-height:90vh; border-radius:14px; }
}
</style>
