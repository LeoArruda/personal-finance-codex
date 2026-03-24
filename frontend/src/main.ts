import { createApp } from "vue";
import App from "./App.vue";
import { installPinia } from "./app/providers/pinia";
import { installQueryClient } from "./app/providers/queryClient";
import "./app/styles/main.css";

const app = createApp(App);

installPinia(app);
installQueryClient(app);

app.mount("#app");
