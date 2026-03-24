<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { useCurrencyInput } from "../composables/useCurrencyInput";

const props = defineProps<{
  value: string;
  amountMinor?: string;
  align?: "left" | "right";
  editing?: boolean;
}>();

const emit = defineEmits<{
  commit: [amountMinor: string];
  cancel: [];
}>();

const inputElement = ref<HTMLInputElement | null>(null);
const { displayValue, parsedMinorValue, reset } = useCurrencyInput(props.amountMinor ?? "0");

watch(
  () => props.editing,
  async (isEditing) => {
    if (isEditing) {
      reset(props.amountMinor ?? "0");
      await nextTick();
      inputElement.value?.focus();
      inputElement.value?.select();
      return;
    }

    reset(props.amountMinor ?? "0");
  },
  { immediate: true }
);

watch(
  () => props.amountMinor,
  (nextAmountMinor) => {
    reset(nextAmountMinor ?? "0");
  }
);

function commit() {
  if (parsedMinorValue.value === null) {
    emit("cancel");
    reset(props.amountMinor ?? "0");
    return;
  }

  emit("commit", parsedMinorValue.value);
}

function cancel() {
  emit("cancel");
  reset(props.amountMinor ?? "0");
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Enter") {
    event.preventDefault();
    commit();
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    cancel();
  }
}
</script>

<template>
  <div
    class="text-[1.13rem] text-[var(--pfm-text-default)]"
    :class="align === 'left' ? 'text-left' : 'text-right'"
  >
    <input
      v-if="editing"
      ref="inputElement"
      v-model="displayValue"
      type="text"
      inputmode="decimal"
      class="inline-flex min-w-[118px] justify-end rounded-[10px] border border-[rgba(74,85,234,0.45)] bg-white px-2.5 py-1 text-right shadow-[inset_0_0_0_1px_rgba(74,85,234,0.15)] outline-none"
      aria-label="Edit assigned amount"
      @blur="commit"
      @keydown="handleKeydown"
    />
    <span v-else>{{ value }}</span>
  </div>
</template>
