<script setup lang="ts">
import AppShellLayout from "../../app/layouts/AppShellLayout.vue";
import BudgetHeader from "../../modules/budgets/components/BudgetHeader.vue";
import BudgetTable from "../../modules/budgets/components/BudgetTable.vue";
import BudgetToolbar, {
  type BudgetToolbarAction
} from "../../modules/budgets/components/BudgetToolbar.vue";
import RightInspector from "../../modules/budgets/inspector/RightInspector.vue";
import type { BudgetFilterChip } from "../../modules/budgets/components/BudgetFilterChips.vue";
import BudgetSidebar, {
  type BudgetSidebarAccountSection
} from "../../modules/budgets/sidebar/BudgetSidebar.vue";
import type { SidebarNavItem } from "../../modules/budgets/sidebar/SidebarNav.vue";

const sidebarNavItems: SidebarNavItem[] = [
  { id: "plan", label: "Plan", icon: "◫", active: true },
  { id: "reflect", label: "Reflect", icon: "▥" },
  { id: "accounts", label: "All Accounts", icon: "⌂" }
];

const sidebarGroups: BudgetSidebarAccountSection[] = [
  {
    id: "cash",
    title: "Cash",
    balance: "$10,500.00",
    accounts: [
      { id: "rbc-checking", name: "RBC Checking", balance: "$5,000.00" },
      { id: "rbc-savings", name: "RBC Savings", balance: "$5,500.00" }
    ]
  },
  {
    id: "loans",
    title: "Loans",
    balance: "-$21,000.00",
    accounts: [{ id: "cibc-loan", name: "CIBC Loan", balance: "-$21,000.00" }]
  },
  {
    id: "tracking",
    title: "Tracking",
    balance: "$23,000.00",
    accounts: [{ id: "future-investments", name: "Future Investments", balance: "$23,000.00" }]
  }
];

const budgetFilterChips: BudgetFilterChip[] = [
  { id: "all", label: "All" },
  { id: "underfunded", label: "Underfunded" },
  { id: "overfunded", label: "Overfunded" },
  { id: "money_available", label: "Money Available" },
  { id: "snoozed", label: "Snoozed" }
];

const budgetToolbarActions: BudgetToolbarAction[] = [
  { id: "create-group", label: "⊕ Category Group" },
  { id: "undo", label: "↺ Undo", subdued: true },
  { id: "redo", label: "↻ Redo", subdued: true },
  { id: "recent-moves", label: "◔ Recent Moves" }
];

</script>

<template>
  <AppShellLayout class="budget-page">
    <template #sidebar>
      <BudgetSidebar
        workspace-name="Leo's Plan"
        workspace-email="spruces_honoree5@icloud.com"
        :nav-items="sidebarNavItems"
        :account-sections="sidebarGroups"
      />
    </template>

    <template #main>
      <div class="budget-main">
        <BudgetHeader
          budget-id="budget-1"
          month-key="2026-03"
          month-label="Mar 2026"
          note-text="Enter a note..."
          ready-to-assign-label="Ready to Assign"
          ready-to-assign-amount="$7,720.00"
          member-button-label="+ Add Member"
        />

        <BudgetToolbar :chips="budgetFilterChips" :actions="budgetToolbarActions" />

        <BudgetTable budget-id="budget-1" month-key="2026-03" />
      </div>
    </template>

    <template #inspector>
      <RightInspector budget-id="budget-1" month-key="2026-03" />
    </template>
  </AppShellLayout>
</template>
