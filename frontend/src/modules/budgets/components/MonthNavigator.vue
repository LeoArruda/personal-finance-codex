<script setup lang="ts">
defineProps<{
  monthLabel: string;
  noteText: string;
}>();
</script>

<template>
  <div class="flex items-center gap-4">
    <button
      type="button"
      class="grid h-[42px] w-[42px] place-items-center rounded-full border-2 border-[rgba(74,85,234,0.7)] bg-white text-[1.2rem] text-[var(--pfm-text-accent)]"
      aria-label="Previous month"
    >
      ‹
    </button>

    <div>
      <div class="flex items-center gap-2">
        <h1
          class="m-0 font-[var(--pfm-font-sans)] text-[3rem] leading-none tracking-[-0.05em] text-[var(--pfm-text-strong)]"
        >
          {{ monthLabel }}
        </h1>
        <span class="text-[1.1rem] text-[var(--pfm-text-accent)]">▼</span>
      </div>
      <div class="mt-1 text-[1.1rem] text-[var(--pfm-text-muted)]">
        {{ noteText }}
      </div>
    </div>

    <button
      type="button"
      class="grid h-[42px] w-[42px] place-items-center rounded-full border-2 border-[rgba(74,85,234,0.7)] bg-white text-[1.2rem] text-[var(--pfm-text-accent)]"
      aria-label="Next month"
    >
      ›
    </button>
  </div>
</template>
