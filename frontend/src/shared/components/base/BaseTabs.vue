<script setup lang="ts" generic="T extends string">
defineProps<{
  tabs: Array<{ id: T; label: string }>;
  modelValue: T;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: T];
}>();
</script>

<template>
  <div class="grid grid-cols-2 border-b border-[var(--pfm-border-subtle)]">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="border-0 px-5 py-4 text-[1.05rem] font-medium"
      :class="
        modelValue === tab.id
          ? 'border-b-2 border-[var(--pfm-text-accent)] text-[var(--pfm-text-accent)]'
          : 'text-[var(--pfm-text-default)]'
      "
      @click="emit('update:modelValue', tab.id)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
