<script setup lang="ts">
export interface SidebarNavItem {
  id: string;
  label: string;
  icon: string;
  active?: boolean;
}

defineProps<{
  items: SidebarNavItem[];
}>();
</script>

<template>
  <nav class="grid gap-2">
    <a
      v-for="item in items"
      :key="item.id"
      href="/"
      class="budget-sidebar-nav-button"
      :class="{ 'budget-sidebar-nav-button--active': item.active }"
    >
      <span class="text-[1.35rem] leading-none">{{ item.icon }}</span>
      <span
        class="text-[1.45rem]"
        :class="item.active ? 'font-semibold' : 'font-medium'"
      >
        {{ item.label }}
      </span>
    </a>
  </nav>
</template>
