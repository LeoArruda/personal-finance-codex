<script setup lang="ts">
import AccountSection, { type SidebarAccount } from "./AccountSection.vue";
import SidebarActionButton from "./SidebarActionButton.vue";
import SidebarNav, { type SidebarNavItem } from "./SidebarNav.vue";
import WorkspaceCard from "./WorkspaceCard.vue";

export interface BudgetSidebarAccountSection {
  id: string;
  title: string;
  balance: string;
  accounts: SidebarAccount[];
}

defineProps<{
  workspaceName: string;
  workspaceEmail: string;
  navItems: SidebarNavItem[];
  accountSections: BudgetSidebarAccountSection[];
}>();
</script>

<template>
  <aside class="budget-sidebar">
    <WorkspaceCard :name="workspaceName" :email="workspaceEmail" />

    <SidebarNav :items="navItems" />

    <div class="budget-sidebar-section grid gap-[1.15rem]">
      <AccountSection
        v-for="section in accountSections"
        :key="section.id"
        :title="section.title"
        :balance="section.balance"
        :accounts="section.accounts"
      />
    </div>

    <div class="mt-auto grid gap-2.5 px-1 pt-5">
      <SidebarActionButton label="Add Account" icon="⊕" />
      <SidebarActionButton label="Bank Connections" icon="⌘" />
    </div>
  </aside>
</template>
