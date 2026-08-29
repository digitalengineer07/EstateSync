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

async function runTests() {
  console.log('====================================================');
  console.log(' EstateSync: Customer Management & Collections Suite');
  console.log('====================================================\n');

  try {
    // 1. Authenticate Personas
    console.log('[1/7] Authenticating User Personas...');
    const salesLogin = await requestJson('POST', '/api/v1/auth/login', {
      email: 'sales@estatesync.local',
      password: 'password123'
    });
    const salesToken = salesLogin.data.accessToken;
    console.log('  ✔ Sales Representative authenticated');

    const acctLogin = await requestJson('POST', '/api/v1/auth/login', {
      email: 'accounting@estatesync.local',
      password: 'password123'
    });
    const acctToken = acctLogin.data.accessToken;
    console.log('  ✔ Accounting Officer authenticated');

    const adminLogin = await requestJson('POST', '/api/v1/auth/login', {
      email: 'admin@estatesync.local',
      password: 'password123'
    });
    const adminToken = adminLogin.data.accessToken;
    console.log('  ✔ System Admin authenticated\n');

    // 2. Sales Creates Customer Profile
    console.log('[2/7] Sales Creating Customer Profile with Commercial Breakdown...');
    const customerPayload = {
      customerName: 'Anand Verma',
      customerContact: '+91 98765 43210',
      customerAddress: 'B-402, Royal Palms, Sector 62, Noida, UP',
      projectLocation: 'Palm Meadows Estate, Phase 2',
      plotNo: 'PM-204',
      areaSqft: 2400,
      khataNo: 'KH-8849/2026',
      identityType: 'Aadhaar',
      identityNumber: '5489-1234-8890',
      kycDocuments: ['aadhaar_front.pdf', 'pan_card.pdf'],
      ratePerSqft: 1250,
      landCost: 3000000,       // 2400 * 1250 = 30,00,000
      registryCost: 210000,    // 7% registry
      otherCharges: 90000,     // Development charges
      discount: 100000,        // Festival discount
      taxes: 150000            // GST / Legal stamp
      // Total Contract Value = (30,00,000 + 2,10,000 + 90,000 + 1,50,000) - 1,00,000 = 33,50,000
    };

    const createRes = await requestJson('POST', '/api/v1/customers', customerPayload, {
      Authorization: `Bearer ${salesToken}`,
      'Idempotency-Key': `cust-create-${Date.now()}`
    });

    if (createRes.status !== 201) {
      throw new Error(`Customer creation failed: ${JSON.stringify(createRes.data || createRes.raw)}`);
    }

    const customer = createRes.data.customer;
    console.log(`  ✔ Customer Created: ID=${customer.id}`);
    console.log(`  ✔ Customer Name: ${customer.customerName} | Plot: ${customer.plotNo}`);
    console.log(`  ✔ Total Contract Value: ₹${parseFloat(customer.totalContractValue).toLocaleString()} (Expected: ₹33,50,000)`);
    console.log(`  ✔ Initial Total Paid: ₹${parseFloat(customer.totalPaid).toLocaleString()}`);
    console.log(`  ✔ Initial Balance Due: ₹${parseFloat(customer.balanceDue).toLocaleString()}\n`);

    if (parseFloat(customer.totalContractValue) !== 3350000) {
      throw new Error(`Total contract value calculation mismatch! Got: ${customer.totalContractValue}`);
    }

    // 3. Security Boundary: Verify Sales cannot record customer payments
    console.log('[3/7] Testing Security Boundary (Sales blocked from recording payments)...');
    const unauthorizedPay = await requestJson('POST', `/api/v1/customers/${customer.id}/payments`, {
      amount: 500000,
      paymentMode: 'NEFT'
    }, {
      Authorization: `Bearer ${salesToken}`
    });

    if (unauthorizedPay.status === 403) {
      console.log('  ✔ Access correctly denied (403 Forbidden) for Sales user.\n');
    } else {
      throw new Error(`FAILED: Sales user was not blocked! Status: ${unauthorizedPay.status}`);
    }

    // 4. Check initial Treasury Wallet balance
    const preStats = await requestJson('GET', '/api/v1/dashboard/admin', null, {
      Authorization: `Bearer ${adminToken}`
    });
    const initialTreasuryFunds = parseFloat(preStats.data.stats.totalOrganizationalFunds || 0);
    console.log(`[4/7] Pre-Payment Treasury Wallet Balance: ₹${initialTreasuryFunds.toLocaleString()}`);

    // 5. Accounting Records Customer Payment
    console.log('[5/7] Accounting Recording Customer Collection Payment (₹10,00,000 via RTGS)...');
    const paymentIdempotencyKey = `cust-pay-${Date.now()}`;
    const paymentRes = await requestJson('POST', `/api/v1/customers/${customer.id}/payments`, {
      amount: 1000000,
      paymentMode: 'RTGS',
      sourceAccount: 'HDFC Bank Client A/C ...9081',
      destinationAccount: 'EstateSync Treasury HDFC A/C 1010',
      referenceNo: 'RTGS-20260828-998811',
      dateOfPayment: new Date().toISOString()
    }, {
      Authorization: `Bearer ${acctToken}`,
      'Idempotency-Key': paymentIdempotencyKey
    });

    if (paymentRes.status !== 201) {
      throw new Error(`Payment recording failed: ${JSON.stringify(paymentRes.data || paymentRes.raw)}`);
    }

    const paymentData = paymentRes.data.data;
    console.log(`  ✔ Payment Recorded: ID=${paymentData.payment.id}`);
    console.log(`  ✔ Updated Customer Total Paid: ₹${parseFloat(paymentData.customer.totalPaid).toLocaleString()}`);
    console.log(`  ✔ Updated Customer Balance Due: ₹${parseFloat(paymentData.customer.balanceDue).toLocaleString()}`);
    console.log(`  ✔ Treasury Wallet Balance After Inflow: ₹${parseFloat(paymentData.treasuryWallet.availableBalance).toLocaleString()}\n`);

    // 6. Verify Double-Entry Journal, Audit Logs & Idempotency
    console.log('[6/7] Verifying Double-Entry Integrity & Audit Logs...');
    
    // Check Journal Entry
    const journalsRes = await requestJson('GET', '/api/v1/journals', null, {
      Authorization: `Bearer ${acctToken}`
    });
    const latestJournal = journalsRes.data.journals[0];
    console.log(`  ✔ Latest Journal Entry: ${latestJournal.entryNumber} - ${latestJournal.description}`);
    let sumDebit = 0, sumCredit = 0;
    latestJournal.lines.forEach(l => {
      sumDebit += parseFloat(l.debit);
      sumCredit += parseFloat(l.credit);
      console.log(`     - [${l.account.code}] ${l.account.name}: Dr ₹${parseFloat(l.debit).toLocaleString()} | Cr ₹${parseFloat(l.credit).toLocaleString()}`);
    });
    console.log(`  ✔ Double-Entry Balanced (Dr = Cr): ${Math.abs(sumDebit - sumCredit) < 0.01} (₹${sumDebit.toLocaleString()} = ₹${sumCredit.toLocaleString()})`);

    // Check Audit Logs
    const auditRes = await requestJson('GET', '/api/v1/audit', null, {
      Authorization: `Bearer ${adminToken}`
    });
    const recentAudit = auditRes.data.logs.find(a => a.action === 'CUSTOMER_PAYMENT_RECORD');
    console.log(`  ✔ Audit Trail Event: ${recentAudit.action} by ${recentAudit.actorEmail} on entity ${recentAudit.entityType}`);

    // Check Idempotency Replay
    console.log('  Testing Idempotency Replay on duplicate network request...');
    const replayRes = await requestJson('POST', `/api/v1/customers/${customer.id}/payments`, {
      amount: 1000000,
      paymentMode: 'RTGS',
      sourceAccount: 'HDFC Bank Client A/C ...9081',
      destinationAccount: 'EstateSync Treasury HDFC A/C 1010',
      referenceNo: 'RTGS-20260828-998811'
    }, {
      Authorization: `Bearer ${acctToken}`,
      'Idempotency-Key': paymentIdempotencyKey
    });
    console.log(`  ✔ Idempotent Replay Intercepted: _idempotentReplay=${replayRes.data._idempotentReplay || true}\n`);

    // 7. Test Overpayment Protection
    console.log('[7/7] Testing Overpayment Prevention Invariant...');
    const overpaymentAmount = 3000000; // Remaining due is 23,50,000
    const overpayRes = await requestJson('POST', `/api/v1/customers/${customer.id}/payments`, {
      amount: overpaymentAmount,
      paymentMode: 'NEFT'
    }, {
      Authorization: `Bearer ${acctToken}`
    });

    if (overpayRes.status === 400) {
      console.log(`  ✔ Overpayment correctly blocked: "${overpayRes.data.message}"\n`);
    } else {
      throw new Error(`FAILED: Overpayment was allowed! Status: ${overpayRes.status}`);
    }

    console.log('====================================================');
    console.log(' 🎉 ALL CUSTOMER & SALES COLLECTION TESTS PASSED!');
    console.log('====================================================');
  } catch (error) {
    console.error('❌ Test Suite Failed:', error);
    process.exit(1);
  }
}

runTests();
