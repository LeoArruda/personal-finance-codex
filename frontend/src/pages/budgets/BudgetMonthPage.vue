<script setup lang="ts">
import AppShellLayout from "../../app/layouts/AppShellLayout.vue";

type SidebarAccountGroup = {
  title: string;
  balance: string;
  accounts: Array<{ name: string; balance: string }>;
};

type BudgetCategoryGroup = {
  id: string;
  name: string;
  assigned: string;
  activity: string;
  available: string;
  rows: Array<{
    id: string;
    name: string;
    icon: string;
    assigned: string;
    activity: string;
    available: string;
    selected?: boolean;
  }>;
};

const sidebarGroups: SidebarAccountGroup[] = [
  {
    title: "Cash",
    balance: "$10,500.00",
    accounts: [
      { name: "RBC Checking", balance: "$5,000.00" },
      { name: "RBC Savings", balance: "$5,500.00" }
    ]
  },
  {
    title: "Loans",
    balance: "-$21,000.00",
    accounts: [{ name: "CIBC Loan", balance: "-$21,000.00" }]
  },
  {
    title: "Tracking",
    balance: "$23,000.00",
    accounts: [{ name: "Future Investments", balance: "$23,000.00" }]
  }
];

const budgetGroups: BudgetCategoryGroup[] = [
  {
    id: "bills",
    name: "Bills",
    assigned: "$2,780.00",
    activity: "$0.00",
    available: "$2,780.00",
    rows: [
      {
        id: "rent",
        name: "Rent",
        icon: "🏠",
        assigned: "$2,300.00",
        activity: "$0.00",
        available: "$2,300.00",
        selected: true
      },
      {
        id: "utilities",
        name: "Utilities",
        icon: "⚡",
        assigned: "$200.00",
        activity: "$0.00",
        available: "$200.00"
      },
      {
        id: "insurance",
        name: "Insurance",
        icon: "📄",
        assigned: "$280.00",
        activity: "$0.00",
        available: "$280.00"
      }
    ]
  },
  {
    id: "needs",
    name: "Needs",
    assigned: "$0.00",
    activity: "$0.00",
    available: "$0.00",
    rows: [
      {
        id: "groceries",
        name: "Groceries",
        icon: "🛒",
        assigned: "$0.00",
        activity: "$0.00",
        available: "$0.00"
      },
      {
        id: "transportation",
        name: "Transportation",
        icon: "🛞",
        assigned: "$0.00",
        activity: "$0.00",
        available: "$0.00"
      }
    ]
  }
];

const inspectorStats = [
  { label: "Cash Left Over From Last Month", value: "$0.00" },
  { label: "Assigned This Month", value: "+$2,300.00" },
  { label: "Cash Spending", value: "$0.00" },
  { label: "Credit Spending", value: "$0.00" }
];

const autoAssignRows = [
  "Assigned Last Month",
  "Spent Last Month",
  "Average Assigned",
  "Average Spent",
  "Reset Available Amount"
];
</script>

<template>
  <AppShellLayout class="budget-page">
    <template #sidebar>
      <div class="budget-sidebar">
        <div style="padding: 6px 10px 18px">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px">
            <div>
              <div style="font-size: 2rem; line-height: 1">☘︎</div>
              <div style="margin-top: 8px; font-size: 1.9rem; font-weight: 700; letter-spacing: -0.03em">
                Leo's Plan
              </div>
              <div style="color: var(--pfm-text-sidebar-muted); font-size: 0.95rem">
                spruces_honoree5@icloud.com
              </div>
            </div>
            <div style="font-size: 1.3rem; color: var(--pfm-text-sidebar-muted)">▾</div>
          </div>
        </div>

        <nav style="display: grid; gap: 8px">
          <a class="budget-sidebar-nav-button budget-sidebar-nav-button--active" href="/">
            <span>◫</span>
            <span style="font-size: 1.5rem; font-weight: 600">Plan</span>
          </a>
          <a class="budget-sidebar-nav-button" href="/">
            <span>▥</span>
            <span style="font-size: 1.5rem; font-weight: 500">Reflect</span>
          </a>
          <a class="budget-sidebar-nav-button" href="/">
            <span>⌂</span>
            <span style="font-size: 1.5rem; font-weight: 500">All Accounts</span>
          </a>
        </nav>

        <div class="budget-sidebar-section" style="display: grid; gap: 18px">
          <section v-for="group in sidebarGroups" :key="group.title" style="display: grid; gap: 10px">
            <div
              style="display: flex; align-items: center; justify-content: space-between; color: var(--pfm-text-sidebar-muted); font-size: 0.9rem; letter-spacing: 0.08em; text-transform: uppercase"
            >
              <span>{{ group.title }}</span>
              <span style="letter-spacing: 0">{{ group.balance }}</span>
            </div>

            <div style="display: grid; gap: 8px">
              <div
                v-for="account in group.accounts"
                :key="account.name"
                style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 8px 0 26px; color: var(--pfm-text-inverse); font-size: 1.05rem"
              >
                <span>{{ account.name }}</span>
                <span style="color: var(--pfm-text-sidebar-muted)">{{ account.balance }}</span>
              </div>
            </div>
          </section>
        </div>

        <div style="margin-top: auto; display: grid; gap: 10px; padding: 18px 4px 0">
          <button
            type="button"
            style="border: 0; border-radius: 14px; background: rgba(255,255,255,0.14); color: var(--pfm-text-inverse); padding: 14px 18px; font-weight: 700"
          >
            ⊕ Add Account
          </button>
          <button
            type="button"
            style="border: 0; border-radius: 14px; background: rgba(255,255,255,0.14); color: var(--pfm-text-inverse); padding: 14px 18px; font-weight: 700"
          >
            ⌘ Bank Connections
          </button>
        </div>
      </div>
    </template>

    <template #main>
      <div class="budget-main">
        <header
          style="display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding: 30px 28px 18px"
        >
          <div style="display: flex; align-items: center; gap: 18px">
            <button
              type="button"
              style="display: grid; place-items: center; width: 42px; height: 42px; border-radius: 999px; border: 2px solid rgba(74, 85, 234, 0.7); background: white; color: var(--pfm-text-accent); font-size: 1.2rem"
            >
              ‹
            </button>
            <div>
              <div style="display: flex; align-items: center; gap: 8px">
                <h1
                  style="margin: 0; color: var(--pfm-text-strong); font-family: var(--pfm-font-sans); font-size: 3rem; line-height: 1; letter-spacing: -0.05em"
                >
                  Mar 2026
                </h1>
                <span style="color: var(--pfm-text-accent); font-size: 1.1rem">▼</span>
              </div>
              <div style="margin-top: 4px; color: var(--pfm-text-muted); font-size: 1.15rem">
                Enter a note...
              </div>
            </div>
            <button
              type="button"
              style="display: grid; place-items: center; width: 42px; height: 42px; border-radius: 999px; border: 2px solid rgba(74, 85, 234, 0.7); background: white; color: var(--pfm-text-accent); font-size: 1.2rem"
            >
              ›
            </button>
          </div>

          <div class="budget-ready-box">
            <div>
              <div style="color: #111; font-size: 1rem; font-weight: 800; line-height: 1.1">Ready to Assign</div>
              <div
                style="margin-top: 4px; color: #111; font-size: 3rem; font-weight: 800; line-height: 1; letter-spacing: -0.05em"
              >
                $7,720.00
              </div>
            </div>
            <button type="button" class="budget-ready-box__action">Assign ▼</button>
          </div>
        </header>

        <section style="padding: 0 28px 18px">
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap">
            <span class="budget-pill budget-pill--active">All</span>
            <span class="budget-pill">Underfunded</span>
            <span class="budget-pill">Overfunded</span>
            <span class="budget-pill">Money Available</span>
            <span class="budget-pill">Snoozed</span>
          </div>
        </section>

        <section style="padding: 0 18px 24px">
          <div class="budget-card" style="overflow: hidden; border-radius: 22px">
            <div
              style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 24px; background: rgba(255,255,255,0.86)"
            >
              <div style="display: flex; align-items: center; gap: 22px; color: var(--pfm-text-accent)">
                <span style="font-size: 1.55rem">⊕ Category Group</span>
                <span style="opacity: 0.45">↺ Undo</span>
                <span style="opacity: 0.45">↻ Redo</span>
                <span>◔ Recent Moves</span>
              </div>
              <div style="display: flex; gap: 8px">
                <span class="budget-pill" style="padding-inline: 12px">▤</span>
                <span class="budget-pill" style="padding-inline: 12px; opacity: 0.5">☰</span>
              </div>
            </div>

            <div class="budget-table-row budget-kicker" style="padding-top: 14px; padding-bottom: 14px">
              <div>Category</div>
              <div>Assigned</div>
              <div>Activity</div>
              <div>Available</div>
            </div>

            <template v-for="group in budgetGroups" :key="group.id">
              <div class="budget-table-row budget-table-row--group">
                <div style="display: flex; align-items: center; gap: 14px">
                  <span style="font-size: 1.15rem">⌄</span>
                  <span style="font-size: 1.8rem">□</span>
                  <span style="font-size: 1.25rem">{{ group.name }}</span>
                </div>
                <div>{{ group.assigned }}</div>
                <div>{{ group.activity }}</div>
                <div>{{ group.available }}</div>
              </div>

              <div
                v-for="row in group.rows"
                :key="row.id"
                class="budget-table-row"
                :class="{ 'budget-table-row--selected': row.selected }"
              >
                <div style="display: flex; align-items: center; gap: 16px; min-width: 0">
                  <span style="font-size: 1.55rem; color: rgba(38,33,28,0.45)">□</span>
                  <div style="display: flex; min-width: 0; flex: 1; align-items: center; gap: 12px">
                    <span style="font-size: 1.9rem">{{ row.icon }}</span>
                    <div style="min-width: 0; flex: 1">
                      <div
                        style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--pfm-text-strong); font-size: 1.2rem; font-weight: 600"
                      >
                        {{ row.name }}
                      </div>
                      <div
                        style="margin-top: 8px; height: 6px; border-radius: 999px; background: rgba(204, 194, 174, 0.45)"
                      >
                        <div
                          :style="{
                            width: row.available === '$0.00' ? '12%' : '86%',
                            height: '100%',
                            borderRadius: '999px',
                            background: row.available === '$0.00' ? 'rgba(204, 194, 174, 0.75)' : '#74bd26'
                          }"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div style="color: var(--pfm-text-default); font-size: 1.15rem">{{ row.assigned }}</div>
                <div style="color: var(--pfm-text-default); font-size: 1.15rem">{{ row.activity }}</div>
                <div style="display: flex; justify-content: flex-end">
                  <span :class="row.available === '$0.00' ? 'budget-pill' : 'budget-metric-positive'">
                    {{ row.available }}
                  </span>
                </div>
              </div>
            </template>
          </div>
        </section>
      </div>
    </template>

    <template #inspector>
      <div class="budget-inspector">
        <section class="budget-card" style="overflow: hidden">
          <div
            style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 20px 22px; border-bottom: 1px solid var(--pfm-border-subtle)"
          >
            <div style="display: flex; align-items: center; gap: 12px">
              <span style="font-size: 2rem">🏠</span>
              <div style="color: var(--pfm-text-strong); font-size: 1.9rem; font-weight: 700">Rent</div>
            </div>
            <span style="color: var(--pfm-text-muted); font-size: 1.4rem">✎</span>
          </div>

          <div
            style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 22px; border-bottom: 1px solid var(--pfm-border-subtle)"
          >
            <div style="color: var(--pfm-text-strong); font-size: 1.2rem; font-weight: 700">Available Balance ▼</div>
            <span class="budget-metric-positive">$2,300.00</span>
          </div>

          <div style="display: grid; gap: 10px; padding: 18px 22px 22px">
            <div
              v-for="stat in inspectorStats"
              :key="stat.label"
              style="display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 1.1rem"
            >
              <span>{{ stat.label }}</span>
              <strong style="color: var(--pfm-text-default)">{{ stat.value }}</strong>
            </div>
          </div>
        </section>

        <section class="budget-card" style="overflow: hidden">
          <div style="padding: 20px 22px; border-bottom: 1px solid var(--pfm-border-subtle)">
            <div style="color: var(--pfm-text-strong); font-size: 1.55rem; font-weight: 700">Target ▼</div>
          </div>
          <div style="padding: 20px 22px 22px">
            <div style="color: var(--pfm-text-strong); font-size: 1.3rem; font-weight: 700">
              How much do you need for 🏠 Rent?
            </div>
            <p style="margin: 14px 0 18px; color: var(--pfm-text-default); font-size: 1.08rem; line-height: 1.5">
              When you create a target, we'll let you know how much money to set aside to stay on
              track over time.
            </p>
            <button
              type="button"
              style="border: 0; border-radius: 14px; background: rgba(74, 85, 234, 0.13); color: var(--pfm-text-accent); padding: 12px 18px; font-weight: 700"
            >
              Create Target
            </button>
          </div>
        </section>

        <section class="budget-card" style="overflow: hidden">
          <div style="padding: 20px 22px; border-bottom: 1px solid var(--pfm-border-subtle)">
            <div style="color: var(--pfm-text-strong); font-size: 1.55rem; font-weight: 700">Auto-Assign ▼</div>
          </div>
          <div style="display: grid; gap: 10px; padding: 18px 18px 20px">
            <div
              v-for="row in autoAssignRows"
              :key="row"
              class="budget-card budget-card--soft"
              style="display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 16px"
            >
              <span style="color: var(--pfm-text-accent); font-size: 1.05rem">{{ row }}</span>
              <strong style="color: var(--pfm-text-accent)">$0.00</strong>
            </div>
          </div>
        </section>
      </div>
    </template>
  </AppShellLayout>
</template>
