function databaseUrlWithDefaults(value) {
  if (!value) return value;
  const url = new URL(value);
  const neon = url.hostname.endsWith('.neon.tech');
  if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '5');
  if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', neon ? '20' : '10');
  // Allow a bounded interval for hosted compute activation/network handshakes.
  // Explicit deployment settings always take precedence.
  if (neon && !url.searchParams.has('connect_timeout')) url.searchParams.set('connect_timeout', '15');
  return url.toString();
}
function isDatabaseUnavailable(error) {
  return ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(error?.code || error?.errorCode);
}
const DATABASE_UNAVAILABLE_MESSAGE = 'The database is temporarily unavailable. Please try again shortly.';
function replyIfDatabaseUnavailable(error, res) {
  if (!isDatabaseUnavailable(error)) return false;
  res.setHeader('Retry-After', '5');
  res.status(503).json({ success: false, code: 'DATABASE_UNAVAILABLE', message: DATABASE_UNAVAILABLE_MESSAGE });
  return true;
}
module.exports = { databaseUrlWithDefaults, isDatabaseUnavailable, DATABASE_UNAVAILABLE_MESSAGE, replyIfDatabaseUnavailable };
