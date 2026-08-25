// native fetch is used

async function test() {
  const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@estatesync.local', password: 'password123' })
  });
  const loginData = await loginRes.json();
  console.log('Login:', loginData.success ? 'Success' : loginData);
  
  if (!loginData.accessToken) return;

  const rolesRes = await fetch('http://localhost:4000/api/v1/users/roles', {
    headers: { 'Authorization': `Bearer ${loginData.accessToken}` }
  });
  const rolesData = await rolesRes.json();
  console.log('Roles Fetch:', rolesData);
}
test();
