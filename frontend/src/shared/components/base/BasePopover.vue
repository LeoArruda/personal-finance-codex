<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps<{
  open: boolean;
  placement?: "bottom-start" | "bottom-end";
}>();

const emit = defineEmits<{
  close: [];
}>();

const rootElement = ref<HTMLElement | null>(null);

function handleDocumentPointerDown(event: MouseEvent) {
  if (!props.open) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }

  if (rootElement.value?.contains(target)) {
    return;
  }

  emit("close");
}

onMounted(() => {
  document.addEventListener("mousedown", handleDocumentPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener("mousedown", handleDocumentPointerDown);
});
</script>

<template>
  <div ref="rootElement" class="relative">
    <slot name="trigger" />

    <div
      v-if="open"
      class="absolute top-[calc(100%+12px)] z-30 min-w-[420px] rounded-[20px] border border-[var(--pfm-border-subtle)] bg-[var(--pfm-bg-panel)] shadow-[0_24px_48px_rgba(31,28,23,0.16)]"
      :class="placement === 'bottom-end' ? 'right-0' : 'left-0'"
      role="dialog"
      aria-modal="false"
    >
      <slot />
    </div>
  </div>
</template>
