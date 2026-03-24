<script setup lang="ts">
import AssignMenuButton from "./AssignMenuButton.vue";
import type { BudgetMonthKey } from "../types/budget.types";

defineProps<{
  label: string;
  amount: string;
  budgetId: string;
  monthKey: BudgetMonthKey;
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

    <AssignMenuButton :budget-id="budgetId" :month-key="monthKey" />
  </div>
</template>
