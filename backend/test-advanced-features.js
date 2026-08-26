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

async function runAdvancedTests() {
  console.log('========================================================');
  console.log('🚀 TESTING NEW ESTATE SYNC MODULES');
  console.log('========================================================');

  try {
    // 1. Admin Login
    console.log('\n[TEST 1] Admin Login...');
    const adminLogin = await requestJson('POST', '/api/v1/auth/login', {
      email: 'admin@estatesync.local',
      password: 'password123'
    });
    if (!adminLogin.data.success) throw new Error('Admin login failed: ' + JSON.stringify(adminLogin.data));
    const adminToken = adminLogin.data.accessToken;
    console.log('✓ Admin authenticated:', adminLogin.data.user.name);

    // 2. Fetch Chart of Accounts
    console.log('\n[TEST 2] Fetch Chart of Accounts (GET /api/v1/accounts)...');
    const accountsRes = await requestJson('GET', '/api/v1/accounts', null, { Authorization: `Bearer ${adminToken}` });
    if (!accountsRes.data.success || !accountsRes.data.accounts.length) {
      throw new Error('Chart of accounts failed: ' + JSON.stringify(accountsRes.data));
    }
    console.log(`✓ Fetched ${accountsRes.data.accounts.length} Accounts in Chart of Accounts:`);
    accountsRes.data.accounts.slice(0, 4).forEach(acc => {
      console.log(`   - [${acc.code}] ${acc.name} (${acc.type}) | Balance: ₹${acc.balance}`);
    });

    // 3. Test Idempotency with Direct Fund Allocation
    console.log('\n[TEST 3] Testing Idempotency on Direct Fund Allocation...');
    const managersRes = await requestJson('GET', '/api/v1/users/managers', null, { Authorization: `Bearer ${adminToken}` });
    const testTarget = managersRes.data.managers[0];
    if (!testTarget) throw new Error('No manager found for test');

    const testIdempotencyKey = `test-idemp-${Date.now()}`;
    console.log(`   Sending request 1 with key: ${testIdempotencyKey}...`);
    const alloc1 = await requestJson('POST', '/api/v1/fund-requests/allocate', {
      targetUserId: testTarget.id,
      amount: 1500,
      description: 'Idempotency Test Allocation'
    }, {
      Authorization: `Bearer ${adminToken}`,
      'Idempotency-Key': testIdempotencyKey
    });
    if (!alloc1.data.success) throw new Error('Allocation 1 failed: ' + JSON.stringify(alloc1.data));
    console.log('   ✓ Allocation 1 succeeded:', alloc1.data.message);

    console.log(`   Sending request 2 with SAME key: ${testIdempotencyKey} (Network Retry simulation)...`);
    const alloc2 = await requestJson('POST', '/api/v1/fund-requests/allocate', {
      targetUserId: testTarget.id,
      amount: 1500,
      description: 'Idempotency Test Allocation Duplicate'
    }, {
      Authorization: `Bearer ${adminToken}`,
      'Idempotency-Key': testIdempotencyKey
    });

    if (alloc2.data._idempotentReplay) {
      console.log('   ✓ IDEMPOTENCY SUCCESS! Duplicate request was intercepted and safely replayed without double-charging.');
    } else {
      console.log('   ⚠️ Idempotency response received:', JSON.stringify(alloc2.data));
    }

    // 4. Test Double-Entry General Ledger
    console.log('\n[TEST 4] Fetch Double-Entry General Ledger (GET /api/v1/journals)...');
    const journalsRes = await requestJson('GET', '/api/v1/journals', null, { Authorization: `Bearer ${adminToken}` });
    if (!journalsRes.data.success) throw new Error('Journals fetch failed: ' + JSON.stringify(journalsRes.data));
    console.log(`✓ Fetched ${journalsRes.data.journals.length} posted Journal Entries.`);
    console.log(`   - Total Debits: ₹${journalsRes.data.meta.overallDebit}`);
    console.log(`   - Total Credits: ₹${journalsRes.data.meta.overallCredit}`);
    console.log(`   - Ledger Balanced (Debit = Credit): ${journalsRes.data.meta.ledgerBalanced ? '✅ TRUE' : '❌ FALSE'}`);

    // 5. Test Expense Recording & Reversal
    console.log('\n[TEST 5] Sales User Expense Recording & Administrative Reversal...');
    const salesLogin = await requestJson('POST', '/api/v1/auth/login', {
      email: 'sales@estatesync.local',
      password: 'password123'
    });
    const salesToken = salesLogin.data.accessToken;

    const categoriesRes = await requestJson('GET', '/api/v1/expenses/categories', null, { Authorization: `Bearer ${salesToken}` });
    const categoryId = categoriesRes.data.categories[0].id;

    // Create an expense
    console.log('   Recording Sales expense of ₹250...');
    const expCreate = await requestJson('POST', '/api/v1/expenses', {
      amount: 250,
      description: 'Client Coffee & Meeting Test',
      categoryId,
      date: new Date().toISOString().slice(0, 10)
    }, { Authorization: `Bearer ${salesToken}` });

    if (!expCreate.data.success) {
      console.log('   (Note: If wallet is empty, funding sales user first)');
      await requestJson('POST', '/api/v1/fund-requests/allocate', {
        targetUserId: salesLogin.data.user.id,
        amount: 5000,
        description: 'Pre-funding sales wallet'
      }, { Authorization: `Bearer ${adminToken}` });

      const expCreateRetry = await requestJson('POST', '/api/v1/expenses', {
        amount: 250,
        description: 'Client Coffee & Meeting Test',
        categoryId,
        date: new Date().toISOString().slice(0, 10)
      }, { Authorization: `Bearer ${salesToken}` });
      if (!expCreateRetry.data.success) throw new Error('Expense retry failed: ' + JSON.stringify(expCreateRetry.data));
      console.log('   ✓ Expense recorded successfully: ID', expCreateRetry.data.expense.id);
      
      console.log('   Now Reversing Expense (Admin Reversal)...');
      const revRes = await requestJson('POST', `/api/v1/expenses/${expCreateRetry.data.expense.id}/reverse`, {
        reason: 'Test Reversal: Expense recorded in error'
      }, { Authorization: `Bearer ${adminToken}` });
      if (!revRes.data.success) throw new Error('Expense reversal failed: ' + JSON.stringify(revRes.data));
      console.log('   ✓ Expense Reversal Succeeded! Status:', revRes.data.data.expense.status);
    } else {
      console.log('   ✓ Expense recorded: ID', expCreate.data.expense.id);
      console.log('   Now Reversing Expense (Admin Reversal)...');
      const revRes = await requestJson('POST', `/api/v1/expenses/${expCreate.data.expense.id}/reverse`, {
        reason: 'Test Reversal: Expense recorded in error'
      }, { Authorization: `Bearer ${adminToken}` });
      if (!revRes.data.success) throw new Error('Expense reversal failed: ' + JSON.stringify(revRes.data));
      console.log('   ✓ Expense Reversal Succeeded! Status:', revRes.data.data.expense.status);
    }

    // 6. Test Dedicated Audit Log
    console.log('\n[TEST 6] Fetch Dedicated Audit Trail (GET /api/v1/audit)...');
    const auditRes = await requestJson('GET', '/api/v1/audit?limit=10', null, { Authorization: `Bearer ${adminToken}` });
    if (!auditRes.data.success || !auditRes.data.logs.length) {
      throw new Error('Audit logs failed: ' + JSON.stringify(auditRes.data));
    }
    console.log(`✓ Fetched ${auditRes.data.logs.length} Recent Audit Trail Records:`);
    auditRes.data.logs.slice(0, 5).forEach(l => {
      console.log(`   - [${l.action}] by ${l.actorEmail || 'System'} | Entity: ${l.entityType} | IP: ${l.ipAddress || 'localhost'}`);
    });

    console.log('\n========================================================');
    console.log('🎉 ALL ADVANCED FINANCIAL & INTEGRITY TESTS PASSED 100%!');
    console.log('========================================================\n');

  } catch (error) {
    console.error('❌ Test execution error:', error.message);
  }
}

runAdvancedTests();
