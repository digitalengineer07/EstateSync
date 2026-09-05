async function testLogin(email, password) {
  try {
    const res = await fetch('http://127.0.0.1:4000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    console.log(`LOGIN ${email}: HTTP ${res.status}`, data);
    return data;
  } catch (err) {
    console.error(`LOGIN ${email} ERROR:`, err.message);
  }
}

async function run() {
  console.log('--- TESTING SALES LOGIN ---');
  await testLogin('sales@estatesync.local', 'password123');

  console.log('--- TESTING MARKETING LOGIN ---');
  await testLogin('marketing@estatesync.local', 'password123');
}

run();
