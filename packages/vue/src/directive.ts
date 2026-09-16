import { specToAttributes } from '@axag/core';
import type { ActionSpec } from '@axag/core';
import { registerAction } from '@axag/webmcp';
import type { ToolHandler } from '@axag/webmcp';
import type { App, Directive, DirectiveBinding } from 'vue';

type Value = ActionSpec | { spec: ActionSpec; handler?: ToolHandler };

const controllers = new WeakMap<Element, AbortController>();

function start(element: Element, binding: DirectiveBinding<Value>): void {
  stop(element);
  const value = binding.value;
  const spec = 'spec' in value ? value.spec : value;
  const handler = 'spec' in value ? value.handler : value.handler;

  for (const [name, attribute] of Object.entries(specToAttributes(spec))) {
    element.setAttribute(name, attribute);
  }

  const controller = new AbortController();
  controllers.set(element, controller);
  registerAction(spec, { element, handler, signal: controller.signal });
}

function stop(element: Element): void {
  controllers.get(element)?.abort();
  controllers.delete(element);
}

/**
 * `v-axag="deactivateUser"` — registers while the element is mounted.
 * Pass `{ spec, handler }` to run your own code instead of driving the control.
 */
export const vAxag: Directive<Element, Value> = {
  mounted: start,
  updated(element, binding) {
    if (JSON.stringify(binding.value) !== JSON.stringify(binding.oldValue)) start(element, binding);
  },
  unmounted: stop,
};

/** `app.use(AxagPlugin)` registers `v-axag` globally. */
export const AxagPlugin = {
  install(app: App): void {
    app.directive('axag', vAxag);
  },
};
