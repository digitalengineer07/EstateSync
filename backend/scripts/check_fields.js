const prisma = require('../src/config/db');

async function checkFields() {
  console.log('Testing prisma access to customer fields...');
  const customers = await prisma.customer.findMany({
    take: 1
  });
  console.log('Successfully queried customers:', customers.length);
  process.exit(0);
}

checkFields().catch(err => {
  console.error(err);
  process.exit(1);
});
