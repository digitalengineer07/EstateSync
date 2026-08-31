const prisma = require('../src/config/db');

const BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:4000';
const PASSWORD = process.env.TEST_USER_PASSWORD || 'password123';
const RUN_ID = `gha-${Date.now()}`;

const created = {
  customerIds: [],
  propertyIds: [],
  expenseIds: [],
  fundRequestIds: [],
  walletTransactionIds: [],
  idempotencyKeys: []
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function requestJson(method, path, body, token, extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return { status: response.status, ok: response.ok, data };
}

async function expectStatus(label, promise, statuses) {
  const res = await promise;
  const expected = Array.isArray(statuses) ? statuses : [statuses];
  assert(
    expected.includes(res.status),
    `${label}: expected HTTP ${expected.join(' or ')}, got ${res.status}: ${JSON.stringify(res.data)}`
  );
  console.log(`PASS ${label} -> HTTP ${res.status}`);
  return res;
}

async function login(email) {
  const res = await expectStatus(
    `login ${email}`,
    requestJson('POST', '/api/v1/auth/login', { email, password: PASSWORD }),
    200
  );
  assert(res.data.accessToken, `login ${email}: missing access token`);
  return { token: res.data.accessToken, user: res.data.user };
}

function authHeaders(keyPrefix) {
  const key = `${keyPrefix}-${RUN_ID}-${Math.random().toString(36).slice(2)}`;
  created.idempotencyKeys.push(key);
  return { 'Idempotency-Key': key };
}

function validCustomer(overrides = {}) {
  return {
    customerName: `CI Customer ${RUN_ID}`,
    customerContact: '9876543210',
    customerAddress: 'CI Test Address',
    projectLocation: 'CI Test Project',
    plotNo: `PL-${RUN_ID}`,
    areaSqft: 1200,
    khataNo: `KH-${RUN_ID}`,
    identityType: 'Aadhaar',
    identityNumber: `AAD-${RUN_ID}`,
    ratePerSqft: 1000,
    landCost: 1200000,
    registryCost: 100000,
    otherCharges: 25000,
    discount: 25000,
    taxes: 50000,
    ...overrides
  };
}

function validProperty(overrides = {}) {
  return {
    khataNo: `LAND-KH-${RUN_ID}`,
    plotNo: `LAND-PL-${RUN_ID}`,
    projectLocation: 'CI Land Project',
    landOwnerName: `CI Owner ${RUN_ID}`,
    landOwnerContact: '9123456780',
    landOwnerAddress: 'CI Village',
    areaSqft: 2500,
    totalLandValue: 800000,
    agreementDate: new Date().toISOString(),
    documents: ['ci-deed.pdf'],
    ...overrides
  };
}

async function createCustomer(token, overrides = {}) {
  const res = await expectStatus(
    'create valid customer',
    requestJson('POST', '/api/v1/customers', validCustomer(overrides), token, authHeaders('customer-create')),
    201
  );
  created.customerIds.push(res.data.customer.id);
  return res.data.customer;
}

async function createProperty(token, overrides = {}) {
  const res = await expectStatus(
    'create valid property acquisition',
    requestJson('POST', '/api/v1/properties', validProperty(overrides), token, authHeaders('property-create')),
    201
  );
  created.propertyIds.push(res.data.property.id);
  return res.data.property;
}

async function ensureTreasuryFunds(token) {
  const referenceNo = `TREASURY-${RUN_ID}`;
  const res = await expectStatus(
    'seed treasury inflow for payment and allocation tests',
    requestJson('POST', '/api/v1/treasury/inflow', {
      amount: 2500000,
      bankName: 'CI Bank',
      accountNo: 'CI-0001',
      inflowType: 'CAPITAL_INFUSION',
      paymentMode: 'NEFT',
      referenceNo,
      narration: 'GitHub Actions validation funds'
    }, token),
    201
  );
  created.walletTransactionIds.push(res.data.transaction.id);

  await expectStatus(
    'block duplicate treasury inflow UTR',
    requestJson('POST', '/api/v1/treasury/inflow', {
      amount: 1000,
      bankName: 'CI Bank Duplicate',
      inflowType: 'CAPITAL_INFUSION',
      paymentMode: 'RTGS',
      referenceNo: `  ${referenceNo.toLowerCase()}  `,
      narration: 'Duplicate UTR should be rejected'
    }, token),
    400
  );
}

async function testCustomerCreationAndDuplicates(salesToken) {
  console.log('\nCustomer creation validation');

  await expectStatus(
    'reject customer with missing compulsory field',
    requestJson('POST', '/api/v1/customers', validCustomer({ khataNo: '   ' }), salesToken, authHeaders('bad-customer-missing')),
    400
  );

  await expectStatus(
    'reject customer with alphabetic numeric field',
    requestJson('POST', '/api/v1/customers', validCustomer({ areaSqft: 'abc' }), salesToken, authHeaders('bad-customer-alpha-area')),
    400
  );

  await expectStatus(
    'reject customer with negative commercial value',
    requestJson('POST', '/api/v1/customers', validCustomer({ landCost: -1000, ratePerSqft: 0, registryCost: 0, otherCharges: 0, taxes: 0, discount: 0 }), salesToken, authHeaders('bad-customer-negative')),
    400
  );

  await expectStatus(
    'reject customer with zero area',
    requestJson('POST', '/api/v1/customers', validCustomer({ areaSqft: 0 }), salesToken, authHeaders('bad-customer-zero-area')),
    400
  );

  const customer = await createCustomer(salesToken);

  await expectStatus(
    'reject duplicate customer plot and khata',
    requestJson('POST', '/api/v1/customers', validCustomer({
      customerName: 'CI Duplicate Customer',
      plotNo: ` Plot ${customer.plotNo.toLowerCase()} `,
      khataNo: ` Khata: ${customer.khataNo.toLowerCase()} `
    }), salesToken, authHeaders('duplicate-customer')),
    400
  );

  await expectStatus(
    'reject customer form entry with special characters in required numeric field',
    requestJson('POST', '/api/v1/customers', validCustomer({
      plotNo: `PL-SPECIAL-${RUN_ID}`,
      khataNo: `KH-SPECIAL-${RUN_ID}`,
      areaSqft: '@@@'
    }), salesToken, authHeaders('bad-customer-special')),
    400
  );

  return customer;
}

async function testPropertyCreationAndDuplicates(accountingToken) {
  console.log('\nLand acquisition validation');

  await expectStatus(
    'reject property with missing land owner contact',
    requestJson('POST', '/api/v1/properties', validProperty({ landOwnerContact: '' }), accountingToken, authHeaders('bad-property-missing')),
    400
  );

  await expectStatus(
    'reject property with alphabetic total land value',
    requestJson('POST', '/api/v1/properties', validProperty({ totalLandValue: 'abc' }), accountingToken, authHeaders('bad-property-alpha')),
    400
  );

  await expectStatus(
    'reject property with negative total land value',
    requestJson('POST', '/api/v1/properties', validProperty({ totalLandValue: -1 }), accountingToken, authHeaders('bad-property-negative')),
    400
  );

  await expectStatus(
    'reject property with special character numeric value',
    requestJson('POST', '/api/v1/properties', validProperty({ totalLandValue: '#$%' }), accountingToken, authHeaders('bad-property-special')),
    400
  );

  const property = await createProperty(accountingToken);

  await expectStatus(
    'reject duplicate land acquisition plot and khata',
    requestJson('POST', '/api/v1/properties', validProperty({
      landOwnerName: 'CI Duplicate Owner',
      plotNo: `Plot ${property.plotNo.toLowerCase()}`,
      khataNo: `Khata: ${property.khataNo.toLowerCase()}`
    }), accountingToken, authHeaders('duplicate-property')),
    400
  );

  return property;
}

async function testPaymentFunctions(accountingToken, customer, property) {
  console.log('\nPayment function validation');

  const customerBalance = Number(customer.balanceDue);
  const propertyBalance = Number(property.balanceRemaining);

  await expectStatus(
    'accept customer payment less than payable amount',
    requestJson('POST', `/api/v1/customers/${customer.id}/payments`, {
      amount: 50000,
      paymentMode: 'NEFT',
      referenceNo: `CUST-PAY-${RUN_ID}`
    }, accountingToken, authHeaders('customer-valid-less')),
    201
  );

  const customerInvalidAmounts = [
    ['reject customer negative payment amount', -1],
    ['reject customer zero payment amount', 0],
    ['reject customer alphabetic payment amount', 'abc'],
    ['reject customer special character payment amount', '@@@'],
    ['reject customer payment greater than payable amount', customerBalance + 1000000]
  ];

  for (const [label, amount] of customerInvalidAmounts) {
    await expectStatus(
      label,
      requestJson('POST', `/api/v1/customers/${customer.id}/payments`, {
        amount,
        paymentMode: 'NEFT',
        referenceNo: `${label.replace(/[^a-z0-9]/gi, '-').slice(0, 30)}-${RUN_ID}`
      }, accountingToken, authHeaders('customer-invalid-payment')),
      400
    );
  }

  await expectStatus(
    'reject customer payment without payment mode',
    requestJson('POST', `/api/v1/customers/${customer.id}/payments`, {
      amount: 1000,
      referenceNo: `CUST-NOMODE-${RUN_ID}`
    }, accountingToken, authHeaders('customer-no-mode')),
    400
  );

  await expectStatus(
    'accept property payout less than payable amount',
    requestJson('POST', `/api/v1/properties/${property.id}/payments`, {
      amount: 50000,
      paymentMode: 'RTGS',
      referenceNo: `PROP-PAY-${RUN_ID}`
    }, accountingToken, authHeaders('property-valid-less')),
    201
  );

  const propertyInvalidAmounts = [
    ['reject property negative payment amount', -1],
    ['reject property zero payment amount', 0],
    ['reject property alphabetic payment amount', 'abc'],
    ['reject property special character payment amount', '$$$'],
    ['reject property payment greater than payable amount', propertyBalance + 1000000]
  ];

  for (const [label, amount] of propertyInvalidAmounts) {
    await expectStatus(
      label,
      requestJson('POST', `/api/v1/properties/${property.id}/payments`, {
        amount,
        paymentMode: 'NEFT',
        referenceNo: `${label.replace(/[^a-z0-9]/gi, '-').slice(0, 30)}-${RUN_ID}`
      }, accountingToken, authHeaders('property-invalid-payment')),
      400
    );
  }

  await expectStatus(
    'reject property payout without payment mode',
    requestJson('POST', `/api/v1/properties/${property.id}/payments`, {
      amount: 1000,
      referenceNo: `PROP-NOMODE-${RUN_ID}`
    }, accountingToken, authHeaders('property-no-mode')),
    400
  );

  await expectStatus(
    'reject property payout reusing customer UTR',
    requestJson('POST', `/api/v1/properties/${property.id}/payments`, {
      amount: 1000,
      paymentMode: 'NEFT',
      referenceNo: `CUST-PAY-${RUN_ID}`
    }, accountingToken, authHeaders('same-utr-property')),
    400
  );
}

async function testExpenseValidation(adminToken, salesToken, salesUserId) {
  console.log('\nExpense validation');

  const categoriesRes = await expectStatus(
    'fetch expense categories',
    requestJson('GET', '/api/v1/expenses/categories', undefined, salesToken),
    200
  );
  const category = categoriesRes.data.categories?.[0];
  assert(category, 'No expense categories found. Run the Prisma seed before this suite.');

  await expectStatus(
    'allocate funds for expense test',
    requestJson('POST', '/api/v1/fund-requests/allocate', {
      targetUserId: salesUserId,
      amount: 20000,
      description: 'CI expense validation allocation',
      fundMode: 'LIQUID'
    }, adminToken, authHeaders('expense-allocation')),
    200
  );

  const expenseRes = await expectStatus(
    'accept valid expense',
    requestJson('POST', '/api/v1/expenses', {
      amount: 500,
      description: `CI valid expense ${RUN_ID}`,
      categoryId: category.id,
      date: new Date().toISOString().slice(0, 10),
      vendorId: 'CI Vendor',
      reference: `EXP-${RUN_ID}`,
      fundMode: 'LIQUID'
    }, salesToken, authHeaders('valid-expense')),
    201
  );
  created.expenseIds.push(expenseRes.data.expense.id);

  const badExpenseCases = [
    ['reject expense missing description', { amount: 100, description: '', categoryId: category.id, date: new Date().toISOString().slice(0, 10) }],
    ['reject expense negative amount', { amount: -100, description: 'Bad negative expense', categoryId: category.id, date: new Date().toISOString().slice(0, 10) }],
    ['reject expense alphabetic amount', { amount: 'abc', description: 'Bad alpha expense', categoryId: category.id, date: new Date().toISOString().slice(0, 10) }],
    ['reject expense special character amount', { amount: '#$%', description: 'Bad special expense', categoryId: category.id, date: new Date().toISOString().slice(0, 10) }],
    ['reject expense over wallet balance', { amount: 999999999, description: 'Bad oversized expense', categoryId: category.id, date: new Date().toISOString().slice(0, 10) }]
  ];

  for (const [label, payload] of badExpenseCases) {
    await expectStatus(
      label,
      requestJson('POST', '/api/v1/expenses', payload, salesToken, authHeaders('invalid-expense')),
      400
    );
  }

  await expectStatus(
    'reject expense with invalid category id',
    requestJson('POST', '/api/v1/expenses', {
      amount: 100,
      description: 'Invalid category should be rejected',
      categoryId: '00000000-0000-0000-0000-000000000000',
      date: new Date().toISOString().slice(0, 10)
    }, salesToken, authHeaders('invalid-expense-category')),
    [400, 500]
  );
}

async function testFundRequestValidation(salesToken, managerUserId) {
  console.log('\nFund request validation');

  const badRequests = [
    ['reject fund request missing manager', { amount: 1000, reason: 'Missing manager' }],
    ['reject fund request negative amount', { amount: -1, reason: 'Negative amount', managerId: managerUserId }],
    ['reject fund request alphabetic amount', { amount: 'abc', reason: 'Alphabetic amount', managerId: managerUserId }],
    ['reject fund request special character amount', { amount: '@@@', reason: 'Special amount', managerId: managerUserId }]
  ];

  for (const [label, payload] of badRequests) {
    await expectStatus(
      label,
      requestJson('POST', '/api/v1/fund-requests', payload, salesToken, authHeaders('invalid-fund-request')),
      400
    );
  }

  const res = await expectStatus(
    'accept valid fund request',
    requestJson('POST', '/api/v1/fund-requests', {
      amount: 1000,
      reason: `CI fund request ${RUN_ID}`,
      managerId: managerUserId,
      fundMode: 'LIQUID'
    }, salesToken, authHeaders('valid-fund-request')),
    201
  );
  created.fundRequestIds.push(res.data.fundRequest.id);
}

async function cleanup() {
  console.log('\nCleaning up CI validation data');

  await prisma.idempotencyKey.deleteMany({
    where: { key: { in: created.idempotencyKeys } }
  }).catch(() => {});

  await prisma.expense.deleteMany({
    where: {
      OR: [
        { id: { in: created.expenseIds } },
        { description: { contains: RUN_ID } },
        { reference: { contains: RUN_ID } }
      ]
    }
  }).catch(() => {});

  await prisma.customerPayment.deleteMany({
    where: { customerId: { in: created.customerIds } }
  }).catch(() => {});
  await prisma.customer.deleteMany({
    where: { id: { in: created.customerIds } }
  }).catch(() => {});

  await prisma.propertyPayment.deleteMany({
    where: { propertyId: { in: created.propertyIds } }
  }).catch(() => {});
  await prisma.propertyAcquisition.deleteMany({
    where: { id: { in: created.propertyIds } }
  }).catch(() => {});

  await prisma.fundRequest.deleteMany({
    where: {
      OR: [
        { id: { in: created.fundRequestIds } },
        { reason: { contains: RUN_ID } }
      ]
    }
  }).catch(() => {});

  await prisma.journalLine.deleteMany({
    where: {
      journalEntry: {
        OR: [
          { referenceId: { in: created.walletTransactionIds } },
          { description: { contains: RUN_ID } }
        ]
      }
    }
  }).catch(() => {});
  await prisma.journalEntry.deleteMany({
    where: {
      OR: [
        { referenceId: { in: created.walletTransactionIds } },
        { description: { contains: RUN_ID } }
      ]
    }
  }).catch(() => {});
  await prisma.walletTransaction.deleteMany({
    where: {
      OR: [
        { id: { in: created.walletTransactionIds } },
        { description: { contains: RUN_ID } },
        { referenceId: { contains: RUN_ID } }
      ]
    }
  }).catch(() => {});
}

async function main() {
  console.log(`EstateSync GitHub Actions validation suite: ${RUN_ID}`);
  console.log(`API base URL: ${BASE_URL}`);

  const admin = await login('admin@estatesync.local');
  const accounting = await login('accounting@estatesync.local');
  const sales = await login('sales@estatesync.local');
  const manager = await login('manager@estatesync.local');

  try {
    await ensureTreasuryFunds(admin.token);
    const customer = await testCustomerCreationAndDuplicates(sales.token);
    const property = await testPropertyCreationAndDuplicates(accounting.token);
    await testPaymentFunctions(accounting.token, customer, property);
    await testExpenseValidation(admin.token, sales.token, sales.user.id);
    await testFundRequestValidation(sales.token, manager.user.id);
    console.log('\nALL CI VALIDATION TESTS PASSED');
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error('\nCI VALIDATION FAILED');
  console.error(error);
  await cleanup();
  await prisma.$disconnect();
  process.exit(1);
});
