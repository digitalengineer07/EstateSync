import React from 'react';
import { render, cleanup, waitFor, act } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { apiRequest } from '../src/services/apiClient';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('../src/config/api.js', () => ({ API_URL: 'https://api.example.test' }));

const tabStorage = () => {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear(),
  };
};

let activeAuth;
function Probe() { activeAuth = useAuth(); return null; }
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test('two tabs retain different accounts and send their own access tokens', async () => {
  const firstTab = tabStorage();
  const secondTab = tabStorage();
  vi.stubGlobal('localStorage', tabStorage());
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    if (url.endsWith('/auth/login')) {
      const email = JSON.parse(options.body).email;
      return { ok: true, json: async () => ({ success: true, accessToken: `token-${email}`, refreshToken: `refresh-${email}`, user: { email, role: 'SALES' } }) };
    }
    return { ok: true, json: async () => ({ success: true, auth: options.headers.Authorization }) };
  }));

  vi.stubGlobal('sessionStorage', firstTab);
  const first = render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(activeAuth.loading).toBe(false));
  await act(async () => { await activeAuth.login('first@example.test', 'password'); });
  first.unmount();

  vi.stubGlobal('sessionStorage', secondTab);
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(activeAuth.loading).toBe(false));
  await act(async () => { await activeAuth.login('second@example.test', 'password'); });

  expect(localStorage.getItem('accessToken')).toBeNull();
  expect(firstTab.getItem('accessToken')).toBe('token-first@example.test');
  expect(secondTab.getItem('accessToken')).toBe('token-second@example.test');
  vi.stubGlobal('sessionStorage', firstTab);
  expect((await apiRequest('/records')).auth).toBe('Bearer token-first@example.test');
  vi.stubGlobal('sessionStorage', secondTab);
  expect((await apiRequest('/records')).auth).toBe('Bearer token-second@example.test');
});

test('frontend does not read or write auth state from shared localStorage', () => {
  const source = path.resolve(import.meta.dirname, '../src');
  const visit = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const item = path.join(directory, entry.name);
    return entry.isDirectory() ? visit(item) : /\.[jt]sx?$/.test(entry.name) ? [item] : [];
  });
  for (const file of visit(source)) {
    const code = fs.readFileSync(file, 'utf8');
    expect(code, file).not.toMatch(/localStorage\.(?:getItem|setItem|removeItem)\(\s*['"](?:accessToken|refreshToken|user)['"]/);
  }
});
