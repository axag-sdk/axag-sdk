/**
 * Whether an element is operable by a person right now.
 *
 * An agent should not be offered a tool whose control is disabled, hidden or
 * gone from the page: the tool would promise something the UI is refusing.
 */

const HIDDEN_ROLE_ATTRIBUTES = ['hidden', 'inert'];

export function isOperable(element: Element): boolean {
  if (!element.isConnected) return false;

  for (let node: Element | null = element; node; node = node.parentElement) {
    for (const attribute of HIDDEN_ROLE_ATTRIBUTES) {
      if (node.hasAttribute(attribute)) return false;
    }
    if (node.getAttribute('aria-hidden') === 'true') return false;
    if (node.getAttribute('aria-disabled') === 'true') return false;
    // `disabled` on a fieldset disables the controls inside it.
    if ('disabled' in node && (node as { disabled?: boolean }).disabled === true) return false;
  }
  return true;
}

type Listener = () => void;

/**
 * One MutationObserver for the whole page. Registrations subscribe to it, and
 * only the elements they name are re-checked when something changes.
 */
class OperabilityWatcher {
  private readonly listeners = new Set<Listener>();
  private observer: MutationObserver | undefined;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    this.start();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.stop();
    };
  }

  private start(): void {
    if (this.observer || typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
    this.observer = new MutationObserver(() => {
      for (const listener of [...this.listeners]) listener();
    });
    this.observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['disabled', 'hidden', 'inert', 'aria-hidden', 'aria-disabled'],
    });
  }

  private stop(): void {
    this.observer?.disconnect();
    this.observer = undefined;
  }
}

export const operabilityWatcher = new OperabilityWatcher();
