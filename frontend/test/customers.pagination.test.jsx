import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { vi, test, expect, beforeEach, afterEach } from 'vitest';
import CustomerPortfolioList from '../src/components/CustomerPortfolioList';
import { fetchWithTimeout } from '../src/utils/http';
vi.mock('../src/utils/http', () => ({ fetchWithTimeout: vi.fn() }));
vi.mock('../src/components/CustomerRegistrationModal', () => ({ default: () => null }));
vi.mock('../src/components/CustomerEditModal', () => ({ default: () => null }));
vi.mock('../src/components/RecordCustomerPaymentModal', () => ({ default: () => null }));
vi.mock('../src/components/CustomerCancellationSettlementModal', () => ({ default: () => null }));
vi.mock('../src/components/CustomerStatementModal', () => ({ default: ({ customer }) => customer ? <div role="dialog">{customer.customerName}: {customer.payments.length} payments</div> : null }));
const customer = (id) => ({ id, customerName: `Customer ${id}`, customerContact: '123', projectLocation: 'Plot', plotNo: id, status: 'ACTIVE', totalPaid: 0, totalContractValue: 100, balanceDue: 100, _count: { payments: 3 } });
const response = data => ({ ok: true, json: async () => ({ success: true, ...data }) });
beforeEach(() => {
  sessionStorage.clear(); fetchWithTimeout.mockReset();
  fetchWithTimeout.mockImplementation(async url => {
    const u = new URL(url, 'http://localhost');
    if (/\/customers\/[^/]+$/.test(u.pathname)) return response({ customer: { ...customer('b'), payments: [1, 2, 3] } });
    const page = Number(u.searchParams.get('page'));
    return response({ customers: [customer(page === 1 ? 'a' : 'b')], summary: { totalCustomers: 26 }, pagination: { page, total: 26, totalPages: 2, hasNextPage: page === 1 } });
  });
});
afterEach(cleanup);
test('requests bounded pages and loads full statements only on demand', async () => {
  render(<CustomerPortfolioList userRole="ADMIN" />);
  await screen.findByText('Customer a');
  expect(fetchWithTimeout.mock.calls[0][0]).toContain('limit=25');
  fireEvent.click(screen.getByText('Next'));
  await screen.findByText('Customer b');
  expect(screen.queryByText('Customer a')).toBeNull();
  expect(fetchWithTimeout.mock.calls[1][0]).toContain('page=2');
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(screen.getByText('Statement (3)'));
  expect((await screen.findByRole('dialog')).textContent).toContain('3 payments');
  expect(fetchWithTimeout.mock.calls.at(-1)[0]).toMatch(/customers\/b$/);
});
test('search and status are sent to server and reset the page', async () => {
  render(<CustomerPortfolioList userRole="ADMIN" />);
  await screen.findByText('Customer a');
  fireEvent.click(screen.getByText('Next')); await screen.findByText('Customer b');
  fireEvent.change(screen.getByPlaceholderText('Search by customer, plot, location, or khata...'), { target: { value: 'far away' } });
  await waitFor(() => expect(fetchWithTimeout.mock.calls.at(-1)[0]).toContain('search=far+away'));
  expect(fetchWithTimeout.mock.calls.at(-1)[0]).toContain('page=1');
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'CANCELLED' } });
  await waitFor(() => expect(fetchWithTimeout.mock.calls.at(-1)[0]).toContain('status=CANCELLED'));
});
test('failed detail fetch shows an error without opening an incomplete statement', async () => {
  render(<CustomerPortfolioList userRole="ADMIN" />); await screen.findByText('Customer a');
  fetchWithTimeout.mockRejectedValueOnce(Error('Network unavailable'));
  fireEvent.click(screen.getByText('Statement (3)'));
  expect((await screen.findByRole('alert')).textContent).toContain('Network unavailable');
  expect(screen.queryByRole('dialog')).toBeNull();
});
test('a late response cannot replace results for a newer filter', async () => {
  let finishOld;
  fetchWithTimeout.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
  render(<CustomerPortfolioList userRole="ADMIN" />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'CANCELLED' } });
  await screen.findByText('Customer a');
  await act(async () => finishOld(response({ customers: [customer('stale')], pagination: { page: 1, total: 1, totalPages: 1 } })));
  expect(screen.queryByText('Customer stale')).toBeNull();
  expect(screen.getByText('Customer a')).toBeTruthy();
});
