const numeric = new Set(['amount','targetBalance','deductionAmount','refundAmount','areaSqft','ratePerSqft','landCost','registryCost','otherCharges','discount','taxes','totalLandValue','baseSalary','customAmount','fixedAmount','percentage','sequence','dueDays','taxRate']);
const dates = new Set(['date','dateOfPayment','noteDate','transactionDate','agreementDate','joiningDate','confirmationDate','exitDate','customDueDate','startDate','endDate','from','to','asOfDate']);
const text = new Set(['email','name','title','reason','description','managerId','customerId','roleId','targetUserId','categoryId','fullName','mobile','customerName','customerContact','identityType','identityNumber','plotNo','khataNo','referenceNo','bankName','notes','status','partyName','department','designation']);
const enums = {
  fundMode: ['CASH','LIQUID'],
  paymentMode: ['CASH','CHEQUE','NEFT','RTGS','UPI','DD','IMPS','WIRE','BANK_TRANSFER','BANK'],
  adjustmentType: ['SET_BALANCE','INCREASE','DECREASE'],
  inflowType: ['CAPITAL_INFUSION','DIRECTOR_LOAN','BANK_INTEREST','OTHER'],
  calculationType: ['PERCENTAGE','FIXED_AMOUNT'],
};
function validateObject(value, depth = 0) {
  if (depth > 8) throw Error('Request nesting is too deep');
  if (Array.isArray(value)) {
    if (value.length > 100) throw Error('A request may contain at most 100 items per list');
    for (const item of value) if (item && typeof item === 'object') validateObject(item, depth + 1);
    return;
  }
  for (const [key, v] of Object.entries(value)) {
    if (['__proto__','prototype','constructor'].includes(key)) throw Error('Invalid request field');
    if (['title','reason','fullName','customerName'].includes(key) && (typeof v !== 'string' || !v.trim())) throw Error(`${key} cannot be blank`);
    if (v === null || v === undefined || v === '') continue;
    if (text.has(key) && typeof v !== 'string') throw Error(`${key} must be text`);
    if (numeric.has(key)) {
      if (!['number','string'].includes(typeof v) || !/^\d+(?:\.\d+)?$/.test(String(v)) || !Number.isFinite(Number(v)) || Number(v) > 9999999999999.99) throw Error(`${key} must be a finite non-negative number`);
    } else if (dates.has(key)) {
      if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(v) || !Number.isFinite(Date.parse(v)) || new Date(v.slice(0,10)).toISOString().slice(0,10) !== v.slice(0,10)) throw Error(`${key} must be a valid date`);
    } else if (enums[key] && (typeof v !== 'string' || !enums[key].includes(v))) throw Error(`Invalid ${key}`);
    else if (v && typeof v === 'object') {
      // Structured input is limited to the fields actually used by the UI.
      if (!['milestones','documentUploadIds','uploadIds','kycDocuments','documents'].includes(key)) throw Error(`${key} must be a scalar value`);
      validateObject(v, depth + 1);
    } else if (typeof v === 'string') {
      if (v.length > (key === 'photo' ? 300000 : 10000)) throw Error(`${key} is too long`);
      if (!v.trim()) throw Error(`${key} cannot be blank`);
    } else if (typeof v !== 'boolean' && typeof v !== 'number') throw Error(`Invalid ${key}`);
    if (/password/i.test(key) && (typeof v !== 'string' || Buffer.byteLength(v) > 72)) throw Error('Passwords must be strings of at most 72 UTF-8 bytes');
  }
}
function validateInput(req, res, next) {
  try {
    if (['POST','PUT','PATCH','DELETE'].includes(req.method) && !req.path.endsWith('/documents/uploads')) {
      if (req.body === undefined && ['POST','PUT','PATCH'].includes(req.method)) req.body = {};
      if (req.body !== undefined && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Buffer.isBuffer(req.body))) throw Error('Request body must be a JSON object');
      if (req.body) validateObject(req.body);
      if (req.path.startsWith('/notes') && req.body?.category && !['GENERAL_NOTE','CASH_RECEIVED_CUSTOMER','CASH_PAID_LAND','CASH_PAID_EXPENSE','CASH_HANDOVER'].includes(req.body.category)) throw Error('Invalid note category');
      if (req.body?.status && req.path.startsWith('/customers') && !['ACTIVE','CANCELLED','COMPLETED','INACTIVE'].includes(req.body.status)) throw Error('Invalid customer status');
      if (req.body?.status && req.path.startsWith('/employees') && !['ACTIVE','INACTIVE','ARCHIVED','RESIGNED','TERMINATED'].includes(req.body.status)) throw Error('Invalid employee status');
    }
    for (const [key,value] of Object.entries(req.query)) {
      if (typeof value !== 'string' || value.length > 1000) throw Error(`Invalid query parameter: ${key}`);
      if (['page','limit'].includes(key) && (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > (key === 'limit' ? 100 : 100000))) throw Error(`Invalid ${key}`);
    }
    return next();
  } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
}
module.exports = { validateInput, validateObject };
