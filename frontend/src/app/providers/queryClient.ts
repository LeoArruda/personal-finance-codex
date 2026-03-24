import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import type { App } from "vue";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false
      },
      mutations: {
        retry: false
      }
    }
  });
}

export function installQueryClient(app: App): void {
  app.use(VueQueryPlugin, {
    queryClient: createQueryClient()
  });
}
