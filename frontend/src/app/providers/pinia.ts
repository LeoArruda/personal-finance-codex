import { createPinia } from "pinia";
import type { App } from "vue";

export function installPinia(app: App): void {
  app.use(createPinia());
}
