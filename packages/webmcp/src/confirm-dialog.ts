/**
 * The confirmation a person sees before a high-risk action runs.
 *
 * It renders in a closed shadow root so the page — and anything running in it,
 * including the agent — can't reach into the dialog, restyle it, or click its
 * buttons. Apps that want their own dialog pass `render` instead.
 */

import type { WebMcpTool } from '@web-axag/core';

export interface ConfirmationRequest {
  tool: WebMcpTool;
  input: Record<string, unknown>;
  /** The element the action drives, when there is one. */
  element?: Element;
}

const STYLE = `
  :host { all: initial; }
  .backdrop {
    position: fixed; inset: 0; display: grid; place-items: center;
    background: rgb(15 12 22 / 55%); z-index: 2147483647;
    font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .panel {
    background: Canvas; color: CanvasText; max-width: 30rem; width: calc(100vw - 2rem);
    border-radius: 12px; padding: 20px 22px; display: grid; gap: 14px;
    box-shadow: 0 16px 48px rgb(0 0 0 / 35%);
  }
  h2 { margin: 0; font-size: 17px; }
  p { margin: 0; }
  .risk { font: 600 11px/1 ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; color: #b91c1c; }
  dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 13px; }
  dt { font: 500 12px/1.5 ui-monospace, monospace; color: GrayText; }
  dd { margin: 0; overflow-wrap: anywhere; }
  .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px; }
  button { font: inherit; padding: 7px 14px; border-radius: 8px; border: 1px solid ButtonBorder; cursor: pointer; }
  button.go { background: #b91c1c; border-color: #b91c1c; color: white; }
  button:focus-visible { outline: 2px solid Highlight; outline-offset: 2px; }
`;

/** Show the dialog and resolve with the person's answer. */
export function confirmInShadowRoot(request: ConfirmationRequest): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false);

  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'closed' });
  document.body.append(host);

  return new Promise<boolean>(resolve => {
    const finish = (answer: boolean): void => {
      document.removeEventListener('keydown', onKeydown, true);
      host.remove();
      previous?.focus?.();
      resolve(answer);
    };
    const onKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      }
    };
    const previous = document.activeElement as HTMLElement | null;

    const style = document.createElement('style');
    style.textContent = STYLE;

    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';

    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.setAttribute('role', 'alertdialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'axag-confirm-title');

    const risk = String(request.tool.annotations?.axag?.risk_level ?? 'unknown');
    const riskLine = document.createElement('div');
    riskLine.className = 'risk';
    riskLine.textContent = `${risk} risk`;

    const title = document.createElement('h2');
    title.id = 'axag-confirm-title';
    title.textContent = 'Confirm this action';

    const description = document.createElement('p');
    description.textContent = request.tool.description || request.tool.name;

    const parameters = document.createElement('dl');
    for (const [name, value] of Object.entries(request.input ?? {})) {
      const term = document.createElement('dt');
      term.textContent = name;
      const detail = document.createElement('dd');
      // Text only: an agent-supplied value never becomes markup.
      detail.textContent = typeof value === 'string' ? value : JSON.stringify(value);
      parameters.append(term, detail);
    }

    const actions = document.createElement('div');
    actions.className = 'actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => finish(false));
    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'go';
    go.textContent = 'Confirm';
    go.addEventListener('click', () => finish(true));
    actions.append(cancel, go);

    panel.append(riskLine, title, description);
    if (parameters.childElementCount > 0) panel.append(parameters);
    panel.append(actions);
    backdrop.append(panel);
    root.append(style, backdrop);

    document.addEventListener('keydown', onKeydown, true);
    cancel.focus();
  });
}
