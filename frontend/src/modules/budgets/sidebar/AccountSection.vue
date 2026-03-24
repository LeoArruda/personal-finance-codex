<script setup lang="ts">
import AccountRow from "./AccountRow.vue";

export interface SidebarAccount {
  id: string;
  name: string;
  balance: string;
}

defineProps<{
  title: string;
  balance: string;
  accounts: SidebarAccount[];
}>();
</script>

<template>
  <section class="grid gap-3">
    <div
      class="flex items-center justify-between gap-3 text-[0.9rem] uppercase tracking-[0.08em] text-[var(--pfm-text-sidebar-muted)]"
    >
      <span>{{ title }}</span>
      <span class="tracking-normal">{{ balance }}</span>
    </div>

    <div class="grid gap-2">
      <AccountRow
        v-for="account in accounts"
        :key="account.id"
        :name="account.name"
        :balance="account.balance"
      />
    </div>
  </section>
</template>
