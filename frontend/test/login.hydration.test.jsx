import React, { act } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';
import LoginPage from '../src/app/login/page';

vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ login: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ children, ...props }) => <a {...props}>{children}</a> }));

test('stored session notice appears after hydration without a mismatch', async () => {
  sessionStorage.clear();
  const html = renderToString(<LoginPage />);
  sessionStorage.setItem('authMessage', 'Your session expired. Please sign in again.');
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  const onRecoverableError = vi.fn();
  let root;
  try {
    await act(async () => { root = hydrateRoot(container, <LoginPage />, { onRecoverableError }); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Your session expired. Please sign in again.');
    expect(sessionStorage.getItem('authMessage')).toBeNull();
  } finally {
    await act(async () => root?.unmount());
    container.remove();
    sessionStorage.clear();
  }
});
