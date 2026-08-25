const http = require('http');

function postJson(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path,
      method: 'POST',
      headers
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
    req.write(data);
    req.end();
  });
}

function getJson(path, token) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path,
      method: 'GET',
      headers
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
    req.end();
  });
}

async function runTest() {
  try {
    console.log('1. Logging in as Accounting user (accounting@estatesync.local)...');
    const acctLogin = await postJson('/api/v1/auth/login', {
      email: 'accounting@estatesync.local',
      password: 'password123'
    });
    
    if (!acctLogin.data.success) {
      throw new Error('Accounting login failed: ' + JSON.stringify(acctLogin.data));
    }
    const token = acctLogin.data.accessToken;
    console.log('✓ Accounting login successful, user:', acctLogin.data.user.name);

    console.log('2. Fetching GET /api/v1/dashboard/accounting stats...');
    const statsRes = await getJson('/api/v1/dashboard/accounting', token);
    if (!statsRes.data.success) {
      throw new Error('Accounting stats failed: ' + JSON.stringify(statsRes.data));
    }
    console.log('✓ Accounting stats returned:', JSON.stringify(statsRes.data.stats));

    console.log('3. Fetching GET /api/v1/users/all for corporate wallet overview...');
    const usersRes = await getJson('/api/v1/users/all', token);
    if (!usersRes.data.success || !usersRes.data.users.length) {
      throw new Error('Users overview fetch failed');
    }
    console.log(`✓ Fetched ${usersRes.data.users.length} corporate wallets`);

    console.log('4. Fetching GET /api/v1/expenses/all for company receipts...');
    const expRes = await getJson('/api/v1/expenses/all', token);
    if (!expRes.data.success) {
      throw new Error('All expenses fetch failed');
    }
    console.log(`✓ Fetched ${expRes.data.expenses.length} organization expense records`);

    console.log('5. Fetching GET /api/v1/transactions/all for ledger audit...');
    const txnRes = await getJson('/api/v1/transactions/all', token);
    if (!txnRes.data.success) {
      throw new Error('Transaction ledger fetch failed');
    }
    console.log(`✓ Fetched ${txnRes.data.transactions.length} ledger transactions`);

    console.log('\n========================================');
    console.log('🎉 ALL ACCOUNTING DASHBOARD TESTS PASSED!');
    console.log('========================================');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
}

runTest();
