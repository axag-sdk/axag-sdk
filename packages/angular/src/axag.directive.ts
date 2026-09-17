import { Directive, ElementRef, Inject, Input, OnChanges, OnDestroy, Optional, PLATFORM_ID } from '@angular/core';
import { specToAttributes } from '@web-axag/core';
import type { ActionSpec } from '@web-axag/core';
import { registerAction } from '@web-axag/webmcp';
import type { Middleware, ToolHandler } from '@web-axag/webmcp';

/**
 * `[axag]` — registers an agent action while the element is in the view.
 *
 * ```html
 * <button [axag]="deactivateUser" [axagHandler]="deactivate">Deactivate</button>
 * ```
 *
 * The action is unregistered when the directive is destroyed, so tools follow
 * routing, `@if` and permission changes without any extra bookkeeping.
 */
@Directive({
  selector: '[axag]',
  standalone: true,
})
export class AxagDirective implements OnChanges, OnDestroy {
  /** The action to register, as `defineAction({...})` produces. */
  @Input({ required: true }) axag!: ActionSpec;
  /** What the tool does; defaults to filling the form and pressing the control. */
  @Input() axagHandler?: ToolHandler;
  @Input() axagMiddleware?: Middleware[];
  /** Set false to keep the action off the agent's list, e.g. by role. */
  @Input() axagEnabled = true;

  private controller?: AbortController;

  constructor(
    private readonly elementRef: ElementRef<Element>,
    // Angular types PLATFORM_ID as Object, but its value is a string like 'browser'.
    @Optional() @Inject(PLATFORM_ID) private readonly platformId: unknown = null,
  ) {}

  ngOnChanges(): void {
    this.stop();
    // Server-side rendering has no model context and no DOM to drive.
    if (!this.axagEnabled || !this.isBrowser()) return;

    const element = this.elementRef.nativeElement;
    for (const [name, value] of Object.entries(specToAttributes(this.axag))) {
      element.setAttribute(name, value);
    }

    this.controller = new AbortController();
    registerAction(this.axag, {
      element,
      handler: this.axagHandler,
      middleware: this.axagMiddleware,
      signal: this.controller.signal,
    });
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private stop(): void {
    this.controller?.abort();
    this.controller = undefined;
  }

  private isBrowser(): boolean {
    if (typeof this.platformId === 'string') return this.platformId === 'browser';
    return typeof document !== 'undefined';
  }
}
