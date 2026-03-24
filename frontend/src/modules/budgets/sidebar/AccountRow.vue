<script setup lang="ts">
defineProps<{
  name: string;
  balance: string;
}>();
</script>

<template>
  <div
    class="flex items-center justify-between gap-3 px-2 pl-7 text-[1.04rem] text-[var(--pfm-text-inverse)]"
  >
    <span class="min-w-0 truncate">{{ name }}</span>
    <span class="shrink-0 text-[var(--pfm-text-sidebar-muted)]">{{ balance }}</span>
  </div>
</template>
