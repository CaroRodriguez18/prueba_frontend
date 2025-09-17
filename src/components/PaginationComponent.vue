<template>
    <div class="pagination-controls">
        <button class="btn btn--outline btn--sm" @click="goFirst" :disabled="pageComputed <= 1">«</button>
        <button class="btn btn--outline btn--sm" @click="goPrev" :disabled="pageComputed <= 1">‹</button>
        <button class="btn btn--outline btn--sm" @click="goNext" :disabled="pageComputed >= maxPage">›</button>
        <button class="btn btn--outline btn--sm" @click="goLast" :disabled="pageComputed >= maxPage">»</button>

        <select class="form-control" :value="pageSizeComputed" @change="onPageSize($event)"
            style="width:auto; margin-left:8px;">
            <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ opt }}</option>
        </select>
    </div>
      <p class="pagination-info" style="margin-left:8px;">
          Página {{ pageComputed }} de {{ maxPage }} • {{ total }} resultados
      </p>
</template>


<script>
export default {
		name: 'PaginationComponent',
    props: {
        // Controlado desde el padre con v-model style (update:*)
        page: { type: Number, required: true },
        pageSize: { type: Number, default: 10 },
        total: { type: Number, default: 0 },
        pageSizeOptions: { type: Array, default: () => [5, 10, 50] },
    },
    emits: ['update:page', 'update:pageSize', 'change'],
    computed: {
        maxPage() {
            const m = Math.max(1, Math.ceil((this.total || 0) / (this.pageSizeComputed || 1)));
            return isFinite(m) ? m : 1;
        },
        pageComputed() {
            // Clamp por si el padre aún no recalculó
            return Math.min(Math.max(1, this.page || 1), this.maxPage);
        },
        pageSizeComputed() {
            return this.pageSize || this.pageSizeOptions?.[0] || 10;
        },
    },
    methods: {
        emitAll() {
            this.$emit('change', { page: this.pageComputed, pageSize: this.pageSizeComputed, maxPage: this.maxPage });
        },
        setPage(n) {
            const clamped = Math.min(Math.max(1, n), this.maxPage);
            if (clamped !== this.page) this.$emit('update:page', clamped);
            this.emitAll();
        },
        goFirst() { this.setPage(1); },
        goPrev() { this.setPage(this.pageComputed - 1); },
        goNext() { this.setPage(this.pageComputed + 1); },
        goLast() { this.setPage(this.maxPage); },
        onPageSize(e) {
            const newSize = Number(e.target.value);
            if (newSize && newSize !== this.pageSize) {
                this.$emit('update:pageSize', newSize);
                // Convención: al cambiar pageSize, volvemos a la página 1
                this.$emit('update:page', 1);
                this.emitAll();
            }
        },
    },
};
</script>


<style scoped>
.pagination-controls {
    display: flex;
    align-items: center;
    gap: 4px;
}
</style>