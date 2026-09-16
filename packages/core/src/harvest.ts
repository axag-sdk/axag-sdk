/**
 * Parameter harvesting — derive action parameters from the form controls,
 * HTML constraints and labels a page already has.
 */

import { readAttributes } from './annotation.js';
import { ATTR } from './vocabulary.js';
import type { ParameterFormat } from './vocabulary.js';
import { ancestors, findById, textContent, walk } from './tree.js';
import type { ElementNode, ElementTree } from './tree.js';
import type { ManifestParameter } from './types.js';

export interface UnnamedControl {
  tagName: string;
  line: number;
  column: number;
}

export interface HarvestResult {
  required: ManifestParameter[];
  optional: ManifestParameter[];
  /** Controls that would be submitted but have no name, so can't become parameters. */
  unnamed: UnnamedControl[];
}

const NON_DATA_INPUTS = new Set(['submit', 'button', 'reset', 'image', 'hidden', 'file']);
const CONTROL_ROLES = new Set(['textbox', 'searchbox', 'combobox', 'switch', 'checkbox', 'slider', 'spinbutton']);
const INPUT_FORMATS: Record<string, ParameterFormat> = {
  email: 'email',
  url: 'url',
  date: 'date',
  'datetime-local': 'datetime',
};

/**
 * Harvest parameters for an annotated element. Returns null when the element
 * has no parameter scope: it isn't a form, a submit control inside a form,
 * or an element with `axag-params-from="#form-id"`.
 */
export function harvestParameters(node: ElementNode, tree: ElementTree): HarvestResult | null {
  const scope = parameterScope(node, tree);
  if (!scope) return null;

  const result: HarvestResult = { required: [], optional: [], unnamed: [] };
  const groups = new Map<string, ElementNode[]>();
  const order: string[] = [];

  for (const control of controlsOf(scope, tree)) {
    const name = parameterName(control);
    if (!name) {
      result.unnamed.push({ tagName: control.tagName, line: control.line, column: control.column });
      continue;
    }
    if (!groups.has(name)) {
      groups.set(name, []);
      order.push(name);
    }
    groups.get(name)!.push(control);
  }

  for (const name of order) {
    const controls = groups.get(name)!;
    const { param, required } = describeGroup(name, controls, tree);
    (required ? result.required : result.optional).push(param);
  }
  return result;
}

/** The element whose controls supply parameters, if any. */
export function parameterScope(node: ElementNode, tree: ElementTree): ElementNode | null {
  const from = attr(node, ATTR.paramsFrom);
  if (from?.startsWith('#')) return findById(tree, from.slice(1)) ?? null;
  if (node.tagName === 'form') return node;

  const type = attr(node, 'type')?.toLowerCase();
  const submits = (node.tagName === 'button' && (type === undefined || type === 'submit')) ||
    (node.tagName === 'input' && (type === 'submit' || type === 'image'));
  if (!submits) return null;

  const formId = attr(node, 'form');
  if (formId) return findById(tree, formId) ?? null;
  for (let current = node.parent; current; current = current.parent) {
    if (current.tagName === 'form') return current;
  }
  return null;
}

/** Data-bearing controls inside the scope, plus controls outside it that point at it with `form="id"`. */
function controlsOf(scope: ElementNode, tree: ElementTree): ElementNode[] {
  const inside = new Set<ElementNode>();
  for (const node of walk(scope)) if (node !== scope && isControl(node)) inside.add(node);

  const id = attr(scope, 'id');
  const all = [...walk(tree)].filter(node => {
    if (inside.has(node)) return attr(node, 'form') === undefined || attr(node, 'form') === id;
    return id !== undefined && isControl(node) && attr(node, 'form') === id;
  });
  return all;
}

function isControl(node: ElementNode): boolean {
  if (isTrue(attr(node, 'disabled'))) return false;
  switch (node.tagName) {
    case 'input':
      return !NON_DATA_INPUTS.has((attr(node, 'type') ?? 'text').toLowerCase());
    case 'select':
    case 'textarea':
      return true;
    default:
      return CONTROL_ROLES.has(attr(node, 'role') ?? '') || attr(node, ATTR.parameter) !== undefined;
  }
}

function parameterName(control: ElementNode): string | undefined {
  const raw = attr(control, ATTR.parameter) || attr(control, 'name') || attr(control, 'id');
  return raw ? toSnakeCase(raw) : undefined;
}

function describeGroup(
  name: string,
  controls: ElementNode[],
  tree: ElementTree,
): { param: ManifestParameter; required: boolean } {
  const first = controls[0];
  const type = (attr(first, 'type') ?? '').toLowerCase();
  const param: ManifestParameter = { name, type: 'string', source: 'harvested:html' };

  if (first.tagName === 'select') {
    const values = optionValues(first);
    if (isTrue(attr(first, 'multiple'))) {
      param.type = 'array';
      if (values.length > 0) param.items = { type: 'string', enum: values };
    } else if (values.length > 0) {
      param.enum = values;
    }
  } else if (type === 'radio') {
    const values = controls.map(c => attr(c, 'value')).filter((v): v is string => v !== undefined);
    if (values.length > 0) param.enum = values;
  } else if (type === 'checkbox' || attr(first, 'role') === 'switch' || attr(first, 'role') === 'checkbox') {
    if (controls.length > 1) {
      const values = controls.map(c => attr(c, 'value')).filter((v): v is string => v !== undefined);
      param.type = 'array';
      param.items = values.length > 0 ? { type: 'string', enum: values } : { type: 'string' };
    } else {
      param.type = 'boolean';
    }
  } else if (type === 'number' || type === 'range' || attr(first, 'role') === 'slider' || attr(first, 'role') === 'spinbutton') {
    const step = attr(first, 'step');
    param.type = step === undefined || (step !== 'any' && Number.isInteger(Number(step))) ? 'integer' : 'number';
    const min = numberAttr(first, 'min') ?? numberAttr(first, 'aria-valuemin');
    const max = numberAttr(first, 'max') ?? numberAttr(first, 'aria-valuemax');
    if (min !== undefined) param.min = min;
    if (max !== undefined) param.max = max;
  } else {
    if (INPUT_FORMATS[type]) param.format = INPUT_FORMATS[type];
    const minLength = numberAttr(first, 'minlength');
    const maxLength = numberAttr(first, 'maxlength');
    const pattern = attr(first, 'pattern');
    if (minLength !== undefined) param.minLength = minLength;
    if (maxLength !== undefined) param.maxLength = maxLength;
    if (pattern) param.pattern = pattern;
  }

  const description = describe(first, controls, tree);
  if (description) param.description = description;

  applyParameterOverrides(param, first);

  const declaredRequired = attr(first, ATTR.parameterRequired);
  const required = declaredRequired !== undefined
    ? declaredRequired === 'true'
    : controls.some(c => isTrue(attr(c, 'required')) || attr(c, 'aria-required') === 'true');
  // Reorder so `source` comes last, matching how declared parameters print.
  const { source, ...rest } = param;
  return { param: { ...rest, source }, required };
}

/** `axag-parameter-*` attributes on a control are author declarations and win over HTML. */
function applyParameterOverrides(param: ManifestParameter, control: ElementNode): void {
  const type = attr(control, ATTR.parameterType);
  if (type) param.type = type as ManifestParameter['type'];
  const description = attr(control, ATTR.parameterDescription);
  if (description) param.description = description;
  const format = attr(control, ATTR.parameterFormat);
  if (format) param.format = format as ParameterFormat;
  const pattern = attr(control, ATTR.parameterPattern);
  if (pattern) param.pattern = pattern;
  for (const [attribute, key] of [
    [ATTR.parameterMin, 'min'],
    [ATTR.parameterMax, 'max'],
    [ATTR.parameterMinLength, 'minLength'],
    [ATTR.parameterMaxLength, 'maxLength'],
  ] as const) {
    const value = numberAttr(control, attribute);
    if (value !== undefined) param[key] = value;
  }
  const enumValues = attr(control, ATTR.parameterEnum);
  if (enumValues) {
    try {
      const parsed: unknown = JSON.parse(enumValues);
      if (Array.isArray(parsed)) param.enum = parsed;
    } catch {
      /* invalid JSON is reported by lint */
    }
  }
}

/**
 * Label text, then aria-describedby. A radio or checkbox group is named by its
 * fieldset legend or `role="radiogroup"`/`"group"` container: the labels on its
 * inputs name the options, not the parameter.
 */
function describe(control: ElementNode, group: ElementNode[], tree: ElementTree): string | undefined {
  const type = (attr(control, 'type') ?? '').toLowerCase();
  const isGroup = type === 'radio' || (type === 'checkbox' && group.length > 1);
  const label = isGroup ? groupLabel(control, tree) : labelFor(control, tree);
  const describedBy = idsText(control, 'aria-describedby', tree);
  const parts = [label, describedBy].filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join('. ') : undefined;
}

function groupLabel(control: ElementNode, tree: ElementTree): string | undefined {
  for (const container of ancestors(control)) {
    const role = attr(container, 'role');
    if (role === 'radiogroup' || role === 'group') return labelFor(container, tree);
    if (container.tagName === 'fieldset') {
      const legend = container.children.find(n => n.tagName === 'legend');
      return legend ? textContent(legend) || undefined : labelFor(container, tree);
    }
  }
  return undefined;
}

/**
 * Intent of the annotation that already covers an unannotated element: a submit
 * button whose form is annotated, or a form that supplies an annotated element's parameters.
 */
export function coveringIntent(node: ElementNode, tree: ElementTree): string | undefined {
  const intentOf = (n: ElementNode) => readAttributes(n.attributes).attributes[ATTR.intent];
  const scope = parameterScope(node, tree);
  if (scope && scope !== node) {
    const intent = intentOf(scope);
    if (intent) return intent;
  }
  if (node.tagName === 'form') {
    for (const other of walk(tree)) {
      if (other === node) continue;
      const intent = intentOf(other);
      if (intent && parameterScope(other, tree) === node) return intent;
    }
  }
  return undefined;
}

export function labelFor(control: ElementNode, tree: ElementTree): string | undefined {
  const labelledBy = idsText(control, 'aria-labelledby', tree);
  if (labelledBy) return labelledBy;
  const ariaLabel = attr(control, 'aria-label')?.trim();
  if (ariaLabel) return ariaLabel;

  const id = attr(control, 'id');
  if (id) {
    for (const node of walk(tree)) {
      if (node.tagName === 'label' && attr(node, 'for') === id) return textContent(node) || undefined;
    }
  }
  const wrapping = [...ancestors(control)].find(n => n.tagName === 'label');
  return wrapping ? textContent(wrapping) || undefined : undefined;
}

/**
 * Accessible name of an actionable element, following the order of the
 * accessible name computation closely enough for lint purposes.
 */
export function accessibleName(node: ElementNode, tree: ElementTree): string | undefined {
  const fromLabel = labelFor(node, tree);
  if (fromLabel) return fromLabel;
  if (node.tagName === 'input') {
    const value = attr(node, 'value')?.trim() || attr(node, 'alt')?.trim();
    if (value) return value;
  }
  const text = textContent(node);
  if (text) return text;
  for (const descendant of walk(node)) {
    if (descendant.tagName === 'img') {
      const alt = attr(descendant, 'alt')?.trim();
      if (alt) return alt;
    }
  }
  return attr(node, 'title')?.trim() || undefined;
}

function idsText(node: ElementNode, attribute: string, tree: ElementTree): string | undefined {
  const ids = attr(node, attribute)?.split(/\s+/).filter(Boolean) ?? [];
  const text = ids.map(id => findById(tree, id)).filter((n): n is ElementNode => Boolean(n)).map(textContent).join(' ').trim();
  return text || undefined;
}

function optionValues(select: ElementNode): string[] {
  const values: string[] = [];
  for (const node of walk(select)) {
    if (node.tagName !== 'option') continue;
    const value = attr(node, 'value') ?? textContent(node);
    if (value !== '' && !values.includes(value)) values.push(value);
  }
  return values;
}

/**
 * Static attribute value, matching names case-insensitively so JSX spellings
 * (`htmlFor`, `maxLength`) read like HTML. Dynamic JSX expressions read as undefined.
 */
function attr(node: ElementNode, name: string): string | undefined {
  const wanted = name === 'for' ? ['for', 'htmlfor'] : [name];
  for (const [key, value] of Object.entries(node.attributes)) {
    if (!wanted.includes(key.toLowerCase())) continue;
    if (node.spans?.[key] && !node.spans[key].static && value === '') return undefined;
    return value;
  }
  return undefined;
}

function numberAttr(node: ElementNode, name: string): number | undefined {
  const raw = attr(node, name);
  if (raw === undefined || raw.trim() === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/** HTML boolean attributes: present means true, except JSX `={false}`. */
function isTrue(value: string | undefined): boolean {
  return value !== undefined && value !== 'false';
}

export function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}
