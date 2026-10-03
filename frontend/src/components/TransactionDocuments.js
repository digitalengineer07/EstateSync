"use client";
/* eslint-disable @next/next/no-img-element -- Authorized blob URLs cannot use the public image optimizer. */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { documentRequest, documentBlob, uploadDocument, validateDocumentFile } from '@/services/documentService';

const label = value => value?.replaceAll('_', ' ').toLowerCase().replace(/^./, c => c.toUpperCase());
const button = 'px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-orange-50 disabled:opacity-50';
export function DocumentBadge({ status }) {
  const color = status === 'VERIFIED' || status === 'DOCUMENT_VERIFIED' ? 'bg-emerald-50 text-emerald-700' : status?.includes('REJECTED') || status === 'DOCUMENT_MISSING' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800';
  return <span className={`inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ${color}`}>{label(status)}</span>;
}
export default function TransactionDocuments({ sourceType, sourceId, paymentMode = 'CASH', uploads = [], onChange, onBusyChange, exceptionReason = '', onExceptionReasonChange, disabled = false }) {
  const { user } = useAuth();
  const inputId = useId();
  const [policy, setPolicy] = useState(null);
  const [data, setData] = useState(null);
  const [documentPage, setDocumentPage] = useState(1);
  const [type, setType] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [details, setDetails] = useState(null);
  const [reason, setReason] = useState('');
  const [replaceId, setReplaceId] = useState(null);
  const locked = useRef(false);
  const stagedFiles = useRef(new Map());
  const role = typeof user?.role === 'object' ? user.role.name : user?.role;
  const canSensitive = sourceId ? data?.capabilities.sensitive : ['ADMIN', 'ACCOUNTING'].includes(role);
  const canUpload = sourceId ? data?.capabilities.upload : true;
  const refresh = useCallback(async () => {
    try {
      const result = sourceId ? await documentRequest('', { params: { sourceType, sourceId, page: documentPage } }) : await documentRequest('/policy', { params: { sourceType, paymentMode } });
      setPolicy(result.policy);
      if (sourceId) setData(result);
      setError('');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [sourceId, sourceType, paymentMode, documentPage]);
  useEffect(() => {
    let active = true;
    const request = sourceId ? documentRequest('', { params: { sourceType, sourceId, page: documentPage } }) : documentRequest('/policy', { params: { sourceType, paymentMode } });
    request.then(result => { if (active) { setPolicy(result.policy); setData(sourceId ? result : null); setError(''); } })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sourceId, sourceType, paymentMode, documentPage]);
  useEffect(() => () => { if (viewer?.url) URL.revokeObjectURL(viewer.url); }, [viewer]);
  useEffect(() => {
    for (const id of stagedFiles.current.keys()) if (!uploads.some(u => u.id === id)) stagedFiles.current.delete(id);
  }, [uploads]);
  const allowed = policy?.allowedTypes.filter(t => canSensitive || !t.startsWith('CHEQUE_')) || [];
  const selectedType = allowed.includes(type) ? type : allowed[0] || '';
  const setWorking = value => { locked.current = value; setBusy(value); onBusyChange?.(value); };

  const upload = async (file, idempotencyKey = crypto.randomUUID(), replacement = replaceId) => {
    if (locked.current || disabled) return;
    setError('');
    try { validateDocumentFile(file); } catch (err) { setError(err.message); return; }
    if (!sourceId && uploads.length >= (policy?.maxFiles || 5)) { setError('Attach at most five files per submission.'); return; }
    setWorking(true); setProgress(0);
    const documentType = replacement ? data.documents.find(d => d.id === replacement)?.documentType : selectedType;
    let staged;
    try {
      staged = await uploadDocument(file, { sourceType, sourceId, documentType, key: idempotencyKey, onProgress: setProgress });
      if (sourceId) {
        await documentRequest(replacement ? `/${replacement}/replace` : '', { method: 'POST', body: replacement ? { uploadId: staged.id } : { sourceType, sourceId, uploadIds: [staged.id] } });
        await refresh();
      } else { stagedFiles.current.set(staged.id, file); onChange?.([...uploads, staged]); }
      setRetry(null); setReplaceId(null);
    } catch (err) {
      setError(err.message);
      setRetry({ file, key: idempotencyKey, replacement, staged });
    } finally { setWorking(false); }
  };
  const remove = async uploadId => {
    try { await documentRequest(`/uploads/${uploadId}/discard`, { method: 'POST', body: {} }); onChange?.(uploads.filter(u => u.id !== uploadId)); }
    catch (err) { setError(err.message); }
  };
  const previewStaged = upload => {
    const file = stagedFiles.current.get(upload.id);
    if (!file) { setError('Local preview is no longer available. Submit the transaction to view the saved document.'); return; }
    setViewer({ url: URL.createObjectURL(file), mimeType: file.type, name: file.name });
  };
  const view = async (doc, download = false) => {
    setError(''); setWorking(true);
    try {
      const blob = await documentBlob(doc.id, download);
      const url = URL.createObjectURL(blob);
      if (download) {
        const a = document.createElement('a'); a.href = url; a.download = doc.originalFileName; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else setViewer({ url, mimeType: blob.type, name: doc.originalFileName });
    } catch (err) { setError(err.message); } finally { setWorking(false); }
  };
  const review = async (id, action, exception = false) => {
    setWorking(true); setError('');
    try { await documentRequest(`${exception ? '/exceptions' : ''}/${id}/${action}`, { method: 'POST', body: { reason } }); setReason(''); await refresh(); }
    catch (err) { setError(err.message); } finally { setWorking(false); }
  };

  return <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-slate-800" aria-label="Transaction documents">
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="flex items-center gap-2 text-sm font-semibold"><FileText size={16} />{sourceType === 'EXPENSE' ? 'Receipt & documents' : sourceType === 'CUSTOMER_PAYMENT' ? 'Customer payment proof' : sourceType === 'PROPERTY' ? 'Property documents' : 'Payment proof'}</h4>{data && <DocumentBadge status={data.state} />}</div>
    {sourceType === 'CUSTOMER_PAYMENT' && <p className="text-xs text-slate-500">Customer evidence is separate from an official EstateSync receipt.</p>}
    {loading && <p role="status" className="text-xs">Loading document policy…</p>}
    {policy && <p className="text-xs text-slate-500">PDF, JPG, PNG, WEBP · Maximum 10 MB each · Up to 5 per submission. {policy.requiredGroups.length ? `Required: ${policy.requiredGroups.map(g => g.map(label).join(' or ')).join('; ')}.` : 'Supporting evidence recommended.'}</p>}
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error} {retry && <button type="button" className={`${button} ml-2`} disabled={busy} onClick={() => upload(retry.file, retry.key, retry.replacement)}>Retry upload</button>}</div>}
    {canUpload && policy && <>
      <label className="block text-xs font-medium" htmlFor={`${inputId}-type`}>Document type</label>
      <select id={`${inputId}-type`} value={selectedType} onChange={e => setType(e.target.value)} disabled={busy || disabled || !!replaceId} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs">{allowed.map(t => <option key={t} value={t}>{label(t)}</option>)}</select>
      {replaceId && <p className="text-xs text-orange-700">Replacing a document; its previous version will be retained. <button type="button" className="underline" onClick={() => setReplaceId(null)}>Cancel replacement</button></p>}
      <label htmlFor={inputId} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (e.dataTransfer.files.length === 1) upload(e.dataTransfer.files[0]); else setError('Select one file at a time.'); }} className={`block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-white p-5 text-center ${busy || disabled ? 'pointer-events-none opacity-60' : 'hover:border-orange-400'}`}>
        <Upload className="mx-auto mb-2 text-orange-600" size={22} /><span className="text-xs font-medium">Drag a file here or select a file</span>
        <input id={inputId} aria-label="Select transaction document" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="sr-only" disabled={busy || disabled || !selectedType} onChange={e => { const file = e.target.files?.[0]; if (file) upload(file); e.target.value = ''; }} />
      </label>
    </>}
    {busy && <div role="status" className="space-y-1 text-xs"><span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />{progress === 100 ? 'Validating and saving…' : `Processing document… ${progress}%`}</span><progress className="w-full accent-orange-600" value={progress} max="100" aria-label="Upload progress" /></div>}
    {!sourceId && uploads.map(u => <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 text-xs"><span className="min-w-0 break-all">{u.originalFileName}<small className="block text-slate-500">{label(u.documentType)} · {(u.fileSize / 1024).toFixed(1)} KB · Ready to submit</small></span><div className="flex gap-2"><button type="button" className={button} disabled={busy} onClick={() => previewStaged(u)}>Preview staged file</button><button type="button" disabled={busy || disabled} className={button} onClick={() => remove(u.id)} aria-label={`Remove ${u.originalFileName}`}><X size={14} /></button></div></div>)}
    {!sourceId && onExceptionReasonChange && policy?.exceptionAllowed && <div className="space-y-2"><label htmlFor={`${inputId}-exception`} className="block text-xs font-medium">If a receipt is unavailable, explain why (review required)</label><textarea id={`${inputId}-exception`} value={exceptionReason} disabled={disabled || busy} minLength={10} maxLength={1000} onChange={e => onExceptionReasonChange(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs" placeholder="Reason for missing receipt, supplier and circumstances…" /></div>}
    {sourceId && !loading && !data?.documents.length && <p className="text-xs text-slate-500">No documents attached to this transaction.</p>}
    {data?.source && <dl className="grid grid-cols-2 gap-2 text-xs"><div><dt className="text-slate-500">Transaction</dt><dd className="break-all">{data.source.identifier}</dd></div><div><dt className="text-slate-500">Amount / mode</dt><dd>₹{Number(data.source.amount).toLocaleString('en-IN')} · {data.source.paymentMode}</dd></div><div><dt className="text-slate-500">Party / reference</dt><dd>{data.source.party} · {data.source.reference || 'No reference'}</dd></div><div><dt className="text-slate-500">Transaction date</dt><dd>{new Date(data.source.date).toLocaleString()}</dd></div></dl>}
    {data?.source && <p className="break-all text-xs text-slate-500">Created by {data.source.createdBy} · {new Date(data.source.createdAt).toLocaleString()}</p>}
    {data?.exception && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs"><strong>Receipt exception: {label(data.exception.status)}</strong><p className="my-1">{data.exception.reason}</p><p>Requested {new Date(data.exception.requestedAt).toLocaleString()} by {data.exception.requestedBy}</p>{data.exception.reviewReason && <p>Review: {data.exception.reviewReason}</p>}{data.capabilities.review && data.exception.status === 'PENDING_REVIEW' && <div className="mt-2 flex gap-2"><button type="button" disabled={busy || reason.trim().length < 5} className={button} onClick={() => review(data.exception.id, 'verify', true)}>Approve exception</button><button type="button" disabled={busy || reason.trim().length < 5} className={button} onClick={() => review(data.exception.id, 'reject', true)}>Reject exception</button></div>}</div>}
    {data?.documents.map(doc => <article key={doc.id} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs">
      <div className="flex flex-wrap justify-between gap-2"><strong className="break-all">{doc.originalFileName}</strong><DocumentBadge status={doc.status} /></div>
      <p className="text-slate-500">{label(doc.documentType)} · Version {doc.version} · {(doc.fileSize / 1024).toFixed(1)} KB · {doc.uploader?.name} · {new Date(doc.uploadedAt).toLocaleString()}</p>
      {doc.rejectionReason && <p className="text-red-700">Rejected: {doc.rejectionReason}</p>}
      <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={busy} onClick={() => view(doc)}>Preview</button>{data.capabilities.download && <button type="button" className={button} disabled={busy} onClick={() => view(doc, true)}>Download</button>}<button type="button" className={button} onClick={async () => { try { setDetails(await documentRequest(`/${doc.id}`)); } catch (err) { setError(err.message); } }}>History & metadata</button>
      {data.capabilities.replace && !['ARCHIVED', 'REPLACED'].includes(doc.status) && <button type="button" disabled={busy} className={button} onClick={() => { setReplaceId(doc.id); setType(doc.documentType); }}>Replace</button>}
      {data.capabilities.review && doc.status === 'PENDING_REVIEW' && <><button type="button" disabled={busy} className={button} onClick={() => review(doc.id, 'verify')}>Verify</button><button type="button" disabled={busy || reason.trim().length < 5} className={button} onClick={() => review(doc.id, 'reject')}>Reject</button></>}
      {data.capabilities.archive && !['ARCHIVED', 'REPLACED'].includes(doc.status) && <button type="button" disabled={busy || reason.trim().length < 5} className={button} onClick={() => review(doc.id, 'archive')}>Archive</button>}</div>
    </article>)}
    {data?.total > data?.pageSize && <div className="flex items-center justify-between text-xs"><button type="button" className={button} disabled={busy || loading || documentPage <= 1} onClick={() => { setLoading(true); setDocumentPage(p => p - 1); }}>Previous documents</button><span>Page {documentPage} · {data.total} versions</span><button type="button" className={button} disabled={busy || loading || documentPage * data.pageSize >= data.total} onClick={() => { setLoading(true); setDocumentPage(p => p + 1); }}>Next documents</button></div>}
    {data?.capabilities.review && <label className="block text-xs font-medium">Review reason (required for rejection, archival and exceptions)<textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2" /></label>}
    {details && <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs"><button type="button" className={button} onClick={() => setDetails(null)}>Close history</button><p className="break-all">SHA-256: {details.document.sha256}</p><p>MIME: {details.document.mimeType} · Uploaded by {details.document.uploadedBy}</p>{details.history.map(d => <p key={d.id}>Version {d.version}: {label(d.status)} {d.verifiedAt ? `· Verified ${new Date(d.verifiedAt).toLocaleString()} by ${d.verifiedBy}` : ''}{d.rejectedAt ? ` · Rejected ${new Date(d.rejectedAt).toLocaleString()} by ${d.rejectedBy}` : ''}</p>)}{details.events.map(e => <p key={e.id}>{new Date(e.createdAt).toLocaleString()} · {e.action} · {e.actorEmail}</p>)}</div>}
    {viewer && <div role="dialog" aria-modal="true" aria-label="Document preview" className="fixed inset-0 z-[80] flex flex-col bg-slate-950/90 p-4" onKeyDown={e => { if (e.key === 'Escape') setViewer(null); }}><div className="mb-3 flex items-center justify-between gap-3 text-white"><span className="truncate text-sm">{viewer.name}</span><button type="button" autoFocus className={button} onClick={() => setViewer(null)}>Close preview</button></div>{viewer.mimeType === 'application/pdf' ? <iframe title={viewer.name} src={viewer.url} sandbox="" className="min-h-0 flex-1 rounded-xl bg-white" /> : <img src={viewer.url} alt={viewer.name} className="min-h-0 flex-1 object-contain" />}<p className="mt-2 text-xs text-white">If your browser blocks PDF previews, use Download.</p></div>}
  </section>;
}
