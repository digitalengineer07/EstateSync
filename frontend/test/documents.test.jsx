import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, test, expect, beforeEach, afterEach } from 'vitest';
import TransactionDocuments from '../src/components/TransactionDocuments';
import DocumentReviewPage from '../src/app/dashboards/documents/page';
import * as api from '../src/services/documentService';
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'ACCOUNTING' } }) }));
vi.mock('../src/services/documentService', async original => ({ ...await original(), documentRequest: vi.fn(), uploadDocument: vi.fn(), documentBlob: vi.fn() }));
const policy = { allowedTypes: ['EXPENSE_RECEIPT', 'INVOICE'], requiredGroups: [['EXPENSE_RECEIPT', 'INVOICE']], maxFiles: 5, exceptionAllowed: true };
const doc = { id: 'doc-1', originalFileName: 'bill.png', documentType: 'EXPENSE_RECEIPT', status: 'REJECTED', rejectionReason: 'Invoice number unreadable', version: 1, fileSize: 99, uploadedAt: new Date().toISOString() };
beforeEach(() => {
  api.documentRequest.mockReset(); api.uploadDocument.mockReset(); api.documentBlob.mockReset();
  api.documentRequest.mockResolvedValue({ success: true, policy });
  URL.createObjectURL = vi.fn(() => 'blob:preview-test'); URL.revokeObjectURL = vi.fn();
});
afterEach(cleanup);
test('shows loading, centralized policy, supported types and empty state', async () => {
  render(<TransactionDocuments sourceType="EXPENSE" />);
  expect(screen.getByRole('status').textContent).toContain('Loading');
  await screen.findByText(/Maximum 10 MB/);
  expect(screen.getByText(/Required: Expense receipt or Invoice/)).toBeTruthy();
});
test('invalid file and oversized file are rejected before transport', async () => {
  render(<TransactionDocuments sourceType="EXPENSE" />); await screen.findByLabelText('Select transaction document');
  fireEvent.change(screen.getByLabelText('Select transaction document'), { target: { files: [new File(['bad'], 'x.exe', { type: 'application/octet-stream' })] } });
  expect(screen.getByRole('alert').textContent).toContain('Select a PDF'); expect(api.uploadDocument).not.toHaveBeenCalled();
  const oversized = new File(['a'], 'a.png', { type: 'image/png' }); Object.defineProperty(oversized, 'size', { value: 11 * 1024 * 1024 });
  fireEvent.change(screen.getByLabelText('Select transaction document'), { target: { files: [oversized] } });
  expect(screen.getByRole('alert').textContent).toContain('maximum allowed');
});
test('stages a file, reports progress and returns intent metadata to the form', async () => {
  const change = vi.fn(), busy = vi.fn(); let resolve;
  api.uploadDocument.mockImplementation((file, options) => { options.onProgress(40); return new Promise(r => { resolve = r; }); });
  render(<TransactionDocuments sourceType="EXPENSE" onChange={change} onBusyChange={busy} />); await screen.findByLabelText('Select transaction document');
  fireEvent.change(screen.getByLabelText('Select transaction document'), { target: { files: [new File(['png'], 'a.png', { type: 'image/png' })] } });
  expect(screen.getByRole('progressbar').value).toBe(40); expect(busy).toHaveBeenCalledWith(true);
  resolve({ id: 'upload1', originalFileName: 'a.png' }); await waitFor(() => expect(change).toHaveBeenCalledWith([{ id: 'upload1', originalFileName: 'a.png' }]));
});
test('failed upload can retry with the same idempotency key', async () => {
  api.uploadDocument.mockRejectedValueOnce(new Error('Connection failed')).mockResolvedValueOnce({ id: 'upload1' });
  const change = vi.fn(); render(<TransactionDocuments sourceType="EXPENSE" onChange={change} />); await screen.findByLabelText('Select transaction document');
  fireEvent.change(screen.getByLabelText('Select transaction document'), { target: { files: [new File(['png'], 'a.png', { type: 'image/png' })] } });
  await userEvent.click(await screen.findByText('Retry upload'));
  await waitFor(() => expect(change).toHaveBeenCalled());
  expect(api.uploadDocument.mock.calls[0][1].key).toBe(api.uploadDocument.mock.calls[1][1].key);
});
test('staged file can be removed before financial submission', async () => {
  const change = vi.fn(); render(<TransactionDocuments sourceType="EXPENSE" uploads={[{ id: 'upload1', originalFileName: 'a.png', fileSize: 30 }]} onChange={change} />);
  await userEvent.click(screen.getByLabelText('Remove a.png'));
  await waitFor(() => expect(change).toHaveBeenCalledWith([]));
  expect(api.documentRequest).toHaveBeenCalledWith('/uploads/upload1/discard', expect.anything());
});
test('staged files can be previewed before financial submission', async () => {
  api.uploadDocument.mockResolvedValue({ id: 'preview-upload', originalFileName: 'a.png', mimeType: 'image/png', fileSize: 3 });
  function Form() { const [uploads, setUploads] = React.useState([]); return <TransactionDocuments sourceType="EXPENSE" uploads={uploads} onChange={setUploads} />; }
  render(<Form />); await screen.findByLabelText('Select transaction document');
  fireEvent.change(screen.getByLabelText('Select transaction document'), { target: { files: [new File(['png'], 'a.png', { type: 'image/png' })] } });
  await userEvent.click(await screen.findByText('Preview staged file'));
  expect(await screen.findByRole('dialog')).toBeTruthy(); expect(api.documentBlob).not.toHaveBeenCalled();
  await userEvent.click(screen.getByText('Close preview')); expect(URL.revokeObjectURL).toHaveBeenCalled();
});
test('rejected evidence and replacement history remain visible', async () => {
  api.documentRequest.mockResolvedValue({ policy, documents: [doc], state: 'DOCUMENT_REJECTED', capabilities: { upload: true, replace: true, review: true } });
  render(<TransactionDocuments sourceType="EXPENSE" sourceId="source1" />);
  expect(await screen.findByText(/Invoice number unreadable/)).toBeTruthy();
  await userEvent.click(screen.getByText('Replace'));
  expect(screen.getByText(/previous version will be retained/)).toBeTruthy();
});
test('unauthorized review controls are absent and required rejection reason disables action', async () => {
  api.documentRequest.mockResolvedValue({ policy, documents: [{ ...doc, status: 'PENDING_REVIEW' }], capabilities: { review: false } });
  const first = render(<TransactionDocuments sourceType="EXPENSE" sourceId="source1" />); await screen.findByText('bill.png'); expect(screen.queryByText('Verify')).toBeNull(); first.unmount();
  api.documentRequest.mockResolvedValue({ policy, documents: [{ ...doc, status: 'PENDING_REVIEW' }], capabilities: { review: true } });
  render(<TransactionDocuments sourceType="EXPENSE" sourceId="source1" />); expect((await screen.findByText('Reject')).disabled).toBe(true);
  await userEvent.type(screen.getByRole('textbox'), 'Wrong invoice'); expect(screen.getByText('Reject').disabled).toBe(false);
});
test('preview fetches authorized blob and revokes it when closed', async () => {
  api.documentRequest.mockResolvedValue({ policy, documents: [doc], capabilities: {} }); api.documentBlob.mockResolvedValue(new Blob(['image'], { type: 'image/webp' }));
  render(<TransactionDocuments sourceType="EXPENSE" sourceId="source1" />); await userEvent.click(await screen.findByText('Preview'));
  expect(await screen.findByRole('dialog')).toBeTruthy(); expect(api.documentBlob).toHaveBeenCalledWith('doc-1', false);
  await userEvent.click(screen.getByText('Close preview')); expect(URL.revokeObjectURL).toHaveBeenCalled();
});
test('review center applies server search and filters and handles empty results', async () => {
  api.documentRequest.mockImplementation(path => Promise.resolve(path === '/summary' ? { pending: 2, verifiedToday: 1, rejected: 0, missing: 3 } : { documents: [], total: 0 }));
  render(<DocumentReviewPage />); await screen.findByText('No matching transactions or documents.');
  await userEvent.type(screen.getByLabelText('Search documents'), 'UTR-123'); await userEvent.click(screen.getByText('Apply filters'));
  await waitFor(() => expect(api.documentRequest).toHaveBeenCalledWith('/review', expect.objectContaining({ params: expect.objectContaining({ search: 'UTR-123', page: 1 }) })));
  await userEvent.click(screen.getByText('Missing documents'));
  await waitFor(() => expect(api.documentRequest).toHaveBeenCalledWith('/transactions', expect.objectContaining({ params: expect.objectContaining({ missing: 'true' }) })));
});
