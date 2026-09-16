// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { createDefaultHandler } from '../src/handler.js';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('default handler', () => {
  it('fills the form with manifest parameter names and submits it', () => {
    document.body.innerHTML = `
      <form id="signup">
        <input name="email" type="email">
        <input name="displayName">
        <select name="plan"><option value="team">Team</option><option value="pro">Pro</option></select>
        <input type="checkbox" name="terms">
        <input type="radio" name="cycle" value="monthly"><input type="radio" name="cycle" value="yearly">
        <button type="submit">Create</button>
      </form>`;
    const form = document.getElementById('signup') as HTMLFormElement;
    let submitted = false;
    form.addEventListener('submit', event => {
      event.preventDefault();
      submitted = true;
    });

    const result = createDefaultHandler(form)({
      email: 'a@example.com',
      // The manifest calls this display_name; the control is displayName.
      display_name: 'Ada',
      plan: 'pro',
      terms: true,
      cycle: 'yearly',
      unknown_param: 'ignored',
    });

    expect(submitted).toBe(true);
    expect(result.dispatched).toBe('submit');
    expect(result.filled.sort()).toEqual(['cycle', 'display_name', 'email', 'plan', 'terms']);
    expect((form.elements.namedItem('email') as HTMLInputElement).value).toBe('a@example.com');
    expect((form.elements.namedItem('displayName') as HTMLInputElement).value).toBe('Ada');
    expect((form.elements.namedItem('plan') as HTMLSelectElement).value).toBe('pro');
    expect((form.elements.namedItem('terms') as HTMLInputElement).checked).toBe(true);
    expect(Array.from(form.querySelectorAll<HTMLInputElement>('[name=cycle]')).map(i => i.checked)).toEqual([false, true]);
  });

  it('notifies frameworks by assigning through the prototype setter', () => {
    document.body.innerHTML = '<form><input name="q"></form>';
    const input = document.querySelector('input')!;
    const events: string[] = [];
    input.addEventListener('input', () => events.push('input'));
    input.addEventListener('change', () => events.push('change'));

    createDefaultHandler(document.querySelector('form')!)({ q: 'socks' });
    expect(events).toEqual(['input', 'change']);
  });

  it('clicks a submit button so the page sees the button, not just the form', () => {
    document.body.innerHTML = '<form><input name="q"><button id="go" type="submit">Go</button></form>';
    const button = document.getElementById('go')!;
    let clicked = false;
    button.addEventListener('click', event => {
      event.preventDefault();
      clicked = true;
    });

    const result = createDefaultHandler(button)({ q: 'hat' });
    expect(clicked).toBe(true);
    expect(result).toEqual({ dispatched: 'click', filled: ['q'] });
    expect(document.querySelector('input')!.value).toBe('hat');
  });

  it('clicks a standalone control', () => {
    document.body.innerHTML = '<button id="go">Clear</button>';
    const button = document.getElementById('go')!;
    let clicked = false;
    button.addEventListener('click', () => (clicked = true));

    expect(createDefaultHandler(button)({})).toEqual({ dispatched: 'click', filled: [] });
    expect(clicked).toBe(true);
  });

  it('selects several options in a multi-select', () => {
    document.body.innerHTML = `<form><select name="regions" multiple><option>eu</option><option>us</option><option>apac</option></select></form>`;
    createDefaultHandler(document.querySelector('form')!)({ regions: ['eu', 'apac'] });
    const select = document.querySelector('select') as HTMLSelectElement;
    expect(Array.from(select.selectedOptions).map(o => o.value)).toEqual(['eu', 'apac']);
  });
});
