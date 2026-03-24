<script setup lang="ts">
defineProps<{
  name: string;
  email: string;
}>();
</script>

<template>
  <div class="px-3 pt-2 pb-5">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="text-[1.9rem] leading-none text-[var(--pfm-text-inverse)]">☘︎</div>
        <div
          class="mt-2 truncate text-[1.85rem] font-bold tracking-[-0.03em] text-[var(--pfm-text-inverse)]"
        >
          {{ name }}
        </div>
        <div class="truncate text-[0.95rem] text-[var(--pfm-text-sidebar-muted)]">
          {{ email }}
        </div>
      </div>

      <button
        type="button"
        class="mt-1 rounded-full border-0 bg-transparent p-1 text-[1.15rem] text-[var(--pfm-text-sidebar-muted)]"
        aria-label="Open workspace options"
      >
        ▾
      </button>
    </div>
  </div>
</template>
