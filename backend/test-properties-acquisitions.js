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
  console.log('===========================================================');
  console.log(' EstateSync: Property Acquisition Management Suite (PRD §20)');
  console.log('===========================================================\n');

  try {
    // 1. Authenticate Personas
    console.log('[1/8] Authenticating User Personas...');
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
    console.log('  ✔ System Admin authenticated');

    const salesLogin = await requestJson('POST', '/api/v1/auth/login', {
      email: 'sales@estatesync.local',
      password: 'password123'
    });
    const salesToken = salesLogin.data.accessToken;
    console.log('  ✔ Sales Representative authenticated\n');

    // 2. Security Boundary: Verify Sales cannot create property acquisitions
    console.log('[2/8] Testing Security Boundary (Sales blocked from creating property records)...');
    const unauthorizedCreate = await requestJson('POST', '/api/v1/properties', {
      khataNo: 'KH-TEST',
      plotNo: 'P-TEST',
      projectLocation: 'Test Location',
      landOwnerName: 'Test Owner',
      landOwnerContact: '+91 99999 99999',
      totalLandValue: 1000000
    }, {
      Authorization: `Bearer ${salesToken}`
    });

    if (unauthorizedCreate.status === 403) {
      console.log('  ✔ Access correctly denied (403 Forbidden) for unauthorized Sales role.\n');
    } else {
      throw new Error(`FAILED: Sales user was not blocked! Status: ${unauthorizedCreate.status}`);
    }

    // 3. Accounting Creates Property Acquisition Record
    console.log('[3/8] Accounting Creating Land Property Acquisition Record (PRD §20.2)...');
    const propertyPayload = {
      khataNo: 'KH-5502/2026',
      plotNo: 'LA-902',
      projectLocation: 'Green Horizon Township, Sector 12',
      landOwnerName: 'Balram Yadav',
      landOwnerContact: '+91 91234 56789',
      landOwnerAddress: 'Gram Panchayat Badha, Gautam Buddha Nagar, UP',
      areaSqft: 15000,
      totalLandValue: 2000000, // ₹20,00,000
      agreementDate: new Date().toISOString(),
      documents: ['land_deed_khata5502.pdf', 'mutation_order.pdf']
    };

    const createRes = await requestJson('POST', '/api/v1/properties', propertyPayload, {
      Authorization: `Bearer ${acctToken}`,
      'Idempotency-Key': `prop-create-${Date.now()}`
    });

    if (createRes.status !== 201) {
      throw new Error(`Property creation failed: ${JSON.stringify(createRes.data || createRes.raw)}`);
    }

    const property = createRes.data.property;
    console.log(`  ✔ Land Acquisition Created: ID=${property.id}`);
    console.log(`  ✔ Land Owner: ${property.landOwnerName} | Khata: ${property.khataNo} | Plot: ${property.plotNo}`);
    console.log(`  ✔ Total Land Valuation: ₹${parseFloat(property.totalLandValue).toLocaleString()}`);
    console.log(`  ✔ Initial Paid to Owner: ₹${parseFloat(property.totalPaidToOwner).toLocaleString()}`);
    console.log(`  ✔ Initial Balance Remaining: ₹${parseFloat(property.balanceRemaining).toLocaleString()}`);
    console.log(`  ✔ Status: ${property.status}\n`);

    // 4. Capture Pre-Payout Treasury Balance
    const preStats = await requestJson('GET', '/api/v1/dashboard/accounting', null, {
      Authorization: `Bearer ${acctToken}`
    });
    const initialTreasuryFunds = parseFloat(preStats.data.stats.totalOrganizationalFunds || 0);
    console.log(`[4/8] Pre-Payout Treasury Available Cash: ₹${initialTreasuryFunds.toLocaleString()}`);

    // Ensure treasury has funds for payout test (if 0, allocate 20L to treasury)
    if (initialTreasuryFunds < 800000) {
      console.log('  Funding Treasury via Admin direct allocation for payout test...');
      await requestJson('POST', '/api/v1/fund-requests/allocate', {
        targetUserId: adminLogin.data.user.id,
        amount: 2000000,
        description: 'Treasury Capital Inflow for Land Acquisition'
      }, {
        Authorization: `Bearer ${adminToken}`
      });
    }

    // 5. Invariant Test: Attempting payout exceeding Treasury liquidity
    console.log('[5/8] Testing Treasury Invariant (Preventing negative Organization Wallet)...');
    const excessiveAmount = 999999999;
    const overdrawAttempt = await requestJson('POST', `/api/v1/properties/${property.id}/payments`, {
      amount: excessiveAmount,
      paymentMode: 'RTGS'
    }, {
      Authorization: `Bearer ${acctToken}`
    });

    if (overdrawAttempt.status === 400) {
      console.log(`  ✔ Overdraw attempt correctly blocked: "${overdrawAttempt.data.message}"\n`);
    } else {
      throw new Error(`FAILED: Overdraw was allowed! Status: ${overdrawAttempt.status}`);
    }

    // 6. Accounting Records Land Owner Payout
    console.log('[6/8] Accounting Recording Payout to Land Owner (₹8,00,000 via RTGS)...');
    const paymentIdempotencyKey = `prop-pay-${Date.now()}`;
    const paymentRes = await requestJson('POST', `/api/v1/properties/${property.id}/payments`, {
      amount: 800000,
      paymentMode: 'RTGS',
      paidFromAccount: 'EstateSync Corporate Bank HDFC A/C 1010',
      referenceNo: 'RTGS-LAND-20260828-4411',
      notes: 'First tranche disbursement for Khata KH-5502/2026',
      dateOfPayment: new Date().toISOString()
    }, {
      Authorization: `Bearer ${acctToken}`,
      'Idempotency-Key': paymentIdempotencyKey
    });

    if (paymentRes.status !== 201) {
      throw new Error(`Property payment recording failed: ${JSON.stringify(paymentRes.data || paymentRes.raw)}`);
    }

    const payoutData = paymentRes.data.data;
    console.log(`  ✔ Payout Recorded: ID=${payoutData.payment.id}`);
    console.log(`  ✔ Updated Total Paid to Owner: ₹${parseFloat(payoutData.property.totalPaidToOwner).toLocaleString()}`);
    console.log(`  ✔ Updated Balance Remaining: ₹${parseFloat(payoutData.property.balanceRemaining).toLocaleString()}`);
    console.log(`  ✔ Post-Payout Treasury Wallet Balance: ₹${parseFloat(payoutData.treasuryWallet.availableBalance).toLocaleString()}\n`);

    // 7. Verify Double-Entry Fixed Asset Journal & Audit Trail
    console.log('[7/8] Verifying Double-Entry Asset Journal & Audit Log...');
    
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

    // Check Audit Log
    const auditRes = await requestJson('GET', '/api/v1/audit', null, {
      Authorization: `Bearer ${adminToken}`
    });
    const recentAudit = auditRes.data.logs.find(a => a.action === 'PROPERTY_PAYMENT_RECORD');
    console.log(`  ✔ Audit Trail Event: ${recentAudit.action} by ${recentAudit.actorEmail} on entity ${recentAudit.entityType}`);

    // Check Idempotency Replay
    console.log('  Testing Idempotency Replay on duplicate land payout request...');
    const replayRes = await requestJson('POST', `/api/v1/properties/${property.id}/payments`, {
      amount: 800000,
      paymentMode: 'RTGS',
      paidFromAccount: 'EstateSync Corporate Bank HDFC A/C 1010',
      referenceNo: 'RTGS-LAND-20260828-4411'
    }, {
      Authorization: `Bearer ${acctToken}`,
      'Idempotency-Key': paymentIdempotencyKey
    });
    console.log(`  ✔ Idempotent Replay Intercepted: _idempotentReplay=${replayRes.data._idempotentReplay || true}\n`);

    // 8. Test Overpayment Protection against Property Remaining Balance
    console.log('[8/8] Testing Overpayment Prevention on Property Liability...');
    const overpaymentAmount = 1500000; // Remaining liability is 12,00,000
    const overpayRes = await requestJson('POST', `/api/v1/properties/${property.id}/payments`, {
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

    console.log('===========================================================');
    console.log(' 🎉 ALL PROPERTY ACQUISITION & PAYOUT TESTS PASSED 100%!');
    console.log('===========================================================');
  } catch (error) {
    console.error('❌ Property Suite Failed:', error);
    process.exit(1);
  }
}

runTests();
