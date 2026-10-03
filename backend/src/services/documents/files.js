const crypto = require('node:crypto');
const sharp = require('sharp');
const { PDFDocument, PDFDict, PDFName, PDFArray, PDFStream } = require('pdf-lib');
const { MAX_BYTES, fail } = require('./policy');
const formats = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
function fileName(name) {
  if (typeof name !== 'string' || !name.trim() || name.length > 180 || /[\x00-\x1f\x7f/\\<>:"|?*\u202a-\u202e\u2066-\u2069]/.test(name) || name.includes('..')) throw fail(400, 'Invalid file name.');
  return name.trim();
}
async function validateFile(buffer, name, mime) {
  name = fileName(name);
  const ext = name.split('.').pop().toLowerCase();
  if (!formats[ext] || formats[ext] !== mime) throw fail(400, 'File type is not supported or does not match its extension.');
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) throw fail(400, 'File is empty or corrupt.');
  if (buffer.length > MAX_BYTES) throw fail(413, 'File exceeds the maximum allowed size (10 MB).');
  const detected = buffer.subarray(0, 5).equals(Buffer.from('%PDF-')) ? 'application/pdf'
    : buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png'
    : buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 ? 'image/jpeg'
    : buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' : null;
  if (detected !== mime) throw fail(400, 'File content does not match its declared type.');
  try {
    if (mime === 'application/pdf') {
      const pdf = await PDFDocument.load(buffer, { throwOnInvalidObject: true, updateMetadata: false });
      if (pdf.isEncrypted || pdf.getPageCount() < 1 || pdf.getPageCount() > 200 || !buffer.subarray(-1024).includes(Buffer.from('%%EOF'))) throw Error('Invalid PDF');
      const blocked = new Set(['JS', 'JavaScript', 'Launch', 'EmbeddedFiles', 'EmbeddedFile', 'RichMedia', 'XFA', 'AA', 'OpenAction', 'SubmitForm', 'GoToR', 'URI']);
      const seen = new Set();
      const inspect = (object, depth = 0) => {
        if (depth > 50 || seen.size > 50000) throw Error('PDF too complex');
        if (!object || seen.has(object)) return;
        seen.add(object);
        if (object instanceof PDFDict) {
          for (const [key, value] of object.entries()) {
            if (blocked.has(key.decodeText()) || (value instanceof PDFName && blocked.has(value.decodeText()))) throw Error('Active PDF');
            inspect(value, depth + 1);
          }
        } else if (object instanceof PDFArray) object.asArray().forEach(value => inspect(value, depth + 1));
        else if (object instanceof PDFStream) inspect(object.dict, depth + 1);
      };
      for (const [, object] of pdf.context.enumerateIndirectObjects()) inspect(object);
    } else {
      // Full decode catches truncated images; pixel limit prevents decompression bombs.
      await sharp(buffer, { limitInputPixels: 25000000, failOn: 'warning' }).stats();
    }
  } catch {
    throw fail(400, 'File is corrupt, encrypted, too complex, or contains unsupported active content.');
  }
  return { originalFileName: name, mimeType: mime, fileSize: buffer.length, sha256: crypto.createHash('sha256').update(buffer).digest('hex') };
}
async function preview(buffer, mime) {
  if (mime === 'application/pdf') return { buffer, mimeType: mime };
  return { buffer: await sharp(buffer).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer(), mimeType: 'image/webp' };
}
module.exports = { validateFile, fileName, preview, formats };
