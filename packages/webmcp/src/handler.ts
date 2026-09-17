/**
 * The default way to carry out an action: fill the form the annotation points
 * at, then do what a person would do — press the button, submit the form.
 *
 * An app that wants to call its own code passes a `handler` instead.
 */

import { toSnakeCase } from '@web-axag/core';

export interface DispatchResult {
  dispatched: 'click' | 'submit';
  /** Parameters that were written into form controls. */
  filled: string[];
}

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export function createDefaultHandler(element: Element): (input: Record<string, unknown>) => DispatchResult {
  return input => {
    const form = formFor(element);
    const filled = form ? fillForm(form, input ?? {}) : [];

    if (isSubmitControl(element)) {
      (element as HTMLElement).click();
      return { dispatched: 'click', filled };
    }
    if (form && element === form) {
      submit(form);
      return { dispatched: 'submit', filled };
    }
    (element as HTMLElement).click();
    return { dispatched: 'click', filled };
  };
}

function formFor(element: Element): HTMLFormElement | null {
  if (element instanceof HTMLFormElement) return element;
  const owned = (element as { form?: HTMLFormElement | null }).form;
  return owned ?? element.closest('form');
}

function isSubmitControl(element: Element): boolean {
  const type = element.getAttribute('type')?.toLowerCase();
  if (element.tagName === 'BUTTON') return type === undefined || type === 'submit' || type === null;
  return element.tagName === 'INPUT' && (type === 'submit' || type === 'image');
}

function submit(form: HTMLFormElement): void {
  if (typeof form.requestSubmit === 'function') form.requestSubmit();
  else form.submit();
}

/** Match by the same snake_case name the manifest uses, so agents use manifest names. */
function fillForm(form: HTMLFormElement, input: Record<string, unknown>): string[] {
  const filled: string[] = [];
  const controls = Array.from(form.elements).filter(isControl);

  for (const [key, value] of Object.entries(input)) {
    const matching = controls.filter(control => toSnakeCase(control.name || control.id) === toSnakeCase(key));
    if (matching.length === 0) continue;
    applyValue(matching, value);
    filled.push(key);
  }
  return filled;
}

function isControl(element: Element): element is Control {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  );
}

function applyValue(controls: Control[], value: unknown): void {
  const [first] = controls;

  if (first instanceof HTMLInputElement && first.type === 'radio') {
    const chosen = controls.find(control => (control as HTMLInputElement).value === String(value));
    if (chosen) setChecked(chosen as HTMLInputElement, true);
    return;
  }
  if (first instanceof HTMLInputElement && first.type === 'checkbox') {
    if (controls.length === 1) {
      setChecked(first, Boolean(value));
      return;
    }
    const wanted = new Set((Array.isArray(value) ? value : [value]).map(String));
    for (const control of controls as HTMLInputElement[]) setChecked(control, wanted.has(control.value));
    return;
  }
  if (first instanceof HTMLSelectElement && first.multiple) {
    const wanted = new Set((Array.isArray(value) ? value : [value]).map(String));
    for (const option of Array.from(first.options)) option.selected = wanted.has(option.value);
    dispatch(first);
    return;
  }
  setValue(first, value === null || value === undefined ? '' : String(value));
}

/**
 * Assign through the prototype's setter so frameworks that track the value
 * (React's synthetic events, Vue's v-model) see the change.
 */
function setValue(control: Control, value: string): void {
  const prototype = Object.getPrototypeOf(control) as object;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  if (descriptor?.set) descriptor.set.call(control, value);
  else control.value = value;
  dispatch(control);
}

function setChecked(control: HTMLInputElement, checked: boolean): void {
  const prototype = Object.getPrototypeOf(control) as object;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'checked');
  if (descriptor?.set) descriptor.set.call(control, checked);
  else control.checked = checked;
  dispatch(control);
}

function dispatch(control: Control): void {
  control.dispatchEvent(new Event('input', { bubbles: true }));
  control.dispatchEvent(new Event('change', { bubbles: true }));
}
