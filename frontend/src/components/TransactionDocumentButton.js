"use client";
import { useState } from 'react';
import { createPortal } from 'react-dom';
import TransactionDocuments from './TransactionDocuments';
import { documentRequest } from '@/services/documentService';

export default function TransactionDocumentButton({ sourceType, sourceId, journalId, label = 'Documents' }) {
  const [source, setSource] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const open = async () => {
    setBusy(true); setError('');
    try {
      const value = journalId ? (await documentRequest(`/journal/${journalId}`)).source : { sourceType, sourceId };
      if (!value) setError('No unambiguous source transaction is linked to this journal.');
      else setSource(value);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <><button type="button" disabled={busy} onClick={open} className="rounded-lg border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-800">{busy ? 'Loading…' : label}</button>{error && <p role="alert" className="mt-1 whitespace-normal text-xs text-red-700">{error}</p>}{source && createPortal(<div role="dialog" aria-modal="true" aria-label="Transaction evidence" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3" onKeyDown={e => { if (e.key === 'Escape') setSource(null); }}><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 text-left"><div className="mb-4 flex justify-between"><h3 className="font-bold text-slate-900">Transaction evidence</h3><button type="button" autoFocus onClick={() => setSource(null)} className="text-sm text-slate-600">Close</button></div><TransactionDocuments sourceType={source.sourceType} sourceId={source.sourceId} /></div></div>, document.body)}</>;
}
