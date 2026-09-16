import { onScopeDispose, ref, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import { specToAttributes } from '@axag/core';
import type { ActionSpec } from '@axag/core';
import { registerAction } from '@axag/webmcp';
import type { Middleware, ToolHandler } from '@axag/webmcp';

export interface UseAxagOptions {
  handler?: ToolHandler;
  middleware?: Middleware[];
  /** Skip registration, e.g. while the user lacks the role for this action. */
  enabled?: MaybeRefOrGetter<boolean>;
  onError?: (error: unknown) => void;
}

export interface UseAxagResult {
  /** Bind to the element with `ref="el"`. */
  el: Ref<Element | null>;
  /** Bind with `v-bind="attrs"` so the annotation is in the DOM as well. */
  attrs: Ref<Record<string, string>>;
}

/**
 * ```vue
 * <script setup>
 * const { el, attrs } = useAxag(deactivateUser, { handler: deactivate });
 * </script>
 * <template><button ref="el" v-bind="attrs">Deactivate</button></template>
 * ```
 */
export function useAxag(spec: MaybeRefOrGetter<ActionSpec>, options: UseAxagOptions = {}): UseAxagResult {
  const el = ref<Element | null>(null);
  const attrs = ref<Record<string, string>>(specToAttributes(toValue(spec)));
  let controller: AbortController | undefined;

  const stop = (): void => {
    controller?.abort();
    controller = undefined;
  };

  watch(
    [el, () => JSON.stringify(specToAttributes(toValue(spec))), () => toValue(options.enabled) ?? true],
    ([element, , enabled]) => {
      stop();
      attrs.value = specToAttributes(toValue(spec));
      if (!element || !enabled) return;

      controller = new AbortController();
      registerAction(toValue(spec), {
        element: element as Element,
        handler: options.handler,
        middleware: options.middleware,
        onError: options.onError,
        signal: controller.signal,
      });
    },
    { immediate: true, flush: 'post' },
  );

  onScopeDispose(stop);
  return { el, attrs };
}
