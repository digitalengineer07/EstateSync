// Responsive browser smoke test against a local production build.
// Every API request is intercepted; no real accounts or production data are used.
const { chromium } = require(process.env.DOCUMENT_TEST_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.DOCUMENT_TEST_FRONTEND_URL || 'http://127.0.0.1:3109';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Browser tests require a local frontend.');
const sourceId = '8e41d2b3-5848-4270-933c-8866a731d440';
const record = { id: 'fixture-document', sourceType: 'EXPENSE', sourceId, originalFileName: 'office-electricity.pdf', documentType: 'EXPENSE_RECEIPT', status: 'PENDING_REVIEW', amount: '2350', party: 'Office operations', reference: 'INV-OFFICE-001', paymentMode: 'CASH', version: 1, fileSize: 85000, uploadedAt: '2026-10-01T04:00:00Z', uploader: { name: 'Expense submitter' } };
async function main() {
  const browser = await chromium.launch({ headless: true, channel: process.env.DOCUMENT_TEST_BROWSER_CHANNEL || 'chrome' });
  try {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      sessionStorage.setItem('accessToken', 'isolated-ui-fixture');
      sessionStorage.setItem('user', JSON.stringify({ id: 'fixture-user', name: 'Document Reviewer', email: 'reviewer@example.invalid', role: 'ACCOUNTING', permissions: ['document.view', 'document.review', 'document.upload', 'document.download', 'accounting.view'] }));
    });
    const calls = [];
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/')) {
        calls.push(url);
        let result = { success: true, notifications: [], data: [] };
        if (url.pathname.endsWith('/documents/summary')) result = { success: true, pending: 1, rejected: 0, verifiedToday: 3, missing: 2 };
        else if (url.pathname.endsWith('/documents/review')) result = { success: true, documents: url.searchParams.get('search') === 'absent' ? [] : [record], total: url.searchParams.get('search') === 'absent' ? 0 : 1 };
        else if (url.pathname.endsWith('/documents')) result = { success: true, policy: { allowedTypes: ['EXPENSE_RECEIPT', 'INVOICE'], requiredGroups: [['EXPENSE_RECEIPT', 'INVOICE']], maxFiles: 5 }, source: { ...record, identifier: 'EXP-8E41D2B3', date: record.uploadedAt, createdAt: record.uploadedAt, createdBy: 'fixture-user' }, documents: [record], state: 'DOCUMENT_PENDING', capabilities: { upload: true, review: true, replace: true, download: true } };
        return route.fulfill({ json: result, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
      }
      if (url.origin !== new URL(base).origin) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const artifacts = path.resolve(__dirname, '../../scratch/document-ui-review');
    await fs.mkdir(artifacts, { recursive: true });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 920 });
      await page.goto(`${base}/dashboards/documents`);
      await page.getByText('office-electricity.pdf', { exact: true }).waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Page overflow at ${width}px`);
      await page.screenshot({ path: path.join(artifacts, `review-${width}.png`), fullPage: true });
      await page.getByRole('button', { name: 'Documents', exact: true }).click();
      await page.getByRole('dialog', { name: 'Transaction evidence' }).waitFor();
      await page.getByRole('button', { name: 'Verify', exact: true }).waitFor();
      assert.ok(await page.getByRole('button', { name: 'Reject', exact: true }).isDisabled());
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Dialog overflow at ${width}px`);
      await page.screenshot({ path: path.join(artifacts, `evidence-${width}.png`), fullPage: true });
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await page.getByLabel('Search documents').fill('absent');
      await page.getByRole('button', { name: 'Apply filters' }).click();
      await page.getByText('No matching transactions or documents.').waitFor();
      assert.ok(calls.some(url => url.searchParams.get('search') === 'absent'));
      console.log(`PASS document review, evidence modal, search, and no horizontal overflow at ${width}px`);
    }
    assert.deepEqual(errors, [], 'Browser runtime errors');
    console.log(`Screenshots: ${artifacts}`);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
