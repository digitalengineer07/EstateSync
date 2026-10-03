import { API_URL } from '../config/api';
import { apiRequest } from './apiClient';
export const documentRequest = (path = '', options) => apiRequest(`/api/v1/documents${path}`, options);
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export function validateDocumentFile(file) {
  const allowed = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const ext = file.name.split('.').pop().toLowerCase();
  if (!allowed[ext] || allowed[ext] !== file.type) throw new Error('Select a PDF, JPG, PNG, or WEBP file.');
  if (!file.size) throw new Error('File is empty.');
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error('File exceeds the maximum allowed size (10 MB).');
}
export function uploadDocument(file, { sourceType, sourceId, documentType, key, onProgress }) {
  validateDocumentFile(file);
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({ sourceType, documentType, fileName: file.name });
    if (sourceId) params.set('sourceId', sourceId);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/api/v1/documents/uploads?${params}`);
    xhr.timeout = 120000;
    xhr.setRequestHeader('Authorization', `Bearer ${sessionStorage.getItem('accessToken') || ''}`);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.setRequestHeader('Idempotency-Key', key);
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress?.(Math.round(event.loaded / event.total * 100)); };
    xhr.onerror = () => reject(new Error('Upload failed. Check your connection and retry.'));
    xhr.ontimeout = () => reject(new Error('Upload timed out. Retry the file.'));
    xhr.onload = () => {
      let data;
      try { data = JSON.parse(xhr.responseText); } catch { reject(new Error('Upload failed. Please retry.')); return; }
      if (xhr.status >= 200 && xhr.status < 300 && data.success) resolve(data.upload);
      else reject(new Error(data.message || 'Upload failed.'));
    };
    xhr.send(file);
  });
}
export async function documentBlob(id, download = false) {
  const response = await fetch(`${API_URL}/api/v1/documents/${id}/${download ? 'download' : 'preview'}`, { headers: { Authorization: `Bearer ${sessionStorage.getItem('accessToken') || ''}` }, cache: 'no-store' });
  if (!response.ok) { const result = await response.json(); throw new Error(result.message || 'Document is unavailable.'); }
  return response.blob();
}
