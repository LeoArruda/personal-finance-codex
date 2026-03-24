<script setup lang="ts">
const props = defineProps<{
  progress: number;
  muted?: boolean;
}>();

const width = `${Math.max(0, Math.min(100, props.progress))}%`;
</script>

<template>
  <div class="mt-2 h-[6px] rounded-full bg-[rgba(204,194,174,0.45)]">
    <div
      class="h-full rounded-full"
      :class="muted ? 'bg-[rgba(204,194,174,0.75)]' : 'bg-[#74bd26]'"
      :style="{ width }"
    />
  </div>
</template>
