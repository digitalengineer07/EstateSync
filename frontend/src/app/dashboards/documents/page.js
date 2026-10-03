"use client";
import { useCallback, useEffect, useState } from 'react';
import { FileCheck2, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { documentRequest } from '@/services/documentService';
import TransactionDocumentButton from '@/components/TransactionDocumentButton';
import { DocumentBadge } from '@/components/TransactionDocuments';

const sourceTypes = ['EXPENSE', 'CUSTOMER_PAYMENT', 'BANK_INFLOW', 'LAND_PAYOUT', 'REFUND', 'WALLET_ALLOCATION', 'OTHER_FINANCIAL_TRANSACTION', 'PROPERTY'];
const documentTypes = ['EXPENSE_RECEIPT', 'INVOICE', 'CUSTOMER_PAYMENT_PROOF', 'PAYMENT_PROOF', 'BANK_ADVICE', 'UTR_PROOF', 'CHEQUE_FRONT', 'CHEQUE_BACK', 'REFUND_PROOF', 'AGREEMENT', 'SUPPORTING_DOCUMENT', 'OTHER'];
const field = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800';
export default function DocumentReviewPage() {
  const { user } = useAuth();
  const role = typeof user?.role === 'object' ? user.role.name : user?.role;
  const [filters, setFilters] = useState({ status: 'PENDING_REVIEW' });
  const [applied, setApplied] = useState({ status: 'PENDING_REVIEW' });
  const [mode, setMode] = useState('review');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ documents: [], total: 0 });
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!['ADMIN', 'ACCOUNTING'].includes(role)) { setBusy(false); return; }
    setBusy(true);
    try {
      const [rows, stats] = await Promise.all([documentRequest(mode === 'review' ? '/review' : '/transactions', { params: { ...applied, page, pageSize: 20, missing: mode === 'missing' ? 'true' : undefined } }), documentRequest('/summary')]);
      setResult(rows); setSummary(stats); setError('');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }, [applied, mode, page, role]);
  useEffect(() => {
    if (!['ADMIN', 'ACCOUNTING'].includes(role)) return;
    let active = true;
    Promise.all([documentRequest(mode === 'review' ? '/review' : '/transactions', { params: { ...applied, page, pageSize: 20, missing: mode === 'missing' ? 'true' : undefined } }), documentRequest('/summary')])
      .then(([rows, stats]) => { if (active) { setResult(rows); setSummary(stats); setError(''); } })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [applied, mode, page, role]);
  const set = (key, value) => setFilters(f => ({ ...f, [key]: value }));
  if (user && !['ADMIN', 'ACCOUNTING'].includes(role)) return <p className="m-6 rounded-xl border border-slate-200 bg-white p-6">Document review is available to authorized Accounting and Admin users.</p>;
  const rows = result.documents || result.transactions || [];
  return <main className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-7">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><FileCheck2 className="text-orange-600" /> Document review</h1><p className="mt-1 text-sm text-slate-500">Review transaction evidence, resolve missing receipts, and retain a complete history.</p></div><button type="button" onClick={load} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">Refresh</button></header>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[['pending', 'Pending review'], ['verifiedToday', 'Verified today (IST)'], ['rejected', 'Rejected'], ['missing', 'Missing required evidence']].map(([key, title]) => <div key={key} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{title}</p><p className="mt-2 text-2xl font-bold text-slate-900">{summary?.[key] ?? '—'}</p></div>)}</div>
    <div className="flex flex-wrap gap-2">{[['review', 'Review queue'], ['missing', 'Missing documents'], ['transactions', 'All transactions']].map(([key, text]) => <button type="button" key={key} onClick={() => { setMode(key); setPage(1); }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === key ? 'bg-orange-600 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>{text}</button>)}</div>
    <form onSubmit={e => { e.preventDefault(); setApplied(filters); setPage(1); }} className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-4">
      <label className="col-span-2 text-xs text-slate-600">Search transaction, party, plot, reference<input aria-label="Search documents" className={`${field} mt-1`} value={filters.search || ''} onChange={e => set('search', e.target.value)} /></label>
      <label className="text-xs text-slate-600">Source<select className={`${field} mt-1`} value={filters.sourceType || ''} onChange={e => set('sourceType', e.target.value)}><option value="">All modules</option>{sourceTypes.map(t => <option key={t}>{t}</option>)}</select></label>
      <label className="text-xs text-slate-600">Status<select disabled={mode !== 'review'} className={`${field} mt-1`} value={filters.status || ''} onChange={e => set('status', e.target.value)}><option value="">All statuses</option>{['PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'REPLACED', 'ARCHIVED'].map(t => <option key={t}>{t}</option>)}</select></label>
      <label className="text-xs text-slate-600">Document type<select disabled={mode !== 'review'} className={`${field} mt-1`} value={filters.documentType || ''} onChange={e => set('documentType', e.target.value)}><option value="">All document types</option>{documentTypes.map(t => <option key={t}>{t}</option>)}</select></label>
      {[['utr', 'UTR / reference', 'text'], ['paymentMode', 'Payment mode', 'text'], ['uploadedBy', 'Uploader ID', 'text'], ['employee', 'Creator / employee user ID', 'text'], ['customerId', 'Customer ID', 'text'], ['propertyId', 'Property ID', 'text'], ['sourceId', 'Transaction ID', 'text'], ['from', 'From date', 'date'], ['to', 'Through date', 'date'], ['minAmount', 'Minimum amount', 'number'], ['maxAmount', 'Maximum amount', 'number'], ['sha256', 'SHA-256 (find duplicate evidence)', 'text']].map(([key, text, type]) => <label key={key} className="text-xs text-slate-600">{text}<input className={`${field} mt-1`} type={type} step={type === 'number' ? '0.01' : undefined} value={filters[key] || ''} onChange={e => set(key, e.target.value)} /></label>)}
      <button className="flex items-center justify-center gap-2 self-end rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"><Search size={15} /> Apply filters</button>
    </form>
    {summary?.highValueThreshold && <button type="button" className="text-sm font-semibold text-orange-700" onClick={() => { setFilters(f => ({ ...f, minAmount: summary.highValueThreshold, status: 'PENDING_REVIEW' })); setApplied(f => ({ ...f, minAmount: summary.highValueThreshold, status: 'PENDING_REVIEW' })); setMode('review'); setPage(1); }}>High-value pending review (₹{Number(summary.highValueThreshold).toLocaleString('en-IN')}+)</button>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr>{['Transaction / module', 'Party / reference', 'Amount / mode', 'Evidence', 'Review'].map(t => <th key={t} className="p-4">{t}</th>)}</tr></thead><tbody>{busy ? <tr><td colSpan={5} className="p-8 text-center" role="status">Loading evidence…</td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-500">No matching transactions or documents.</td></tr> : rows.map(row => <tr key={row.id || `${row.sourceType}:${row.sourceId}`} className="border-t border-slate-100"><td className="max-w-52 break-all p-4"><strong>{row.sourceType}</strong><p className="mt-1 text-slate-500">{row.sourceId}</p></td><td className="p-4">{row.party}<p className="mt-1 text-slate-500">{row.reference || 'No reference'}</p></td><td className="whitespace-nowrap p-4">₹{Number(row.amount).toLocaleString('en-IN')}<p className="text-slate-500">{row.paymentMode}</p></td><td className="max-w-56 break-all p-4"><p className="mb-2">{row.originalFileName || row.identifier}</p><DocumentBadge status={row.status || row.state} /></td><td className="p-4"><TransactionDocumentButton sourceType={row.sourceType} sourceId={row.sourceId} /></td></tr>)}</tbody></table></div>
    <div className="flex items-center justify-between text-sm text-slate-600"><span>{result.total} results · Page {page}</span><div className="flex gap-4"><button disabled={busy || page === 1} onClick={() => setPage(p => p - 1)} className="disabled:opacity-40">Previous</button><button disabled={busy || page * 20 >= result.total} onClick={() => setPage(p => p + 1)} className="disabled:opacity-40">Next</button></div></div>
  </main>;
}
