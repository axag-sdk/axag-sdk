// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StrictMode, useState } from 'react';
import { render, screen, act } from '@testing-library/react';
import { defineAction } from '@web-axag/core';
import { useAxag, AxagAction } from '../src/index.js';
import type { ModelContext, WebMcpToolDefinition } from '@web-axag/webmcp';

const registered = new Map<string, WebMcpToolDefinition>();
const modelContext: ModelContext = {
  registerTool(tool, options) {
    registered.set(tool.name, tool);
    options?.signal?.addEventListener('abort', () => registered.delete(tool.name), { once: true });
    return Promise.resolve();
  },
};

// The hook reads the page's model context; give it one.
beforeEach(() => {
  registered.clear();
  (document as unknown as { modelContext: ModelContext }).modelContext = modelContext;
});

const deactivate = defineAction({
  intent: 'user.deactivate',
  actionType: 'write',
  riskLevel: 'critical',
  requiredParameters: [{ name: 'user_id', type: 'string' }],
});

function Deactivate({ onRun }: { onRun?: () => void }) {
  const props = useAxag(deactivate, { handler: onRun });
  return <button {...props}>Deactivate</button>;
}

describe('useAxag', () => {
  it('registers while mounted and puts the annotation in the DOM', async () => {
    const { unmount } = render(<Deactivate />);
    await act(async () => undefined);

    expect([...registered.keys()]).toEqual(['user_deactivate']);
    const button = screen.getByRole('button');
    expect(button.getAttribute('axag-intent')).toBe('user.deactivate');
    expect(button.getAttribute('axag-risk-level')).toBe('critical');

    unmount();
    expect([...registered.keys()]).toEqual([]);
  });

  it('survives StrictMode double mounting', async () => {
    render(
      <StrictMode>
        <Deactivate />
      </StrictMode>,
    );
    await act(async () => undefined);
    expect([...registered.keys()]).toEqual(['user_deactivate']);
  });

  it('runs the component handler when an agent calls the tool', async () => {
    const onRun = vi.fn();
    render(<Deactivate onRun={onRun} />);
    await act(async () => undefined);

    await registered.get('user_deactivate')!.execute({ user_id: 'u1' });
    expect(onRun).toHaveBeenCalledWith({ user_id: 'u1' });
  });

  it('unregisters when the element is conditionally rendered away', async () => {
    function Toggle() {
      const [shown, setShown] = useState(true);
      return (
        <>
          <button onClick={() => setShown(false)}>hide</button>
          {shown ? <Deactivate /> : null}
        </>
      );
    }
    render(<Toggle />);
    await act(async () => undefined);
    expect(registered.has('user_deactivate')).toBe(true);

    await act(async () => {
      screen.getByText('hide').click();
    });
    expect(registered.has('user_deactivate')).toBe(false);
  });

  it('does not register when disabled by role or state', async () => {
    function Guarded() {
      const props = useAxag(deactivate, { enabled: false });
      return <button {...props}>Deactivate</button>;
    }
    render(<Guarded />);
    await act(async () => undefined);
    expect([...registered.keys()]).toEqual([]);
  });

  it('re-registers when the spec itself changes', async () => {
    function Switcher() {
      const [risk, setRisk] = useState<'low' | 'critical'>('low');
      const props = useAxag({ ...deactivate, riskLevel: risk });
      return (
        <>
          <button onClick={() => setRisk('critical')}>escalate</button>
          <button {...props}>Deactivate</button>
        </>
      );
    }
    render(<Switcher />);
    await act(async () => undefined);
    expect((registered.get('user_deactivate')!.annotations as { axag: { risk_level: string } }).axag.risk_level).toBe('low');

    await act(async () => {
      screen.getByText('escalate').click();
    });
    expect((registered.get('user_deactivate')!.annotations as { axag: { risk_level: string } }).axag.risk_level).toBe('critical');
  });

  it('leaks nothing across many mounts', async () => {
    for (let i = 0; i < 50; i++) {
      const { unmount } = render(<Deactivate />);
      await act(async () => undefined);
      unmount();
    }
    expect(registered.size).toBe(0);
  });
});

describe('AxagAction', () => {
  it('annotates a wrapped component without affecting layout', async () => {
    render(
      <AxagAction spec={deactivate} data-testid="wrapper">
        <button>Third-party button</button>
      </AxagAction>,
    );
    await act(async () => undefined);

    expect([...registered.keys()]).toEqual(['user_deactivate']);
    const wrapper = screen.getByTestId('wrapper');
    expect(wrapper.tagName).toBe('SPAN');
    expect(wrapper.style.display).toBe('contents');
    expect(wrapper.getAttribute('axag-intent')).toBe('user.deactivate');
  });
});
