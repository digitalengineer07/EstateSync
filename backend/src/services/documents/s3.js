const crypto = require('node:crypto');
const {
  S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand,
  DeleteObjectCommand, ListObjectsV2Command,
} = require('@aws-sdk/client-s3');
const { fail, MAX_BYTES } = require('./policy');

const validKey = key => {
  if (!/^[0-9a-f-]{36}\.bin$/.test(key)) throw fail(400, 'Invalid storage identifier.');
  return key;
};
const missing = error => error?.$metadata?.httpStatusCode === 404 || ['NoSuchKey', 'NotFound'].includes(error?.name);
const unavailable = () => fail(503, 'Document content is temporarily unavailable. Contact support.');

class PrivateS3Storage {
  constructor(config = process.env, client) {
    const bucket = config.DOCUMENT_S3_BUCKET;
    const endpoint = config.DOCUMENT_S3_ENDPOINT;
    const region = config.DOCUMENT_S3_REGION;
    const accessKeyId = config.DOCUMENT_S3_ACCESS_KEY_ID;
    const secretAccessKey = config.DOCUMENT_S3_SECRET_ACCESS_KEY;
    if (!bucket || !region || !accessKeyId || !secretAccessKey) throw fail(503, 'Private object storage is not configured.');
    if (endpoint) {
      let url;
      try { url = new URL(endpoint); } catch { throw fail(503, 'Invalid private object storage endpoint.'); }
      if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw fail(503, 'Private object storage requires an HTTPS endpoint.');
    }
    this.bucket = bucket;
    this.client = client || new S3Client({
      region,
      ...(endpoint ? { endpoint } : {}),
      credentials: { accessKeyId, secretAccessKey },
      maxAttempts: 2,
    });
  }
  async put(buffer) {
    const key = `${crypto.randomUUID()}.bin`;
    try {
      await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer, ContentType: 'application/octet-stream' }));
      return key;
    } catch { throw unavailable(); }
  }
  async read(key) {
    validKey(key);
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      const chunks = [];
      let size = 0;
      for await (const chunk of result.Body) {
        size += chunk.length;
        if (size > MAX_BYTES) throw unavailable();
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch { throw unavailable(); }
  }
  async exists(key) {
    validKey(key);
    try { await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key })); return true; }
    catch (error) { if (missing(error)) return false; throw unavailable(); }
  }
  async removeUnclaimed(key) {
    validKey(key);
    try { await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })); }
    catch (error) { if (!missing(error)) throw unavailable(); }
  }
  async list() {
    const objects = [];
    let token;
    try {
      do {
        const page = await this.client.send(new ListObjectsV2Command({ Bucket: this.bucket, ContinuationToken: token }));
        for (const item of page.Contents || []) {
          if (item.Key && /^[0-9a-f-]{36}\.bin$/.test(item.Key) && item.LastModified) objects.push({ key: item.Key, modifiedAt: item.LastModified });
        }
        if (page.IsTruncated && !page.NextContinuationToken) throw Error('Incomplete object listing');
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (token);
      return objects;
    } catch { throw unavailable(); }
  }
}

module.exports = { PrivateS3Storage };
