import { defineComponent, h, type App } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";

export type RenderComposableResult<T> = {
  result: T;
  wrapper: VueWrapper;
};

export function renderComposable<T>(
  useComposable: () => T,
  configureApp?: (app: App) => void
): RenderComposableResult<T> {
  let result: T | undefined;

  const TestComponent = defineComponent({
    setup() {
      result = useComposable();
      return () => h("div");
    }
  });

  const wrapper = mount(TestComponent, {
    global: {
      plugins: [
        {
          install(app) {
            configureApp?.(app);
          }
        }
      ]
    }
  });

  if (result === undefined) {
    throw new Error("Composable result was not captured.");
  }

  return {
    result,
    wrapper
  };
}
