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
    console.log('1. Logging in as Admin...');
    const loginRes = await postJson('/api/v1/auth/login', {
      email: 'admin@estatesync.local',
      password: 'password123'
    });
    
    if (!loginRes.data.success) {
      throw new Error('Admin login failed: ' + JSON.stringify(loginRes.data));
    }
    const token = loginRes.data.accessToken;
    console.log('✓ Admin login successful');

    console.log('2. Fetching users list...');
    const usersRes = await getJson('/api/v1/users/all', token);
    if (!usersRes.data.success || !usersRes.data.users.length) {
      throw new Error('Failed to fetch users: ' + JSON.stringify(usersRes.data));
    }
    console.log(`✓ Fetched ${usersRes.data.users.length} users`);

    // Find a manager or user who is not admin (or any user)
    const targetUser = usersRes.data.users.find(u => u.role?.name === 'MANAGER') || usersRes.data.users[0];
    const initialBalance = parseFloat(targetUser.wallet?.availableBalance || 0);
    console.log(`Target: ${targetUser.name} (${targetUser.role?.name}), Initial Balance: ₹${initialBalance}`);

    console.log('3. Allocating ₹5,000 to ' + targetUser.name + '...');
    const allocRes = await postJson('/api/v1/fund-requests/allocate', {
      targetUserId: targetUser.id,
      amount: 5000,
      description: 'Automated test direct allocation'
    }, token);

    if (allocRes.status !== 200 || !allocRes.data.success) {
      throw new Error('Fund allocation failed: ' + JSON.stringify(allocRes.data));
    }
    console.log('✓ Allocation successful:', allocRes.data.message);

    const newBalance = parseFloat(allocRes.data.data.wallet.availableBalance);
    console.log(`✓ New Balance: ₹${newBalance} (Diff: ₹${newBalance - initialBalance})`);

    console.log('\n========================================');
    console.log('🎉 ALL AUTOMATED TESTS PASSED SUCCESSFULLY!');
    console.log('========================================');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
}

runTest();
