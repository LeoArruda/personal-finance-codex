<script setup lang="ts">
import AssignMenuButton from "./AssignMenuButton.vue";

defineProps<{
  label: string;
  amount: string;
}>();
</script>

<template>
  <div class="budget-ready-box">
    <div>
      <div class="text-[1rem] font-extrabold leading-[1.1] text-[#111]">{{ label }}</div>
      <div class="mt-1 text-[3rem] font-extrabold leading-none tracking-[-0.05em] text-[#111]">
        {{ amount }}
      </div>
    </div>

    <AssignMenuButton />
  </div>
</template>
