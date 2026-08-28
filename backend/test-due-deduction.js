const http = require('http');

function requestJson(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (data) {
      reqHeaders['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path,
      method,
      headers: reqHeaders
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => { responseBody += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: responseBody });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function testDueDeduction() {
  console.log('================================================================');
  console.log(' 🔍 Verifying Customer Balance Due Deduction on Payment Record');
  console.log('================================================================\n');

  try {
    // 1. Authenticate Sales & Accounting
    const salesLogin = await requestJson('POST', '/api/v1/auth/login', {
      email: 'sales@estatesync.local',
      password: 'password123'
    });
    const salesToken = salesLogin.data.accessToken;

    const acctLogin = await requestJson('POST', '/api/v1/auth/login', {
      email: 'accounting@estatesync.local',
      password: 'password123'
    });
    const acctToken = acctLogin.data.accessToken;

    // 2. Create customer with ₹50,00,000 contract value
    console.log('[1/4] Registering Customer Profile (Contract: ₹50,00,000)...');
    const custRes = await requestJson('POST', '/api/v1/customers', {
      customerName: 'Test Balance Deduction Client',
      customerContact: '+91 98888 77777',
      projectLocation: 'Emerald Greens Phase 1',
      plotNo: `P-${Date.now()}`,
      areaSqft: 2500,
      khataNo: 'KH-8800/2026',
      identityType: 'PAN',
      identityNumber: 'ABCDE1234F',
      landCost: 4500000,
      registryCost: 350000,
      otherCharges: 150000,
      taxes: 100000,
      discount: 100000 // Total: (45L + 3.5L + 1.5L + 1L) - 1L = 50,00,000
    }, {
      Authorization: `Bearer ${salesToken}`,
      'Idempotency-Key': `test-cust-create-${Date.now()}`
    });

    const cust = custRes.data.customer;
    console.log(`  ✔ Customer Created: ID=${cust.id}`);
    console.log(`  ✔ Total Contract Value: ₹${parseFloat(cust.totalContractValue).toLocaleString()}`);
    console.log(`  ✔ Initial Total Paid: ₹${parseFloat(cust.totalPaid).toLocaleString()}`);
    console.log(`  ✔ Initial Balance Due: ₹${parseFloat(cust.balanceDue).toLocaleString()}`);

    if (parseFloat(cust.balanceDue) !== 5000000) {
      throw new Error(`Expected initial balanceDue to be 50,00,000, but got ${cust.balanceDue}`);
    }

    // 3. Record Payment 1: ₹15,00,000
    console.log('\n[2/4] Recording Payment 1: ₹15,00,000 (via RTGS)...');
    const pay1 = await requestJson('POST', `/api/v1/customers/${cust.id}/payments`, {
      amount: 1500000,
      paymentMode: 'RTGS',
      referenceNo: 'RTGS-TR-001'
    }, {
      Authorization: `Bearer ${acctToken}`,
      'Idempotency-Key': `test-pay1-${Date.now()}`
    });

    const updated1 = pay1.data.data.customer;
    console.log(`  ✔ Payment 1 Recorded!`);
    console.log(`  ✔ Total Paid: ₹${parseFloat(updated1.totalPaid).toLocaleString()} (Expected: ₹15,00,000)`);
    console.log(`  ✔ Balance Due: ₹${parseFloat(updated1.balanceDue).toLocaleString()} (Expected: ₹35,00,000)`);

    if (parseFloat(updated1.balanceDue) !== 3500000 || parseFloat(updated1.totalPaid) !== 1500000) {
      throw new Error(`FAILED: Balance due was not correctly deducted on payment 1! Paid: ${updated1.totalPaid}, Due: ${updated1.balanceDue}`);
    }

    // 4. Record Payment 2: ₹10,00,000
    console.log('\n[3/4] Recording Payment 2: ₹10,00,000 (via NEFT)...');
    const pay2 = await requestJson('POST', `/api/v1/customers/${cust.id}/payments`, {
      amount: 1000000,
      paymentMode: 'NEFT',
      referenceNo: 'NEFT-TR-002'
    }, {
      Authorization: `Bearer ${acctToken}`,
      'Idempotency-Key': `test-pay2-${Date.now()}`
    });

    const updated2 = pay2.data.data.customer;
    console.log(`  ✔ Payment 2 Recorded!`);
    console.log(`  ✔ Total Paid: ₹${parseFloat(updated2.totalPaid).toLocaleString()} (Expected: ₹25,00,000)`);
    console.log(`  ✔ Balance Due: ₹${parseFloat(updated2.balanceDue).toLocaleString()} (Expected: ₹25,00,000)`);

    if (parseFloat(updated2.balanceDue) !== 2500000 || parseFloat(updated2.totalPaid) !== 2500000) {
      throw new Error(`FAILED: Balance due was not correctly deducted on payment 2! Paid: ${updated2.totalPaid}, Due: ${updated2.balanceDue}`);
    }

    // 5. Fetch via GET /api/v1/customers and verify database persistence
    console.log('\n[4/4] Verifying database persistence via GET /api/v1/customers...');
    const listRes = await requestJson('GET', '/api/v1/customers', null, {
      Authorization: `Bearer ${acctToken}`
    });
    const fetchedCust = listRes.data.customers.find(c => c.id === cust.id);

    console.log(`  ✔ Fetched from API:`);
    console.log(`     - Contract: ₹${parseFloat(fetchedCust.totalContractValue).toLocaleString()}`);
    console.log(`     - Total Paid: ₹${parseFloat(fetchedCust.totalPaid).toLocaleString()}`);
    console.log(`     - Balance Due: ₹${parseFloat(fetchedCust.balanceDue).toLocaleString()}`);
    console.log(`     - Payments Count: ${fetchedCust.payments.length}`);

    if (parseFloat(fetchedCust.balanceDue) !== 2500000 || parseFloat(fetchedCust.totalPaid) !== 2500000) {
      throw new Error(`FAILED: Persisted balance in DB does not match!`);
    }

    console.log('\n================================================================');
    console.log(' 🎉 SUCCESS: BALANCE DUE DEDUCTION IS VERIFIED AND WORKING 100%!');
    console.log('================================================================');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testDueDeduction();
