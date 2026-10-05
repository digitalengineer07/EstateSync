function responseSafety(req, res, next) {
  const json = res.json.bind(res);
  res.json = body => {
    if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
      if (res.statusCode >= 500) {
        console.error('API failure:', req.method, req.originalUrl, body);
        body = { success: false, message: 'The operation could not be completed. Please try again.' };
      } else if (Object.hasOwn(body, 'error')) { const { error, ...safe } = body; body = safe; }
    }
    return json(body);
  };
  next();
}
module.exports = { responseSafety };
