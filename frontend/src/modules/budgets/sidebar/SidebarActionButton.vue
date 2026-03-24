<script setup lang="ts">
defineProps<{
  label: string;
  icon: string;
}>();
</script>

<template>
  <button
    type="button"
    class="rounded-[14px] border-0 bg-[rgba(255,255,255,0.14)] px-4 py-3.5 font-bold text-[var(--pfm-text-inverse)] transition-colors hover:bg-[rgba(255,255,255,0.19)]"
  >
    <span class="flex items-center justify-center gap-2 text-[1.02rem]">
      <span class="text-[1.05rem] leading-none">{{ icon }}</span>
      <span>{{ label }}</span>
    </span>
  </button>
</template>
