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
    console.log('1. Logging in as Sales Rep (sales@estatesync.local)...');
    const salesLogin = await postJson('/api/v1/auth/login', {
      email: 'sales@estatesync.local',
      password: 'password123'
    });
    
    if (!salesLogin.data.success) {
      throw new Error('Sales login failed: ' + JSON.stringify(salesLogin.data));
    }
    const salesToken = salesLogin.data.accessToken;
    console.log('✓ Sales login successful');

    console.log('2. Fetching expense categories...');
    const catRes = await getJson('/api/v1/expenses/categories', salesToken);
    if (!catRes.data.success || !catRes.data.categories.length) {
      throw new Error('Categories fetch failed: ' + JSON.stringify(catRes.data));
    }
    const category = catRes.data.categories[0];
    console.log(`✓ Fetched categories (Using: ${category.name})`);

    console.log('3. Recording an expense (₹250 for Travel)...');
    const expRes = await postJson('/api/v1/expenses', {
      amount: 250,
      description: 'Client visit cab fare',
      categoryId: category.id,
      date: new Date().toISOString().split('T')[0],
      vendorId: 'Uber India',
      reference: 'UBER-98213'
    }, salesToken);

    if (expRes.status !== 201 || !expRes.data.success) {
      throw new Error('Expense creation failed: ' + JSON.stringify(expRes.data));
    }
    console.log('✓ Expense created successfully, ID:', expRes.data.expense.id);

    console.log('4. Testing GET /api/v1/expenses/my (User personal view)...');
    const myExp = await getJson('/api/v1/expenses/my', salesToken);
    if (!myExp.data.success || !myExp.data.expenses.some(e => e.id === expRes.data.expense.id)) {
      throw new Error('My expenses list does not contain new expense');
    }
    console.log(`✓ Verified: My expenses list has ${myExp.data.expenses.length} records`);

    console.log('5. Logging in as Manager (manager@estatesync.local)...');
    const mgrLogin = await postJson('/api/v1/auth/login', {
      email: 'manager@estatesync.local',
      password: 'password123'
    });
    if (!mgrLogin.data.success) throw new Error('Manager login failed');
    const mgrToken = mgrLogin.data.accessToken;

    console.log('6. Testing GET /api/v1/expenses/team (Manager team view)...');
    const teamExp = await getJson('/api/v1/expenses/team', mgrToken);
    if (!teamExp.data.success) throw new Error('Team expenses fetch failed: ' + JSON.stringify(teamExp.data));
    console.log(`✓ Verified: Team expenses list returned ${teamExp.data.expenses.length} team records`);

    console.log('\n========================================');
    console.log('🎉 ALL EXPENSE LIST TESTS PASSED!');
    console.log('========================================');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
}

runTest();
