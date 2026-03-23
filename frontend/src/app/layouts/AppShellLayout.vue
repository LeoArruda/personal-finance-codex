<script setup lang="ts">
defineSlots<{
  sidebar(): unknown;
  main(): unknown;
  inspector(): unknown;
}>();
</script>

<template>
  <div class="app-shell-layout">
    <aside class="app-shell-layout__sidebar">
      <slot name="sidebar" />
    </aside>

    <main class="app-shell-layout__main">
      <slot name="main" />
    </main>

    <aside class="app-shell-layout__inspector">
      <slot name="inspector" />
    </aside>
  </div>
</template>
